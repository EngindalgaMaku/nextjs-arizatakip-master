'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Database } from '@/types/supabase';
import { Schedule, ScheduledEntry } from '@/types/scheduling';

// Type to represent a single change made during optimization
interface OptimizationChange {
    type: 'shift' | 'consolidation'; // Hangi adımda yapıldı?
    teacherId: string;
    lessonId: string; // Hangi ders taşındı?
    // classId?: string; // Hangi sınıfın dersi? (ScheduledEntry'de yok, şimdilik kaldırıldı)
    fromKey: string; // Nereden taşındı (day-period)
    toKey: string; // Nereye taşındı (day-period)
    reason?: string; // Neden taşındı (örn. "gap reduction", "day consolidation")
}


// Type for the result of the optimization action, including changes
// Dönüş tipini güncelleyelim - belki yeni ID'yi de döndürürüz
interface OptimizationCreateResult {
    success: boolean;
    message: string;
    newScheduleId?: string; // Yeni oluşturulan ID (opsiyonel)
    newGaps?: number | null;
    changes?: OptimizationChange[]; // Yapılan değişikliklerin listesi (opsiyonel, ekleyebiliriz)
}

// scheduleOptimizationActions.ts dosyasının başına ekle
const dayNameToIndex: { [key: string]: number } = {
    'Pazartesi': 0, 'Salı': 1, 'Çarşamba': 2, 'Perşembe': 3, 'Cuma': 4
};

/**
 * Optimizes a saved schedule and saves the result as a NEW record.
 * 
 * @param scheduleId The ID of the original schedule to optimize.
 * @returns OptimizationCreateResult indicating success or failure and the new schedule ID.
 */
