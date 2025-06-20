"use client";

import React from 'react';
import { ScheduleEntry } from '@/types/schedules';
import { PrinterIcon } from '@heroicons/react/24/outline';

const dayLabels = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const periodCount = 10;
const daysCount = 5;

// Define times for each period
const periodTimes = [
  '08:20-09:00',
  '09:15-09:55',
  '10:05-10:45',
  '10:55-11:35',
  '11:45-12:25',
  '13:10-13:50',
  '14:00-14:40',
  '14:50-15:30',
  '15:40-16:20',
  '16:30-17:10',
];

// Predefined background colors for different subjects
const colors = [
  'bg-red-100', 'bg-green-100', 'bg-blue-100', 'bg-yellow-100',
  'bg-purple-100', 'bg-pink-100', 'bg-indigo-100', 'bg-gray-100',
  'bg-teal-100', 'bg-orange-100'
];

// Build a subject->color map
function getLessonColorMap(entries: ScheduleEntry[]) {
  const map: Record<string, string> = {};
  let idx = 0;
  for (const e of entries) {
    if (e.lesson_name && !map[e.lesson_name]) {
      map[e.lesson_name] = colors[idx % colors.length];
      idx++;
    }
  }
  return map;
}

interface ScheduleTimelineProps {
  entries: ScheduleEntry[];
}

// Global print styles: hide everything except timeline
const printStyles = `
  @page { size: landscape; margin: 5mm; }
  @media print {
    /* Hide everything by default */
    body * {
      visibility: hidden !important;
    }
    /* Show timeline area and its children */
    #schedule-timeline-printable-area,
    #schedule-timeline-printable-area * {
      visibility: visible !important;
    }
    /* Position and scale printable area to fit one page */
    #schedule-timeline-printable-area {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      transform: scale(0.8);
      transform-origin: top left;
    }
  }
`;

export default function ScheduleTimeline({ entries }: ScheduleTimelineProps) {
  // Build a lookup for quick access
  const gridMap: Record<string, ScheduleEntry> = {};
  entries.forEach(e => {
    gridMap[`${e.day}-${e.period}`] = e;
  });

  // Determine color for each subject
  const lessonColorMap = React.useMemo(() => getLessonColorMap(entries), [entries]);

  // Print handler: just call window.print()
  const handlePrint = () => window.print();

  return (
    <>
      <style jsx global>{printStyles}</style>
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2 no-print">
          <h2 className="text-base font-semibold">Zaman Çizelgesi</h2>
          <button
            onClick={handlePrint}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <PrinterIcon className="h-5 w-5 mr-1" aria-hidden="true" />
            Yazdır
          </button>
        </div>
        <div id="schedule-timeline-printable-area">
          <div className="grid grid-cols-6 grid-rows-11 auto-rows-min gap-y-1 text-xs border-collapse">
            {/* Header Row */}
            <div className="border bg-gray-50 p-1"></div>
            {dayLabels.map((label, idx) => (
              <div key={idx} className="border bg-gray-50 p-1 font-medium text-center">
                {label}
              </div>
            ))}
            {/* Period rows */}
            {Array.from({ length: periodCount }).flatMap((_, pIdx) => {
              const period = pIdx + 1;
              const time = periodTimes[pIdx];
              return [
                <div key={`label-${period}`} className="border bg-gray-50 p-1 font-medium text-center">
                  <div>{period}. Ders</div>
                  <div className="text-xs text-gray-500">{time}</div>
                </div>,
                ...Array.from({ length: daysCount }).map((_, dIdx) => {
                  const day = dIdx + 1;
                  const key = `${day}-${period}`;
                  const entry = gridMap[key];
                  const hasLesson = entry && entry.lesson_name;
                  const bgClass = hasLesson ? lessonColorMap[entry.lesson_name as string] : '';
                  return (
                    <div
                      key={key}
                      className={`border p-1 overflow-auto ${bgClass}`}
                    >
                      {entry?.lesson_name && <div className="font-semibold text-sm">{entry.lesson_name}</div>}
                      {entry?.class_name && <div className="text-xs mt-1">Sınıf: {entry.class_name}</div>}
                      {entry?.teacher_name && <div className="text-xs mt-1">Öğretmen: {entry.teacher_name}</div>}
                    </div>
                  );
                }),
              ];
            })}
          </div>
        </div>
      </div>
    </>
  );
} 