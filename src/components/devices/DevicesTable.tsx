'use client';

import React from 'react';
import { Device } from '@/types/devices'; // Use the base Device type
import { getDeviceTypeLabel } from '@/types/devices'; // Helper to get type label
import { PencilIcon, TrashIcon, QrCodeIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline'; // Add arrow, issue, and plus icons

interface DevicesTableProps {
  devices: Device[]; // Use Device type
  onEdit: (device: Device) => void; // Pass Device type
  onDelete: (deviceId: string) => void;
  onViewQrCode: (device: Device) => void; // Add handler for viewing QR code
  onViewProperties?: (device: Device) => void; // Optional: Add handler for viewing properties
  onViewIssues?: (device: Device) => void; // Optional: Add handler for viewing issues
  onAddIssue?: (device: Device) => void; // Optional: Add handler for adding issues
  onMove?: (deviceId: string, direction: 'up' | 'down') => void; // Add handler for moving devices
  isLoading?: boolean; // Loading state for actions
}

export default function DevicesTable({
  devices,
  onEdit,
  onDelete,
  onViewQrCode,
  onViewProperties,
  onViewIssues,
  onAddIssue,
  onMove,
  isLoading = false,
}: DevicesTableProps) {
  if (!devices || devices.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Henüz cihaz eklenmemiş.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
              Cihaz Adı
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Tipi
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Konumu
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Durum
            </th>
            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
              Özellikler
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Eylemler</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {devices.map((device, index) => (
            <tr key={device.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                {onMove && (
                  <div className="inline-flex flex-col mr-2 align-middle">
                    <button
                      type="button"
                      onClick={() => onMove(device.id, 'up')}
                      disabled={index === 0 || isLoading}
                      className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="Yukarı Taşı"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(device.id, 'down')}
                      disabled={index === devices.length - 1 || isLoading}
                      className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="Aşağı Taşı"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {device.name}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {getDeviceTypeLabel(device.type)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {device.location?.name || <span className="italic text-gray-400">Yok</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {/* TODO: Add status mapping/label if needed */}
                {device.status || '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center space-x-2">
                <button
                  onClick={() => onViewProperties ? onViewProperties(device) : null}
                  disabled={isLoading || !device.properties || device.properties.length === 0}
                  title="Özellikleri Görüntüle"
                  className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => onViewIssues ? onViewIssues(device) : null}
                  disabled={isLoading || !device.issues || device.issues.length === 0}
                  title="Arıza Kayıtlarını Görüntüle"
                  className="text-yellow-600 hover:text-yellow-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                {/* Add Issue Button */}
                <button
                  onClick={() => onAddIssue && onAddIssue(device)}
                  disabled={isLoading}
                  title="Arıza Ekle"
                  className="text-green-600 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                {/* QR Code Button */}
                <button
                  onClick={() => onViewQrCode(device)}
                  disabled={isLoading || !device.barcode_value}
                  title="Barkodu Görüntüle"
                  className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <QrCodeIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                {/* Edit Button */}
                <button onClick={() => onEdit(device)} disabled={isLoading} title="Düzenle" className="text-blue-600 hover:text-blue-900 disabled:text-gray-300"><PencilIcon className="h-5 w-5" /></button>
                {/* Delete Button */}
                <button onClick={() => onDelete(device.id)} disabled={isLoading} title="Sil" className="text-red-600 hover:text-red-900 disabled:text-gray-300"><TrashIcon className="h-5 w-5" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 