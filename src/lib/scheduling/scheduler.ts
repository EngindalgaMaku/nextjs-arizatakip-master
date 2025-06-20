'use server';

import {
    DayOfWeek,
    HourOfDay,
    LessonScheduleData,
    LocationScheduleData,
    Schedule,
    ScheduledEntry,
    SchedulerInput,
    SchedulerResult,
    TeacherScheduleData,
    TimeSlot
} from '@/types/scheduling';

// --- Constants ---
const DAYS_OF_WEEK: ReadonlyArray<DayOfWeek> = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

// --- Helper Functions ---

// Fisher-Yates (aka Knuth) Shuffle Algorithm
function shuffleArray<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

/** Zaman dilimini string key'e çevirir (Map için) */
function getTimeSlotKey(slot: TimeSlot): string {
    return `${slot.day}-${slot.hour}`;
}

/** Schedule Map için anahtar oluşturur (Konum dahil) */
function getScheduleMapKey(slot: TimeSlot, locationId: string): string {
    return `${slot.day}-${slot.hour}-${locationId}`;
}

/** Belirli bir zamanda öğretmenin müsait olup olmadığını kontrol eder */
function isTeacherAvailable(teacher: TeacherScheduleData, slot: TimeSlot, schedule: Schedule): boolean {
    // 1. Öğretmenin genel müsaitiyetsizliği var mı?
    if (teacher.unavailableSlots.some(unav => unav.day === slot.day && unav.hour === slot.hour)) {
        return false;
    }
    // 2. Öğretmen o saatte zaten başka bir derse atanmış mı?
    const scheduleKey = getTimeSlotKey(slot);
    const entryAtSlot = schedule.get(scheduleKey);

    if (entryAtSlot) {
        if (entryAtSlot.teacherIds && entryAtSlot.teacherIds.includes(teacher.id)) {
            return false;
        }
        // Fallback logic removed as entries should now conform to the new structure
    }
    return true;
}

/** Belirli bir zamanda konumun müsait olup olmadığını kontrol eder */
function isLocationAvailable(locationId: string, slot: TimeSlot, schedule: Schedule): boolean {
    const scheduleKey = getTimeSlotKey(slot);
    const entryAtSlot = schedule.get(scheduleKey);

    if (entryAtSlot) {
        if (entryAtSlot.locationIds && entryAtSlot.locationIds.includes(locationId)) {
            return false;
        }
        // Fallback logic removed as entries should now conform to the new structure
    }
    return true; 
}

/** Belirli bir zamanda sınıfın (Dal+Seviye) müsait olup olmadığını kontrol eder (Doğru Mantık) */
function isClassAvailable(dalId: string, sinifSeviyesi: number, slot: TimeSlot, schedule: Schedule, lessonsMap: Map<string, LessonScheduleData>): boolean {
    const scheduleKey = getTimeSlotKey(slot);
    const entryAtSlot = schedule.get(scheduleKey);

    if (entryAtSlot) {
        const scheduledLesson = lessonsMap.get(entryAtSlot.lessonId);
        if (scheduledLesson) {
            if (sinifSeviyesi === 9) {
                if (scheduledLesson.sinifSeviyesi === 9) {
                    return false; 
                }
            } else {
                if (scheduledLesson.dalId === dalId && scheduledLesson.sinifSeviyesi === sinifSeviyesi) {
                    return false; 
                }
            }
        }
    }
    return true; // Sınıf bu saatte müsait.
}

/** Konumun ders için uygun olup olmadığını kontrol eder (Lab Tipi) */
function isLocationSuitable(lesson: LessonScheduleData, location: LocationScheduleData): boolean {
    if (lesson.suitableLabTypeIds.length === 0) {
        // Lab gerektirmeyen dersler sadece lab olmayan konumlara mı atanmalı?
        // Şimdilik lab olmayanlara atansın diyelim:
        return location.labTypeId === null;
    }
    return location.labTypeId !== null && lesson.suitableLabTypeIds.includes(location.labTypeId);
}

// --- YENİ: İkili Kaynak Uygunluk Kontrolü ---
function areSlotsAvailableForDual(
    lesson: LessonScheduleData,
    teacherA: TeacherScheduleData,
    locationA: LocationScheduleData,
    teacherB: TeacherScheduleData,
    locationB: LocationScheduleData,
    startSlot: TimeSlot,
    duration: number,
    input: SchedulerInput,
    checkDifferentDayForSecondHalf: boolean // Mevcut kontrolü buraya da taşıyalım
): TimeSlot[] | null {
    const consecutiveSlots: TimeSlot[] = [];
    const hoursPerDay = 10; 

    // Farklı Gün Kuralı Kontrolü (5+ saatlik derslerin 2. yarısı için)
    if (checkDifferentDayForSecondHalf) {
        let firstHalfDay: DayOfWeek | null = null;
        for (const entry of currentSchedule.values()) {
            if (entry.lessonId === lesson.id) {
                firstHalfDay = entry.timeSlot.day;
                break; // İlk parçayı bulduk, yeterli
            }
        }
        // Eğer ilk parça bulunduysa ve atamaya çalıştığımız gün ile aynıysa, uygun değil.
        if (firstHalfDay !== null && firstHalfDay === startSlot.day) {
            debugLogs.push(`[Constraint FAIL DiffDay Dual ${startSlot.day}-${startSlot.hour}] Cannot assign second half of ${lesson.name} (>5h) on the same day as the first half (${firstHalfDay}).`);
            return null;
        }
    }

    // Her saat için tüm kaynakların uygunluğunu kontrol et
    for (let i = 0; i < duration; i++) {
        const currentHour = (startSlot.hour + i) as HourOfDay;
        if (currentHour > hoursPerDay) {
             debugLogs.push(`[Slot FAIL Dual ${startSlot.day}-${currentHour}] Exceeds hoursPerDay for lesson ${lesson.name}`);
             return null; 
        }
        const currentSlot: TimeSlot = { day: startSlot.day, hour: currentHour };

        // Öğretmen A Müsait mi?
        if (!isTeacherAvailable(teacherA, currentSlot, currentSchedule)) {
            debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Teacher A (${teacherA.name}) unavailable for ${lesson.name}.`);
            return null;
        }
        // Öğretmen B Müsait mi?
        if (!isTeacherAvailable(teacherB, currentSlot, currentSchedule)) {
             debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Teacher B (${teacherB.name}) unavailable for ${lesson.name}.`);
            return null;
        }
         // Konum A Müsait mi?
        if (!isLocationAvailable(locationA.id, currentSlot, currentSchedule)) {
             debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Location A (${locationA.name}) unavailable for ${lesson.name}.`);
            return null;
        }
         // Konum B Müsait mi?
        if (!isLocationAvailable(locationB.id, currentSlot, currentSchedule)) {
             debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Location B (${locationB.name}) unavailable for ${lesson.name}.`);
            return null;
        }
        // Sınıf Müsait mi? (Sınıf hala tek)
        if (!isClassAvailable(lesson.dalId, lesson.sinifSeviyesi, currentSlot, currentSchedule, lessonsDataMap)) {
             debugLogs.push(`[Slot FAIL Dual ${currentSlot.day}-${currentSlot.hour}] Class (Dal ${lesson.dalId} Seviye ${lesson.sinifSeviyesi}) unavailable for ${lesson.name}.`);
            return null; 
        }
        
        consecutiveSlots.push(currentSlot);
    }
    // Tüm kontroller tüm saatler için başarılı olduysa
    debugLogs.push(`[Slots OK Dual ${startSlot.day}-${startSlot.hour} Dur:${duration}] All resources available for ${lesson.name}.`);
    return consecutiveSlots;
}

