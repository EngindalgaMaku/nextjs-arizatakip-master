'use client';

import React from 'react';
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  TeacherScheduleEntry,
  TeacherScheduleGridData,
} from '@/types/teacherSchedules';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PlusCircleIcon } from '@heroicons/react/20/solid';

// Define a list of Tailwind background color classes
const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-indigo-100 text-indigo-800',
  'bg-red-100 text-red-800',
  'bg-teal-100 text-teal-800',
];

// Simple hash function to get a somewhat consistent index
function simpleStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Function to get a color class based on lesson name
function getLessonColorClass(lessonName?: string | null): string {
  if (!lessonName) {
    return 'bg-gray-50'; // Default for empty slots (though we don't color empty ones)
  }
  const hash = simpleStringHash(lessonName);
  const index = hash % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

interface TeacherScheduleGridProps {
  scheduleData: TeacherScheduleEntry[];
  onAdd: (dayOfWeek: number, timeSlot: number) => void;
  onEdit: (entry: TeacherScheduleEntry) => void;
  onDelete: (entryId: string) => void;
}

// Helper to transform fetched data into a grid structure
const transformDataForGrid = (data: TeacherScheduleEntry[]): TeacherScheduleGridData => {
  const gridData: TeacherScheduleGridData = {};
  DAYS_OF_WEEK.forEach(day => {
    gridData[day.id] = {};
    TIME_SLOTS.forEach(slot => {
      gridData[day.id][slot.id] = null;
    });
  });

  data.forEach(entry => {
    if (gridData[entry.dayOfWeek] && gridData[entry.dayOfWeek][entry.timeSlot] !== undefined) {
      gridData[entry.dayOfWeek][entry.timeSlot] = entry;
    }
  });
  return gridData;
};

export function TeacherScheduleGrid({ scheduleData, onAdd, onEdit, onDelete }: TeacherScheduleGridProps) {
  const gridData = transformDataForGrid(scheduleData);

  return (
    <div className="overflow-x-auto shadow rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
              Saat
            </th>
            {DAYS_OF_WEEK.map(day => (
              <th key={day.id} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                {day.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {TIME_SLOTS.map(slot => (
            <tr key={slot.id} className="divide-x divide-gray-200">
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                {slot.time}
              </td>
              {DAYS_OF_WEEK.map(day => {
                const entry = gridData[day.id]?.[slot.id];
                // Get the color class based on the lesson name
                const colorClass = entry?.className ? getLessonColorClass(entry.className) : '';

                return (
                   // Apply a base padding/style, background comes from inner div if entry exists
                  <td key={`${day.id}-${slot.id}`} className="px-1 py-1 whitespace-normal text-sm text-gray-700 text-center relative group border-r h-24 align-top">
                    {entry ? (
                       // Apply the dynamic background color and padding to this inner div
                      <div className={`flex flex-col items-center justify-between h-full rounded p-2 ${colorClass}`}>
                        <div className="text-center flex-grow"> {/* Allow content to grow */}
                            <p className="font-semibold break-words">{entry.className || '-'}</p>
                            {/* Display Class Name if available */} 
                            {entry.classNameDisplay && (
                               <p className="text-xs font-medium mt-0.5 break-words">[{entry.classNameDisplay}]</p> 
                            )}
                            {/* Display Location Name if available */} 
                            {entry.locationName && <p className="text-xs mt-1 break-words">({entry.locationName})</p>}
                        </div>
                        {/* Action buttons container */}
                        <div className="absolute bottom-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded p-0.5">
                          <button
                            onClick={() => onEdit(entry)}
                            className="p-1 text-blue-700 hover:text-blue-900 rounded hover:bg-blue-100"
                            title="Düzenle"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(entry.id)}
                            className="p-1 text-red-700 hover:text-red-900 rounded hover:bg-red-100"
                            title="Sil"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                       // Empty slot with add button
                      <div className="flex items-center justify-center h-full">
                         <button
                            onClick={() => onAdd(day.id, slot.id)}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Ekle"
                          >
                           <PlusIcon className="h-5 w-5" />
                         </button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 