'use client';

import React, { useState } from 'react';
import { supabase, Issue as SupabaseIssue, updateIssue } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { z } from 'zod';

// Form alanları türü
type FormData = {
  device_type: string;
  device_name: string;
  device_location: string;
  room_number: string;
  description: string;
};

// Form doğrulama şeması
const formSchema = z.object({
  device_type: z.string().min(1, 'Cihaz türü seçilmelidir'),
  device_name: z.string().min(1, 'Cihaz adı boş bırakılamaz'),
  device_location: z.string().min(1, 'Cihaz konumu seçilmelidir'),
  room_number: z.string().min(1, 'Oda numarası boş bırakılamaz'),
  description: z.string().min(10, 'Açıklama en az 10 karakter olmalıdır'),
});

// Issue interface
interface Issue extends Omit<SupabaseIssue, 'created_at' | 'updated_at' | 'resolved_at'> {
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

interface TeacherEditFormProps {
  issue: Issue;
  onSuccess: () => void;
  onCancel: () => void;
}

// Cihaz türleri için seçenekler
const deviceTypes = [
  { value: 'akilli_tahta', label: 'Akıllı Tahta' },
  { value: 'bilgisayar', label: 'Bilgisayar' },
  { value: 'yazici', label: 'Yazıcı' },
  { value: 'projektor', label: 'Projektör' },
  { value: 'diger', label: 'Diğer' }
];

// Cihaz konumları için seçenekler
const deviceLocations = [
  { value: 'sinif', label: 'Sınıf' },
  { value: 'laboratuvar', label: 'Laboratuvar' },
  { value: 'idare', label: 'İdare' },
  { value: 'ogretmenler_odasi', label: 'Öğretmenler Odası' },
  { value: 'diger', label: 'Diğer' }
];

export default function TeacherEditForm({ issue, onSuccess, onCancel }: TeacherEditFormProps) {
  const [formData, setFormData] = useState<FormData>({
    device_type: issue.device_type || 'akilli_tahta',
    device_name: issue.device_name || '',
    device_location: issue.device_location || 'sinif',
    room_number: issue.room_number || '',
    description: issue.description || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    try {
      formSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Anlık doğrulama için alan boşken veya dolu olduğunda kontrol et
    if (value === '' || (name === 'description' && value.length < 10)) {
      setErrors((prev) => ({
        ...prev,
        [name]: value === '' ? 'Bu alan boş bırakılamaz' : 'Açıklama en az 10 karakter olmalıdır',
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Güncellenecek verileri hazırla
      const updateData = {
        device_type: formData.device_type as any,
        device_name: formData.device_name,
        device_location: formData.device_location as any,
        room_number: formData.room_number,
        description: formData.description,
        // Öğretmen sadece beklemede durumundaki arızaları düzenleyebilir
        // Bu nedenle diğer alanları (status, priority vb.) karıştırmıyoruz
      };
      
      // Supabase üzerinden güncelleme yap
      const result = await updateIssue(issue.id, updateData);
      
      if (result.error) {
        throw result.error;
      }
      
      // Başarı mesajı göster
      Swal.fire({
        title: 'Başarılı!',
        text: 'Arıza bilgileri başarıyla güncellendi.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      
      // Başarı bildirimini çağır
      onSuccess();
    } catch (error) {
      console.error('Arıza güncellenirken hata oluştu:', error);
      Swal.fire({
        title: 'Hata!',
        text: 'Arıza güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        icon: 'error',
        confirmButtonText: 'Tamam',
        confirmButtonColor: '#3085d6'
      });
      setSubmitError('Arıza güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{submitError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
        <div>
          <label htmlFor="device_type" className="block text-sm font-medium text-gray-700">
            Cihaz Türü <span className="text-red-500">*</span>
          </label>
          <select
            id="device_type"
            name="device_type"
            className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.device_type ? 'border-red-300' : 'border-gray-300'
            }`}
            value={formData.device_type}
            onChange={handleInputChange}
          >
            {deviceTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          {errors.device_type && (
            <p className="mt-2 text-sm text-red-600">{errors.device_type}</p>
          )}
        </div>

        <div>
          <label htmlFor="device_name" className="block text-sm font-medium text-gray-700">
            Cihaz Adı <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="device_name"
            name="device_name"
            placeholder="Ör: 10A Akıllı Tahtası"
            className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.device_name ? 'border-red-300' : 'border-gray-300'
            }`}
            value={formData.device_name}
            onChange={handleInputChange}
          />
          {errors.device_name && (
            <p className="mt-2 text-sm text-red-600">{errors.device_name}</p>
          )}
        </div>

        <div>
          <label htmlFor="device_location" className="block text-sm font-medium text-gray-700">
            Konum <span className="text-red-500">*</span>
          </label>
          <select
            id="device_location"
            name="device_location"
            className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.device_location ? 'border-red-300' : 'border-gray-300'
            }`}
            value={formData.device_location}
            onChange={handleInputChange}
          >
            {deviceLocations.map(location => (
              <option key={location.value} value={location.value}>{location.label}</option>
            ))}
          </select>
          {errors.device_location && (
            <p className="mt-2 text-sm text-red-600">{errors.device_location}</p>
          )}
        </div>

        <div>
          <label htmlFor="room_number" className="block text-sm font-medium text-gray-700">
            Oda/Sınıf Numarası <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="room_number"
            name="room_number"
            placeholder="Örn: A-101, Fen Lab, Müdür Odası"
            className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.room_number ? 'border-red-300' : 'border-gray-300'
            }`}
            value={formData.room_number}
            onChange={handleInputChange}
          />
          {errors.room_number && (
            <p className="mt-2 text-sm text-red-600">{errors.room_number}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Arıza Açıklaması <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          placeholder="Arızanın detaylı açıklamasını giriniz. Örn: Cihaz açılmıyor, ekranda görüntü yok, kağıt sıkışması var vb."
          className={`mt-1 block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            errors.description ? 'border-red-300' : 'border-gray-300'
          }`}
          value={formData.description}
          onChange={handleInputChange}
        />
        {errors.description && (
          <p className="mt-2 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Güncelleniyor...' : 'Güncelle'}
        </button>
      </div>
    </form>
  );
} 