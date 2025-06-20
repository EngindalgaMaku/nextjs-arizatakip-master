/** Haftanın günlerini temsil eder */
export const DAYS_OF_WEEK = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK[number];

/** Gün içindeki bir ders saatini temsil eder (Örn: 1. saat, 2. saat) */
export type HourOfDay = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; // Okulun günlük ders saatine göre ayarlanabilir

/** Belirli bir zaman dilimini temsil eder (Örn: Pazartesi 3. Saat) */
export interface TimeSlot {
  day: DayOfWeek;
  hour: HourOfDay;
}

/** Çizelgeleme algoritması için basitleştirilmiş öğretmen verisi */
export interface TeacherScheduleData {
  id: string;
  name: string; // Debugging için
  branchId: string; // Branch ID for matching teachers to lessons
  unavailableSlots: TimeSlot[]; // Öğretmenin ders veremeyeceği zamanlar
  assignableLessonIds: string[]; // Verebileceği derslerin ID'leri (dal_dersleri ID)
}

/** Çizelgeleme algoritması için basitleştirilmiş ders verisi */
export interface LessonScheduleData {
  id: string; // Genellikle dal_dersleri.id olacak
  name: string; // Debugging için
  dalId: string; // Ait olduğu dalın ID'si (sınıf çakışmaları için)
  sinifSeviyesi: number; // Ait olduğu sınıf seviyesi (sınıf çakışmaları için)
  weeklyHours: number; // Haftalık toplam ders saati
  canSplit: boolean; // Ders bölünebilir mi? (bolunebilir_mi)
  requiresMultipleResources: boolean; // Aynı anda birden fazla kaynak gerekir mi?
  needsScheduling: boolean; // Çizelgeye dahil edilecek mi? (cizelgeye_dahil_et)
  suitableLabTypeIds: string[]; // Uygun lab tipi ID'leri (boşsa normal sınıf)
  possibleTeacherIds: string[]; // Bu dersi verebilecek öğretmen ID'leri
  // Duration'ı şimdilik çıkardım, algoritma içinde haftalık saate ve bölünebilirliğe göre karar verilecek.
}

/** Çizelgeleme algoritması için basitleştirilmiş konum verisi */
export interface LocationScheduleData {
  id: string;
  name: string; // Debugging için
  labTypeId: string | null; // Konumun lab tipi ID'si (varsa)
  capacity: number | null; // Konumun kapasitesi (ileride kullanılabilir)
}

/** Çizelgedeki tek bir ders atamasını temsil eder */
export interface ScheduledEntry {
  lessonId: string;        // Atanan LessonScheduleData ID'si (dal_dersleri.id)
  lessonName: string;      // Ders adı (debugging ve UI için)
  teacherIds: string[];       // Atanan öğretmenlerin ID'leri
  teacherNames: string[];     // Atanan öğretmenlerin adları
  locationIds: string[];      // Atanan konumların ID'leri
  locationNames: string[];    // Atanan konumların adları
  timeSlot: TimeSlot;      // Zaman dilimi
  dalId: string;           // Dersin ait olduğu dal ID'si (çakışma kontrolü için)
  sinifSeviyesi: number;   // Dersin sınıf seviyesi (çakışma kontrolü için)
}

/** Oluşturulan tüm çizelgeyi temsil eder (Zaman dilimi -> Atama) */
// Map kullanmak erişim için daha verimli olabilir: key = "Pazartesi-1" gibi bir string
export type Schedule = Map<string, ScheduledEntry>; // Key: `${DayOfWeek}-${HourOfDay}`

/** Algoritma girdilerini bir arada tutan yapı */
export interface SchedulerInput {
    teachers: TeacherScheduleData[];
    lessons: LessonScheduleData[];
    locations: LocationScheduleData[];
    timeSlots: TimeSlot[]; // Tüm olası zaman dilimleri (örn: Pazartesi 1-12, Salı 1-12 ...)
    requiredAssignmentsMap: Map<string, Set<string>>; // Hangi öğretmenin hangi dersleri vermesi zorunlu (TeacherID -> Set<LessonID>)
}

/** Algoritma çıktısı */
export interface SchedulerResult {
    success: boolean;
    schedule: Schedule;
    unassignedLessons: LessonScheduleData[];
    error?: string; // Algoritma hatası
    diagnostics?: any; // Hata ayıklama bilgileri (opsiyonel)
    logs: string[]; // Algoritma logları
}

/** Atanamayan ders bilgilerini client tarafında göstermek için */
export interface UnassignedLessonInfo {
  lessonId: string; // Atanamayan dersin ID'si (LessonScheduleData.id)
  lessonName: string; // Dersin adı
  remainingHours: number; // Atanamayan saat sayısı
}

/** SchedulerResult'ın client'a gönderilebilir (serileştirilebilir) versiyonu */
export interface SerializableSchedulerResult {
    success: boolean;
    schedule?: [string, ScheduledEntry][]; // Map yerine Array of [key, value] tuples
    unassignedLessons?: UnassignedLessonInfo[]; // <<< Artık bu tipi kullanıyoruz
    totalUnassignedHours?: number; // <<< Toplam atanamayan saati de ekleyelim
    error?: string;
    diagnostics?: any;
    logs?: string[]; // Algoritma logları
}

// --- NEW: Result type including fitness metrics ---
export interface BestSchedulerResult extends Omit<SchedulerResult, 'schedule'> { // Omit base schedule if returning bestSchedule specifically
    bestSchedule: Schedule; // The actual best schedule map
    // unassignedLessons: LessonScheduleData[]; // Already in SchedulerResult
    // logs: string[]; // Already in SchedulerResult
    attemptsMade: number;   // How many attempts were made
    successfulAttempts: number; // How many produced a valid schedule passing constraints
    // Metrics for the best schedule found:
    minFitnessScore: number; // Lower is better (combined score)
    bestVariance: number;    // Workload variance of the best schedule
    bestTotalGaps: number;   // Total daily gaps of the best schedule
    // error?: string; // Already in SchedulerResult
    // Optional: Add back penalty if needed
    // bestShortDayPenalty?: number;
} 