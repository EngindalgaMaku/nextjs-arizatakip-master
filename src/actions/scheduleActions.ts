"use server";

import { supabase } from '@/lib/supabase';
import {
  LocationScheduleEntryPayload,
  LocationScheduleEntryPayloadSchema,
  ScheduleEntry,
  ScheduleEntrySchema,
  ScheduleUpsertEntry,
  ScheduleUpsertEntrySchema
} from '@/types/schedules';
import { z } from 'zod';
import { fetchClasses } from './classActions';
import { fetchAllDersOptions } from './dalDersActions';
import { fetchLocationById } from './locationActions';
import { fetchTeachers } from './teacherActions';

/**
 * Fetch all schedule entries for a given lab, joining related names.
 */
export async function fetchScheduleEntries(labId: string): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from('schedule_entries')
    .select(`
      *,
      lesson:dal_dersleri ( ders_adi ), 
      class:classes ( name ),
      teacher:teachers ( name )
    `)
    .eq('lab_id', labId)
    .order('day', { ascending: true })
    .order('period', { ascending: true });

  if (error) {
    console.error('Error fetching schedule entries with joins:', error);
    throw error;
  }
  
  const mappedData = data?.map(entry => ({
    id: entry.id,
    lab_id: entry.lab_id,
    day: entry.day,
    period: entry.period,
    lesson_id: entry.lesson_id,
    class_id: entry.class_id,
    teacher_id: entry.teacher_id,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    lesson_name: entry.lesson?.ders_adi || undefined,
    class_name: entry.class?.name || undefined,
    teacher_name: entry.teacher?.name || undefined,
  })) || [];

  const parseResult = z.array(ScheduleEntrySchema).safeParse(mappedData);
  if (!parseResult.success) {
      console.error('Fetched schedule entries data validation failed:', parseResult.error);
      return [];
  }

  return parseResult.data;
}

/**
 * Save (upsert) schedule entries for a location and synchronize teacher schedules.
 */