export async function optimizeScheduleAction(scheduleId: string): Promise<OptimizationCreateResult> { // Return type updated
    const supabase = await createSupabaseServerClient();
    try {
        // 1. Fetch ALL necessary fields from the original schedule
        console.log(`[Optimize Action ${scheduleId}]: Fetching original schedule details...`);
        const { data: originalScheduleData, error: fetchError } = await supabase
            .from('saved_schedules')
            // Select all fields needed to create a copy + optimization fields
            .select('id, name, description, schedule_data, total_gaps, fitness_score, workload_variance, unassigned_lessons, logs')
            .eq('id', scheduleId)
            .single();

        if (fetchError || !originalScheduleData || !originalScheduleData.schedule_data) {
            console.error('Error fetching schedule or schedule_data is null:', fetchError);
            const message = fetchError ? `Orijinal çizelge getirilirken hata oluştu: ${fetchError.message}` : 'Orijinal çizelge verisi bulunamadı.';
            return { success: false, message };
        }
        console.log(`[Optimize Action ${scheduleId}]: Original schedule fetched successfully.`);

        // 2. Deserialize AND Transform Keys immediately from the fetched data
        let currentScheduleMap: Schedule | null = null; // Bu artık doğru formatlı harita olacak
        console.log("[Optimize Action]: Deserializing and Transforming keys...");
        if (Array.isArray(originalScheduleData.schedule_data) && originalScheduleData.schedule_data.every(item => Array.isArray(item) && item.length === 2)) {
            try {
                 const rawData = originalScheduleData.schedule_data as [string, any][];
                 const transformedData = rawData.map(([key, value]) => {
                     const parts = key.split('-'); // Original key might be DayName-Hour-LocationId etc.
                     // <<< GÜNCELLEME: Değeri (value) kullanarak öğretmen, gün ve saat bilgisini al >>>
                     const teacherId = (value as ScheduledEntry)?.teacherIds?.[0];
                     const timeSlotDayName = (value as ScheduledEntry)?.timeSlot?.day;
                     const timeSlotHour = (value as ScheduledEntry)?.timeSlot?.hour;

                     if (teacherId && timeSlotDayName && timeSlotHour !== undefined) {
                         const dayIndex = dayNameToIndex[timeSlotDayName];
                         const periodIndex = timeSlotHour; // Assuming hour is already 1-based

                         if (dayIndex !== undefined && !isNaN(periodIndex)) {
                             const newKey = `${teacherId}-${dayIndex}-${periodIndex}`; // Correct format with teacherId
                             return [newKey, value as ScheduledEntry];
                         } else { 
                              console.warn(`[Optimize Action]: Could not parse parts from value: Teacher='${teacherId}', Day='${timeSlotDayName}', Period='${timeSlotHour}'. Original Key='${key}'`);
                         }
                     } else {
                         console.warn(`[Optimize Action]: Missing teacherId, day, or hour in value for key '${key}'. Value:`, value);
                     }
                     // <<< GÜNCELLEME SONU >>>
                     return null;
                 }).filter(item => item !== null);

                 currentScheduleMap = new Map<string, ScheduledEntry>(transformedData as [string, ScheduledEntry][]);
                 console.log(`[Optimize Action]: Key transformation complete. Valid entries: ${currentScheduleMap.size} / Original: ${rawData.length}`);

            } catch (e) { 
                console.error("Error during key transformation:", e);
                return { success: false, message: 'Çizelge verisi dönüştürülürken hata oluştu.' };
            }
         } else { 
             console.error("schedule_data from DB is not in the expected Array<[string, any]> format:", originalScheduleData.schedule_data);
             return { success: false, message: 'Veritabanından gelen çizelge formatı geçersiz.' };
         }


        if (!currentScheduleMap || currentScheduleMap.size === 0) { 
             console.error("No valid schedule entries found after key transformation.");
             return { success: false, message: 'Optimize edilecek geçerli ders girişi bulunamadı (anahtar formatı hatası?).' };
        }


        // --- Initial State Logging (Using the *correctly formatted* map) ---
        console.log(`[Optimize Action ${scheduleId}]: Calculating gaps on *initial* (transformed) schedule...`);
        const initialCalculatedGaps = calculateTotalGaps(currentScheduleMap); // Calculate on transformed map
        console.log(`[Optimize Action ${scheduleId}]: Initial Calculated Gaps: ${initialCalculatedGaps}`);
        console.log(`[Optimize Action ${scheduleId}]: Initial transformed map size: ${currentScheduleMap.size}`);
        // --- End Initial State Logging ---

        // --- Optimization Logic (Pass the *correctly formatted* map) ---
        console.log(`[Optimize Action ${scheduleId}]: Starting optimization logic.`);

        // Step A: Shift days upwards to start earlier (NEW STEP)
        console.log(`[Optimize Action ${scheduleId}]: Shifting teacher days upwards...`);
        const { updatedScheduleMap: mapAfterUpwardShift, changes: changesAfterUpwardShift } = shiftTeacherDaysUp(currentScheduleMap, []); // Start with empty changes
        console.log(`[Optimize Action ${scheduleId}]: Upward shift finished. Moves: ${changesAfterUpwardShift.length}`);

        // Step B: Reduce intra-day gaps
        // Pass the result of the upward shift to the gap reduction step
        const { updatedScheduleMap: mapAfterGapReduction, calculatedGaps: gapsAfterReduction, changes: changesAfterGapReduction } = reduceTeacherGaps(mapAfterUpwardShift, changesAfterUpwardShift); 
        console.log(`[Optimize Action ${scheduleId}]: Intra-day gap reduction finished. Total Changes accumulated: ${changesAfterGapReduction.length}, Gaps (intermediate): ${gapsAfterReduction}`); 

        // Step C: Consolidate days with few lessons
        console.log(`[Optimize Action ${scheduleId}]: Consolidating teacher days...`);
        // Pass the result of gap reduction to the consolidation step
        const { updatedScheduleMap: finalScheduleMap, changes: allChanges } = consolidateTeacherDays(mapAfterGapReduction, changesAfterGapReduction);
        console.log(`[Optimize Action ${scheduleId}]: Day consolidation finished. Total Changes accumulated: ${allChanges.length}`);

        // --- Final State Logging ---
        console.log(`[Optimize Action ${scheduleId}]: Final schedule map size: ${finalScheduleMap.size}`); // Log final map size
        console.log(`[Optimize Action ${scheduleId}]: Recalculating final gaps based on the schedule *after* all optimization attempts...`);
        const finalCalculatedGaps = calculateTotalGaps(finalScheduleMap);
        const serializedOptimizedSchedule = Array.from(finalScheduleMap.entries()); // Serialize the final *correctly formatted* map
        console.log(`[Optimize Action ${scheduleId}]: Optimization finished. Final Calculated Gaps: ${finalCalculatedGaps}, Total Changes: ${allChanges.length}`);
        // --- End Final State Logging ---

        // <<< DEBUG LOG: Inspect data before saving >>>
        // console.log(`[Optimize Action ${scheduleId}]: Data to be saved (length ${serializedOptimizedSchedule.length}):`, JSON.stringify(serializedOptimizedSchedule.slice(0, 5)) + '...'); // Log first 5 entries preview
        // <<< DEBUG LOG END >>>

        // 3. Create data for the NEW schedule record
        const newScheduleName = `${originalScheduleData.name || 'İsimsiz Çizelge'} (Optimizasyon ${new Date().toLocaleTimeString('tr-TR')})`;
        const insertData = {
            name: newScheduleName,
            description: originalScheduleData.description, // Keep original description
            schedule_data: serializedOptimizedSchedule, // Optimized schedule data
            total_gaps: finalCalculatedGaps, // Optimized gap count
            fitness_score: originalScheduleData.fitness_score, // Copy original (ideally recalculate)
            workload_variance: originalScheduleData.workload_variance, // Copy original (ideally recalculate)
            unassigned_lessons: originalScheduleData.unassigned_lessons, // Copy original
            logs: [...(originalScheduleData.logs || []), `Orijinal ID ${scheduleId} üzerinden optimize edildi. ${allChanges.length} değişiklik yapıldı.`] // Append optimization info to logs
            // created_at and updated_at will be set by DB
        };

        // 4. Insert the new schedule record instead of updating
        console.log(`[Optimize Action ${scheduleId}]: Inserting new optimized schedule record...`);
        const { data: newSchedule, error: insertError } = await supabase
            .from('saved_schedules')
            .insert(insertData)
            .select('id') // Select the ID of the newly created record
            .single();

        if (insertError || !newSchedule) {
            console.error('Error inserting new optimized schedule:', insertError);
            return { success: false, message: `Optimize edilmiş yeni çizelge kaydedilirken hata oluştu: ${insertError?.message || 'Bilinmeyen hata'}` };
        }
        console.log(`[Optimize Action ${scheduleId}]: New schedule created successfully with ID: ${newSchedule.id}`);

        // 5. Revalidate the LIST path
        // revalidatePath(`/dashboard/saved-schedules/${scheduleId}`); // No longer need to revalidate original
        revalidatePath('/dashboard/saved-schedules'); // Revalidate the list page
        console.log(`[Optimize Action ${scheduleId}]: Revalidated path /dashboard/saved-schedules`);

        // Return success with the new schedule's ID
        return {
            success: true,
            message: `Optimize edilmiş çizelge '${newScheduleName}' adıyla yeni bir kayıt olarak eklendi.`,
            newScheduleId: newSchedule.id, // Return the new ID
            newGaps: finalCalculatedGaps,
            changes: allChanges // Değişiklik listesini de döndürelim
        };

    } catch (error: any) { 
         console.error('Unexpected error during schedule optimization and creation:', error);
         return { success: false, message: `Beklenmedik bir hata oluştu: ${error.message}` };
    }
}

