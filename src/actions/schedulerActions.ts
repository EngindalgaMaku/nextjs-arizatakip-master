'use server';

import { prepareSchedulerInput } from '@/lib/scheduling/dataPreparation';
import { findBestSchedule, BestSchedulerResult } from '@/lib/scheduling/scheduler';
import { ScheduledEntry, SerializableSchedulerResult, UnassignedLessonInfo, LessonScheduleData } from '@/types/scheduling';

/**
 * Veriyi hazırlar, en iyi çizelgeyi bulmak için algoritmayı N defa çalıştırır ve sonucu döndürür.
 * Artık BestSchedulerResult döndürüyor.
 */
export async function runSchedulerAction(numberOfAttempts: number = 10): Promise<BestSchedulerResult> {
    console.log(`runSchedulerAction started for ${numberOfAttempts} attempts...`);
    try {
        // 1. Algoritma girdilerini hazırla
        console.log("Preparing scheduler input...");
        const input = await prepareSchedulerInput();
        console.log("Scheduler input prepared.");

        // 2. En iyi çizelgeyi N deneme ile bul
        console.log(`Finding best schedule over ${numberOfAttempts} attempts...`);
        const result: BestSchedulerResult = await findBestSchedule(input, numberOfAttempts);
        console.log(`Best schedule search finished. Success: ${result.success}, Best Variance: ${result.bestVariance?.toFixed(4)}`);

        // Directly return the result from findBestSchedule
        console.log(`Returning BestSchedulerResult. Success: ${result.success}, Logs: ${result.logs?.length ?? 0} lines.`);
        return result;

    } catch (error: any) {
        console.error("Error in runSchedulerAction:", error);
        // Construct a BestSchedulerResult-like object for the error case
        return {
            success: false,
            error: error instanceof Error ? error.message : "Bilinmeyen bir çizelgeleme hatası oluştu.",
            logs: [`runSchedulerAction Error: ${error instanceof Error ? error.message : String(error)}`],
            bestSchedule: new Map(),
            unassignedLessons: [],
            attemptsMade: 0,
            successfulAttempts: 0,
            minFitnessScore: Infinity,
            bestVariance: Infinity,
            bestTotalGaps: Infinity,
            bestShortDayPenalty: Infinity,
        };
    }
} 