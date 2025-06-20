'use client';

import React from 'react';
import { Device } from '@/types/devices';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DevicePropertiesModalProps {
  device: Device | null;
  onClose: () => void;
}

export default function DevicePropertiesModal({ device, onClose }: DevicePropertiesModalProps) {
  if (!device || !device.properties || device.properties.length === 0) {
    return null; // Don't render if no device or properties
  }

  const properties = device.properties;

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

        <p className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2 text-center">{device.name}</p>

        <div className="max-h-80 overflow-y-auto pr-2">
          <div className="space-y-2 text-sm">
            {properties.map((prop, index) => (
              <div key={prop.key || index} className="border-t pt-2">
                 <span className="font-semibold text-gray-600">{prop.key}: </span>
                 <span className="text-gray-800 break-words">
                    {typeof prop.value === 'boolean' ? (prop.value ? 'Evet' : 'Hayır') :
                     typeof prop.value === 'object' && prop.value !== null ? JSON.stringify(prop.value) :
                     String(prop.value ?? '-')}
                  </span>
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