// --- Helper function for teacher gap reduction ---

/**
 * Analyzes the schedule and attempts to reduce gaps in teachers' daily schedules.
 * @param schedule The current schedule map.
 * @param existingChanges The list of changes from previous optimization steps.
 * @returns An object containing the potentially updated schedule map and the newly calculated total gaps.
 */
function reduceTeacherGaps(
    schedule: Schedule,
    existingChanges: OptimizationChange[]
): { updatedScheduleMap: Schedule, calculatedGaps: number, changes: OptimizationChange[] } {
    console.log("[reduceTeacherGaps]: Starting gap reduction process.");
    const updatedScheduleMap = new Map(schedule);
    const changes: OptimizationChange[] = [...existingChanges];
    
    // 1. Group lessons by teacher and day
    const teacherDailySchedules: Map<string, Map<number, number[]>> = new Map();
    for (const [key, entry] of updatedScheduleMap.entries()) {
        // <<< GÜNCELLEME: teacherId-dayIndex-periodIndex formatını işle >>>
        const parts = key.split('-');
        if (parts.length < 3) { 
             console.warn(`[reduceTeacherGaps]: Skipping invalid key format (less than 3 parts): ${key}`);
             continue;
        }
        const teacherId = entry.teacherIds?.[0];
        const dayIndexStr = parts[parts.length - 2]; 
        const periodIndexStr = parts[parts.length - 1];
        const dayIndex = parseInt(dayIndexStr, 10);
        const periodIndex = parseInt(periodIndexStr, 10);
        // <<< GÜNCELLEME SONU >>>

        if (isNaN(dayIndex) || isNaN(periodIndex) || !teacherId) {
            // Add teacherId to the warning
            // console.warn(`[reduceTeacherGaps]: Skipping invalid schedule entry key/parts: Key=${key}, Teacher=${teacherId}, DayStr=${dayIndexStr}, PeriodStr=${periodIndexStr}`);
            continue;
        }

        if (!teacherDailySchedules.has(teacherId)) {
            teacherDailySchedules.set(teacherId, new Map<number, number[]>());
        }
        const dailyMap = teacherDailySchedules.get(teacherId)!;

        if (!dailyMap.has(dayIndex)) {
            dailyMap.set(dayIndex, []);
        }
        const periods = dailyMap.get(dayIndex)!;
        // Avoid adding duplicates if reprocessing
        if (!periods.includes(periodIndex)) {
             periods.push(periodIndex);
        }
    }
     // Sort periods for each teacher/day *after* grouping
    for (const dailyMap of teacherDailySchedules.values()) {
        for (const periods of dailyMap.values()) {
            periods.sort((a, b) => a - b);
        }
    }


    // console.log("[reduceTeacherGaps]: Grouped teacher schedules:", teacherDailySchedules.size, "teachers found.");

    // 2. Iterate and attempt to shift lessons downwards (reduce gaps)
    // console.log("[reduceTeacherGaps]: Attempting to shift lessons downwards...");
    for (const [teacherId, dailyMap] of teacherDailySchedules.entries()) {
        for (const [dayIndex, periods] of dailyMap.entries()) {
            // Iterate forwards, checking gaps between current and previous
            for (let i = 1; i < periods.length; i++) {
                const currentPeriod = periods[i];
                const previousPeriod = periods[i - 1];
                const gap = currentPeriod - previousPeriod - 1;

                if (gap > 0) {
                    // Attempt to move the lesson at currentPeriod downwards
                    // Target period is immediately after the previous lesson
                    const targetPeriod = previousPeriod + 1;
                    // <<< GÜNCELLEME: Doğru anahtar formatını kullan >>>
                    const targetKey = `${teacherId}-${dayIndex}-${targetPeriod}`;
                    const currentKey = `${teacherId}-${dayIndex}-${currentPeriod}`;
                    // <<< GÜNCELLEME SONU >>>

                    // Constraint Check: Is the target slot empty in the *main map*?
                    // <<< GÜNCELLEME: Ana haritada hedef anahtarı kontrol et >>>
                    if (!updatedScheduleMap.has(targetKey)) { 
                        // <<< GÜNCELLEME SONU >>>
                        // Move the lesson
                        // <<< GÜNCELLEME: Doğru anahtarı kullan >>>
                        const lessonEntry = updatedScheduleMap.get(currentKey); 
                        // <<< GÜNCELLEME SONU >>>
                        if (lessonEntry) {
                            updatedScheduleMap.delete(currentKey);
                            updatedScheduleMap.set(targetKey, lessonEntry);

                            // Update the periods array for this teacher/day *in place*
                            periods[i] = targetPeriod; // Update the period index in the array
                            // No need to re-sort immediately as we only moved downwards into a known empty slot

                            // --- Değişikliği Raporla (classId olmadan) ---
                            changes.push({
                                type: 'shift',
                                teacherId: teacherId,
                                lessonId: lessonEntry.lessonId,
                                fromKey: currentKey,
                                toKey: targetKey,
                                reason: 'gap reduction'
                            });
                            // --- Raporlama Sonu ---

                            // console.log(`[reduceTeacherGaps]: Shifted Teacher ${teacherId}, Day ${dayIndex}, Period ${currentPeriod} -> ${targetPeriod}`);

                        } else {
                             // console.warn(`[reduceTeacherGaps]: Could not find lesson entry for key ${currentKey} during shift.`);
                        }
                    }
                    // else {
                         // console.log(`[reduceTeacherGaps]: Cannot shift Teacher ${teacherId}, Day ${dayIndex}, Period ${currentPeriod}. Target ${targetKey} is occupied.`);
                    // }
                }
            }
        }
    }
     // console.log(`[reduceTeacherGaps]: Downward shifting completed. Successful shifts: ${changes.length}`);

    // 3. Recalculate total gaps based on the potentially modified schedule
    const calculatedGaps = calculateTotalGaps(updatedScheduleMap);
    console.log(`[reduceTeacherGaps]: Finished gap reduction. Recalculated Gaps: ${calculatedGaps}`);

    // Değişiklik listesini de döndür
    return { updatedScheduleMap, calculatedGaps, changes };
}

