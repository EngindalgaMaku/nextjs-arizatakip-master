'use client';

import { Database } from '@/lib/database.types';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ExamResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredQuestions: number;
  timeSpent: number;
  answers: Record<string, string>;
  questions: {
    id: string;
    text: string;
    correctOptionId: string;
    options: {
      id: string;
      text: string;
    }[];
  }[];
}

export default function ExamResult() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    const fetchResult = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Sınav sonuçlarını al
      const { data: attempt, error: attemptError } = await supabase
        .from('live_exam_attempts')
        .select(`
          id,
          score,
          answers,
          start_time,
          end_time,
          live_exam:live_exams (
            test:tests (
              questions
            )
          )
        `)
        .eq('live_exam_id', examId)
        .eq('student_id', user.id)
        .single();

      if (attemptError) {
        setError('Sınav sonuçları alınamadı.');
        return;
      }

      const questions = attempt.live_exam[0].test[0].questions;
      const answers = attempt.answers || {};
      
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let unansweredQuestions = 0;

      questions.forEach((question: any) => {
        const studentAnswer = answers[question.id];
        if (!studentAnswer) {
          unansweredQuestions++;
        } else if (studentAnswer === question.correctOptionId) {
          correctAnswers++;
        } else {
          wrongAnswers++;
        }
      });

      const timeSpent = attempt.end_time 
        ? Math.floor((new Date(attempt.end_time).getTime() - new Date(attempt.start_time).getTime()) / 1000 / 60)
        : 0;

      setResult({
        score: attempt.score || 0,
        totalQuestions: questions.length,
        correctAnswers,
        wrongAnswers,
        unansweredQuestions,
        timeSpent,
        answers,
        questions
      });

      setIsLoading(false);
    };

    fetchResult();
  }, [examId, router, supabase]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ArrowPathIcon className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="ml-4 text-lg text-gray-700">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-lg text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Sınav Sonucu</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Puan</div>
            <div className="text-2xl font-bold text-gray-900">{result.score}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Doğru</div>
            <div className="text-2xl font-bold text-green-600">{result.correctAnswers}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Yanlış</div>
            <div className="text-2xl font-bold text-red-600">{result.wrongAnswers}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Süre</div>
            <div className="text-2xl font-bold text-gray-900">{result.timeSpent} dk</div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Soru Detayları</h2>
          
          {result.questions.map((question, index) => {
            const studentAnswer = result.answers[question.id];
            const isCorrect = studentAnswer === question.correctOptionId;
            
            return (
              <div
                key={question.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    Soru {index + 1}
                  </h3>
                  {studentAnswer ? (
                    isCorrect ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-6 w-6 text-red-500" />
                    )
                  ) : (
                    <span className="text-sm text-gray-500">Cevaplanmadı</span>
                  )}
                </div>

                <p className="text-gray-700 mb-4">{question.text}</p>

                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className={`p-3 rounded-lg border ${
                        option.id === question.correctOptionId
                          ? 'border-green-500 bg-green-50'
                          : option.id === studentAnswer && !isCorrect
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <span className="text-gray-900">{option.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 