'use client';

import { completeLiveExam, getLiveExamById, getLiveExamParticipants, pauseLiveExam, resumeLiveExam } from "@/actions/liveExamActions";
import { getTestById } from "@/actions/testActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LiveExam, LiveExamParticipant, LiveExamStatus, ParticipantStatus } from "@/types/tests";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ExamMonitorPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const examId = params.examId;
  const [exam, setExam] = useState<LiveExam | null>(null);
  const [participants, setParticipants] = useState<LiveExamParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testTitle, setTestTitle] = useState<string>("");
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Sınav detaylarını ve katılımcıları yükle
        const [examData, participantsData] = await Promise.all([
          getLiveExamById(examId),
          getLiveExamParticipants(examId)
        ]);
        
        if (!examData) {
          toast.error('Sınav bulunamadı.');
          router.push('/teacher/exams');
          return;
        }
        
        setExam(examData);
        setParticipants(participantsData);
        
        // Test başlığını da al
        const testData = await getTestById(examData.testId);
        if (testData) {
          setTestTitle(testData.title);
        }
      } catch (error) {
        console.error('Error fetching exam data:', error);
        toast.error('Sınav bilgileri yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Aktif bir sınav ise otomatik yenileme interval'ı kur
    const interval = setInterval(() => {
      if (!isLoading) {
        refreshData();
      }
    }, 10000); // Her 10 saniyede bir güncelle
    
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [examId, router]);
  
  const refreshData = async () => {
    try {
      const participantsData = await getLiveExamParticipants(examId);
      setParticipants(participantsData);
      
      const examData = await getLiveExamById(examId);
      if (examData) {
        setExam(examData);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };
  
  const handlePauseResume = async () => {
    if (!exam) return;
    
    try {
      let result;
      
      if (exam.status === LiveExamStatus.ACTIVE) {
        result = await pauseLiveExam(examId);
        if (!('error' in result)) {
          toast.success('Sınav duraklatıldı.');
        }
      } else if (exam.status === LiveExamStatus.PAUSED) {
        result = await resumeLiveExam(examId);
        if (!('error' in result)) {
          toast.success('Sınav devam ettiriliyor.');
        }
      }
      
      if (result && 'error' in result) {
        toast.error(result.error);
      } else if (result) {
        setExam(result);
      }
    } catch (error) {
      console.error('Error changing exam status:', error);
      toast.error('Sınav durumu değiştirilirken bir hata oluştu.');
    }
  };
  
  const handleComplete = async () => {
    if (!confirm('Sınavı sonlandırmak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    
    try {
      const result = await completeLiveExam(examId);
      
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Sınav başarıyla tamamlandı.');
        setExam(result);
      }
    } catch (error) {
      console.error('Error completing exam:', error);
      toast.error('Sınav tamamlanırken bir hata oluştu.');
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Yükleniyor</div>
            <div className="text-sm text-gray-500">Sınav bilgileri alınıyor...</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!exam) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Sınav Bulunamadı</div>
            <div className="text-sm text-gray-500 mb-4">İstediğiniz sınav bulunamadı veya erişim izniniz yok.</div>
            <Button onClick={() => router.push('/teacher/exams')}>Sınavlara Dön</Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Katılımcı istatistikleri
  const totalParticipants = participants.length;
  const inProgressCount = participants.filter(p => p.status === ParticipantStatus.IN_PROGRESS).length;
  const completedCount = participants.filter(p => p.status === ParticipantStatus.COMPLETED).length;
  const registeredCount = participants.filter(p => p.status === ParticipantStatus.REGISTERED).length;
  const timedOutCount = participants.filter(p => p.status === ParticipantStatus.TIMED_OUT).length;
  
  // Ortalama ilerleme
  const totalProgress = participants.reduce((sum, p) => sum + p.progress, 0);
  const averageProgress = totalParticipants > 0 ? Math.round(totalProgress / totalParticipants) : 0;
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{exam.title}</h1>
          <p className="text-gray-500">
            Test: {testTitle} | Durum: {getStatusText(exam.status)}
          </p>
        </div>
        
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={refreshData}>
            Yenile
          </Button>
          
          {(exam.status === LiveExamStatus.ACTIVE || exam.status === LiveExamStatus.PAUSED) && (
            <>
              <Button 
                variant={exam.status === LiveExamStatus.ACTIVE ? "default" : "outline"}
                onClick={handlePauseResume}
              >
                {exam.status === LiveExamStatus.ACTIVE ? 'Duraklat' : 'Devam Ettir'}
              </Button>
              
              <Button variant="destructive" onClick={handleComplete}>
                Sınavı Bitir
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={() => router.push('/teacher/exams')}>
            Sınavlara Dön
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Toplam Öğrenci</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sınava Başlayan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tamamlayan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ortalama İlerleme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress}%</div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sınav Bilgileri</CardTitle>
          <CardDescription>
            Sınav detayları ve zamanlaması
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">Başlangıç Zamanı</div>
              <div>{format(new Date(exam.scheduledStartTime), 'dd.MM.yyyy HH:mm')}</div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-1">Bitiş Zamanı</div>
              <div>{format(new Date(exam.scheduledEndTime), 'dd.MM.yyyy HH:mm')}</div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-1">Sınav Süresi</div>
              <div>{exam.timeLimit} dakika</div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-1">Maksimum Deneme</div>
              <div>{exam.maxAttempts} kez</div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-1">Gerçek Başlama Zamanı</div>
              <div>{exam.actualStartTime 
                ? format(new Date(exam.actualStartTime), 'dd.MM.yyyy HH:mm:ss') 
                : 'Henüz başlamadı'}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-1">Gerçek Bitiş Zamanı</div>
              <div>{exam.actualEndTime 
                ? format(new Date(exam.actualEndTime), 'dd.MM.yyyy HH:mm:ss') 
                : 'Henüz bitmedi'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Sınav Katılımcıları</CardTitle>
          <CardDescription>
            Katılımcıların durumları ve ilerleme durumları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg">Henüz hiç katılımcı yok.</p>
              <p className="text-sm text-gray-500 mt-2">Öğrenciler sınava giriş yaptıkça burada görünecekler.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci ID</th>
                    <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                    <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlama</th>
                    <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamamlama</th>
                    <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlerleme</th>
                    <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {participants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="py-4">{participant.studentId}</td>
                      <td className="py-4">{getParticipantStatusBadge(participant.status)}</td>
                      <td className="py-4">
                        {participant.startTime 
                          ? format(new Date(participant.startTime), 'HH:mm:ss') 
                          : 'Başlamadı'}
                      </td>
                      <td className="py-4">
                        {participant.submitTime 
                          ? format(new Date(participant.submitTime), 'HH:mm:ss') 
                          : '-'}
                      </td>
                      <td className="py-4 pr-4 w-64">
                        <div className="relative pt-1">
                          <Progress value={participant.progress} className="h-2" />
                          <div className="text-xs text-right mt-1">{participant.progress}%</div>
                        </div>
                      </td>
                      <td className="py-4">
                        {participant.score !== undefined ? `${participant.score}%` : '-'}
                        {participant.isPassed !== undefined && (
                          <span className={`ml-2 ${participant.isPassed ? 'text-green-500' : 'text-red-500'}`}>
                            {participant.isPassed ? '(Geçti)' : '(Kaldı)'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusText(status: LiveExamStatus): string {
  switch (status) {
    case LiveExamStatus.DRAFT:
      return 'Taslak';
    case LiveExamStatus.SCHEDULED:
      return 'Zamanlanmış';
    case LiveExamStatus.ACTIVE:
      return 'Aktif';
    case LiveExamStatus.PAUSED:
      return 'Duraklatılmış';
    case LiveExamStatus.COMPLETED:
      return 'Tamamlandı';
    case LiveExamStatus.CANCELLED:
      return 'İptal Edildi';
    default:
      return status;
  }
}

function getParticipantStatusBadge(status: ParticipantStatus) {
  switch (status) {
    case ParticipantStatus.REGISTERED:
      return <Badge variant="outline">Kayıtlı</Badge>;
    case ParticipantStatus.IN_PROGRESS:
      return <Badge className="bg-blue-500">Devam Ediyor</Badge>;
    case ParticipantStatus.COMPLETED:
      return <Badge className="bg-green-500">Tamamlandı</Badge>;
    case ParticipantStatus.TIMED_OUT:
      return <Badge className="bg-red-500">Süre Doldu</Badge>;
    case ParticipantStatus.DISQUALIFIED:
      return <Badge variant="destructive">Diskalifiye</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
} 