/**
 * Calculates the total number of gaps in teacher schedules based on a schedule map.
 * A gap is defined as an empty period between two lessons of the same teacher on the same day.
 * @param schedule The schedule map to analyze.
 * @returns The total number of gaps found.
 */
function calculateTotalGaps(schedule: Schedule): number {
    // console.log("[calculateTotalGaps]: Starting gap calculation...");
    let totalGaps = 0;
    const teacherDailySchedules: Map<string, Map<number, number[]>> = new Map();

    // 1. Group data (logging added for clarity)
    // console.log(`[calculateTotalGaps]: Processing input schedule with ${schedule.size} entries.`);
    for (const [key, entry] of schedule.entries()) {
        // <<< GÜNCELLEME: teacherId-dayIndex-periodIndex formatını işle >>>
        const parts = key.split('-');
        if (parts.length < 3) { // Need at least teacher + day + period
             console.warn(`[calculateTotalGaps]: Skipping invalid key format (less than 3 parts) during grouping: Key=${key}`);
             continue;
        }
        const teacherId = entry.teacherIds?.[0]; // Use teacherId from entry
        const dayIndexStr = parts[parts.length - 2]; // Day is second to last
        const periodIndexStr = parts[parts.length - 1]; // Period is last
        const dayIndex = parseInt(dayIndexStr, 10);
        const periodIndex = parseInt(periodIndexStr, 10);
        // <<< GÜNCELLEME SONU >>>

        if (isNaN(dayIndex) || isNaN(periodIndex) || !teacherId) {
             // Add teacherId to the warning
             // console.warn(`[calculateTotalGaps]: Skipping invalid entry during grouping: Key=${key}, Teacher=${teacherId}, DayStr=${dayIndexStr}, PeriodStr=${periodIndexStr}`);
             continue;
        }

        if (!teacherDailySchedules.has(teacherId)) {
            teacherDailySchedules.set(teacherId, new Map<number, number[]>());
        }
        const dailyMap = teacherDailySchedules.get(teacherId)!;
        if (!dailyMap.has(dayIndex)) {
            dailyMap.set(dayIndex, []);
        }
         // Add period if not already present (important if map was modified)
        if (!dailyMap.get(dayIndex)!.includes(periodIndex)){
            dailyMap.get(dayIndex)!.push(periodIndex);
        }
    }
     // console.log(`[calculateTotalGaps]: Grouped data for ${teacherDailySchedules.size} teachers.`);

    // 2. Calculate gaps with detailed logging
    // console.log("[calculateTotalGaps]: Starting gap calculation loop...");
    for (const [teacherId, dailyMap] of teacherDailySchedules.entries()) { // Öğretmen ID'sini de alalım
        // console.log(`[calculateTotalGaps]: Processing Teacher ${teacherId}`); // Optional: Can be noisy
        for (const [dayIndex, periods] of dailyMap.entries()) { // Gün index'ini de alalım
            periods.sort((a, b) => a - b); // Ensure sorted

            // Log the sorted periods being processed for this teacher/day
            // console.log(`[calculateTotalGaps]: Teacher ${teacherId}, Day ${dayIndex}, Sorted Periods: [${periods.join(', ')}]`);

            if (periods.length <= 1) {
                 // console.log(`  -> Less than 2 lessons, skipping gap calculation.`);
                 continue; // No gaps possible with 0 or 1 lesson
             }

            for (let i = 1; i < periods.length; i++) {
                const currentPeriod = periods[i];
                const previousPeriod = periods[i - 1];
                // Log the comparison being made
                // console.log(`  -> Comparing: currentPeriod=${currentPeriod}, previousPeriod=${previousPeriod}`);
                const gap = currentPeriod - previousPeriod - 1;
                 // console.log(`  -> Calculated gap = ${currentPeriod} - ${previousPeriod} - 1 = ${gap}`);

                if (gap > 0) {
                    // console.log(`    --> Gap FOUND: +${gap}`); // Clearly indicate found gap
                    totalGaps += gap;
                }
                 // else {
                 //    console.log(`    --> No gap.`); // Optional: Log non-gaps
                 // }
            }
        }
    }
    // console.log(`[calculateTotalGaps]: Finished calculation loop. Final Total Gaps: ${totalGaps}`);
    return totalGaps;
}

