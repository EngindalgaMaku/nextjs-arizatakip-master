'use client';

import React from 'react';
import { TeacherUnavailability } from '@/types/teacherUnavailability'; // Adjust path if needed
import { TrashIcon } from '@heroicons/react/24/outline';

interface TeacherUnavailabilityListProps {
  data: TeacherUnavailability[];
  onDelete: (id: string) => void;
}

// Map day numbers (1-5) to names for display
const dayNumberMap: { [key: number]: string } = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
};

export function TeacherUnavailabilityList({ data = [], onDelete }: TeacherUnavailabilityListProps) {
  if (data.length === 0) {
    return <p className="text-gray-500 italic">Bu öğretmen için tanımlanmış müsait olmama zamanı bulunmamaktadır.</p>;
  }

  return (
    <div className="overflow-x-auto shadow border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gün</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlangıç Saati</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bitiş Saati</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-2 whitespace-nowrap text-sm">{dayNumberMap[item.day_of_week] || 'Bilinmeyen Gün'}</td>
              <td className="px-4 py-2 whitespace-nowrap text-sm">{item.start_period}:00</td>
              <td className="px-4 py-2 whitespace-nowrap text-sm">{item.end_period}:00</td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50 p-1 rounded hover:bg-red-100"
                  title="Sil"
                  // Add disabled state if needed, e.g., during deletion
                >
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