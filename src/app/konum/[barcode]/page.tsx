import LocationSchedule from '@/components/schedules/LocationSchedule';
import { supabase } from '@/lib/supabase'; // Server-side client
import { ScheduleEntry, ScheduleEntrySchema } from '@/types/schedules';
import { notFound } from 'next/navigation';
import { z } from 'zod'; // Import Zod for validation

// Next.js App Router sayfası için doğru props tipi
type PageProps = {
  params: {
    barcode: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

// Type for location data
interface LocationData {
  name: string;
  properties: Array<{
    key: string;
    value: any;
  }> | null;
}

// Update function return type definition to include 'id'
async function getLocationByBarcode(barcodeValue: string): Promise<(LocationData & { id: string }) | null> {
  if (!barcodeValue) {
    return null;
  }

  // Select name, properties, and id
  const { data, error } = await supabase
    .from('locations')
    .select('name, properties, id') 
    .eq('barcode_value', barcodeValue)
    .single();

  if (error) {
    console.error('Error fetching location by barcode:', error);
    if (error.code === 'PGRST116') { 
        return null;
    }
    return null;
  }
  
  // Convert properties to the expected format if it exists
  const convertedData = {
    ...data,
    properties: data.properties ? Object.entries(data.properties).map(([key, value]) => ({
      key,
      value
    })) : null
  };
  
  return convertedData;
}

// Update server-side fetch for schedule entries
async function getScheduleEntriesByLab(labId: string): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from('schedule_entries')
    .select(`
      id,
      lab_id,
      day,
      period,
      lesson_id,
      class_id,
      teacher_id,
      created_at,
      updated_at,
      dal_dersleri!lesson_id(ders_adi),
      classes!class_id(name),
      teachers!teacher_id(name)
    `)
    .eq('lab_id', labId)
    .order('day', { ascending: true })
    .order('period', { ascending: true });

  if (error) {
    console.error('Error fetching schedule entries by lab:', error);
    return [];
  }

  // Map data to camelCase and extract joined names
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
    // Extract nested names or null
    lesson_name: entry.dal_dersleri?.ders_adi ?? null,
    class_name: entry.classes?.name ?? null,
    teacher_name: entry.teachers?.name ?? null,
  })) || [];

  // Validate fetched data (optional but recommended)
  const parseResult = z.array(ScheduleEntrySchema).safeParse(mappedData);
  if (!parseResult.success) {
      console.error('Fetched public schedule data validation failed:', parseResult.error);
      // Handle validation error, e.g., return empty array or throw
      return [];
  }

  return parseResult.data;
}

// Server Component Page
export default async function LocationPublicPage({ params }: PageProps) {
  const { barcode } = params;
  const location = await getLocationByBarcode(barcode);
  
  if (!location) {
    notFound(); // Trigger Next.js 404 page
  }

  // Now location.id should be correctly typed
  const scheduleEntries = await getScheduleEntriesByLab(location.id);

  const properties = location.properties;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Konum Bilgileri
        </h1>
        <p className="text-lg text-indigo-600 font-semibold mb-4 text-center border-b pb-2">
          {location.name}
        </p>

        {/* If schedule entries exist, show schedule component */}
        {scheduleEntries && scheduleEntries.length > 0 && (
          <LocationSchedule entries={scheduleEntries} />
        )}

        {properties && Array.isArray(properties) && properties.length > 0 ? (
          <div className="max-h-96 overflow-y-auto pr-2 mt-4">
            <div className="space-y-2 text-sm">
              {properties.map((prop, index) => (
                // Use key from prop object if available, otherwise index
                <div key={prop.key || index} className="border-t pt-2">
                  <span className="font-semibold text-gray-600">{prop.key}: </span>
                  <span className="text-gray-800 break-words">
                    {typeof prop.value === 'boolean' ? (prop.value ? 'Evet' : 'Hayır') :
                     typeof prop.value === 'object' && prop.value !== null ? JSON.stringify(prop.value) :
                     String(prop.value ?? '-')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic text-center">Bu konum için ek özellik tanımlanmamış.</p>
        )}
      </div>
    </div>
  );
} 