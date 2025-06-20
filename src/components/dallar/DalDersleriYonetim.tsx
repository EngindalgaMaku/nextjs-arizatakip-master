'use client';

import React from 'react';
import { DalDers, SINIF_SEVIYELERI, GrupedDalDersleri, SinifSeviyesi } from '@/types/dalDersleri';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PlusCircleIcon } from '@heroicons/react/20/solid'; // Using solid for filled effect

interface DalDersleriYonetimProps {
  dersler: DalDers[];
  onAdd: (sinifSeviyesi: SinifSeviyesi) => void;
  onEdit: (ders: DalDers) => void;
  onDelete: (dersId: string) => void;
}

// Helper to group lessons by grade level
const groupDerslerBySinif = (dersler: DalDers[]): GrupedDalDersleri => {
  const grouped: GrupedDalDersleri = {};
  SINIF_SEVIYELERI.forEach(seviye => { // Initialize all grade levels
      grouped[seviye] = [];
  });
  dersler.forEach(ders => {
    grouped[ders.sinifSeviyesi]?.push(ders);
  });
  return grouped;
};

export function DalDersleriYonetim({ dersler, onAdd, onEdit, onDelete }: DalDersleriYonetimProps) {
  const groupedDersler = groupDerslerBySinif(dersler);

  return (
    <div className="space-y-8">
      {SINIF_SEVIYELERI.map(seviye => (
        <div key={seviye} className="p-4 border rounded-lg shadow-sm bg-white">
          <div className="flex justify-between items-center mb-3 pb-2 border-b">
            <h3 className="text-lg font-semibold text-gray-700">{seviye}. Sınıf Dersleri</h3>
            <button 
              onClick={() => onAdd(seviye)}
              className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 text-sm"
              title={`${seviye}. Sınıfa Ders Ekle`}
            >
              <PlusCircleIcon className="h-5 w-5 mr-1" />
              Ders Ekle
            </button>
          </div>
          
          {groupedDersler[seviye]?.length ? (
            <ul className="space-y-2">
              {groupedDersler[seviye]?.map(ders => (
                <li key={ders.id} className="flex justify-between items-center p-2 border rounded hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-gray-800">{ders.dersAdi}</span>
                    <span className="ml-2 text-sm text-gray-500">({ders.haftalikSaat} saat/hafta)</span>
                  </div>
                  <div className="space-x-2">
                    <button 
                      onClick={() => onEdit(ders)}
                      className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-100"
                      title="Düzenle"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(ders.id)}
                      className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-100"
                      title="Sil"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">Bu sınıf seviyesi için henüz ders eklenmemiş.</p>
          )}
        </div>
      ))}
    </div>
  );
} 