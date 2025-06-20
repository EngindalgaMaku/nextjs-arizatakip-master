'use client';

import React from 'react';
import { Form, FormStatus } from '@/types/forms';
import { PencilIcon, TrashIcon, EyeIcon, InboxStackIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface FormsTableProps {
  forms: Form[];
  onEdit: (form: Form) => void; // Or navigate to edit page
  onDelete: (id: string) => void;
}

// Helper to get badge color based on status
const getStatusBadgeColor = (status: FormStatus): string => {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800';
    case 'draft': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function FormsTable({ forms, onEdit, onDelete }: FormsTableProps) {
  return (
    <div className="overflow-x-auto shadow border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Başlık
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Açıklama
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Durum
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {forms.map((form) => (
            <tr key={form.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {/* Link to form edit page */}
                <Link href={`/dashboard/forms/${form.id}/edit`} className="hover:underline">
                   {form.title}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate">
                {form.description || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                 <span className={`${getStatusBadgeColor(form.status)} px-2 py-0.5 rounded-full text-xs font-medium`}>
                     {form.status === 'published' ? 'Yayında' : 'Taslak'}
                 </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2 flex items-center justify-end">
                 {/* View Public Form Link (conditional) */}
                 {form.status === 'published' && (
                    <Link 
                        href={`/forms/${form.id}`} // Adjust URL structure if needed
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        title="Formu Görüntüle (Herkese Açık)"
                    >
                        <EyeIcon className="h-5 w-5" />
                    </Link>
                 )}
                 {/* Link to Responses Page */}
                 <Link 
                    href={`/dashboard/forms/${form.id}/responses`} 
                    className="text-purple-600 hover:text-purple-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                    title="Yanıtları Görüntüle"
                 >
                    <InboxStackIcon className="h-5 w-5" />
                 </Link>
                {/* Edit Button */}
                <Link 
                    href={`/dashboard/forms/${form.id}/edit`} 
                    className="text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Formu Düzenle"
                 >
                  <PencilIcon className="h-5 w-5" />
                </Link>
                {/* Delete Button */}
                <button
                  onClick={() => onDelete(form.id!)}
                  className="text-red-600 hover:text-red-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="Formu Sil"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
          {forms.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-10 text-gray-500">
                Kayıtlı form bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 