'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLocationTypes, createLocationType, updateLocationType, deleteLocationType } from '@/actions/locationTypeActions';
import { LocationType, LocationTypeFormValues } from '@/types/locationTypes';
import { LocationTypesTable } from '@/components/location-types/LocationTypesTable';
import { LocationTypeFormModal } from '@/components/location-types/LocationTypeFormModal';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify'; // Or your preferred toast library
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
// import { PageTitle } from '@/components/ui/pageTitle'; // YORUM SATIRI YAPILDI
// import { ConfirmDialog } from '@/components/ui/confirmDialog'; // YORUM SATIRI YAPILDI

export default function LocationTypesPage() {
  console.log('LocationTypesPage bileşeni render ediliyor.');
  console.log('fetchLocationTypes import kontrolü:', typeof fetchLocationTypes, fetchLocationTypes);

  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LocationType | null>(null);

  const { data: locationTypes = [], isLoading, error } = useQuery<LocationType[], Error>({
    queryKey: ['locationTypes'],
    queryFn: fetchLocationTypes,
  });

  const createMutation = useMutation({
    mutationFn: createLocationType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationTypes'] });
      toast.success('Lokasyon tipi başarıyla eklendi!');
      setIsModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Hata: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LocationTypeFormValues }) => updateLocationType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationTypes'] });
      toast.success('Lokasyon tipi başarıyla güncellendi!');
      setIsModalOpen(false);
      setEditingType(null);
    },
    onError: (err: Error) => {
      toast.error(`Hata: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocationType,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['locationTypes'] });
        toast.success('Lokasyon tipi başarıyla silindi!');
      } else {
        toast.error(`Silme hatası: ${data.error?.message || 'Bilinmeyen bir hata oluştu.'}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Hata: ${err.message}`);
    },
  });

  const handleAdd = () => {
    setEditingType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (type: LocationType) => {
    setEditingType(type);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu lokasyon tipini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve bu tipe sahip konumlar etkilenebilir.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (formData: LocationTypeFormValues) => {
    if (editingType && editingType.id) {
      updateMutation.mutate({ id: editingType.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className='flex items-center gap-3'>
         <Link href="/dashboard/locations" passHref>
            <Button variant="outline" size="icon" aria-label="Konum Yönetimine Dön">
                <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-semibold">Lokasyon Tipleri Yönetimi</h1>
        </div>
        <Button onClick={handleAdd} disabled={isLoading || mutationLoading}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Lokasyon Tipi Ekle
        </Button>
      </div>

      {isLoading && <p>Lokasyon tipleri yükleniyor...</p>}
      {error && <p className="text-red-500">Hata: {error.message}</p>}
      {!isLoading && !error && (
        <LocationTypesTable
          locationTypes={locationTypes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={mutationLoading}
        />
      )}

      <LocationTypeFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingType(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingType}
        isLoading={mutationLoading}
      />
    </div>
  );
} 