'use client';

import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Semester } from '@/types/semesters';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircleIcon, XCircleIcon, PencilIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from 'lucide-react';

interface SemestersTableProps {
  semesters: Semester[];
  onEdit: (semester: Semester) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedSemesterId?: string | null;
  isLoading?: boolean;
}

export function SemestersTable({
  semesters,
  onEdit,
  onDelete,
  onSetActive,
  onSelect,
  selectedSemesterId,
  isLoading = false,
}: SemestersTableProps) {
  if (!semesters.length) {
    return <div className="text-center p-6 text-gray-500">Henüz sömestr eklenmemiş.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelect && <TableHead className="w-12"></TableHead>}
            <TableHead>Adı</TableHead>
            <TableHead>Başlangıç Tarihi</TableHead>
            <TableHead>Bitiş Tarihi</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {semesters.map((semester) => (
            <TableRow 
              key={semester.id}
              className={selectedSemesterId === semester.id ? "bg-blue-50" : undefined}
            >
              {onSelect && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect(semester.id)}
                    className={`w-8 h-8 p-0 ${selectedSemesterId === semester.id ? "text-blue-600" : ""}`}
                  >
                    <input
                      type="radio"
                      checked={selectedSemesterId === semester.id}
                      onChange={() => onSelect(semester.id)}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                    />
                  </Button>
                </TableCell>
              )}
              <TableCell className="font-medium">{semester.name}</TableCell>
              <TableCell>{new Date(semester.start_date).toLocaleDateString()}</TableCell>
              <TableCell>{new Date(semester.end_date).toLocaleDateString()}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  semester.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {semester.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </TableCell>
              <TableCell className="text-right space-x-2">
                {!semester.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetActive(semester.id)}
                    disabled={isLoading}
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Aktif Yap
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(semester)}
                  disabled={isLoading}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(semester.id)}
                  disabled={isLoading || semester.is_active}
                  className="text-red-600 hover:text-red-800 hover:bg-red-100"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 