/*
// Example usage of calculateTotalGaps (for testing if needed)
const testSchedule = new Map<string, ScheduledEntry>();
testSchedule.set('0-0', { teacherId: 'T1', lessonId: 'L1', classId: 'C1' });
testSchedule.set('0-2', { teacherId: 'T1', lessonId: 'L2', classId: 'C2' }); // 1 gap here
testSchedule.set('0-3', { teacherId: 'T1', lessonId: 'L3', classId: 'C1' });
testSchedule.set('1-5', { teacherId: 'T1', lessonId: 'L4', classId: 'C3' });
testSchedule.set('1-8', { teacherId: 'T1', lessonId: 'L5', classId: 'C2' }); // 2 gaps here
console.log("Test Gaps:", calculateTotalGaps(testSchedule)); // Should output 3
*/ 

// --- Helper function for consolidating teacher days ---

/**
 * Attempts to consolidate teacher schedules by moving lessons from days
 * with few lessons (below threshold) to other days for the same teacher.
 * @param schedule The schedule map (potentially modified by previous steps).
 * @param existingChanges The list of changes from previous optimization steps.
 * @param lessonThreshold The minimum number of lessons a day must have to NOT be considered for consolidation.
 * @returns An object containing the potentially further modified schedule map and the accumulated list of changes.
 */
