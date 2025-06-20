'use client'; // <<< Make page client-side for state and query

import { DashboardLayout } from '@/layouts/DashboardLayout';
import { fetchSavedScheduleDetailAction, FullSavedSchedule } from '@/actions/savedScheduleActions';
import { optimizeScheduleAction } from '@/actions/scheduleOptimizationActions'; // <<< Import optimization action
import { notFound, useParams } from 'next/navigation'; // <<< Import useParams
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Schedule, ScheduledEntry, UnassignedLessonInfo } from '@/types/scheduling';
import { ArrowLeft, Edit, Loader2, Wand2 } from 'lucide-react'; // <<< Import Edit icon and Wand2 icon
import { ScheduleGridDisplay } from '@/components/scheduling/ScheduleGridDisplay';
import { LogDisplay } from '@/components/scheduling/LogDisplay';
import { EditScheduleDetailsForm } from '@/components/scheduling/EditScheduleDetailsForm'; // <<< Import Edit Form
import { useQuery, useQueryClient } from '@tanstack/react-query'; // <<< Import query hooks
import { useState, useMemo, useEffect } from 'react'; // <<< Import useState, useMemo, useEffect
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import toast from 'react-hot-toast'; // <<< Import react-hot-toast

const dayNameToIndex: { [key: string]: number } = {
    'Pazartesi': 0,
    'Salı': 1,
    'Çarşamba': 2,
    'Perşembe': 3,
    'Cuma': 4
    // Gerekirse Cumartesi/Pazar için 5 ve 6'yı ekleyin
};

