'use client';

import React from 'react';
// Remove DalDers import if not needed after prop type change
// import { DalDers } from '@/types/dalDersleri';
import { TeacherCourseAssignment, AssignmentType } from '@/types/teacherCourseAssignments'; // Import AssignmentType directly
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

// Define the expected structure for the map value
interface DersDetails {
    dersAdi?: string;
    sinifSeviyesi?: number;
}

interface TeacherAssignmentsListProps {
  assignments: TeacherCourseAssignment[];
  // Update the map type to match the data structure from the page
  dalDersMap: Map<string, DersDetails>; 
  onEdit: (assignment: TeacherCourseAssignment) => void; 
  onDelete: (id: string) => void;
}

// Helper to get display text for assignment type, use AssignmentType
const getAssignmentTypeText = (type: AssignmentType | undefined | null):
    | 'Uzmanlık Dersi'
    | 'Atanamaz'
    | 'Bilinmiyor' => {
    switch (type) {
        case 'required': return 'Uzmanlık Dersi';
        case 'excluded': return 'Atanamaz';
        default: return 'Bilinmiyor';
    }
};

export function TeacherAssignmentsList({ assignments, dalDersMap, onEdit, onDelete }: TeacherAssignmentsListProps) {
  // Log the received assignments data
  console.log('[TeacherAssignmentsList] Received assignments:', assignments);
  
  if (!assignments || assignments.length === 0) {
    return <p className="text-center text-gray-500 italic my-4">Bu öğretmen için tanımlanmış özel ders ataması bulunmamaktadır.</p>;
  }

  return (
    <div className="overflow-x-auto shadow border-b border-gray-200 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ders Adı</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf Seviyesi</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atama Türü</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">İşlemler</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {assignments.map((assignment) => {
            // Prefer nested `dal_ders` if available, otherwise fallback to the map
            const ders = assignment.dal_ders
              ? { dersAdi: assignment.dal_ders.dersAdi, sinifSeviyesi: assignment.dal_ders.sinifSeviyesi }
              : dalDersMap.get(assignment.dal_ders_id);
            // Log the specific assignment being used (property is 'assignment')
            console.log(`[TeacherAssignmentsList] Mapping assignment ID: ${assignment.id}, assignment:`, assignment.assignment);
            return (
              <tr key={assignment.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {ders?.dersAdi ?? assignment.dal_ders_id ?? 'Ders Bulunamadı'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {/* Use optional chaining and nullish coalescing */}
                  {ders?.sinifSeviyesi ? `${ders.sinifSeviyesi}. Sınıf` : '-'} 
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {/* Use the correct property name: assignment */}
                  {getAssignmentTypeText(assignment.assignment)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  {/* Remove the Edit button */}
                  {/* 
                  <button onClick={() => onEdit(assignment)} className="text-indigo-600 hover:text-indigo-900" title="Atama Türünü Düzenle">
                     <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  */}
                  {/* Keep the Delete button */}
                  <button onClick={() => onDelete(assignment.id)} className="text-red-600 hover:text-red-900" title="Atamayı Sil">
                     <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 