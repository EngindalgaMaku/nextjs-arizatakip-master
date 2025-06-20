'use client';
import React, { useState } from 'react';
import { Student } from '@/types/students';
import { PencilIcon, TrashIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
// Assuming Tamagui components are available, otherwise use standard HTML
// import { Input, Button, XStack, Paragraph } from 'tamagui'; 

export interface StudentsTableProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onShowGuardians: (student: Student) => void;
}

const columnHelper = createColumnHelper<Student>();

// Gender map remains the same
const genderMap: { [key: string]: string } = {
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
};

export function StudentsTable({ students, onEdit, onDelete, onShowGuardians }: StudentsTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = React.useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Ad Soyad',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('gender', {
      header: 'Cinsiyet',
      cell: info => info.getValue() ? genderMap[info.getValue()!] ?? info.getValue() : '-',
    }),
    columnHelper.accessor('schoolNumber', {
      header: 'Okul No',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('email', {
      header: 'E-posta',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('birthDate', {
      header: 'Doğum Tarihi',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('phone', {
      header: 'Cep Telefonu',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('status', {
      header: 'Durum',
      cell: info => info.getValue(),
    }),
    columnHelper.display({
      id: 'guardians',
      header: 'Veliler',
      cell: ({ row }) => (
        <div className="flex justify-center">
          {(row.original.guardians && row.original.guardians.length > 0) && (
            <button
              onClick={() => onShowGuardians(row.original)}
              className="text-gray-600 hover:text-blue-600 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Veli Bilgilerini Göster"
            >
              <UserGroupIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => onEdit(row.original)}
            className="text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            title="Düzenle"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(row.original.id!)}
            className="text-red-600 hover:text-red-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
            title="Sil"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    }),
  ], [onEdit, onDelete, onShowGuardians]); // Add dependencies

  const table = useReactTable({
    data: students,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
          pageSize: 10, // Set default page size
      },
    }
  });

  return (
    <div>
      <div className="mb-4">
        {/* Replace with Tamagui Input if available */}
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(String(e.target.value))}
          className="w-full sm:w-1/2 p-2 border rounded-md"
          placeholder="Tabloda Ara..."
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="border p-2 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="border p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
             {table.getRowModel().rows.length === 0 && (
               <tr>
                 <td colSpan={columns.length} className="text-center p-4 border text-gray-500">
                   Arama kriterlerine uygun veya kayıtlı öğrenci bulunamadı.
                 </td>
               </tr>
             )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 text-sm">
        {/* Replace with Tamagui components if available */}
        <div className="flex items-center space-x-2">
           <button
             onClick={() => table.setPageIndex(0)}
             disabled={!table.getCanPreviousPage()}
             className="px-2 py-1 border rounded disabled:opacity-50"
           >
             {'<<'}
           </button>
           <button
             onClick={() => table.previousPage()}
             disabled={!table.getCanPreviousPage()}
             className="px-2 py-1 border rounded disabled:opacity-50"
           >
             {'<'}
           </button>
           <button
             onClick={() => table.nextPage()}
             disabled={!table.getCanNextPage()}
             className="px-2 py-1 border rounded disabled:opacity-50"
           >
             {'>'}
           </button>
           <button
             onClick={() => table.setPageIndex(table.getPageCount() - 1)}
             disabled={!table.getCanNextPage()}
             className="px-2 py-1 border rounded disabled:opacity-50"
           >
             {'>>'}
           </button>
         </div>
         <span>
           Sayfa{' '}
           <strong>
             {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
           </strong>
         </span>
         <select
          value={table.getState().pagination.pageSize}
          onChange={e => {
            table.setPageSize(Number(e.target.value))
          }}
          className="p-1 border rounded"
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Göster {pageSize}
            </option>
          ))}
        </select>
        <span>
          Toplam {table.getFilteredRowModel().rows.length} kayıt
          ( {students.length} kayıttan filtrelendi)
        </span>
      </div>
    </div>
  );
} 