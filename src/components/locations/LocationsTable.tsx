'use client';

import React from 'react';
import { LocationWithDetails } from '@/types/locations';
// Button importunu tekrar deneyelim, doğru yolu bulana kadar yorumda kalabilir
// import { Button } from '@/components/ui/button'; // Re-commented the import
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface LocationsTableProps {
  locations: LocationWithDetails[];
  // locationTypesMap: Map<string, string>; // BU SATIRI KALDIR
  onEdit: (location: LocationWithDetails) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean; // Make loading optional
}

// Re-added temporary Button definition
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
  <button {...props} className={`px-2 py-1 border rounded text-sm ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${props.variant === 'destructive' ? 'text-red-600 border-red-300 hover:bg-red-50' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
    {children}
  </button>
);

export default function LocationsTable({
  locations,
  // locationTypesMap, // BU SATIRI KALDIR
  onEdit,
  onDelete,
  isLoading = false
}: LocationsTableProps) {

  return (
    <div className="overflow-x-auto shadow border-b border-gray-200 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konum Adı</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branş</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasyon Tipi</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kapasite</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">İşlemler</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {locations.map((location) => (
            <tr key={location.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{location.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.branch?.name ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.code ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {location.locationType?.name ?? (location.location_type_id ? 'Bilinmeyen Tip' : 'Belirtilmemiş')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{location.capacity ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(location)}
                  disabled={isLoading}
                  aria-label={`Düzenle ${location.name}`}
                >
                   <PencilIcon className="h-4 w-4 inline mr-1" /> Düzenle
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(location.id)}
                  disabled={isLoading}
                  aria-label={`Sil ${location.name}`}
                >
                  <TrashIcon className="h-4 w-4 inline mr-1" /> Sil
                </Button>
              </td>
            </tr>
          ))}
          {locations.length === 0 && (
             <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Gösterilecek konum bulunamadı.
                </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}