'use client';

import { getReceiptDownloadUrl } from '@/actions/business-receipts/admin-actions';
import { updateReceipt, uploadReceipt } from '@/actions/business-receipts/receipt-actions';
import { getStudentReceiptsDashboard } from '@/actions/business-receipts/student-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpdateReceiptFormPayload, UploadReceiptFormPayload } from '@/types/schemas/receipt-schema';
import { ArrowDownTrayIcon, ArrowLeftOnRectangleIcon, ExclamationTriangleIcon, PencilIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import imageCompression from 'browser-image-compression';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Ay isimleri için bir map
const monthNames: { [key: number]: string } = {
  1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
  7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
};

const academicMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6]; // Eylül'den Haziran'a

interface StudentReceipt {
  id: string;
  month: number;
  year: number;
  file_path: string;
  file_name_original?: string | null;
  notes?: string | null;
  uploaded_at: string; // date string
  staj_isletmeleri?: { name: string } | null; // New structure to match the updated query
}

interface ReceiptFormState {
  receiptId?: string; // güncelleme için
  businessName: string;
  month: number;
  year: number;
  file?: File | null;
  notes: string;
}

function StudentReceiptDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');
  const currentYearParam = searchParams.get('year');
  const studentName = searchParams.get('name');
  const studentClassName = searchParams.get('className');
  const studentSchoolNumber = searchParams.get('schoolNumber');

  const [receipts, setReceipts] = useState<StudentReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearParam ? parseInt(currentYearParam) : 2024);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formState, setFormState] = useState<ReceiptFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchReceipts = async (yearToFetch: number) => {
    if (!studentId) {
      setError('Öğrenci bilgisi bulunamadı.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await getStudentReceiptsDashboard(studentId, yearToFetch);
      if (result.error || !result.data) {
        setError(result.error || 'Dekontlar alınamadı.');
        setReceipts([]);
      } else {
        setReceipts(result.data as StudentReceipt[]); // Tip cast
      }

    } catch (e) {
      setError('Dekontlar yüklenirken bir hata oluştu.');
      setReceipts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial call to fetchReceipts or test action
    fetchReceipts(selectedYear);
  }, [studentId, selectedYear]); // Keep dependencies, fetchReceipts will be called if they change

  useEffect(() => {
    if (currentYearParam && parseInt(currentYearParam) !== 2024) {
      setSelectedYear(2024);
    }
  }, [currentYearParam, studentId, studentName, studentClassName, router]);

  useEffect(() => {
    if (formState && typeof formState.month === 'number') {
      const month = formState.month;
      const academicStartYear = selectedYear; // selectedYear is the start of the academic session, e.g., 2024 for 2024-2025
      let newYear = formState.year;

      if (month >= 1 && month <= 6) { // Jan to June (typically second half of academic year)
        newYear = academicStartYear + 1;
      } else if (month >= 9 && month <= 12) { // Sept to Dec (typically first half of academic year)
        newYear = academicStartYear;
      } else {
        // Months 7 and 8 (July, August) are typically summer break, behavior might be different
        // For now, let's assume they fall into the second half or keep the current year if it's one of these
        // Or, if these months are not selectable, this branch isn't strictly needed.
        // Defaulting to keep formState.year or academicStartYear + 1 as a sensible default for summer.
        newYear = academicStartYear + 1; 
      }

      if (newYear !== formState.year) {
        setFormState(prevState => prevState ? { ...prevState, year: newYear } : null);
      }
    }
  }, [formState?.month, selectedYear]); // Watch for changes in selected month within the form and the overall selectedYear

  const handleYearChange = (newYearStr: string) => {
    const newYear = parseInt(newYearStr);
    setSelectedYear(newYear);
    // URL'i de güncellemek iyi olurdu, ama şimdilik sadece state'i güncelliyoruz.
    router.push(`/ogrenci/dekontlar?studentId=${studentId}&year=${newYear}&name=${encodeURIComponent(studentName || '')}&className=${encodeURIComponent(studentClassName || '')}`);
  };

  const openUploadForm = (month: number, year: number) => {
    setFormState({
      receiptId: undefined, // Explicitly undefined for new uploads
      businessName: '',
      month,
      year,
      notes: '',
      file: null, // Initialize file state
    });
    setSelectedFile(null);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openUpdateForm = (receipt: StudentReceipt) => {
    setFormState({
      receiptId: receipt.id,
      businessName: receipt.staj_isletmeleri?.name || '',
      month: receipt.month,
      year: receipt.year,
      notes: receipt.notes || '',
      file: null, // File will be set if user selects a new one
    });
    setSelectedFile(null); // Reset selected file view
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFileInstance = event.target.files && event.target.files[0];
    if (!selectedFileInstance) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(selectedFileInstance.type)) {
      toast.error('Lütfen sadece JPG/JPEG veya PDF formatında bir dosya seçin.');
      setSelectedFile(null);
      event.target.value = ''; // Reset file input
      return;
    }

    // For JPG/JPEG, check size and compress if needed
    if (['image/jpeg', 'image/jpg'].includes(selectedFileInstance.type)) {
      const maxSizeMB = 1;
      const options = {
        maxSizeMB: maxSizeMB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      if (selectedFileInstance.size > options.maxSizeMB * 1024 * 1024) {
          toast.loading('Dosya boyutu optimize ediliyor...');
          try {
              const compressedFile = await imageCompression(selectedFileInstance, options);
              toast.dismiss();
              toast.success(`Dosya optimize edildi! Yeni boyut: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
              setSelectedFile(compressedFile);
          } catch (error) {
              toast.dismiss();
              console.error('Dosya sıkıştırma hatası:', error);
              toast.error('Dosya optimize edilirken bir hata oluştu. Lütfen dosyayı kontrol edin veya daha küçük bir dosya deneyin.');
              setSelectedFile(null);
              event.target.value = ''; // Reset file input
          }
      } else {
          setSelectedFile(selectedFileInstance); // If already small enough, use the original file
      }
    } else if (selectedFileInstance.type === 'application/pdf') {
      const maxSizePDFMB = 5;
      if (selectedFileInstance.size > maxSizePDFMB * 1024 * 1024) {
        toast.error(`PDF dosyası ${maxSizePDFMB}MB boyutundan büyük olamaz. Lütfen daha küçük bir dosya seçin.`);
        setSelectedFile(null);
        event.target.value = ''; // Reset file input
        return;
      }
      setSelectedFile(selectedFileInstance);
    }
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    console.log('handleFormSubmit called. formState:', JSON.stringify(formState), 'selectedFile:', selectedFile?.name);
    event.preventDefault();
    if (!formState || !studentId) {
      console.error('Form state or studentId missing on submit.');
      toast.error('Form bilgileri eksik, lütfen tekrar deneyin.');
      return;
    }

    setIsFormLoading(true);
    setFormError(null);

    // Ensure month and year are numbers
    const currentMonth = typeof formState.month === 'number' ? formState.month : parseInt(String(formState.month), 10);
    const currentYear = typeof formState.year === 'number' ? formState.year : parseInt(String(formState.year), 10);

    if (isNaN(currentMonth) || isNaN(currentYear)) {
        console.error('Invalid month or year in form state:', formState);
        setFormError('Geçersiz ay veya yıl.');
        toast.error('Geçersiz ay veya yıl. Lütfen kontrol edin.');
        setIsFormLoading(false);
        return;
    }

    const payloadBase = {
      businessName: formState.businessName,
      month: currentMonth,
      year: currentYear,
      notes: formState.notes,
    };

    let result;
    try {
      if (formState.receiptId) { // Güncelleme
        console.log('Attempting to update receipt. Payload base:', payloadBase, 'File selected:', !!selectedFile);
        const updatePayload: UpdateReceiptFormPayload = { 
            ...payloadBase, 
            receiptId: formState.receiptId, 
            // file is handled as the third argument to updateReceipt if provided
        };
        result = await updateReceipt(studentId, updatePayload, selectedFile || undefined);
        console.log('updateReceipt result:', result);
      } else { // Yeni Yükleme
        if (!selectedFile) {
          setFormError('Lütfen bir dekont dosyası seçin.');
          toast.error('Lütfen bir dekont dosyası seçin.');
          setIsFormLoading(false);
          return;
        }
        console.log('Attempting to upload new receipt. Payload base:', payloadBase, 'File selected:', !!selectedFile);
        result = await uploadReceipt(studentId, payloadBase as UploadReceiptFormPayload, selectedFile);
        console.log('uploadReceipt result:', result);
      }

      if (!result) {
        console.error('Result from action was undefined or null.');
        setFormError('İşlem sonucu alınamadı.');
        toast.error('İşlem sonucu alınamadı. Sunucuyla iletişimde bir sorun olabilir.');
      } else if (result.error || !result.data) {
        console.error('Operation failed:', result.error || 'No data returned');
        setFormError(result.error || 'İşlem başarısız oldu.');
        toast.error(`İşlem başarısız: ${result.error || 'Bilinmeyen bir hata oluştu.'}`);
      } else {
        toast.success(formState.receiptId ? 'Dekont başarıyla güncellendi!' : 'Dekont başarıyla yüklendi!');
        setIsFormModalOpen(false); // Close dialog on success
        fetchReceipts(selectedYear); // Refresh the list
      }
    } catch (e: any) {
      console.error('Exception during form submission:', e);
      setFormError(`Bir hata oluştu: ${e.message || 'Unknown error'}`);
      toast.error(`İşlem sırasında bir hata oluştu: ${e.message || 'Lütfen sistem yöneticisiyle iletişime geçin.'}`);
    } finally {
      setIsFormLoading(false);
      console.log('Form submission process completed.');
    }
  };
  
  const handleDownload = async (receipt: StudentReceipt) => {
    toast.loading('İndirme linki oluşturuluyor...');
    
    const filePath = receipt.file_path;
    const originalFileName = receipt.file_name_original;
    console.log('[handleDownload] Called for receipt:', receipt);
    console.log('[handleDownload] Student info:', { studentName, studentSchoolNumber });

    const result = await getReceiptDownloadUrl(filePath);
    console.log('[handleDownload] Signed URL result:', result);

    if (result.data?.downloadUrl) {
      toast.dismiss();
      const link = document.createElement('a');
      link.href = result.data.downloadUrl;

      const monthName = monthNames[receipt.month] || 'Ay-'+receipt.month;
      const year = receipt.year;
      const decodedStudentName = studentName ? decodeURIComponent(studentName) : 'Ogrenci';
      const schoolNum = studentSchoolNumber ? decodeURIComponent(studentSchoolNumber) : 'OkulNo';
      const fileExt = filePath.split('.').pop() || 'jpg'; // Default to jpg as we accept JPGs

      // New filename format: [Student Name]-[School Number]-[Month Name] [Year].[ext]
      const downloadFileName = `${decodedStudentName}-${schoolNum}-${monthName} ${year}.${fileExt}`.replace(/[^a-zA-Z0-9\.\-\_ ]/g, '_'); // Sanitize filename
      
      console.log('[handleDownload] Determined filename:', downloadFileName);
      
      link.download = downloadFileName;
      console.log('[handleDownload] Anchor attributes:', { href: link.href, download: link.download });
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('İndirme başladı!');
    } else {
      toast.dismiss();
      toast.error(result.error || 'İndirme linki alınamadı.');
      console.error('[handleDownload] Failed to get download URL:', result.error);
    }
  };

  const handleLogout = () => {
    router.push('/dekont-giris'); // Redirect to the student login page
  };

  const handleDialogVisibilityChange = (isOpen: boolean) => {
    setIsFormModalOpen(isOpen);

    if (isOpen) {
      // If dialog is opening and formState hasn't been set by a specific button (openUploadForm/openUpdateForm)
      if (!formState) { // This condition means the generic "Dekont Ekle" button was clicked
        const defaultMonth = academicMonths.length > 0 ? academicMonths[0] : 9; // Fallback to 9 (Sept)

        // Use the current selectedYear from component state.
        // Ensure it's a valid number, defaulting to current real year if it's NaN.
        const actualSelectedYear = Number.isFinite(selectedYear) ? selectedYear : new Date().getFullYear();

        const defaultYear = (defaultMonth >= 9 && defaultMonth <= 12)
                            ? actualSelectedYear
                            : actualSelectedYear + 1;

        setFormState({
          receiptId: undefined,
          businessName: '',
          month: defaultMonth,
          year: defaultYear,
          notes: '',
          file: null
        });
        setSelectedFile(null);
        setFormError(null);
      }
    } else {
      // Dialog is closing. We are temporarily REMOVING setFormState(null) here to debug.
      // setFormState(null); 
      setSelectedFile(null);
      setFormError(null);
    }
  };

  if (!studentId) { // Simplified the initial check to just studentId, as studentName is for display
    return (
        <div className="container mx-auto p-4">
            <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <AlertTitle>Eksik Bilgi</AlertTitle>
                <AlertDescription>
                Öğrenci bilgilerine ulaşılamadı. Lütfen <a href='/dekont-giris' className='font-medium underline'>giriş sayfasına</a> dönüp tekrar deneyin.
                </AlertDescription>
            </Alert>
        </div>
    );
  }
  
  const academicYearStart = selectedYear;
  const academicYearEnd = selectedYear + 1;

  // Makbuzları aylara göre grupla
  const receiptsByMonth: { [key: number]: StudentReceipt | undefined } = {};
  receipts.forEach(r => {
    // Sadece seçili akademik yıla ait dekontları al (Eylül-Aralık YYYY, Ocak-Haziran YYYY+1)
    if ((r.month >= 9 && r.month <= 12 && r.year === academicYearStart) || 
        (r.month >= 1 && r.month <= 6 && r.year === academicYearEnd)) {
            receiptsByMonth[r.month] = r;
        }
  });

  // Only allow 2024-2025 academic year
  const yearOptions = [
    { value: '2024', label: '2024 - 2025 Eğitim Yılı' }
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Dialog open={isFormModalOpen} onOpenChange={handleDialogVisibilityChange}>
        <DialogContent 
          className="sm:max-w-[425px]" 
          onPointerDownCapture={(e) => {
            console.log('DialogContent onPointerDownCapture event target:', e.target);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {formState?.receiptId ? 'Dekont Güncelle' : 'Dekont Ekle'}
            </DialogTitle>
            <DialogDescription>
              {formState?.receiptId 
                ? `${monthNames[formState.month]} ${formState.year} ayı dekontunu güncelliyorsunuz.` 
                : 'Lütfen dekont bilgilerini girin.'
              }
            </DialogDescription>
          </DialogHeader>
          <form id="receipt-form" onSubmit={handleFormSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                İşletme
              </Label>
              <Input
                id="name"
                value={formState?.businessName || ''}
                onChange={(e) => setFormState(prev => prev ? { ...prev, businessName: e.target.value } : prev)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="month" className="text-right">
                Ay
              </Label>
              <Select
                value={formState?.month.toString() || ''}
                onValueChange={(value) => setFormState(prev => prev ? { ...prev, month: parseInt(value) } : prev)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Ay Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {academicMonths.map(month => (
                    <SelectItem key={month} value={month.toString()}>{monthNames[month]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                Yıl
              </Label>
              <Select
                value={formState?.year.toString() || ''}
                onValueChange={(value) => setFormState(prev => prev ? { ...prev, year: parseInt(value) } : prev)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Yıl Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 2025 - 2024 + 1 }, (_, i) => (
                    <SelectItem key={2024 + i} value={(2024 + i).toString()}>{2024 + i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notlar
              </Label>
              <Input
                id="notes"
                value={formState?.notes || ''}
                onChange={(e) => setFormState(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right">
                Dekont
              </Label>
              <div className="col-span-3">
                {formState?.receiptId && (
                  <p className="text-sm text-gray-600 mb-2">
                    Yeni dosya seçerek mevcut dekontu değiştirebilirsiniz. Dosya seçmezseniz sadece diğer bilgiler güncellenir.
                  </p>
                )}
                <input 
                  type="file" 
                  id="file" 
                  accept=".jpg,.jpeg,.pdf"
                  onChange={handleFileChange} 
                  className="block w-full text-sm text-slate-500 
                             file:mr-4 file:py-2 file:px-4 
                             file:rounded-full file:border-0 
                             file:text-sm file:font-semibold 
                             file:bg-violet-50 file:text-violet-700 
                             hover:file:bg-violet-100"
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="receipt-form" disabled={isFormLoading}>
              {isFormLoading ? 'İşlem yapılıyor...' : (formState?.receiptId ? 'Dekont Güncelle' : 'Dekont Ekle')}
            </Button>
          </DialogFooter>
        </DialogContent>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                  <CardTitle className="text-2xl">Hoşgeldin, {decodeURIComponent(studentName || '')}!</CardTitle>
                  <CardDescription>Sınıf: {decodeURIComponent(studentClassName || 'N/A')} - İşletme Dekontları ({academicYearStart}-{academicYearEnd})</CardDescription>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <PlusCircleIcon className="h-5 w-5 mr-2" />
                      Dekont Ekle
                    </Button>
                  </DialogTrigger>
                  <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                      <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Eğitim Yılı Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                          {yearOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Button onClick={handleLogout} variant="outline" size="icon" title="Çıkış Yap">
                      <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                  </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </Dialog>

      {isLoading && <p className="text-center py-4">Dekontlar yükleniyor...</p>}
      {error && <Alert variant="destructive" className="mb-4"><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {academicMonths.map(month => {
            const yearForMonth = (month >= 9 && month <= 12) ? academicYearStart : academicYearEnd;
            const receipt = receipts.find(r => r.month === month && r.year === yearForMonth);

            return (
              <Card key={`${yearForMonth}-${month}`} className="h-full">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <CardTitle className="text-sm">{monthNames[month]}</CardTitle>
                      <CardDescription>{yearForMonth}</CardDescription>
                    </div>
                    <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                      {receipt && (
                        <>
                          <Button onClick={() => openUpdateForm(receipt)} variant="outline" size="icon" title="Dekont Güncelle">
                            <PencilIcon className="h-5 w-5" />
                          </Button>
                          <Button onClick={() => handleDownload(receipt)} variant="outline" size="icon" title="Dekont İndir">
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {receipt ? (
                    <p className="text-sm text-gray-600 text-center py-4">Bu ayın dekontu sisteme yüklenmiştir.</p>
                  ) : (
                    <p className="text-center py-4">Dekont bulunamadı.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Wrap StudentReceiptDashboardContent with Suspense
const StudentDekontlarPage = () => {
  return (
    <Suspense fallback={<div className="container mx-auto p-4 text-center">Yükleniyor...</div>}>
      <StudentReceiptDashboardContent />
    </Suspense>
  );
};

export default StudentDekontlarPage;