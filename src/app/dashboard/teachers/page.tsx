'use client';

import { Button } from '@/components/ui/button';
import { getIssues } from '@/lib/supabase';
import { ArrowLeftIcon, ChartBarIcon, ChartPieIcon, CheckCircleIcon, ClockIcon, DocumentTextIcon, UserIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

interface TeacherStats {
  name: string;
  totalIssues: number;
  pendingIssues: number;
  resolvedIssues: number;
  lastReportDate: string | null;
}

export default function TeachersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSortBy, setSelectedSortBy] = useState<string>('name');
  const [selectedSortOrder, setSelectedSortOrder] = useState<'asc' | 'desc'>('asc');
  // Sayfalama için state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Her sayfada 10 öğretmen
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  // Öğretmenleri ve arıza istatistiklerini yükle
  const loadTeacherStats = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Tüm arızaları getir - sayfalama olmadan
      const { data, error } = await getIssues(1, 1000); // Tüm arızaları tek seferde almak için büyük pageSize
      
      if (error) {
        console.error('Arıza verileri yüklenirken hata:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        setTeachers([]);
        setIsLoading(false);
        return;
      }
      
      // Öğretmenlere göre arızaları grupla
      const teacherMap = new Map<string, {
        totalIssues: number;
        pendingIssues: number;
        resolvedIssues: number;
        lastReportDate: string | null;
      }>();
      
      // Her bir arıza için öğretmen istatistiklerini hesapla
      data.forEach(issue => {
        const teacherName = issue.reported_by;
        
        if (!teacherMap.has(teacherName)) {
          teacherMap.set(teacherName, {
            totalIssues: 0,
            pendingIssues: 0,
            resolvedIssues: 0,
            lastReportDate: null
          });
        }
        
        const teacherStats = teacherMap.get(teacherName)!;
        teacherStats.totalIssues++;
        
        // Arıza durumuna göre beklemede veya çözülmüş sayısını güncelle
        if (issue.status === 'cozuldu' || issue.status === 'kapatildi') {
          teacherStats.resolvedIssues++;
        } else {
          teacherStats.pendingIssues++;
        }
        
        // Son rapor tarihini güncelle (en yeni tarih olsun)
        if (!teacherStats.lastReportDate || new Date(issue.created_at ?? '') > new Date(teacherStats.lastReportDate ?? '')) {
          teacherStats.lastReportDate = issue.created_at;
        }
      });
      
      // Map'i diziye dönüştür
      const teacherStatsArray: TeacherStats[] = Array.from(teacherMap.entries()).map(([name, stats]) => ({
        name,
        ...stats
      }));
      
      setTeachers(teacherStatsArray);
      
      // Toplam sayfa sayısını hesapla
      setTotalPages(Math.ceil(teacherStatsArray.length / pageSize));
    } catch (err) {
      console.error('Öğretmen istatistikleri yüklenirken hata:', err);
      Swal.fire({
        title: 'Hata!',
        text: 'Öğretmen istatistikleri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    loadTeacherStats();
  }, [loadTeacherStats]);
  
  // Sayfa değiştiğinde işlemler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Öğretmen adına tıklandığında o öğretmenin arızalarını görüntüle
  const handleViewTeacherIssues = (teacherName: string) => {
    router.push(`/dashboard/issues?reporter=${encodeURIComponent(teacherName)}`);
  };

  // Arama ve sıralama için filtreleme
  const filteredTeachers = teachers
    .filter(teacher => 
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sıralama için karşılaştırma fonksiyonu
      let comparison = 0;
      
      if (selectedSortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (selectedSortBy === 'totalIssues') {
        comparison = a.totalIssues - b.totalIssues;
      } else if (selectedSortBy === 'pendingIssues') {
        comparison = a.pendingIssues - b.pendingIssues;
      } else if (selectedSortBy === 'resolvedIssues') {
        comparison = a.resolvedIssues - b.resolvedIssues;
      } else if (selectedSortBy === 'lastReportDate') {
        comparison = a.lastReportDate && b.lastReportDate 
          ? new Date(a.lastReportDate ?? '').getTime() - new Date(b.lastReportDate ?? '').getTime()
          : 0;
      }
      
      // Sıralama yönü
      return selectedSortOrder === 'asc' ? comparison : -comparison;
    });
    
  // Sayfalanmış öğretmenler listesi
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  // Tüm istatistikler için toplam değerleri hesapla
  const totalStats = teachers.reduce(
    (acc, teacher) => {
      acc.totalIssues += teacher.totalIssues;
      acc.pendingIssues += teacher.pendingIssues;
      acc.resolvedIssues += teacher.resolvedIssues;
      return acc;
    },
    { totalIssues: 0, pendingIssues: 0, resolvedIssues: 0 }
  );
  
  // Grafik için en çok arıza bildiren ilk 5 öğretmeni bul
  const topTeachers = teachers
    .filter(teacher => teacher.totalIssues > 0)
    .sort((a, b) => b.totalIssues - a.totalIssues)
    .slice(0, 5);

  // Tarih formatlama fonksiyonu
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (err) {
      console.error('Tarih formatlanırken hata:', err);
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl font-semibold text-indigo-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen öğretmen verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Öğretmen Arıza İstatistikleri</h1>
        <Link href="/dashboard/issues" passHref>
          <Button variant="outline">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Arızalar Sayfasına Dön
          </Button>
        </Link>
      </div>
      
      <div className="space-y-6">
        <div>
          <p className="text-gray-500 text-sm sm:text-base">Öğretmenlerin bildirdiği arıza kayıtlarına dair istatistikler</p>
        </div>
        
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border-t-4 border-indigo-500 p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-indigo-100 rounded-full">
                <UserIcon className="h-7 w-7 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Öğretmen</p>
                <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border-t-4 border-emerald-500 p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <DocumentTextIcon className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Arıza Bildirimi</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.totalIssues}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border-t-4 border-amber-500 p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <CheckCircleIcon className="h-7 w-7 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Çözülme Oranı</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalStats.totalIssues > 0 
                    ? `%${Math.round((totalStats.resolvedIssues / totalStats.totalIssues) * 100)}` 
                    : '%0'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Özet İstatistik Kartları */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Durum Dağılımı Kartı */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <ChartPieIcon className="h-6 w-6 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Arıza Durumu Dağılımı</h3>
            </div>
            
            <div className="flex justify-center items-center space-x-8 mt-6">
              <div className="text-center">
                <div className="inline-block w-24 h-24 rounded-full border-8 border-amber-400 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-800">{totalStats.pendingIssues}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-600">Bekleyen Arızalar</p>
              </div>
              
              <div className="text-center">
                <div className="inline-block w-24 h-24 rounded-full border-8 border-emerald-400 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-800">{totalStats.resolvedIssues}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-600">Çözülen Arızalar</p>
              </div>
            </div>
            
            <div className="flex justify-center gap-4 mt-6">
              <div className="flex items-center">
                <span className="w-3 h-3 bg-amber-400 rounded-full mr-2"></span>
                <span className="text-sm text-gray-600">Bekleyen</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></span>
                <span className="text-sm text-gray-600">Çözülen</span>
              </div>
            </div>
          </div>
          
          {/* En Çok Arıza Bildiren Öğretmenler Kartı */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <ChartBarIcon className="h-6 w-6 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">En Çok Arıza Bildiren Öğretmenler</h3>
            </div>
            
            {topTeachers.length > 0 ? (
              <div className="space-y-4 mt-6">
                {topTeachers.map(teacher => (
                  <div key={teacher.name} className="flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span 
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900 cursor-pointer"
                        onClick={() => handleViewTeacherIssues(teacher.name)}
                      >
                        {teacher.name}
                      </span>
                      <span className="text-sm font-medium">{teacher.totalIssues} Arıza</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="flex rounded-full h-2.5">
                        <div 
                          className="bg-amber-400 rounded-l-full" 
                          style={{ width: `${(teacher.pendingIssues / teacher.totalIssues) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-emerald-400 rounded-r-full" 
                          style={{ width: `${(teacher.resolvedIssues / teacher.totalIssues) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Bekleyen: {teacher.pendingIssues}</span>
                      <span>Çözülen: {teacher.resolvedIssues}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Henüz arıza kaydı bulunmamaktadır</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Filtreler ve Arama */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div className="w-full md:w-1/2 mb-4 md:mb-0">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Öğretmen Ara
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="search"
                  id="search"
                  placeholder="Öğretmen adına göre ara"
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div>
                <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                  Sıralama Kriteri
                </label>
                <select
                  id="sortBy"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={selectedSortBy}
                  onChange={(e) => setSelectedSortBy(e.target.value)}
                >
                  <option value="name">İsim</option>
                  <option value="totalIssues">Toplam Arıza</option>
                  <option value="pendingIssues">Bekleyen Arıza</option>
                  <option value="resolvedIssues">Çözülen Arıza</option>
                  <option value="lastReportDate">Son Arıza Tarihi</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                  Sıralama Yönü
                </label>
                <select
                  id="sortOrder"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={selectedSortOrder}
                  onChange={(e) => setSelectedSortOrder(e.target.value as 'asc' | 'desc')}
                >
                  <option value="asc">Artan</option>
                  <option value="desc">Azalan</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Öğretmen Tablosu */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {filteredTeachers.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Öğretmen kaydı bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? 'Arama kriterlerinize uygun öğretmen bulunamadı'
                  : 'Henüz arıza bildiren öğretmen bulunmamaktadır'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Öğretmen Adı
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Toplam Arıza
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bekleyen Arıza
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Çözülen Arıza
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Çözülme Oranı
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Son Arıza Tarihi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTeachers.map((teacher) => (
                      <tr key={teacher.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                              <div 
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-900 cursor-pointer"
                                onClick={() => handleViewTeacherIssues(teacher.name)}
                              >
                                {teacher.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {teacher.totalIssues}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <ClockIcon className="h-5 w-5 text-amber-500 mr-1.5" />
                            <span className="text-sm font-medium text-amber-700">{teacher.pendingIssues}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-1.5" />
                            <span className="text-sm font-medium text-emerald-700">{teacher.resolvedIssues}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${teacher.totalIssues > 0 && teacher.resolvedIssues / teacher.totalIssues >= 0.7 
                              ? "bg-green-100 text-green-800" 
                              : teacher.totalIssues > 0 && teacher.resolvedIssues / teacher.totalIssues <= 0.3 
                                ? "bg-red-100 text-red-800" 
                                : "bg-blue-100 text-blue-800"
                              }`}
                          >
                            {teacher.totalIssues > 0 
                              ? `%${Math.round((teacher.resolvedIssues / teacher.totalIssues) * 100)}` 
                              : '%0'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(teacher.lastReportDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Toplam <span className="font-medium">{filteredTeachers.length}</span> öğretmenden{' '}
                        <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>-
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, filteredTeachers.length)}
                        </span>{' '}
                        arası gösteriliyor
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === 1 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Önceki</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Sayfa numaraları */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Sayfa numaralarını akıllıca hesapla
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                            currentPage === totalPages 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Sonraki</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                  
                  {/* Mobil sayfalama */}
                  <div className="flex sm:hidden justify-between items-center">
                    <p className="text-sm text-gray-700">
                      Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                          currentPage === 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Önceki
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                          currentPage === totalPages 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Sonraki
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 