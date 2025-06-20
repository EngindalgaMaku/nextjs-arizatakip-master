'use client';

import React from 'react';
import { Issue as SupabaseIssue } from '@/lib/supabase';
import { 
  getStatusName, 
  getPriorityName, 
  getStatusColor, 
  getPriorityColor, 
  formatDate,
  getDeviceTypeName,
  getLocationName
} from '@/lib/helpers';

// Use the interface that matches IssueData from page.tsx
interface Issue extends Omit<SupabaseIssue, 'created_at' | 'updated_at' | 'resolved_at'> {
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
}

interface ViewIssueFormProps {
  issue: Issue;
  onClose?: () => void;
  onEdit?: () => void;
}

export default function ViewIssueForm({ issue, onClose, onEdit }: ViewIssueFormProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Arıza Detayları</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">{issue.device_name}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(issue.status)}`}>
              {getStatusName(issue.status)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(issue.priority)}`}>
              {getPriorityName(issue.priority)}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700">Cihaz Bilgileri</h4>
            <p className="text-gray-600">
              <span className="font-medium">Tür:</span> {issue.device_type ? getDeviceTypeName(issue.device_type) : 'Belirtilmemiş'}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Konum:</span> {issue.device_location ? getLocationName(issue.device_location) : 'Belirtilmemiş'}
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-700">Bildirim Bilgileri</h4>
            <p className="text-gray-600">
              <span className="font-medium">Bildiren:</span> {issue.reported_by}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Atanan Kişi:</span> {issue.assigned_to || 'Henüz atanmadı'}
            </p>
          </div>
        </div>

        {issue.notes && (
          <div>
            <h4 className="font-medium text-gray-700">Çözüm</h4>
            <p className="text-gray-600 whitespace-pre-wrap">{issue.notes}</p>
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-sm text-gray-500">
            <span className="font-medium">Oluşturulma:</span> {formatDate(issue.created_at)}
          </p>
          {issue.updated_at && (
            <p className="text-sm text-gray-500">
              <span className="font-medium">Son Güncelleme:</span> {formatDate(issue.updated_at)}
            </p>
          )}
          {issue.resolved_at && (
            <p className="text-sm text-gray-500">
              <span className="font-medium">Çözüm Tarihi:</span> {formatDate(issue.resolved_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 