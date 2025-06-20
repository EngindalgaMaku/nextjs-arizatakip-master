"use client"; // Make this a Client Component

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // For refreshing data
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2'; // For user feedback

// Actions
import {
  fetchScheduleEntries,
  fetchScheduleEditorData,
  createLocationScheduleEntry,
  updateLocationScheduleEntry,
  deleteLocationScheduleEntry,
} from '@/actions/scheduleActions';
import { fetchLocationById } from '@/actions/locationActions';

// Types
import {
   ScheduleEntry,
   LocationScheduleEntryPayload 
} from '@/types/schedules';
import { Class } from '@/types/classes';
import { Teacher } from '@/types/teachers';

// Components
import { LocationScheduleGrid } from '@/components/schedules/LocationScheduleGrid';
import { LocationScheduleFormModal } from '@/components/schedules/LocationScheduleFormModal';

// Updated Props for the Client Component
interface LocationScheduleClientPageProps {
  labId: string; // Receive labId directly as a prop
}

// Type for ders options expected by the modal
interface DersDropdownOption {
    value: string; // lesson_id
    label: string; // ders_adi
}

// Updated EditorOptions type
interface EditorOptions {
  dersOptions: DersDropdownOption[]; 
  classes: Class[];
  teachers: Partial<Teacher>[]; // Expect Partial<Teacher> array
}

// Structure for modal data state
interface ModalData {
    id?: string; // Entry ID for edit mode
    day?: number;
    period?: number;
    lesson_id?: string;
    class_id?: string | null;
    teacher_id?: string | null;
}

