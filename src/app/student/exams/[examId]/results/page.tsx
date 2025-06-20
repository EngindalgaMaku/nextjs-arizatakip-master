'use client';

import { Database } from '@/lib/database.types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ExamResult {
  id: string;
  title: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredQuestions: number;
  timeSpent: number;
  submittedAt: string;
}

export default function ExamResults() {
  const params = useParams();
  const searchParams = useSearchParams();
  const examId = params.examId as string;
  const studentId = searchParams.get('studentId');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  // Öğrenci bilgilerini localStorage'dan al
  let studentName = '-';
  let className = '-';
  let schoolNumber = '-';
  if (typeof window !== 'undefined') {
    const sessionData = localStorage.getItem('studentExamSession');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        studentName = session.studentName || '-';
        className = session.className || '-';
        schoolNumber = session.schoolNumber || '-';
      } catch {}
    }
  }

  useEffect(() => {
    async function fetchResults() {
      if (!examId || !studentId) {
        setError('Sınav veya öğrenci bilgisi eksik.');
        setLoading(false);
        return;
      }

      try {
        // Sadece live_exam_participants tablosundan question_results'u çek
        const { data: participant, error: participantError } = await supabase
          .from('live_exam_participants')
          .select('question_results, score, live_exams(title)')
          .eq('live_exam_id', examId)
          .eq('student_id', studentId)
          .single();

        if (participantError) throw participantError;
        if (!participant) throw new Error('Sonuç bulunamadı.');

        setResults({
          questionResults: participant.question_results || [],
          score: participant.score || 0,
          live_exams: participant.live_exams || { title: '' }
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [examId, studentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!results) return null;

  const totalQuestions = results.questionResults.length;
  const correctCount = results.questionResults.filter((q: any) => q.is_correct).length;
  const wrongCount = results.questionResults.filter((q: any) => q.student_answer && !q.is_correct).length;
  const emptyCount = results.questionResults.filter((q: any) => !q.student_answer).length;

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{results.live_exams.title} - Sonuçlar</h1>
          <button
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold transition"
            onClick={() => router.push('/student/exams')}
          >
            Geri Dön
          </button>
        </div>
        <div className="mb-6 p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row md:items-center md:gap-8">
          <div className="font-semibold text-gray-700 text-base">Öğrenci Bilgileri:</div>
          <div className="flex flex-col md:flex-row md:gap-6 text-sm text-gray-600 mt-2 md:mt-0">
            <span><span className="font-medium">Ad Soyad:</span> {studentName}</span>
            <span><span className="font-medium">Sınıf:</span> {className}</span>
            <span><span className="font-medium">No:</span> {schoolNumber}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-indigo-50 rounded-lg p-4 flex flex-col items-center">
            <span className="text-sm text-gray-600">Toplam Puan</span>
            <span className="text-3xl font-bold text-indigo-600">{results.score}</span>
          </div>
          <div className="bg-green-50 rounded-lg p-4 flex flex-col items-center">
            <span className="text-sm text-gray-600">Doğru Sayısı</span>
            <span className="text-3xl font-bold text-green-600">{correctCount}</span>
          </div>
          <div className="bg-red-50 rounded-lg p-4 flex flex-col items-center">
            <span className="text-sm text-gray-600">Yanlış Sayısı</span>
            <span className="text-3xl font-bold text-red-600">{wrongCount}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center">
            <span className="text-sm text-gray-600">Boş Sayısı</span>
            <span className="text-3xl font-bold text-gray-600">{emptyCount}</span>
          </div>
        </div>
        <div className="text-center text-gray-500 text-sm">Toplam Soru: {totalQuestions}</div>
      </div>
    </div>
  );
} 