export async function saveScheduleEntries(entries: ScheduleUpsertEntry[]): Promise<{ success: boolean; error?: string; syncErrors?: Record<string, string> }> {
  const validationResults = entries.map(entry => ScheduleUpsertEntrySchema.safeParse(entry));
  const firstValidationError = validationResults.find(v => !v.success);
  if (firstValidationError && !firstValidationError.success) {
    console.error('Invalid schedule entry data:', firstValidationError.error.errors);
    return { success: false, error: `Geçersiz program verisi: ${firstValidationError.error.errors.map(e => e.message).join(', ')}` };
  }
  const validatedEntries = validationResults.map(v => (v as z.SafeParseSuccess<ScheduleUpsertEntry>).data);

  if (validatedEntries.length === 0 && entries.length > 0) {
     return { success: false, error: 'Doğrulama sonrası geçerli girdi bulunamadı.' };
  }

  const labId = validatedEntries[0]?.lab_id; 

  const effectiveLabId = labId || entries[0]?.lab_id;

  if (!effectiveLabId) {
    return { success: false, error: 'Kaydedilecek veya temizlenecek program için Laboratuvar IDsi belirlenemedi.' };
  }

  let locationName = 'Bilinmeyen Konum';
  try {
      const locationData = await fetchLocationById(effectiveLabId);
      if (locationData) {
          locationName = locationData.name;
      } else {
          console.warn(`Location name for labId ${effectiveLabId} not found.`);
      }
  } catch (fetchLocError) {
       console.error(`Error fetching location name for labId ${effectiveLabId}:`, fetchLocError);
  }

  let previousTeacherIds: string[] = [];
  if (validatedEntries.length === 0) {
      try {
          const { data: previousEntries, error: fetchPrevError } = await supabase
              .from('schedule_entries')
              .select('teacher_id')
              .eq('lab_id', effectiveLabId)
              .not('teacher_id', 'is', null);
          
          if (fetchPrevError) throw fetchPrevError;
          previousTeacherIds = Array.isArray(previousEntries)
            ? [...new Set(previousEntries
                .filter(item => item && typeof item === 'object' && 'teacher_id' in item && typeof (item as any).teacher_id === 'string' && !('code' in item))
                .map(e => (e as any).teacher_id as string)
              )]
            : [];
      } catch(err) {
          console.error(`Error fetching previous teacher IDs for lab ${effectiveLabId} before clearing:`, err);
      }
  }

  try {
    const { error: deleteError } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('lab_id', effectiveLabId);
      
    if (deleteError) {
        console.error('Error deleting old schedule entries:', deleteError);
        return { success: false, error: 'Eski program kayıtları silinirken hata oluştu.' };
    }

    if (validatedEntries.length > 0) {
       const mappedEntries = validatedEntries.map(entry => ({
           lab_id: entry.lab_id,
           day: entry.day,
           period: entry.period,
           lesson_id: entry.lesson_id,
           class_id: entry.class_id,
           teacher_id: entry.teacher_id,
       }));
       
       const { error: insertError } = await supabase
          .from('schedule_entries')
          .insert(mappedEntries); 

       if (insertError) {
         console.error('Error saving schedule entries:', insertError);
         return { success: false, error: `Program kayıtları kaydedilirken hata oluştu: ${insertError.message}` };
       }
    } else {
        console.log(`Location schedule cleared for labId ${effectiveLabId}.`);
    }

  } catch (err) {
    console.error('Error during location schedule update:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Konum programı güncellenirken bilinmeyen bir hata oluştu.' };
  }

  const syncErrors: Record<string, string> = {};
  const currentTeacherIds = [...new Set(validatedEntries.map(e => e.teacher_id).filter(Boolean) as string[])];
  const teacherIdsToSync = [...new Set([...currentTeacherIds, ...previousTeacherIds])];

  console.log(`Teachers to sync for lab ${effectiveLabId}:`, teacherIdsToSync);

  for (const teacherId of teacherIdsToSync) {
      try {
          const { data: teacherFullScheduleData, error: fetchTeacherSchedError } = await supabase
              .from('schedule_entries')
              .select(`
                  *,
                  lesson:dal_dersleri ( ders_adi ),
                  location:locations ( name ), 
                  class:classes ( name )
              `)
              .eq('teacher_id', teacherId);

          if (fetchTeacherSchedError) {
              throw new Error(`Öğretmenin (${teacherId}) güncel programı çekilemedi: ${fetchTeacherSchedError.message}`);
          }

          const { error: deleteTeacherSchedError } = await supabase
              .from('teacher_schedules')
              .delete()
              .eq('teacher_id', teacherId);

          if (deleteTeacherSchedError) {
              console.error(`Could not delete old schedule for teacher ${teacherId}:`, deleteTeacherSchedError.message);
              throw new Error(`Öğretmenin (${teacherId}) eski programı silinemedi: ${deleteTeacherSchedError.message}`);
          }

          if (Array.isArray(teacherFullScheduleData) && teacherFullScheduleData.length > 0) {
              const mappedTeacherEntries = (teacherFullScheduleData as any[])
                .filter(entry => entry && typeof entry === 'object' && !('code' in entry))
                .map(entry => ({
                   teacher_id: teacherId,
                   day_of_week: 'day' in entry && typeof entry.day === 'number' ? entry.day : 0,
                   time_slot: 'period' in entry && typeof entry.period === 'number' ? entry.period : 0,
                   class_name: entry.lesson && typeof entry.lesson === 'object' && 'ders_adi' in entry.lesson ? String(entry.lesson.ders_adi) : null,
                   location_name: entry.location && typeof entry.location === 'object' && 'name' in entry.location ? String(entry.location.name) : 'Bilinmeyen Konum',
                   class_id: 'class_id' in entry && typeof entry.class_id === 'string' ? entry.class_id : null,
                })) as { teacher_id: string; day_of_week: number; time_slot: number; class_name: string | null; location_name: string | null; class_id: string | null }[];
                
                const { error: insertTeacherSchedError } = await supabase
                   .from('teacher_schedules')
                   .insert(mappedTeacherEntries);
                
                if (insertTeacherSchedError) {
                    if (insertTeacherSchedError.code === '23505') {
                        console.error(`Unique constraint violation for teacher ${teacherId}:`, insertTeacherSchedError.details);
                        throw new Error(`Öğretmenin (${teacherId}) programında çakışma veya tekrarlanan kayıt bulundu. Lütfen verileri kontrol edin.`);
                    }
                   throw new Error(`Öğretmenin (${teacherId}) yeni programı kaydedilemedi: ${insertTeacherSchedError.message}`);
                }
          } else {
              console.log(`Teacher ${teacherId} has no entries after update across all locations. Their teacher_schedule is now empty.`);
          }

          console.log(`Revalidating path for teacher: /dashboard/teachers/${teacherId}/schedule`);
      } catch (syncError) {
          console.error(`Error synchronizing schedule for teacher ${teacherId}:`, syncError);
          syncErrors[teacherId] = syncError instanceof Error ? syncError.message : 'Bilinmeyen senkronizasyon hatası.';
      }
  }

  console.log(`Revalidating path for location: /dashboard/locations/${effectiveLabId}/schedule`);

  if (Object.keys(syncErrors).length > 0) {
    return { success: false, error: 'Konum programı kaydedildi ancak bazı öğretmen programları güncellenirken hatalar oluştu.', syncErrors };
  }

  return { success: true };
}