// The component now accepts labId as a prop
export default function LocationScheduleClientPage({ labId }: LocationScheduleClientPageProps) {
  const router = useRouter();
  // const labId = params?.labId; // REMOVED - Use the labId prop

  // State variables
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [editorOptions, setEditorOptions] = useState<EditorOptions>({ dersOptions: [], classes: [], teachers: [] });
  const [locationName, setLocationName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true); // For initial data load
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For form submission
  const [error, setError] = useState<string | null>(null);
  // Add refreshKey state to trigger data refetching
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentModalData, setCurrentModalData] = useState<ModalData | null>(null);

  // Create a reusable function to fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use the labId prop directly
      const [locationResult, scheduleEntriesResult, editorDataResult] = await Promise.all([
        fetchLocationById(labId),
        fetchScheduleEntries(labId),
        fetchScheduleEditorData(),
      ]);

      if (!locationResult) {
        throw new Error("Konum bilgileri getirilemedi.");
      }
      setLocationName(locationResult.name);

      setScheduleEntries(scheduleEntriesResult || []);

      if (!editorDataResult.success || !editorDataResult.data) {
          console.warn("Editor options could not be fetched:", editorDataResult.error);
           setEditorOptions({ dersOptions: [], classes: [], teachers: [] });
      } else {
          // Map fetched ders options to the format needed by the modal
          const mappedDersOptions = editorDataResult.data.dersOptions.map(d => ({ 
              value: d.id, 
              label: d.dersAdi 
          }));
          setEditorOptions({
              ...editorDataResult.data, 
              dersOptions: mappedDersOptions, 
          });
      }

    } catch (err) {
      console.error("Error loading schedule page data:", err);
      setError(err instanceof Error ? err.message : "Veriler yüklenirken bir hata oluştu.");
      setScheduleEntries([]); 
    } finally {
      setIsLoading(false);
    }
  }, [labId]);

  // Fetch initial data on component mount or when refreshKey changes
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]); // Include refreshKey in dependencies

  // --- Event Handlers ---
  const handleAdd = (day: number, period: number) => {
    setModalMode('add');
    setCurrentModalData({ day, period });
    setIsModalOpen(true);
  };

  const handleEdit = (entry: ScheduleEntry) => {
    setModalMode('edit');
    setCurrentModalData({
        id: entry.id,
        day: entry.day,
        period: entry.period,
        lesson_id: entry.lesson_id ?? undefined,
        class_id: entry.class_id,
        teacher_id: entry.teacher_id,
     });
    setIsModalOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    const result = await Swal.fire({ /* ... confirmation dialog ... */
      title: 'Emin misiniz?',
      text: "Bu ders programı girdisi silinecek!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'İptal',
    });

    if (result.isConfirmed) {
      setIsSubmitting(true); 
      setError(null);
      try {
        const deleteResult = await deleteLocationScheduleEntry(entryId);
        if (!deleteResult.success) {
          throw new Error(deleteResult.error || 'Kayıt silinirken bir hata oluştu.');
        }
        Swal.fire('Silindi!', 'Ders programı girdisi başarıyla silindi.', 'success');
        console.log('[handleDelete] Attempting data refresh after delete...');
        // Update the refreshKey to trigger a refetch
        setRefreshKey(prev => prev + 1);
        router.refresh(); // Keep the router.refresh for cache invalidation
      } catch (err) {
        console.error("Delete error:", err);
        const errorMsg = err instanceof Error ? err.message : 'Silme işlemi sırasında bilinmeyen bir hata oluştu.';
        setError(errorMsg);
        Swal.fire('Hata!', errorMsg, 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentModalData(null); 
  };

  const handleModalSubmit = async (payload: LocationScheduleEntryPayload) => {
    if (!currentModalData) return; 

    setIsSubmitting(true);
    setError(null);
    let result: { success: boolean; error?: string; entry?: ScheduleEntry };

    try {
      console.log(`[handleModalSubmit] Submitting in mode: ${modalMode}`);
      if (modalMode === 'add' && currentModalData.day !== undefined && currentModalData.period !== undefined) {
        // Use the labId prop here
         console.log(`[handleModalSubmit] Calling createLocationScheduleEntry for labId: ${labId}, day: ${currentModalData.day}, period: ${currentModalData.period}`);
        result = await createLocationScheduleEntry(labId, currentModalData.day, currentModalData.period, payload);
      } else if (modalMode === 'edit' && currentModalData.id) {
        console.log(`[handleModalSubmit] Calling updateLocationScheduleEntry for entryId: ${currentModalData.id}`);
        result = await updateLocationScheduleEntry(currentModalData.id, payload);
      } else {
        throw new Error("Geçersiz modal modu veya eksik veri.");
      }

      if (!result.success) {
        throw new Error(result.error || 'İşlem sırasında bir hata oluştu.');
      }

      Swal.fire('Başarılı!', modalMode === 'add' ? 'Ders başarıyla eklendi.' : 'Ders başarıyla güncellendi.', 'success');
      handleModalClose();
      console.log('[handleModalSubmit] Attempting data refresh after success...');
      // Update the refreshKey to trigger a refetch
      setRefreshKey(prev => prev + 1);
      router.refresh(); // Keep the router.refresh for cache invalidation

    } catch (err) {
      console.error("Submit error:", err);
      const errorMsg = err instanceof Error ? err.message : 'Kaydetme/güncelleme sırasında bilinmeyen bir hata oluştu.';
      setError(errorMsg);
      Swal.fire('Hata!', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- Render Logic ---
  if (isLoading) {
    return <div className="p-6">Yükleniyor...</div>; 
  }

  const modalInitialData = modalMode === 'edit' && currentModalData ? {
      id: currentModalData.id, 
      lesson_id: currentModalData.lesson_id || '',
      class_id: currentModalData.class_id || null,
      teacher_id: currentModalData.teacher_id || null,
  } : undefined; 

  return (
    <div className="p-6">
        {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
           <Link
            href="/dashboard/locations"
            className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center mb-1"
           >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Konumlara Geri Dön
           </Link>
           <h1 className="text-2xl font-semibold text-gray-800">
             {locationName} - Ders Programı
           </h1>
           {error && !isModalOpen && <p className="text-red-500 text-sm mt-2">Hata: {error}</p>}
        </div>
      </div>

      {/* Grid */}
      <LocationScheduleGrid
        scheduleEntries={scheduleEntries}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal */}
      {isModalOpen && currentModalData?.day !== undefined && currentModalData?.period !== undefined && (
        <LocationScheduleFormModal
          key={modalMode === 'edit' ? currentModalData.id : `${currentModalData.day}-${currentModalData.period}`}
          isOpen={isModalOpen} 
          initialData={modalInitialData}
          day={currentModalData.day}
          period={currentModalData.period}
          editorOptions={editorOptions} 
          onSubmit={handleModalSubmit}
          onClose={handleModalClose}
          loading={isSubmitting}
        />
      )}
    </div>
  );
} 