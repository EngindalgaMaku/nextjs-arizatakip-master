'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  gender?: string;
  grade?: string;
  class_name?: string;
  created_at: string;
}

interface OkulOgrenciListesiProps {
  schoolId?: string;
  limit?: number;
  showSearch?: boolean;
}

const OkulOgrenciListesi: React.FC<OkulOgrenciListesiProps> = ({
  schoolId,
  limit = 10,
  showSearch = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true);
        
        // If no school ID is provided, try to get it from the session
        let effectiveSchoolId = schoolId;
        
        if (!effectiveSchoolId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.user_metadata?.school_id) {
            effectiveSchoolId = session.user.user_metadata.school_id;
          }
        }
        
        // Build query for students
        let query = supabase
          .from('students')
          .select('*', { count: 'exact' });
        
        // Add school filter if we have a school ID
        if (effectiveSchoolId) {
          query = query.eq('school_id', effectiveSchoolId);
        }
        
        // Add search if provided
        if (searchTerm) {
          query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }
        
        // Add pagination and ordering
        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) {
          console.error('Error fetching students:', error);
          return;
        }
        
        if (count !== null) {
          setTotalCount(count);
        }
        
        setStudents(data || []);
      } catch (error) {
        console.error('Error in fetchStudents:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudents();
  }, [schoolId, limit, searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          {showSearch && <div className="h-10 bg-gray-200 rounded w-full mb-6"></div>}
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Öğrenci Listesi
          {totalCount > 0 && <span className="ml-2 text-sm text-gray-500">({totalCount} öğrenci)</span>}
        </h3>
        
        {showSearch && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Öğrenci ara..."
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        )}
      </div>
      
      <ul className="divide-y divide-gray-200">
        {students.length === 0 ? (
          <li className="px-6 py-4 text-center text-gray-500">
            {searchTerm ? 'Arama kriterine uygun öğrenci bulunamadı.' : 'Henüz öğrenci kaydı bulunmamaktadır.'}
          </li>
        ) : (
          students.map(student => (
            <li key={student.id} className="px-6 py-4 flex items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {student.first_name} {student.last_name}
                </p>
                <div className="flex items-center mt-1">
                  {student.email && (
                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                  )}
                  {student.class_name && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                      {student.grade || ''} {student.class_name}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
      
      {totalCount > limit && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center">
          <button 
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
            onClick={() => {/* Implement view more logic here */}}
          >
            Tüm Öğrencileri Görüntüle
          </button>
        </div>
      )}
    </div>
  );
};

export default OkulOgrenciListesi; 