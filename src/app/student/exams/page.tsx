'use client';

import { getLiveExamsForStudent } from "@/actions/liveExamActions";
import { LiveExam } from "@/types/tests";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { StudentExamLoginForm } from './login-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ExamAccordionCard } from '@/app/student/exams/exam-accordion-card';

interface StudentSession {
  id: string;
  name: string;
  classId: string;
  schoolNumber: string;
}

export default function StudentExamsPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudentSession | null>(null);
  const [studentId, setStudentId] = useState('');
  const [exams, setExams] = useState<LiveExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoginSuccess = (sessionData: StudentSession) => {
    setSession(sessionData);
    setStudentId(sessionData.id);
  };

  useEffect(() => {
    const loadExams = async () => {
      if (!studentId) return;
      
      try {
        const data = await getLiveExamsForStudent(studentId, []);
        setExams(data);
      } catch (error) {
        toast.error('Sınavlar yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    loadExams();
  }, [studentId]);

  if (!session) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Öğrenci Girişi</CardTitle>
            <CardDescription>
              Sınavlara erişmek için lütfen giriş yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StudentExamLoginForm onLoginSuccess={handleLoginSuccess} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sınavlarım</h1>
      {exams.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Henüz sınav bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <ExamAccordionCard
              key={exam.id}
              exam={exam}
              onTakeExam={() => router.push(`/student/exams/${exam.id}/take`)}
              onViewResults={() => router.push(`/student/exams/${exam.id}/results`)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 