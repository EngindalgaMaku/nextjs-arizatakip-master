'use client';

import { AdminReceiptListItem, getReceiptDownloadUrl, getReceiptsForAdmin, updateAdminReceipt, type AdminReceiptFilter, type UpdateAdminReceiptPayload } from '@/actions/business-receipts/admin-actions';
import { deleteReceiptAndFile } from '@/actions/business-receipts/receipt-actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDownTrayIcon, FunnelIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const ITEMS_PER_PAGE = 10;
const monthNames: { [key: number]: string } = {
    1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
    7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
};

interface FiltersState {
    studentName?: string;
    schoolNumber?: string;
    className?: string;
    businessName?: string;
    month?: string; // string for select compatibility
    year?: string;  // string for select compatibility
}

interface AdminBusinessReceiptsContentProps {
  initialReceipts?: AdminReceiptListItem[];
  initialCount?: number;
  initialError?: string | null;
}

interface StudentByClass {
  className: string;
  students: string[];
}

interface StudentsByClassModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  studentsByClass: StudentByClass[];
  isLoading?: boolean;
}

const StudentsByClassModal: React.FC<StudentsByClassModalProps> = ({ isOpen, onOpenChange, studentsByClass, isLoading }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Sınıfa Göre Dekont Gönderen Öğrenciler</DialogTitle>
          <DialogDescription>
            Bu dönem dekont gönderen öğrencilerin sınıflara göre listesi.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Öğrenci listesi yükleniyor...</p>
            </div>
          ) : studentsByClass.length === 0 ? (
            <p>Filtre kriterlerine uygun dekont gönderen öğrenci bulunmamaktadır.</p>
          ) : (
            studentsByClass.map((classData) => (
              <div key={classData.className} className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{classData.className}</h3>
                {classData.students.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {classData.students.map((studentName, index) => (
                      <li key={index}>{studentName}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Bu sınıftan dekont gönderen öğrenci yok.</p>
                )}
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface EditReceiptModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  receiptData: AdminReceiptListItem | null;
  onReceiptUpdate: () => void;
}

const EditReceiptModal: React.FC<EditReceiptModalProps> = ({ isOpen, onOpenChange, receiptData, onReceiptUpdate }) => {
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentAcademicYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => (currentAcademicYear + 2) - i); // Future years for receipts
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    if (receiptData) {
      setMonth(receiptData.receipt_month.toString());
      setYear(receiptData.receipt_year.toString());
      setNotes(receiptData.receipt_notes || "");
      setBusinessName(receiptData.business_name || "");
      setError(null);
    } else {
      setMonth("");
      setYear("");
      setNotes("");
      setBusinessName("");
      setError(null);
    }
  }, [receiptData, setMonth, setYear, setNotes, setBusinessName, setError]);

  const handleSubmit = async () => {
    if (!receiptData) return;
    setError(null);
    setIsLoading(true);

    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedMonth) || isNaN(parsedYear)) {
      setError("Ay ve Yıl geçerli sayılar olmalıdır.");
      setIsLoading(false);
      return;
    }
    if (!businessName.trim()) {
        setError("İşletme adı boş olamaz.");
        setIsLoading(false);
        return;
    }

    const payload: UpdateAdminReceiptPayload = {
      receiptId: receiptData.receipt_id,
      month: parsedMonth,
      year: parsedYear,
      notes: notes.trim() === "" ? null : notes.trim(),
      businessName: businessName.trim(),
    };

    const result = await updateAdminReceipt(payload);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      toast.error(`Dekont güncellenemedi: ${result.error}`);
    } else {
      toast.success("Dekont başarıyla güncellendi!");
      onOpenChange(false);
      onReceiptUpdate();
    }
  };

  if (!isOpen || !receiptData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setMonth(receiptData?.receipt_month.toString() || "");
        setYear(receiptData?.receipt_year.toString() || "");
        setNotes(receiptData?.receipt_notes || "");
        setBusinessName(receiptData?.business_name || "");
        setError(null);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dekont Düzenle</DialogTitle>
          <DialogDescription>
            Dekont bilgilerini güncelleyin: {receiptData.student_name} (Okul No: {receiptData.student_school_number})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="month" className="text-right">
              Ay
            </Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="month" className="col-span-3">
                <SelectValue placeholder="Ay seçin" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m} value={m.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="year" className="text-right">
              Yıl
            </Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year" className="col-span-3">
                <SelectValue placeholder="Yıl seçin" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="businessName" className="text-right">
              İşletme Adı
            </Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="col-span-3"
              placeholder="İşletme adı"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notlar
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Dekont ile ilgili notlar (isteğe bağlı)"
            />
          </div>
          {error && (
            <p className="col-span-4 text-sm text-red-600 dark:text-red-500 text-center">{error}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">İptal</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function AdminBusinessReceiptsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const [receipts, setReceipts] = useState<AdminReceiptListItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStudentsByClassModalOpen, setIsStudentsByClassModalOpen] = useState(false);
    const [studentsByClassData, setStudentsByClassData] = useState<StudentByClass[]>([]);
    const [isModalDataLoading, setIsModalDataLoading] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const [isZipLoading, setIsZipLoading] = useState(false);
    const [filters, setFilters] = useState<FiltersState>(() => {
        const params: FiltersState = {};
        if (searchParams.get('studentName')) params.studentName = searchParams.get('studentName')!;
        if (searchParams.get('schoolNumber')) params.schoolNumber = searchParams.get('schoolNumber')!;
        if (searchParams.get('className')) params.className = searchParams.get('className')!;
        if (searchParams.get('businessName')) params.businessName = searchParams.get('businessName')!;
        if (searchParams.get('month')) params.month = searchParams.get('month')!;
        if (searchParams.get('year')) params.year = searchParams.get('year')!;
        return params;
    });

    const deleteReceiptMutation = useMutation({
        mutationFn: (params: { receiptId: string; filePath: string }) => deleteReceiptAndFile(params.receiptId, params.filePath),
        onSuccess: () => {
            toast.success('Dekont başarıyla silindi!');
            queryClient.invalidateQueries({ queryKey: ['adminReceipts', /* include filter params if they are part of the query key */] });
            fetchAdminReceipts(currentPage, filters);
        },
        onError: (error) => {
            toast.error(error.message || 'Dekont silinirken bir hata oluştu.');
        },
    });

    const openEditModal = (receipt: AdminReceiptListItem) => {
        setCurrentReceiptToEdit(receipt);
        setIsEditModalOpen(true);
    };
    
    const processStudentsByClass = useCallback((currentReceipts: AdminReceiptListItem[] | null | undefined) => {
        if (!currentReceipts || currentReceipts.length === 0) {
            setStudentsByClassData([]);
            return;
        }
        const byClass: { [key: string]: Set<string> } = {};
        currentReceipts.forEach(receipt => {
            if (receipt.student_name && receipt.student_class_name) {
                if (!byClass[receipt.student_class_name]) {
                    byClass[receipt.student_class_name] = new Set();
                }
                byClass[receipt.student_class_name].add(receipt.student_name);
            }
        });

        const processedData: StudentByClass[] = Object.entries(byClass)
            .map(([className, studentSet]) => ({
                className,
                students: Array.from(studentSet).sort(),
            }))
            .sort((a, b) => a.className.localeCompare(b.className));
        
        setStudentsByClassData(processedData);
    }, []);

    const getApiFilters = (currentFilters: FiltersState, forAll: boolean = false): AdminReceiptFilter => {
        const apiFilters: AdminReceiptFilter = {
            studentName: currentFilters.studentName || undefined,
            schoolNumber: currentFilters.schoolNumber || undefined,
            className: currentFilters.className || undefined,
            businessName: currentFilters.businessName || undefined,
            month: currentFilters.month && currentFilters.month !== 'all' ? parseInt(currentFilters.month) : undefined,
            year: currentFilters.year && currentFilters.year !== 'all' ? parseInt(currentFilters.year) : undefined,
        };
        if (forAll) {
            apiFilters.fetchAll = true;
        } else {
            apiFilters.page = currentPage;
            apiFilters.pageSize = ITEMS_PER_PAGE;
        }
        Object.keys(apiFilters).forEach(key => (apiFilters as any)[key] === undefined && delete (apiFilters as any)[key]);
        return apiFilters;
    };

    const fetchAdminReceipts = useCallback(async (pageToFetch: number, currentFilters: FiltersState) => {
        setIsLoading(true);
        setError(null);
        try {
            const apiParams = getApiFilters(currentFilters);
            apiParams.page = pageToFetch;
            const result = await getReceiptsForAdmin(apiParams);

            if (result.error) {
                setError(result.error);
                setReceipts([]);
                setTotalCount(0);
            } else {
                setReceipts(result.data || []);
                setTotalCount(result.count || 0);
                setError(null);
            }
        } catch (e: any) {
            console.error("Failed to fetch admin receipts:", e);
            setError("Dekontlar alınırken beklenmedik bir hata oluştu.");
            setReceipts([]);
            setTotalCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminReceipts(currentPage, filters);
    }, [currentPage, filters, fetchAdminReceipts]);

    const handleFilterInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFilterSelectChange = (name: keyof FiltersState, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setCurrentPage(1);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
        params.set('page', '1');
        router.push(`/dashboard/business-receipts?${params.toString()}`);
    };

    const clearFilters = () => {
        setFilters({});
        setCurrentPage(1);
        router.push('/dashboard/business-receipts?page=1');
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        router.push(`/dashboard/business-receipts?${params.toString()}`);
    };

    const handleDownload = async (filePath: string, fileName?: string | null) => {
        toast.loading('İndirme linki oluşturuluyor...');
        const result = await getReceiptDownloadUrl(filePath);
        if (result.data?.downloadUrl) {
            toast.dismiss();
            const link = document.createElement('a');
            link.href = result.data.downloadUrl;
            if (fileName) link.download = fileName; else link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('İndirme başladı!');
        } else {
            toast.error(result.error || 'İndirme linki alınamadı.');
        }
    };

    const handleDeleteReceipt = (receiptId: string, filePath: string) => {
        if (window.confirm('Bu dekontu ve ilişkili dosyayı kalıcı olarak silmek istediğinizden emin misiniz?')) {
            deleteReceiptMutation.mutate({ receiptId, filePath });
        }
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentReceiptToEdit, setCurrentReceiptToEdit] = useState<AdminReceiptListItem | null>(null);

    const handleShowStudentsByClass = async () => {
        setIsStudentsByClassModalOpen(true);
        setIsModalDataLoading(true);
        setStudentsByClassData([]);
        setError(null);

        try {
            const apiParams = getApiFilters(filters, true);
            const result = await getReceiptsForAdmin(apiParams);
            if (result.error) {
                setError(result.error);
                toast.error(`Öğrenci listesi alınamadı: ${result.error}`);
                processStudentsByClass(null);
            } else {
                processStudentsByClass(result.data);
            }
        } catch (e: any) {
            console.error("Failed to fetch all students for modal:", e);
            setError("Öğrenci listesi alınırken beklenmedik bir hata oluştu.");
            toast.error("Öğrenci listesi alınırken beklenmedik bir hata oluştu.");
            processStudentsByClass(null);
        } finally {
            setIsModalDataLoading(false);
        }
    };

    // ZIP all receipts grouped by month with new naming format
    const handleDownloadZip = async () => {
        setIsZipLoading(true);
        try {
            const apiParams = getApiFilters(filters, true);
            const result = await getReceiptsForAdmin(apiParams);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            const zip = new JSZip();
            
            // Academic year months in order (September to June)
            const academicMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
            const monthOrder: { [key: number]: number } = {};
            academicMonths.forEach((month, index) => {
                monthOrder[month] = index + 1;
            });

            for (const r of result.data || []) {
                const { data, error } = await getReceiptDownloadUrl(r.receipt_file_path);
                if (error || !data?.downloadUrl) {
                    toast.error(`İndirme linki alınamadı: ${r.student_name}`);
                    continue;
                }
                const blob = await fetch(data.downloadUrl).then(res => res.blob());
                
                // Create folder name: "1. EYLÜL 2024" format
                const monthName = monthNames[r.receipt_month]?.toUpperCase() || `AY-${r.receipt_month}`;
                const monthOrderNumber = monthOrder[r.receipt_month] || r.receipt_month;
                const folderName = `${monthOrderNumber}. ${monthName} ${r.receipt_year}`;
                const monthFolder = zip.folder(folderName);
                
                // Create file name: "Firma İsmi - Sınıf-ÖğrenciNo - Öğrenci İsmi - Ay Yıl" format
                const businessName = r.business_name || 'Bilinmeyen İşletme';
                const studentClass = r.student_class_name || 'Sınıf Yok';
                const studentNumber = r.student_school_number || 'No Yok';
                const studentName = r.student_name || 'İsim Yok';
                const monthNameTitleCase = monthNames[r.receipt_month] || `Ay-${r.receipt_month}`;
                
                // Get file extension from original file
                const fileExt = r.receipt_file_path.split('.').pop() || 'pdf';
                
                // Format: "SMMM Abdullah Koç - 12A-123 - Nisanur Biyikli - Ocak 2025.pdf"
                const newFileName = `${businessName} - ${studentClass}-${studentNumber} - ${studentName} - ${monthNameTitleCase} ${r.receipt_year}.${fileExt}`;
                
                // Sanitize filename (remove special characters that might cause issues)
                const sanitizedFileName = newFileName.replace(/[<>:"/\\|?*]/g, '_');
                
                monthFolder.file(sanitizedFileName, blob);
            }
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, 'dekontlar.zip');
        } catch (e) {
            console.error('ZIP oluşturma hatası:', e);
            toast.error('ZIP oluşturulurken bir hata oluştu.');
        } finally {
            setIsZipLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-2 sm:py-4 md:py-6 lg:py-8">
            <Card>
                <CardHeader className="flex items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-2xl font-bold">İşletme Dekontları (Yönetici)</CardTitle>
                    <div className="flex space-x-2 items-center">
                        <Button
                            onClick={handleShowStudentsByClass}
                            variant="outline"
                            disabled={isModalDataLoading}
                        >
                            {isModalDataLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Sınıfa Göre Öğrencileri Göster
                        </Button>
                        <Button
                            onClick={handleDownloadZip}
                            variant="outline"
                            disabled={isZipLoading}
                        >
                            {isZipLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Dekontları ZIP İndir
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="flex items-center justify-center">
                            <Alert variant="destructive">
                                <AlertTitle>Hata!</AlertTitle>
                                <AlertDescription>
                                    <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <FunnelIcon className="h-6 w-6 mr-2" /> Filtrele
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Input placeholder="Öğrenci Adı" name="studentName" value={filters.studentName || ''} onChange={handleFilterInputChange} />
                            <Input placeholder="Okul Numarası" name="schoolNumber" value={filters.schoolNumber || ''} onChange={handleFilterInputChange} />
                            <Input placeholder="Sınıf Adı (örn: 12A)" name="className" value={filters.className || ''} onChange={handleFilterInputChange} />
                            <Input placeholder="İşletme Adı" name="businessName" value={filters.businessName || ''} onChange={handleFilterInputChange} />
                            <Select name="month" value={filters.month || undefined} onValueChange={(value) => handleFilterSelectChange('month', value)}>
                                <SelectTrigger><SelectValue placeholder="Ay Seçin" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tüm Aylar</SelectItem>
                                    {Object.entries(monthNames).map(([num, name]) => <SelectItem key={num} value={num}>{name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select name="year" value={filters.year || undefined} onValueChange={(value) => handleFilterSelectChange('year', value)}>
                                <SelectTrigger><SelectValue placeholder="Yıl Seçin" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tüm Yıllar</SelectItem>
                                    {yearOptions.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <div className="flex space-x-2 md:col-span-2 lg:col-span-1 lg:justify-self-end">
                                <Button onClick={applyFilters} className="w-full sm:w-auto">Filtrele</Button>
                                <Button onClick={clearFilters} variant="outline" className="w-full sm:w-auto flex items-center">
                                    <XCircleIcon className="h-5 w-5 mr-1"/> Temizle
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {isLoading && <p className="text-center py-4">Dekontlar yükleniyor...</p>}

                    {!isLoading && !error && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Dekont Listesi ({totalCount} kayıt)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Öğrenci</TableHead>
                                            <TableHead>Okul No</TableHead>
                                            <TableHead>Sınıf</TableHead>
                                            <TableHead>İşletme</TableHead>
                                            <TableHead>Dönem</TableHead>
                                            <TableHead>Yüklenme</TableHead>
                                            <TableHead>Not</TableHead>
                                            <TableHead className="text-right">İşlemler</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {receipts.length > 0 ? receipts.map((r) => (
                                            <TableRow key={r.receipt_id}>
                                                <TableCell>{r.student_name || '-'}</TableCell>
                                                <TableCell>{r.student_school_number || '-'}</TableCell>
                                                <TableCell>{r.student_class_name || '-'}</TableCell>
                                                <TableCell>{r.business_name || '-'}</TableCell>
                                                <TableCell>{monthNames[r.receipt_month]} {r.receipt_year}</TableCell>
                                                <TableCell>{r.receipt_uploaded_at}</TableCell>
                                                <TableCell className="max-w-[150px] truncate" title={r.receipt_notes || undefined}>{r.receipt_notes || '-'}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleDownload(r.receipt_file_path, r.receipt_file_name_original)} title="İndir">
                                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => openEditModal(r)}
                                                        aria-label={`Dekont düzenle ${r.receipt_id}`}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        onClick={() => handleDeleteReceipt(r.receipt_id, r.receipt_file_path)}
                                                        title="Sil" 
                                                        disabled={deleteReceiptMutation.isPending && deleteReceiptMutation.variables?.receiptId === r.receipt_id}
                                                    >
                                                        {deleteReceiptMutation.isPending && deleteReceiptMutation.variables?.receiptId === r.receipt_id 
                                                            ? <span className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full" role="status" aria-label="loading"></span> 
                                                            : <TrashIcon className="h-4 w-4" />}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center">Filtre kriterlerine uygun dekont bulunamadı.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {totalPages > 1 && (
                        <Pagination className="mt-6">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious 
                                        href="#" 
                                        onClick={(e) => { 
                                            e.preventDefault(); 
                                            if(currentPage > 1) handlePageChange(currentPage - 1);
                                        }}
                                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                                {[...Array(totalPages)].map((_, i) => (
                                    <PaginationItem key={i}>
                                        <PaginationLink 
                                            href="#" 
                                            onClick={(e) => { 
                                                e.preventDefault(); 
                                                handlePageChange(i + 1); 
                                            }} 
                                            isActive={currentPage === i + 1}
                                        >
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext 
                                        href="#" 
                                        onClick={(e) => { 
                                            e.preventDefault(); 
                                            if(currentPage < totalPages) handlePageChange(currentPage + 1);
                                        }}
                                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    )}
                </CardContent>
            </Card>

            <EditReceiptModal
                isOpen={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                receiptData={currentReceiptToEdit}
                onReceiptUpdate={() => {
                    fetchAdminReceipts(currentPage, filters); 
                }}
            />
            <StudentsByClassModal
                isOpen={isStudentsByClassModalOpen}
                onOpenChange={setIsStudentsByClassModalOpen}
                studentsByClass={studentsByClassData}
                isLoading={isModalDataLoading}
            />
        </div>
    );
}

export default function AdminBusinessReceiptsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto p-8 text-center">Yönetim paneli yükleniyor...</div>}>
            <AdminBusinessReceiptsContent />
        </Suspense>
    );
} 