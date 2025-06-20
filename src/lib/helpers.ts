import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as Enums from '@/lib/enums';
import * as SupabaseTypes from '@/lib/supabase';

// Type helpers for compatibility
type DeviceType = Enums.DeviceType | SupabaseTypes.DeviceType;
type DeviceLocation = Enums.DeviceLocation | SupabaseTypes.DeviceLocation;
type IssueStatus = Enums.IssueStatus | SupabaseTypes.IssueStatus;
type IssuePriority = Enums.IssuePriority | SupabaseTypes.IssuePriority;

// Enum to string mappings for conversion
const deviceTypeMap: Record<Enums.DeviceType, string> = {
  [Enums.DeviceType.SMARTBOARD]: 'akilli_tahta',
  [Enums.DeviceType.COMPUTER]: 'bilgisayar',
  [Enums.DeviceType.PRINTER]: 'yazici',
  [Enums.DeviceType.PROJECTOR]: 'projektor',
  [Enums.DeviceType.OTHER]: 'diger',
  [Enums.DeviceType.TABLET]: 'diger', // Fallback to 'diger' as it doesn't exist in Supabase types
  [Enums.DeviceType.NETWORK]: 'diger'  // Fallback to 'diger' as it doesn't exist in Supabase types
};

const deviceLocationMap: Record<Enums.DeviceLocation, string> = {
  [Enums.DeviceLocation.CLASSROOM]: 'sinif',
  [Enums.DeviceLocation.LABORATORY]: 'laboratuvar',
  [Enums.DeviceLocation.OFFICE]: 'idare',
  [Enums.DeviceLocation.HALL]: 'ogretmenler_odasi',
  [Enums.DeviceLocation.OTHER]: 'diger',
  [Enums.DeviceLocation.LIBRARY]: 'diger' // Fallback to 'diger' as it doesn't exist in Supabase types
};

const statusMap: Record<Enums.IssueStatus, string> = {
  [Enums.IssueStatus.REPORTED]: 'beklemede',
  [Enums.IssueStatus.IN_PROGRESS]: 'inceleniyor',
  [Enums.IssueStatus.WAITING_PARTS]: 'atandi',
  [Enums.IssueStatus.RESOLVED]: 'cozuldu',
  [Enums.IssueStatus.CLOSED]: 'kapatildi'
};

const priorityMap: Record<Enums.IssuePriority, string> = {
  [Enums.IssuePriority.LOW]: 'dusuk',
  [Enums.IssuePriority.MEDIUM]: 'normal',
  [Enums.IssuePriority.HIGH]: 'yuksek',
  [Enums.IssuePriority.CRITICAL]: 'kritik'
};

// Cihaz türü için etiket oluşturma
export function getDeviceTypeName(type: DeviceType): string {
  // Enum değeri kontrolü
  if (typeof type === 'string') {
    // String değeri kontrolü (supabase tiplerinden)
    switch (type) {
      case 'akilli_tahta':
        return 'Akıllı Tahta';
      case 'bilgisayar':
        return 'Bilgisayar';
      case 'yazici':
        return 'Yazıcı';
      case 'projektor':
        return 'Projektör';
      case 'diger':
        return 'Diğer';
      default:
        return type;
    }
  } else {
    // Enum değeri (enums.ts'den)
    switch (type) {
      case Enums.DeviceType.SMARTBOARD:
        return 'Akıllı Tahta';
      case Enums.DeviceType.COMPUTER:
        return 'Bilgisayar';
      case Enums.DeviceType.PRINTER:
        return 'Yazıcı';
      case Enums.DeviceType.PROJECTOR:
        return 'Projektör';
      case Enums.DeviceType.OTHER:
        return 'Diğer';
      default:
        return String(type);
    }
  }
}

// Cihaz konumu için etiket oluşturma
export function getLocationName(location: DeviceLocation): string {
  if (typeof location === 'string') {
    // String değeri kontrolü (supabase tiplerinden)
    switch (location) {
      case 'sinif':
        return 'Sınıf';
      case 'laboratuvar':
        return 'Laboratuvar';
      case 'idare':
        return 'İdare';
      case 'ogretmenler_odasi':
        return 'Öğretmenler Odası';
      case 'diger':
        return 'Diğer';
      default:
        return location;
    }
  } else {
    // Enum değeri (enums.ts'den)
    switch (location) {
      case Enums.DeviceLocation.CLASSROOM:
        return 'Sınıf';
      case Enums.DeviceLocation.LABORATORY:
        return 'Laboratuvar';
      case Enums.DeviceLocation.OFFICE:
        return 'İdare';
      case Enums.DeviceLocation.HALL:
        return 'Öğretmenler Odası';
      case Enums.DeviceLocation.OTHER:
        return 'Diğer';
      default:
        return String(location);
    }
  }
}

