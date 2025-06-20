import { supabase } from '@/lib/supabase'; // Server-side client
import { notFound } from 'next/navigation';
import React from 'react';
import { getDeviceTypeLabel, getDeviceStatusLabel } from '@/types/devices'; // Helper for device type label

// Next.js App Router sayfası için doğru props tipi
type PageProps = {
  params: {
    barcode: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

// Type for the processed device data
interface PublicDeviceData {
  name: string;
  type: string | null;
  serial_number: string | null;
  barcode_value: string | null;
  locationName: string | null;
  status: string | null;
}

// Server-side function to fetch device data by barcode value
async function getDeviceByBarcode(barcodeValue: string): Promise<PublicDeviceData | null> {
  if (!barcodeValue) {
    return null;
  }

  // Select necessary fields for public view, including location name and status
  const { data, error } = await supabase
    .from('devices')
    .select(`
      name,
      type,
      serial_number,
      barcode_value,
      status,
      locations ( name )
    `)
    .eq('barcode_value', barcodeValue)
    .single();

  if (error) {
    console.error('Error fetching device by barcode:', error);
    if (error.code === 'PGRST116') { // Not found
        return null;
    }
    return null; // Return null for other errors too
  }

  // Extract location name, handling both array and object formats
  let locationName: string | null = null;
  if (data.locations) {
    if (Array.isArray(data.locations) && data.locations.length > 0) {
      locationName = data.locations[0].name || null;
    } else if (typeof data.locations === 'object') {
      locationName = (data.locations as any).name || null;
    }
  }

  // Return processed device data
  return {
    name: data.name,
    type: data.type,
    serial_number: data.serial_number,
    barcode_value: data.barcode_value,
    locationName: locationName,
    status: data.status
  };
}

// Server Component Page
export default async function DevicePublicPage({ params }: any) {
  const { barcode } = params;
  const device = await getDeviceByBarcode(barcode);

  if (!device) {
    notFound(); // Trigger Next.js 404 page
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center border-b pb-2">
          Cihaz Bilgileri
        </h1>

        <div className="space-y-3 text-base">
            <div className="flex justify-between">
                <span className="font-semibold text-gray-600">Adı:</span>
                <span className="text-gray-800 text-right">{device.name}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-600">Tipi:</span>
                <span className="text-gray-800 text-right">{getDeviceTypeLabel(device.type) || '-'}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-600">Durumu:</span>
                <span className="text-gray-800 text-right">{getDeviceStatusLabel(device.status) || '-'}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-600">Seri No:</span>
                <span className="text-gray-800 text-right font-mono text-sm">{device.serial_number || '-'}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-600">Konumu:</span>
                <span className="text-gray-800 text-right">{device.locationName || <span className="italic">Belirtilmemiş</span>}</span>
            </div>
             <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-600">Barkod:</span>
                <span className="text-gray-800 text-right font-mono text-sm">{device.barcode_value || '-'}</span>
            </div>
        </div>

        {/* Placeholder for potentially showing properties later */}
        {/* <div className="mt-6 border-t pt-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Ek Özellikler</h2>
            <p className="text-sm text-gray-500 italic">Özellik gösterimi eklenecek.</p>
        </div> */}

      </div>
    </div>
  );
} 