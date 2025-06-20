'use server'; // Bu fonksiyonlar sunucu tarafında çalışacak

import { supabase } from '@/lib/supabase';
import {
    TeacherScheduleData,
    LessonScheduleData,
    LocationScheduleData,
    TimeSlot,
    SchedulerInput,
    DayOfWeek,
    HourOfDay,
    DAYS_OF_WEEK
} from '@/types/scheduling';
import { Teacher } from '@/types/teachers';
import { TeacherUnavailability } from '@/types/teacherUnavailability';
import { DalDers } from '@/types/dalDersleri';
import { Location } from '@/types/locations';
import { TeacherCourseAssignment as TeacherAssignment } from '@/types/teacherCourseAssignments';

// --- Helper Functions ---

/** Tüm olası zaman dilimlerini oluşturur */
function generateTimeSlots(hoursPerDay: number = 10): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (const day of DAYS_OF_WEEK) {
        for (let hour = 1; hour <= hoursPerDay; hour++) {
            slots.push({ day, hour: hour as HourOfDay });
        }
    }
    return slots;
}

/** Öğretmen müsaitiyetsizlik verisini TimeSlot[] formatına çevirir */
function mapUnavailabilityToTimeSlots(unavailabilities: TeacherUnavailability[]): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const maxHours = 10;
    unavailabilities.forEach((unav) => {
        // Map numeric day_of_week (1=Monday) to DayOfWeek
        const idx = unav.day_of_week - 1;
        if (idx < 0 || idx >= DAYS_OF_WEEK.length) return;
        const day = DAYS_OF_WEEK[idx];
        for (let hour = unav.start_period; hour <= unav.end_period; hour++) {
            if (hour >= 1 && hour <= maxHours) {
                slots.push({ day, hour: hour as HourOfDay });
            }
        }
    });
    return slots;
}

/** Helper to fetch all teacher assignments */
async function fetchAllTeacherAssignments(): Promise<TeacherAssignment[]> {
    const { data, error } = await supabase
        .from('teacher_course_assignments')
        .select('*');
    if (error) throw new Error(`Öğretmen atamaları çekilirken hata: ${error.message}`);
    return data || [];
}

/** Helper to fetch all dals with their associated branch_id */
async function fetchDallarWithBranchId(): Promise<Map<string, string | null>> {
    const { data, error } = await supabase
        .from('dallar')
        .select('id, branch_id'); // Select dal ID and its branch ID

    if (error) {
        console.error("Error fetching dallar with branch_id:", error);
        throw new Error(`Dal verileri çekilirken hata: ${error.message}`);
    }
    if (!data) return new Map();

    const dalToBranchMap = new Map<string, string | null>();
    data.forEach(dal => {
        // Ensure branch_id is treated correctly (might be null if not set or FK allows it)
        dalToBranchMap.set(dal.id, dal.branch_id);
    });
    return dalToBranchMap;
}

// --- Data Preparation Functions ---

/** Öğretmen verilerini hazırlar */
async function prepareTeachersData(): Promise<TeacherScheduleData[]> {
    const { data: teachers, error: teacherError } = await supabase
        .from('teachers')
        // Select branch_id and is_active, remove assignments for now
        .select('id, name, branch_id, is_active, teacher_unavailability(*)'); // <<< YENİ: is_active eklendi

    if (teacherError) throw new Error(`Öğretmen verileri çekilirken hata: ${teacherError.message}`);
    if (!teachers) return [];

    // <<< YENİ: Aktif olmayan öğretmenleri filtrele >>>
    const activeTeachers = teachers.filter(teacher => teacher.is_active === true);
    console.log(`[Scheduler DataPrep] Total teachers fetched: ${teachers.length}, Active teachers: ${activeTeachers.length}`);

    // Sadece aktif öğretmenleri işle
    return activeTeachers.map(teacher => {
        const unavailabilities = Array.isArray(teacher.teacher_unavailability) ? teacher.teacher_unavailability : [];
        // Remove assignment logic
        // const assignments = Array.isArray(teacher.teacher_assignments) ? teacher.teacher_assignments : [];

        return {
            id: teacher.id,
            name: teacher.name,
            branchId: teacher.branch_id,
            unavailableSlots: mapUnavailabilityToTimeSlots(unavailabilities as TeacherUnavailability[]),
            assignableLessonIds: [], // Default empty lesson IDs until implemented
        };
    });
}

/** Konum verilerini hazırlar */
async function prepareLocationsData(): Promise<LocationScheduleData[]> {
    const { data: locations, error: locationError } = await supabase
        .from('locations')
        .select('id, name, lab_type_id, capacity');

    if (locationError) throw new Error(`Konum verileri çekilirken hata: ${locationError.message}`);
    if (!locations) return [];

    // Filter out non-schedulable locations like "Şef Odası"
    const schedulableLocations = locations.filter(loc => loc.name !== 'Şef Odası');
    // TODO: Replace this temporary filter with a database flag (e.g., is_schedulable) later.

    // Map only the schedulable locations
    console.log(`[Scheduler DataPrep] Schedulable Locations:`, schedulableLocations.map(l => l.name)); // Log names
    return schedulableLocations.map(loc => ({
        id: loc.id,
        name: loc.name,
        labTypeId: loc.lab_type_id,
        capacity: loc.capacity,
    }));
}

