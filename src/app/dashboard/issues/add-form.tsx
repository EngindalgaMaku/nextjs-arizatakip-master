'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  DeviceType, 
  DeviceLocation, 
  IssueStatus, 
  IssuePriority 
} from '@/lib/supabase';
import {
  getDeviceTypeName,
  getLocationName,
  getStatusName,
  getPriorityName
} from '@/lib/helpers';
import Swal from 'sweetalert2';

// Constants for device types and locations
const deviceTypes = [
  { value: 'akilli_tahta', label: 'Akıllı Tahta' },
  { value: 'bilgisayar', label: 'Bilgisayar' },
  { value: 'yazici', label: 'Yazıcı' },
  { value: 'diger', label: 'Diğer' }
];

const deviceLocations = [
  { value: 'sinif', label: 'Sınıf' },
  { value: 'laboratuvar', label: 'Laboratuvar' },
  { value: 'idare', label: 'İdare' },
  { value: 'ogretmenler_odasi', label: 'Öğretmenler Odası' },
  { value: 'diger', label: 'Diğer' }
];

// Constants for priority and status options
const priorityOptions = [
  { value: 'dusuk', label: 'Düşük' },
  { value: 'normal', label: 'Normal' },
  { value: 'yuksek', label: 'Yüksek' },
  { value: 'kritik', label: 'Kritik' }
];

const statusOptions = [
  { value: 'beklemede', label: 'Beklemede' },
  { value: 'atandi', label: 'Atandı' },
  { value: 'inceleniyor', label: 'İnceleniyor' },
  { value: 'cozuldu', label: 'Çözüldü' },
  { value: 'kapatildi', label: 'Kapatıldı' }
];

interface AddIssueFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddIssueForm({ onClose, onSuccess }: AddIssueFormProps) {
  const [formData, setFormData] = useState({
    device_name: '',
    description: '',
    device_type: 'akilli_tahta' as DeviceType,
    device_location: 'sinif' as DeviceLocation,
    priority: 'normal' as IssuePriority,
    status: 'beklemede' as IssueStatus,
    reported_by: '',
    assigned_to: '',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user changes it
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.device_name.trim()) {
      errors.device_name = 'Cihaz adı zorunludur';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Arıza açıklaması zorunludur';
    }
    
    if (!formData.reported_by.trim()) {
      errors.reported_by = 'Bildiren kişi bilgisi zorunludur';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Prepare data for insertion
      const issueData = {
        ...formData,
        // Convert empty strings to null for optional fields
        device_type: formData.device_type || null,
        device_location: formData.device_location || null,
        assigned_to: formData.assigned_to || null,
        notes: formData.notes || null
      };
      
      // Insert data into Supabase
      const { error } = await supabase
        .from('issues')
        .insert([issueData]);
      
      if (error) {
        throw error;
      }
      
      // Show success message
      Swal.fire({
        title: 'Başarılı!',
        text: 'Arıza kaydedildi.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      
      // Call success callback
      onSuccess();
      
      // Close the modal
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
        Swal.fire({
          title: 'Hata!',
          text: error.message,
          icon: 'error',
          confirmButtonText: 'Tamam'
        });
      } else {
        setSubmitError('Arıza kaydı oluşturulurken bir hata oluştu.');
        Swal.fire({
          title: 'Hata!',
          text: 'Arıza kaydı oluşturulurken bir hata oluştu.',
          icon: 'error',
          confirmButtonText: 'Tamam'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Yeni Arıza Kaydı</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {submitError && (
        <div className="mb-4 bg-red-100 text-red-800 border border-red-300 px-4 py-3 rounded relative">
          {submitError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="device_name" className="block mb-1 font-medium text-gray-700">
              Cihaz Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="device_name"
              name="device_name"
              value={formData.device_name}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md ${formErrors.device_name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Cihaz adını girin. Ör: 10A Akıllı tahta"
            />
            {formErrors.device_name && (
              <p className="mt-1 text-sm text-red-500">{formErrors.device_name}</p>
            )}
          </div>
          
          {/* Description */}
          <div>
            <label htmlFor="description" className="block mb-1 font-medium text-gray-700">
              Arıza Açıklaması <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`w-full p-2 border rounded-md ${formErrors.description ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Arıza detaylarını girin"
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-500">{formErrors.description}</p>
            )}
          </div>
          
          {/* Device Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="device_type" className="block mb-1 font-medium text-gray-700">
                Cihaz Türü
              </label>
              <select
                id="device_type"
                name="device_type"
                value={formData.device_type}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Seçiniz</option>
                {deviceTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="device_location" className="block mb-1 font-medium text-gray-700">
                Cihaz Konumu
              </label>
              <select
                id="device_location"
                name="device_location"
                value={formData.device_location}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Seçiniz</option>
                {deviceLocations.map(location => (
                  <option key={location.value} value={location.value}>{location.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block mb-1 font-medium text-gray-700">
                Öncelik
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="status" className="block mb-1 font-medium text-gray-700">
                Durum
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Reporter and Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reported_by" className="block mb-1 font-medium text-gray-700">
                Bildiren Kişi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="reported_by"
                name="reported_by"
                value={formData.reported_by}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${formErrors.reported_by ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Bildiren kişinin adını girin"
              />
              {formErrors.reported_by && (
                <p className="mt-1 text-sm text-red-500">{formErrors.reported_by}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="assigned_to" className="block mb-1 font-medium text-gray-700">
                Atanan Kişi
              </label>
              <input
                type="text"
                id="assigned_to"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Atanan kişinin adını girin (opsiyonel)"
              />
            </div>
          </div>
          
          {/* Resolution */}
          <div>
            <label htmlFor="notes" className="block mb-1 font-medium text-gray-700">
              Notlar
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Ek notları girin (opsiyonel)"
            />
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 