'use server';

// import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Class, ClassFormSchema, ClassFormValues, ClassSchema } from '@/types/classes';
import { z } from 'zod';

// Define table name
const CLASSES_TABLE = 'classes';

/**
 * Fetches all classes, optionally filtered by semesterId.
 * Orders classes by grade_level then by name.
 */
export async function fetchClasses(semesterId?: string): Promise<Class[]> {
    const supabase = await createSupabaseServerClient();
    
    // Sınıfları getir
    let query = supabase
        .from(CLASSES_TABLE)
        .select('*');

    if (semesterId && z.string().uuid().safeParse(semesterId).success) {
        query = query.eq('semester_id', semesterId);
    }

    // Default ordering - önce sınıf seviyesine göre, sonra isme göre sırala
    query = query.order('grade_level', { ascending: true }).order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching classes:', error);
        // Bu sefer hatayı fırlatma, boş bir array dön
        console.warn('Returning empty array due to database error');
        return [];
    }

    // Sınıf listesi boşsa veya yoksa, boş bir dizi dön
    if (!data || data.length === 0) {
        return [];
    }

    try {
        // Branch ve Dal bilgilerini ayrı ayrı çekelim
        // Önce tüm benzersiz branch_id'leri toplayalım
        const branchIds = [...new Set(data.filter(c => c.branch_id).map(c => c.branch_id))];
        const dalIds = [...new Set(data.filter(c => c.dal_id).map(c => c.dal_id))];
        
        // Branch isimleri için sorgu
        const branchMap: Record<string, string> = {};
        if (branchIds.length > 0) {
            const { data: branches } = await supabase
                .from('branches')
                .select('id, name')
                .in('id', branchIds);
            
            if (branches) {
                branches.forEach(branch => {
                    branchMap[branch.id] = branch.name;
                });
            }
        }
        
        // Dal isimleri için sorgu
        const dalMap: Record<string, string> = {};
        if (dalIds.length > 0) {
            const { data: dals } = await supabase
                .from('dallar')
                .select('id, name')
                .in('id', dalIds);
            
            if (dals) {
                dals.forEach(dal => {
                    dalMap[dal.id] = dal.name;
                });
            }
        }

        // Veritabanından gelen snake_case veriyi camelCase'e dönüştür ve branch/dal isimlerini ekle
        const formattedData = data.map(classItem => ({
            ...classItem,
            classTeacherId: classItem.class_teacher_id,
            classPresidentName: classItem.class_president_name,
            branchName: classItem.branch_id ? branchMap[classItem.branch_id] || '-' : '-',
            dalName: classItem.dal_id ? dalMap[classItem.dal_id] || '-' : '-'
        }));

        return formattedData;
    } catch (validationError) {
        console.error('Fetched class data validation failed:', validationError);
        // Formatlama da başarısız olursa, raw data'yı dön
        return data;
    }
}

/**
 * Creates a new class associated with a specific semester.
 */
