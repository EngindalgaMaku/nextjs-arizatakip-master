'use client';

import { useState, useEffect } from 'react';

// Tablo bilgisi için tip tanımı
interface TableInfo {
  exists: boolean;
  error: string | null;
  hasData: boolean | null;
  rowCount?: number;
}

// API yanıt tipi tanımı
interface DatabaseCheckResult {
  success: boolean;
  message?: string;
  tables: Record<string, TableInfo>;
  error?: string;
}

export default function DatabaseCheckPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DatabaseCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkTables() {
      try {
        setLoading(true);
        const response = await fetch('/api/check-tables');
        const result = await response.json();
        
        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Bilinmeyen bir hata oluştu');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }

    checkTables();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supabase Veritabanı Durum Kontrolü</h1>
        
        {loading && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <p className="text-gray-500">Tablolar kontrol ediliyor...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 p-6 rounded-lg shadow mb-6 border border-red-200">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Hata</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {data && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Tablo Durumları</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tablo Adı
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Veri
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hata Detayı
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(data.tables).map(([tableName, tableInfo]: [string, TableInfo]) => (
                      <tr key={tableName}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tableName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tableInfo.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {tableInfo.exists ? 'Mevcut' : 'Mevcut Değil'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tableInfo.exists ? 
                            (tableInfo.hasData ? `${tableInfo.rowCount} kayıt bulundu` : 'Veri yok') : 
                            'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tableInfo.error ? <span className="text-red-600">{tableInfo.error}</span> : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Supabase Bağlantı Kontrol Özeti</h2>
              <p className="text-gray-600">
                {Object.values(data.tables).every((table: TableInfo) => table.exists) 
                  ? 'Tüm gerekli tablolar Supabase veritabanında mevcut.'
                  : 'Bazı tablolar Supabase veritabanında eksik! Aşağıdaki SQL ifadelerini Supabase SQL Editöründe çalıştırarak eksik tabloları oluşturun.'}
              </p>
              
              {!Object.values(data.tables).every((table: TableInfo) => table.exists) && (
                <div className="mt-4 space-y-4">
                  {!data.tables.settings?.exists && (
                    <div>
                      <h3 className="text-md font-medium mb-2">Settings Tablosu için SQL:</h3>
                      <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
{`CREATE TABLE public.settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  updated_by uuid
);

-- Öğretmen giriş kodu için kayıt ekleme
INSERT INTO settings (key, value, description)
VALUES ('teacher_access_code', '12345', 'Öğretmen giriş kodu');

-- Herkesin okuma erişimi olmasını sağlama
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon SELECT" ON settings FOR SELECT USING (true);`}
                      </pre>
                    </div>
                  )}
                  
                  {!data.tables.issues?.exists && (
                    <div>
                      <h3 className="text-md font-medium mb-2">Issues Tablosu için SQL:</h3>
                      <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
{`CREATE TABLE public.issues (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_type text NOT NULL,
  device_name text NOT NULL,
  device_location text NOT NULL,
  room_number text,
  reported_by text NOT NULL,
  assigned_to text,
  description text NOT NULL,
  status text NOT NULL,
  priority text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  resolved_at timestamp with time zone
);

-- Herkesin erişimi olmasını sağlama
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access" ON issues FOR ALL USING (true);`}
                      </pre>
                    </div>
                  )}
                  
                  {!data.tables.users?.exists && (
                    <div>
                      <h3 className="text-md font-medium mb-2">Users Tablosu için SQL:</h3>
                      <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
{`CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  status text DEFAULT 'active'
);

-- Herkesin erişimi olmasını sağlama
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access" ON users FOR ALL USING (true);`}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 