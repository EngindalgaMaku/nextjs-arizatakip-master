import { supabase } from '@/lib/supabase';
import {
  LiveExam,
  LiveExamCreationParams,
  LiveExamParticipant,
  LiveExamStatus,
  LiveExamUpdateParams,
  ParticipantStatus,
  Test
} from '@/types/tests';
import { getTestById } from './testActions';

// Supabase tablo adları
const LIVE_EXAMS_TABLE = 'live_exams';
const PARTICIPANTS_TABLE = 'live_exam_participants';

// LiveExam DB satırından UI tipine dönüştürmek için
function mapSupabaseRowToLiveExam(row: any): LiveExam {
  const exam: any = {
    id: row.id,
    testId: row.test_id,
    title: row.title,
    description: row.description,
    timeLimit: row.time_limit,
    scheduledStartTime: new Date(row.scheduled_start_time),
    scheduledEndTime: new Date(row.scheduled_end_time),
    status: row.status as LiveExamStatus,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    studentIds: row.student_ids,
    classIds: row.class_ids,
    autoPublishResults: row.auto_publish_results,
    allowLateSubmissions: row.allow_late_submissions,
    maxAttempts: row.max_attempts,
    randomizeQuestions: row.randomize_questions,
    randomizeOptions: row.randomize_options
  };
  if (row.actual_start_time) exam.actualStartTime = new Date(row.actual_start_time);
  if (row.actual_end_time) exam.actualEndTime = new Date(row.actual_end_time);
  return exam as LiveExam;
}

// LiveExamParticipant DB satırından UI tipine dönüştürmek için
function mapSupabaseRowToParticipant(row: any): LiveExamParticipant {
  return {
    id: row.id,
    examId: row.live_exam_id,
    studentId: row.student_id,
    status: row.status as ParticipantStatus,
    startTime: row.start_time ? new Date(row.start_time) : undefined,
    submitTime: row.submit_time ? new Date(row.submit_time) : undefined,
    lastActiveTime: row.last_active ? new Date(row.last_active) : undefined,
    ipAddress: row.ip_address,
    deviceInfo: row.device_info,
    progress: row.progress,
    answers: row.answers,
    score: row.score,
    isPassed: row.is_passed,
    attemptNumber: row.attempt_number
  };
}

// --- Veri Çekme Fonksiyonları ---

// Bütün canlı sınavları çek
export async function getLiveExams(): Promise<LiveExam[]> {
  const { data, error } = await supabase
    .from(LIVE_EXAMS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching live exams:', error);
    return [];
  }
  
  return data ? data.map(mapSupabaseRowToLiveExam) : [];
}

// ID ile canlı sınav getir
export async function getLiveExamById(examId: string): Promise<LiveExam | null> {
  const { data, error } = await supabase
    .from(LIVE_EXAMS_TABLE)
    .select('*')
    .eq('id', examId)
    .maybeSingle();
    
  if (error) {
    console.error(`Error fetching live exam by id ${examId}:`, error);
    return null;
  }
  
  return data ? mapSupabaseRowToLiveExam(data) : null;
}

// Öğretmenin oluşturduğu canlı sınavları getir
export async function getLiveExamsByTeacher(teacherId: string): Promise<LiveExam[]> {
  const { data, error } = await supabase
    .from(LIVE_EXAMS_TABLE)
    .select('*')
    .eq('created_by', teacherId)
    .order('scheduled_start_time', { ascending: false });
    
  if (error) {
    console.error(`Error fetching live exams by teacher ${teacherId}:`, error);
    return [];
  }
  
  return data ? data.map(mapSupabaseRowToLiveExam) : [];
}

