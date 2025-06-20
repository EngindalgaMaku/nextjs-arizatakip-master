'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLocations, fetchLocationsByBranch, createLocation, updateLocation, deleteLocation } from '@/actions/locationActions';
import { fetchBranches } from '@/actions/branchActions';
import { fetchLocationTypes } from '@/actions/locationTypeActions';
import LocationsTable from '@/components/locations/LocationsTable';
import { LocationFormModal } from '@/components/locations/LocationFormModal';
import { Location, LocationFormValues, LocationWithDetails } from '@/types/locations';
import { Branch } from '@/types/branches';
import { LocationType } from '@/types/locationTypes';
import { PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useSemesterStore } from '@/stores/useSemesterStore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LocationsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const branchId = searchParams.get('branchId') || '';
  const queryClient = useQueryClient();
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Fetch branches
  const { data: branches = [], isLoading: loadingBranches } = useQuery<Branch[], Error>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  // Default branch filter
  useEffect(() => {
    if (!branchId && !loadingBranches && branches.length) {
      const defaultBranch = branches.find(b => b.name === 'Bilişim Teknolojileri');
      if (defaultBranch) {
        router.replace(`/dashboard/locations?branchId=${defaultBranch.id}`);
      }
    }
  }, [branchId, branches, loadingBranches, router]);

  // Fetch locations
  const { data: locations = [], isLoading: loadingLocations } = useQuery<LocationWithDetails[], Error>({
    queryKey: branchId
      ? ['locations', branchId, selectedSemesterId]
      : ['locations', selectedSemesterId],
    queryFn: () => branchId
      ? fetchLocationsByBranch(branchId, selectedSemesterId ?? undefined)
      : fetchLocations(selectedSemesterId ?? undefined),
    enabled: !!selectedSemesterId,
  });

  // Fetch location types
  const { data: locationTypes = [], isLoading: loadingLocationTypes } = useQuery<LocationType[], Error>({
    queryKey: ['locationTypes'],
    queryFn: fetchLocationTypes,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Konum eklendi!');
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        setIsModalOpen(false);
      } else {
        toast.error(`Ekleme hatası: ${Array.isArray(res.error) ? res.error.map(e => e.message).join(', ') : res.error}`);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LocationFormValues }) => updateLocation(id, payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Konum güncellendi!');
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        setIsModalOpen(false);
      } else {
        toast.error(`Güncelleme hatası: ${Array.isArray(res.error) ? res.error.map(e => e.message).join(', ') : res.error}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Konum silindi!');
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      } else {
        toast.error(`Silme hatası: ${res.error}`);
      }
    },
  });

  // Handlers
  const handleAdd = () => setIsModalOpen(true);
  const handleEdit = (loc: Location) => { setEditingLocation(loc); setIsModalOpen(true); };
  const handleDelete = (id: string) => { if (confirm('Silmek istediğinize emin misiniz?')) deleteMutation.mutate(id); };
  const handleSubmit = (data: LocationFormValues) => {
    const payload = {
      ...data,
      location_type_id: data.location_type_id || null,
    };
    if (editingLocation?.id) updateMutation.mutate({ id: editingLocation.id, payload });
    else createMutation.mutate(payload);
  };

  const isLoading = loadingLocations || loadingBranches || loadingLocationTypes;
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Konum Yönetimi</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/location-types" passHref>
            <Button variant="secondary">
              <TagIcon className="h-5 w-5 mr-2" />
              Lokasyon Tiplerini Yönet
            </Button>
          </Link>
          <Button
            onClick={handleAdd}
            disabled={isLoading || isMutating}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Yeni Konum Ekle
          </Button>
        </div>
      </div>
      {!isLoading && (
        <select value={branchId} onChange={e => router.push(`/dashboard/locations?branchId=${e.target.value}`)} className="border p-1 mb-4 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
          <option value="">Tüm Branşlar</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      {!selectedSemesterId && !isLoading && (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
          Lütfen işlem yapmak için kenar çubuğundan bir sömestr seçin.
        </div>
      )}
      {isLoading ? (
        <p>Yükleniyor...</p>
      ) : selectedSemesterId ? (
        <LocationsTable 
          locations={locations} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
        />
      ) : null}
      {isModalOpen && (
        <LocationFormModal
          initialData={editingLocation ?? undefined}
          availableBranches={branches}
          availableLocationTypes={locationTypes}
          onSubmit={handleSubmit}
          onClose={() => { setIsModalOpen(false); setEditingLocation(null); }}
          isLoading={isMutating}
        />
      )}
    </div>
  );
} 