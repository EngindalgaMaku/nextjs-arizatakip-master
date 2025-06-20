'use client';

import React, { useState, useEffect } from 'react';
import { fetchDevices } from '@/actions/deviceActions'; // Import fetchDevices
import { Device } from '@/types/devices'; // Import Device type
import QRCode from 'react-qr-code';

// Get the base URL from environment variables
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default function DevicesPrintPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAndPrint() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedDevices = await fetchDevices();
        // Filter devices that actually have a barcode value
        const devicesWithBarcode = fetchedDevices.filter(dev => dev.barcode_value);
        setDevices(devicesWithBarcode);

        // Wait for state update and rendering, then print
        setTimeout(() => {
           if (devicesWithBarcode.length > 0) {
             window.print();
           } else {
             setError("Yazdırılacak barkod içeren cihaz bulunamadı.");
           }
           setIsLoading(false);
        }, 500);

      } catch (err) {
        console.error('Failed to load devices for printing:', err);
        setError(err instanceof Error ? err.message : 'Cihazlar yüklenirken bir hata oluştu.');
        setIsLoading(false);
      }
    }
    loadAndPrint();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        Cihazlar yükleniyor ve yazdırma hazırlanıyor...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Hata: {error}</div>;
  }

  if (devices.length === 0) {
      return <div className="p-4 text-center text-gray-500">Yazdırılacak barkod içeren cihaz bulunamadı.</div>;
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            margin: 1cm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-grid {
            /* Adjust columns for A4 - e.g., 4 columns might fit better */
            grid-template-columns: repeat(4, 1fr);
            gap: 1cm 0.5cm; /* Adjust gap */
          }
           .qr-code-item {
            page-break-inside: avoid;
            border: 1px solid #ccc;
            padding: 5px; /* Slightly smaller padding */
            background-color: white !important;
            text-align: center;
           }
           .qr-code-item svg {
             max-width: 100%;
             height: auto;
             background-color: white !important;
           }
           .qr-code-item p {
             margin: 0;
             line-height: 1.2;
           }
        }
        @page {
            size: A4;
            margin: 1cm;
        }
      `}</style>
      <div className="printable-grid grid grid-cols-4 gap-2 pt-4">
        {devices.map((device) => {
          // Generate the full URL for the QR code
          const deviceUrl = `${APP_BASE_URL}/cihaz/${device.barcode_value}`;
          return (
            <div key={device.id} className="qr-code-item">
              <QRCode
                value={deviceUrl} // Use the full URL
                size={64} // Smaller size for more items per page
                level="Q"
                viewBox={`0 0 64 64`} // Match size
                className="mx-auto mb-1" // Center QR Code
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
              {/* Show device name and maybe type or serial */}
              <p className="text-[9px] font-semibold">{device.name}</p>
              <p className="text-[7px] text-gray-600 font-mono break-all">{device.serial_number || device.barcode_value}</p>
            </div>
          );
        })}
      </div>
       {/* Print/Close buttons for non-print view */}
       <div className="p-4 text-center no-print">
          <p className="mb-4 text-sm text-gray-600">Yazdırma penceresi otomatik olarak açılmalıdır. Açılmazsa veya tekrar yazdırmak isterseniz aşağıdaki düğmeyi kullanın.</p>
          <button
            onClick={() => window.print()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
           >
             Yazdır
           </button>
           <button
            onClick={() => window.close()}
            className="ml-4 bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
           >
             Kapat
           </button>
       </div>
    </>
  );
} 