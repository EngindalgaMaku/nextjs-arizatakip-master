'use client';

import { Button } from '@/components/ui/button';
import { deleteIssue, DeviceLocation, DeviceType, getIssue, getIssues, Issue, IssuePriority, IssueStatus, supabase } from '@/lib/supabase';
import { ArrowRightIcon, EyeIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import AddIssueForm from './add-form';
import EditIssueForm from './edit-form';
import ViewIssueForm from './view-issue-form';

interface IssueData extends Omit<Issue, 'created_at' | 'updated_at' | 'resolved_at'> {
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null; 
}

// IssueList component that encapsulates the issue list functionality
const IssueList = ({ 
  selectedId, 
  onSelectIssue, 
  isAddModalOpen,
  setIsAddModalOpen,
  isViewModalOpen,
  setIsViewModalOpen,
  isEditModalOpen,
  setIsEditModalOpen,
  currentIssue,
  setCurrentIssue
}: {
  selectedId?: string | null;
  onSelectIssue?: (issue: IssueData | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isViewModalOpen: boolean;
  setIsViewModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEditModalOpen: boolean;
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentIssue: IssueData | null;
  setCurrentIssue: React.Dispatch<React.SetStateAction<IssueData | null>>;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedReporter, setSelectedReporter] = useState<string>('all');
  const [isAddFormSubmitted, setIsAddFormSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Arızaları yükle
  const loadIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Gerçek API çağrısı yap - sayfalama ile
      const { data, error, totalPages: pages, totalCount: count } = await getIssues(currentPage, pageSize);
      
      if (error) {
        console.error('Supabase veri çekme hatası:', error);
        throw error;
      }
      
      // Toplam sayfa ve kayıt sayısını güncelle
      setTotalPages(pages || 1); // Eğer pages değeri 0 ise, en az 1 sayfa olmalı
      setTotalCount(count || 0);
      
      if (!data || data.length === 0) {
        setIssues([]);
        setIsLoading(false);
        return;
      }
      
      // API'den gelen veriyi formata
      const formattedIssues = data.map(issue => ({
        id: issue.id,
        device_type: issue.device_type as DeviceType,
        device_name: issue.device_name,
        device_location: issue.device_location as DeviceLocation,
        room_number: issue.room_number ?? '-',
        reported_by: issue.reported_by,
        assigned_to: issue.assigned_to,
        description: issue.description,
        status: issue.status as IssueStatus,
        priority: issue.priority as IssuePriority,
        notes: issue.notes,
        created_at: issue.created_at ? new Date(issue.created_at).toLocaleString('tr-TR') : '-',
        updated_at: issue.updated_at ? new Date(issue.updated_at).toLocaleString('tr-TR') : '-',
        resolved_at: issue.resolved_at ? new Date(issue.resolved_at).toLocaleString('tr-TR') : '-'
      }));
      
      setIssues(formattedIssues);
    } catch (err) {
      console.error('Arızalar yüklenirken hata oluştu:', err);
      Swal.fire({
        title: 'Hata!',
        text: 'Arızalar yüklenirken bir hata oluştu. Lütfen Supabase ayarlarınızı kontrol edin veya yönetici ile iletişime geçin.',
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
      // Boş liste göster
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);
  
  // Supabase realtime aboneliği
  useEffect(() => {
    console.log('Admin realtime aboneliği kuruluyor...');
    
    const issueSubscription = supabase
      .channel('admin-issues-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'issues'
        },
        (payload) => {
          console.log('Yeni arıza bildirimi alındı:', payload);
          const newIssue = payload.new as Issue;
          
          // Listeyi güncelle
          loadIssues();
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
      });
    
    return () => {
      console.log('Realtime aboneliği sonlandırılıyor...');
      if (issueSubscription) {
        supabase.removeChannel(issueSubscription);
      }
    };
  }, [loadIssues]);
  
  // Sayfa değiştiğinde işlemler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // URL'den parametreleri kontrol et
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const issueId = params.get('id');
      const openAddForm = params.get('open') === 'add';
      const filterStatus = params.get('filter');
      const filterReporter = params.get('reporter');
      
      // URL'de ID varsa o arıza detayını göster
      if (issueId) {
        const loadIssueDetails = async () => {
          try {
            // Doğrudan belirli ID'li arızayı çek
            const { data, error } = await getIssue(issueId);
            
            if (error || !data) {
              console.error('Arıza detayları yüklenirken hata oluştu:', error);
              Swal.fire({
                title: 'Hata!',
                text: 'Arıza detayları yüklenirken bir hata oluştu.',
                icon: 'error',
                confirmButtonText: 'Tamam'
              });
              return;
            }
            
            // Veriyi IssueData formatına çevir
            const formattedIssue: IssueData = {
              id: data.id,
              device_type: data.device_type as DeviceType,
              device_name: data.device_name,
              device_location: data.device_location as DeviceLocation,
              room_number: data.room_number ?? '-',
              reported_by: data.reported_by,
              assigned_to: data.assigned_to,
              description: data.description,
              status: data.status as IssueStatus,
              priority: data.priority as IssuePriority,
              notes: data.notes,
              created_at: data.created_at ? new Date(data.created_at).toLocaleString('tr-TR') : '-',
              updated_at: data.updated_at ? new Date(data.updated_at).toLocaleString('tr-TR') : '-',
              resolved_at: data.resolved_at ? new Date(data.resolved_at).toLocaleString('tr-TR') : '-'
            };
            
            setCurrentIssue(formattedIssue);
            setIsViewModalOpen(true);
          } catch (err) {
            console.error('Arıza detayları yüklenirken hata oluştu:', err);
          }
        };
        
        // Eğer issues yüklendiyse ve ID'yi içeriyorsa, zaten listelerde var demektir
        // Değilse, direkt olarak çekelim
        const existingIssue = issues.find(issue => issue.id === issueId);
        if (existingIssue) {
          setCurrentIssue(existingIssue);
          setIsViewModalOpen(true);
        } else if (!isLoading) { // Sayfa yüklemesi bitince direkt arızayı çek
          loadIssueDetails();
        }
      }
      
      // "open=add" parametresi varsa yeni arıza ekleme formunu aç
      if (openAddForm) {
        setIsAddModalOpen(true);
      }
      
      // "filter" parametresi varsa o duruma göre filtrele
      if (filterStatus) {
        setSelectedStatus(filterStatus);
      }

      // "reporter" parametresi varsa gönderene göre filtrele
      if (filterReporter) {
        setSelectedReporter(filterReporter);
      }
    }
  }, [issues, isLoading, loadIssues, setIsAddModalOpen]);

  // Filtre based on search term, status, and device type
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = 
      (issue.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) || 
      (issue.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (issue.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (issue.reported_by?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = selectedStatus === 'all' || issue.status === selectedStatus;
    const matchesType = selectedType === 'all' || issue.device_type === selectedType;
    const matchesLocation = selectedLocation === 'all' || issue.device_location === selectedLocation;
    const matchesReporter = selectedReporter === 'all' || issue.reported_by === selectedReporter;
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation && matchesReporter;
  });

  const handleDeleteIssue = async (issueId: string) => {
    Swal.fire({
      title: 'Bu arıza kaydını silmek istediğinizden emin misiniz?',
      text: 'Bu işlem geri alınamaz!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, sil',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { error } = await deleteIssue(issueId);
          if (error) throw error;
          
          // UI'dan arızayı kaldır (optimistic update)
          setIssues(issues.filter(issue => issue.id !== issueId));
          
          Swal.fire({
            title: 'Başarılı!',
            text: 'Arıza kaydı başarıyla silindi',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (error) {
          console.error('Arıza kaydı silinirken hata oluştu:', error);
          Swal.fire({
            title: 'Hata!',
            text: 'Arıza kaydı silinirken bir hata oluştu. Lütfen tekrar deneyin.',
            icon: 'error',
            confirmButtonText: 'Tamam'
          });
        }
      }
    });
  };

  const viewIssueDetails = (issue: IssueData) => {
    setCurrentIssue(issue);
    setIsViewModalOpen(true);
    
    // URL'i güncelle (tarayıcı geçmişine ekleyerek)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('id', issue.id);
      window.history.pushState({}, '', url.toString());
    }
  };
  
  // Modal kapatıldığında URL'i temizle
  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setCurrentIssue(null);
    
    // URL'i temizle
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.toString());
    }
  };

  const openEditModal = (issue: IssueData) => {
    setCurrentIssue(issue);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentIssue(null);
  };

  const closeAddModal = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsAddModalOpen(false);
    if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('open');
        window.history.pushState({}, '', url.toString());
    }
  };

  // Cihaz tipi çeviri fonksiyonu
  const getDeviceTypeName = (type: DeviceType): string => {
    const typeNames: Record<DeviceType, string> = {
      'akilli_tahta': 'Akıllı Tahta',
      'bilgisayar': 'Bilgisayar',
      'yazici': 'Yazıcı',
      'projektor': 'Projektör',
      'diger': 'Diğer'
    };
    return typeNames[type] || type;
  };

  // Konum çeviri fonksiyonu
  const getLocationName = (location: DeviceLocation): string => {
    const locationNames: Record<DeviceLocation, string> = {
      'sinif': 'Sınıf',
      'laboratuvar': 'Laboratuvar',
      'idare': 'İdare',
      'ogretmenler_odasi': 'Öğretmenler Odası',
      'diger': 'Diğer'
    };
    return locationNames[location] || location;
  };

  // Durum çeviri fonksiyonu
  const getStatusName = (status: IssueStatus): string => {
    const statusNames: Record<IssueStatus, string> = {
      'beklemede': 'Beklemede',
      'atandi': 'Atandı',
      'inceleniyor': 'İnceleniyor',
      'cozuldu': 'Çözüldü',
      'kapatildi': 'Kapatıldı'
    };
    return statusNames[status] || status;
  };

  // Durum rengi belirleme fonksiyonu
  const getStatusColor = (status: IssueStatus): string => {
    const colors: Record<IssueStatus, string> = {
      'beklemede': 'bg-yellow-100 text-yellow-800',
      'atandi': 'bg-blue-100 text-blue-800',
      'inceleniyor': 'bg-purple-100 text-purple-800',
      'cozuldu': 'bg-green-100 text-green-800',
      'kapatildi': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Öncelik rengi belirleme fonksiyonu
  const getPriorityColor = (priority: IssuePriority): string => {
    const colors: Record<IssuePriority, string> = {
      'dusuk': 'bg-blue-100 text-blue-800',
      'normal': 'bg-green-100 text-green-800',
      'yuksek': 'bg-orange-100 text-orange-800',
      'kritik': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  // Arıza ekleme başarılı olduğunda çağrılacak fonksiyon
  const handleAddSuccess = () => {
    setIsAddFormSubmitted(true);
    setIsAddModalOpen(false);
    loadIssues();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl font-semibold text-indigo-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen arıza verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6"> 
      {filteredIssues.length === 0 ? (
        <div className="py-10 px-4 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Arıza kaydı bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedStatus !== 'all' || selectedType !== 'all' || selectedLocation !== 'all' || selectedReporter !== 'all' 
              ? 'Arama kriterlerinize uygun arıza kaydı bulunamadı' 
              : 'Henüz arıza kaydı bulunmamaktadır'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200"> 
          {filteredIssues.map((issue: IssueData) => (
            <li key={issue.id} className="px-4 py-4 sm:px-0">
              <div 
                className="bg-white overflow-hidden border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => viewIssueDetails(issue)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                        <span className="text-indigo-700 font-medium">{getDeviceTypeName(issue.device_type as any).charAt(0)}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{issue.device_name}</div>
                        <div className="text-xs text-gray-500">{getDeviceTypeName(issue.device_type as any)}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusColor(issue.status as any)}`}>
                      {getStatusName(issue.status as any)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap text-sm text-gray-500 mt-2">
                    <div className="w-1/2 mb-1">
                      <span className="font-medium">Konum:</span> {getLocationName(issue.device_location as any)} ({issue.room_number})
                    </div>
                    <div className="w-1/2 mb-1">
                      <span className="font-medium">Öncelik:</span> <span className={`px-1.5 py-0.5 rounded-full text-xs ${getPriorityColor(issue.priority as any)}`}>
                        {(issue.priority as any) === 'dusuk' ? 'Düşük' :
                          (issue.priority as any) === 'normal' ? 'Normal' :
                          (issue.priority as any) === 'yuksek' ? 'Yüksek' :
                          (issue.priority as any) === 'kritik' ? 'Kritik' : issue.priority}
                      </span>
                    </div>
                    <div className="w-full mb-1">
                      <span className="font-medium">Oluşturan:</span> {issue.reported_by}
                    </div>
                    <div className="w-full">
                      <span className="font-medium">Tarih:</span> {issue.created_at}
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end space-x-2">
                    <button
                      className="p-2 rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewIssueDetails(issue);
                      }}
                      title="Detay Görüntüle"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button
                      className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIssue(issue.id);
                      }}
                      title="Sil"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* View Modal */}
      {isViewModalOpen && currentIssue && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div
            className="modal-content max-w-2xl mx-auto mt-4 sm:mt-20 p-4 sm:p-5 rounded-lg shadow-lg bg-white overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <h2 className="text-xl font-bold">Arıza Detayları</h2>
              <button
                onClick={closeViewModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ViewIssueForm 
              issue={currentIssue} 
              onEdit={() => {
                setIsViewModalOpen(false);
                setIsEditModalOpen(true);
              }}
            />
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeViewModal}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 mr-2"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                Düzenle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && currentIssue && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-content max-w-2xl mx-auto mt-4 sm:mt-20 p-4 sm:p-5 rounded-lg shadow-lg bg-white overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <h2 className="text-xl font-bold">Arıza Düzenle</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EditIssueForm
              issue={currentIssue}
              onSuccess={() => {
                setIsEditModalOpen(false);
                loadIssues();
              }}
              onClose={() => setIsEditModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={closeAddModal}>
          <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-2xl w-full overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Yeni Arıza Ekle</h2>
              <button
                onClick={closeAddModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <AddIssueForm 
                onClose={closeAddModal} 
                onSuccess={handleAddSuccess}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Toplam <span className="font-medium">{totalCount}</span> kayıttan <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> arası gösteriliyor
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Önceki</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                {/* Current page indicator - Can be expanded to show more page numbers */} 
                 {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Show only a few pages around the current one for large totalPages
                  const showPage = totalPages <= 5 || 
                                  pageNum === 1 || 
                                  pageNum === totalPages || 
                                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                  
                  const showEllipsisBefore = totalPages > 5 && currentPage > 3 && pageNum === currentPage - 2;
                  const showEllipsisAfter = totalPages > 5 && currentPage < totalPages - 2 && pageNum === currentPage + 2;

                  if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                           <span key={`ellipsis-${pageNum}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                            ...
                          </span>
                      );
                  }
                  
                  if (showPage) {
                      return (
                           <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            aria-current={currentPage === pageNum ? 'page' : undefined}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNum ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                            >
                            {pageNum}
                            </button>
                      );
                  }
                  return null; // Don't render buttons for hidden pages
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Sonraki</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function IssuesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<IssueData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectIssue = (issue: IssueData | null) => {
    if (issue) {
      setCurrentIssue(issue);
      setIsViewModalOpen(true);
      setSelectedId(issue.id);
    } else {
      setCurrentIssue(null);
      setIsViewModalOpen(false);
      setSelectedId(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Arızalar Yönetimi</h1>
        <div className="flex space-x-2">
          <Link href="/dashboard/teachers" passHref>
            <Button variant="outline">
              Öğretmen İstatistikleri
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusCircleIcon className="mr-2 h-4 w-4" /> Yeni Arıza Ekle
          </Button>
        </div>
      </div>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6">
          <IssueList 
            selectedId={selectedId}
            onSelectIssue={handleSelectIssue} 
            isAddModalOpen={isAddModalOpen}
            setIsAddModalOpen={setIsAddModalOpen}
            isViewModalOpen={isViewModalOpen}
            setIsViewModalOpen={setIsViewModalOpen}
            isEditModalOpen={isEditModalOpen}
            setIsEditModalOpen={setIsEditModalOpen}
            currentIssue={currentIssue}
            setCurrentIssue={setCurrentIssue}
          />
        </div>
      </div>
    </div>
  );
} 