/**
 * Fetches all necessary data for the schedule editor UI.
 */
export async function fetchScheduleEditorData() {
  try {
    const [dersOptions, classes, teachers] = await Promise.all([
      fetchAllDersOptions(), 
      fetchClasses(), 
      fetchTeachers()
    ]);

    return {
      success: true,
      data: {
        dersOptions: dersOptions || [],
        classes: classes || [],
        teachers: teachers || [],
      }
    };
  } catch (error) {
    console.error("Error fetching schedule editor data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Program düzenleyici verileri getirilirken bir hata oluştu.",
      data: { dersOptions: [], classes: [], teachers: [] }
    };
  }
}

// --- NEW: Single Entry Server Actions ---

/**
 * Create a single schedule entry for a location.
 * NOTE: Teacher sync logic is NOT YET IMPLEMENTED.
 */
export async function createLocationScheduleEntry(
  labId: string,
  day: number,
  period: number,
  payload: LocationScheduleEntryPayload
): Promise<{ success: boolean; entry?: ScheduleEntry; error?: string }> {
  console.log(`[Action] createLocationScheduleEntry called with labId: ${labId}, day: ${day}, period: ${period}`);
  const parse = LocationScheduleEntryPayloadSchema.safeParse(payload);
  if (!parse.success) {
    console.error("[Action Create] Payload validation failed:", parse.error.flatten());
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }
  console.log("[Action Create] Payload validated successfully.");

  if (!labId || day == null || period == null) {
     console.error("[Action Create] Missing labId, day, or period.");
     return { success: false, error: 'Konum ID, Gün ve Periyot bilgileri eksik.' };
  }

  try {
    // Check if an entry already exists for this lab/day/period
    console.log("[Action Create] Checking for existing entry...");
    const { data: existing, error: checkError } = await supabase
        .from('schedule_entries')
        .select('id')
        .eq('lab_id', labId)
        .eq('day', day)
        .eq('period', period)
        .maybeSingle();

    if (checkError) {
        console.error('[Action Create] Error checking for existing schedule entry:', checkError);
        return { success: false, error: 'Mevcut kayıt kontrol edilirken hata oluştu.' };
    }
    if (existing) {
        console.warn("[Action Create] Entry already exists for this slot.");
        return { success: false, error: 'Bu zaman dilimi için zaten bir ders mevcut. Lütfen önce mevcut dersi silin veya düzenleyin.' };
    }
    console.log("[Action Create] No existing entry found. Proceeding to insert.");

    // Insert the new entry
    const entryData = {
        lab_id: labId,
        day: day,
        period: period,
        lesson_id: parse.data.lesson_id,
        class_id: parse.data.class_id,
        teacher_id: parse.data.teacher_id,
    };
    console.log("[Action Create] Inserting data:", entryData);

    const { data: newEntry, error: insertError } = await supabase
        .from('schedule_entries')
        .insert(entryData)
        // Ensure select fetches necessary fields for mapping and potential sync
        .select(`*, lesson:dal_dersleri(ders_adi), class:classes(name), teacher:teachers(name)`) 
        .single();

    if (insertError) {
        console.error('[Action Create] Error inserting location schedule entry:', insertError);
        return { success: false, error: insertError.message }; // Return specific DB error
    }
    if (!newEntry) {
        console.error('[Action Create] Insert successful but no data returned.');
        return { success: false, error: 'Konum programı kaydı oluşturuldu ancak veri alınamadı.' };
    }
    console.log("[Action Create] Insert successful. Returned data:", newEntry);

    // Map to ScheduleEntry type
    let mappedEntry: ScheduleEntry | null = null;
    try {
        mappedEntry = {
            id: newEntry.id,
            lab_id: newEntry.lab_id,
            day: newEntry.day,
            period: newEntry.period,
            lesson_id: newEntry.lesson_id,
            class_id: newEntry.class_id,
            teacher_id: newEntry.teacher_id,
            created_at: newEntry.created_at,
            updated_at: newEntry.updated_at,
            lesson_name: newEntry.lesson?.ders_adi || null, 
            class_name: newEntry.class?.name || null,
            teacher_name: newEntry.teacher?.name || null,
        };
        console.log("[Action Create] Data mapped successfully.");
    } catch (mapError) {
        console.error("[Action Create] Error during data mapping:", mapError);
        // Proceed even if mapping fails, but log it.
    }

    return { success: true, entry: mappedEntry ?? undefined };

  } catch (err) {
    // Catch errors from DB check, insert, or other preceding steps
    console.error('[Action Create] General error in createLocationScheduleEntry try block:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

/**
 * Update a single schedule entry for a location by its ID.
 * NOTE: Teacher sync logic is NOT YET IMPLEMENTED.
 */
export async function updateLocationScheduleEntry(
  entryId: string, // The primary key (id) of the schedule_entries record
  payload: LocationScheduleEntryPayload
): Promise<{ success: boolean; entry?: ScheduleEntry; error?: string }> {
   const parse = LocationScheduleEntryPayloadSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  if (!entryId) {
     return { success: false, error: 'Güncellenecek kayıt IDsi eksik.' };
  }

  try {
      // Fetch the current entry to get lab_id for revalidation
      const { data: currentEntryData, error: fetchError } = await supabase
          .from('schedule_entries')
          .select('lab_id, teacher_id') // Get lab_id and old teacher_id
          .eq('id', entryId)
          .single();

      if (fetchError || !currentEntryData) {
           console.error('Error fetching entry before update:', fetchError);
           return { success: false, error: 'Güncellenecek kayıt bulunamadı veya getirilemedi.' };
      }
       const labId = currentEntryData.lab_id;
       const oldTeacherId = currentEntryData.teacher_id; // Needed for potential sync later

      // Data to update
      const updateData = {
          lesson_id: parse.data.lesson_id,
          class_id: parse.data.class_id,
          teacher_id: parse.data.teacher_id,
      };

      const { data: updatedEntry, error: updateError } = await supabase
          .from('schedule_entries')
          .update(updateData)
          .eq('id', entryId)
          .select(`*, lesson:dal_dersleri(ders_adi), class:classes(name), teacher:teachers(name)`) // Fetch joined names
          .single();

      if (updateError || !updatedEntry) {
          console.error('Error updating location schedule entry:', updateError);
          return { success: false, error: updateError?.message || 'Konum programı kaydı güncellenemedi.' };
      }

      return { success: true, entry: updatedEntry };

  } catch (err) {
    console.error('updateLocationScheduleEntry error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

/**
 * Delete a single schedule entry by its ID.
 * NOTE: Teacher sync logic is NOT YET IMPLEMENTED.
 */
export async function deleteLocationScheduleEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
  if (!entryId) {
     return { success: false, error: 'Silinecek kayıt IDsi eksik.' };
  }
   try {
       // Fetch the entry before deleting to get lab_id and teacher_id
       const { data: entryToDelete, error: fetchError } = await supabase
          .from('schedule_entries')
          .select('lab_id, teacher_id') // Get lab_id and teacher_id
          .eq('id', entryId)
          .single();

        if (fetchError || !entryToDelete) {
           console.error('Error fetching entry before delete:', fetchError);
           // If not found, maybe already deleted? Treat as success.
           return { success: fetchError?.code === 'PGRST116', error: fetchError?.code !== 'PGRST116' ? 'Silinecek kayıt bulunamadı veya getirilemedi.' : undefined };
       }
       const labId = entryToDelete.lab_id;
       const teacherId = entryToDelete.teacher_id; // Needed for sync later

       const { error: deleteError } = await supabase
           .from('schedule_entries')
           .delete()
           .eq('id', entryId);

       if (deleteError) {
           console.error('Error deleting location schedule entry:', deleteError);
           return { success: false, error: deleteError.message };
       }

       return { success: true };

   } catch (err) {
       console.error('deleteLocationScheduleEntry error:', err);
       return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
   }
}

/**
 * Deletes all schedule entries for a specific location.
 */
export async function resetLocationSchedule(labId: string): Promise<{ success: boolean; error?: string }> {
  if (!labId) {
    return { success: false, error: 'Konum IDsi eksik.' };
  }
  
  console.log(`[Action resetLocationSchedule] Attempting to delete entries for labId: ${labId}`);

  try {
    // First, get the teacher IDs associated with this location before deleting
    const { data: previousEntries, error: fetchPrevError } = await supabase
        .from('location_schedule_entries' as any)
        .select('teacher_id')
        .eq('lab_id', labId)
        .not('teacher_id', 'is', null);
        
    if (fetchPrevError) {
       console.error(`Error fetching previous teacher IDs for lab ${labId} before reset:`, fetchPrevError);
       // Decide if this is a fatal error or if we should proceed with deletion anyway
       // Proceeding for now, but logging the issue.
    }
    const previousTeacherIds = Array.isArray(previousEntries)
      ? [...new Set(previousEntries
          .filter(item => item && typeof item === 'object' && 'teacher_id' in item && typeof (item as any).teacher_id === 'string' && !('code' in item))
          .map(e => (e as any).teacher_id as string)
        )]
      : [];
    console.log(`[Action resetLocationSchedule] Teachers to sync after reset for lab ${labId}:`, previousTeacherIds);

    // Delete all entries for the location
    const { error: deleteError } = await supabase
      .from('location_schedule_entries' as any)
      .delete()
      .eq('lab_id', labId);

    if (deleteError) {
      console.error(`[Action resetLocationSchedule] Error deleting entries for labId ${labId}:`, deleteError);
      return { success: false, error: `Program sıfırlanırken veritabanı hatası: ${deleteError.message}` };
    }

    console.log(`[Action resetLocationSchedule] Successfully deleted entries for labId ${labId}`);

    // After deleting, sync affected teachers (remove entries from their schedules)
    const syncErrors: Record<string, string> = {};
     for (const teacherId of previousTeacherIds) {
         try {
             // Refetch the teacher's full schedule from *all* locations now
             const { data: teacherFullScheduleData, error: fetchTeacherSchedError } = await supabase
                 .from('location_schedule_entries' as any) // Check location_schedule_entries again for remaining entries
                 .select('*, lesson:dal_dersleri(ders_adi), location:locations(name), class:classes(name)')
                 .eq('teacher_id', teacherId);

             if (fetchTeacherSchedError) {
                 throw new Error(`Öğretmenin (${teacherId}) güncel programı çekilemedi: ${fetchTeacherSchedError.message}`);
             }

             // Delete old teacher-specific schedule
             const { error: deleteTeacherSchedError } = await supabase
                 .from('teacher_schedules')
                 .delete()
                 .eq('teacher_id', teacherId);

             if (deleteTeacherSchedError) {
                 throw new Error(`Öğretmenin (${teacherId}) eski programı silinemedi: ${deleteTeacherSchedError.message}`);
             }

             // Re-insert remaining entries, if any
             if (Array.isArray(teacherFullScheduleData) && teacherFullScheduleData.length > 0) {
                 const mappedTeacherEntries = (teacherFullScheduleData as any[])
                   .filter(entry => entry && typeof entry === 'object' && !('code' in entry))
                   .map(entry => ({
                      teacher_id: teacherId,
                      day_of_week: 'day' in entry && typeof entry.day === 'number' ? entry.day : 0,
                      time_slot: 'period' in entry && typeof entry.period === 'number' ? entry.period : 0,
                      class_name: entry.lesson && typeof entry.lesson === 'object' && 'ders_adi' in entry.lesson ? String(entry.lesson.ders_adi) : null,
                      location_name: entry.location && typeof entry.location === 'object' && 'name' in entry.location ? String(entry.location.name) : 'Bilinmeyen Konum',
                      class_id: 'class_id' in entry && typeof entry.class_id === 'string' ? entry.class_id : null,
                 })) as { teacher_id: string; day_of_week: number; time_slot: number; class_name: string | null; location_name: string | null; class_id: string | null }[];
                 
                 const { error: insertTeacherSchedError } = await supabase
                    .from('teacher_schedules')
                    .insert(mappedTeacherEntries);
                 
                 if (insertTeacherSchedError) {
                     throw new Error(`Öğretmenin (${teacherId}) güncel programı kaydedilemedi: ${insertTeacherSchedError.message}`);
                 }
             } else {
                 console.log(`Teacher ${teacherId}'s schedule is now empty after reset.`);
             }

             console.log(`[Action resetLocationSchedule] Revalidating teacher schedule path: /dashboard/teachers/${teacherId}/schedule`);
         } catch (syncError) {
             console.error(`[Action resetLocationSchedule] Error syncing teacher ${teacherId} after reset:`, syncError);
             syncErrors[teacherId] = syncError instanceof Error ? syncError.message : 'Bilinmeyen senkronizasyon hatası.';
         }
     }

    // Revalidate the location schedule path
    console.log(`[Action resetLocationSchedule] Revalidating location schedule path: /dashboard/locations/${labId}/schedule`);

     if (Object.keys(syncErrors).length > 0) {
        return { success: true, error: 'Konum programı sıfırlandı ancak bazı öğretmen programları güncellenirken hatalar oluştu.' }; // Still success=true for reset itself
     }

    return { success: true };

  } catch (err) {
    console.error(`[Action resetLocationSchedule] General error for labId ${labId}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Program sıfırlanırken bilinmeyen bir hata oluştu.' };
  }
}

// --- END NEW Single Entry Server Actions --- 