/** Ders verilerini hazırlar - USES teachers, dalToBranchMap, and allAssignments */
async function prepareLessonsData(
    teachers: TeacherScheduleData[],
    dalToBranchMap: Map<string, string | null>,
    allAssignments: TeacherAssignment[]
): Promise<LessonScheduleData[]> {
    const { data: lessons, error: lessonError } = await supabase
        .from('dal_dersleri')
        .select('*, dal_ders_lab_types(lab_type_id)')
        .eq('cizelgeye_dahil_et', true);

    if (lessonError) throw new Error(`Ders verileri çekilirken hata: ${lessonError.message}`);
    if (!lessons) return [];

    // Group assignments by lesson_id for faster lookup, and store the assignment type
    const assignmentsByType: Record<string, { required: string[]; excluded: string[] }> = {};
    allAssignments.forEach(a => {
        if (!a.dal_ders_id || !a.teacher_id) return; // Skip if IDs are missing

        if (!assignmentsByType[a.dal_ders_id]) {
            assignmentsByType[a.dal_ders_id] = { required: [], excluded: [] };
        }
        if (a.assignment === 'required') {
             assignmentsByType[a.dal_ders_id].required.push(a.teacher_id);
        } else if (a.assignment === 'excluded') {
             assignmentsByType[a.dal_ders_id].excluded.push(a.teacher_id);
        }
    });

    return lessons.map(lesson => {
         const labTypes = Array.isArray(lesson.dal_ders_lab_types) ? lesson.dal_ders_lab_types : [];
         let potentialTeacherIds: string[] = [];
         const lessonAssignments = assignmentsByType[lesson.id] || { required: [], excluded: [] };

         // 1. 'required' atamaları varsa, sadece onları kullan
         if (lessonAssignments.required.length > 0) {
             console.log(`[Scheduler DataPrep] Found REQUIRED assignments for ${lesson.ders_adi}: Teachers ${lessonAssignments.required.join(',')}`);
             potentialTeacherIds = lessonAssignments.required;
         } else {
             // 2. 'required' yoksa, branş öğretmenlerini al ve 'excluded' olanları çıkar
             const lessonBranchId = dalToBranchMap.get(lesson.dal_id);
             if (lessonBranchId) {
                 const branchTeachers = teachers.filter(t => t.branchId === lessonBranchId);
                 const branchTeacherIds = branchTeachers.map(t => t.id);
                 
                 // Excluded öğretmenleri filtrele
                 potentialTeacherIds = branchTeacherIds.filter(id => !lessonAssignments.excluded.includes(id));
                 
                 if (branchTeacherIds.length !== potentialTeacherIds.length) {
                      console.log(`[Scheduler DataPrep] For ${lesson.ders_adi} (Branch ${lessonBranchId}): Started with ${branchTeacherIds.length} branch teachers, excluded ${lessonAssignments.excluded.join(',')}, remaining potentials: ${potentialTeacherIds.join(',')}`);
                 } else if (potentialTeacherIds.length > 0) {
                    // console.log(`[Scheduler DataPrep] No required/excluded assignments for ${lesson.ders_adi}, using branch match: ${potentialTeacherIds.join(',')}`); // Optional log
                 }

             } 
             
             if (potentialTeacherIds.length === 0) {
                 // Bu durumda ya branşta öğretmen yok, ya hepsi excluded, ya da dal'ın branch'i bulunamadı.
                 console.warn(`[Scheduler DataPrep] No potential teachers found for lesson ${lesson.ders_adi} (ID: ${lesson.id}, DalID: ${lesson.dal_id}, BranchID: ${dalToBranchMap.get(lesson.dal_id)}). Required: ${lessonAssignments.required.join(',') || 'None'}, Excluded: ${lessonAssignments.excluded.join(',') || 'None'}`);
             }
         }

        return {
            id: lesson.id,
            name: lesson.ders_adi,
            dalId: lesson.dal_id,
            sinifSeviyesi: lesson.sinif_seviyesi,
            weeklyHours: lesson.haftalik_saat,
            canSplit: lesson.bolunebilir_mi,
            requiresMultipleResources: lesson.requires_multiple_resources,
            needsScheduling: lesson.cizelgeye_dahil_et, 
            suitableLabTypeIds: labTypes.map((lt: any) => lt.lab_type_id),
            possibleTeacherIds: potentialTeacherIds, // Use the determined IDs
        };
    });
}


// --- Main Preparation Function ---

/** Çizelgeleme algoritması için tüm girdileri hazırlar */
export async function prepareSchedulerInput(hoursPerDay: number = 10): Promise<SchedulerInput> {
    try {
        const timeSlots = generateTimeSlots(hoursPerDay);
        // Fetch teachers, locations, dal-to-branch map, AND all assignments
        const [teachers, locations, dalToBranchMap, allAssignments] = await Promise.all([
            prepareTeachersData(),
            prepareLocationsData(),
            fetchDallarWithBranchId(),
            fetchAllTeacherAssignments() // Fetch all assignments
        ]);
        
        // Pass all required data to prepareLessonsData
        const lessons = await prepareLessonsData(teachers, dalToBranchMap, allAssignments);

        // --- YENİ: requiredAssignmentsMap oluştur ---
        const requiredAssignmentsMap = new Map<string, Set<string>>();
        allAssignments.forEach(assignment => {
            // Sadece 'required' olanları işle
            if (assignment.assignment === 'required' && assignment.teacher_id && assignment.dal_ders_id) {
                if (!requiredAssignmentsMap.has(assignment.teacher_id)) {
                    requiredAssignmentsMap.set(assignment.teacher_id, new Set());
                }
                requiredAssignmentsMap.get(assignment.teacher_id)?.add(assignment.dal_ders_id);
            }
        });
        console.log('[Scheduler DataPrep] Required Assignments Map:', requiredAssignmentsMap); // Log the created map

        return {
            teachers,
            lessons,
            locations,
            timeSlots,
            requiredAssignmentsMap, // <<< Yeni map'i ekle
        };
    } catch (error) {
        console.error("Scheduler input preparation failed:", error);
        throw error; 
    }
} 