// --- YENİ: İkili Kaynak Atama Yardımcısı ---
function tryAssigningDualLesson(
    lessonIndex: number,
    currentLesson: LessonScheduleData,
    input: SchedulerInput,
    slot: TimeSlot,
    possibleTeachers: TeacherScheduleData[],
    possibleLocations: LocationScheduleData[]
): boolean {
    const teachersShuffled = shuffleArray([...possibleTeachers]);
    const locationsShuffled = shuffleArray([...possibleLocations]);

    for (let i = 0; i < teachersShuffled.length; i++) {
        const teacherA = teachersShuffled[i];
        for (let j = i + 1; j < teachersShuffled.length; j++) {
            const teacherB = teachersShuffled[j];
            for (let k = 0; k < locationsShuffled.length; k++) {
                const locationA = locationsShuffled[k];
                for (let l = k + 1; l < locationsShuffled.length; l++) {
                    const locationB = locationsShuffled[l];

                    // Süreleri belirle (GLOBAL remainingHours.get ile)
                    const currentRemainingForDurLogic = remainingHours.get(currentLesson.id) || 0;
                    let durationsToAttempt: number[] = [];
                    const totalHours = currentLesson.weeklyHours;
                    if (!currentLesson.canSplit) {
                        if (currentRemainingForDurLogic > 0) {
                            durationsToAttempt = [currentRemainingForDurLogic];
                        }
                    } else {
                        if (totalHours > 3) {
                            const targetDur1 = Math.ceil(totalHours / 2);
                            const targetDur2 = Math.floor(totalHours / 2);
                            if (currentRemainingForDurLogic === totalHours) {
                                if (targetDur1 > 0) durationsToAttempt = [targetDur1];
                            } else if (currentRemainingForDurLogic === targetDur2) {
                                if (targetDur2 > 0) durationsToAttempt = [targetDur2];
                            } else if (currentRemainingForDurLogic === targetDur1 && targetDur1 !== targetDur2) {
                                if (targetDur1 > 0) durationsToAttempt = [targetDur1];
                            }
                        } else {
                            if (currentRemainingForDurLogic === 3) durationsToAttempt.push(3);
                            if (currentRemainingForDurLogic >= 2 && !durationsToAttempt.includes(2)) durationsToAttempt.push(2);
                            if (currentRemainingForDurLogic >= 1 && !durationsToAttempt.includes(1)) durationsToAttempt.push(1);
                        }
                    }
                    // --- Süre belirleme sonu ---

                    for (const duration of durationsToAttempt) {
                        // Güncel kalanı tekrar OKU
                        const currentRemaining = remainingHours.get(currentLesson.id) || 0;
                        if (currentRemaining < duration) continue;

                        debugLogs.push(`[Try Dur ${duration} Dual ${slot.day}-${slot.hour}] For ${currentLesson.name} (Rem: ${currentRemaining}h) ...`);

                        // checkDifferentDay hesapla (currentRemaining kullanır)
                        const checkDifferentDay = totalHours > 5 && currentRemaining === Math.floor(totalHours / 2);
                        const consecutiveSlots = areSlotsAvailableForDual(
                            currentLesson, teacherA, locationA, teacherB, locationB,
                            slot, duration, input, checkDifferentDay
                        );

                        if (consecutiveSlots) {
                            // Atama yap
                            const previousRemaining = remainingHours.get(currentLesson.id) || 0; // GLOBAL'den al
                            debugLogs.push(`[Assign OK Dual ${slot.day}-${slot.hour} Dur:${duration}] For ${currentLesson.name} with T: ${teacherA.name},${teacherB.name} L: ${locationA.name},${locationB.name}`);
                            const assignedScheduleKeys: string[] = [];
                            consecutiveSlots.forEach(assignedSlot => {
                                const scheduleKey = getTimeSlotKey(assignedSlot);
                                currentSchedule.set(scheduleKey, {
                                    lessonId: currentLesson.id,
                                    lessonName: currentLesson.name,
                                    teacherIds: [teacherA.id, teacherB.id], // Use arrays
                                    teacherNames: [teacherA.name, teacherB.name], // Use arrays
                                    locationIds: [locationA.id, locationB.id], // Use arrays
                                    locationNames: [locationA.name, locationB.name], // Use arrays
                                    timeSlot: assignedSlot,
                                    dalId: currentLesson.dalId,
                                    sinifSeviyesi: currentLesson.sinifSeviyesi
                                });
                                assignedScheduleKeys.push(scheduleKey);
                            });

                            // GLOBAL map'i GÜNCELLE
                            remainingHours.set(currentLesson.id, previousRemaining - duration);

                            // Özyineleme (GLOBAL map'i okuyarak karar ver)
                            let solved = false;
                            const newRemaining = remainingHours.get(currentLesson.id) || 0;
                            if (newRemaining <= 0) {
                                solved = solveRecursive(lessonIndex + 1, input);
                            } else {
                                solved = solveRecursive(lessonIndex, input);
                            }

                            if (solved) return true;

                            // Geri al
                            debugLogs.push(`[Backtrack Dual ${slot.day}-${slot.hour} Dur:${duration}] For ${currentLesson.name}`);
                            assignedScheduleKeys.forEach(key => currentSchedule.delete(key));
                            // GLOBAL map'i GERİ YÜKLE
                            remainingHours.set(currentLesson.id, previousRemaining);
                        }
                    }
                }
            }
        }
    }
    return false;
}

// --- Main Scheduling Logic (Backtracking) ---

// State'ler
let currentSchedule: Schedule;
let remainingHours: Map<string, number>; 
let lessonsDataMap: Map<string, LessonScheduleData>;
let teachersDataMap: Map<string, TeacherScheduleData>;
let locationsDataMap: Map<string, LocationScheduleData>;
let allLessons: LessonScheduleData[];
let allTimeSlots: TimeSlot[];
let requiredAssignments: Map<string, Set<string>>;
let debugLogs: string[]; // <<< YENİ: Logları toplamak için dizi

