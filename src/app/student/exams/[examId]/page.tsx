'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { LiveExam, LiveExamStatus, Test, TestQuestion } from "@/types/tests";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Helper function to map Supabase live_exam row to our LiveExam type
function mapSupabaseRowToLiveExamPage(row: any): LiveExam | null {
  if (!row) {
    console.error("mapSupabaseRowToLiveExamPage received null or undefined row");
    return null;
  }
  return {
    id: String(row.id || ''),
    testId: String(row.test_id || ''),
    title: String(row.title || ''),
    description: row.description || undefined,
    timeLimit: Number(row.time_limit || 0),
    scheduledStartTime: new Date(row.scheduled_start_time || Date.now()),
    scheduledEndTime: new Date(row.scheduled_end_time || Date.now()),
    actualStartTime: row.actual_start_time ? new Date(row.actual_start_time) : undefined,
    actualEndTime: row.actual_end_time ? new Date(row.actual_end_time) : undefined,
    status: row.status as LiveExamStatus,
    createdBy: String(row.created_by || ''),
    createdAt: new Date(row.created_at || Date.now()),
    updatedAt: new Date(row.updated_at || Date.now()),
    studentIds: row.student_ids || undefined,
    classIds: row.class_ids || undefined,
    autoPublishResults: Boolean(row.auto_publish_results),
    allowLateSubmissions: Boolean(row.allow_late_submissions),
    maxAttempts: Number(row.max_attempts || 1),
    randomizeQuestions: Boolean(row.randomize_questions),
    randomizeOptions: Boolean(row.randomize_options),
  };
}

