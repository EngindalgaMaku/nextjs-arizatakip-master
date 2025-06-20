'use client';

import React from 'react';
import { Device } from '@/types/devices';
import { XMarkIcon } from '@heroicons/react/24/outline';
import QRCode from 'react-qr-code';

interface DeviceQRCodeModalProps {
  device: Device;
  onClose: () => void;
}

export default function DeviceQRCodeModal({ device, onClose }: DeviceQRCodeModalProps) {
  // Generate the URL for the QR Code
  const qrUrl = `${window.location.origin}/cihaz/${device.barcode_value}`;
  
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
          <span className="sr-only">Kapat</span>
        </button>

        <div className="text-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Cihaz Barkodu</h3>
          <p className="text-sm text-gray-500">{device.name}</p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="p-3 bg-white rounded-lg border">
            <QRCode value={qrUrl} size={180} />
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-xs font-mono break-all bg-gray-100 p-2 rounded">{qrUrl}</p>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              try {
                window.print();
              } catch (e) {
                console.error('Print error:', e);
              }
            }}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
          >
            Yazdır
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
} 