/**
 * Belirtilen başlangıç saatinden itibaren ardışık saatlerin
 * ders, öğretmen, konum ve sınıf için uygun olup olmadığını kontrol eder.
 */
function areConsecutiveSlotsAvailable(
    lesson: LessonScheduleData,
    teacher: TeacherScheduleData,
    location: LocationScheduleData,
    startSlot: TimeSlot,
    duration: number,
    input: SchedulerInput,
    checkDifferentDayForSecondHalf: boolean
): TimeSlot[] | null {
    const consecutiveSlots: TimeSlot[] = [];
    const hoursPerDay = 10;

    // Farklı Gün Kuralı Kontrolü (5+ saatlik derslerin 2. yarısı için)
    if (checkDifferentDayForSecondHalf) {
        let firstHalfDay: DayOfWeek | null = null;
        for (const entry of currentSchedule.values()) {
            if (entry.lessonId === lesson.id) {
                firstHalfDay = entry.timeSlot.day;
                break; // İlk parçayı bulduk, yeterli
            }
        }
        // Eğer ilk parça bulunduysa ve atamaya çalıştığımız gün ile aynıysa, uygun değil.
        if (firstHalfDay !== null && firstHalfDay === startSlot.day) {
            debugLogs.push(`[Constraint FAIL DiffDay ${startSlot.day}-${startSlot.hour}] Cannot assign second half of ${lesson.name} (>5h) on the same day as the first half (${firstHalfDay}).`);
            return null;
        }
    }

    // Her saat için tüm kaynakların uygunluğunu kontrol et
    for (let i = 0; i < duration; i++) {
        const currentHour = (startSlot.hour + i) as HourOfDay;
        if (currentHour > hoursPerDay) {
             // Daha detaylı log
             debugLogs.push(`[Slot FAIL Hours ${startSlot.day}-${startSlot.hour} Dur:${duration}] Hour ${currentHour} exceeds hoursPerDay (${hoursPerDay}) for lesson ${lesson.name}.`);
             return null;
        }
        const currentSlot: TimeSlot = { day: startSlot.day, hour: currentHour };

        // --- YENİ Detaylı Loglar ---
        const teacherAvailable = isTeacherAvailable(teacher, currentSlot, currentSchedule);
        if (!teacherAvailable) {
             debugLogs.push(`[Slot FAIL Teacher ${currentSlot.day}-${currentSlot.hour}] Teacher ${teacher.name} unavailable for lesson ${lesson.name}.`);
             return null;
        }

        const locationAvailable = isLocationAvailable(location.id, currentSlot, currentSchedule);
        if (!locationAvailable) {
             debugLogs.push(`[Slot FAIL Location ${currentSlot.day}-${currentSlot.hour}] Location ${location.name} unavailable for lesson ${lesson.name}.`);
            return null;
        }

        const classAvailable = isClassAvailable(lesson.dalId, lesson.sinifSeviyesi, currentSlot, currentSchedule, lessonsDataMap);
        if (!classAvailable) {
             debugLogs.push(`[Slot FAIL Class ${currentSlot.day}-${currentSlot.hour}] Class (Dal: ${lesson.dalId}, Seviye: ${lesson.sinifSeviyesi}) unavailable for lesson ${lesson.name}.`);
            return null;
        }
        // --- Log Sonu ---

        consecutiveSlots.push(currentSlot);
    }
    // Başarılı olursa log ekleyelim (Opsiyonel)
    // debugLogs.push(`[Slots OK ${startSlot.day}-${startSlot.hour} Dur:${duration}] Slots available for ${lesson.name} with ${teacher.name} at ${location.name}`);
    return consecutiveSlots;
}