// --- Main Page Component --- 
export default function SavedScheduleDetailPage() {
    const params = useParams();
    const scheduleId = typeof params.id === 'string' ? params.id : ''; // Get ID from params
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizedGaps, setOptimizedGaps] = useState<number | null>(null); // State for optimized gaps

    // Fetch schedule details using useQuery
    const { data: scheduleDetail, isLoading, error, isError } = useQuery<FullSavedSchedule | null, Error>({
        queryKey: ['savedScheduleDetail', scheduleId],
        queryFn: () => fetchSavedScheduleDetailAction(scheduleId),
        enabled: !!scheduleId,
        staleTime: 5 * 60 * 1000,
    });

    // Move useMemo hooks to the top level before any conditional returns
    // Deserialize schedule_data back to a Map (Memoize this)
    const scheduleMap: Schedule | null = useMemo(() => {
        // Log giriş verisi
        console.log("[useMemo scheduleMap]: Hook triggered. scheduleDetail exists:", !!scheduleDetail);
        if (!scheduleDetail || !scheduleDetail.schedule_data) {
            console.log("[useMemo scheduleMap]: No schedule_data found, returning null.");
            return null;
        }
        console.log("[useMemo scheduleMap]: Processing schedule_data:", JSON.stringify(scheduleDetail.schedule_data)); // Verinin tamamını (veya bir kısmını) logla

        try {
            // Veri formatı kontrolü
            const isDataArray = Array.isArray(scheduleDetail.schedule_data);
            const areItemsValid = isDataArray && scheduleDetail.schedule_data.every(item => Array.isArray(item) && item.length === 2);

            if (!isDataArray || !areItemsValid) {
                 console.error("[useMemo scheduleMap]: schedule_data is NOT in the expected Array<[string, any]> format. Returning null.");
                 return null;
             }
            console.log(`[useMemo scheduleMap]: schedule_data is array with ${scheduleDetail.schedule_data.length} entries. Starting transformation...`);

            // <<< Değişiklik Başlangıcı: Çift kayıtları takip etmek için geçici Map >>>
            const resultMap = new Map<string, ScheduledEntry>();
            const processedKeys = new Set<string>(); // İşlenen final key'leri takip et
            // <<< Değişiklik Sonu >>>

            scheduleDetail.schedule_data.forEach(([key, value]: [string, any], index: number) => { // .map yerine .forEach
                const parts = key.split('-');
                let dayIndex: number | undefined;
                let periodIndex: number | undefined;
                let finalKey: string | undefined;
                let teacherId: string | undefined = (value as ScheduledEntry)?.teacherIds?.[0]; // Get first teacherId from array

                // --- Try parsing as Optimized Format (teacherId-dayIndex-periodIndex) ---
                if (parts.length >= 3) {
                    const potentialDayIndexStr = parts[parts.length - 2];
                    const potentialPeriodIndexStr = parts[parts.length - 1];
                    const potentialDayIndex = parseInt(potentialDayIndexStr, 10);
                    const potentialPeriodIndex = parseInt(potentialPeriodIndexStr, 10);

                    if (!isNaN(potentialDayIndex) && !isNaN(potentialPeriodIndex)) {
                        dayIndex = potentialDayIndex;
                        periodIndex = potentialPeriodIndex;
                        finalKey = key; // Key is already correct teacherId-day-period format
                        const teacherIdFromKey = parts.slice(0, -2).join('-');
                        if (!teacherId) teacherId = teacherIdFromKey;
                    }
                }

                // --- If not parsed, try parsing as Intermediate Format (dayIndex-periodIndex) that might be incorrectly saved ---
                if (finalKey === undefined && parts.length === 2) {
                    const potentialDayIndexStr = parts[0];
                    const potentialPeriodIndexStr = parts[1];
                    const potentialDayIndex = parseInt(potentialDayIndexStr, 10);
                    const potentialPeriodIndex = parseInt(potentialPeriodIndexStr, 10);
                    
                    if (!isNaN(potentialDayIndex) && !isNaN(potentialPeriodIndex) && teacherId) {
                         // Looks like the intermediate Day-Period format
                         dayIndex = potentialDayIndex;
                         periodIndex = potentialPeriodIndex;
                         finalKey = `${teacherId}-${dayIndex}-${periodIndex}`; // Construct the correct key
                    } 
                }

                // --- If still not parsed, try parsing as Original Format (DayName-Hour-...) ---
                if (finalKey === undefined && parts.length >= 2) { 
                    const dayName = parts[0];
                    const hourStr = parts[1];
                    const potentialDayIndex = dayNameToIndex[dayName];
                    const potentialPeriodIndex = parseInt(hourStr, 10);

                    if (potentialDayIndex !== undefined && !isNaN(potentialPeriodIndex) && teacherId) {
                        // Looks like the original format
                        dayIndex = potentialDayIndex;
                        periodIndex = potentialPeriodIndex;
                        finalKey = `${teacherId}-${dayIndex}-${periodIndex}`; // Construct the correct key
                    } else {
                         // console.warn(`  -> Could not parse as Original Format: DayName=${dayName}(${potentialDayIndex}), Hour=${hourStr}(${potentialPeriodIndex}), Teacher=${teacherId}`);
                    }
                }

                // --- Validation and Adding to Map ---
                if (finalKey && dayIndex !== undefined && periodIndex !== undefined && !isNaN(dayIndex) && !isNaN(periodIndex)) {
                    const isDayValid = true; // Already validated by parsing logic
                    const isPeriodValid = true;

                    if (processedKeys.has(finalKey)) {
                        // console.warn(`  -> DUPLICATE DETECTED: Final Key "${finalKey}" already exists. Skipping entry.`);
                    } else {
                        // console.log(`  -> SUCCESS: Entry is valid and unique. Adding with Final Key: "${finalKey}"`);
                        resultMap.set(finalKey, value as ScheduledEntry);
                        processedKeys.add(finalKey);
                    }
                } else {
                    // console.warn(`  -> FAILURE: Could not determine valid format or parse indices for key "${key}". Discarding.`);
                }

            }); // .forEach bitti

            console.log(`[useMemo scheduleMap]: Transformation complete. Final map size (unique keys): ${resultMap.size}`);
            if(resultMap.size < scheduleDetail.schedule_data.length){
                 console.warn(`[useMemo scheduleMap]: WARNING - ${scheduleDetail.schedule_data.length - resultMap.size} entries were skipped during transformation.`);
            }
            // <<< Değişiklik: Doğrudan resultMap'i döndür >>>
            return resultMap;

        } catch (e) {
            console.error("[useMemo scheduleMap]: Error during schedule data transformation:", e);
            return null;
        }
    }, [scheduleDetail?.schedule_data]);

    // Map unassigned lessons (Memoize this)
    const { unassignedInfoArray, calculatedTotalUnassignedHours } = useMemo(() => {
        let totalHours = 0;
        const infoArray: UnassignedLessonInfo[] = (scheduleDetail?.unassigned_lessons || []).map(lesson => {
            const lessonData = lesson as any;
            const remainingHours = lessonData.weeklyHours ?? 0;
            totalHours += remainingHours;
            return {
                lessonId: lessonData.id,
                lessonName: lessonData.name ?? 'Bilinmeyen Ders',
                remainingHours: remainingHours,
            };
        });
        return { unassignedInfoArray: infoArray, calculatedTotalUnassignedHours: totalHours };
    }, [scheduleDetail?.unassigned_lessons]);

    // Initialize/reset optimizedGaps when scheduleDetail loads/changes
    useEffect(() => {
        if (scheduleDetail) {
            setOptimizedGaps(scheduleDetail.total_gaps); // Set initial value from fetched data
        } else {
            setOptimizedGaps(null); // Reset if no data
        }
    }, [scheduleDetail]);

    const handleSaveSuccess = () => {
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: ['savedScheduleDetail', scheduleId] });
    };

    // --- Optimization Logic Handler ---
    const handleOptimizeSchedule = async () => {
        if (!scheduleDetail) {
            toast.error("Optimizasyon için çizelge verisi yüklenemedi.");
            return;
        }
        setIsOptimizing(true);
        setOptimizedGaps(null); // Reset optimized gaps display while optimizing
        const toastId = toast.loading('Çizelge optimize ediliyor...');

        try {
            console.log(`[Client] Calling optimizeScheduleAction for ID: ${scheduleId}`);
            const result = await optimizeScheduleAction(scheduleId);

            if (result.success) {
                const successMessage = `${result.message} (Toplam Boşluk: ${result.newGaps ?? 'N/A'})`;
                toast.success(successMessage, { id: toastId, duration: 5000 });
                console.log(`[Client] Optimization successful for ${scheduleId}. Result:`, result);

                setOptimizedGaps(result.newGaps ?? null); // Update state with the new gap count

                if (result.changes && result.changes.length > 0) {
                    // console.log("Yapılan Optimizasyon Değişiklikleri:");
                    result.changes.forEach((change, index) => {
                         // console.log(`${index + 1}. Tip: ${change.type}, Öğretmen: ${change.teacherId}, Ders: ${change.lessonId}, Nereden: ${change.fromKey}, Nereye: ${change.toKey}, Neden: ${change.reason}`);
                    });
                } else {
                    // console.log("Optimizasyon çalıştı ancak herhangi bir ders taşınmadı/birleştirilmedi.");
                }

                await queryClient.refetchQueries({ queryKey: ['savedScheduleDetail', scheduleId] });
                // console.log(`[Client] Refetched query: ['savedScheduleDetail', ${scheduleId}]`);

            } else {
                toast.error(`Optimizasyon başarısız: ${result.message}`, { id: toastId });
                console.error(`[Client] Optimization failed for ${scheduleId}:`, result.message);
                 // Optimization failed, reset gaps to initial value if needed
                if (scheduleDetail) setOptimizedGaps(scheduleDetail.total_gaps);
            }

        } catch (optimizationError: any) {
            console.error("[Client] Error calling optimization action:", optimizationError);
            toast.error(`Optimizasyon sırasında bir hata oluştu: ${optimizationError.message || 'Bilinmeyen sunucu hatası'}`, { id: toastId });
             // Error occurred, reset gaps to initial value
            if (scheduleDetail) setOptimizedGaps(scheduleDetail.total_gaps);
        } finally {
            setIsOptimizing(false);
        }
    };
    // --- End Optimization Logic Handler ---

    // Handle loading state
    if (isLoading) {
        return <SavedScheduleDetailLoadingSkeleton />;
    }

    // Handle fetch error
    if (isError) {
        return (
            <DashboardLayout>
                <div className="p-4 md:p-6 text-red-600">
                    Hata: Çizelge detayları yüklenemedi. {error.message}
                </div>
            </DashboardLayout>
        );
    }

    // Handle not found after fetch
    if (!scheduleDetail) {
        notFound();
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-4">
                <div className="flex justify-between items-start mb-4"> {/* Changed items-center to items-start */} 
                    <div>
                        <Link href="/dashboard/saved-schedules" className="text-sm text-blue-600 hover:underline flex items-center mb-2">
                            <ArrowLeft size={16} className="mr-1" /> Kaydedilmiş Çizelgelere Dön
                        </Link>
                        {/* Conditionally render Title/Description or Edit Form */} 
                        {!isEditing ? (
                            <> 
                                <h1 className="text-2xl font-semibold text-gray-800">{scheduleDetail.name || `Kaydedilmiş Çizelge Detayı`}</h1>
                                <p className="text-sm text-gray-500">Oluşturulma: {new Date(scheduleDetail.created_at).toLocaleString('tr-TR')}</p>
                                {scheduleDetail.description && <p className="text-sm text-gray-600 mt-1">{scheduleDetail.description}</p>}
                            </>
                        ) : (
                            <div className="mt-2">
                                 <EditScheduleDetailsForm 
                                     scheduleId={scheduleId}
                                     initialName={scheduleDetail.name}
                                     initialDescription={scheduleDetail.description}
                                     onSaveSuccess={handleSaveSuccess}
                                     onCancel={() => setIsEditing(false)}
                                 />
                            </div>
                        )}
                    </div>
                     {/* Action Buttons: Edit and Optimize */} 
                     {!isEditing && (
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOptimizeSchedule}
                                disabled={isOptimizing || !scheduleMap} // Disable if optimizing or schedule data not ready
                            >
                                {isOptimizing ? (
                                    <Loader2 size={16} className="mr-1 animate-spin" />
                                ) : (
                                    <Wand2 size={16} className="mr-1" />
                                )}
                                {isOptimizing ? 'Optimize Ediliyor...' : 'Optimizasyon'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={isOptimizing}>
                                <Edit size={16} className="mr-1" /> Düzenle
                            </Button>
                        </div>
                     )}
                </div>

                {/* Display Metrics (only when not editing) */} 
                {!isEditing && (
                    <Card>
                        <CardHeader><CardTitle>Çizelge Metrikleri</CardTitle></CardHeader>
                        <CardContent className="text-sm text-gray-700 space-y-1">
                             <p>Fitness Skoru: {scheduleDetail.fitness_score?.toFixed(4) ?? 'N/A'}</p>
                             <p>Yük Varyansı: {scheduleDetail.workload_variance?.toFixed(4) ?? 'N/A'}</p>
                             {/* Use the state for Total Gaps display */}
                             <p>Toplam Boşluk: {typeof optimizedGaps === 'number' ? optimizedGaps : (scheduleDetail?.total_gaps ?? 'N/A')} {isOptimizing ? <Loader2 size={14} className="inline ml-1 animate-spin"/> : ''}</p>
                        </CardContent>
                    </Card>
                )}

                 {/* Display Unassigned Lessons (only when not editing) */} 
                {!isEditing && unassignedInfoArray.length > 0 && (
                    <Card className="border-amber-300">
                        <CardHeader><CardTitle className="text-amber-800">Atanamayan Dersler ({calculatedTotalUnassignedHours} saat)</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
                                {unassignedInfoArray.map((lesson) => (
                                <li key={lesson.lessonId}>
                                    <strong>{lesson.lessonName}:</strong> {lesson.remainingHours} saat atanamadı.
                                </li>
                                ))}
                            </ul>
                         </CardContent>
                    </Card>
                )}

                {/* Display Schedule Grid (only when not editing) */} 
                {!isEditing && (
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-3">Çizelge Görünümü</h2>
                        <ScheduleGridDisplay scheduleMap={scheduleMap} /> 
                        {!scheduleMap && <p className="text-red-500">Çizelge verisi yüklenemedi veya hatalı formatta.</p>} 
                    </div>
                )}

                {/* Display Logs (only when not editing) */} 
                 {!isEditing && (
                    <Card>
                        <CardHeader><CardTitle>Kaydedilmiş Loglar</CardTitle></CardHeader>
                        <CardContent>
                            <LogDisplay logs={scheduleDetail.logs} />
                        </CardContent>
                    </Card>
                 )}

            </div>
        </DashboardLayout>
    );
}

// --- Loading Skeleton Component --- 
function SavedScheduleDetailLoadingSkeleton() {
    return (
         <DashboardLayout>
            <div className="p-4 md:p-6 space-y-4">
                <div className="flex justify-between items-start mb-4">
                    <div>
                         <Skeleton className="h-5 w-48 mb-2" /> 
                         <Skeleton className="h-8 w-64 mb-1" /> 
                         <Skeleton className="h-4 w-40 mb-2" /> 
                         <Skeleton className="h-4 w-72" /> 
                    </div>
                     <Skeleton className="h-9 w-24" /> 
                </div>
                 <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
                 <div className="mt-6 space-y-4">
                     <Skeleton className="h-7 w-40 mb-3" /> 
                     <Skeleton className="h-64 w-full rounded-lg" /> 
                 </div>
                 <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-32 float-right mb-2" /><Skeleton className="h-72 w-full" /></CardContent></Card>
            </div>
        </DashboardLayout>
    );
} 