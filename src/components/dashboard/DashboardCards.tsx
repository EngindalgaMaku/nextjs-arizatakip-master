'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ExclamationCircleIcon, 
  CheckCircleIcon, 
  UsersIcon, 
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export interface CardData {
  openIssuesCount: number;
  resolvedIssuesCount: number;
  usersCount: number;
  totalIssuesCount: number;
}

interface DashboardCardsProps {
  data: CardData;
  loading?: boolean;
}

const DashboardCards: React.FC<DashboardCardsProps> = ({
  data,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
                  <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Açık Arıza Sayısı */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
              <ExclamationCircleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Bekleyen Arıza</dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">{data.openIssuesCount}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <Link href="/dashboard/issues" className="font-medium text-blue-600 hover:text-blue-500">
              Tüm arızaları görüntüle
            </Link>
          </div>
        </div>
      </div>

      {/* Çözülen Arıza Sayısı */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Çözülen Arıza</dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">{data.resolvedIssuesCount}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <Link href="/dashboard/reports" className="font-medium text-blue-600 hover:text-blue-500">
              Raporları görüntüle
            </Link>
          </div>
        </div>
      </div>

      {/* Toplam Kullanıcı Sayısı */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <UsersIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Kullanıcılar</dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">{data.usersCount}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <Link href="/dashboard/users" className="font-medium text-blue-600 hover:text-blue-500">
              Kullanıcıları yönet
            </Link>
          </div>
        </div>
      </div>

      {/* Toplam Arıza Sayısı */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
              <DocumentTextIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Toplam Arıza</dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">{data.totalIssuesCount}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <Link href="/dashboard/settings" className="font-medium text-blue-600 hover:text-blue-500">
              Sistem ayarları
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCards; 