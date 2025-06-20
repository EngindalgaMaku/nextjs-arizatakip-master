'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBranch } from '@/actions/branchActions';
import { BranchFormData } from '@/types/branches';
import { BranchForm } from '@/components/branches/BranchForm';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewBranchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation<any, Error, BranchFormData>({
    mutationFn: createBranch,
    onSuccess: () => {
      toast.success('Branş başarıyla oluşturuldu!');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      router.push('/dashboard/branches');
    },
    onError: (error) => {
      toast.error(`Branş oluşturulurken hata: ${error.message}`);
    },
  });

  const handleSubmit = async (data: BranchFormData) => {
    createMutation.mutate(data);
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
          <h1 className="text-2xl font-semibold">Yeni Branş Ekle</h1>
        </div>
        <div className="max-w-xl mx-auto p-6 md:p-8 bg-background shadow-md rounded-lg border">
          <BranchForm 
            onSubmit={handleSubmit} 
            isPending={createMutation.isPending} 
            submitButtonText="Oluştur"
          />
        </div>
      </div>
    </DashboardLayout>
  );
} 