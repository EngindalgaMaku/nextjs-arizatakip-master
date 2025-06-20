'use client';

import { createLiveExam, deleteLiveExam, getLiveExamsByTeacher, startLiveExam } from "@/actions/liveExamActions";
import { getTests } from "@/actions/testActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveExam, LiveExamCreationParams, LiveExamStatus, Test } from "@/types/tests";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function TeacherExamsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [exams, setExams] = useState<LiveExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form durumu
  const [formState, setFormState] = useState<Partial<LiveExamCreationParams>>({
    timeLimit: 60,
    autoPublishResults: true,
    allowLateSubmissions: false,
    maxAttempts: 1,
    randomizeQuestions: true,
    randomizeOptions: true
  });
  
  // Öğretmen ID'si - gerçek uygulamada authentication'dan gelecek
  const teacherId = "current-teacher-id"; // TODO: Auth'tan gerçek ID ile değiştir
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Testleri ve mevcut sınavları yükle
        const [testsData, examsData] = await Promise.all([
          getTests(),
          getLiveExamsByTeacher(teacherId)
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
  }, [teacherId]);
  
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
      const result = await createLiveExam(teacherId, formState as LiveExamCreationParams);
      
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Canlı sınav başarıyla oluşturuldu.');
        setExams([result, ...exams]);
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
        
        // Sınavlar listesini güncelle
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
        
        // Sınavlar listesini güncelle
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
      randomizeOptions: true
    });
  };
  
  const handleDateChange = (field: 'scheduledStartTime' | 'scheduledEndTime', value: string) => {
    if (!value) return;
    
    // ISO formatına çevir
    const date = new Date(value);
    setFormState(prev => ({
      ...prev,
      [field]: date
    }));
  };
  
  const getExamStatusBadge = (status: LiveExamStatus) => {
    switch (status) {
      case LiveExamStatus.DRAFT:
        return <Badge variant="outline">Taslak</Badge>;
      case LiveExamStatus.SCHEDULED:
        return <Badge variant="secondary">Zamanlanmış</Badge>;
      case LiveExamStatus.ACTIVE:
        return <Badge className="bg-green-500">Aktif</Badge>;
      case LiveExamStatus.PAUSED:
        return <Badge className="bg-yellow-500">Duraklatılmış</Badge>;
      case LiveExamStatus.COMPLETED:
        return <Badge variant="default">Tamamlanmış</Badge>;
      case LiveExamStatus.CANCELLED:
        return <Badge variant="destructive">İptal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Canlı Sınavlar</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Yeni Sınav Oluştur</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Yeni Canlı Sınav</DialogTitle>
              <DialogDescription>
                Canlı sınav oluşturmak için aşağıdaki bilgileri doldurun.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              await handleCreateExam();
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="test" className="text-right">
                    Test Seçin
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
                    Başlık
                  </Label>
                  <Input
                    id="title"
                    placeholder="Varsayılan: Test başlığı"
                    value={formState.title || ''}
                    onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Açıklama
                  </Label>
                  <Input
                    id="description"
                    placeholder="Varsayılan: Test açıklaması"
                    value={formState.description || ''}
                    onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
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
                    min="1"
                    value={formState.timeLimit || 60}
                    onChange={(e) => setFormState(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startTime" className="text-right">
                    Başlangıç 
                  </Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    onChange={(e) => handleDateChange('scheduledStartTime', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endTime" className="text-right">
                    Bitiş
                  </Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    onChange={(e) => handleDateChange('scheduledEndTime', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxAttempts" className="text-right">
                    Maks. Deneme
                  </Label>
                  <Select
                    value={formState.maxAttempts?.toString() || "1"}
                    onValueChange={(value) => setFormState(prev => ({ ...prev, maxAttempts: parseInt(value) }))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Maksimum deneme sayısı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (Tek deneme)</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right">Ayarlar</div>
                  <div className="col-span-3 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoPublish"
                        checked={formState.autoPublishResults}
                        onCheckedChange={(checked: boolean) => setFormState(prev => ({ ...prev, autoPublishResults: checked }))}
                      />
                      <Label htmlFor="autoPublish">Sonuçları otomatik yayınla</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="lateSubs"
                        checked={formState.allowLateSubmissions}
                        onCheckedChange={(checked: boolean) => setFormState(prev => ({ ...prev, allowLateSubmissions: checked }))}
                      />
                      <Label htmlFor="lateSubs">Geç gönderime izin ver</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="randomizeQuestions"
                        checked={formState.randomizeQuestions}
                        onCheckedChange={(checked: boolean) => setFormState(prev => ({ ...prev, randomizeQuestions: checked }))}
                      />
                      <Label htmlFor="randomizeQuestions">Soruları karıştır</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="randomizeOptions"
                        checked={formState.randomizeOptions}
                        onCheckedChange={(checked: boolean) => setFormState(prev => ({ ...prev, randomizeOptions: checked }))}
                      />
                      <Label htmlFor="randomizeOptions">Seçenekleri karıştır</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  İptal
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Oluşturuluyor...' : 'Sınavı Oluştur'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Yaklaşan Sınavlar</TabsTrigger>
          <TabsTrigger value="active">Aktif Sınavlar</TabsTrigger>
          <TabsTrigger value="completed">Tamamlanan Sınavlar</TabsTrigger>
          <TabsTrigger value="all">Tüm Sınavlar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Yaklaşan Sınavlar</CardTitle>
              <CardDescription>
                Henüz başlamamış ve zamanlanmış sınavlar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-6">Yükleniyor...</div>
              ) : (
                <ExamTable 
                  exams={exams.filter(e => e.status === LiveExamStatus.SCHEDULED)} 
                  onStartExam={handleStartExam}
                  onMonitorExam={(examId) => router.push(`/teacher/exams/${examId}/monitor`)}
                  onDeleteExam={handleDeleteExam}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Aktif Sınavlar</CardTitle>
              <CardDescription>
                Şu anda devam eden sınavlar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-6">Yükleniyor...</div>
              ) : (
                <ExamTable 
                  exams={exams.filter(e => e.status === LiveExamStatus.ACTIVE || e.status === LiveExamStatus.PAUSED)} 
                  onStartExam={handleStartExam}
                  onMonitorExam={(examId) => router.push(`/teacher/exams/${examId}/monitor`)}
                  onDeleteExam={handleDeleteExam}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Tamamlanan Sınavlar</CardTitle>
              <CardDescription>
                Tamamlanmış veya iptal edilmiş sınavlar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-6">Yükleniyor...</div>
              ) : (
                <ExamTable 
                  exams={exams.filter(e => e.status === LiveExamStatus.COMPLETED || e.status === LiveExamStatus.CANCELLED)} 
                  onStartExam={handleStartExam}
                  onMonitorExam={(examId) => router.push(`/teacher/exams/${examId}/monitor`)}
                  onDeleteExam={handleDeleteExam}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Tüm Sınavlar</CardTitle>
              <CardDescription>
                Oluşturduğunuz tüm sınavların listesi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-6">Yükleniyor...</div>
              ) : (
                <ExamTable 
                  exams={exams} 
                  onStartExam={handleStartExam}
                  onMonitorExam={(examId) => router.push(`/teacher/exams/${examId}/monitor`)}
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

interface ExamTableProps {
  exams: LiveExam[];
  onStartExam: (examId: string) => void;
  onMonitorExam: (examId: string) => void;
  onDeleteExam: (examId: string) => void;
}

function ExamTable({ exams, onStartExam, onMonitorExam, onDeleteExam }: ExamTableProps) {
  if (exams.length === 0) {
    return <div className="text-center py-6">Hiç sınav bulunamadı.</div>;
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
        {exams.map(exam => (
          <TableRow key={exam.id}>
            <TableCell className="font-medium">{exam.title}</TableCell>
            <TableCell>{getExamStatusBadge(exam.status)}</TableCell>
            <TableCell>{format(new Date(exam.scheduledStartTime), 'dd.MM.yyyy HH:mm')}</TableCell>
            <TableCell>{format(new Date(exam.scheduledEndTime), 'dd.MM.yyyy HH:mm')}</TableCell>
            <TableCell>{exam.timeLimit} dk.</TableCell>
            <TableCell className="text-right space-x-2">
              {exam.status === LiveExamStatus.SCHEDULED && (
                <Button variant="outline" size="sm" onClick={() => onStartExam(exam.id)}>
                  Başlat
                </Button>
              )}
              {(exam.status === LiveExamStatus.ACTIVE || exam.status === LiveExamStatus.PAUSED) && (
                <Button variant="default" size="sm" onClick={() => onMonitorExam(exam.id)}>
                  İzle
                </Button>
              )}
              {exam.status === LiveExamStatus.COMPLETED && (
                <Button variant="outline" size="sm" onClick={() => onMonitorExam(exam.id)}>
                  Sonuçlar
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => onDeleteExam(exam.id)}>
                Sil
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function getExamStatusBadge(status: LiveExamStatus) {
  switch (status) {
    case LiveExamStatus.DRAFT:
      return <Badge variant="outline">Taslak</Badge>;
    case LiveExamStatus.SCHEDULED:
      return <Badge variant="secondary">Zamanlanmış</Badge>;
    case LiveExamStatus.ACTIVE:
      return <Badge className="bg-green-500">Aktif</Badge>;
    case LiveExamStatus.PAUSED:
      return <Badge className="bg-yellow-500">Duraklatılmış</Badge>;
    case LiveExamStatus.COMPLETED:
      return <Badge variant="default">Tamamlanmış</Badge>;
    case LiveExamStatus.CANCELLED:
      return <Badge variant="destructive">İptal</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
} 