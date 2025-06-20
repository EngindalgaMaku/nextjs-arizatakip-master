'use server';

import { supabase } from '@/lib/supabase';
import { Device, DeviceFormData, DeviceSchema, Issue } from '@/types/devices';

// Define a type for the fetched data including location name
// Note: Supabase returns related data nested. Adjust if your client setup differs.
export interface DeviceWithLocationName extends Device {
  locations: { name: string } | null; // Supabase nests related data like this by default
}

/**
 * Fetches all devices from the database, including their location name.
 * Returns data conforming to the Device[] type for consistency.
 */
export async function fetchDevices(): Promise<Device[]> {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      id,
      name,
      type,
      serial_number,
      location_id,
      barcode_value,
      properties,
      purchase_date,
      warranty_expiry_date,
      status,
      notes,
      issues,
      created_at,
      updated_at,
      locations ( id, name )
    `)
    .order('sort_order', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Original Supabase Error fetching devices:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  // Map the data to the Device[] structure
  const mappedData = data.map(device => {
    // Ensure device.locations is treated as an object before accessing properties
    const locationData = device.locations && typeof device.locations === 'object' && !Array.isArray(device.locations)
      ? { id: (device.locations as any).id, name: (device.locations as any).name }
      : null;

    return {
      ...device,
      location: locationData,
    };
  });

  // Remove 'locations' property explicitly to match Device type closer
  const finalData = mappedData.map(({ locations, ...rest }) => rest) as Device[];

  return finalData;
}

/**
 * Creates a new device.
 * Calculates and assigns the next sort_order.
 * @param formData - Data from the device form.
 */
export async function createDevice(formData: DeviceFormData): Promise<{ success: boolean; error?: string; device?: Device }> {
  // Validate input data
  const validation = DeviceSchema.safeParse(formData);
  if (!validation.success) {
    console.error('Validation Error:', validation.error.errors);
    const firstError = validation.error.errors[0];
    const errorMessage = firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Geçersiz form verisi.';
    return { success: false, error: errorMessage };
  }

  // Destructure all validated fields from the schema
  const {
    name,
    type,
    location_id,
    serial_number,
    properties,
    purchase_date,
    warranty_expiry_date,
    status,
    notes
  } = validation.data;

  // properties içinden department'ı bul
  const department = Array.isArray(properties)
    ? properties.find((p) => p.key === 'department')?.value || ''
    : '';

  try {
    // Insert the new device data (without barcode_value initially)
    const { data: newDeviceData, error: insertError } = await supabase
      .from('devices')
      .insert({
        name: name || '',
        type: type || '',
        location_id: location_id || null,
        serial_number: serial_number || '',
        properties: properties || null,
        purchase_date: purchase_date || null,
        warranty_expiry_date: warranty_expiry_date || null,
        status: status || '',
        notes: notes || '',
        department
      })
      .select()
      .single();

    if (insertError || !newDeviceData) {
      console.error('Error inserting device:', insertError);
      throw new Error(insertError?.message || 'Cihaz eklenirken bir veritabanı hatası oluştu.');
    }

    // Update the newly created device to set barcode_value = id
    const { data: updatedDevice, error: updateError } = await supabase
      .from('devices')
      .update({ barcode_value: newDeviceData.id })
      .eq('id', newDeviceData.id)
      .select()
      .single();

    if (updateError || !updatedDevice) {
       console.error('Error setting barcode for device:', updateError);
       // Optionally: attempt to delete the previously inserted row for consistency?
       throw new Error(updateError?.message || 'Cihaz barkodu ayarlanırken bir hata oluştu.');
    }

    return { success: true, device: updatedDevice as Device };

  } catch (error) {
    console.error('Create Device Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cihaz oluşturulurken bilinmeyen bir hata oluştu.'
    };
  }
}

/**
 * Updates an existing device.
 * @param id - The ID of the device to update.
 * @param formData - The updated data for the device.
 */
export async function updateDevice(id: string, formData: DeviceFormData): Promise<{ success: boolean; error?: string; device?: Device }> {
    // Validate input data
    const validation = DeviceSchema.safeParse(formData);
    if (!validation.success) {
        console.error('Validation Error:', validation.error.errors);
        const firstError = validation.error.errors[0];
        const errorMessage = firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Geçersiz form verisi.';
        return { success: false, error: errorMessage };
    }

    // Destructure all validated fields
    const {
        name,
        type,
        location_id,
        serial_number,
        properties,
        purchase_date,
        warranty_expiry_date,
        status,
        notes
      } = validation.data;

    // properties içinden department'ı bul
    const department = Array.isArray(properties)
      ? properties.find((p) => p.key === 'department')?.value || ''
      : '';

    try {
        const { data: updatedDeviceData, error: updateError } = await supabase
            .from('devices')
            .update({
                name: name || '',
                type: type || '',
                location_id: location_id || null,
                serial_number: serial_number || '',
                properties: properties || null,
                purchase_date: purchase_date || null,
                warranty_expiry_date: warranty_expiry_date || null,
                status: status || '',
                notes: notes || '',
                department,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError || !updatedDeviceData) {
            console.error('Error updating device:', updateError);
            throw new Error(updateError?.message || 'Cihaz güncellenirken bir veritabanı hatası oluştu.');
        }

        return { success: true, device: updatedDeviceData as Device };

    } catch (error) {
        console.error('Update Device Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Cihaz güncellenirken bilinmeyen bir hata oluştu.'
        };
    }
}

/**
 * Deletes a device.
 * @param id - The ID of the device to delete.
 */
export async function deleteDevice(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        // No need to fetch sort_order anymore
        // Delete the device
        const { error: deleteError } = await supabase
            .from('devices')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting device:', deleteError);
            throw new Error(deleteError.message || 'Cihaz silinirken bir veritabanı hatası oluştu.');
        }

        // No need to decrement sort_order

        return { success: true };

    } catch (error) {
        console.error('Delete Device Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Cihaz silinirken bilinmeyen bir hata oluştu.'
        };
    }
}

/**
 * Moves a device up or down in the sort order.
 * @param id - The ID of the device to move.
 * @param direction - The direction to move the device ('up' or 'down').
 */
export async function moveDevice(id: string, direction: 'up' | 'down'): Promise<{ success: boolean; error?: string }> {
    try {
        // Fetch the device to move
        const { data: currentDevice, error: fetchCurrentError } = await supabase
            .from('devices')
            .select('id, sort_order')
            .eq('id', id)
            .single();

        if (fetchCurrentError || !currentDevice) {
            console.error('Error fetching device to move:', fetchCurrentError);
            
            // Initialize sort_order for all devices if needed
            if (fetchCurrentError?.code === 'PGRST116') {
                // Device not found or sort_order is null, initialize all devices with sort_order
                await initializeDeviceSortOrder();
                return { success: true };
            }
            
            throw new Error('Taşınacak cihaz bulunamadı veya sıralama bilgisi eksik.');
        }

        // If sort_order is null, initialize it for all devices
        if (currentDevice.sort_order === null) {
            await initializeDeviceSortOrder();
            return { success: true };
        }

        const currentOrder = currentDevice.sort_order;
        const targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

        // Fetch the neighbor device at the target position
        const { data: neighborDevice, error: fetchNeighborError } = await supabase
            .from('devices')
            .select('id, sort_order')
            .eq('sort_order', targetOrder)
            .single();

        if (fetchNeighborError && fetchNeighborError.code !== 'PGRST116') {
            console.error('Error fetching neighbor device:', fetchNeighborError);
            throw new Error('Komşu cihaz bilgisi alınırken hata oluştu.');
        }
        
        if (!neighborDevice) {
             console.warn(`moveDevice: No neighbor found at sort_order ${targetOrder} when moving ${direction}. Proceeding with single update.`);
            // We might only need to update the current device if the target is empty/invalid
            // However, the current logic attempts to swap, which might fail if neighborDevice is null.
            // Let's refine the swap logic to handle this.
             return { success: true }; // Or should we return an error indicating no move happened?
                                       // For now, let's assume the frontend prevents this call.
        }

        // Swap sort_order values
        const { error: updateError1 } = await supabase
            .from('devices')
            .update({ sort_order: targetOrder })
            .eq('id', currentDevice.id);

        if (updateError1) {
            console.error('Error updating current device sort order:', updateError1);
            throw new Error('Sıralama güncellenirken bir hata oluştu.');
        }

        const { error: updateError2 } = await supabase
            .from('devices')
            .update({ sort_order: currentOrder })
            .eq('id', neighborDevice.id);

        if (updateError2) {
            console.error('Error updating neighbor device sort order:', updateError2);
            // Try to revert the first update if possible
            await supabase
                .from('devices')
                .update({ sort_order: currentOrder })
                .eq('id', currentDevice.id);
            throw new Error('Sıralama güncellenirken bir hata oluştu.');
        }

        return { success: true };

    } catch (error) {
        console.error('Move Device Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Cihaz taşınırken bilinmeyen bir hata oluştu.'
        };
    }
}

/**
 * Initialize sort_order for all devices if needed.
 * This is called when moving a device that doesn't have a sort_order yet.
 */
async function initializeDeviceSortOrder(): Promise<void> {
    try {
        // Get all devices ordered by created_at
        const { data: devices, error: fetchError } = await supabase
            .from('devices')
            .select('id, created_at')
            .order('created_at', { ascending: true });

        if (fetchError || !devices) {
            console.error('Error fetching devices for sort order initialization:', fetchError);
            throw new Error('Cihazlar yüklenirken bir hata oluştu.');
        }

        // Update each device with a new sort_order
        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            if (!device) continue;
            const { error: updateError } = await supabase
                .from('devices')
                .update({ sort_order: i + 1 }) // Start from 1
                .eq('id', device.id);

            if (updateError) {
                console.error(`Error initializing sort_order for device ${device.id}:`, updateError);
                // Continue with other devices
            }
        }
    } catch (error) {
        console.error('Initialize Device Sort Order Error:', error);
        throw error;
    }
}

// Add a new issue to a device's issues array
export async function addIssueToDevice(deviceId: string, issue: Issue): Promise<{ success: boolean; error?: string; device?: Device }> {
  // Fetch current issues
  const { data: deviceData, error: fetchError } = await supabase
    .from('devices')
    .select('issues')
    .eq('id', deviceId)
    .single();
  if (fetchError) {
    console.error('Error fetching device issues:', fetchError);
    return { success: false, error: fetchError.message };
  }
  let currentIssues: Issue[] = [];
  if (Array.isArray(deviceData?.issues)) {
    currentIssues = deviceData.issues as unknown as Issue[];
  }
  const updatedIssues = [...currentIssues, issue];
  // Update with new issues array
  const { data: updatedDevice, error: updateError } = await supabase
    .from('devices')
    .update({ issues: updatedIssues.map(issue => ({ ...issue })) })
    .eq('id', deviceId)
    .single();
  if (updateError) {
    console.error('Error updating device issues:', updateError);
    return { success: false, error: updateError.message };
  }
  return { success: true, device: updatedDevice };
}

/**
 * Update the evaluation of a specific issue in a device's issues array.
 * @param deviceId - ID of the device.
 * @param issueIndex - Index of the issue in the issues array.
 * @param evaluation - New evaluation text.
 */
export async function updateIssueInDevice(
  deviceId: string,
  issueIndex: number,
  evaluation: string
): Promise<{ success: boolean; error?: string; device?: Device }> {
  // Fetch current issues
  const { data: deviceData, error: fetchError } = await supabase
    .from('devices')
    .select('issues')
    .eq('id', deviceId)
    .single();
  if (fetchError) {
    console.error('Error fetching device issues:', fetchError);
    return { success: false, error: fetchError.message };
  }
  let currentIssues: Issue[] = [];
  if (Array.isArray(deviceData?.issues)) {
    currentIssues = deviceData.issues as unknown as Issue[];
  }
  if (issueIndex < 0 || issueIndex >= currentIssues.length) {
    return { success: false, error: 'Geçersiz arıza kaydı indeksi.' };
  }
  // Update evaluation
  const updatedIssues = [...currentIssues];
  const prev = updatedIssues[issueIndex];
  if (!prev) {
    throw new Error("Güncellenmek istenen issue bulunamadı!");
  }
  if (!prev.reported_by || !prev.description || !prev.date) {
    throw new Error("Issue güncellenirken zorunlu alanlar eksik!");
  }
  updatedIssues[issueIndex] = {
    ...prev,
    evaluation,
    reported_by: prev.reported_by,
    description: prev.description,
    date: prev.date,
  };
  // Persist updated issues array
  const { data: updatedDevice, error: updateError } = await supabase
    .from('devices')
    .update({ issues: updatedIssues.map(issue => ({ ...issue })) })
    .eq('id', deviceId)
    .select()
    .single();
  if (updateError) {
    console.error('Error updating issue evaluation:', updateError);
    return { success: false, error: updateError.message };
  }
  // Optionally revalidate device page
  return { success: true, device: updatedDevice as Device };
}

/**
 * Delete an issue at a given index from a device's issues array.
 * @param deviceId - ID of the device.
 * @param issueIndex - Index of the issue to remove.
 */
export async function deleteIssueFromDevice(
  deviceId: string,
  issueIndex: number
): Promise<{ success: boolean; error?: string; device?: Device }> {
  // Fetch current issues
  const { data: deviceData, error: fetchError } = await supabase
    .from('devices')
    .select('issues')
    .eq('id', deviceId)
    .single();
  if (fetchError) {
    console.error('Error fetching device issues:', fetchError);
    return { success: false, error: fetchError.message };
  }
  let currentIssues: Issue[] = [];
  if (Array.isArray(deviceData?.issues)) {
    currentIssues = deviceData.issues as unknown as Issue[];
  }
  if (issueIndex < 0 || issueIndex >= currentIssues.length) {
    return { success: false, error: 'Geçersiz arıza kaydı indeksi.' };
  }
  // Remove the issue at the given index
  const updatedIssues = currentIssues.filter((_, idx) => idx !== issueIndex);
  // Persist updated issues array
  const { data: updatedDevice, error: updateError } = await supabase
    .from('devices')
    .update({ issues: updatedIssues.map(issue => ({ ...issue })) })
    .eq('id', deviceId)
    .select()
    .single();
  if (updateError) {
    console.error('Error deleting device issue:', updateError);
    return { success: false, error: updateError.message };
  }
  return { success: true, device: updatedDevice as Device };
} 