function consolidateTeacherDays(
    schedule: Schedule,
    existingChanges: OptimizationChange[], // Önceki adımlardan gelen değişiklikler
    lessonThreshold: number = 3
): { updatedScheduleMap: Schedule, changes: OptimizationChange[] } { // Sadece harita ve değişiklikleri döndürür
    // console.log(`[consolidateTeacherDays]: Starting day consolidation process (threshold: < ${lessonThreshold} lessons).`);
    const updatedScheduleMap = new Map(schedule); // Work on a mutable copy
    const changes = [...existingChanges]; // Gelen listeyi kopyala
    let successfulConsolidations = 0;

    // 1. Group lessons by teacher and day (similar to other functions)
    const teacherDailySchedules: Map<string, Map<number, number[]>> = new Map();
    for (const [key, entry] of updatedScheduleMap.entries()) {
        // <<< GÜNCELLEME: teacherId-dayIndex-periodIndex formatını işle >>>
        const parts = key.split('-');
        if (parts.length < 3) { 
             console.warn(`[consolidateTeacherDays]: Skipping invalid key format (less than 3 parts): ${key}`);
             continue;
        }
        const teacherId = entry.teacherIds?.[0];
        const dayIndexStr = parts[parts.length - 2]; 
        const periodIndexStr = parts[parts.length - 1];
        const dayIndex = parseInt(dayIndexStr, 10);
        const periodIndex = parseInt(periodIndexStr, 10);
        // <<< GÜNCELLEME SONU >>>

        if (isNaN(dayIndex) || isNaN(periodIndex) || !teacherId) continue;

        if (!teacherDailySchedules.has(teacherId)) teacherDailySchedules.set(teacherId, new Map());
        const dailyMap = teacherDailySchedules.get(teacherId)!;
        if (!dailyMap.has(dayIndex)) dailyMap.set(dayIndex, []);
        if (!dailyMap.get(dayIndex)!.includes(periodIndex)) dailyMap.get(dayIndex)!.push(periodIndex);
    }
    // Sort periods
    for (const dailyMap of teacherDailySchedules.values()) {
        for (const periods of dailyMap.values()) periods.sort((a, b) => a - b);
    }

    // 2. Identify candidate days and attempt consolidation
    // console.log("[consolidateTeacherDays]: Identifying candidate days for consolidation...");
    for (const [teacherId, dailyMap] of teacherDailySchedules.entries()) {
        const candidateDays: { dayIndex: number; periods: number[] }[] = [];
        const targetDays: number[] = []; // Days with >= threshold lessons

        for (const [dayIndex, periods] of dailyMap.entries()) {
            if (periods.length > 0 && periods.length < lessonThreshold) {
                candidateDays.push({ dayIndex, periods: [...periods] }); // Copy periods array
            } else if (periods.length >= lessonThreshold) {
                targetDays.push(dayIndex);
            }
        }

        if (candidateDays.length === 0 || targetDays.length === 0) {
            continue; // No days to clear or no target days for this teacher
        }

        // console.log(`[consolidateTeacherDays]: Teacher ${teacherId} has ${candidateDays.length} candidate day(s) and ${targetDays.length} target day(s).`);

        // 3. Attempt to move lessons from candidate days to target days
        for (const candidate of candidateDays) {
            let allLessonsMoved = true; // Assume success initially for this candidate day
            // Iterate backwards through periods to avoid index issues when removing
             for (let i = candidate.periods.length - 1; i >= 0; i--) {
                const sourcePeriod = candidate.periods[i];
                // <<< GÜNCELLEME: Doğru anahtar formatını kullan >>>
                const sourceKey = `${teacherId}-${candidate.dayIndex}-${sourcePeriod}`;
                // <<< GÜNCELLEME SONU >>>
                const lessonEntry = updatedScheduleMap.get(sourceKey);

                if (!lessonEntry) {
                    // console.warn(`[consolidateTeacherDays]: Entry not found for ${sourceKey} during consolidation attempt.`);
                    allLessonsMoved = false; // Cannot clear the day if an entry is missing
                    continue; // Skip this period
                }

                const moved = false;
                // Try to find an empty slot in one of the target days
                for (const targetDayIndex of targetDays) {
                     // Try finding *any* empty slot on the target day
                     // A more sophisticated approach might check teacher availability, etc.
                     // Let's assume 8 periods per day for this example check
                     const MAX_PERIODS = 8; // TODO: Make this configurable or dynamic
                     // <<< GÜNCELLEME: 1 tabanlı periyotları dene (1'den MAX_PERIODS'e kadar) >>>
                     for (let targetPeriod = 1; targetPeriod <= MAX_PERIODS; targetPeriod++) { 
                        // <<< GÜNCELLEME SONU >>>
                        // <<< GÜNCELLEME: Doğru anahtar formatını kullan >>>
                        const targetKey = `${teacherId}-${targetDayIndex}-${targetPeriod}`;
                        // <<< GÜNCELLEME SONU >>>
                        // Simple Constraint Check: Is target slot empty?
                        // <<< DEBUG LOG: Check before move >>>
                        const targetOccupied = updatedScheduleMap.has(targetKey);
                        // console.log(`[consolidateTeacherDays] Attempting move: ${sourceKey} -> ${targetKey}. Target occupied: ${targetOccupied}. Map size before: ${updatedScheduleMap.size}`);
                        // <<< DEBUG LOG END >>>
                        if (!targetOccupied) {
                             // --- Perform Move ---
                            updatedScheduleMap.delete(sourceKey);
                            updatedScheduleMap.set(targetKey, lessonEntry);
                            // <<< DEBUG LOG: Check after move >>>
                            // console.log(`[consolidateTeacherDays] Move performed. Map size after: ${updatedScheduleMap.size}`);
                            // <<< DEBUG LOG END >>>
                            successfulConsolidations++;
                            // --- Değişikliği Raporla (classId olmadan) ---
                            changes.push({
                                type: 'consolidation',
                                teacherId: teacherId,
                                lessonId: lessonEntry.lessonId,
                                fromKey: sourceKey,
                                toKey: targetKey,
                                reason: 'day consolidation'
                            });
                            // --- Raporlama Sonu ---

                            // console.log(`[consolidateTeacherDays]: Consolidated Teacher ${teacherId}: Moved Day ${candidate.dayIndex}, Period ${sourcePeriod} -> Day ${targetDayIndex}, Period ${targetPeriod}`);

                            // Update teacherDailySchedules for subsequent calculations/checks if needed (optional for this pass)
                            // Remove sourcePeriod from candidate.periods
                             candidate.periods.splice(i, 1);
                            // Add targetPeriod to the correct day in teacherDailySchedules (might need resorting)
                             const targetPeriods = dailyMap.get(targetDayIndex);
                             if(targetPeriods && !targetPeriods.includes(targetPeriod)){
                                 targetPeriods.push(targetPeriod);
                                 targetPeriods.sort((a,b)=>a-b);
                             }


                            break; // Stop searching for a slot for this lesson
                        }
                    }
                    if (moved) break; // Stop searching target days for this lesson
                }

                if (!moved) {
                     // console.log(`[consolidateTeacherDays]: Could not find a suitable slot to move Teacher ${teacherId}'s lesson from Day ${candidate.dayIndex}, Period ${sourcePeriod}`);
                    allLessonsMoved = false; // Failed to move this lesson, day cannot be fully cleared
                    // Keep the lesson in its original spot if no move was possible
                }
            }
            if (allLessonsMoved && candidate.periods.length === 0) {
                 // console.log(`[consolidateTeacherDays]: Successfully cleared Day ${candidate.dayIndex} for Teacher ${teacherId}`);
            }
        }
    }

    // console.log(`[consolidateTeacherDays]: Day consolidation finished. Successful moves: ${successfulConsolidations}`);
    // Sadece harita ve birikmiş değişiklik listesini döndür
    return { updatedScheduleMap, changes };
} 

