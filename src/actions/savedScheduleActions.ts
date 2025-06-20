'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LessonScheduleData, ScheduledEntry } from '@/types/scheduling';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { SavedSchedule } from '@/types/savedSchedule';

interface SaveScheduleInput {
    schedule_data: [string, ScheduledEntry][];
    unassigned_lessons: LessonScheduleData[];
    fitnessScore: number;
    workloadVariance: number;
    totalGaps: number;
    logs?: string[] | null;
    name?: string | null;
    description?: string | null;
}

export async function saveScheduleAction(input: SaveScheduleInput): Promise<void> {
    console.log("saveScheduleAction called with input:", { ...input, logs: input.logs ? `${input.logs.length} lines` : 'null', schedule_data: '...', unassigned_lessons: '...' }); // Log input briefly

    const supabase = await createSupabaseServerClient(); // Get Supabase client for server actions

    try {
        const { data, error } = await supabase
            .from('saved_schedules') // <<< Presumed table name
            .insert([
                {
                    name: input.name,
                    description: input.description,
                    fitness_score: input.fitnessScore,
                    workload_variance: input.workloadVariance,
                    total_gaps: input.totalGaps,
                    schedule_data: input.schedule_data, // Store as JSONB
                    unassigned_lessons: input.unassigned_lessons, // Store as JSONB
                    logs: input.logs, // Store as text[] or JSONB
                    // Add user_id if applicable: user_id: (await supabase.auth.getUser()).data.user?.id
                },
            ])
            .select(); // Optional: Select to confirm insert

        if (error) {
            console.error("Supabase insert error:", error);
            throw new Error(`Failed to save schedule to database: ${error.message}`);
        }

        console.log("Schedule saved successfully:", data);

        // Revalidate the path for the saved schedules list page
        revalidatePath('/dashboard/saved-schedules');

    } catch (error) {
        console.error("Error in saveScheduleAction:", error);
        // Re-throw a more specific error or handle as needed
        if (error instanceof Error) {
             throw new Error(`Saving schedule failed: ${error.message}`);
        } else {
             throw new Error("An unknown error occurred while saving the schedule.");
        }
    }
}

export async function saveSchedule(schedule: SavedSchedule) {
  try {
    const { data, error } = await supabase
      .from('saved_schedules')
      .insert([schedule])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving schedule:', error);
    return { success: false, error: 'Failed to save schedule' };
  }
}

// --- NEW ACTION: Fetch Saved Schedules List --- 

// Define the type for the list item we want to fetch
export interface SavedScheduleListItem {
    id: string;
    created_at: string;
    name: string | null;
    description: string | null;
    fitness_score: number;
    workload_variance: number;
    total_gaps: number;
}

export async function fetchSavedSchedulesAction(): Promise<SavedScheduleListItem[]> {
    console.log("fetchSavedSchedulesAction called...");
    const supabase = await createSupabaseServerClient();

    try {
        const { data, error } = await supabase
            .from('saved_schedules')
            .select(`
                id,
                created_at,
                name,
                description,
                fitness_score,
                workload_variance,
                total_gaps
            `)
            .order('created_at', { ascending: false }); // Order by newest first

        if (error) {
            console.error("Supabase fetch error:", error);
            throw new Error(`Failed to fetch saved schedules: ${error.message}`);
        }

        console.log(`Fetched ${data?.length ?? 0} saved schedules.`);
        return data || []; // Return fetched data or empty array

    } catch (error) {
        console.error("Error in fetchSavedSchedulesAction:", error);
        if (error instanceof Error) {
            throw new Error(`Fetching saved schedules failed: ${error.message}`);
        } else {
            throw new Error("An unknown error occurred while fetching saved schedules.");
        }
    }
}

// --- NEW ACTION: Fetch Single Saved Schedule Details --- 

// Reuse SavedScheduleListItem and add fields stored in DB
export interface FullSavedSchedule extends SavedScheduleListItem {
    schedule_data: [string, ScheduledEntry][]; // Data stored as array of tuples
    unassigned_lessons: LessonScheduleData[] | null; // Data stored as array
    logs: string[] | null;
}

