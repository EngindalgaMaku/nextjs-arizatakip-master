"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import supabase from '@/lib/supabase-browser';

interface LoginFormData {
  classId: string;
  studentId: string;
  schoolNumber: string;
}

interface StudentSession {
  id: string;
  name: string;
  classId: string;
  schoolNumber: string;
}

interface StudentExamLoginFormProps {
  onLoginSuccess: (sessionData: StudentSession) => void;
}

export const StudentExamLoginForm: React.FC<StudentExamLoginFormProps> = ({ onLoginSuccess }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; schoolNumber: string | null }[]>([]);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  // Load classes on mount
  useEffect(() => {
    async function loadClasses() {
      const { data, error } = await supabase.from('classes').select('id,name').order('name', { ascending: true });
      if (error) {
        console.error('Error fetching classes', error);
        return;
      }
      setClasses(data || []);
    }
    loadClasses();
  }, []);

  // Load students when class changes
  const loadStudents = async (classId: string) => {
    if (!classId) {
      setStudents([]);
      return;
    }
    const { data, error } = await supabase.from('students')
      .select('id,name,school_number')
      .eq('class_id', classId)
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching students', error);
      setStudents([]);
      return;
    }
    setStudents((data || []).map(s => ({ id: s.id, name: s.name, schoolNumber: s.school_number })));
  };

  const onSubmit = async (data: LoginFormData) => {
    // Validate selected student and school number
    const selected = students.find(s => s.id === data.studentId);
    if (!selected) {
      toast.error('Öğrenci seçiniz');
      return;
    }
    if ((selected.schoolNumber || '') !== data.schoolNumber) {
      toast.error('Öğrenci numarası hatalı');
      return;
    }
    setIsLoading(true);
    try {
      const sessionData = {
        id: selected.id,
        name: selected.name,
        classId: data.classId,
        schoolNumber: selected.schoolNumber || ''
      };
      // Save session for exam participation
      if (typeof window !== 'undefined') {
        localStorage.setItem('studentExamSession', JSON.stringify({ studentId: sessionData.id }));
      }
      onLoginSuccess(sessionData);
      router.push(`/student/exams?studentId=${selected.id}`);
    } catch (error) {
      toast.error('Giriş yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sınav Girişi</CardTitle>
        <CardDescription>
          Sınava girmek için öğrenci numaranızı ve sınıf bilgilerinizi girin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classId">Sınıf</Label>
            <select
              id="classId"
              {...register('classId', { required: 'Sınıf seçimi gerekli' })}
              className="w-full border rounded p-2"
              onChange={(e) => {
                const cid = e.target.value;
                loadStudents(cid);
              }}
            >
              <option value="">-- Sınıf Seçin --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.classId && <p className="text-sm text-red-500">{errors.classId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentId">Öğrenci</Label>
            <select
              id="studentId"
              {...register('studentId', { required: 'Öğrenci seçimi gerekli' })}
              className="w-full border rounded p-2"
            >
              <option value="">-- Öğrenci Seçin --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.studentId && <p className="text-sm text-red-500">{errors.studentId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolNumber">Öğrenci Numarası</Label>
            <Input
              id="schoolNumber"
              type="text"
              {...register('schoolNumber', { required: 'Öğrenci numarası gerekli' })}
            />
            {errors.schoolNumber && <p className="text-sm text-red-500">{errors.schoolNumber.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 