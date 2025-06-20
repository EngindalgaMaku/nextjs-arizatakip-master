'use server'; // Mark as server actions

import { supabase } from '@/lib/supabase'; // Use the server client instance
import {
  TeacherScheduleEntrySchema,
  TeacherScheduleFormSchema,
  TeacherScheduleEntry,
  TeacherScheduleFormValues
} from '@/types/teacherSchedules';
import { z } from 'zod'; // Import z from zod
import { revalidatePath } from 'next/cache';

// --- Helper Functions ---
// Helper to get lab_id from location name
async function getLabIdFromName(locationName: string | null | undefined): Promise<string | null> {
  if (!locationName) return null;
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id')
      .eq('name', locationName)
      .maybeSingle(); 

    if (error) {
      console.error(`Error fetching lab_id for location "${locationName}":`, error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error(`Exception fetching lab_id for location "${locationName}":`, err);
    return null;
  }
}

// Helper to get lesson_id from lesson name (assuming class_name in teacher schedule corresponds to lesson name in dal_dersleri)
async function getLessonIdFromName(lessonName: string | null | undefined): Promise<string | null> {
  if (!lessonName) return null;
  try {
    const { data, error } = await supabase
      .from('dal_dersleri') // Assuming table name is dal_dersleri
      .select('id')
      .eq('ders_adi', lessonName) // Assuming column name is ders_adi
      .maybeSingle();

    if (error) {
      console.error(`Error fetching lesson_id for lesson "${lessonName}":`, error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
     console.error(`Exception fetching lesson_id for lesson "${lessonName}":`, err);
     return null;
  }
}
// --- End Helper Functions ---

/**
 * Fetch the schedule for a specific teacher, joining with classes table.
 */
export async function fetchTeacherSchedule(teacherId: string): Promise<TeacherScheduleEntry[]> {
  if (!teacherId) return [];

  const { data, error } = await supabase
    .from('teacher_schedules')
    // Select all from schedules and the name from classes
    .select(`
      *,
      classes ( name )
    `)
    .eq('teacher_id', teacherId)
    .order('day_of_week', { ascending: true })
    .order('time_slot', { ascending: true });

  if (error) {
    console.error(`Error fetching schedule for teacher ${teacherId}:`, error);
    throw error;
  }

  // Map data to camelCase and extract class name
  const mappedData = data?.map(entry => ({
    id: entry.id,
    teacherId: entry.teacher_id,
    dayOfWeek: entry.day_of_week,
    timeSlot: entry.time_slot,
    className: entry.class_name, // Lesson name
    locationName: entry.location_name,
    classId: entry.class_id, // Class ID
    // Extract nested class name or null
    classNameDisplay: entry.classes ? entry.classes.name : null,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  })) || [];

  // Validate fetched data (optional but recommended)
  const parseResult = z.array(TeacherScheduleEntrySchema).safeParse(mappedData);
  if (!parseResult.success) {
      console.error('Fetched teacher schedule data validation failed:', parseResult.error);
      // Handle validation error, e.g., return empty array or throw
      return [];
  }

  return parseResult.data;
}

/**
 * Create a new schedule entry and sync with location schedule.
 */
export async function createTeacherScheduleEntry(
  teacherId: string,
  dayOfWeek: number, // Note: This corresponds to `day` in schedule_entries if 0=Sunday, 1=Monday etc matches
  timeSlot: number,  // Note: This corresponds to `period` in schedule_entries
  payload: TeacherScheduleFormValues
): Promise<{ success: boolean; entry?: TeacherScheduleEntry; error?: string; syncError?: string }> {
  const parse = TeacherScheduleFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // Location Conflict Check (within teacher_schedules) - Keep this
  if (parse.data.locationName) {
      const { data: conflictingEntry, error: conflictError } = await supabase
          .from('teacher_schedules') // Check within teacher schedules first
          .select('id')
          .eq('day_of_week', dayOfWeek)
          .eq('time_slot', timeSlot)
          .eq('location_name', parse.data.locationName)
          .neq('teacher_id', teacherId) // Check other teachers in the same location/slot
          .maybeSingle();
          
      if (conflictError) {
          console.error('Error checking for location conflict during create:', conflictError);
          return { success: false, error: 'Konum uygunluğu kontrol edilirken bir hata oluştu.' };
      }
      if (conflictingEntry) {
          return { success: false, error: 'Bu konum/laboratuvar belirtilen saatte başka bir öğretmen tarafından kullanımda.' };
      }
      // Also check for teacher conflict (same teacher, different location/lesson)
      const { data: teacherConflict, error: teacherConflictErr } = await supabase
            .from('teacher_schedules')
            .select('id')
            .eq('teacher_id', teacherId)
            .eq('day_of_week', dayOfWeek)
            .eq('time_slot', timeSlot)
            .maybeSingle();
      if (teacherConflictErr) {
           console.error('Error checking for teacher conflict during create:', teacherConflictErr);
          // Potentially proceed but log warning
      }
       if (teacherConflict) {
           return { success: false, error: 'Bu öğretmen için belirtilen saatte zaten başka bir ders mevcut.' };
       }
  }

  // Data for teacher_schedules table
  const teacherEntryData = {
    teacher_id: teacherId,
    day_of_week: dayOfWeek,
    time_slot: timeSlot,
    class_name: parse.data.className, // This is used as lesson name for lookup
    location_name: parse.data.locationName || null,
    class_id: parse.data.classId || null,
  };

  let createdTeacherEntry: TeacherScheduleEntry | null = null;
  let syncError: string | undefined = undefined;

  // 1. Insert into teacher_schedules
  try {
    const { data, error } = await supabase
      .from('teacher_schedules')
      .insert(teacherEntryData)
      .select(`* , classes ( name )`)
      .single();

    if (error || !data) {
      console.error('Error creating teacher schedule entry:', error?.message);
      if (error?.code === '23505') { 
          return { success: false, error: 'Bu öğretmen için belirtilen zaman diliminde zaten bir ders mevcut.' };
      }
      throw new Error(error?.message || 'Öğretmen programı girdisi oluşturulamadı.');
    }

    // Map db result to TeacherScheduleEntry type
    createdTeacherEntry = {
      id: data.id,
      teacherId: data.teacher_id,
      dayOfWeek: data.day_of_week,
      timeSlot: data.time_slot,
      className: data.class_name,
      locationName: data.location_name,
      classId: data.class_id,
      classNameDisplay: data.classes?.name || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

  } catch (err) {
    console.error('createTeacherScheduleEntry error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // 2. Sync with schedule_entries (Location Schedule)
  try {
    const labId = await getLabIdFromName(createdTeacherEntry.locationName);
    const lessonId = await getLessonIdFromName(createdTeacherEntry.className); // className is the lesson name

    if (labId && lessonId) {
        // Check for conflict in schedule_entries (different teacher/lesson in same lab/slot)
        const { data: conflictCheck, error: conflictCheckErr } = await supabase
            .from('schedule_entries')
            .select('id, teacher_id')
            .eq('lab_id', labId)
            .eq('day', dayOfWeek) // Assuming dayOfWeek maps directly to day
            .eq('period', timeSlot) // Assuming timeSlot maps directly to period
            .maybeSingle();

        if (conflictCheckErr) {
            console.error('Sync Error: Could not check for conflicts in schedule_entries', conflictCheckErr);
            // Decide how to handle: proceed with warning, or fail?
            syncError = 'Konum programı çakışma kontrolü başarısız.'; 
        } else if (conflictCheck && conflictCheck.teacher_id !== teacherId) {
            // Conflict: Another teacher is scheduled in this lab/slot
            console.warn(`Sync Conflict: Lab ${labId} slot ${dayOfWeek}-${timeSlot} is already occupied by teacher ${conflictCheck.teacher_id}.`);
            syncError = 'Konum programında bu saatte başka bir öğretmen/ders mevcut.';
            // We might want to delete the teacher_schedules entry we just created? Or return specific error.
            // For now, just report syncError.
        } else if (conflictCheck && conflictCheck.teacher_id === teacherId) {
             // Entry for this teacher exists, maybe update it?
             console.log(`Sync Info: Updating existing schedule_entries for teacher ${teacherId} at lab ${labId} slot ${dayOfWeek}-${timeSlot}.`);
             const { error: updateError } = await supabase
                 .from('schedule_entries')
                 .update({ 
                    lesson_id: lessonId, 
                    class_id: createdTeacherEntry.classId 
                 })
                 .match({ id: conflictCheck.id }); // Match by primary key
             if (updateError) {
                  console.error('Sync Error: Failed to update schedule_entries:', updateError);
                  syncError = 'Konum programı güncellenemedi.';
             }
        } else {
            // No conflict or existing entry for this teacher, insert new one
            const locationScheduleData = {
              lab_id: labId,
              day: dayOfWeek, // Map dayOfWeek to day
              period: timeSlot, // Map timeSlot to period
              lesson_id: lessonId,
              class_id: createdTeacherEntry.classId, // Use classId from teacher schedule
              teacher_id: teacherId,
            };

            const { error: insertSyncError } = await supabase
              .from('schedule_entries')
              .insert(locationScheduleData);

            if (insertSyncError) {
              console.error('Sync Error: Failed to insert into schedule_entries:', insertSyncError);
              if (insertSyncError.code === '23505') { // unique constraint violation
                   syncError = 'Konum programında bu saatte zaten bir ders mevcut (veritabanı kısıtlaması).';
              } else {
                   syncError = 'Konum programına eklenemedi.';
              }
            }
        }

        // If sync didn't fail, revalidate location path
        if (!syncError) {
             console.log(`Sync Success: Revalidating location path /dashboard/locations/${labId}/schedule`);
        }

    } else {
        if (!labId) console.warn(`Sync Warning: Could not find lab_id for location "${createdTeacherEntry.locationName}". Location schedule not updated.`);
        if (!lessonId) console.warn(`Sync Warning: Could not find lesson_id for lesson "${createdTeacherEntry.className}". Location schedule not updated.`);
        // Potentially set syncError if IDs are expected but not found
        if (createdTeacherEntry.locationName || createdTeacherEntry.className) {
             syncError = 'Konum veya ders adı sistemde bulunamadı, konum programı güncellenmedi.';
        }
    }
  } catch (err) {
      console.error('Error during schedule_entries sync:', err);
      syncError = 'Konum programı güncellenirken bir hata oluştu.';
  }

  // Return overall status
  return { success: true, entry: createdTeacherEntry ?? undefined, syncError };
}

/**
 * Update an existing schedule entry and sync with location schedule.
 */
export async function updateTeacherScheduleEntry(
  entryId: string, // ID of the teacher_schedules entry being updated
  payload: TeacherScheduleFormValues // Contains new className, locationName, classId
): Promise<{ success: boolean; entry?: TeacherScheduleEntry; error?: string; syncError?: string }> {
  const parse = TeacherScheduleFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  let syncError: string | undefined = undefined;
  let oldLabIdToRevalidate: string | null = null;
  let newLabIdToRevalidate: string | null = null;
  const insertSyncSuccessful = false; // Initialize flag here

  // 1. Fetch original entry details BEFORE updating
  // Need more fields for sync: teacher_id, day_of_week, time_slot, location_name, class_name (for old lesson_id), class_id
  const { data: existingEntryData, error: fetchOriginalError } = await supabase
      .from('teacher_schedules')
      .select('id, teacher_id, day_of_week, time_slot, location_name, class_name, class_id') 
      .eq('id', entryId)
      .single();

  if (fetchOriginalError || !existingEntryData) {
       console.error('Error fetching original entry details for update:', fetchOriginalError);
       const errorMsg = fetchOriginalError?.code === 'PGRST116' ? 'Güncellenecek kayıt bulunamadı.' : 'Güncellenecek ders bilgisi alınamadı.';
       return { success: false, error: errorMsg };
  }

  // Extract necessary old data
  const teacherId = existingEntryData.teacher_id;
  const dayOfWeek = existingEntryData.day_of_week; // Day/Time don't change in update
  const timeSlot = existingEntryData.time_slot;   // Day/Time don't change in update
  const oldLocationName = existingEntryData.location_name;
  const oldClassName = existingEntryData.class_name; // Used to find old lesson_id
  const oldClassId = existingEntryData.class_id;

  // New data from payload
  const newLocationName = parse.data.locationName;
  const newClassName = parse.data.className; // Used to find new lesson_id
  const newClassId = parse.data.classId;

  // Location Conflict Check (within teacher_schedules) - Check if the *new* location/slot is free
  if (newLocationName && newLocationName !== oldLocationName) {
      const { data: conflictingEntry, error: conflictError } = await supabase
        .from('teacher_schedules')
        .select('id')
        .eq('day_of_week', dayOfWeek)
        .eq('time_slot', timeSlot)
        .eq('location_name', newLocationName)
        .neq('id', entryId) // Exclude the entry being updated itself
        .neq('teacher_id', teacherId) // Check collision with other teachers at the new location
        .maybeSingle();

      if (conflictError) {
        console.error('Error checking for location conflict during update:', conflictError);
        return { success: false, error: 'Yeni konum uygunluğu kontrol edilirken bir hata oluştu.' };
      }
      if (conflictingEntry) {
        return { success: false, error: 'Güncellenmek istenen konum/saat başka bir öğretmen tarafından kullanımda.' };
      }
  }

  // Data to update in teacher_schedules table
  const teacherUpdateData = {
    class_name: newClassName,
    location_name: newLocationName || null,
    class_id: newClassId || null,
  };

  let updatedTeacherEntry: TeacherScheduleEntry | null = null;

  // 2. Update teacher_schedules table
  try {
    const { data: updatedData, error: updateError } = await supabase
      .from('teacher_schedules')
      .update(teacherUpdateData)
      .eq('id', entryId)
      .select(`*, classes ( name )`) // Fetch updated entry with joined class name
      .single();

    if (updateError || !updatedData) {
      console.error('Error updating teacher schedule entry:', updateError?.message);
       if (updateError?.code === '23505') { 
          return { success: false, error: 'Güncelleme benzersizlik kısıtlamasını ihlal ediyor.' };
      }
      throw new Error(updateError?.message || 'Öğretmen programı girdisi güncellenemedi.');
    }
    
    // Map result to TeacherScheduleEntry
    updatedTeacherEntry = {
       id: updatedData.id,
      teacherId: updatedData.teacher_id,
      dayOfWeek: updatedData.day_of_week,
      timeSlot: updatedData.time_slot,
      className: updatedData.class_name,
      locationName: updatedData.location_name,
      classId: updatedData.class_id,
      classNameDisplay: updatedData.classes?.name || null,
      createdAt: updatedData.created_at, // These might not be returned by default on update
      updatedAt: updatedData.updated_at,
    };

  } catch (err) {
    console.error('updateTeacherScheduleEntry error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }


  // 3. Sync with schedule_entries (Delete old, Insert/Update new)
  try {
      // IDs based on OLD data
      const oldLabId = await getLabIdFromName(oldLocationName);
      oldLabIdToRevalidate = oldLabId; // Store for revalidation

      // IDs based on NEW data
      const newLabId = await getLabIdFromName(newLocationName);
      const newLessonId = await getLessonIdFromName(newClassName); 
      newLabIdToRevalidate = newLabId; // Store for revalidation

      // Initialize insert success flag in the outer scope
      let insertSyncSuccessful = false; 

      // a. Delete old entry from schedule_entries if old location existed
      let deleteSyncSuccessful = true; // Assume success if no delete needed
      if (oldLabId) {
          console.log(`Sync Update: Deleting old entry from schedule_entries for lab ${oldLabId}, day ${dayOfWeek}, period ${timeSlot}`);
          const { error: deleteSyncError } = await supabase
              .from('schedule_entries')
              .delete()
              .match({ 
                  lab_id: oldLabId, 
                  day: dayOfWeek, 
                  period: timeSlot, 
                  teacher_id: teacherId 
              });
              
          if (deleteSyncError) {
              console.error('Sync Error: Failed to delete old corresponding entry from schedule_entries:', deleteSyncError);
              syncError = 'Konum programındaki eski kayıt silinemedi.';
              deleteSyncSuccessful = false;
          }
      } else if (oldLocationName) {
          console.warn(`Sync Update Warning: Old lab_id for location "${oldLocationName}" not found. Cannot delete from schedule_entries.`);
      }

      // b. Insert/Update new entry in schedule_entries if new location/lesson are valid
      if (newLabId && newLessonId) {
           // Check for conflicts at the NEW location/time (by other teachers) before inserting
           const { data: conflictCheck, error: conflictCheckErr } = await supabase
               .from('schedule_entries')
               .select('id, teacher_id')
               .eq('lab_id', newLabId)
               .eq('day', dayOfWeek)
               .eq('period', timeSlot)
               .not('teacher_id', 'eq', teacherId) // Exclude the current teacher
               .maybeSingle();

            if (conflictCheckErr) {
                 console.error('Sync Error: Could not check for conflicts in schedule_entries before upsert', conflictCheckErr);
                 syncError = (syncError ? syncError + '; ' : '') + 'Yeni konum programı çakışma kontrolü başarısız.';
            } else if (conflictCheck) {
                 console.error(`Sync Error: New location/slot (Lab ${newLabId}, Day ${dayOfWeek}, Period ${timeSlot}) is occupied by teacher ${conflictCheck.teacher_id}.`);
                 syncError = (syncError ? syncError + '; ' : '') + 'Yeni konum/saat başka bir öğretmen tarafından kullanımda.';
            } else {
                 // No conflict with others, proceed to upsert
                 console.log(`Sync Update: Upserting entry into schedule_entries for lab ${newLabId}, day ${dayOfWeek}, period ${timeSlot}`);
                 const upsertData = {
                    lab_id: newLabId,
                    day: dayOfWeek, 
                    period: timeSlot, 
                    lesson_id: newLessonId,
                    class_id: newClassId, 
                    teacher_id: teacherId,
                 };
                 const { error: upsertSyncError } = await supabase
                     .from('schedule_entries')
                     .upsert(upsertData, { 
                          onConflict: 'lab_id, day, period', // Assumes lab_id, day, period is a unique constraint
                      }); 

                 if (upsertSyncError) {
                     console.error('Sync Error: Failed to upsert into schedule_entries:', upsertSyncError);
                      syncError = (syncError ? syncError + '; ' : '') + 'Yeni konum programı güncellenemedi/eklenemedi.';
                 } else {
                     insertSyncSuccessful = true; // Set flag to true on successful upsert
                 }
            }
      } else {
          // New lab or lesson ID not found
          if (newLocationName || newClassName) { 
              console.warn(`Sync Update Warning: Could not find new lab_id for "${newLocationName}" or new lesson_id for "${newClassName}". Location schedule not updated for new entry.`);
              syncError = (syncError ? syncError + '; ' : '') + 'Yeni konum veya ders adı bulunamadı, konum programı güncellenmedi.';
          }
      }

  } catch(err) {
      console.error('Error during schedule_entries update sync:', err);
      syncError = (syncError ? syncError + '; ' : '') + 'Konum programı güncellenirken genel hata.';
  }

  // 4. Revalidate paths
  // Revalidate teacher path (always)
  revalidatePath(`/dashboard/teachers/${teacherId}/schedule`);
  // Revalidate old location path if delete was attempted
  if (oldLabIdToRevalidate) {
      console.log(`Sync Update: Revalidating old location path /dashboard/locations/${oldLabIdToRevalidate}/schedule`);
      revalidatePath(`/dashboard/locations/${oldLabIdToRevalidate}/schedule`);
  }
  // Revalidate new location path if insert was successful (check flag)
  if (newLabIdToRevalidate && newLabIdToRevalidate !== oldLabIdToRevalidate && insertSyncSuccessful) {
      console.log(`Sync Update: Revalidating new location path /dashboard/locations/${newLabIdToRevalidate}/schedule`);
      revalidatePath(`/dashboard/locations/${newLabIdToRevalidate}/schedule`);
  } else if (newLabIdToRevalidate && newLabIdToRevalidate === oldLabIdToRevalidate && insertSyncSuccessful) {
       console.log(`Sync Update: Revalidating updated location path /dashboard/locations/${newLabIdToRevalidate}/schedule`);
       revalidatePath(`/dashboard/locations/${newLabIdToRevalidate}/schedule`);
  }

  // Return overall status
  return { success: true, entry: updatedTeacherEntry ?? undefined, syncError };
}

/**
 * Delete a schedule entry by ID and sync with location schedule.
 */
export async function deleteTeacherScheduleEntry(entryId: string): Promise<{ success: boolean; error?: string; syncError?: string }> {
   let syncError: string | undefined = undefined;
   let labIdToRevalidate: string | null = null;
   
   try {
    // 1. Fetch entry details BEFORE deleting
    const { data: entryToDelete, error: fetchError } = await supabase
      .from('teacher_schedules')
      .select('teacher_id, day_of_week, time_slot, location_name') // Get fields needed for sync
      .eq('id', entryId)
      .single();

    if (fetchError || !entryToDelete) {
      console.error('Error fetching teacher schedule entry before delete:', fetchError);
      // If entry not found, maybe it was already deleted. Return success?
      if (fetchError?.code === 'PGRST116') { // Not found
          return { success: true, error: 'Silinecek kayıt bulunamadı.' }; 
      }
      return { success: false, error: 'Silinecek kayıt bilgileri alınamadı.' };
    }

    // 2. Delete from teacher_schedules
    const { error: deleteError } = await supabase
      .from('teacher_schedules')
      .delete()
      .eq('id', entryId);

    if (deleteError) {
      console.error('Error deleting teacher schedule entry:', deleteError);
      return { success: false, error: `Öğretmen programı kaydı silinemedi: ${deleteError.message}` };
    }

    // 3. Sync: Delete from schedule_entries
    try {
        const labId = await getLabIdFromName(entryToDelete.location_name);
        labIdToRevalidate = labId; // Store labId for revalidation later

        if (labId) {
            const { error: deleteSyncError } = await supabase
                .from('schedule_entries')
                .delete()
                .match({ 
                    lab_id: labId, 
                    day: entryToDelete.day_of_week, // Map day_of_week to day
                    period: entryToDelete.time_slot, // Map time_slot to period
                    teacher_id: entryToDelete.teacher_id
                 });
                 
            if (deleteSyncError) {
                 console.error('Sync Error: Failed to delete corresponding entry from schedule_entries:', deleteSyncError);
                 syncError = 'Konum programındaki ilgili kayıt silinemedi.';
            } else {
                 console.log(`Sync Success: Deleted entry from schedule_entries for lab ${labId}, day ${entryToDelete.day_of_week}, period ${entryToDelete.time_slot}`);
            }
        } else {
            // If location name existed but labId wasn't found
            if (entryToDelete.location_name) { 
               console.warn(`Sync Warning: Could not find lab_id for location "${entryToDelete.location_name}" during delete sync. Location schedule may be inconsistent.`);
               syncError = 'Konum adı sistemde bulunamadı, konum programı güncellenmedi.';
            }
            // If location_name was null, no action needed in schedule_entries
        }
    } catch (err) {
        console.error('Error during schedule_entries delete sync:', err);
        syncError = 'Konum programı güncellenirken bir hata oluştu.';
    }

    // 4. Revalidate paths
    // Revalidate teacher path (always)
    revalidatePath(`/dashboard/teachers/${entryToDelete.teacher_id}/schedule`);
    // Revalidate location path if sync was attempted (even if it failed, maybe state is inconsistent)
    if (labIdToRevalidate && !syncError) { // Only revalidate location if sync was successful
        console.log(`Sync Success: Revalidating location path /dashboard/locations/${labIdToRevalidate}/schedule`);
        revalidatePath(`/dashboard/locations/${labIdToRevalidate}/schedule`);
    } 

    return { success: true, syncError }; // Return success even if sync had issues, but report syncError

  } catch (err) {
    console.error('deleteTeacherScheduleEntry general error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
} 