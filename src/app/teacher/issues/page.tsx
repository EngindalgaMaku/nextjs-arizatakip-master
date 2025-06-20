'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getIssuesForTeacher, deleteIssue as deleteIssueFromDB, Issue, DeviceType, DeviceLocation, IssueStatus, IssuePriority, supabase } from '@/lib/supabase';
import AddIssueForm from './add-form';
import TeacherEditForm from './edit-form';
import { PlusIcon, ArrowRightOnRectangleIcon, AdjustmentsHorizontalIcon, ComputerDesktopIcon, FilmIcon, PrinterIcon, DevicePhoneMobileIcon, MapPinIcon, ClockIcon, TrashIcon, PresentationChartBarIcon, DeviceTabletIcon } from '@heroicons/react/24/outline';
import { deleteCookie } from 'cookies-next';
import Swal from 'sweetalert2';
import { showBrowserNotification, playAlertSound } from '@/lib/notification';

// Format date function
const formatDate = (date: Date | string | null): string => {
  try {
    if (!date) return '-';
    
    // Önce standart tarih formatını deneyelim
    let dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Eğer geçersiz bir tarih oluştuysa ve format "DD.MM.YYYY" veya "DD.MM.YYYY HH:MM" gibi ise
    if (isNaN(dateObj.getTime()) && typeof date === 'string' && date.includes('.')) {
      const parts = date.split(' ');
      const datePart = parts[0];
      const timePart = parts.length > 1 ? parts[1] : '';
      
      const [day, month, year] = datePart.split('.').map(part => parseInt(part, 10));
      
      if (timePart) {
        const [hours, minutes] = timePart.split(':').map(part => parseInt(part, 10));
        dateObj = new Date(year, month - 1, day, hours, minutes);
      } else {
        dateObj = new Date(year, month - 1, day);
      }
    }
    
    // Geçerli bir tarih değeri mi kontrol et
    if (isNaN(dateObj.getTime())) {
      console.warn('Geçersiz tarih formatı:', date);
      return 'Geçersiz tarih formatı';
    }
    
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    console.error('Tarih formatı hatası:', error, 'Tarih değeri:', date);
    return 'Tarih işlenemedi';
  }
};

interface IssueData extends Omit<Issue, 'created_at' | 'updated_at' | 'resolved_at'> {
  created_at: string | null;
  updated_at: string | null;
  resolved_at: string | null; 
}

interface TeacherUser {
  name: string;
  role: string;
  loginTime: string;
}

// Helper functions for display
function getDeviceTypeName(type: any) {
  switch (type) {
    case 'bilgisayar': return 'Bilgisayar';
    case 'projektor': return 'Projektör';
    case 'yazici': return 'Yazıcı';
    case 'diger': return 'Diğer';
    default: return type;
  }
}

function getLocationName(location: DeviceLocation) {
  switch (location) {
    case 'sinif': return 'Sınıf';
    case 'ogretmenler_odasi': return 'Öğretmenler Odası';
    case 'laboratuvar': return 'Laboratuvar';
    case 'idare': return 'İdare';
    case 'diger': return 'Diğer';
    default: return location;
  }
}

function getStatusName(status: IssueStatus) {
  switch (status) {
    case 'beklemede': return 'Beklemede';
    case 'inceleniyor': return 'İnceleniyor';
    case 'atandi': return 'Atandı';
    case 'cozuldu': return 'Çözüldü';
    case 'kapatildi': return 'Kapatıldı';
    default: return status;
  }
}

