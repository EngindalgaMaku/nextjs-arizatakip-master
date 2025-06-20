'use client';

import { getLiveExamById, getLiveExamParticipants } from '@/actions/liveExamActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getClassNameById, getStudent, supabase } from '@/lib/supabase';
import { LiveExam, LiveExamParticipant, LiveExamStatus, ParticipantStatus, TestOption, TestQuestion } from '@/types/tests';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Hourglass, RefreshCw, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Function to format date and time
const formatDateTime = (dateString?: string | Date): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const getParticipantStatusBadge = (status: LiveExamParticipant['status']) => {
  switch (status) {
    case ParticipantStatus.REGISTERED:
      return <Badge variant="outline">Kayıtlı</Badge>;
    case ParticipantStatus.IN_PROGRESS:
      return <Badge variant="secondary">Devam Ediyor</Badge>;
    case ParticipantStatus.COMPLETED:
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Tamamladı</Badge>;
    case ParticipantStatus.ABANDONED:
      return <Badge variant="destructive">Terk Etti</Badge>;
    case ParticipantStatus.TIMED_OUT:
      return <Badge variant="destructive">Süre Doldu</Badge>;
    default:
      return <Badge variant="outline">Bilinmiyor</Badge>;
  }
};

async function handleDownloadPDF() {
  const input = document.getElementById('print-area');
  if (!input) return;
  const canvas = await html2canvas(input, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pageWidth;
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save('sonuc.pdf');
}

export default function LiveExamMonitorPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  const [liveExam, setLiveExam] = useState<LiveExam | null>(null);
  const [participants, setParticipants] = useState<LiveExamParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userMap, setUserMap] = useState<Record<string, { name: string | null; schoolNumber?: string; className?: string }>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<{ answers: Record<string, string>; score?: number } | null>(null);
  const [test, setTest] = useState<any>(null);
  const [modalStudent, setModalStudent] = useState<{ name: string | null; schoolNumber?: string; className?: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!examId) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const examData = await getLiveExamById(examId);
      if (examData) {
        setLiveExam(examData);
      } else {
        setError('Canlı sınav bulunamadı.');
        toast.error('Canlı sınav bulunamadı.');
        setLiveExam(null); // Clear previous data if any
      }

      const participantsData = await getLiveExamParticipants(examId);
      setParticipants(participantsData);

    } catch (err) {
      console.error('Error fetching live exam monitor data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Veri yüklenirken bilinmeyen bir hata oluştu.';
      setError(errorMessage);
      toast.error(`Veriler yüklenemedi: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [examId]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!isLoading && !error && liveExam?.status === LiveExamStatus.ACTIVE) { // Only refresh if exam is active
        const intervalId = setInterval(() => {
        fetchData();
        }, 30000); // 30 saniye
        return () => clearInterval(intervalId);
    }
  }, [isLoading, error, liveExam?.status, fetchData]);

  // Katılımcıların öğrenci bilgilerini çek
  useEffect(() => {
    async function fetchStudents() {
      if (participants.length === 0) return;
      const uniqueIds = Array.from(new Set(participants.map(p => p.studentId)));
      const studentResults = await Promise.all(uniqueIds.map(async (id) => {
        const { data, error } = await getStudent(id);
        console.log('getStudent:', id, data, error);
        if (error || !data) return [id, { name: null, schoolNumber: undefined, className: '-' }];
        let className = '-';
        if (data.class_id) {
          try {
            const classNameResult = await getClassNameById(data.class_id);
            console.log('getClassNameById:', data.class_id, classNameResult);
            if (classNameResult) className = classNameResult;
          } catch (e) {
            console.log('getClassNameById error:', e);
          }
        }
        return [id, {
          name: data.name,
          schoolNumber: data.school_number,
          className
        }];
      }));
      setUserMap(Object.fromEntries(studentResults));
    }
    fetchStudents();
  }, [participants]);

  // Sınavın testini ve sorularını çek
  useEffect(() => {
    async function fetchTest() {
      if (!liveExam?.testId) return;
      const { data, error } = await supabase.from('tests').select('*').eq('id', liveExam.testId).single();
      if (data) setTest(data);
    }
    fetchTest();
  }, [liveExam]);

  function handleShowAnswers(participant: LiveExamParticipant) {
    const user = userMap[participant.studentId] || { name: null, schoolNumber: undefined, className: undefined };
    setSelectedAnswers({ answers: participant.answers || {}, score: participant.score });
    setModalStudent({ name: user.name, schoolNumber: user.schoolNumber, className: user.className });
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <RefreshCw className="mr-2 h-8 w-8 animate-spin" />
        <p className="text-lg">İzleme verileri yükleniyor...</p>
      </div>
    );
  }

  if (error && !liveExam) { // If there's a critical error and no exam data
    return (
      <div className="container mx-auto p-4 md:p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-red-600">Hata</h2>
        <p className="text-red-500">{error}</p>
        <Button onClick={() => router.push('/dashboard/live-exams')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Canlı Sınav Listesine Dön
        </Button>
      </div>
    );
  }
  
  if (!liveExam) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-500" />
        <h2 className="mt-4 text-xl font-semibold">Canlı Sınav Bulunamadı</h2>
        <p>Belirtilen ID ile bir canlı sınav bulunamadı veya yüklenemedi.</p>
        <Button onClick={() => router.push('/dashboard/live-exams')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Canlı Sınav Listesine Dön
        </Button>
      </div>
    );
  }
  
  const totalParticipants = participants.length;
  const completedParticipants = participants.filter(p => p.status === ParticipantStatus.COMPLETED || p.status === ParticipantStatus.TIMED_OUT).length;
  const inProgressParticipants = participants.filter(p => p.status === ParticipantStatus.IN_PROGRESS).length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/live-exams')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Sınav Listesine Dön
        </Button>
        <h1 className="text-2xl font-bold text-center flex-1">Sınav İzleme: {liveExam.title}</h1>
        <Button onClick={fetchData} disabled={isRefreshing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sınav Detayları</CardTitle>
          <CardDescription>Canlı sınavın genel durumu ve bilgileri.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div><strong>Durum:</strong> <Badge variant={liveExam.status === LiveExamStatus.ACTIVE ? 'default' : (liveExam.status === LiveExamStatus.COMPLETED ? 'outline' : 'secondary')} className={liveExam.status === LiveExamStatus.ACTIVE ? 'bg-green-500' : ''}>{liveExam.status}</Badge></div>
          <div><strong>Planlanan Başlangıç:</strong> {formatDateTime(liveExam.scheduledStartTime)}</div>
          <div><strong>Planlanan Bitiş:</strong> {formatDateTime(liveExam.scheduledEndTime)}</div>
          {liveExam.actualStartTime && <div><strong>Gerçek Başlangıç:</strong> {formatDateTime(liveExam.actualStartTime)}</div>}
          {liveExam.actualEndTime && <div><strong>Gerçek Bitiş:</strong> {formatDateTime(liveExam.actualEndTime)}</div>}
          <div><Users className="inline mr-1 h-4 w-4" /> <strong>Kayıtlı Katılımcı:</strong> {totalParticipants}</div>
          <div><CheckCircle className="inline mr-1 h-4 w-4 text-green-600" /> <strong>Tamamlayan:</strong> {completedParticipants}</div>
          <div><Hourglass className="inline mr-1 h-4 w-4 text-blue-600" /> <strong>Devam Eden:</strong> {inProgressParticipants}</div>
          <div><Clock className="inline mr-1 h-4 w-4" /> <strong>Sınav Süresi:</strong> {liveExam.timeLimit} dakika</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Katılımcı Listesi</CardTitle>
          <CardDescription>Sınava kayıtlı öğrencilerin durumları ve ilerlemeleri.</CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Bu sınav için henüz katılımcı bulunmamaktadır.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Öğrenci ID</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Başlama Zamanı</TableHead>
                  <TableHead>Teslim Zamanı</TableHead>
                  <TableHead>İlerleme (%)</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => {
                  const user = userMap[participant.studentId] || { name: null, schoolNumber: undefined, className: undefined };
                  return (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {user.className || '-'}
                        <span style={{fontWeight:400}}>|</span>
                        {user.schoolNumber || '-'}
                        <span style={{fontWeight:400}}>|</span>
                        {user.name || '-'}
                      </TableCell>
                      <TableCell>{getParticipantStatusBadge(participant.status)}</TableCell>
                      <TableCell>{formatDateTime(participant.startTime)}</TableCell>
                      <TableCell>{formatDateTime(participant.submitTime)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Progress value={participant.progress || 0} className="w-24 mr-2 h-2.5" />
                          <span>{participant.progress || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleShowAnswers(participant)}>
                          Görüntüle
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedAnswers && test && (
        (() => {
          const dogruSayisi = test.questions.filter((q: TestQuestion) => selectedAnswers.answers[q.id] === q.correctOptionId).length;
          const toplamSoru = test.questions.length;
          const notYuz = toplamSoru > 0 ? Math.round((dogruSayisi / toplamSoru) * 100) : 0;
          const basariliMi = notYuz >= 50;
          return (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div
                className="bg-white p-8 rounded shadow max-w-2xl w-full flex flex-col print-modal-fix"
              >
                <div
                  id="print-area"
                  className="flex flex-col flex-1 min-h-0 print-modal-fix"
                  style={{
                    background: '#fff',
                    color: '#222',
                  }}
                >
                  <div className="mb-4 text-center font-bold text-lg">H.Ö. Ticaret Mesleki ve Teknik Anadolu Lisesi</div>
                  <div className="mb-4 flex flex-wrap gap-4 justify-center">
                    <div style={{ padding: 16, minWidth: 320, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                      <div className="font-semibold text-sm text-gray-600">Öğrenci Bilgileri:</div>
                      <div className="font-bold text-base mb-1" style={{display:'flex',gap:8,alignItems:'center',justifyContent:'center',marginBottom:16}}>
                        {modalStudent?.className || '-'}
                        <span style={{fontWeight:400}}>|</span>
                        {modalStudent?.schoolNumber || '-'}
                        <span style={{fontWeight:400}}>|</span>
                        {modalStudent?.name || '-'}
                      </div>
                      <div className="font-semibold text-sm text-gray-600">Sınav</div>
                      <div className="font-bold text-base">{liveExam?.title || '-'}</div>
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-4 justify-center">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, width: '100%', justifyContent: 'center', alignItems: 'stretch' }}>
                      <div style={{ border: '2px solid #e5e7eb', borderRadius: 8, padding: 12, minWidth: 80, background: '#fff', textAlign: 'center', flex: '1 1 80px', maxWidth: 120 }}>
                        <div className="font-semibold text-xs text-gray-600">Toplam Soru</div>
                        <div className="font-bold text-base">{toplamSoru}</div>
                      </div>
                      <div style={{ border: '2px solid #22c55e', borderRadius: 8, padding: 12, minWidth: 70, background: '#e6fbe8', textAlign: 'center', flex: '1 1 70px', maxWidth: 100 }}>
                        <div className="font-semibold text-xs text-green-700">Doğru</div>
                        <div className="font-bold text-base" style={{ color: 'green' }}>{dogruSayisi}</div>
                      </div>
                      <div style={{ border: '2px solid #ef4444', borderRadius: 8, padding: 12, minWidth: 70, background: '#fde8e8', textAlign: 'center', flex: '1 1 70px', maxWidth: 100 }}>
                        <div className="font-semibold text-xs text-red-700">Yanlış</div>
                        <div className="font-bold text-base" style={{ color: 'red' }}>{toplamSoru - dogruSayisi - test.questions.filter((q: TestQuestion) => selectedAnswers.answers[q.id] === undefined || selectedAnswers.answers[q.id] === null || selectedAnswers.answers[q.id] === '').length}</div>
                      </div>
                      <div style={{ border: '2px solid #888', borderRadius: 8, padding: 12, minWidth: 70, background: '#f3f4f6', textAlign: 'center', flex: '1 1 70px', maxWidth: 100 }}>
                        <div className="font-semibold text-xs text-gray-700">Boş</div>
                        <div className="font-bold text-base">{test.questions.filter((q: TestQuestion) => selectedAnswers.answers[q.id] === undefined || selectedAnswers.answers[q.id] === null || selectedAnswers.answers[q.id] === '').length}</div>
                      </div>
                      <div style={{ border: '2px solid #6366f1', borderRadius: 8, padding: 12, minWidth: 80, background: '#f3f4fd', textAlign: 'center', flex: '1 1 80px', maxWidth: 120 }}>
                        <div className="font-semibold text-xs text-indigo-700">Puan</div>
                        <div className="font-bold text-lg" style={{ color: basariliMi ? '#22c55e' : '#ef4444' }}>{notYuz}</div>
                        <div className="font-semibold text-xs mt-1" style={{ color: basariliMi ? '#22c55e' : '#ef4444' }}>{basariliMi ? 'Başarılı' : 'Başarısız'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0" style={{ overflowY: 'auto' }}>
                    {test.questions.length > 25 ? (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'nowrap', overflowX: 'auto', width: '100%' }}>
                        {/* Sol sütun: ilk 25 soru */}
                        <Table className="print-no-break" style={{ flex: 1, minWidth: 180, maxWidth: 220, fontSize: '0.85rem', margin: 'auto' }}>
                          <TableHeader>
                            <TableRow>
                              <TableHead style={{ width: 32 }}>S</TableHead>
                              <TableHead style={{ width: 48 }}>Cevap</TableHead>
                              <TableHead style={{ width: 48 }}>Doğru</TableHead>
                              <TableHead style={{ width: 32 }}>D.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {test.questions.slice(0, 25).map((q: TestQuestion, i: number) => {
                              function cevapHarfi(optionId: string, options: TestOption[]): string {
                                const idx = options.findIndex(o => o.id === optionId);
                                return idx >= 0 ? String.fromCharCode(65 + idx) : '-';
                              }
                              const ogrCevapId = selectedAnswers.answers[q.id];
                              const ogrCevap = cevapHarfi(ogrCevapId, q.options);
                              const dogruCevap = cevapHarfi(q.correctOptionId, q.options);
                              const isCorrect = ogrCevapId === q.correctOptionId;
                              const isEmpty = ogrCevapId === undefined || ogrCevapId === null || ogrCevapId === '';
                              return (
                                <TableRow key={i}>
                                  <TableCell style={{ width: 32 }}>{`S${i + 1}`}</TableCell>
                                  <TableCell style={{ width: 48 }}>{ogrCevap}</TableCell>
                                  <TableCell style={{ width: 48 }}>{dogruCevap}</TableCell>
                                  <TableCell style={{ width: 32 }}>
                                    {isEmpty
                                      ? <span style={{ color: '#888' }}>Boş</span>
                                      : (isCorrect
                                          ? <span style={{ color: 'green' }}>✔</span>
                                          : <span style={{ color: 'red' }}>✗</span>
                                        )
                                    }
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {/* Sağ sütun: kalan sorular */}
                        <Table className="print-no-break" style={{ flex: 1, minWidth: 180, maxWidth: 220, fontSize: '0.85rem', margin: 'auto' }}>
                          <TableHeader>
                            <TableRow>
                              <TableHead style={{ width: 32 }}>S</TableHead>
                              <TableHead style={{ width: 48 }}>Cevap</TableHead>
                              <TableHead style={{ width: 48 }}>Doğru</TableHead>
                              <TableHead style={{ width: 32 }}>D.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {test.questions.slice(25).map((q: TestQuestion, i: number) => {
                              function cevapHarfi(optionId: string, options: TestOption[]): string {
                                const idx = options.findIndex(o => o.id === optionId);
                                return idx >= 0 ? String.fromCharCode(65 + idx) : '-';
                              }
                              const ogrCevapId = selectedAnswers.answers[q.id];
                              const ogrCevap = cevapHarfi(ogrCevapId, q.options);
                              const dogruCevap = cevapHarfi(q.correctOptionId, q.options);
                              const isCorrect = ogrCevapId === q.correctOptionId;
                              const isEmpty = ogrCevapId === undefined || ogrCevapId === null || ogrCevapId === '';
                              return (
                                <TableRow key={i + 25}>
                                  <TableCell style={{ width: 32 }}>{`S${i + 26}`}</TableCell>
                                  <TableCell style={{ width: 48 }}>{ogrCevap}</TableCell>
                                  <TableCell style={{ width: 48 }}>{dogruCevap}</TableCell>
                                  <TableCell style={{ width: 32 }}>
                                    {isEmpty
                                      ? <span style={{ color: '#888' }}>Boş</span>
                                      : (isCorrect
                                          ? <span style={{ color: 'green' }}>✔</span>
                                          : <span style={{ color: 'red' }}>✗</span>
                                        )
                                    }
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <Table className="print-no-break">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Soru Kodu</TableHead>
                            <TableHead>Öğrenci Cevabı</TableHead>
                            <TableHead>Doğru Cevap</TableHead>
                            <TableHead>Durum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {test.questions.map((q: TestQuestion, i: number) => {
                            function cevapHarfi(optionId: string, options: TestOption[]): string {
                              const idx = options.findIndex(o => o.id === optionId);
                              return idx >= 0 ? String.fromCharCode(65 + idx) : '-';
                            }
                            const ogrCevapId = selectedAnswers.answers[q.id];
                            const ogrCevap = cevapHarfi(ogrCevapId, q.options);
                            const dogruCevap = cevapHarfi(q.correctOptionId, q.options);
                            const isCorrect = ogrCevapId === q.correctOptionId;
                            const isEmpty = ogrCevapId === undefined || ogrCevapId === null || ogrCevapId === '';
                            return (
                              <TableRow key={i}>
                                <TableCell>{`S${i + 1}`}</TableCell>
                                <TableCell>{ogrCevap}</TableCell>
                                <TableCell>{dogruCevap}</TableCell>
                                <TableCell>
                                  {isEmpty
                                    ? <span style={{ color: '#888' }}>Boş</span>
                                    : (isCorrect
                                        ? <span style={{ color: 'green' }}>✔</span>
                                        : <span style={{ color: 'red' }}>✗</span>
                                      )
                                  }
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    padding: '8px 16px',
                    background: '#6366f1',
                    color: 'white',
                    borderRadius: 4,
                    width: '100%',
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}
                >
                  Yazdır
                </button>
                <button
                  onClick={() => setSelectedAnswers(null)}
                  style={{
                    marginTop: 8,
                    padding: '8px 16px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: 4,
                    width: '100%',
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
} 