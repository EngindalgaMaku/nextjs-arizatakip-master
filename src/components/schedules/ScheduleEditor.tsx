'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleEntry, ScheduleUpsertEntry } from '@/types/schedules';
import { Class } from '@/types/classes';
import { Teacher } from '@/types/teachers';
import { saveScheduleEntries } from '@/actions/scheduleActions';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface EditorOptions {
  dersOptions: { id: string; dersAdi: string }[];
  classes: Class[];
  teachers: Teacher[];
}

interface ScheduleEditorProps {
  labId: string;
  initialScheduleEntries: ScheduleEntry[];
  editorOptions: EditorOptions;
  editorDataError?: string | null; // Optional error message from server fetch
}

const DAYS = [
  { label: 'Pazartesi', value: 1 },
  { label: 'Salı', value: 2 },
  { label: 'Çarşamba', value: 3 },
  { label: 'Perşembe', value: 4 },
  { label: 'Cuma', value: 5 },
];

const PERIODS = Array.from({ length: 10 }, (_, i) => i + 1); // Update length to 10

export function ScheduleEditor({ 
  labId, 
  initialScheduleEntries, 
  editorOptions,
  editorDataError
}: ScheduleEditorProps) {
  
  const router = useRouter();
  const [scheduleGrid, setScheduleGrid] = useState<Record<string, ScheduleUpsertEntry>>({}); // Key: day-period
  const [hasChanges, setHasChanges] = useState(false);

  // Memoize initial grid generation
  const initialGrid = useMemo(() => {
    const grid: Record<string, ScheduleUpsertEntry> = {};
    for (const day of DAYS) {
      for (const period of PERIODS) {
        const key = `${day.value}-${period}`;
        const existingEntry = initialScheduleEntries.find(
          (e) => e.day === day.value && e.period === period
        );
        grid[key] = {
          lab_id: labId,
          day: day.value,
          period: period,
          lesson_id: existingEntry?.lesson_id || null,
          class_id: existingEntry?.class_id || null,
          teacher_id: existingEntry?.teacher_id || null,
        };
      }
    }
    return grid;
  }, [initialScheduleEntries, labId]);

  // Initialize state with the memoized grid
  useEffect(() => {
    setScheduleGrid(initialGrid);
    setHasChanges(false); // Reset changes when initial data changes
  }, [initialGrid]);

  const handleCellChange = (
    day: number,
    period: number,
    field: 'lesson_id' | 'class_id' | 'teacher_id',
    value: string | null // Value from select (can be empty string for none)
  ) => {
    const key = `${day}-${period}`;
    setScheduleGrid(prev => ({
      ...prev,
      [key]: { 
         ...(prev[key] || { lab_id: labId, day, period }), // Ensure base object exists
         [field]: value || null // Store null if empty string selected
        }
    }));
    setHasChanges(true);
  };

  // Mutation for saving
  const saveMutation = useMutation({
    mutationFn: saveScheduleEntries,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Ders programı başarıyla kaydedildi.');
        setHasChanges(false);
        // Optionally refresh data if needed, though revalidate should handle it
        // router.refresh();
      } else {
        toast.error(`Kaydedilemedi: ${data.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Kaydedilirken hata oluştu: ${error.message}`);
    },
  });

  const handleSave = () => {
    // Convert the state object back into an array of entries for the action
    const entriesToSave = Object.values(scheduleGrid)
       // Only include entries that have at least one ID selected
       .filter(entry => entry.lesson_id || entry.class_id || entry.teacher_id);
       
    saveMutation.mutate(entriesToSave);
  };

  // Display error if fetching editor options failed
  if (editorDataError) {
     return <div className="p-4 text-red-600">Seçenekler yüklenirken hata oluştu: {editorDataError}</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto shadow border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Saat / Gün</th>
              {DAYS.map((day) => (
                <th key={day.value} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300 w-1/5">
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {PERIODS.map((period) => (
              <tr key={period} className="divide-x divide-gray-200">
                <td className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border border-gray-300">
                  {period}. Ders
                </td>
                {DAYS.map((day) => {
                  const key = `${day.value}-${period}`;
                  const currentEntry = scheduleGrid[key];
                  return (
                    <td key={key} className="p-1.5 align-top border border-gray-300">
                      {/* Lesson Select */}
                      <select
                        value={currentEntry?.lesson_id || ''} // Control value, use empty string for none
                        onChange={(e) => handleCellChange(day.value, period, 'lesson_id', e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs mb-1 py-1"
                      >
                        <option value="">-- Ders Seç --</option>
                        {editorOptions.dersOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.dersAdi}</option>
                        ))}
                      </select>
                      {/* Class Select */}
                       <select
                        value={currentEntry?.class_id || ''} 
                        onChange={(e) => handleCellChange(day.value, period, 'class_id', e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs mb-1 py-1"
                      >
                        <option value="">-- Sınıf Seç --</option>
                        {editorOptions.classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                      {/* Teacher Select */}
                       <select
                        value={currentEntry?.teacher_id || ''} 
                        onChange={(e) => handleCellChange(day.value, period, 'teacher_id', e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1"
                      >
                        <option value="">-- Öğretmen Seç --</option>
                        {editorOptions.teachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
      </div>
    </div>
  );
} 