export async function createClass(
    payload: ClassFormValues,
    semesterId: string
): Promise<{ success: boolean; class?: Class; error?: string | z.ZodIssue[] }> {
    if (!z.string().uuid().safeParse(semesterId).success) {
        return { success: false, error: 'Geçersiz sömestr ID formatı.' };
    }

    const parseResult = ClassFormSchema.safeParse(payload);
    if (!parseResult.success) {
        console.error('Class creation validation failed:', parseResult.error.issues);
        return { success: false, error: parseResult.error.issues };
    }

    const supabase = await createSupabaseServerClient();

    // Calculate display_order
    let newDisplayOrder = 0; // Default to 0
    try {
        const { data: existingClasses, error: fetchError } = await supabase
            .from(CLASSES_TABLE)
            .select('display_order')
            .eq('semester_id', semesterId)
            .order('display_order', { ascending: false })
            .limit(1);

        if (fetchError) {
            console.warn('Could not fetch existing classes to determine display_order:', fetchError.message);
            // Proceed with default 0 or handle error more strictly if required
        } else if (existingClasses && existingClasses.length > 0) {
            const firstClass = existingClasses[0];
            if (firstClass && firstClass.display_order !== null) {
                newDisplayOrder = firstClass.display_order + 1;
            }
        } else {
            // No classes yet for this semester or display_order is null, start from 0 or 1
            newDisplayOrder = 0; // Or 1, depending on preference
        }
    } catch (e) {
        console.warn('Error calculating display_order:', e);
        // Proceed with default 0
    }

    // Veritabanı sütun adlarına uygun hale getir (camelCase'den snake_case'e)
    const dbData = {
        name: parseResult.data.name,
        grade_level: parseResult.data.grade_level,
        branch_id: parseResult.data.branch_id,
        dal_id: parseResult.data.dal_id,
        class_teacher_id: parseResult.data.classTeacherId,
        class_president_name: parseResult.data.classPresidentName,
        semester_id: semesterId,
        display_order: newDisplayOrder,
    };

    console.log('Database insert payload:', dbData);

    try {
        const { data: newClass, error } = await supabase
            .from(CLASSES_TABLE)
            .insert(dbData)
            .select()
            .single();

        if (error) {
            console.error('Error creating class:', error);
            if (error.code === '23505') { // Unique constraint violation
                return { success: false, error: 'Bu isimde veya özelliklerde bir sınıf bu sömestr için zaten mevcut.' };
            }
            if (error.code === '23503') { // Foreign key violation
                return { success: false, error: 'Belirtilen sömestr veya diğer ilişkili veriler bulunamadı.' };
            }
            return { success: false, error: `Sınıf oluşturulurken bir veritabanı hatası oluştu: ${error.message}` };
        }

        // Veritabanından gelen snake_case veriyi Zod şema için camelCase'e dönüştür
        const formattedClass = {
            ...newClass,
            classTeacherId: newClass.class_teacher_id,
            classPresidentName: newClass.class_president_name
        };

        const finalParse = ClassSchema.safeParse(formattedClass);
        if (!finalParse.success) {
            console.error('Created class data validation failed after insert:', finalParse.error);
            console.log('Formatted class data:', formattedClass);
            // Zod hatası olsa bile veriyi dönelim
            return { success: true, class: formattedClass as unknown as Class };
        }

        // revalidatePath(CLASSES_PATH);
        // revalidatePath('/dashboard'); // Also revalidate dashboard if it shows class counts etc.
        return { success: true, class: finalParse.data };

    } catch (err) {
        console.error('Unexpected error creating class:', err);
        return { success: false, error: 'Sınıf oluşturulurken beklenmedik bir sunucu hatası oluştu.' };
    }
}

/**
 * Updates an existing class.
 * semester_id is typically not updated here; it's part of ClassSchema but omitted in ClassFormSchema.
 */
export async function updateClass(
    id: string,
    payload: ClassFormValues
): Promise<{ success: boolean; class?: Class; error?: string | z.ZodIssue[] }> {
    if (!z.string().uuid().safeParse(id).success) {
        return { success: false, error: 'Geçersiz sınıf ID formatı.' };
    }

    const parseResult = ClassFormSchema.safeParse(payload); // Validates against fields allowed in the form
    if (!parseResult.success) {
        console.error('Class update validation failed:', parseResult.error.issues);
        return { success: false, error: parseResult.error.issues };
    }

    // Veritabanı sütun adlarına uygun hale getir (camelCase'den snake_case'e)
    const dbData = {
        name: parseResult.data.name,
        grade_level: parseResult.data.grade_level,
        branch_id: parseResult.data.branch_id,
        dal_id: parseResult.data.dal_id,
        class_teacher_id: parseResult.data.classTeacherId,
        class_president_name: parseResult.data.classPresidentName
    };

    console.log('Database update payload:', dbData);

    const supabase = await createSupabaseServerClient();
    try {
        const { data: updatedClass, error } = await supabase
            .from(CLASSES_TABLE)
            .update(dbData)
            .eq('id', id)
            .select() // Select all fields including semester_id
            .single();

        if (error) {
            console.error(`Error updating class ${id}:`, error);
            if (error.code === '23505') {
                 return { success: false, error: 'Bu isimde veya özelliklerde bir sınıf zaten mevcut.' };
            }
            if (error.code === 'PGRST116') { // Not found
                return { success: false, error: 'Güncellenecek sınıf bulunamadı.' };
            }
            return { success: false, error: `Sınıf güncellenirken bir veritabanı hatası oluştu: ${error.message}` };
        }

        // Veritabanından gelen snake_case veriyi Zod şema için camelCase'e dönüştür
        const formattedClass = {
            ...updatedClass,
            classTeacherId: updatedClass.class_teacher_id,
            classPresidentName: updatedClass.class_president_name
        };

        const finalParse = ClassSchema.safeParse(formattedClass); // Validate full Class structure
         if (!finalParse.success) {
            console.error('Updated class data validation failed after update:', finalParse.error);
            console.log('Formatted class data:', formattedClass);
            // Zod hatası olsa bile veriyi dönelim
            return { success: true, class: formattedClass as unknown as Class };
        }

        // revalidatePath(CLASSES_PATH);
        // revalidatePath(`/dashboard/classes/${id}`); // Revalidate specific class page if exists
        return { success: true, class: finalParse.data };

    } catch (err) {
        console.error(`Unexpected error updating class ${id}:`, err);
        return { success: false, error: 'Sınıf güncellenirken beklenmedik bir sunucu hatası oluştu.' };
    }
}

