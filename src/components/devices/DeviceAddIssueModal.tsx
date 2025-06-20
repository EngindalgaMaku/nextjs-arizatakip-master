import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Device, Issue } from '@/types/devices';
import { addIssueToDevice } from '@/actions/deviceActions';

interface DeviceAddIssueModalProps {
  device: Device;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeviceAddIssueModal({ device, onClose, onSuccess }: DeviceAddIssueModalProps) {
  const [reportedBy, setReportedBy] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const issue: Issue = { reported_by: reportedBy, description, date, evaluation: '' };
    const result = await addIssueToDevice(device.id, issue);
    setIsSubmitting(false);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Arıza kaydı eklenirken bir hata oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-6 w-6" />
          <span className="sr-only">Kapat</span>
        </button>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Yeni Arıza Kaydı - {device.name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label htmlFor="reportedBy" className="block text-sm font-medium text-gray-700">Bildirilen</label>
            <input id="reportedBy" type="text" value={reportedBy}
              onChange={e => setReportedBy(e.target.value)} required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama</label>
            <textarea id="description" rows={3} value={description}
              onChange={e => setDescription(e.target.value)} required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tarih</label>
            <input id="date" type="date" value={date}
              onChange={e => setDate(e.target.value)} required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              İptal
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 