// --- NEW HELPER: Shift Teacher Days Up ---

/**
 * Attempts to shift all lessons for a teacher on a given day upwards
 * if their first lesson starts later than the first period.
 * @param schedule The schedule map.
 * @param existingChanges Changes from previous steps.
 * @returns An object with the updated map and accumulated changes.
 */
function shiftTeacherDaysUp(
    schedule: Schedule,
    existingChanges: OptimizationChange[]
): { updatedScheduleMap: Schedule, changes: OptimizationChange[] } {
    console.log("[shiftTeacherDaysUp]: Starting upward shift process...");
    const updatedScheduleMap = new Map(schedule); // Work on a copy
    const changes = [...existingChanges];
    let successfulShifts = 0;

    // 1. Group lessons by teacher and day, sorting periods
    const teacherDailySchedules: Map<string, Map<number, number[]>> = new Map();
    for (const [key, entry] of updatedScheduleMap.entries()) {
        const parts = key.split('-');
        if (parts.length < 3) continue; // Skip invalid keys
        const teacherId = entry.teacherIds?.[0];
        const dayIndexStr = parts[parts.length - 2];
        const periodIndexStr = parts[parts.length - 1];
        const dayIndex = parseInt(dayIndexStr, 10);
        const periodIndex = parseInt(periodIndexStr, 10);
        if (isNaN(dayIndex) || isNaN(periodIndex) || !teacherId) continue;

        if (!teacherDailySchedules.has(teacherId)) teacherDailySchedules.set(teacherId, new Map());
        const dailyMap = teacherDailySchedules.get(teacherId)!;
        if (!dailyMap.has(dayIndex)) dailyMap.set(dayIndex, []);
        if (!dailyMap.get(dayIndex)!.includes(periodIndex)) dailyMap.get(dayIndex)!.push(periodIndex);
    }
    // Sort periods for each teacher/day
    for (const dailyMap of teacherDailySchedules.values()) {
        for (const periods of dailyMap.values()) periods.sort((a, b) => a - b);
    }

    // 2. Iterate through teachers and days to find potential shifts
    for (const [teacherId, dailyMap] of teacherDailySchedules.entries()) {
        for (const [dayIndex, periods] of dailyMap.entries()) {
            if (!periods || periods.length === 0) continue; // Skip empty days

            const firstLessonPeriod = periods[0]; // Already sorted
            const EARLIEST_PERIOD = 1; // Assuming 1 is the first possible hour

            if (firstLessonPeriod > EARLIEST_PERIOD) {
                const shiftAmount = firstLessonPeriod - EARLIEST_PERIOD;
                console.log(`[shiftTeacherDaysUp]: Teacher ${teacherId}, Day ${dayIndex}: First lesson at ${firstLessonPeriod}. Potential shift upwards by ${shiftAmount}.`);

                // 3. Check if ALL target slots are empty for this day's lessons
                let canShiftAll = true;
                for (const currentPeriod of periods) {
                    const targetPeriod = currentPeriod - shiftAmount;
                    const targetKey = `${teacherId}-${dayIndex}-${targetPeriod}`;
                    if (updatedScheduleMap.has(targetKey)) {
                        console.log(`  -> Cannot shift: Target slot ${targetKey} is occupied.`);
                        canShiftAll = false;
                        break; // No need to check further for this day
                    }
                }

                // 4. If all target slots are clear, perform the shift
                if (canShiftAll) {
                    console.log(`  -> Shifting all lessons for Teacher ${teacherId}, Day ${dayIndex} upwards by ${shiftAmount}...`);
                    // Iterate forwards is fine as target slots are guaranteed empty
                    for (const currentPeriod of periods) {
                        const targetPeriod = currentPeriod - shiftAmount;
                        const currentKey = `${teacherId}-${dayIndex}-${currentPeriod}`;
                        const targetKey = `${teacherId}-${dayIndex}-${targetPeriod}`;
                        const lessonEntry = updatedScheduleMap.get(currentKey);

                        if (lessonEntry) {
                            updatedScheduleMap.delete(currentKey);
                            updatedScheduleMap.set(targetKey, lessonEntry);
                            successfulShifts++;
                            // Record change
                            changes.push({
                                type: 'shift', // Could use a different type like 'upward_shift' if needed
                                teacherId: teacherId,
                                lessonId: lessonEntry.lessonId,
                                fromKey: currentKey,
                                toKey: targetKey,
                                reason: 'day start alignment'
                            });
                             console.log(`    - Moved ${currentKey} -> ${targetKey}`);
                        } else {
                            console.warn(`    - Entry not found for ${currentKey} during shift!`);
                            // This shouldn't happen if grouping was correct
                        }
                    }
                    // Update the periods in teacherDailySchedules map (optional, might not be needed if not re-used)
                    // dailyMap.set(dayIndex, periods.map(p => p - shiftAmount));
                } else {
                     console.log(`  -> Shift aborted for Teacher ${teacherId}, Day ${dayIndex} due to occupied target slots.`);
                }
            }
        }
    }

    console.log(`[shiftTeacherDaysUp]: Upward shifting completed. Successful lesson moves: ${successfulShifts}`);
    return { updatedScheduleMap, changes };
} 