export default function TeacherIssuesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFormSubmitted, setIsAddFormSubmitted] = useState(false);
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<IssueData | null>(null);
  // Sayfalama için state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const router = useRouter();
  
  // Arızaları yükle
  const loadIssues = useCallback(async () => {
    if (!teacher?.name) return;
    
    try {
      setIsLoading(true);
      
      // Gerçek API çağrısı - sayfalama ile
      const { data, error, totalPages: pages, totalCount: count } = await getIssuesForTeacher(teacher.name, currentPage, pageSize);
      
      if (error) {
        console.error('Arızalar yüklenirken hata oluştu:', error);
        throw error;
      }
      
      // Toplam sayfa ve kayıt sayısını güncelle
      setTotalPages(pages);
      setTotalCount(count);
      
      if (!data || data.length === 0) {
        setIssues([]);
        setIsLoading(false);
        return;
      }
      
      // API'den gelen veriyi formata
      const formattedIssues = data.map(issue => ({
        id: issue.id,
        device_type: issue.device_type,
        device_name: issue.device_name,
        device_location: issue.device_location,
        room_number: issue.room_number,
        reported_by: issue.reported_by,
        assigned_to: issue.assigned_to,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        notes: issue.notes,
        created_at: issue.created_at, // Ham tarih verisi
        updated_at: issue.updated_at,
        resolved_at: issue.resolved_at
      }));
      
      setIssues(formattedIssues);
    } catch (err) {
      console.error('Arızalar yüklenirken hata oluştu:', err);
      Swal.fire({
        title: 'Hata!',
        text: 'Arızalar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
      // Hata durumunda boş liste göster
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  }, [teacher, currentPage, pageSize]);

  // Öğretmen giriş kontrolü
  useEffect(() => {
    const checkTeacherAuth = () => {
      if (typeof window !== 'undefined') {
        const teacherData = localStorage.getItem('teacherUser');
        if (!teacherData) {
          router.push('/teacher/login');
          return;
        }
        
        try {
          const parsedTeacher = JSON.parse(teacherData) as TeacherUser;
          setTeacher(parsedTeacher);
          
          // Login süresi kontrolü kaldırıldı - Kullanıcı logout olana kadar oturumu açık kalacak
        } catch (error) {
          console.error('Öğretmen verisi ayrıştırılamadı:', error);
          localStorage.removeItem('teacherUser');
          router.push('/teacher/login');
        }
      }
    };
    
    // Load issues
    loadIssues();
    
    // Check for teacher authentication
    checkTeacherAuth();
  }, [router]);

  // Öğretmen değiştiğinde arızaları yükle
  useEffect(() => {
    if (teacher) {
      loadIssues();
    }
  }, [teacher, loadIssues, isAddFormSubmitted]);

  // Sayfa değiştiğinde işlemler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Filtre based on search term, status, and device type
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = 
      (issue.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) || 
      (issue.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (issue.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = selectedStatus === 'all' || issue.status === selectedStatus;
    const matchesType = selectedType === 'all' || issue.device_type === selectedType;
    const matchesLocation = selectedLocation === 'all' || issue.device_location === selectedLocation;
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  // Durum çeviri fonksiyonu
  const getStatusColor = (status: IssueStatus): string => {
    const colors: Record<IssueStatus, string> = {
      'beklemede': 'status-badge status-badge-beklemede',
      'atandi': 'status-badge status-badge-atandi',
      'inceleniyor': 'status-badge status-badge-inceleniyor',
      'cozuldu': 'status-badge status-badge-cozuldu',
      'kapatildi': 'status-badge status-badge-kapatildi'
    };
    return colors[status] || 'status-badge';
  };
  
  // Arıza ekleme başarılı olduğunda çağrılacak fonksiyon
  const handleAddSuccess = () => {
    setIsAddFormSubmitted(true);
    setIsAddModalOpen(false);
    loadIssues();
  };

  // Öğretmen oturumunu kapatma
  const handleLogout = () => {
    Swal.fire({
      title: 'Çıkış yapmak istediğinizden emin misiniz?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet, çıkış yap',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          // Merkezi logout rotasını kullan
          router.push('/logout?redirectTo=/teacher/login');
        } catch (error) {
          console.error('Çıkış yaparken hata:', error);
          
          // Hata olursa manuel olarak temizleme yap
          // Local Storage'dan kullanıcı bilgilerini sil
          localStorage.removeItem('teacherUser');
          
          // "Bu cihazda beni hatırla" bilgisini de sil
          localStorage.removeItem('teacher_remembered_device');
          
          // Cookie'den sil  
          deleteCookie('teacher-session', { path: '/' });
          
          // Login sayfasına yönlendir
          router.push('/teacher/login');
        }
      }
    });
  };

  // Arıza silme fonksiyonu
  const handleDeleteIssue = async (issueId: string) => {
    // Önce arızayı bul
    const issue = issues.find(issue => issue.id === issueId);
    
    if (!issue) return;
    
    // Beklemede durumunda değilse silme işlemine izin verme
    if (issue.status !== 'beklemede') {
      Swal.fire({
        title: 'Silme İşlemi Yapılamaz',
        text: 'Gönderdiğiniz arıza işleme alınmıştır. Silme işlemi yapamazsınız.',
        icon: 'warning',
        confirmButtonText: 'Tamam',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Beklemede durumundaysa normal silme işlemine devam et
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
          const { error } = await deleteIssueFromDB(issueId);
          
          if (error) {
            Swal.fire({
              title: 'Hata!',
              text: 'Arıza silinirken bir hata oluştu: ' + error.message,
              icon: 'error',
              confirmButtonText: 'Tamam',
              confirmButtonColor: '#3085d6'
            });
            return;
          }
          
          // Başarılı silme işlemi sonrası listeyi güncelle
          setIssues(prev => prev.filter(issue => issue.id !== issueId));
          
          Swal.fire({
            title: 'Başarılı!',
            text: 'Arıza başarıyla silindi',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (err) {
          console.error('Arıza silme hatası:', err);
          Swal.fire({
            title: 'Hata!',
            text: 'Arıza silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
            icon: 'error',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#3085d6'
          });
        }
      }
    });
  };

  // Arıza düzenleme fonksiyonu
  const handleEditIssue = (issueId: string) => {
    // Önce arızayı bul
    const issue = issues.find(issue => issue.id === issueId);
    
    if (!issue) return;
    
    // Beklemede durumunda değilse düzenleme işlemine izin verme
    if (issue.status !== 'beklemede') {
      Swal.fire({
        title: 'Düzenleme İşlemi Yapılamaz',
        text: 'Gönderdiğiniz arıza işleme alınmıştır. Düzenleme işlemi yapamazsınız.',
        icon: 'warning',
        confirmButtonText: 'Tamam',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    
    // Beklemede durumundaysa düzenleme modalını aç
    setCurrentIssue(issue);
    setIsEditModalOpen(true);
  };

  // Modal kapatma fonksiyonu
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentIssue(null);
  };

  // Düzenleme başarılı olduğunda çağrılacak fonksiyon
  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setCurrentIssue(null);
    loadIssues();
  };

  // Modal kapatma fonksiyonu  
  const closeAddModal = (e?: React.MouseEvent) => {
    if (isAddFormSubmitted) {
      e?.stopPropagation();
      return;
    }
    
    Swal.fire({
      title: 'Form kapatılacak',
      text: 'Devam etmek istiyor musunuz? Girdiğiniz bilgiler kaybolacak.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        setIsAddModalOpen(false);
      }
    });
  };

  // Hoş Geldiniz bildirimi (sayfa ilk yüklendiğinde)
  useEffect(() => {
    if (teacher?.name && !isLoading && issues.length >= 0) {
      showBrowserNotification({
        title: 'Öğretmen Paneline Hoş Geldiniz',
        body: `${teacher.name}, açık arıza sayınız: ${issues.filter(i => i.status !== 'cozuldu' && i.status !== 'kapatildi').length}`
      });
    }
  }, [teacher?.name, isLoading, issues.length]);
  
  // Ses dosyasını preload et
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Ses dosyası önceden yükleniyor...');
      const preloadAudio = new Audio('/notification-alert.mp3');
      preloadAudio.preload = 'auto';
      
      // Tarayıcı kısıtlamalarını aşmak için sessiz bir event ile önbelleğe alma
      const handleUserInteraction = () => {
        preloadAudio.volume = 0.01; // Çok düşük ses
        preloadAudio.play()
          .then(() => {
            setTimeout(() => preloadAudio.pause(), 10);
            preloadAudio.volume = 1;
            console.log('Ses dosyası başarıyla yüklendi');
            document.removeEventListener('click', handleUserInteraction);
          })
          .catch(() => console.log('Ses dosyası yüklenemedi, kullanıcı etkileşimi gerekebilir'));
      };
      
      // Kullanıcı etkileşimi bekle
      document.addEventListener('click', handleUserInteraction, { once: true });
    }
  }, []);

  // Supabase realtime aboneliği
  useEffect(() => {
    if (!teacher?.name) return;
    
    console.log('Realtime aboneliği oluşturuluyor...');
    
    // Öğretmenin bildirdiği arızaları dinlemek için abonelik oluştur
    const issueSubscription = supabase
      .channel('teacher-issues-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'issues',
          filter: `reported_by=eq.${teacher.name}`
        },
        (payload) => {
          console.log('Arıza güncelleme bildirimi alındı:', payload);
          const updatedIssue = payload.new as Issue;
          const oldIssue = payload.old as Issue;
          
          // Status değişikliğini kontrol et
          if (updatedIssue.status !== oldIssue.status) {
            console.log(`Arıza durumu değişti: ${oldIssue.status} -> ${updatedIssue.status}`);
            
            try {
              // İki ses dosyasını sırayla çal
              // İlk ses dosyası (notification-alert.mp3)
              const firstAudio = new Audio('/notification-alert.mp3');
              firstAudio.volume = 1.0;
              
              // İkinci ses dosyası (notification-return.mp3)
              const secondAudio = new Audio('/notification-return.mp3');
              secondAudio.volume = 1.0;
              
              // İlk ses bittiğinde ikinci sesi çal
              firstAudio.onended = () => {
                console.log('İlk ses bitti, ikinci ses çalınıyor...');
                secondAudio.play()
                  .then(() => console.log('İkinci ses başarıyla çalındı'))
                  .catch(err => console.error('İkinci ses çalma hatası:', err));
              };
              
              // İlk sesi çal
              const playPromise = firstAudio.play();
              
              if (playPromise !== undefined) {
                playPromise
                  .then(() => console.log('İlk ses başarıyla çalınıyor'))
                  .catch(err => {
                    console.error('İlk ses çalma hatası:', err);
                    // İlk ses çalınamazsa ikinci sesi denemeyi dene
                    secondAudio.play()
                      .then(() => console.log('İkinci ses çalınıyor (ilk ses başarısız olduğu için)'))
                      .catch(err2 => {
                        console.error('İkinci ses de çalınamadı:', err2);
                        // Sadece iki ses de çalınamazsa DOM yöntemini kullan
                        tryDOMPlayback();
                      });
                  });
              }
              
              // DOM yöntemiyle çalma fonksiyonu - sadece Audio API başarısız olduğunda kullanılır
              function tryDOMPlayback() {
                try {
                  console.log('DOM yöntemiyle ses çalmayı deniyorum...');
                  // Ses elementlerini oluştur
                  const audioElement1 = document.createElement('audio');
                  audioElement1.id = 'notification-sound-1';
                  audioElement1.src = '/notification-alert.mp3';
                  audioElement1.volume = 1.0;
                  
                  const audioElement2 = document.createElement('audio');
                  audioElement2.id = 'notification-sound-2';
                  audioElement2.src = '/notification-return.mp3';
                  audioElement2.volume = 1.0;
                  
                  // İlk ses bitince ikinci sesi çal
                  audioElement1.onended = () => {
                    audioElement2.play()
                      .then(() => console.log('DOM: İkinci ses başarıyla çalındı'))
                      .catch(err => console.error('DOM: İkinci ses çalma hatası:', err));
                  };
                  
                  // Temizlik için
                  audioElement2.onended = () => {
                    if (document.body.contains(audioElement1)) {
                      document.body.removeChild(audioElement1);
                    }
                    if (document.body.contains(audioElement2)) {
                      document.body.removeChild(audioElement2);
                    }
                  };
                  
                  // DOM'a ekle
                  document.body.appendChild(audioElement1);
                  document.body.appendChild(audioElement2);
                  
                  // İlk sesi çal
                  audioElement1.play()
                    .then(() => console.log('DOM: İlk ses başarıyla çalınıyor'))
                    .catch(err => console.error('DOM: İlk ses çalma hatası:', err));
                } catch (domError) {
                  console.error('DOM ses çalma hatası:', domError);
                }
              }
            } catch (error) {
              console.error('Ses bildirimi çalınırken hata:', error);
            }
          }
          
          // Bildirim göster
          showBrowserNotification({
            title: 'Arıza bildirimine dönüş yapılmıştır',
            body: `"${updatedIssue.device_name}" cihazı için bildiriminizin durumu "${getStatusName(updatedIssue.status)}" olarak güncellendi.`,
            url: `/teacher/issues?id=${updatedIssue.id}`
          });
          
          // State'i güncelle
          setIssues(prev => prev.map(issue => 
            issue.id === updatedIssue.id ? {...issue, ...updatedIssue} : issue
          ));
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
      });
    
    // Aboneliği kaydet
    setSubscription(issueSubscription);
    
    // Temizlik fonksiyonu
    return () => {
      console.log('Realtime aboneliği sonlandırılıyor...');
      if (issueSubscription) {
        // Aboneliği sonlandır
        supabase.removeChannel(issueSubscription);
        setSubscription(null);
      }
    };
  }, [teacher?.name]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-3xl font-semibold text-blue-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen arıza verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return null; // Yönlendirme beklenirken boş sayfa göster
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="teacher-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Hüsniye Özdilek Ticaret M.T.A.L.</h1>
              <p className="mt-1 text-gray-500">Merhaba, {teacher.name}! ATSİS</p>
            </div>
            {/* Masaüstünde göster, mobilde gizle */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center px-4 py-2 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Filtreler ve Arama */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4 md:mb-0">Arıza Bildirimlerim</h2>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Arıza Bildir
            </button>
          </div>
          
          {/* Arama */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="search"
                id="search"
                placeholder="Cihaz adı, arıza açıklaması veya oda numarası ile ara"
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* Filtreler - sadece tablet ve masaüstünde göster */}
          <div className="hidden md:grid md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="status-filter" className="block text-xs text-gray-500 mb-1">Durum</label>
              <select
                id="status-filter"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tüm Durumlar</option>
                <option value="beklemede">Beklemede</option>
                <option value="atandi">Atandı</option>
                <option value="inceleniyor">İnceleniyor</option>
                <option value="cozuldu">Çözüldü</option>
                <option value="kapatildi">Kapatıldı</option>
              </select>
            </div>

            <div>
              <label htmlFor="type-filter" className="block text-xs text-gray-500 mb-1">Cihaz Türü</label>
              <select
                id="type-filter"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">Tüm Cihazlar</option>
                <option value="akilli_tahta">Akıllı Tahta</option>
                <option value="bilgisayar">Bilgisayar</option>
                <option value="yazici">Yazıcı</option>
                <option value="projektor">Projektör</option>
                <option value="diger">Diğer</option>
              </select>
            </div>

            <div>
              <label htmlFor="location-filter" className="block text-xs text-gray-500 mb-1">Konum</label>
              <select
                id="location-filter"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="all">Tüm Konumlar</option>
                <option value="sinif">Sınıf</option>
                <option value="laboratuvar">Laboratuvar</option>
                <option value="idare">İdare</option>
                <option value="ogretmenler_odasi">Öğretmenler Odası</option>
                <option value="diger">Diğer</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setSelectedType('all');
                  setSelectedLocation('all');
                }}
                className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
                Sıfırla
              </button>
            </div>
          </div>
        </div>
      
        {/* Arıza Tablosu/Kartları */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {filteredIssues.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Arıza bildirimi bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedStatus !== 'all' || selectedType !== 'all' || selectedLocation !== 'all' 
                  ? 'Arama kriterlerinize uygun arıza kaydı bulunamadı' 
                  : 'Henüz arıza bildirimi yapmadınız'}
              </p>
              {!searchTerm && selectedStatus === 'all' && selectedType === 'all' && selectedLocation === 'all' && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    Yeni Arıza Bildir
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Masaüstü için Tablo Görünümü - Sadece md boyutunun üzerinde görünür */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cihaz
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Konum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Açıklama/Not
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Oluşturulma Tarihi ve Saati
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-700 font-medium">{getDeviceTypeName(issue.device_type as any).charAt(0)}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{issue.device_name}</div>
                              <div className="text-sm text-gray-500">{getDeviceTypeName(issue.device_type as any)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{getLocationName(issue.device_location as any)}</div>
                          <div className="text-sm text-gray-500">{issue.room_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`${getStatusColor(issue.status as any)}`}>
                            {getStatusName(issue.status as any)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 line-clamp-2">{issue.description}</div>
                          {issue.notes && (
                            <div className="mt-1">
                              <div className="text-xs font-medium text-blue-600">Yönetici Notu:</div>
                              <div className="text-sm text-blue-800 italic line-clamp-2">{issue.notes}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 bg-blue-50">
                          {formatDate(issue.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50 transition-colors"
                              onClick={() => handleEditIssue(issue.id)}
                              title="Arızayı Düzenle"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors"
                              onClick={() => handleDeleteIssue(issue.id)}
                              title="Arızayı Sil"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile View */}
              <div className="md:hidden">
                <div className="space-y-4">
                  {filteredIssues.map((issue) => (
                    <div 
                      key={issue.id} 
                      className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow divide-y divide-gray-200"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {(issue.device_type as any) === 'bilgisayar' ? (
                              <ComputerDesktopIcon className="h-10 w-10 text-blue-500" />
                            ) : (issue.device_type as any) === 'projektor' ? (
                              <PresentationChartBarIcon className="h-10 w-10 text-purple-500" />
                            ) : (issue.device_type as any) === 'yazici' ? (
                              <PrinterIcon className="h-10 w-10 text-green-500" />
                            ) : (
                              <DeviceTabletIcon className="h-10 w-10 text-red-500" />
                            )}
                            <div>
                              <h2 className="text-base font-semibold">{issue.device_name}</h2>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <MapPinIcon className="h-3.5 w-3.5 mr-1" />
                                  {getLocationName(issue.device_location as any)} {issue.room_number}
                                </span>
                                <span className="flex items-center">
                                  <ClockIcon className="h-3.5 w-3.5 mr-1" />
                                  <span className="font-medium text-blue-600">{formatDate(issue.created_at)}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className={`${getStatusColor(issue.status as any)}`}>
                            {getStatusName(issue.status as any)}
                          </span>
                        </div>
                        
                        <div className="mt-3 text-sm text-gray-800">
                          <p className="line-clamp-2">{issue.description}</p>
                          
                          {issue.notes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md border-l-4 border-blue-500">
                              <div className="text-xs font-medium text-blue-700">Yönetici Notu:</div>
                              <p className="text-sm text-blue-900 line-clamp-3">{issue.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditIssue(issue.id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteIssue(issue.id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
                          >
                            <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Pagination */}
              {(searchTerm === '' && selectedStatus === 'all' && selectedType === 'all' && selectedLocation === 'all') && totalPages > 1 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Toplam <span className="font-medium">{totalCount}</span> arıza kaydından{' '}
                        <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>-
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, totalCount)}
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
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
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
                  
                  {/* Mobil pagination */}
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
      </main>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={closeAddModal}>
          <div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-5 bg-gray-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Yeni Arıza Bildir</h2>
                <button
                  onClick={closeAddModal}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-8 py-6">
              <AddIssueForm
                onSuccess={handleAddSuccess}
                onCancel={closeAddModal}
                teacherName={teacher.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && currentIssue && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={closeEditModal}>
          <div
            className="bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full overflow-y-auto"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="px-8 py-5 bg-gray-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Arıza Düzenle</h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-8 py-6">
              <TeacherEditForm
                issue={currentIssue}
                onSuccess={handleEditSuccess}
                onCancel={closeEditModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobil için sabit çıkış butonu - sadece md boyutunun altında gösterilecek */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center p-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          aria-label="Çıkış Yap"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
} 