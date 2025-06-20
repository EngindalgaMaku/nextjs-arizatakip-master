'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBusinessById, updateBusiness } from '@/actions/businessActions';
import { Business, BusinessFormValues } from '@/types/businesses';
import { BusinessForm } from '@/components/businesses/BusinessForm';
import { toast } from 'react-toastify';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.businessId as string;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    data: business, 
    isLoading: isLoadingBusiness, 
    error: fetchError,
    isError,
  } = useQuery<Business | null, Error>({
    queryKey: ['business', businessId],
    queryFn: () => fetchBusinessById(businessId),
    enabled: !!businessId, // Only run query if businessId is available
  });

  const mutation = useMutation({
    mutationFn: (payload: BusinessFormValues) => updateBusiness(businessId, payload),
    onSuccess: (result) => {
      setIsSubmitting(false);
      if (result.success && result.business) {
        toast.success(`'${result.business.name}' adlı işletme başarıyla güncellendi.`);
        queryClient.invalidateQueries({ queryKey: ['businesses'] });
        queryClient.invalidateQueries({ queryKey: ['business', businessId] });
        router.push('/dashboard/businesses');
      } else {
        let errorMessage = 'İşletme güncellenemedi.';
        if (typeof result.error === 'string') {
          errorMessage = result.error;
        } else if (Array.isArray(result.error)) {
          errorMessage = result.error[0]?.message || errorMessage;
        }
        toast.error(errorMessage);
        console.error('Business update failed:', result.error);
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(`Bir hata oluştu: ${error.message}`);
      console.error('Business update error:', error);
    },
  });

  const handleSubmit = async (data: BusinessFormValues) => {
    setIsSubmitting(true);
    console.log("Form data to be submitted for update:", data);
    mutation.mutate(data);
  };

  const handleCancel = () => {
    router.push('/dashboard/businesses');
  };

  if (isLoadingBusiness) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-center">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-3 text-gray-700">İşletme bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="container mx-auto p-4 md:p-6">
         <div className="mb-6">
          <Link href="/dashboard/businesses" className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            İşletme Listesine Dön
          </Link>
        </div>
        <div className="text-center py-10 bg-white shadow rounded-md">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">İşletme Bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {fetchError ? fetchError.message : 'Aradığınız işletme mevcut değil veya yüklenirken bir sorun oluştu.'}
          </p>
        </div>
      </div>
    );
  }
  
  // Prepare initial data for the form, ensuring all fields from BusinessFormValues are present
  // This is important because BusinessForm expects all fields, even if optional
  const initialFormValues: Partial<BusinessFormValues> = {
    name: business.name || '',
    contactPerson: business.contactPerson || '',
    contactPhone: business.contactPhone || '',
    address: business.address || '',
    industry: business.industry || '',
    businessType: business.businessType, // This should be a valid BusinessType or undefined
    notes: business.notes || '',
    semesterId: business.semesterId, // This should be a valid UUID string or undefined
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Link href="/dashboard/businesses" className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          İşletme Listesine Dön
        </Link>
      </div>
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">
        İşletmeyi Düzenle: <span className="text-indigo-600">{business.name}</span>
      </h1>
      <BusinessForm
        initialData={initialFormValues} // Pass the fetched and prepared data
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
        submitButtonText="Güncelle"
      />
    </div>
  );
} 