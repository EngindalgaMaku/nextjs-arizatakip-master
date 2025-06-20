'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDalById } from '@/actions/dalActions'; // We need this to get the Dal name
import { fetchDalDersleri, createDalDers, updateDalDers, deleteDalDers } from '@/actions/dalDersActions';
import { fetchLocationTypes, fetchDalDersLocationTypes } from '@/actions/locationTypeActions'; // UPDATED import
import { LocationType } from '@/types/locationTypes'; // UPDATED import
import { DalDersleriYonetim as DalDersleriTable } from '@/components/dallar/DalDersleriYonetim';
import { DalDersFormModal } from '@/components/dallar/DalDersFormModal';
import { DalDers, DalDersFormValues, SinifSeviyesi } from '@/types/dalDersleri';
import { Dal } from '@/types/dallar';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import * as z from 'zod';
import { Button } from '@/components/ui/button';

export default function DalDersleriPage() {
  const params = useParams();
  const dalId = params.dalId as string;
  const queryClient = useQueryClient();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDers, setEditingDers] = useState<DalDers | null>(null);
  const [selectedSinif, setSelectedSinif] = useState<SinifSeviyesi | null>(null);
  const [initialLocationTypeIds, setInitialLocationTypeIds] = useState<string[]>([]); // UPDATED state name

  // Fetch Dal details for title
  const { data: dal, isLoading: isLoadingDal } = useQuery<Dal | null, Error>({
    queryKey: ['dal', dalId],
    queryFn: () => fetchDalById(dalId), // Add fetchDalById to dalActions
    enabled: !!dalId,
  });

  // Fetch lessons for this Dal
  const { data: dersler = [], isLoading: isLoadingDersler, error: errorDersler } = useQuery<DalDers[], Error>({
    queryKey: ['dalDersleri', dalId],
    queryFn: () => fetchDalDersleri(dalId),
    enabled: !!dalId,
  });

  // Fetch available location types (formerly lab types)
  const { data: availableLocationTypes = [], isLoading: isLoadingLocationTypes, error: errorLocationTypes } = useQuery<LocationType[]>({ // UPDATED query key and type
    queryKey: ['locationTypes'], // UPDATED query key
    queryFn: fetchLocationTypes,
  });

  // Fetch associated location types for the ders being edited
  const { data: currentDersLocationTypes, refetch: refetchDersLocationTypes, isSuccess: isCurrentDersLocationTypesSuccess } = useQuery<string[], Error>({
    queryKey: ['dalDersLocationTypes', editingDers?.id],
    queryFn: () => fetchDalDersLocationTypes(editingDers!.id),
    enabled: !!editingDers, // Only fetch when editingDers is not null
  });

  // useEffect to handle setting initialLocationTypeIds on successful fetch
  useEffect(() => {
    if (isCurrentDersLocationTypesSuccess && currentDersLocationTypes) {
      setInitialLocationTypeIds(currentDersLocationTypes || []);
    }
  }, [isCurrentDersLocationTypesSuccess, currentDersLocationTypes]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async ({ payload, suitableLocationTypeIds }: { payload: DalDersFormValues, suitableLocationTypeIds: string[] }) => { // UPDATED parameter name
      const result = await createDalDers(dalId, payload, suitableLocationTypeIds); // UPDATED function call
      if (!result.success || result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Ders oluşturulamadı.');
      }
      if (result.partialError) {
          toast.warning(result.partialError); // Show warning for partial success (e.g., types not set)
      }
      return result.ders;
    },
    onSuccess: () => {
      toast.success('Ders başarıyla oluşturuldu.');
      queryClient.invalidateQueries({ queryKey: ['dalDersleri', dalId] });
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(`Ders oluşturulurken hata: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ dersId, payload, suitableLocationTypeIds }: { dersId: string, payload: DalDersFormValues, suitableLocationTypeIds: string[] }) => { // UPDATED parameter name
      const result = await updateDalDers(dersId, payload, suitableLocationTypeIds); // UPDATED function call
      if (!result.success || result.error) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Ders güncellenemedi.');
      }
       if (result.partialError) {
          toast.warning(result.partialError); // Show warning for partial success
      }
      return result.ders;
    },
    onSuccess: () => {
      toast.success('Ders başarıyla güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['dalDersleri', dalId] });
      queryClient.invalidateQueries({ queryKey: ['dalDersLocationTypes', editingDers?.id] }); // Invalidate specific location types
      setIsModalOpen(false);
      setEditingDers(null); // Clear editing state
    },
    onError: (error) => {
      toast.error(`Ders güncellenirken hata: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDalDers,
    onSuccess: () => {
      toast.success('Ders başarıyla silindi.');
      queryClient.invalidateQueries({ queryKey: ['dalDersleri', dalId] });
    },
    onError: (error) => {
      toast.error(`Ders silinirken hata: ${error.message}`);
    },
  });

  // Handlers
  const handleAdd = (sinifSeviyesi: SinifSeviyesi) => {
    setEditingDers(null);
    setSelectedSinif(sinifSeviyesi);
    setInitialLocationTypeIds([]); // Clear initial types for add mode
    setIsModalOpen(true);
  };

  const handleEdit = async (ders: DalDers) => {
    setEditingDers(ders);
    setSelectedSinif(ders.sinifSeviyesi);
    // Fetch associated location types when opening the edit modal
    try {
      // Instead of manual fetch, rely on the useQuery to fetch/refetch when enabled
      // await refetchDersLocationTypes(); // Trigger refetch explicitly if needed, but useQuery handles enabling
      setIsModalOpen(true);
    } catch (error) {
       toast.error('İlişkili konum tipleri getirilirken hata oluştu.');
       console.error("Error fetching initial location types:", error);
    }
  };

  const handleDelete = (dersId: string) => {
    if (window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(dersId);
    }
  };

  const handleFormSubmit = (data: DalDersFormValues & { suitableLocationTypeIds?: string[] }) => {
    // Log the full data received from the modal
    console.log('[DalDersleriPage] handleFormSubmit called with data:', data);
    
    const payload = { 
        dersAdi: data.dersAdi,
        haftalikSaat: data.haftalikSaat,
        sinifSeviyesi: data.sinifSeviyesi,
        bolunebilir_mi: data.bolunebilir_mi, // Ensure this is included
        cizelgeye_dahil_et: data.cizelgeye_dahil_et, // Ensure this is included
        requires_multiple_resources: data.requires_multiple_resources, // Ensure this is included
    };
    const locationTypeIdsToSave = data.suitableLocationTypeIds || []; 
    
    console.log("[DalDersleriPage] Prepared Payload:", payload);
    console.log("[DalDersleriPage] requires_multiple_resources value in payload:", payload.requires_multiple_resources);
    console.log("[DalDersleriPage] Location Types to Save:", locationTypeIdsToSave);

    if (editingDers?.id) {
      console.log('[DalDersleriPage] Calling updateMutation...');
      updateMutation.mutate({ dersId: editingDers.id, payload, suitableLocationTypeIds: locationTypeIdsToSave });
    } else {
      console.log('[DalDersleriPage] Calling createMutation...');
      createMutation.mutate({ payload, suitableLocationTypeIds: locationTypeIdsToSave });
    }
  };

  const isLoading = isLoadingDal || isLoadingDersler || isLoadingLocationTypes;
  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const pageTitle = isLoadingDal ? 'Dal Yükleniyor...' : dal ? `${dal.name} - Ders Yönetimi` : 'Dal Bulunamadı';

  if (errorDersler || errorLocationTypes) { // UPDATED error check
    return <div className="text-red-500">Hata: {errorDersler?.message || errorLocationTypes?.message}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{pageTitle}</h1>
        <Link
           href="/dashboard/dallar"
           className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Dal Listesine Dön
        </Link>
      </div>

      {isLoading && <p>Dersler yükleniyor...</p>}

      {!isLoading && !errorDersler && !errorLocationTypes && (
        <DalDersleriTable 
          dersler={dersler}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleAdd}
        />
      )}

      {isModalOpen && selectedSinif && (
        <DalDersFormModal
          initialData={editingDers ? { 
              sinifSeviyesi: editingDers.sinifSeviyesi, 
              dersAdi: editingDers.dersAdi, 
              haftalikSaat: editingDers.haftalikSaat,
              bolunebilir_mi: editingDers.bolunebilir_mi,
              cizelgeye_dahil_et: editingDers.cizelgeye_dahil_et,
              requires_multiple_resources: editingDers.requires_multiple_resources,
           } : { 
              sinifSeviyesi: selectedSinif, 
              dersAdi: '', 
              haftalikSaat: 0,
              bolunebilir_mi: true,
              cizelgeye_dahil_et: true,
              requires_multiple_resources: false,
           }}
          sinifSeviyesi={selectedSinif}
          onSubmit={handleFormSubmit}
          onClose={() => {
              setIsModalOpen(false);
              setEditingDers(null);
              setSelectedSinif(null);
          }}
          loading={mutationLoading}
          availableLocationTypes={availableLocationTypes}
          initialLocationTypeIds={initialLocationTypeIds}
        />
      )}
    </div>
  );
} 