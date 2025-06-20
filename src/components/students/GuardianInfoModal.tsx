'use client';

import React from 'react';
import Modal from '@/components/Modal'; // Use the existing modal
import { Guardian } from '@/types/students'; // Import Guardian type

interface GuardianInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  guardians: Guardian[];
}

export function GuardianInfoModal({ isOpen, onClose, studentName, guardians }: GuardianInfoModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`${studentName} - Veli Bilgileri`}
    >
      {guardians && guardians.length > 0 ? (
        <ul className="space-y-3">
          {guardians.map((guardian, index) => (
            <li key={index} className="p-3 border rounded bg-gray-50">
              <p><strong className="font-medium">Yakınlık:</strong> {guardian.relationship}</p>
              <p><strong className="font-medium">Ad Soyad:</strong> {guardian.name}</p>
              <p><strong className="font-medium">Telefon:</strong> {guardian.phone || '-'}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">Bu öğrenci için kayıtlı veli bilgisi bulunmamaktadır.</p>
      )}
      {/* Optional: Add a close button inside if needed, although the Modal wrapper handles close */}
      <div className="mt-4 flex justify-end">
        <button 
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
        >
          Kapat
        </button>
      </div>
    </Modal>
  );
} 