'use client';

import {
    createLiveExam,
    deleteLiveExam,
    getLiveExams, // Changed from getLiveExamsByTeacher
    startLiveExam,
} from "@/actions/liveExamActions";
import { getTests } from "@/actions/testActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveExam, LiveExamCreationParams, LiveExamStatus, Test } from "@/types/tests";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

// Helper function to get status badge (can be kept as is or moved to a shared utils file)
function getExamStatusBadge(status: LiveExamStatus) {
  switch (status) {
    case LiveExamStatus.DRAFT:
      return <Badge variant="outline">Taslak</Badge>;
    case LiveExamStatus.SCHEDULED:
      return <Badge variant="secondary">Zamanlanmış</Badge>;
    case LiveExamStatus.ACTIVE:
      return <Badge className="bg-green-500 text-white">Aktif</Badge>;
    case LiveExamStatus.PAUSED:
      return <Badge className="bg-yellow-500 text-white">Duraklatılmış</Badge>;
    case LiveExamStatus.COMPLETED:
      return <Badge variant="default">Tamamlanmış</Badge>;
    case LiveExamStatus.CANCELLED:
      return <Badge variant="destructive">İptal</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface ExamTableProps {
  exams: LiveExam[];
  onStartExam: (examId: string) => void;
  onMonitorExam: (examId: string) => void;
  onDeleteExam: (examId: string) => void;
  // Add other action handlers if needed, e.g., onPauseExam, onCompleteExam
}

function ExamTable({ exams, onStartExam, onMonitorExam, onDeleteExam }: ExamTableProps) {
  if (exams.length === 0) {
    return <div className="text-center py-6">Hiç canlı sınav bulunamadı.</div>;
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sınav Adı</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead>Başlangıç</TableHead>
          <TableHead>Bitiş</TableHead>
          <TableHead>Süre</TableHead>
          <TableHead className="text-right">İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exams.map(exam => {
          const now = new Date();
          const endDate = new Date(exam.scheduledEndTime);
          const isExpired = endDate < now;

          return (
            <TableRow key={exam.id} className={isExpired ? 'bg-red-50' : ''}>
              <TableCell className={`font-medium ${isExpired ? 'text-red-700' : ''}`}>
                {exam.title}
              </TableCell>
              <TableCell>
                {isExpired ? (
                  <Badge variant="destructive">Süresi Doldu</Badge>
                ) : (
                  getExamStatusBadge(exam.status)
                )}
              </TableCell>
              <TableCell>{format(new Date(exam.scheduledStartTime), 'dd.MM.yyyy HH:mm')}</TableCell>
              <TableCell className={isExpired ? 'text-red-700 font-medium' : ''}>
                {format(new Date(exam.scheduledEndTime), 'dd.MM.yyyy HH:mm')}
              </TableCell>
              <TableCell>{exam.timeLimit} dk.</TableCell>
              <TableCell className="text-right space-x-2">
                {!isExpired && exam.status === LiveExamStatus.SCHEDULED && (
                  <Button variant="outline" size="sm" onClick={() => onStartExam(exam.id)}>
                    Başlat
                  </Button>
                )}
                {!isExpired && (exam.status === LiveExamStatus.ACTIVE || exam.status === LiveExamStatus.PAUSED) && (
                  <Button variant="default" size="sm" onClick={() => onMonitorExam(exam.id)}>
                    İzle / Yönet
                  </Button>
                )}
                {(isExpired || exam.status === LiveExamStatus.COMPLETED) && (
                  <Button variant="outline" size="sm" onClick={() => onMonitorExam(exam.id)}>
                    Sonuçlar
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => onDeleteExam(exam.id)}>
                  Sil
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function AdminLiveExamsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [exams, setExams] = useState<LiveExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formState, setFormState] = useState<Partial<LiveExamCreationParams>>({
    timeLimit: 60,
    autoPublishResults: true,
    allowLateSubmissions: false,
    maxAttempts: 1,
    randomizeQuestions: true,
    randomizeOptions: true
  });
  
  // Placeholder for the current admin user's ID. 
  // In a real app, get this from authentication context or session.
  const adminUserId = "admin-user-placeholder-id"; 
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [testsData, examsData] = await Promise.all([
          getTests(),
          getLiveExams() // Fetches all live exams
        ]);
        
        setTests(testsData);
        setExams(examsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Veri yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []); 
  
  const handleCreateExam = async () => {
    if (!formState.testId) {
      toast.error('Lütfen bir test seçin.');
      return;
    }
    
    if (!formState.scheduledStartTime || !formState.scheduledEndTime) {
      toast.error('Lütfen başlangıç ve bitiş zamanlarını belirtin.');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const result = await createLiveExam(adminUserId, formState as LiveExamCreationParams);
      
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Canlı sınav başarıyla oluşturuldu.');
        setExams(prevExams => [result, ...prevExams]); // Prepend new exam
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Sınav oluşturulurken bir hata oluştu.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleStartExam = async (examId: string) => {
    try {
      const result = await startLiveExam(examId);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Sınav başarıyla başlatıldı.');
        setExams(prevExams => prevExams.map(exam => 
          exam.id === examId ? result : exam
        ));
      }
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error('Sınav başlatılırken bir hata oluştu.');
    }
  };
  
  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Bu sınavı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    try {
      const result = await deleteLiveExam(examId);
      if (!result.success) {
        toast.error(result.error || 'Sınav silinirken bir hata oluştu.');
      } else {
        toast.success('Sınav başarıyla silindi.');
        setExams(prevExams => prevExams.filter(exam => exam.id !== examId));
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Sınav silinirken bir hata oluştu.');
    }
  };
  
  const resetForm = () => {
    setFormState({
      timeLimit: 60,
      autoPublishResults: true,
      allowLateSubmissions: false,
      maxAttempts: 1,
      randomizeQuestions: true,
      randomizeOptions: true,
      testId: undefined, // Reset selected testId
      title: undefined,
      description: undefined,
      scheduledStartTime: undefined,
      scheduledEndTime: undefined,
      studentIds: undefined,
      classIds: undefined
    });
  };
  
  const handleDateChange = (field: 'scheduledStartTime' | 'scheduledEndTime', value: string) => {
    if (!value) {
      setFormState(prev => ({ ...prev, [field]: undefined }));
      return;
    }
    const date = new Date(value);
    setFormState(prev => ({ ...prev, [field]: date }));
  };
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sınav Yönetimi</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/tests')}>
            Testleri Yönet
          </Button>
          <Button asChild> 
            <Link href="/dashboard/live-exams/new">
              {/* <PlusCircle className="mr-2 h-5 w-5" /> */}
              Canlı Sınav Oluştur
            </Link>
          </Button>
          {/* <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { 
            setIsDialogOpen(isOpen);
            if (!isOpen) resetForm(); // Reset form when dialog closes
          }}>
            <DialogTrigger asChild>
              <Button>Yeni Canlı Sınav Oluştur</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Yeni Canlı Sınav Oluştur</DialogTitle>
                <DialogDescription>
                  Canlı sınavınız için detayları girin.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="testId" className="text-right">
                    Test
                  </Label>
                  <Select
                    value={formState.testId}
                    onValueChange={(value) => setFormState(prev => ({ ...prev, testId: value }))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Bir test seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {tests.map(test => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Sınav Başlığı
                  </Label>
                  <Input 
                    id="title" 
                    value={formState.title || ''} 
                    onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))} 
                    className="col-span-3" 
                    placeholder="Örn: 1. Dönem Matematik Sınavı"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Açıklama
                  </Label>
                  <Input 
                    id="description" 
                    value={formState.description || ''} 
                    onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))} 
                    className="col-span-3" 
                    placeholder="(Opsiyonel)"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scheduledStartTime" className="text-right">
                    Başlangıç Zamanı
                  </Label>
                  <Input 
                    id="scheduledStartTime" 
                    type="datetime-local" 
                    value={formState.scheduledStartTime ? format(formState.scheduledStartTime, "yyyy-MM-dd'T'HH:mm") : ''} 
                    onChange={(e) => handleDateChange('scheduledStartTime', e.target.value)} 
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scheduledEndTime" className="text-right">
                    Bitiş Zamanı
                  </Label>
                  <Input 
                    id="scheduledEndTime" 
                    type="datetime-local" 
                    value={formState.scheduledEndTime ? format(formState.scheduledEndTime, "yyyy-MM-dd'T'HH:mm") : ''} 
                    onChange={(e) => handleDateChange('scheduledEndTime', e.target.value)} 
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="timeLimit" className="text-right">
                    Süre (dakika)
                  </Label>
                  <Input 
                    id="timeLimit" 
                    type="number" 
                    value={formState.timeLimit || 60} 
                    onChange={(e) => setFormState(prev => ({ ...prev, timeLimit: parseInt(e.target.value, 10) }))} 
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxAttempts" className="text-right">
                    Max Deneme Sayısı
                  </Label>
                  <Input 
                    id="maxAttempts" 
                    type="number" 
                    value={formState.maxAttempts || 1} 
                    onChange={(e) => setFormState(prev => ({ ...prev, maxAttempts: parseInt(e.target.value, 10) || 1 }))} 
                    className="col-span-3" 
                  />
                </div>
                <div className="flex items-center justify-between col-span-4 px-1">
                    <Label htmlFor="autoPublishResults" className="flex flex-col space-y-1">
                        <span>Sonuçları Otomatik Yayınla</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            Sınav bitince sonuçlar öğrencilere gösterilsin mi?
                        </span>
                    </Label>
                    <Switch 
                        id="autoPublishResults" 
                        checked={formState.autoPublishResults} 
                        onCheckedChange={(checked) => setFormState(prev => ({ ...prev, autoPublishResults: checked }))} 
                    />
                </div>
                 <div className="flex items-center justify-between col-span-4 px-1">
                    <Label htmlFor="allowLateSubmissions" className="flex flex-col space-y-1">
                        <span>Geç Gönderime İzin Ver</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            Süre bittikten sonra gönderime izin verilsin mi?
                        </span>
                    </Label>
                    <Switch 
                        id="allowLateSubmissions" 
                        checked={formState.allowLateSubmissions} 
                        onCheckedChange={(checked) => setFormState(prev => ({ ...prev, allowLateSubmissions: checked }))} 
                    />
                </div>
                 <div className="flex items-center justify-between col-span-4 px-1">
                    <Label htmlFor="randomizeQuestions" className="flex flex-col space-y-1">
                        <span>Soruları Karıştır</span>
                    </Label>
                    <Switch 
                        id="randomizeQuestions" 
                        checked={formState.randomizeQuestions} 
                        onCheckedChange={(checked) => setFormState(prev => ({ ...prev, randomizeQuestions: checked }))} 
                    />
                </div>
                 <div className="flex items-center justify-between col-span-4 px-1">
                    <Label htmlFor="randomizeOptions" className="flex flex-col space-y-1">
                        <span>Seçenekleri Karıştır</span>
                    </Label>
                    <Switch 
                        id="randomizeOptions" 
                        checked={formState.randomizeOptions} 
                        onCheckedChange={(checked) => setFormState(prev => ({ ...prev, randomizeOptions: checked }))} 
                    />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {setIsDialogOpen(false); resetForm();}}>
                  İptal
                </Button>
                <Button onClick={handleCreateExam} disabled={isCreating}>
                  {isCreating ? 'Oluşturuluyor...' : 'Sınavı Oluştur'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog> */}
        </div>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Yaklaşan Sınavlar</TabsTrigger>
          <TabsTrigger value="active">Aktif Sınavlar</TabsTrigger>
          <TabsTrigger value="completed">Tamamlanan Sınavlar</TabsTrigger>
          <TabsTrigger value="all">Tüm Sınavlar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <Card>
            <CardHeader><CardTitle>Yaklaşan Sınavlar</CardTitle><CardDescription>Henüz başlamamış ve zamanlanmış sınavlar.</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? (<div className="text-center py-6">Yükleniyor...</div>) : (
                <ExamTable 
                  exams={exams.filter(e => e.status === LiveExamStatus.SCHEDULED)} 
                  onStartExam={handleStartExam}
                  onMonitorExam={(examId) => router.push(`/dashboard/live-exams/${examId}/monitor`)} 
                  onDeleteExam={handleDeleteExam}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active">
          <Card>
            <CardHeader><CardTitle>Aktif Sınavlar</CardTitle><CardDescription>Şu anda devam eden sınavlar.</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? (<div className="text-center py-6">Yükleniyor...</div>) : (
                <ExamTable 
                  exams={exams.filter(e => e.status === LiveExamStatus.ACTIVE || e.status === LiveExamStatus.PAUSED)} 
                  onStartExam={handleStartExam}
                  onMonitorExam={(examId) => router.push(`/dashboard/live-exams/${examId}/monitor`)} 
                  onDeleteExam={handleDeleteExam}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed">
          <Card>
            <CardHeader><CardTitle>Tamamlanan Sınavlar</CardTitle><CardDescription>Tamamlanmış veya iptal edilmiş sınavlar.</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? (<div className="text-center py-6">Yükleniyor...</div>) : (
                <ExamTable 
                  exams={exams.filter(e => e.status === LiveExamStatus.COMPLETED || e.status === LiveExamStatus.CANCELLED)} 
                  onStartExam={handleStartExam}
                  onMonitorExam={(examId) => router.push(`/dashboard/live-exams/${examId}/monitor`)} 
                  onDeleteExam={handleDeleteExam}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all">
          <Card>
            <CardHeader><CardTitle>Tüm Sınavlar</CardTitle><CardDescription>Oluşturulmuş tüm sınavların listesi.</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? (<div className="text-center py-6">Yükleniyor...</div>) : (
                <ExamTable 
                  exams={exams} 
                  onStartExam={handleStartExam}
                  onMonitorExam={(examId) => router.push(`/dashboard/live-exams/${examId}/monitor`)} 
                  onDeleteExam={handleDeleteExam}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 