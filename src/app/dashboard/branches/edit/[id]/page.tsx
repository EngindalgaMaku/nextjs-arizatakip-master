'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBranchById, updateBranch } from '@/actions/branchActions';
import { Branch, BranchFormData } from '@/types/branches';
import { BranchForm } from '@/components/branches/BranchForm';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();

  const branchId = typeof params.id === 'string' ? params.id : undefined;

  const { data: branch, isLoading: isLoadingBranch, error: fetchError } = useQuery<Branch | null, Error>({
    queryKey: ['branch', branchId],
    queryFn: () => branchId ? fetchBranchById(branchId) : Promise.resolve(null),
    enabled: !!branchId, // Sadece branchId varsa sorguyu çalıştır
  });

  const updateMutation = useMutation<Branch, Error, BranchFormData>({
    mutationFn: (formData) => {
      if (!branchId) throw new Error('Branş ID bulunamadı.');
      return updateBranch(branchId, formData);
    },
    onSuccess: (updatedBranch) => {
      toast.success('Branş başarıyla güncellendi!');
      queryClient.invalidateQueries({ queryKey: ['branches'] }); // Listeyi yenile
      queryClient.invalidateQueries({ queryKey: ['branch', updatedBranch.id] }); // Bu kaydı yenile
      router.push('/dashboard/branches');
    },
    onError: (error) => {
      toast.error(`Branş güncellenirken hata: ${error.message}`);
    },
  });

  const handleSubmit = async (data: BranchFormData) => {
    updateMutation.mutate(data);
  };

  if (!branchId) {
    return (
      <DashboardLayout>
        <div className="p-4 text-red-500">Geçersiz Branş ID.</div>
      </DashboardLayout>
    );
  }

  if (isLoadingBranch) return <DashboardLayout><div className="p-4">Yükleniyor...</div></DashboardLayout>;
  if (fetchError) return <DashboardLayout><div className="p-4 text-red-500">Branş yüklenirken hata: {fetchError.message}</div></DashboardLayout>;
  if (!branch) return <DashboardLayout><div className="p-4 text-red-500">Branş bulunamadı.</div></DashboardLayout>;

  // initialData için BranchFormData'ya uygun hale getir
  const initialFormData: BranchFormData = {
    name: branch.name,
    code: branch.code || '',
    description: branch.description || '',
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex items-center mb-6">
          <Link href="/dashboard/branches" passHref>
            <Button variant="outline" size="sm" className="mr-3">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Branş Düzenle: {branch.name}</h1>
        </div>
        <div className="max-w-xl mx-auto p-6 md:p-8 bg-background shadow-md rounded-lg border">
          <BranchForm 
            onSubmit={handleSubmit} 
            initialData={initialFormData} 
            isPending={updateMutation.isPending} 
            submitButtonText="Güncelle"
          />
        </div>
      </div>
    </DashboardLayout>
  );
} 