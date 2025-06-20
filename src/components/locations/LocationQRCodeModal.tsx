'use client';

import React from 'react';
import QRCode from 'react-qr-code';
import { Location } from '@/types/locations';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface LocationQRCodeModalProps {
  location: Location | null;
  onClose: () => void;
}

// Get the base URL for your application from environment variables
// Fallback for development, replace with your actual public domain
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function LocationQRCodeModal({ location, onClose }: LocationQRCodeModalProps) {
  if (!location || !location.code) {
    // Should not happen if button is disabled correctly, but good practice
    return null;
  }

  // Construct the full URL for the public location page
  const locationUrl = `${APP_BASE_URL}/konum/${location.code}`;

  const handlePrint = () => {
    const printContents = document.getElementById('qr-code-printable-area')?.innerHTML;
    const originalContents = document.body.innerHTML;
    if (printContents) {
        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        // Re-attach event listeners or reload if needed after print dialog closes
        // This simple approach might break complex pages; consider a dedicated print CSS or library
        window.location.reload(); // Simple way to restore state
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
          <span className="sr-only">Kapat</span>
        </button>

        <h2 className="text-lg font-medium mb-2">Konum QR Kodu</h2>
        <p className="text-sm text-gray-600 mb-4">{location.name}</p>

        <div id="qr-code-printable-area" className="bg-white p-4 inline-block">
          {/* The QR Code Component */}
          <QRCode
            value={locationUrl}
            size={200} // Adjust size as needed
            level="H" // Error correction level (L, M, Q, H)
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
           {/* Add clickable link */}
           <a 
             href={locationUrl}
             target="_blank" 
             rel="noopener noreferrer"
             className="mt-3 block text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline break-all"
             title={locationUrl} // Show full URL on hover
           >
              {location.name} {/* Show location name as link text */}
           </a>
        </div>


        <div className="mt-6 flex justify-center">
          <button
            onClick={handlePrint}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Yazdır
          </button>
        </div>
      </div>
    </div>
  );
} 