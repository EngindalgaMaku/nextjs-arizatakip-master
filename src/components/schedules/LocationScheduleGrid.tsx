"use client";

import React from 'react';
import { ScheduleEntry } from '@/types/schedules'; // Use location schedule type
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

// Define constants directly or import from a central place like @/utils/scheduleConstants
const DAYS_OF_WEEK = [
  { id: 1, name: 'Pazartesi' },
  { id: 2, name: 'Salı' },
  { id: 3, name: 'Çarşamba' },
  { id: 4, name: 'Perşembe' },
  { id: 5, name: 'Cuma' },
];
const PERIOD_TIMES = [
  '08:20-09:00', '09:15-09:55', '10:05-10:45', '10:55-11:35', '11:45-12:25',
  '13:10-13:50', '14:00-14:40', '14:50-15:30', '15:40-16:20', '16:30-17:10'
]; // Assuming 10 periods

// Define a list of Tailwind background color classes
const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800',
  'bg-purple-100 text-purple-800', 'bg-pink-100 text-pink-800', 'bg-indigo-100 text-indigo-800',
  'bg-red-100 text-red-800', 'bg-teal-100 text-teal-800', 'bg-orange-100 text-orange-800', 'bg-gray-100 text-gray-800'
];

// Simple hash function to get a somewhat consistent index for colors
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
    return 'bg-gray-50'; // Default for empty slots
  }
  const hash = simpleStringHash(lessonName);
  const index = hash % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

// Grid data structure type
type LocationScheduleGridData = {
  [day: number]: {
    [period: number]: ScheduleEntry | null;
  };
};

interface LocationScheduleGridProps {
  scheduleEntries: ScheduleEntry[];
  onAdd: (day: number, period: number) => void;
  onEdit: (entry: ScheduleEntry) => void;
  onDelete: (entryId: string) => void;
}

// Helper to transform fetched data into a grid structure
const transformDataForGrid = (data: ScheduleEntry[]): LocationScheduleGridData => {
  const gridData: LocationScheduleGridData = {};
  for (let day = 1; day <= DAYS_OF_WEEK.length; day++) {
    gridData[day] = {};
    for (let period = 1; period <= PERIOD_TIMES.length; period++) {
      gridData[day][period] = null;
    }
  }

  data.forEach(entry => {
    if (gridData[entry.day] && gridData[entry.day][entry.period] !== undefined) {
      gridData[entry.day][entry.period] = entry;
    } else {
        console.warn("Invalid day/period found in schedule entry:", entry);
    }
  });
  return gridData;
};

export function LocationScheduleGrid({ scheduleEntries, onAdd, onEdit, onDelete }: LocationScheduleGridProps) {
  const gridData = transformDataForGrid(scheduleEntries);

  return (
    <div className="overflow-x-auto shadow rounded-lg mt-4">
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
          {PERIOD_TIMES.map((time, pIdx) => {
              const period = pIdx + 1;
              return (
                  <tr key={period} className="divide-x divide-gray-200">
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r text-center">
                       <div>{period}. Ders</div>
                       <div className="text-xs text-gray-500">{time}</div>
                  </td>
                  {DAYS_OF_WEEK.map(day => {
                      const entry = gridData[day.id]?.[period];
                      const colorClass = entry?.lesson_name ? getLessonColorClass(entry.lesson_name) : '';

                      return (
                      <td key={`${day.id}-${period}`} className="px-1 py-1 whitespace-normal text-sm text-gray-700 text-center relative group border-r h-24 align-top">
                          {entry ? (
                          <div className={`flex flex-col items-center justify-between h-full rounded p-2 ${colorClass}`}>
                              <div className="text-center flex-grow">
                                  <p className="font-semibold break-words">{entry.lesson_name || '-'}</p>
                                  {entry.class_name && <p className="text-xs font-medium mt-0.5 break-words">[{entry.class_name}]</p>}
                                  {entry.teacher_name && <p className="text-xs mt-1 break-words">({entry.teacher_name})</p>}
                              </div>
                              <div className="absolute bottom-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded p-0.5">
                              <button onClick={() => onEdit(entry)} className="p-1 text-blue-700 hover:text-blue-900 rounded hover:bg-blue-100" title="Düzenle">
                                  <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => onDelete(entry.id)} className="p-1 text-red-700 hover:text-red-900 rounded hover:bg-red-100" title="Sil">
                                  <TrashIcon className="h-4 w-4" />
                              </button>
                              </div>
                          </div>
                          ) : (
                          <div className="flex items-center justify-center h-full">
                              <button onClick={() => onAdd(day.id, period)} className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Ekle">
                                  <PlusIcon className="h-5 w-5" />
                              </button>
                          </div>
                          )}
                      </td>
                      );
                  })}
                  </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
} 