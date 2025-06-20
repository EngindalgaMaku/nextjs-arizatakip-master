'use client';

import React from 'react';

interface DemographicData {
  label: string;
  value: number | string;
  change?: number;
}

interface DemographicTableProps {
  data?: DemographicData[];
  title?: string;
  loading?: boolean;
}

const DemographicTable: React.FC<DemographicTableProps> = ({
  data = [],
  title = 'Demografi Bilgileri',
  loading = false
}) => {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-4">Henüz veri bulunmamaktadır.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <div className="flow-root">
          <ul className="-my-5 divide-y divide-gray-200">
            {data.map((item, index) => (
              <li key={index} className="py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500 mr-2">{item.value}</p>
                    {item.change !== undefined && (
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.change > 0 
                            ? 'bg-green-100 text-green-800' 
                            : item.change < 0 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.change > 0 ? '+' : ''}{item.change}%
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DemographicTable; 