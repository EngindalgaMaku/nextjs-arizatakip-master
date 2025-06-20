'use client';

import React, { useState, useEffect } from 'react';
import { fetchLocations } from '@/actions/locationActions';
import { Location } from '@/types/locations';
import QRCode from 'react-qr-code';

export default function LocationsPrintPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAndPrint() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedLocations = await fetchLocations();
        // Filter locations that have a barcode value - assuming 'code' field is the barcode
        // We might need to filter based on a specific scanned code later (e.g., from searchParams)
        const locationsWithBarcode = fetchedLocations.filter(loc => !!loc.code);
        setLocations(locationsWithBarcode);

        // Wait for state update and rendering, then print
        setTimeout(() => {
           if (locationsWithBarcode.length > 0) {
             window.print();
           } else {
             setError("Yazdırılacak barkod içeren konum bulunamadı.");
           }
           // Indicate loading might be finished after attempting print
           setIsLoading(false); 
        }, 500); // Small delay to ensure rendering before print

      } catch (err) {
        console.error('Failed to load locations for printing:', err);
        setError(err instanceof Error ? err.message : 'Konumlar yüklenirken bir hata oluştu.');
        setIsLoading(false); // Set loading false on error
      }
       // Removed finally block - manage loading state explicitly
    }
    loadAndPrint();
  }, []);

  if (isLoading) { // Show loading until print is attempted or error
    return (
      <div className="p-4 text-center">
        Konumlar yükleniyor ve yazdırma hazırlanıyor...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Hata: {error}</div>;
  }
  
  if (locations.length === 0) {
      return <div className="p-4 text-center text-gray-500">Yazdırılacak barkod içeren konum bulunamadı.</div>;
  }

  // Basic print layout - Adjust grid columns, size, gap as needed for A4
  // Ensure page breaks are handled reasonably by the browser.
  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            margin: 1cm !important; /* Use !important to override potential conflicts */
            -webkit-print-color-adjust: exact !important; /* Ensure colors and backgrounds print */
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important; /* Hide elements not meant for printing */
          }
          .printable-grid {
             /* Adjust columns for A4 - e.g., 3 columns */
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5cm 1cm; /* Adjust gap */
            page-break-inside: avoid;
          }
           .qr-code-item {
            page-break-inside: avoid; /* Try to keep item from splitting across pages */
            border: 1px solid #ccc; /* Light border for separation */
            padding: 6px;
            background-color: white !important; /* Ensure white background */
           }
           /* Ensure QR code itself prints correctly */
           .qr-code-item svg {
             max-width: 100%;
             height: auto;
             background-color: white !important;
           }
        }
        @page {
            size: A4;
            margin: 1cm; /* Ensure @page margin matches body margin */
        }
      `}</style>
      <div className="p-4 printable-grid grid grid-cols-3 gap-4">
        {locations.map((location) => (
          <div key={location.id} className="qr-code-item text-center border p-2 rounded bg-white">
            <QRCode
              value={location.code!} // Use location.code as the QR code value
              size={80} // Smaller size for grid layout
              level="Q"
              viewBox={`0 0 80 80`} // Ensure viewBox matches size
              className="mx-auto" // Center QR Code
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
            {/* Fit text better for small boxes */}
            <p className="mt-1 text-[8px] font-mono break-all leading-tight">{location.code}</p>
            <p className="mt-0.5 text-[10px] font-semibold leading-tight">{location.name}</p>
          </div>
        ))}
      </div>
       {/* Optional: Add a button to manually trigger print again, hidden on print */}
       <div className="p-4 text-center no-print">
          <p className="mb-4 text-sm text-gray-600">Yazdırma penceresi otomatik olarak açılmalıdır. Açılmazsa veya tekrar yazdırmak isterseniz aşağıdaki düğmeyi kullanın.</p>
          <button
            onClick={() => window.print()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
           >
             Yazdır
           </button>
           <button
            onClick={() => window.close()} // Add a close button
            className="ml-4 bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
           >
             Kapat
           </button>
       </div>
    </>
  );
} 