'use client';

import React from 'react';
import Link from 'next/link';
import { Dal } from '@/types/dallar';
import { PencilSquareIcon, TrashIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface DallarTableProps {
  dallar: Dal[];
  onEdit: (dal: Dal) => void;
  onDelete: (dalId: string) => void;
}

export function DallarTable({ dallar, onEdit, onDelete }: DallarTableProps) {
  if (!dallar.length) {
    return <p className="text-center text-gray-500 py-8">Henüz dal eklenmemiş.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dal Adı</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Eylemler</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {dallar.map((dal) => (
            <tr key={dal.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dal.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dal.description || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                {/* Dersleri Yönet Linki (Aşama 2'de aktifleşecek) */}
                <Link href={`/dashboard/dallar/${dal.id}/dersler`} className="text-purple-600 hover:text-purple-900 inline-block" title="Dersleri Yönet">
                   <BookOpenIcon className="h-5 w-5" />
                </Link>
                {/* Edit Button */}
                <button onClick={() => onEdit(dal)} className="text-indigo-600 hover:text-indigo-900" title="Düzenle">
                   <PencilSquareIcon className="h-5 w-5" />
                </button>
                {/* Delete Button */}
                <button onClick={() => onDelete(dal.id)} className="text-red-600 hover:text-red-900" title="Sil">
                   <TrashIcon className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 