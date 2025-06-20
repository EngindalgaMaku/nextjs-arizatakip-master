'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase"; // Direkt supabase client'ı kullanalım
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

interface Class {
  id: string;
  name: string;
  // Gerekirse diğer alanlar eklenebilir
}

interface Student {
  id: string;
  name: string;
  school_number: string;
  // Gerekirse diğer alanlar eklenebilir
}

export default function StudentLoginPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [schoolNumberInput, setSchoolNumberInput] = useState<string>("");
  
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sınıfları çek
  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      const { data, error } = await supabase.from('classes').select('id, name'); // Sütun adlarını kontrol edin
      if (error) {
        toast.error("Sınıflar yüklenirken bir hata oluştu.");
        console.error("Error fetching classes:", error);
      } else {
        setClasses(data || []);
      }
      setIsLoadingClasses(false);
    };
    fetchClasses();
  }, []);

  // Sınıf seçildiğinde öğrencileri çek
  useEffect(() => {
    if (selectedClassId) {
      const fetchStudents = async () => {
        setIsLoadingStudents(true);
        setStudents([]); // Önceki öğrenci listesini temizle
        setSelectedStudentId(""); // Seçili öğrenciyi sıfırla
        console.log("Fetching students for class ID:", selectedClassId); // Log selectedClassId
        const { data, error } = await supabase
          .from('students')
          .select('id, name, school_number') // full_name -> name olarak güncellendi
          .eq('class_id', selectedClassId); // Sütun adını kontrol edin

        if (error) {
          toast.error("Öğrenciler yüklenirken bir hata oluştu.");
          console.error("Error fetching students (raw object):", error);
          console.error("Error fetching students (JSON):", JSON.stringify(error, null, 2));
        } else {
          setStudents(data || []);
        }
        setIsLoadingStudents(false);
      };
      fetchStudents();
    }
  }, [selectedClassId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsVerifying(true);

    if (!selectedClassId || !selectedStudentId || !schoolNumberInput) {
      toast.error("Lütfen tüm alanları doldurun.");
      setIsVerifying(false);
      return;
    }

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    if (!selectedStudent) {
      toast.error("Seçilen öğrenci bulunamadı.");
      setIsVerifying(false);
      return;
    }

    if (selectedStudent.school_number === schoolNumberInput) {
      toast.success(`Giriş başarılı! Hoş geldin ${selectedStudent.name}.`);
      // Öğrenciyi belirli bir canlı sınav ID'sine /student/exams/ adresine yönlendiriyoruz.
      // URL'deki examId, live_exams tablosundaki ID'dir.
      router.push(`/student/exams/660d1816-15ec-4de5-86c0-9d8820b8ba36?studentId=${selectedStudent.id}`); 
    } else {
      toast.error("Okul numarası eşleşmedi. Lütfen kontrol edin.");
    }
    setIsVerifying(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Öğrenci Girişi</CardTitle>
          <CardDescription className="text-center">
            Sınav sistemine devam etmek için bilgilerinizi seçin ve okul numaranızı girin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="class-select">Sınıfınızı Seçin</Label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
                disabled={isLoadingClasses || isVerifying}
              >
                <SelectTrigger id="class-select">
                  <SelectValue placeholder={isLoadingClasses ? "Sınıflar yükleniyor..." : "Sınıf seçin"} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClassId && (
              <div className="space-y-2">
                <Label htmlFor="student-select">Adınızı Seçin</Label>
                <Select
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
                  disabled={isLoadingStudents || students.length === 0 || isVerifying}
                >
                  <SelectTrigger id="student-select">
                    <SelectValue placeholder={isLoadingStudents ? "Öğrenciler yükleniyor..." : (students.length === 0 ? "Bu sınıfta öğrenci bulunamadı" : "Öğrenci seçin")} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedStudentId && (
                <div className="space-y-2">
                    <Label htmlFor="school-number">Okul Numaranız</Label>
                    <Input 
                        id="school-number" 
                        type="text" // Genellikle string olur, sayısal kısıtlama eklenebilir
                        value={schoolNumberInput}
                        onChange={(e) => setSchoolNumberInput(e.target.value)}
                        placeholder="Okul numaranızı girin"
                        disabled={isVerifying}
                        required 
                    />
                </div>
            )}

            <Button type="submit" className="w-full" disabled={isVerifying || !selectedClassId || !selectedStudentId || !schoolNumberInput}>
              {isVerifying ? "Doğrulanıyor..." : "Devam Et"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 