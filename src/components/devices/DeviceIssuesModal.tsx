import React, { useState } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Device, Issue } from '@/types/devices';
import { updateIssueInDevice, deleteIssueFromDevice } from '@/actions/deviceActions';

interface DeviceIssuesModalProps {
  device: Device | null;
  onClose: () => void;
}

export default function DeviceIssuesModal({ device, onClose }: DeviceIssuesModalProps) {
  if (!device || !device.issues || device.issues.length === 0) {
    return null;
  }

  // Local state for editing evaluation and deletion
  const [localIssues, setLocalIssues] = useState<Issue[]>(device.issues);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [evalInput, setEvalInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingIndex, setIsDeletingIndex] = useState<number | null>(null);

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setEvalInput(localIssues[index].evaluation || '');
  };

  const handleSave = async () => {
    if (editingIndex === null) return;
    setIsSaving(true);
    const result = await updateIssueInDevice(device.id, editingIndex, evalInput);
    setIsSaving(false);
    if (result.success && result.device?.issues) {
      setLocalIssues(result.device.issues);
      setEditingIndex(null);
    } else {
      console.error('Error saving evaluation:', result.error);
    }
  };

  const handleDelete = async (index: number) => {
    if (!device) return;
    setIsDeletingIndex(index);
    const result = await deleteIssueFromDevice(device.id, index);
    setIsDeletingIndex(null);
    if (result.success && result.device?.issues) {
      setLocalIssues(result.device.issues);
    } else {
      console.error('Error deleting issue:', result.error);
    }
  };

  // Reverse order: newest first
  const issuesWithIndex = localIssues.map((issue, idx) => ({ issue, idx })).reverse();

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
          <span className="sr-only">Kapat</span>
        </button>

        <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2 text-center">
          Arıza Kayıtları - {device.name}
        </h2>

        <div className="max-h-80 overflow-y-auto pr-2">
          <div className="space-y-3 text-sm">
            {issuesWithIndex.map(({ issue, idx }, displayIdx) => (
              <div key={idx} className="border-t pt-2 space-y-1">
                <p><span className="font-semibold">Raporlayan:</span> {issue.reported_by}</p>
                <p><span className="font-semibold">Açıklama:</span> {issue.description}</p>
                <p><span className="font-semibold">Tarih:</span> {issue.date}</p>
                {editingIndex === idx ? (
                  <div>
                    <label htmlFor={`eval-${idx}`} className="block text-sm font-medium text-gray-700">Değerlendirme</label>
                    <textarea
                      id={`eval-${idx}`}
                      rows={2}
                      value={evalInput}
                      onChange={e => setEvalInput(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !evalInput.trim()}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md disabled:opacity-50"
                      >
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        disabled={isSaving}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p><span className="font-semibold">Değerlendirme:</span> {issue.evaluation || <span className="italic text-gray-500">Henüz değerlendirme yapılmadı</span>}</p>
                    <button
                      onClick={() => handleEditClick(idx)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      Değerlendir
                    </button>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDelete(idx)}
                    disabled={isDeletingIndex === idx}
                    title="Arıza Kaydını Sil"
                    className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 sm:mt-6">
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
            onClick={onClose}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
} 