// Helper function to map Supabase test row to our Test type
function mapSupabaseRowToTestPage(row: any): Test | null {
  if (!row) {
    console.error("mapSupabaseRowToTestPage received null or undefined row");
    return null;
  }
  let questionsArray: TestQuestion[] = [];
  const rawQuestions = row.questions;

  if (rawQuestions && Array.isArray(rawQuestions)) {
    questionsArray = rawQuestions.map((q: any): TestQuestion => ({
      id: String(q.id || `gen-q-${Date.now()}-${Math.random()}`),
      text: String(q.text || ''),
      options: Array.isArray(q.options)
        ? q.options.map((opt: any) => ({
            id: String(opt.id || `gen-opt-${Date.now()}-${Math.random()}`),
            text: String(opt.text || '')
          }))
        : [],
      correctOptionId: String(q.correctOptionId || ''),
      question_type: q.question_type || 'multiple_choice_single_answer',
      points: q.points === undefined || q.points === null ? 1 : Number(q.points),
      explanation: q.explanation || null,
    }));
  } else if (typeof rawQuestions === 'string') {
    try {
      const parsedQuestions = JSON.parse(rawQuestions);
      if (Array.isArray(parsedQuestions)) {
        questionsArray = parsedQuestions.map((q: any): TestQuestion => ({
          id: String(q.id || `gen-q-${Date.now()}-${Math.random()}`),
          text: String(q.text || ''),
          options: Array.isArray(q.options)
            ? q.options.map((opt: any) => ({
                id: String(opt.id || `gen-opt-${Date.now()}-${Math.random()}`),
                text: String(opt.text || '')
              }))
            : [],
          correctOptionId: String(q.correctOptionId || ''),
          question_type: q.question_type || 'multiple_choice_single_answer',
          points: q.points === undefined || q.points === null ? 1 : Number(q.points),
          explanation: q.explanation || null,
        }));
      }
    } catch (error) {
      console.error('Failed to parse questions JSON string for Test:', error);
    }
  }

  return {
    id: String(row.id || ''),
    title: String(row.title || ''),
    slug: String(row.slug || ''),
    description: String(row.description || ''),
    questions: questionsArray,
    category: row.category || undefined,
    passingScore: row.passing_score === null || row.passing_score === undefined ? undefined : Number(row.passing_score),
    timeLimit: row.time_limit === null || row.time_limit === undefined ? undefined : Number(row.time_limit),
    randomizeQuestions: row.randomize_questions === null ? false : Boolean(row.randomize_questions),
    randomizeOptions: row.randomize_options === null ? false : Boolean(row.randomize_options),
    isPublished: row.is_published === null ? false : Boolean(row.is_published),
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

export default function TakeExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const examId = params.examId as string;
  const studentId = searchParams.get('studentId');

  const [liveExam, setLiveExam] = useState<LiveExam | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  useEffect(() => {
    if (!examId) {
      setError("Sınav ID'si URL'de bulunamadı.");
      setIsLoading(false);
      return;
    }
    if (!studentId) {
      setError("Öğrenci ID'si URL'de bulunamadı.");
      toast.error("Öğrenci kimliği URL'de bulunamadı. Lütfen öğrenci seçimi yaparak tekrar deneyin.");
      setIsLoading(false);
      return;
    }
          
    const fetchExamDetails = async () => {
      setIsLoading(true);
      setError(null);
      setLiveExam(null);
      setTest(null);
      
      const { data: liveExamData, error: liveExamError } = await supabase
        .from('live_exams')
        .select('*, test_id')
        .eq('id', examId)
        .single();

      if (liveExamError) {
        console.error("Error fetching live exam record:", liveExamError);
        setError(`Canlı sınav kaydı getirilemedi: ${liveExamError.message}`);
        toast.error(`Canlı sınav kaydı getirilemedi: ${liveExamError.message}`);
        setIsLoading(false);
        return;
      }

      if (!liveExamData) {
        setError("Belirtilen ID ile canlı sınav bulunamadı.");
        toast.error("Belirtilen ID ile canlı sınav bulunamadı.");
        setIsLoading(false);
        return;
      }
      
      setLiveExam(mapSupabaseRowToLiveExamPage(liveExamData));

      const { data: testDataFromDb, error: testError } = await supabase
        .from('tests') 
        .select('*')
        .eq('id', liveExamData.test_id)
        .single();

      if (testError) {
        console.error("Error fetching test details:", testError);
        setError(`Test detayları getirilemedi: ${testError.message}`);
        toast.error(`Test detayları getirilemedi: ${testError.message}`);
      } else if (testDataFromDb) {
        const mappedTest = mapSupabaseRowToTestPage(testDataFromDb);
        setTest(mappedTest);
        // Use liveExam from state, which is now the mapped version
        const currentLiveExam = mapSupabaseRowToLiveExamPage(liveExamData); // Re-map or use state if race conditions are not an issue
        if (currentLiveExam) {
            const timeLimitToUse = currentLiveExam.timeLimit ?? mappedTest?.timeLimit;
            if (timeLimitToUse) {
              setTimeLeft(timeLimitToUse * 60);
            }
        } else if (mappedTest?.timeLimit) { // Fallback if liveExam somehow null but test isn't
             setTimeLeft(mappedTest.timeLimit * 60);
        }
      } else {
        setError("Sınava ait test (sorular) bulunamadı.");
        toast.error("Sınava ait test (sorular) bulunamadı.");
      }
      setIsLoading(false);
    };

    fetchExamDetails();
  }, [examId, studentId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prevTime => (prevTime ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerChange = (questionId: string | number, optionId: string) => {
    setAnswers(prev => ({ ...prev, [String(questionId)]: optionId }));
  };

  const handleSubmitExam = async () => {
    if (!studentId || !liveExam?.id || !test?.id || !test.questions || test.questions.length === 0) {
      toast.error("Sınav gönderimi için gerekli bilgiler eksik: Öğrenci, canlı sınav veya test detayları bulunamadı.");
      console.error("Submission failed due to missing data:", { studentId, liveExamId: liveExam?.id, testId: test?.id, questionsAvailable: !!test?.questions });
      return;
    }
    
    let score = 0;
    test.questions.forEach(q => {
      if (q.correctOptionId && answers[String(q.id)] === q.correctOptionId) {
        score++;
      }
    });

    const percentage = test.questions.length > 0 ? (score / test.questions.length) * 100 : 0;

    const submissionData = {
      student_id: studentId,
      live_exam_id: liveExam.id,
      test_id: test.id,
      score: percentage,
      answers: answers,
      submitted_at: new Date().toISOString(),
    };

    console.log("Submitting exam with data:", submissionData);

    const { error: submissionError } = await supabase
      .from('student_exam_results')
      .insert(submissionData);

    if (submissionError) {
      toast.error(`Sınav sonucu kaydedilirken bir hata oluştu: ${submissionError.message}`);
      console.error("Error submitting exam:", submissionError);
    } else {
      toast.success(`Sınav tamamlandı! Puanınız: ${percentage.toFixed(2)}%`);
      router.push(`/student/results?liveExamId=${liveExam.id}&studentId=${studentId}`);
    }
  };
  
  if (isLoading) return <div className="flex justify-center items-center h-screen"><p>Sınav yükleniyor...</p></div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-500"><p>Hata: {error}</p></div>;
  
  if (!test || !test.questions || test.questions.length === 0) {
    return <div className="flex justify-center items-center h-screen"><p>Sınav için sorular bulunamadı veya yüklenemedi.</p></div>;
  }

  const currentQuestion = test.questions[currentQuestionIndex];

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "Süresiz";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 's ' : ''}${m}d ${s}s`;
  };

  if (timeLeft === 0 && timeLeft !== null) {
    handleSubmitExam(); 
    return <div className="flex justify-center items-center h-screen"><p>Süre doldu! Sınavınız gönderiliyor...</p></div>;
  }
  
  return (
    <div className="container mx-auto p-4 flex flex-col items-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{liveExam?.title || test.title}</CardTitle>
          {timeLeft !== null && <CardDescription>Kalan Süre: {formatTime(timeLeft)}</CardDescription>}
        </CardHeader>
        <CardContent>
          {currentQuestion ? (
            <div>
              <h2 className="text-lg font-semibold mb-2">Soru {currentQuestionIndex + 1} / {test.questions.length}</h2>
              <p className="mb-4">{currentQuestion.text}</p>
              <div className="space-y-2">
                {currentQuestion.options.map(option => (
                  <Button
                    key={option.id}
                    variant={answers[String(currentQuestion.id)] === option.id ? "default" : "outline"}
                    onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                    className="w-full justify-start text-left h-auto whitespace-normal"
                  >
                    {option.text}
                  </Button>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <Button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  Önceki
                </Button>
                {currentQuestionIndex < test.questions.length - 1 ? (
                  <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}>
                    Sonraki
                  </Button>
                ) : (
                  <Button onClick={handleSubmitExam} variant="secondary">
                    Sınavı Bitir
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p>Sorular yüklenemedi.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 