// Arıza durumu için etiket oluşturma
export function getStatusName(status: IssueStatus): string {
  if (typeof status === 'string') {
    // String değeri kontrolü (supabase tiplerinden)
    switch (status) {
      case 'beklemede':
        return 'Beklemede';
      case 'atandi':
        return 'Atandı';
      case 'inceleniyor':
        return 'İnceleniyor';
      case 'cozuldu':
        return 'Çözüldü';
      case 'kapatildi':
        return 'Kapatıldı';
      default:
        return status;
    }
  } else {
    // Enum değeri (enums.ts'den)
    switch (status) {
      case Enums.IssueStatus.REPORTED:
        return 'Beklemede';
      case Enums.IssueStatus.IN_PROGRESS:
        return 'İnceleniyor';
      case Enums.IssueStatus.WAITING_PARTS:
        return 'Parça Bekleniyor';
      case Enums.IssueStatus.RESOLVED:
        return 'Çözüldü';
      case Enums.IssueStatus.CLOSED:
        return 'Kapatıldı';
      default:
        return String(status);
    }
  }
}

// Arıza önceliği için etiket oluşturma
export function getPriorityName(priority: IssuePriority): string {
  if (typeof priority === 'string') {
    // String değeri kontrolü (supabase tiplerinden)
    switch (priority) {
      case 'dusuk':
        return 'Düşük';
      case 'normal':
        return 'Normal';
      case 'yuksek':
        return 'Yüksek';
      case 'kritik':
        return 'Kritik';
      default:
        return priority;
    }
  } else {
    // Enum değeri (enums.ts'den)
    switch (priority) {
      case Enums.IssuePriority.LOW:
        return 'Düşük';
      case Enums.IssuePriority.MEDIUM:
        return 'Normal';
      case Enums.IssuePriority.HIGH:
        return 'Yüksek';
      case Enums.IssuePriority.CRITICAL:
        return 'Kritik';
      default:
        return String(priority);
    }
  }
}

// Arıza durumu için renk sınıfı oluşturma
export function getStatusColor(status: IssueStatus): string {
  if (typeof status === 'string') {
    // String değeri kontrolü (supabase tiplerinden)
    switch (status) {
      case 'beklemede':
        return 'bg-yellow-100 text-yellow-800';
      case 'atandi':
        return 'bg-blue-100 text-blue-800';
      case 'inceleniyor':
        return 'bg-purple-100 text-purple-800';
      case 'cozuldu':
        return 'bg-green-100 text-green-800';
      case 'kapatildi':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  } else {
    // Enum değeri (enums.ts'den)
    switch (status) {
      case Enums.IssueStatus.REPORTED:
        return 'bg-yellow-100 text-yellow-800';
      case Enums.IssueStatus.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800';
      case Enums.IssueStatus.WAITING_PARTS:
        return 'bg-blue-100 text-blue-800';
      case Enums.IssueStatus.RESOLVED:
        return 'bg-green-100 text-green-800';
      case Enums.IssueStatus.CLOSED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

// Arıza önceliği için renk sınıfı oluşturma
export function getPriorityColor(priority: IssuePriority): string {
  if (typeof priority === 'string') {
    // String değeri kontrolü (supabase tiplerinden)
    switch (priority) {
      case 'dusuk':
        return 'bg-blue-100 text-blue-800';
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'yuksek':
        return 'bg-orange-100 text-orange-800';
      case 'kritik':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  } else {
    // Enum değeri (enums.ts'den)
    switch (priority) {
      case Enums.IssuePriority.LOW:
        return 'bg-blue-100 text-blue-800';
      case Enums.IssuePriority.MEDIUM:
        return 'bg-green-100 text-green-800';
      case Enums.IssuePriority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case Enums.IssuePriority.CRITICAL:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

// Tarih biçimlendirme
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Belirtilmemiş';
  
  try {
    // Önce standart tarih formatını deneyelim
    let date = new Date(dateString);
    
    // Eğer geçersiz bir tarih oluştuysa ve format "DD.MM.YYYY" veya "DD.MM.YYYY HH:MM" gibi ise
    if (isNaN(date.getTime()) && dateString.includes('.')) {
      const parts = dateString.split(' ');
      const datePart = parts[0];
      const timePart = parts.length > 1 ? parts[1] : '';
      
      const [day, month, year] = datePart.split('.').map(part => parseInt(part, 10));
      
      if (timePart) {
        const [hours, minutes] = timePart.split(':').map(part => parseInt(part, 10));
        date = new Date(year, month - 1, day, hours, minutes);
      } else {
        date = new Date(year, month - 1, day);
      }
    }
    
    // Son kontrol: Hala geçersiz bir tarih mi?
    if (isNaN(date.getTime())) {
      return 'Geçersiz tarih formatı';
    }
    
    return `${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')} (${formatDistanceToNow(date, { addSuffix: true, locale: tr })})`;
  } catch (e) {
    console.error('Tarih işleme hatası:', e, 'Tarih değeri:', dateString);
    return 'Tarih işlenemedi';
  }
}

// Kısa tarih biçimlendirme (sadece tarih)
export function formatShortDate(dateString: string | null): string {
  if (!dateString) return 'Belirtilmemiş';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Geçersiz tarih';
    }
    
    return date.toLocaleDateString('tr-TR');
  } catch (e) {
    return 'Tarih işlenemedi';
  }
} 