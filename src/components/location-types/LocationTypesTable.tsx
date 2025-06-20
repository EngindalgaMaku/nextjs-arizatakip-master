import React from 'react';
import { LocationType } from '@/types/locationTypes';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface LocationTypesTableProps {
  locationTypes: LocationType[];
  onEdit: (locationType: LocationType) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function LocationTypesTable({
  locationTypes,
  onEdit,
  onDelete,
  isLoading = false,
}: LocationTypesTableProps) {
  if (locationTypes.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.375M9 12h6.375m-6.375 5.25h6.375M5.25 6.75h.008v.008H5.25V6.75zm.008 5.25h.008v.008H5.25v-.008zm0 5.25h.008v.008H5.25v-.008z" />
        </svg>
        <p>Kayıtlı lokasyon tipi bulunamadı.</p>
        <p className="text-sm">Yeni bir lokasyon tipi ekleyerek başlayabilirsiniz.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted/80">
            <TableHead className="w-[250px] sm:w-[300px]">Tip Adı</TableHead>
            <TableHead>Açıklama</TableHead>
            <TableHead className="text-right w-[100px] sm:w-[120px]">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locationTypes.map((type) => (
            <TableRow key={type.id}>
              <TableCell className="font-medium">{type.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{type.description || '—'}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(type)}
                    disabled={isLoading}
                    aria-label={`Düzenle: ${type.name}`}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(type.id)}
                    disabled={isLoading}
                    aria-label={`Sil: ${type.name}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 