// Öğrencinin katılabileceği sınavları getir
export async function getLiveExamsForStudent(studentId: string, classIds: string[]): Promise<any[]> {
  // Öğrencinin katılabileceği sınavlar:
  // 1. Doğrudan öğrenci ID'sine göre izin verilenler
  // 2. Öğrencinin sınıflarına göre izin verilenler
  // 3. Herkese açık sınavlar (studentIds ve classIds boş olanlar)
  
  const { data, error } = await supabase
    .from(LIVE_EXAMS_TABLE)
    .select('*')
    .or(`student_ids.cs.{${studentId}},class_ids.cs.{${classIds.join(',')}},and(student_ids.is.null,class_ids.is.null)`)
    .in('status', [LiveExamStatus.SCHEDULED, LiveExamStatus.ACTIVE])
    .gte('scheduled_end_time', new Date().toISOString());
    
  if (error) {
    console.error(`Error fetching live exams for student ${studentId}:`, error);
    return [];
  }
  
  // Her sınav için öğrencinin katılım durumunu da getir
  const exams = data ? data.map(mapSupabaseRowToLiveExam) : [];
  const examIds = exams.map(e => e.id);
  const participantMap: Record<string, string> = {};
  if (examIds.length > 0) {
    const { data: participants } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('live_exam_id, status')
      .in('live_exam_id', examIds)
      .eq('student_id', studentId);
    if (participants) {
      for (const p of participants) {
        participantMap[p.live_exam_id] = (p.status ?? '') as string;
      }
    }
  }
  return exams.map(e => ({ ...e, participantStatus: participantMap[e.id] || null }));
}

// Canlı sınavın katılımcılarını getir
export async function getLiveExamParticipants(examId: string): Promise<LiveExamParticipant[]> {
  const { data, error } = await supabase
    .from(PARTICIPANTS_TABLE)
    .select('*')
    .eq('live_exam_id', examId)
    .order('last_active', { ascending: false });
    
  if (error) {
    console.error(`Error fetching participants for exam ${examId}:`, error);
    return [];
  }
  
  return data ? data.map(mapSupabaseRowToParticipant) : [];
}

// --- CRUD İşlemleri ---

// Yeni canlı sınav oluştur
export async function createLiveExam(
  teacherId: string, 
  params: LiveExamCreationParams
): Promise<LiveExam | { error: string }> {
  try {
    const test = await getTestById(params.testId);

    if (!test) {
      return { error: 'Referans alınan test bulunamadı.' };
    }
    
    const now = new Date();

    if (params.scheduledStartTime < now) {
      return { error: 'Sınav başlangıç zamanı geçmişte olamaz.' };
    }
    
    if (params.scheduledEndTime <= params.scheduledStartTime) {
      return { error: 'Sınav bitiş zamanı başlangıç zamanından sonra olmalı.' };
    }

    const newLiveExam = {
      test_id: params.testId,
      title: params.title || test.title,
      description: params.description || test.description,
      time_limit: params.timeLimit,
      scheduled_start_time: params.scheduledStartTime.toISOString(),
      scheduled_end_time: params.scheduledEndTime.toISOString(),
      status: LiveExamStatus.SCHEDULED,
      created_by: teacherId,
      student_ids: params.studentIds || null,
      class_ids: params.classIds || null,
      auto_publish_results: params.autoPublishResults,
      allow_late_submissions: params.allowLateSubmissions,
      max_attempts: params.maxAttempts,
      randomize_questions: params.randomizeQuestions,
      randomize_options: params.randomizeOptions
    };
    
    const { data, error } = await supabase
      .from(LIVE_EXAMS_TABLE)
      .insert(newLiveExam)
      .select()
      .single();
    
    if (error) {
      const message = error.message || 'Bilinmeyen bir veritabanı hatası.';
      return { error: `Supabase hatası: ${message}` };
    }
    
    if (!data) {
      return { error: 'Canlı sınav oluşturuldu ancak veritabanından doğrulama yanıtı alınamadı.' };
    }
    
    return mapSupabaseRowToLiveExam(data);
  } catch (e: unknown) {
    let errorMessage = 'İşlem sırasında bilinmeyen bir genel hata oluştu.';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    } else if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as any).message === 'string') {
      errorMessage = (e as any).message;
    } else {
      try {
        errorMessage = JSON.stringify(e);
      } catch (stringifyError) {
        errorMessage = 'Hata mesajı alınamadı veya seri hale getirilemedi.';
      }
    }
    return { error: `Genel hata: ${errorMessage}` };
  }
}