export async function fetchSavedScheduleDetailAction(id: string): Promise<FullSavedSchedule | null> {
    console.log(`fetchSavedScheduleDetailAction called for ID: ${id}`);
    if (!id) {
        console.error("Fetch detail error: No ID provided.");
        return null;
    }
    const supabase = await createSupabaseServerClient();

    try {
        const { data, error } = await supabase
            .from('saved_schedules')
            .select(`
                id,
                created_at,
                name,
                description,
                fitness_score,
                workload_variance,
                total_gaps,
                schedule_data, 
                unassigned_lessons,
                logs
            `)
            .eq('id', id)
            .maybeSingle(); // Expect 0 or 1 result

        if (error) {
            console.error("Supabase fetch detail error:", error);
            throw new Error(`Failed to fetch saved schedule detail (ID: ${id}): ${error.message}`);
        }

        if (!data) {
            console.log(`No saved schedule found with ID: ${id}`);
            return null; // Not found
        }
        
        console.log(`Fetched details for saved schedule ID: ${id}`);
        // We might need to explicitly cast the JSONB columns if Supabase doesn't infer types correctly
        // For now, assume the types match FullSavedSchedule interface
        return data as FullSavedSchedule;

    } catch (error) {
        console.error("Error in fetchSavedScheduleDetailAction:", error);
        // Don't re-throw here, let the page handle null return
        return null;
    }
}

// --- NEW ACTION: Delete Saved Schedule --- 

export async function deleteSavedScheduleAction(id: string): Promise<{ success: boolean; error?: string }> {
    console.log(`deleteSavedScheduleAction called for ID: ${id}`);
    if (!id) {
        console.error("Delete error: No ID provided.");
        return { success: false, error: "Silinecek çizelge ID'si belirtilmedi." };
    }
    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from('saved_schedules')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Supabase delete error:", error);
            throw new Error(`Failed to delete saved schedule (ID: ${id}): ${error.message}`);
        }

        console.log(`Successfully deleted saved schedule ID: ${id}`);
        
        // Revalidate the list page path so the list updates
        revalidatePath('/dashboard/saved-schedules');
        
        return { success: true };

    } catch (error) {
        console.error("Error in deleteSavedScheduleAction:", error);
        const message = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
        return { success: false, error: `Çizelge silinirken hata oluştu: ${message}` };
    }
}

// --- NEW ACTION: Update Saved Schedule Details (Name/Description) --- 

interface UpdateDetailsInput {
    id: string;
    name?: string | null;
    description?: string | null;
}

export async function updateSavedScheduleDetailsAction(
    input: UpdateDetailsInput
): Promise<{ success: boolean; error?: string }> {
    console.log(`updateSavedScheduleDetailsAction called for ID: ${input.id}`);
    if (!input.id) {
        console.error("Update error: No ID provided.");
        return { success: false, error: "Güncellenecek çizelge ID'si belirtilmedi." };
    }
    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase
            .from('saved_schedules')
            .update({
                name: input.name,        // Update name
                description: input.description // Update description
                // updated_at: new Date().toISOString(), // Optionally update timestamp
            })
            .eq('id', input.id);

        if (error) {
            console.error("Supabase update error:", error);
            throw new Error(`Failed to update saved schedule details (ID: ${input.id}): ${error.message}`);
        }

        console.log(`Successfully updated details for saved schedule ID: ${input.id}`);
        
        // Revalidate both the detail page and the list page paths
        revalidatePath(`/dashboard/saved-schedules/${input.id}`);
        revalidatePath('/dashboard/saved-schedules');
        
        return { success: true };

    } catch (error) {
        console.error("Error in updateSavedScheduleDetailsAction:", error);
        const message = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
        return { success: false, error: `Çizelge detayları güncellenirken hata oluştu: ${message}` };
    }
} 