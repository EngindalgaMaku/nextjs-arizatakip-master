'use client';

import { getClassesForReceiptLogin, getStudentsByClassForReceiptLogin, verifyStudentLogin } from '@/actions/business-receipts/student-actions'; // New actions
import { Button } from '@/components/ui/button'; // Shadcn/ui Button veya kendi Button component'iniz
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Örnek UI componentleri
import { Input } from '@/components/ui/input'; // Shadcn/ui Input veya kendi Input component'iniz
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface ClassInfo {
  id: string;
  name: string;
}

interface StudentInfo {
  id: string;
  name: string;
}

function DekontGirisContent() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [schoolNumber, setSchoolNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      const result = await getClassesForReceiptLogin();
      if (result.error || !result.data) {
        setError(result.error || 'Sınıflar yüklenemedi.');
        toast.error(result.error || 'Sınıflar yüklenemedi.');
      } else {
        setClasses(result.data);
      }
      setIsLoading(false);
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      const fetchStudents = async () => {
        setIsLoading(true);
        setStudents([]); // Reset students when class changes
        setSelectedStudentId(''); // Reset selected student
        const result = await getStudentsByClassForReceiptLogin(selectedClassId);
        if (result.error || !result.data) {
          setError(result.error || 'Öğrenciler yüklenemedi.');
          toast.error(result.error || 'Öğrenciler yüklenemedi.');
        } else {
          setStudents(result.data);
        }
        setIsLoading(false);
      };
      fetchStudents();
    } else {
      setStudents([]);
      setSelectedStudentId('');
    }
  }, [selectedClassId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!selectedStudentId || !schoolNumber) {
      setError('Lütfen tüm alanları doldurun.');
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }
    setIsLoading(true);
    const result = await verifyStudentLogin(selectedStudentId, schoolNumber);
    setIsLoading(false);
    if (result.error || !result.data) {
      setError(result.error || 'Giriş başarısız.');
      toast.error(result.error || 'Giriş başarısız.');
    } else {
      toast.success('Giriş başarılı! Yönlendiriliyorsunuz...');
      const { studentId, studentName, className, schoolNumber: sn } = result.data;
      const currentAcademicYear = new Date().getFullYear(); 
      router.push(`/ogrenci/dekontlar?studentId=${studentId}&year=${currentAcademicYear}&name=${encodeURIComponent(studentName)}&className=${encodeURIComponent(className)}&schoolNumber=${encodeURIComponent(sn)}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Hüsniye Özdilek M.T.A.L Bilişim Alanı Öğrenci Dekont Girişi</CardTitle>
          <CardDescription className="text-center">
            Lütfen sınıfınızı ve adınızı seçip okul numaranızı girerek sisteme giriş yapın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="classSelect">Sınıfınız</Label>
              <Select 
                value={selectedClassId} 
                onValueChange={setSelectedClassId} 
                disabled={isLoading || classes.length === 0}
              >
                <SelectTrigger id="classSelect">
                  <SelectValue placeholder="Sınıfınızı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="studentSelect">Adınız Soyadınız</Label>
              <Select 
                value={selectedStudentId} 
                onValueChange={setSelectedStudentId} 
                disabled={isLoading || !selectedClassId || students.length === 0}
              >
                <SelectTrigger id="studentSelect">
                  <SelectValue placeholder="Adınızı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="schoolNumber">Okul Numaranız</Label>
              <Input 
                id="schoolNumber" 
                type="text" 
                value={schoolNumber} 
                onChange={(e) => setSchoolNumber(e.target.value)} 
                placeholder="Okul numaranızı girin" 
                required 
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading || !selectedStudentId || !schoolNumber}>
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-gray-500 text-center block">
          <p>Bu sistem sadece 12A, 12H ve 12Mesem sınıfı öğrencileri içindir.</p>
          <p>&copy; {new Date().getFullYear()} Okul Yönetimi</p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function DekontGirisPage() {
    return (
        // Suspense is not strictly necessary here as there are no direct searchParams used by the Content itself
        // but keeping it in case future versions re-introduce direct param usage or for consistency.
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
            <DekontGirisContent />
        </Suspense>
    );
} 