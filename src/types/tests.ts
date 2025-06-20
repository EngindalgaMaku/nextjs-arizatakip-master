// Test modeli tanımlamaları

export interface TestOption {
  id: string;
  text: string;
}

export interface TestQuestion {
  id: string;
  text: string;
  options: TestOption[];
  correctOptionId: string;
  question_type?: string;
  points?: number;
  explanation?: string | null;
  imageUrl?: string;
}

export interface Test {
  id: string;
  title: string;
  slug: string;
  description: string;
  questions: TestQuestion[];
  passingScore?: number;
  timeLimit?: number; // in minutes
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  isPublished?: boolean;
  isPublicViewable?: boolean;
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestUserState {
  answers: Record<string, string>;
  startTime: Date;
  isSubmitted: boolean;
  endTime?: Date;
}

export interface TestResult {
  testId: string;
  userId: string;
  score: number;
  isPassed: boolean;
  answers: Record<number, string>;
  startTime: Date;
  endTime: Date;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  createdAt: Date;
}

// Canlı Sınav İlişkili Modeller

export interface LiveExam {
  id: string;
  testId: string;  // Baz alınan test ID'si
  title: string;   // Test başlığı veya özelleştirilmiş başlık
  description?: string;
  timeLimit: number; // Dakika cinsinden
  scheduledStartTime: Date; // Planlanmış başlangıç zamanı
  scheduledEndTime: Date;   // Planlanmış bitiş zamanı
  actualStartTime?: Date | undefined;   // Gerçek başlangıç zamanı (başlatıldığında)
  actualEndTime?: Date | undefined;     // Gerçek bitiş zamanı (sonlandırıldığında)
  status: LiveExamStatus;
  createdBy: string;        // Oluşturan öğretmen ID'si
  createdAt: Date;
  updatedAt: Date;
  studentIds?: string[];    // Sınava katılım için izin verilen öğrenci ID'leri (boşsa, herkes katılabilir)
  classIds?: string[];      // Sınava katılım için izin verilen sınıf ID'leri (boşsa, herkes katılabilir)
  autoPublishResults: boolean; // Sınav bitiminde sonuçlar otomatik yayınlansın mı?
  allowLateSubmissions: boolean; // Süre bittikten sonra geç gönderimler kabul edilsin mi?
  maxAttempts: number;      // Maksimum deneme sayısı (1=tek deneme)
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  participantStatus?: string; // Öğrencinin sınavdaki durumu
}

export enum LiveExamStatus {
  DRAFT = 'draft',           // Taslak, henüz hazır değil
  SCHEDULED = 'scheduled',   // Zamanlanmış, başlamayı bekliyor
  ACTIVE = 'active',         // Aktif, öğrenciler sınava girebilir
  PAUSED = 'paused',         // Duraklatılmış, geçici olarak erişim kapalı
  COMPLETED = 'completed',   // Tamamlanmış, sınav sona erdi
  CANCELLED = 'cancelled'    // İptal edilmiş
}

export interface LiveExamParticipant {
  id: string;
  examId: string;        // Sınav ID'si
  studentId: string;     // Öğrenci ID'si
  status: ParticipantStatus;
  startTime?: Date;      // Öğrencinin sınava başlama zamanı
  submitTime?: Date;     // Öğrencinin sınavı tamamlama zamanı
  lastActiveTime?: Date; // Son aktivite zamanı (canlı izleme için)
  ipAddress?: string;    // Öğrencinin IP adresi
  deviceInfo?: string;   // Cihaz bilgisi
  progress: number;      // İlerleme yüzdesi (0-100)
  answers?: Record<string, string>; // Verilen cevaplar
  score?: number;        // Puanı (sonuçlar hesaplandığında)
  isPassed?: boolean;    // Geçti mi (sonuçlar hesaplandığında)
  attemptNumber: number; // Deneme numarası
}

export enum ParticipantStatus {
  REGISTERED = 'registered',    // Kayıtlı, henüz başlamadı
  IN_PROGRESS = 'in_progress',  // Sınav devam ediyor
  COMPLETED = 'completed',      // Tamamlandı
  TIMED_OUT = 'timed_out',      // Süre doldu
  DISQUALIFIED = 'disqualified', // Diskalifiye edildi (kopya vb.)
  ABANDONED = 'abandoned'      // Terk edildi
}

export interface LiveExamCreationParams {
  testId: string;
  title?: string;  // Boşsa, testten alınacak
  description?: string;
  timeLimit: number;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  studentIds?: string[];
  classIds?: string[];
  autoPublishResults: boolean;
  allowLateSubmissions: boolean;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
}

export interface LiveExamUpdateParams {
  title?: string;
  description?: string;
  timeLimit?: number;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  status?: LiveExamStatus;
  studentIds?: string[];
  classIds?: string[];
  autoPublishResults?: boolean;
  allowLateSubmissions?: boolean;
  maxAttempts?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
}

export type ExamStatus = 'active' | 'past' | 'upcoming'; 