// Canlı sınavı güncelle
export async function updateLiveExam(
  examId: string, 
  updates: LiveExamUpdateParams
): Promise<LiveExam | { error: string }> {
  try {
    const currentExam = await getLiveExamById(examId);
    if (!currentExam) {
      return { error: 'Güncellenecek canlı sınav bulunamadı.' };
    }
    
    if (currentExam.status === LiveExamStatus.COMPLETED || currentExam.status === LiveExamStatus.CANCELLED) {
      return { error: 'Tamamlanmış veya iptal edilmiş sınavlar güncellenemez.' };
    }
    
    const updateData: any = {
      ...updates,
      scheduled_start_time: updates.scheduledStartTime?.toISOString(),
      scheduled_end_time: updates.scheduledEndTime?.toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (updates.status === LiveExamStatus.ACTIVE && currentExam.status !== LiveExamStatus.ACTIVE) {
      updateData.actual_start_time = new Date().toISOString();
    }
    
    if (updates.status === LiveExamStatus.COMPLETED) {
      updateData.actual_end_time = new Date().toISOString();
      
      await calculateAndPublishResults(examId);
    }
    
    if (updates.studentIds !== undefined) updateData.student_ids = updates.studentIds;
    if (updates.classIds !== undefined) updateData.class_ids = updates.classIds;
    if (updates.autoPublishResults !== undefined) updateData.auto_publish_results = updates.autoPublishResults;
    if (updates.allowLateSubmissions !== undefined) updateData.allow_late_submissions = updates.allowLateSubmissions;
    if (updates.maxAttempts !== undefined) updateData.max_attempts = updates.maxAttempts;
    if (updates.randomizeQuestions !== undefined) updateData.randomize_questions = updates.randomizeQuestions;
    if (updates.randomizeOptions !== undefined) updateData.randomize_options = updates.randomizeOptions;
    if (updates.timeLimit !== undefined) updateData.time_limit = updates.timeLimit;
    
    const { data, error } = await supabase
      .from(LIVE_EXAMS_TABLE)
      .update(updateData)
      .eq('id', examId)
      .select()
      .single();
      
    if (error) {
      return { error: `Canlı sınav güncellenirken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToLiveExam(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Canlı sınavı başlat
export async function startLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.ACTIVE });
}

// Canlı sınavı duraklat
export async function pauseLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.PAUSED });
}

// Canlı sınavı devam ettir
export async function resumeLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.ACTIVE });
}

// Canlı sınavı tamamla
export async function completeLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.COMPLETED });
}

// Canlı sınavı iptal et
export async function cancelLiveExam(examId: string): Promise<LiveExam | { error: string }> {
  return updateLiveExam(examId, { status: LiveExamStatus.CANCELLED });
}

// Canlı sınavı sil
export async function deleteLiveExam(examId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: participantsError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .delete()
      .eq('live_exam_id', examId);
      
    if (participantsError) {
      return { success: false, error: `Katılımcı kayıtları silinirken bir hata oluştu: ${participantsError.message}` };
    }
    
    const { error } = await supabase
      .from(LIVE_EXAMS_TABLE)
      .delete()
      .eq('id', examId);
      
    if (error) {
      return { success: false, error: `Canlı sınav silinirken bir hata oluştu: ${error.message}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// --- Katılımcı İşlemleri ---

// Öğrenciyi sınava kaydet
export async function registerStudentForExam(
  examId: string, 
  studentId: string
): Promise<LiveExamParticipant | { error: string }> {
  console.log(`[registerStudentForExam] Attempting to register student ${studentId} for exam ${examId}`);
  try {
    const exam = await getLiveExamById(examId);
    if (!exam) {
      console.error(`[registerStudentForExam] Exam ${examId} not found.`);
      return { error: 'Canlı sınav bulunamadı.' };
    }
    
    if (exam.status !== LiveExamStatus.SCHEDULED && exam.status !== LiveExamStatus.ACTIVE) {
      console.error(`[registerStudentForExam] Exam ${examId} is not SCHEDULLED or ACTIVE. Status: ${exam.status}`);
      return { error: 'Bu sınava şu anda kayıt yapılamaz.' };
    }
    
    const { data: existingParticipants, error: queryError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('*')
      .eq('live_exam_id', examId)
      .eq('student_id', studentId);
      
    if (queryError) {
      console.error(`[registerStudentForExam] Error checking existing participants for exam ${examId}, student ${studentId}:`, queryError);
      return { error: `Katılımcı kontrolü sırasında bir hata oluştu: ${queryError.message}` };
    }

    // Eğer öğrenci zaten kayıtlıysa ve status'u IN_PROGRESS ise mevcut kaydı döndür
    if (existingParticipants && existingParticipants.length > 0) {
      const latest = existingParticipants[existingParticipants.length - 1];
      if (latest.status === ParticipantStatus.IN_PROGRESS) {
        return mapSupabaseRowToParticipant(latest);
      }
      if (latest.status === ParticipantStatus.COMPLETED || latest.status === ParticipantStatus.TIMED_OUT) {
        return { error: 'Bu sınavı zaten tamamladınız.' };
      }
    }
    
    const attemptNumber = existingParticipants ? existingParticipants.length + 1 : 1;
    console.log(`[registerStudentForExam] Student ${studentId} attempt number ${attemptNumber} for exam ${examId}.`);
    
    const newParticipantData = {
      live_exam_id: examId,
      student_id: studentId,
      status: ParticipantStatus.REGISTERED,
      progress: 0,
      attempt_number: attemptNumber
    };
    
    console.log('[registerStudentForExam] Attempting to insert new participant data:', JSON.stringify(newParticipantData, null, 2));
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .insert(newParticipantData)
      .select()
      .single();
      
    console.log('[registerStudentForExam] Supabase insert completed. Error:', JSON.stringify(error, null, 2), 'Data:', JSON.stringify(data, null, 2));

    if (error) {
      return { error: `Sınava kayıt yapılırken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToParticipant(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Öğrencinin sınava başlaması
export async function startExamForStudent(
  examId: string, 
  studentId: string,
  ipAddress?: string,
  deviceInfo?: string
): Promise<LiveExamParticipant | { error: string }> {
  try {
    const exam = await getLiveExamById(examId);
    if (!exam) {
      return { error: 'Canlı sınav bulunamadı.' };
    }
    
    if (exam.status !== LiveExamStatus.ACTIVE) {
      return { error: 'Bu sınav şu anda aktif değil.' };
    }
    
    const { data: participants, error: queryError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('*')
      .eq('live_exam_id', examId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: false });
      
    if (queryError) {
      return { error: `Katılımcı bilgisi alınırken bir hata oluştu: ${queryError.message}` };
    }
    
    if (!participants || participants.length === 0) {
      return { error: 'Bu sınava kayıtlı değilsiniz. Lütfen önce kayıt olun.' };
    }
    
    const latestAttempt = participants[0];
    
    if (latestAttempt.status === ParticipantStatus.IN_PROGRESS) {
      // Sınav zaten devam ediyor, mevcut kaydı döndür
      return mapSupabaseRowToParticipant(latestAttempt);
    }
    if (latestAttempt.status !== ParticipantStatus.REGISTERED) {
      return { error: 'Bu sınava zaten başladınız veya tamamladınız.' };
    }
    
    const now = new Date();
    
    const updateData = {
      status: ParticipantStatus.IN_PROGRESS,
      start_time: now.toISOString(),
      last_active: now.toISOString(),
      ip_address: ipAddress,
      device_info: deviceInfo
    };

    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .update(updateData)
      .eq('id', latestAttempt.id)
      .select()
      .single();
      
    if (error) {
      return { error: `Sınav başlatılırken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToParticipant(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Öğrencinin cevaplarını güncelle ve ilerleme durumunu kaydet
export async function updateStudentAnswers(
  examId: string,
  studentId: string,
  answers: Record<string, string>,
  progress: number
): Promise<LiveExamParticipant | { error: string }> {
  try {
    const { data: participants, error: queryError } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('*')
      .eq('live_exam_id', examId)
      .eq('student_id', studentId)
      .eq('status', ParticipantStatus.IN_PROGRESS)
      .order('attempt_number', { ascending: false });
      
    if (queryError) {
      return { error: `Katılımcı bilgisi alınırken bir hata oluştu: ${queryError.message}` };
    }
    
    if (!participants || participants.length === 0) {
      return { error: 'Aktif bir sınav oturumu bulunamadı.' };
    }
    
    const participant = participants[0];
    
    const updateData = {
      answers,
      progress,
      last_active: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .update(updateData)
      .eq('id', participant.id)
      .select()
      .single();
      
    if (error) {
      return { error: `Cevaplar güncellenirken bir hata oluştu: ${error.message}` };
    }
    
    return mapSupabaseRowToParticipant(data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Öğrencinin sınavı tamamlaması
export async function submitExamForStudent(
  examId: string,
  studentId: string,
  answers: Record<string, string>,
  questionOrder: { questionId: string; originalIndex: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: exam, error: examError } = await supabase
      .from('live_exams')
      .select('id, title, time_limit, status, test_id, tests(questions)')
      .eq('id', examId)
      .single();

    if (examError) throw examError;
    if (!exam) throw new Error("Sınav detayları bulunamadı.");

    if (exam.status !== 'active') {
      return { success: false, error: 'Bu sınav şu anda aktif değil.' };
    }

    const { data: participant, error: participantError } = await supabase
      .from('live_exam_participants')
      .select('*')
      .eq('live_exam_id', examId)
      .eq('student_id', studentId)
      .single();

    if (participantError) throw participantError;
    if (!participant) throw new Error("Katılımcı bilgisi bulunamadı.");

    if (participant.status === 'completed') {
      return { success: false, error: 'Bu sınav zaten tamamlanmış.' };
    }

    // Soruları orijinal sıralamaya göre düzenle
    let originalQuestions: any[] = [];
    if (Array.isArray(exam.tests.questions)) {
      originalQuestions = (exam.tests.questions as any[]).sort((a: any, b: any) => {
        const aOrder = questionOrder.find(q => q.questionId === a.id)?.originalIndex ?? 0;
        const bOrder = questionOrder.find(q => q.questionId === b.id)?.originalIndex ?? 0;
        return aOrder - bOrder;
      });
    }

    // Cevapları kontrol et ve puanları hesapla
    let totalScore = 0;
    const questionResults = originalQuestions.map((question: any) => {
      const studentAnswer = answers[question.id];
      const correctOptionId = question.correctOptionId || question.correct_option_id;
      const isCorrect = !!studentAnswer && studentAnswer === correctOptionId;
      if (isCorrect) totalScore++;
      return {
        question_id: question.id,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        original_index: questionOrder.find(q => q.questionId === question.id)?.originalIndex ?? 0
      };
    });

    const { error: updateError } = await supabase
      .from('live_exam_participants')
      .update({
        status: 'completed',
        answers: answers,
        score: totalScore,
        submit_time: new Date().toISOString(),
        question_results: questionResults
      })
      .eq('live_exam_id', examId)
      .eq('student_id', studentId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting exam:', error);
    return { success: false, error: error.message };
  }
}

// --- Yardımcı Fonksiyonlar ---

// Cevapları değerlendirip puan hesapla
function calculateScore(test: Test, answers: Record<string, string>): { score: number; isPassed: boolean } {
  const totalQuestions = test.questions.length;
  let correctAnswers = 0;
  
  test.questions.forEach(question => {
    if (answers[question.id] === question.correctOptionId) {
      correctAnswers++;
    }
  });
  
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const passingScore = test.passingScore || 70;
  const isPassed = score >= passingScore;
  
  return { score, isPassed };
}

// Tüm katılımcıların sonuçlarını hesapla ve yayınla
async function calculateAndPublishResults(examId: string): Promise<void> {
  try {
    const exam = await getLiveExamById(examId);
    if (!exam) {
      return;
    }
    
    const testData = await getTestById(exam.testId);
    if (!testData) {
      return;
    }
    
    const participants = await getLiveExamParticipants(examId);
    
    for (const participant of participants) {
      if (participant.status === ParticipantStatus.COMPLETED || participant.status === ParticipantStatus.TIMED_OUT) {
        if (participant.answers) {
          const { score, isPassed } = calculateScore(testData, participant.answers);
          
          await supabase
            .from(PARTICIPANTS_TABLE)
            .update({
              score,
              is_passed: isPassed
            })
            .eq('id', participant.id);
        }
      }
    }
  } catch (error) {
  }
} 