/** Backtracking algoritmasının çekirdek fonksiyonu */
function solveRecursive(lessonIndex: number, input: SchedulerInput): boolean {
    // --- YENİ LOG: Fonksiyon Girişi ---
    debugLogs.push(`[>>> solveRecursive ENTER] Lesson Index: ${lessonIndex}`);
    // --- LOG SONU ---

    if (lessonIndex >= allLessons.length) {
        debugLogs.push(`[<<< solveRecursive EXIT - SUCCESS] Base case reached.`); // Log base case success
        return true; // Base case: All lessons processed
    }

    const currentLesson = allLessons[lessonIndex];

    // --- YENİ LOG: Mevcut Ders Bilgisi ---
    debugLogs.push(`[DEBUG solveRecursive] Processing Lesson: ${currentLesson.name} (Index: ${lessonIndex})`);
    // --- LOG SONU ---

    // --- Kalan Saat Kontrolü (Döngü içinde yapılacak) ---
    // let initialRemainingHoursCheck = remainingHours.get(currentLesson.id) || 0;
    // if (initialRemainingHoursCheck <= 0 || !currentLesson.needsScheduling) {
    //     return solveRecursive(lessonIndex + 1, input);
    // }

    // --- Öğretmenleri ve Konumları Bul (Her iki yol için de gerekli) ---
    const possibleTeachers = currentLesson.possibleTeacherIds
        .map(id => teachersDataMap.get(id))
        .filter((t): t is TeacherScheduleData => !!t);

    const requiredTeachers: TeacherScheduleData[] = [];
    const otherTeachers: TeacherScheduleData[] = [];
    possibleTeachers.forEach(teacher => {
        if (requiredAssignments.get(teacher.id)?.has(currentLesson.id)) {
            requiredTeachers.push(teacher);
        } else {
            otherTeachers.push(teacher);
        }
    });

    // --- YENİ LOG: Zorunlu Öğretmen Kontrolü ---
    debugLogs.push(`[DEBUG ReqCheck] Lesson: ${currentLesson.name} (${currentLesson.id})`);
    if (requiredTeachers.length > 0) {
        debugLogs.push(` -> Required Teachers found: ${requiredTeachers.map(t => `${t.name} (${t.id})`).join(', ')}`);
    } else {
        debugLogs.push(` -> No Required Teachers according to map.`);
    }
    // debugLogs.push(` -> Other Possible Teachers: ${otherTeachers.map(t => `${t.name} (${t.id})`).join(', ')}`); // İsteğe bağlı: Diğerlerini de logla
    // --- LOG SONU ---

    // Find and shuffle locations (no prioritization needed here)
    const possibleLocations = (currentLesson.suitableLabTypeIds.length > 0
        ? input.locations.filter(loc =>
            loc.labTypeId !== null && currentLesson.suitableLabTypeIds.includes(loc.labTypeId)
          )
        : input.locations
    ).filter(loc => loc.capacity !== null && loc.capacity >= 0);

    // Gerekli kaynak sayısı kontrolü
    const minTeachersRequired = currentLesson.requiresMultipleResources ? 2 : 1;
    const minLocationsRequired = currentLesson.requiresMultipleResources ? 2 : 1;

    if (possibleTeachers.length < minTeachersRequired) {
        debugLogs.push(`[FAIL] Not enough possible teachers for ${currentLesson.name} (Req: ${minTeachersRequired}, Found: ${possibleTeachers.length})`);
        return solveRecursive(lessonIndex + 1, input);
    }
    if (possibleLocations.length < minLocationsRequired) {
        debugLogs.push(`[FAIL] Not enough possible locations for ${currentLesson.name} (Req: ${minLocationsRequired}, Found: ${possibleLocations.length})`);
        return solveRecursive(lessonIndex + 1, input);
    }

    const requiredTeachersShuffled = shuffleArray([...requiredTeachers]);
    const otherTeachersShuffled = shuffleArray([...otherTeachers]);
    const possibleLocationsShuffled = shuffleArray([...possibleLocations]);

    // --- Tekli Kaynak Atama Yardımcısı (Global Map Kullanacak Şekilde) --- //
    const tryAssigningWithTeachers = (teachersToTry: TeacherScheduleData[], slot: TimeSlot): boolean => {
        // --- YENİ LOG: Fonksiyon Girişi ---
         debugLogs.push(`[DEBUG tryAssign Start] Slot: ${slot.day}-${slot.hour}, Lesson: ${currentLesson.name}, Teachers to try: ${teachersToTry.length > 0 ? teachersToTry.map(t=>t.name).join('/') : 'NONE'}`);
         // --- LOG SONU ---

        for (const teacher of teachersToTry) {
             // --- YENİ LOG: Öğretmen Döngüsü ---
             debugLogs.push(`[DEBUG tryAssign Teacher Loop] Trying Teacher: ${teacher.name} for Slot: ${slot.day}-${slot.hour}, Lesson: ${currentLesson.name}`);
            // --- LOG SONU ---
            for (const location of possibleLocationsShuffled) {
                // İçerideki attemptAssignment global map kullanacak
                const attemptAssignment = (duration: number, currentTeacher: TeacherScheduleData): boolean => {
                    // --- YENİ LOG: attemptAssignment GİRİŞİ ---
                    debugLogs.push(`[DEBUG attemptAssign Entry ${slot.day}-${slot.hour} Dur:${duration}] For L:${currentLesson.name}, T:${currentTeacher.name}, Loc:${location.name}`);
                    // --- LOG SONU ---

                    const currentRemaining = remainingHours.get(currentLesson.id) || 0;
                    if (currentRemaining < duration) {
                         // --- YENİ LOG: Yetersiz Saat ---
                         debugLogs.push(`[DEBUG attemptAssign FAIL ${slot.day}-${slot.hour} Dur:${duration}] Not enough remaining hours (Rem: ${currentRemaining}h)`);
                         // --- LOG SONU ---
                         return false;
                    }

                    // --- YENİ: Tek Öğretmen Kuralı Kontrolü ---
                    if (!currentLesson.requiresMultipleResources) {
                        let existingTeacherId: string | null = null;
                        for(const entry of currentSchedule.values()) {
                            if (entry.lessonId === currentLesson.id) {
                                // Corrected: Use teacherIds array
                                if (entry.teacherIds && entry.teacherIds.length > 0) {
                                    existingTeacherId = entry.teacherIds[0]; // Assuming the first teacher if multiple
                                }
                                break;
                            }
                        }
                        // Eğer ders önceden atanmışsa VE denenen öğretmen farklıysa, izin verme
                        if (existingTeacherId !== null && existingTeacherId !== currentTeacher.id) {
                            // --- YENİ Detaylı Log ---
                            const existingTeacherName = teachersDataMap.get(existingTeacherId)?.name ?? 'Bilinmeyen';
                            debugLogs.push(`[Constraint FAIL SameTeacher ${slot.day}-${slot.hour} Dur:${duration}] Lesson ${currentLesson.name} already assigned to ${existingTeacherName} (${existingTeacherId}). Cannot assign this part to ${currentTeacher.name} (${currentTeacher.id}).`);
                            // --- Log Sonu ---
                            return false;
                        }
                         // --- YENİ Başarılı Kontrol Logu ---
                        else if (existingTeacherId !== null /* && existingTeacherId === currentTeacher.id */) {
                            // Zaten existingTeacherId === currentTeacher.id durumu else if'e girmez,
                            // ama kontrolün geçtiğini belirtmek için log ekleyelim.
                            debugLogs.push(`[Constraint OK SameTeacher ${slot.day}-${slot.hour} Dur:${duration}] Lesson ${currentLesson.name} already assigned to ${currentTeacher.name}. Allowing attempt.`);
                        }
                         // --- Log Sonu ---
                        // else: existingTeacherId === null (ders ilk defa atanıyor) - kontrol gerekmez.
                    }
                    // --- Kontrol Sonu ---

                    // checkDifferentDay hesapla
                    const totalHoursCheck = currentLesson.weeklyHours;
                    const checkDifferentDay = totalHoursCheck > 5 && currentRemaining === Math.floor(totalHoursCheck / 2);

                    // --- YENİ LOG: areConsecutiveSlotsAvailable ÇAĞRISI ÖNCESİ ---
                    debugLogs.push(`[DEBUG Pre-ConsecCheck ${slot.day}-${slot.hour} Dur:${duration}] Calling areConsecutiveSlotsAvailable for L:${currentLesson.name}, T:${currentTeacher.name}, Loc:${location.name}, CheckDiffDay:${checkDifferentDay}`);
                    // --- LOG SONU ---

                    const consecutiveSlots = areConsecutiveSlotsAvailable(
                        currentLesson, currentTeacher, location, slot, duration, input,
                        checkDifferentDay
                    );

                     // --- YENİ LOG: areConsecutiveSlotsAvailable ÇAĞRISI SONRASI ---
                    debugLogs.push(`[DEBUG Post-ConsecCheck ${slot.day}-${slot.hour} Dur:${duration}] Result: ${consecutiveSlots ? `OK (${consecutiveSlots.length} slots)` : 'NULL'}`);
                    // --- LOG SONU ---


                    if (consecutiveSlots) {
                        // Max 2 öğretmen kontrolü (değişiklik yok)
                        const assignedTeachers = new Set<string>();
                        for (const entry of currentSchedule.values()) {
                            // Ensure entry.teacherIds exists before trying to access it
                            if (entry.lessonId === currentLesson.id && entry.teacherIds) {
                                // If it's already an array, add all teachers from that entry
                                entry.teacherIds.forEach(tid => assignedTeachers.add(tid));
                            }
                        }
                        const isNewTeacher = !assignedTeachers.has(currentTeacher.id);
                        // This logic seems to be about ensuring a lesson isn't split among too many *different* teachers.
                        // If requiresMultipleResources is false, it should ideally only have 1 teacher.
                        // If requiresMultipleResources is true, tryAssigningDualLesson handles the 2 teachers.
                        // This section might be redundant if currentLesson.requiresMultipleResources is false, 
                        // as the same teacher constraint (lines 496-515) should handle it.
                        // For now, let's assume this max teacher check is relevant.
                        const canAssignTeacher = !isNewTeacher || assignedTeachers.size < (currentLesson.requiresMultipleResources ? 2 : 1);

                        if (!canAssignTeacher) {
                            const assignedTeacherNames = Array.from(assignedTeachers).map(id => teachersDataMap.get(id)?.name ?? id).join(', ');
                            debugLogs.push(`[Constraint FAIL MaxTeachers ${slot.day}-${slot.hour} Dur:${duration}] Cannot assign ${currentTeacher.name} to ${currentLesson.name}. Already assigned to ${assignedTeachers.size} teachers: ${assignedTeacherNames}`);
                            return false;
                        }

                        // Atama (currentTeacher kullanılıyor)
                        const previousRemaining = remainingHours.get(currentLesson.id) || 0;
                        debugLogs.push(`[Assign OK ${slot.day}-${slot.hour} Dur:${duration}] L: ${currentLesson.name} to T: ${currentTeacher.name} at L: ${location.name}`);
                        const assignedScheduleKeys: string[] = []; // For backtracking
                        consecutiveSlots.forEach(assignedSlot => {
                            const scheduleKey = getTimeSlotKey(assignedSlot); // Use Day-Hour key
                            currentSchedule.set(scheduleKey, {
                                lessonId: currentLesson.id, 
                                lessonName: currentLesson.name,
                                teacherIds: [currentTeacher.id], // Use array
                                teacherNames: [currentTeacher.name], // Use array
                                locationIds: [location.id], // Use array
                                locationNames: [location.name], // Use array
                                timeSlot: assignedSlot, 
                                dalId: currentLesson.dalId,
                                sinifSeviyesi: currentLesson.sinifSeviyesi
                            });
                            assignedScheduleKeys.push(scheduleKey);
                        });
                        remainingHours.set(currentLesson.id, previousRemaining - duration);

                        // Özyineleme ...
                        let solved = false;
                        const newRemaining = remainingHours.get(currentLesson.id) || 0;
                        if (newRemaining <= 0) { solved = solveRecursive(lessonIndex + 1, input); } else { solved = solveRecursive(lessonIndex, input); }

                        if (solved) return true;

                        // Geri al (currentTeacher logda belirtilebilir)
                        debugLogs.push(`[Backtrack ${slot.day}-${slot.hour} Dur:${duration}] Removing ${currentLesson.name} from T: ${currentTeacher.name} at L: ${location.name}`);
                        assignedScheduleKeys.forEach(key => currentSchedule.delete(key)); // Use correct keys for deletion
                        remainingHours.set(currentLesson.id, previousRemaining);
                    }
                     // --- YENİ LOG: attemptAssignment Sonu (Başarısız) ---
                     else { // consecutiveSlots null ise buraya düşer
                         debugLogs.push(`[DEBUG attemptAssign FAIL ${slot.day}-${slot.hour} Dur:${duration}] Consecutive slots check failed.`);
                     }
                    // --- LOG SONU ---
                    return false; // Başarısız oldu (ya slot bulunamadı ya da özyinelemeden false döndü)
                }; // attemptAssignment sonu

                // Süreleri belirle ...
                const currentRemainingForDurLogic = remainingHours.get(currentLesson.id) || 0;
                let durationsToAttempt: number[] = [];
                const totalHours = currentLesson.weeklyHours;
                if (!currentLesson.canSplit) { if (currentRemainingForDurLogic > 0) { durationsToAttempt = [currentRemainingForDurLogic]; } }
                 else {
                     if (totalHours > 3) {
                         const targetDur1 = Math.ceil(totalHours / 2); // Size of the first chunk
                         const targetDur2 = Math.floor(totalHours / 2); // Size of the second chunk

                         // If the full duration is remaining, attempt to schedule the first chunk.
                         if (currentRemainingForDurLogic === totalHours && targetDur1 > 0) {
                             durationsToAttempt = [targetDur1];
                         }
                         // If the remaining duration exactly matches the size of the second chunk, attempt to schedule it.
                         // This handles the case after the first chunk (of size targetDur1) has been scheduled.
                         else if (currentRemainingForDurLogic === targetDur2 && targetDur2 > 0) {
                             durationsToAttempt = [targetDur2];
                         }
                         // If the remaining duration matches the first chunk size AND the chunks are different sizes (i.e., totalHours is odd),
                         // attempt to schedule the first chunk size. This might occur if scheduling attempts backtrack.
                         else if (currentRemainingForDurLogic === targetDur1 && targetDur1 !== targetDur2 && targetDur1 > 0) {
                             durationsToAttempt = [targetDur1];
                         }
                     } else { // totalHours <= 3
                         // Logic for smaller lessons (attempt 3, 2, or 1 hour blocks based on remaining)
                         if (currentRemainingForDurLogic === 3) durationsToAttempt.push(3);
                         // Use >= to allow trying smaller blocks even if more hours remain (e.g., try 2h block if 3h remain)
                         if (currentRemainingForDurLogic >= 2 && !durationsToAttempt.includes(2)) durationsToAttempt.push(2);
                         if (currentRemainingForDurLogic >= 1 && !durationsToAttempt.includes(1)) durationsToAttempt.push(1);
                         // Sort descending to try largest possible block first
                         durationsToAttempt.sort((a, b) => b - a);
                     }
                 }
                 // --- YENİ LOG: Hesaplanmış Süreler ---
                 debugLogs.push(`[DEBUG Durations ${slot.day}-${slot.hour}] For L:${currentLesson.name}, T:${teacher.name}, Loc:${location.name}. Calculated durationsToAttempt: [${durationsToAttempt.join(',')}] (Rem: ${currentRemainingForDurLogic}h, CanSplit: ${currentLesson.canSplit})`);
                 // --- LOG SONU ---


                // Belirlenen süreleri dene
                let success = false;
                for (const duration of durationsToAttempt) {
                    success = attemptAssignment(duration, teacher);
                    if (success) break;
                }

                if (success) return true;
            }
        }
         // --- YENİ LOG: Fonksiyon Sonu (Başarısız) ---
        debugLogs.push(`[DEBUG tryAssign End] Failed for all teacher/location pairs for Slot: ${slot.day}-${slot.hour}, Lesson: ${currentLesson.name}`);
        // --- LOG SONU ---
        return false;
    };
    // --- tryAssigningWithTeachers Sonu --- //

    // --- Slotları Döngüye Al ve Uygun Atama Fonksiyonunu Çağır --- //
    for (const slot of allTimeSlots) {
        // --- Döngü başında GÜNCEL Kalan Saati OKU --- //
        const currentRemainingHours = remainingHours.get(currentLesson.id) || 0;

        // --- Eğer dersin scheduling'i bitmişse veya saat kalmadıysa bu slotu/dersi atla --- //
        if (!currentLesson.needsScheduling || currentRemainingHours <= 0) {
            // Bu ders zaten başka bir recursive kolda bitirilmiş olabilir VEYA
            // اصلا scheduling dışı bırakılmış olabilir.
            // Eğer saat kalmadıysa, sonraki derse geçmek için solveRecursive(lessonIndex + 1, input) DÖNMEMELİYİZ,
            // çünkü bu, bu ders için tüm slotları denemeden bir sonraki derse atlar.
            // Sadece bu slotu atlamak yeterli.
            if (currentRemainingHours <= 0) {
                 // --- YENİ LOG: Ders Bitti/Saat Kalmadı ---
                 // debugLogs.push(`[DEBUG Slot ${slot.day}-${slot.hour}] Lesson ${currentLesson.name} already assigned (0 hours left). Skipping slot.`);
                 // --- LOG SONU ---
                continue; // Bu ders için saat kalmamış, bir sonraki slota geç
            }
            if (!currentLesson.needsScheduling) {
                 debugLogs.push(`[DEBUG Slot ${slot.day}-${slot.hour}] Lesson ${currentLesson.name} does not need scheduling. Skipping slot.`);
                 // Eğer bu ders hiç çizelgeye dahil edilmeyecekse, tüm slotları denemek yerine
                 // doğrudan bir sonraki derse geçmek daha verimli olabilir.
                 // Bu nedenle, bu kontrolü döngünün DIŞINA, en başa almak daha mantıklı.
                 // Şimdilik burada bırakalım, ama optimizasyon olarak not edelim.
                 continue;
            }
        }

        debugLogs.push(`[Try Slot ${slot.day}-${slot.hour}] For lesson: ${currentLesson.name} (Rem: ${currentRemainingHours}h, ReqDual: ${currentLesson.requiresMultipleResources})`);

        let solved = false;
        if (currentLesson.requiresMultipleResources) {
            // İKİLİ Kaynak Atamayı Dene (remainingHoursRef YOK)
            solved = tryAssigningDualLesson(
                lessonIndex, currentLesson, input, slot,
                possibleTeachers, possibleLocations
            );
        } else {
            // TEKLİ Kaynak Atamayı Dene
            // ... (mevcut zorunlu/diğer öğretmen mantığı) ...
             if (requiredTeachersShuffled.length > 0) {
                debugLogs.push(` -> Zorunlu öğretmen(ler) var (${requiredTeachersShuffled.map(t=>t.name).join(', ')}). Sadece onlar deneniyor.`);
                solved = tryAssigningWithTeachers(requiredTeachersShuffled, slot);
                if (!solved) debugLogs.push(` -> Zorunlu öğretmen(ler) ${slot.day}-${slot.hour} için atanamadı.`);
            } else {
                 debugLogs.push(` -> Zorunlu öğretmen yok. Diğer olası öğretmenler deneniyor.`);
                solved = tryAssigningWithTeachers(otherTeachersShuffled, slot);
                 if (!solved) debugLogs.push(` -> Diğer olası öğretmenler ${slot.day}-${slot.hour} için atanamadı.`);
            }
        }

        // --- YENİ LOG: Recursive Çağrı Öncesi/Sonrası ---
        if (solved) {
            debugLogs.push(`[DEBUG solveRecursive] Slot ${slot.day}-${slot.hour} assignment led to SUCCESS for lesson ${currentLesson.name}. Returning true.`);
            debugLogs.push(`[<<< solveRecursive EXIT - FOUND SLOT] Lesson Index: ${lessonIndex}`); // Log successful exit
            return true; // Found a valid assignment for this lesson branch
        } else {
            // debugLogs.push(`[DEBUG solveRecursive] Slot ${slot.day}-${slot.hour} did NOT lead to a solution for lesson ${currentLesson.name}. Trying next slot.`);
        }
        // --- LOG SONU ---
    }

    // --- YENİ LOG: Döngü Sonu (Başarısız) ---
    debugLogs.push(`[FAIL solveRecursive] All slots tried for Lesson ${currentLesson.name} (Index: ${lessonIndex}). Backtracking...`);
    debugLogs.push(`[<<< solveRecursive EXIT - FAILED] Lesson Index: ${lessonIndex}`); // Log failed exit
    // --- LOG SONU ---
    return false; // Bu ders için çözüm bulunamadı, geri izle
}

