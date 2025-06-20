'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBusiness } from '@/actions/businessActions';
import { BusinessFormValues } from '@/types/businesses';
import { BusinessForm } from '@/components/businesses/BusinessForm';
import { toast } from 'react-toastify';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function NewBusinessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: createBusiness,
    onSuccess: (result) => {
      setIsSubmitting(false);
      if (result.success && result.business) {
        toast.success(`'${result.business.name}' adlı işletme başarıyla oluşturuldu.`);
        queryClient.invalidateQueries({ queryKey: ['businesses'] });
        router.push('/dashboard/businesses');
      } else {
        let errorMessage = 'İşletme oluşturulamadı.';
        if (typeof result.error === 'string') {
          errorMessage = result.error;
        } else if (Array.isArray(result.error)) {
          // Handle Zod issues array (taking the first one for simplicity)
          errorMessage = result.error[0]?.message || errorMessage;
        }
        toast.error(errorMessage);
        console.error('Business creation failed:', result.error);
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(`Bir hata oluştu: ${error.message}`);
      console.error('Business creation error:', error);
    },
  });

  const handleSubmit = async (data: BusinessFormValues) => {
    setIsSubmitting(true);
    console.log("Form data to be submitted for creation:", data);
    mutation.mutate(data);
  };

  const handleCancel = () => {
    router.push('/dashboard/businesses');
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Link href="/dashboard/businesses" className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          İşletme Listesine Dön
        </Link>
      </div>
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">Yeni İşletme Ekle</h1>
      <BusinessForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
        submitButtonText="Oluştur"
      />
    </div>
  );
} 