/**
 * Deletes a class by its ID.
 */
export async function deleteClass(id: string): Promise<{ success: boolean; error?: string }> {
    if (!z.string().uuid().safeParse(id).success) {
        return { success: false, error: 'Geçersiz sınıf IDsi.' };
    }

    const supabase = await createSupabaseServerClient();
    try {
        const { error } = await supabase
            .from(CLASSES_TABLE)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting class ${id}:`, error);
            if (error.code === '23503') { // Foreign key constraint
                return { success: false, error: 'Bu sınıf başka kayıtlara (örn: öğrenciler, ders programı) bağlı olduğu için silinemez.' };
            }
            return { success: false, error: 'Sınıf silinirken bir veritabanı hatası oluştu.' };
        }

        // revalidatePath(CLASSES_PATH);
        // revalidatePath('/dashboard');
        return { success: true };
    } catch (err) {
        console.error(`Unexpected error deleting class ${id}:`, err);
        return { success: false, error: 'Sınıf silinirken beklenmedik bir sunucu hatası oluştu.' };
    }
}

/**
 * Fetches a single class by its ID.
 */
export async function fetchClassById(id: string): Promise<Class | null> {
    if (!id || !z.string().uuid().safeParse(id).success) {
        console.warn('fetchClassById: Invalid or missing ID provided.');
        return null;
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from(CLASSES_TABLE)
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') { // Row not found
            console.log(`Class with ID ${id} not found.`);
            return null;
        }
        console.error(`Error fetching class ${id}:`, error);
        // Depending on how you want to handle other errors, you might throw or return null
        // For now, re-throwing to be explicit about the error.
        throw new Error('Sınıf getirilirken bir veritabanı hatası oluştu.');
    }

    if (!data) return null; // Should be covered by PGRST116, but good for safety

    // Veritabanından gelen snake_case veriyi Zod şema için camelCase'e dönüştür
    const formattedClass = {
        ...data,
        classTeacherId: data.class_teacher_id,
        classPresidentName: data.class_president_name
    };

    const parseResult = ClassSchema.safeParse(formattedClass);
    if (!parseResult.success) {
        console.error('Fetched class by ID data validation failed:', parseResult.error);
        // Zod hatası olsa bile veriyi dönelim
        return formattedClass as unknown as Class;
    }
    return parseResult.data;
}

/**
 * Moves a class one position up in the display order.
 */
export async function moveClassUp(classId: string): Promise<{ success: boolean; error?: string }> {
    if (!z.string().uuid().safeParse(classId).success) {
        return { success: false, error: 'Geçersiz sınıf IDsi.' };
    }
    const supabase = await createSupabaseServerClient();
    try {
        // Get the current class's order and the order of the class above it
        const { data: currentClass, error: fetchError } = await supabase
          .from('classes')
          .select('id, display_order')
          .eq('id', classId)
          .single();

        if (fetchError || !currentClass) {
          console.error('Error fetching class to move up:', fetchError);
          return { success: false, error: 'Sınıf bulunamadı.' };
        }

        const currentOrder = currentClass.display_order;
        if (currentOrder <= 1) {
          return { success: true }; // Already at the top
        }

        // Find the class directly above
        const { data: previousClass, error: fetchPrevError } = await supabase
           .from('classes')
           .select('id, display_order')
           .eq('display_order', currentOrder - 1)
           .single();
           
        if (fetchPrevError || !previousClass) {
           console.error('Error fetching previous class:', fetchPrevError); 
           // This might happen if orders are not sequential, try finding nearest lower
           // For simplicity now, assume sequential or return error
           return { success: false, error: 'Üstteki sınıf bulunamadı veya sıra numaralarında tutarsızlık var.' };
        }

        // Swap the display_order values using a transaction if possible,
        // otherwise perform sequential updates (less safe if one fails)
        // Using sequential updates for now:
        const { error: updateCurrentError } = await supabase
           .from('classes')
           .update({ display_order: previousClass.display_order })
           .eq('id', currentClass.id);

        if (updateCurrentError) {
          console.error('Error updating current class order (up):', updateCurrentError);
          // Attempt to revert? Risky without transaction.
          return { success: false, error: 'Sınıf sırası güncellenirken hata (adım 1).' };
        }
        
        const { error: updatePreviousError } = await supabase
          .from('classes')
          .update({ display_order: currentOrder })
          .eq('id', previousClass.id);
          
        if (updatePreviousError) {
           console.error('Error updating previous class order (up):', updatePreviousError);
           // CRITICAL: Need to revert the first update here!
           // Rollback manually (attempt to set currentClass back to currentOrder)
           await supabase.from('classes').update({ display_order: currentOrder }).eq('id', currentClass.id); 
           return { success: false, error: 'Sınıf sırası güncellenirken hata (adım 2), geri alma denendi.' };
        }

        // revalidatePath('/dashboard/classes');
        return { success: true };

    } catch (err) {
        console.error('moveClassUp error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/**
 * Moves a class one position down in the display order.
 */
export async function moveClassDown(classId: string): Promise<{ success: boolean; error?: string }> {
    if (!z.string().uuid().safeParse(classId).success) {
        return { success: false, error: 'Geçersiz sınıf IDsi.' };
    }
    const supabase = await createSupabaseServerClient();
    try {
        // Get the current class's order
        const { data: currentClass, error: fetchError } = await supabase
          .from('classes')
          .select('id, display_order')
          .eq('id', classId)
          .single();

        if (fetchError || !currentClass) {
          console.error('Error fetching class to move down:', fetchError);
          return { success: false, error: 'Sınıf bulunamadı.' };
        }
        
        const currentOrder = currentClass.display_order;

        // Find the class directly below
        const { data: nextClass, error: fetchNextError } = await supabase
           .from('classes')
           .select('id, display_order')
           .eq('display_order', currentOrder + 1)
           .single();
           
         // If no class below, it's already at the bottom
         if (fetchNextError?.code === 'PGRST116') { // 'PGRST116' is Supabase code for single() not finding a row
             return { success: true }; // Already at the bottom
         } else if (fetchNextError || !nextClass) {
            console.error('Error fetching next class:', fetchNextError);
            return { success: false, error: 'Alttaki sınıf bulunamadı veya sıra numaralarında tutarsızlık var.' };
         }

        // Swap the display_order values (Sequential Updates)
        const { error: updateCurrentError } = await supabase
           .from('classes')
           .update({ display_order: nextClass.display_order })
           .eq('id', currentClass.id);

        if (updateCurrentError) {
          console.error('Error updating current class order (down):', updateCurrentError);
          return { success: false, error: 'Sınıf sırası güncellenirken hata (adım 1).' };
        }
        
        const { error: updateNextError } = await supabase
          .from('classes')
          .update({ display_order: currentOrder })
          .eq('id', nextClass.id);
          
        if (updateNextError) {
           console.error('Error updating next class order (down):', updateNextError);
           // CRITICAL: Rollback the first update!
           await supabase.from('classes').update({ display_order: currentOrder }).eq('id', currentClass.id);
           return { success: false, error: 'Sınıf sırası güncellenirken hata (adım 2), geri alma denendi.' };
        }

        // revalidatePath('/dashboard/classes');
        return { success: true };

    } catch (err) {
        console.error('moveClassDown error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}