// --- NEW: Calculate Penalty for Short Teaching Days --- 
function calculateShortDayPenalty(
    schedule: Schedule,
    teachers: TeacherScheduleData[] // Use TeacherScheduleData to get teacher IDs
): number {
    let totalPenalty = 0;
    const minLessonsPerDay = 4; // Threshold

    // Group lessons by teacher, then by day
    const teacherDailyLessons = new Map<string, Map<DayOfWeek, number>>();

    schedule.forEach((entry) => {
        // Corrected: Iterate over teacherIds if present
        if (entry.teacherIds && entry.teacherIds.length > 0) {
            entry.teacherIds.forEach(teacherId => {
                const day = entry.timeSlot.day;
                if (!teacherDailyLessons.has(teacherId)) {
                    teacherDailyLessons.set(teacherId, new Map<DayOfWeek, number>());
                }
                const dailyMap = teacherDailyLessons.get(teacherId)!;
                dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
            });
        }
    });

    // Calculate penalty
    teacherDailyLessons.forEach((dailyMap, teacherId) => {
        dailyMap.forEach((lessonCount, day) => {
            if (lessonCount > 0 && lessonCount < minLessonsPerDay) {
                // Quadratic penalty: the fewer lessons, the higher the penalty
                const penalty = Math.pow(minLessonsPerDay - lessonCount, 2);
                totalPenalty += penalty;
            }
        });
    });

    return totalPenalty;
}
// --- End Short Day Penalty --- 

