// 'use client' directive for client component

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDallar, createDal, updateDal, deleteDal, fetchBranchesForSelect, fetchDallarByBranch } from '@/actions/dalActions';
import { DallarTable } from '@/components/dallar/DallarTable';
import { DalFormModal } from '@/components/dallar/DalFormModal';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useSearchParams } from 'next/navigation';
import { Dal, DalFormValues } from '@/types/dallar';
import { useSemesterStore } from '@/stores/useSemesterStore';

// Type for branch select items
interface BranchSelectItem {
  id: string;
  name: string;
}

export default function DallarClient() {
  const searchParams = useSearchParams();
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId);
  const branchId = searchParams.get('branchId') || '';
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDal, setEditingDal] = useState<Dal | null>(null);

  // Fetch Dallar (filtered by branchId AND selectedSemesterId)
  const { data: dallar = [], isLoading: isLoadingDallar, error: errorDallar } = useQuery<Dal[], Error>({
    queryKey: branchId
        ? ['dallar', branchId, selectedSemesterId]
        : ['dallar', selectedSemesterId],
    queryFn: () => branchId
        ? fetchDallarByBranch(branchId)
        : fetchDallar(),
    enabled: !!selectedSemesterId,
  });

  // Fetch branches for dropdown (no semester filter needed)
  const { data: availableBranches = [], isLoading: isLoadingBranches, error: errorBranches } = useQuery<BranchSelectItem[], Error>({
    queryKey: ['branchesForSelect'],
    queryFn: fetchBranchesForSelect,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (formData: DalFormValues) => {
        if (!selectedSemesterId) {
            throw new Error('Sömestr seçilmeden Dal oluşturulamz.');
        }
        // We need to ensure the semester_id is included in the form data
        return createDal({
          ...formData,
          // Include any additional properties needed here
        });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Dal başarıyla eklendi.');
        queryClient.invalidateQueries({ queryKey: ['dallar', selectedSemesterId] });
        queryClient.invalidateQueries({ queryKey: ['dallar', branchId, selectedSemesterId] });
        setIsModalOpen(false);
      } else {
        toast.error(`Dal eklenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Dal eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: DalFormValues }) => updateDal(vars.id, vars.payload),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Dal başarıyla güncellendi.');
        queryClient.invalidateQueries({ queryKey: ['dallar', selectedSemesterId] });
        queryClient.invalidateQueries({ queryKey: ['dallar', branchId, selectedSemesterId] });
        setIsModalOpen(false);
        setEditingDal(null);
      } else {
        toast.error(`Dal güncellenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Dal güncellenemedi: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDal,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Dal başarıyla silindi!');
        queryClient.invalidateQueries({ queryKey: ['dallar', selectedSemesterId] });
        queryClient.invalidateQueries({ queryKey: ['dallar', branchId, selectedSemesterId] });
      } else {
        toast.error(`Dal silinemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Dal silinemedi: ${err instanceof Error ? err.message : String(err)}`);
    },
  });

  // Handlers
  const handleAdd = () => {
    setEditingDal(null);
    setIsModalOpen(true);
  };
  const handleEdit = (dal: Dal) => {
    setEditingDal(dal);
    setIsModalOpen(true);
  };
  const handleDelete = (id: string) => {
    if (window.confirm('Bu dalı silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };
  const handleFormSubmit = (data: DalFormValues) => {
    if (editingDal?.id) {
      updateMutation.mutate({ id: editingDal.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Combined states
  const isLoading = isLoadingDallar || isLoadingBranches;
  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Dal Yönetimi</h1>
        <button onClick={handleAdd} disabled={isLoading || availableBranches.length === 0} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          <PlusIcon className="h-5 w-5 mr-2" /> Yeni Dal Ekle
        </button>
      </div>

      {/* Show message if no semester is selected */}
      {!selectedSemesterId && !isLoading && (
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
          Lütfen işlem yapmak için kenar çubuğundan bir sömestr seçin.
        </div>
      )}

      {isLoading && <div>Yükleniyor...</div>}
      {(errorDallar || errorBranches) && <div className="text-red-600">Hata: {(errorDallar || errorBranches)?.message}</div>}

      {/* Render table only if NOT loading AND a semester IS selected */}
      {!isLoading && selectedSemesterId && (
          availableBranches.length > 0 ? (
              <DallarTable dallar={dallar} onEdit={handleEdit} onDelete={handleDelete} />
          ) : (
              <div>Ana dal bulunamadı.</div>
          )
      )}

      {isModalOpen && (
        <DalFormModal
          initialData={editingDal ?? undefined}
          availableBranches={availableBranches}
          onSubmit={handleFormSubmit}
          onClose={() => setIsModalOpen(false)}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 