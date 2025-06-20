'use client';

import { useState } from 'react';
import { z } from 'zod';
import { addIssue } from '@/lib/supabase';
import { getDeviceTypeName, getLocationName } from '@/lib/helpers';
import Swal from 'sweetalert2';

// Form tipini doğrudan form elemanları için kullanacağız
// Bu tip veritabanı etkileşimi için değil, form için kullanılacak
type FormDeviceType = 'akilli_tahta' | 'bilgisayar' | 'yazici' | 'projektor' | 'diger';
type FormDeviceLocation = 'sinif' | 'laboratuvar' | 'idare' | 'ogretmenler_odasi' | 'diger';

// Form verileri için şema
const formSchema = z.object({
  device_type: z.enum(['akilli_tahta', 'bilgisayar', 'yazici', 'projektor', 'diger'] as const),
  device_name: z.string().min(2, 'Cihaz adı en az 2 karakter olmalıdır'),
  device_location: z.enum(['sinif', 'laboratuvar', 'idare', 'ogretmenler_odasi', 'diger'] as const),
  room_number: z.string().min(1, 'Oda numarası girilmelidir'),
  description: z.string().min(10, 'Açıklama en az 10 karakter olmalıdır'),
});

// Form alanları için tip
type FormData = z.infer<typeof formSchema>;

interface AddIssueFormProps {
  onSuccess: () => void;
  onCancel: (e?: React.MouseEvent) => void;
  teacherName: string;
}

// Cihaz türleri için seçenekler
const deviceTypes = [
  { value: 'akilli_tahta', label: 'Akıllı Tahta' },
  { value: 'bilgisayar', label: 'Bilgisayar' },
  { value: 'yazici', label: 'Yazıcı' },
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

export default function AddIssueForm({ onSuccess, onCancel, teacherName }: AddIssueFormProps) {
  const [formData, setFormData] = useState<FormData>({
    device_type: 'akilli_tahta',
    device_name: '',
    device_location: 'sinif',
    room_number: '',
    description: '',
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
      
      // TypeScript'in any kullanımı burada bilerek yapılıyor
      // Tip çakışmalarını önlemek için
      const issueData: any = {
        ...formData,
        reported_by: teacherName,
        status: 'beklemede',
        priority: 'normal',
      };
      
      await addIssue(issueData)
        .then(({ error, data }) => {
          if (error) throw error;
          
          // Bildirim ve başarı işlemleri
          Swal.fire({
            title: 'Başarılı!',
            text: 'Arıza bildirimi kaydedildi.',
            icon: 'success',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#3085d6'
          });
          
          // Başarı bildirimini çağır
          onSuccess();
        })
        .catch((error) => {
          console.error('Arıza eklenirken hata oluştu:', error);
          Swal.fire({
            title: 'Hata!',
            text: 'Arıza eklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
            icon: 'error',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#3085d6'
          });
          setSubmitError('Arıza eklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } catch (error) {
      console.error('Arıza eklenirken hata oluştu:', error);
      Swal.fire({
        title: 'Hata!',
        text: 'Arıza eklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        icon: 'error',
        confirmButtonText: 'Tamam',
        confirmButtonColor: '#3085d6'
      });
      setSubmitError('Arıza eklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
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
          {isLoading ? 'Gönderiliyor...' : 'Arıza Bildir'}
        </button>
      </div>
    </form>
  );
} 