// --- NEW: Return type for the best schedule finder ---
export interface BestSchedulerResult {
    success: boolean;
    bestSchedule: Schedule; 
    unassignedLessons: LessonScheduleData[]; 
    logs: string[]; 
    attemptsMade: number;   
    successfulAttempts: number; 
    // Metrics for the best schedule found:
    minFitnessScore: number; 
    bestVariance: number;    
    bestTotalGaps: number;   
    bestShortDayPenalty: number; // <<< NEW: Add penalty metric
    // Error message if no successful schedule found:
    error?: string;
}

// --- Main Exported Function --- 
// Existing generateSchedule renamed to runSingleScheduleAttempt and NOT exported
async function runSingleScheduleAttempt(input: SchedulerInput): Promise<SchedulerResult> {
    // --- Initialize Global State for THIS attempt --- 
    // IMPORTANT: Reset global state for each attempt. 
    // This relies on generateSchedule's internal logic correctly initializing these.
    // Consider refactoring generateSchedule to not use globals if issues arise.
    currentSchedule = new Map<string, ScheduledEntry>();
    remainingHours = new Map<string, number>();
    lessonsDataMap = new Map<string, LessonScheduleData>();
    teachersDataMap = new Map<string, TeacherScheduleData>();
    locationsDataMap = new Map<string, LocationScheduleData>();
    allLessons = [...input.lessons].sort((a, b) => b.weeklyHours - a.weeklyHours);
    // Shuffle time slots for variety in each attempt
    allTimeSlots = shuffleArray([...input.timeSlots]); 
    requiredAssignments = new Map(input.requiredAssignmentsMap); 
    debugLogs = []; // Reset logs for this attempt

    // Initialize remaining hours
    allLessons.forEach(lesson => {
        if (lesson.needsScheduling) {
            remainingHours.set(lesson.id, lesson.weeklyHours);
        } else {
            remainingHours.set(lesson.id, 0);
        }
        lessonsDataMap.set(lesson.id, lesson);
    });

    // Initialize teacher and location maps
    input.teachers.forEach(teacher => teachersDataMap.set(teacher.id, teacher));
    input.locations.forEach(location => locationsDataMap.set(location.id, location));

    // --- Start the Recursive Solver --- 
    debugLogs.push(`--- Starting Schedule Attempt ---`);
    debugLogs.push(`Total Lessons to Schedule: ${allLessons.filter(l => l.needsScheduling).length}`);
    debugLogs.push(`Total Time Slots Available: ${allTimeSlots.length}`);

    const startTime = performance.now();
    let success = false;
    try {
        // Ensure solveRecursive uses the re-initialized global state
        success = solveRecursive(0, input); 
    } catch (error: any) {
        console.error("Error during scheduling attempt:", error);
        debugLogs.push(`[FATAL ERROR] ${error.message || 'Unknown error during solveRecursive'}`);
         return {
            success: false,
            schedule: new Map(),
            logs: debugLogs,
            unassignedLessons: input.lessons.filter(l => l.needsScheduling), // Assume all failed
            error: `Algoritma sırasında bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
        };
    }
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    debugLogs.push(`--- Scheduling Attempt Finished ---`);
    debugLogs.push(`Result: ${success ? 'Success' : 'Failed'}`);
    debugLogs.push(`Duration: ${duration} seconds`);

    // --- Prepare Result for THIS attempt --- 
    const finalSchedule = success ? currentSchedule : new Map();

    let allHoursAssigned = true;
    const unassignedLessonNames: string[] = [];
    remainingHours.forEach((hoursLeft, lessonId) => {
        const lesson = lessonsDataMap.get(lessonId);
        if (lesson?.needsScheduling && hoursLeft > 0) {
            allHoursAssigned = false;
            unassignedLessonNames.push(`${lesson.name} (${hoursLeft}h missing)`);
        }
    });

    const finalUnassignedLessons: LessonScheduleData[] = [];
    if (!success || !allHoursAssigned) {
        remainingHours.forEach((hoursLeft, lessonId) => {
            const lesson = lessonsDataMap.get(lessonId);
            if (lesson?.needsScheduling && hoursLeft > 0) {
                finalUnassignedLessons.push(lesson);
            }
        });
        if (success && !allHoursAssigned) {
             debugLogs.push(`[WARNING] Attempt successful, but unassigned hours: ${unassignedLessonNames.join(', ')}`);
        }        
    }

    const finalSuccess = success && allHoursAssigned;
    if (!finalSuccess && success) {
        // If backtracking succeeded but couldn't place all hours
        debugLogs.push('[INFO] Algorithm found a partial schedule but could not assign all required hours.');
    }

    return {
        success: finalSuccess, 
        schedule: finalSchedule,
        unassignedLessons: finalUnassignedLessons, 
        logs: debugLogs,
        error: finalSuccess 
            ? undefined 
            : (unassignedLessonNames.length > 0 
                ? `Atanamayan dersler: ${unassignedLessonNames.join(', ')}` 
                : "Dersler yerleştirilemedi (kısıtlama veya hata)."),
    };
}

// --- NEW Exported Function to Find Best Schedule --- 
export async function findBestSchedule(
    input: SchedulerInput,
    numberOfAttempts: number = 5, 
    weightVariance: number = 1.0, 
    weightGaps: number = 1.0,
    weightShortDays: number = 1.0 // <<< NEW: Add weight for short days
): Promise<BestSchedulerResult> {
    let bestScheduleResult: SchedulerResult | null = null;
    let minFitnessScore = Infinity;
    let bestVariance = Infinity;
    let bestTotalGaps = Infinity;
    let bestShortDayPenalty = Infinity; // <<< NEW: Track best penalty score
    let successfulAttempts = 0;
    let validAttempts = 0; 

    console.log(`[Scheduler] Starting search: Attempts=${numberOfAttempts}, W_Variance=${weightVariance}, W_Gaps=${weightGaps}, W_ShortDays=${weightShortDays}`); // Log new weight

    for (let i = 0; i < numberOfAttempts; i++) {
        console.log(`[Scheduler] Running attempt ${i + 1}/${numberOfAttempts}...`);
        const result = await runSingleScheduleAttempt(input);

        if (result.success) {
            successfulAttempts++;
            
            if (!hasAllTeachersWithFreeDay(result.schedule, input.teachers)) {
                console.log(`[Scheduler] Attempt ${i + 1} discarded: Not all teachers have a free day.`);
                continue; 
            }
            
            validAttempts++;
            const variance = calculateTeacherWorkloadVariance(result.schedule, input.teachers);
            const totalGaps = calculateTotalGaps(result.schedule, input.teachers);
            const shortDayPenalty = calculateShortDayPenalty(result.schedule, input.teachers); // <<< NEW: Calculate penalty
            
            // <<< NEW: Update fitness score calculation
            const fitnessScore = (weightVariance * variance) + 
                                 (weightGaps * totalGaps) + 
                                 (weightShortDays * shortDayPenalty);
            
            // <<< NEW: Update log message
            console.log(`[Scheduler] Attempt ${i + 1} valid & scored. V: ${variance.toFixed(2)}, G: ${totalGaps}, SD Pen: ${shortDayPenalty.toFixed(2)}, Fit: ${fitnessScore.toFixed(4)}`);

            if (fitnessScore < minFitnessScore) {
                 // <<< NEW: Update log message
                console.log(`[Scheduler] --> Found new best schedule (Fitness: ${fitnessScore.toFixed(4)} < ${minFitnessScore === Infinity ? 'Infinity' : minFitnessScore.toFixed(4)})`);
                minFitnessScore = fitnessScore;
                bestVariance = variance;    
                bestTotalGaps = totalGaps;
                bestShortDayPenalty = shortDayPenalty; // <<< NEW: Store best penalty
                bestScheduleResult = result; 
            }
        } else {
            console.log(`[Scheduler] Attempt ${i + 1} failed. Error: ${result.error}`);
        }
    }

    console.log(`[Scheduler] Finished ${numberOfAttempts} attempts. Successful: ${successfulAttempts}, Valid (with free days): ${validAttempts}.`);

    if (bestScheduleResult) {
        // <<< NEW: Update log message
        console.log(`[Scheduler] Best valid schedule found. Fit: ${minFitnessScore.toFixed(4)}, V: ${bestVariance.toFixed(2)}, G: ${bestTotalGaps}, SD Pen: ${bestShortDayPenalty.toFixed(2)}`);
        return {
            success: true,
            bestSchedule: bestScheduleResult.schedule,
            unassignedLessons: bestScheduleResult.unassignedLessons, 
            logs: bestScheduleResult.logs, 
            attemptsMade: numberOfAttempts,
            successfulAttempts: validAttempts, 
            minFitnessScore: minFitnessScore,
            bestVariance: bestVariance,
            bestTotalGaps: bestTotalGaps,
            bestShortDayPenalty: bestShortDayPenalty, // <<< NEW: Return best penalty
        };
    } else {
        console.log(`[Scheduler] No valid schedule (with free days for all teachers) found after ${numberOfAttempts} attempts.`);
        const baseError = `Belirtilen sayıda denemede (${numberOfAttempts}) başarılı bir çizelge oluşturulamadı.`;
        const reason = successfulAttempts > 0 ? ` (Oluşturulan ${successfulAttempts} programda tüm öğretmenlerin boş günü sağlanamadı).` : ``;
        return {
            success: false,
            bestSchedule: new Map(), 
            unassignedLessons: input.lessons.filter(l => l.needsScheduling), 
            logs: [], 
            attemptsMade: numberOfAttempts,
            successfulAttempts: 0, 
            minFitnessScore: Infinity,
            bestVariance: Infinity,
            bestTotalGaps: Infinity,
            bestShortDayPenalty: Infinity, // <<< NEW: Return infinity for penalty
            error: baseError + reason,
        };
    }
}

// --- YENİ: Öğretmen Yükü Varyans Hesaplama --- 
function calculateTeacherWorkloadVariance(
  schedule: Schedule,
  teachers: TeacherScheduleData[]
): number {
  if (teachers.length === 0) return 0; // Öğretmen yoksa varyans 0

  const teacherHours = new Map<string, number>();
  teachers.forEach(t => teacherHours.set(t.id, 0)); // Başlangıçta tüm öğretmenlerin saati 0
  const processedEntries = new Set<string>(); // İşlenen ders-saat kombinasyonlarını takip et

  for (const entry of schedule.values()) {
      const entryKey = `${entry.lessonId}-${entry.timeSlot.day}-${entry.timeSlot.hour}`;
      if (!processedEntries.has(entryKey)) {
          if (entry.teacherIds && entry.teacherIds.length > 0) {
              entry.teacherIds.forEach(teacherId => {
                  const currentHours = teacherHours.get(teacherId) ?? 0;
                  teacherHours.set(teacherId, currentHours + 1);
              });
          }
          processedEntries.add(entryKey); // Bu kombinasyonu işlendi olarak işaretle
      }
  }

  const hoursArray = Array.from(teacherHours.values());

  const totalHours = hoursArray.reduce((sum, hours) => sum + hours, 0);
  const meanHours = teachers.length > 0 ? totalHours / teachers.length : 0;

  const variance = teachers.length > 0
    ? hoursArray.reduce((sum, hours) => sum + Math.pow(hours - meanHours, 2), 0) / teachers.length
    : 0;

  return variance;
}

// --- YENİ: Öğretmen Gün İçi Boşluk Hesaplama ---
function calculateTotalGaps(schedule: Schedule, teachers: TeacherScheduleData[]): number {
  let totalGapHours = 0;

  for (const teacher of teachers) {
    // Her gün için öğretmenin ders saatlerini topla
    const dailySchedules: { [day in DayOfWeek]?: number[] } = {};
    
    // Schedule Map'ini kullanarak öğretmenin derslerini günlere ayır
    for (const entry of schedule.values()) {
        if (entry.teacherIds && entry.teacherIds.includes(teacher.id)) {
            const day = entry.timeSlot.day;
            const hour = entry.timeSlot.hour;
            if (!dailySchedules[day]) {
                dailySchedules[day] = [];
            }
            // Aynı saatte birden fazla ders olsa bile saati sadece bir kez ekle
            if (!dailySchedules[day]!.includes(hour)) {
                dailySchedules[day]!.push(hour);
            }
        }
    }

    // Her gün için boşlukları hesapla
    for (const day in dailySchedules) {
      const hours = dailySchedules[day as DayOfWeek]!;
      if (hours.length <= 1) {
        continue; // Tek ders veya hiç ders yoksa o gün boşluk olmaz
      }

      // Saatleri sırala
      hours.sort((a, b) => a - b);

      // Sıralı saatler arasındaki boşlukları topla
      for (let i = 0; i < hours.length - 1; i++) {
        const difference = hours[i + 1] - hours[i];
        if (difference > 1) {
          totalGapHours += difference - 1; // Aradaki boş saat sayısı
        }
      }
    }
  }

  return totalGapHours;
}

// --- YENİ: Tüm Öğretmenlerin Boş Günü Var Mı Kontrolü ---
function hasAllTeachersWithFreeDay(
  schedule: Schedule,
  teachers: TeacherScheduleData[]
): boolean {
  const daysOfWeekCount = DAYS_OF_WEEK.length; // Now accessible

  for (const teacher of teachers) {
    const workingDays = new Set<DayOfWeek>();

    // Find all days the teacher has at least one lesson scheduled
    for (const entry of schedule.values()) {
      if (entry.teacherIds && entry.teacherIds.includes(teacher.id)) {
        workingDays.add(entry.timeSlot.day);
        // If teacher works on all possible days, no need to check further for this teacher
        if (workingDays.size === daysOfWeekCount) {
          // This teacher has no free day, so the schedule is invalid according to the rule.
          return false; 
        }
      }
    }
    // After checking all schedule entries for a given teacher, if workingDays.size < daysOfWeekCount,
    // it means this teacher has at least one free day. Loop continues to check next teacher.
  }

  // If the loop completes without returning false, it means all teachers have at least one free day.
  return true;
}