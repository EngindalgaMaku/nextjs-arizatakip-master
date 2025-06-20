'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSemesters, createSemester, updateSemester, deleteSemester, setActiveSemester } from '@/actions/semesterActions';
import { Semester, SemesterFormValues } from '@/types/semesters';
import { SemestersTable } from '@/components/semesters/SemestersTable';
import { SemesterFormModal } from '@/components/semesters/SemesterFormModal';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Users, BookOpen, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import * as z from 'zod';
import { SemesterAssociationManager } from '@/components/semesters/SemesterAssociationManager';

export default function SemestersClient() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

  // Fetch Semesters
  const { data: semesters = [], isLoading, error } = useQuery<Semester[], Error>({
    queryKey: ['semesters'],
    queryFn: fetchSemesters,
  });

  // --- Mutations ---
  const commonMutationOptions = {
    onSuccess: (data: { success: boolean; error?: string | z.ZodIssue[] }) => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      if (data.success) {
        // Specific success messages handled below
        setIsModalOpen(false);
        setEditingSemester(null);
      } else {
        const errorMessage = typeof data.error === 'string' ? data.error : (data.error as z.ZodIssue[]).map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        toast.error(`İşlem başarısız: ${errorMessage}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Bir hata oluştu: ${err.message}`);
    },
  };

  const createMutation = useMutation({
    mutationFn: createSemester,
    ...commonMutationOptions,
    onSuccess: (data) => {
      commonMutationOptions.onSuccess(data);
      if (data.success) toast.success('Sömestr başarıyla eklendi!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; payload: SemesterFormValues }) => updateSemester(vars.id, vars.payload),
    ...commonMutationOptions,
    onSuccess: (data) => {
       commonMutationOptions.onSuccess(data);
      if (data.success) toast.success('Sömestr başarıyla güncellendi!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSemester,
    ...commonMutationOptions,
     onSuccess: (data) => {
       // No need to call common onSuccess as modal isn't involved
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      if (data.success) {
          toast.success('Sömestr başarıyla silindi!');
       } else {
          toast.error(`Sömestr silinemedi: ${data.error}`);
       }
    }
  });

  const setActiveMutation = useMutation({
      mutationFn: setActiveSemester,
      ...commonMutationOptions,
      onSuccess: (data) => {
           // No need to call common onSuccess as modal isn't involved
            queryClient.invalidateQueries({ queryKey: ['semesters'] });
            if (data.success) {
                toast.success('Aktif sömestr başarıyla ayarlandı!');
            } else {
                toast.error(`Aktif sömestr ayarlanamadı: ${data.error}`);
            }
      }
  });

  // --- Handlers ---
  const handleAdd = () => {
    setEditingSemester(null);
    setIsModalOpen(true);
  };

  const handleEdit = (semester: Semester) => {
    setEditingSemester(semester);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu sömestri silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSetActive = (id: string) => {
     if (window.confirm('Bu sömestri aktif olarak ayarlamak istediğinizden emin misiniz? Diğerleri pasif hale getirilecektir.')) {
      setActiveMutation.mutate(id);
    }
  };

  const handleFormSubmit = (data: SemesterFormValues) => {
    if (editingSemester?.id) {
      updateMutation.mutate({ id: editingSemester.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSelectSemester = (id: string) => {
    setSelectedSemesterId(id);
  };

  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || setActiveMutation.isPending;

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Sömestr Yönetimi</h1>
        <Button onClick={handleAdd} disabled={isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Yeni Sömestr Ekle
        </Button>
      </div>

      {isLoading && <div className="text-center p-6">Yükleniyor...</div>}
      {error && <div className="text-red-500 p-4 bg-red-100 border border-red-400 rounded mb-4">Sömestrler yüklenirken hata oluştu: {error.message}</div>}

      {!isLoading && !error && (
        <>
          <Tabs defaultValue="semesters" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="semesters">Sömestrler</TabsTrigger>
              <TabsTrigger value="teachers" disabled={!selectedSemesterId}>
                <Users className="h-4 w-4 mr-2" />
                Öğretmen Atamaları
              </TabsTrigger>
              <TabsTrigger value="classes" disabled={!selectedSemesterId}>
                <BookOpen className="h-4 w-4 mr-2" />
                Sınıf Atamaları
              </TabsTrigger>
              <TabsTrigger value="locations" disabled={!selectedSemesterId}>
                <MapPin className="h-4 w-4 mr-2" />
                Konum Atamaları
              </TabsTrigger>
            </TabsList>

            <TabsContent value="semesters">
              <SemestersTable
                semesters={semesters}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetActive={handleSetActive}
                onSelect={handleSelectSemester}
                selectedSemesterId={selectedSemesterId}
                isLoading={mutationLoading}
              />
            </TabsContent>

            <TabsContent value="teachers">
              {selectedSemesterId ? (
                <SemesterAssociationManager 
                  semesterId={selectedSemesterId}
                  type="teachers"
                  semesterName={semesters.find(s => s.id === selectedSemesterId)?.name || ''}
                />
              ) : (
                <div className="text-center p-6 bg-yellow-50 border border-yellow-300 rounded-md">
                  Lütfen önce bir sömestr seçin
                </div>
              )}
            </TabsContent>

            <TabsContent value="classes">
              {selectedSemesterId ? (
                <SemesterAssociationManager 
                  semesterId={selectedSemesterId}
                  type="classes"
                  semesterName={semesters.find(s => s.id === selectedSemesterId)?.name || ''}
                />
              ) : (
                <div className="text-center p-6 bg-yellow-50 border border-yellow-300 rounded-md">
                  Lütfen önce bir sömestr seçin
                </div>
              )}
            </TabsContent>

            <TabsContent value="locations">
              {selectedSemesterId ? (
                <SemesterAssociationManager 
                  semesterId={selectedSemesterId}
                  type="locations"
                  semesterName={semesters.find(s => s.id === selectedSemesterId)?.name || ''}
                />
              ) : (
                <div className="text-center p-6 bg-yellow-50 border border-yellow-300 rounded-md">
                  Lütfen önce bir sömestr seçin
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {isModalOpen && (
        <SemesterFormModal
          initialData={editingSemester ?? undefined}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSemester(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
} 