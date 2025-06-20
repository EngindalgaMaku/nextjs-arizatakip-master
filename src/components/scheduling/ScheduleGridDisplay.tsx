'use client'; // Needs client-side cache for colors

import { Schedule, ScheduledEntry } from '@/types/scheduling';
import { DAYS, getLessonColor } from './scheduleUtils'; // dayIndexToName eklendi

interface ScheduleGridDisplayProps {
    scheduleMap: Schedule | null;
    teacherMap?: Map<string, string>; // Optional lookup map
    lessonMap?: Map<string, string>;  // Optional lookup map
    locationMap?: Map<string, string>;// Optional lookup map
}

export function ScheduleGridDisplay({ 
    scheduleMap,
    teacherMap,
    lessonMap,
    locationMap
}: ScheduleGridDisplayProps) {

    if (!scheduleMap || scheduleMap.size === 0) {
        return <p className="text-gray-600">Görüntülenecek çizelge verisi yok.</p>;
    }

    // 1. Öğretmenleri Haritala VE Maksimum Saat Numarasını Bul
    const teacherSchedules = new Map<string, { teacherName: string; lessons: Map<string, ScheduledEntry> }>();
    const allTeacherIds = new Set<string>();
    let maxHourNumber = 0; // Derslerdeki en yüksek saat numarasını (1 tabanlı) bul

    for (const [key, entry] of scheduleMap.entries()) {
        if (!entry || !entry.teacherIds || entry.teacherIds.length === 0) continue;
        allTeacherIds.add(entry.teacherIds[0]); // Assuming we take the first teacherId if it's an array

        // Anahtardan saat numarasını çıkar ve maxHourNumber'ı güncelle
        const parts = key.split('-');
        if (parts.length >= 3) { // Anahtarın en az 3 bölümü olmalı (UUID parçaları + gün + saat)
            const hourStr = parts[parts.length - 1]; // Saat numarası her zaman son elemandır
            const hourNum = parseInt(hourStr, 10); 
            if (!isNaN(hourNum) && hourNum > maxHourNumber) {
                maxHourNumber = hourNum;
            }
        }

        if (!teacherSchedules.has(entry.teacherIds[0])) {
            teacherSchedules.set(entry.teacherIds[0], {
                teacherName: teacherMap?.get(entry.teacherIds[0]) || (entry.teacherNames && entry.teacherNames.length > 0 ? entry.teacherNames[0] : undefined) || 'Bilinmeyen Öğretmen',
                lessons: new Map<string, ScheduledEntry>()
            });
        }
        const teacherData = teacherSchedules.get(entry.teacherIds[0])!;
        teacherData.teacherName = teacherMap?.get(entry.teacherIds[0]) || (entry.teacherNames && entry.teacherNames.length > 0 ? entry.teacherNames[0] : undefined) || teacherData.teacherName;
        teacherData.lessons.set(key, entry); 
    }

    // <<< DEBUG LOG: Log maxHourNumber >>>
    console.log(`[ScheduleGridDisplay] Calculated maxHourNumber: ${maxHourNumber}`);

    // 2. Öğretmenleri Sırala
    const sortedTeacherIds = Array.from(allTeacherIds).sort((a, b) => {
        const nameA = teacherSchedules.get(a)?.teacherName || '';
        const nameB = teacherSchedules.get(b)?.teacherName || '';
        return nameA.localeCompare(nameB);
    });

    const NUM_DAYS = DAYS.length; 
    // NUM_HOURS yerine maxHourNumber kullanacağız
    const hoursToDisplay = Array.from({ length: maxHourNumber }, (_, i) => i + 1); // [1, 2, ..., maxHourNumber]

    // <<< DEBUG LOG: Log hoursToDisplay >>>
    console.log(`[ScheduleGridDisplay] hoursToDisplay array:`, hoursToDisplay);

    return (
        <div className="space-y-8">
            {sortedTeacherIds.map(teacherId => {
                const teacherData = teacherSchedules.get(teacherId);
                if (!teacherData) return null; 

                // <<< DEBUG LOG: Log teacher data >>>
                console.log(`[ScheduleGridDisplay] Rendering teacher: ${teacherId}, Name: ${teacherData.teacherName}, Lesson Count: ${teacherData.lessons.size}`);

                const { teacherName, lessons: teacherLessonMap } = teacherData;
                const totalTeacherHours = teacherLessonMap.size;

                return (
                    <div key={teacherId} className="overflow-x-auto shadow border border-gray-200 rounded-lg">
                        <h4 className="text-lg font-semibold p-3 bg-gray-100 border-b">
                            {teacherName}
                            <span className="text-sm font-normal text-gray-600 ml-2">(Toplam: {totalTeacherHours} saat)</span>
                        </h4>
                        <table className="min-w-full divide-y divide-gray-200 border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Saat</th>
                                    {DAYS.map(dayName => (
                                        <th key={dayName} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300 w-1/5">{dayName}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {/* Saatleri 1'den maxHourNumber'a kadar döndür */}
                                {hoursToDisplay.map(hourNumber => { // hourNumber 1, 2, 3...
                                    // <<< DEBUG LOG: Log current hour being rendered >>>
                                    console.log(`[ScheduleGridDisplay] Rendering row for Hour: ${hourNumber}`);

                                    return (
                                        <tr key={hourNumber}>
                                            {/* Saat etiketini göster */}
                                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-700 border border-gray-300 w-16 text-center">{`${hourNumber}. Saat`}</td>
                                            {/* Günleri 0'dan NUM_DAYS-1'e kadar döndür */}
                                            {Array.from({ length: NUM_DAYS }, (_, dayIndex) => {
                                                // <<< DEBUG LOG: Log day index and lookup key >>>
                                                const cellLookupKey = `${teacherId}-${dayIndex}-${hourNumber}`;
                                                console.log(`[ScheduleGridDisplay]   Checking Day: ${dayIndex}, Key: "${cellLookupKey}"`);

                                                // Bu öğretmenin bu hücrede dersi var mı?
                                                const entry = teacherLessonMap.get(cellLookupKey);

                                                // <<< DEBUG LOG: Log the found entry (or undefined) >>>
                                                console.log(`[ScheduleGridDisplay]     Found entry:`, entry);

                                                if (!entry) {
                                                    return <td key={cellLookupKey} className="px-2 py-1 border border-gray-300 h-16"><span className="text-gray-400"></span></td>;
                                                }

                                                // Ders varsa, bilgileri göster
                                                const lessonName = lessonMap?.get(entry.lessonId) || entry.lessonName || 'Bilinmeyen Ders';
                                                const locationName = locationMap?.get(entry.locationIds?.[0]) || (entry.locationNames && entry.locationNames.length > 0 ? entry.locationNames[0] : undefined) || 'Bilinmeyen Konum';
                                                const sinifSeviyesi = entry.sinifSeviyesi;
                                                const cellStyle = getLessonColor(entry.lessonId);

                                                // <<< DEBUG LOG: Log values just before rendering TD >>>
                                                console.log(`[ScheduleGridDisplay]       Rendering TD for ${cellLookupKey}: Lesson=${lessonName}, Location=${locationName}, Sınıf=${sinifSeviyesi}, Style=`, cellStyle);

                                                return (
                                                    <td key={cellLookupKey} className="px-2 py-1 border border-gray-300 text-center align-top h-16" style={{ backgroundColor: cellStyle.background, color: cellStyle.text }}>
                                                        <div className="text-xs">
                                                            <p className="font-semibold">{lessonName}</p>
                                                            <p style={{ color: cellStyle.text === '#FFFFFF' ? '#E2E8F0' : '#4A5568' }}>{locationName}</p>
                                                            {sinifSeviyesi && <p className="text-[10px] mt-0.5" style={{ color: cellStyle.text === '#FFFFFF' ? '#CBD5E0' : '#718096' }}>Sınıf: {sinifSeviyesi}</p>}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    );
}

// scheduleUtils.ts içinde bunun olduğundan emin olun:
/*
export const dayIndexToName = (index: number): string => {
    return DAYS[index] || 'Bilinmeyen Gün';
};
*/ 