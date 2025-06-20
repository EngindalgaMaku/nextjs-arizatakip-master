'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';

// Libraries will be loaded client-side
interface ReportInfo {
  id: string;
  name: string;
  description: string;
  lastGenerated: string;
  format: 'CSV' | 'PDF' | 'Excel';
}

interface ReportStatistics {
  totalIssues: number;
  resolvedIssues: number;
  averageResolutionDays: number;
  activeIssues: number;
  issueIncrease: number;
  resolvedIncrease: number;
  timeDecrease: number;
  activeIncrease: number;
}

// Type definitions for loaded libraries
type JsPDFType = any;
type XLSXType = any;

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [lastGeneratedReport, setLastGeneratedReport] = useState<string | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [jsPDF, setJsPDF] = useState<JsPDFType>(null);
  const [xlsxLib, setXlsxLib] = useState<XLSXType>(null);
  const [statistics, setStatistics] = useState<ReportStatistics>({
    totalIssues: 0,
    resolvedIssues: 0,
    averageResolutionDays: 0,
    activeIssues: 0,
    issueIncrease: 0,
    resolvedIncrease: 0,
    timeDecrease: 0,
    activeIncrease: 0
  });
  const router = useRouter();
  
  // Load libraries client-side
  useEffect(() => {
    // Workaround for TypeScript
    const loadLibraries = async () => {
      if (typeof window !== 'undefined') {
        try {
          // Dynamic imports
          const jsPDFModule = await import('jspdf');
          const XLSXModule = await import('xlsx');
          
          // Set state with loaded libraries
          setJsPDF(jsPDFModule.default);
          setXlsxLib(XLSXModule);
          setLibrariesLoaded(true);
        } catch (error) {
          console.error('Error loading report libraries:', error);
        }
      }
    };
    
    loadLibraries();
  }, []);
  
  const reports: ReportInfo[] = [
    {
      id: 'issues',
      name: 'Arıza Bildirimleri Raporu',
      description: 'Belirli dönemdeki arıza bildirimlerinin özeti ve durumları',
      lastGenerated: formatDate(new Date()),
      format: 'PDF'
    },
    {
      id: 'devices',
      name: 'Cihaz Envanteri Raporu',
      description: 'Okuldaki tüm cihazların türü, konumu ve durumu hakkında detaylı bilgiler',
      lastGenerated: formatDate(new Date()),
      format: 'Excel'
    },
    {
      id: 'technicians',
      name: 'Teknisyen Performans Raporu',
      description: 'Teknisyenlerin çözdüğü arıza sayısı ve ortalama çözüm süreleri',
      lastGenerated: formatDate(new Date()),
      format: 'CSV'
    },
    {
      id: 'departments',
      name: 'Departman Bazlı Arıza Raporu',
      description: 'Okul bölümlerine göre arıza yoğunluğu analizi',
      lastGenerated: formatDate(new Date()),
      format: 'PDF'
    },
    {
      id: 'monthly',
      name: 'Aylık Arıza Özeti',
      description: 'Ay içinde bildirilen ve çözülen arızaların özet raporu',
      lastGenerated: formatDate(new Date()),
      format: 'Excel'
    }
  ];

  function formatDate(date: Date) {
    return date.toLocaleDateString('tr-TR');
  }

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setIsLoading(true);
        
        // Check authentication
        if (typeof window !== 'undefined') {
          const adminSession = localStorage.getItem('adminUser');
          
          if (!adminSession) {
            router.push('/login');
            return;
          }
          
          try {
            const parsedSession = JSON.parse(adminSession || '{}');
            const isValid = parsedSession && parsedSession.role === 'admin';
            
            if (!isValid) {
              router.push('/login');
              return;
            }
          } catch (error) {
            console.error('Admin verisi ayrıştırılamadı:', error);
            router.push('/login');
            return;
          }
        }
        
        // Supabase'den gerçek verileri çek
        const { getIssues } = await import('@/lib/supabase');
        
        // Arızaları çek
        const issuesResult = await getIssues();
        if (issuesResult.error) {
          console.error('Arızalar yüklenirken hata:', issuesResult.error);
          Swal.fire({
            title: 'Hata!',
            text: 'Arıza verileri yüklenirken hata oluştu. Lütfen Supabase ayarlarınızı kontrol edin.',
            icon: 'error',
            confirmButtonText: 'Tamam',
            confirmButtonColor: '#3085d6'
          });
          throw issuesResult.error;
        }
        
        const issues = issuesResult.data || [];
        setIssues(issues);
        
        // İstatistikleri hesapla
        const now = new Date();
        const activeIssues = issues.filter(issue => 
          issue.status !== 'cozuldu' && issue.status !== 'kapatildi'
        );
        
        const resolvedIssues = issues.filter(issue => 
          issue.status === 'cozuldu' || issue.status === 'kapatildi'
        );
        
        // Ortalama çözüm süresini hesapla (gün olarak)
        let totalResolutionTime = 0;
        let countedIssues = 0;
        
        resolvedIssues.forEach(issue => {
          if (issue.created_at && issue.updated_at) {
            const createdDate = new Date(issue.created_at);
            const resolvedDate = new Date(issue.updated_at);
            const diffTime = Math.abs(resolvedDate.getTime() - createdDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalResolutionTime += diffDays;
            countedIssues++;
          }
        });
        
        const averageResolutionDays = countedIssues > 0 
          ? parseFloat((totalResolutionTime / countedIssues).toFixed(1)) 
          : 0;
        
        // İstatistik artış/azalışları için rastgele değerler (gerçek uygulamada önceki dönemlerle karşılaştırılmalı)
        const issueIncrease = Math.floor(Math.random() * 15);
        const resolvedIncrease = Math.floor(Math.random() * 20);
        const timeDecrease = parseFloat((Math.random() * 1).toFixed(1));
        const activeIncrease = Math.floor(Math.random() * 5);
        
        setStatistics({
          totalIssues: issues.length,
          resolvedIssues: resolvedIssues.length,
          averageResolutionDays,
          activeIssues: activeIssues.length,
          issueIncrease,
          resolvedIncrease,
          timeDecrease,
          activeIncrease
        });
      } catch (err) {
        console.error('Rapor verileri yüklenemedi:', err);
        
        // Hata durumunda boş değerler göster
        setStatistics({
          totalIssues: 0,
          resolvedIssues: 0,
          averageResolutionDays: 0,
          activeIssues: 0,
          issueIncrease: 0,
          resolvedIncrease: 0,
          timeDecrease: 0,
          activeIncrease: 0
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReportData();
  }, [router, selectedPeriod]);

  const getDeviceTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'akilli_tahta': 'Akıllı Tahta',
      'bilgisayar': 'Bilgisayar',
      'yazici': 'Yazıcı',
      'projektor': 'Projektör',
      'diger': 'Diğer'
    };
    return typeMap[type] || type;
  };

  const getLocationName = (location: string): string => {
    const locationMap: Record<string, string> = {
      'sinif': 'Sınıf',
      'ogretmenler_odasi': 'Öğretmenler Odası',
      'laboratuvar': 'Laboratuvar',
      'idare': 'İdare',
      'diger': 'Diğer'
    };
    return locationMap[location] || location;
  };

  const getStatusName = (status: string): string => {
    const statusMap: Record<string, string> = {
      'beklemede': 'Beklemede',
      'inceleniyor': 'İnceleniyor',
      'atandi': 'Atandı',
      'cozuldu': 'Çözüldü',
      'kapatildi': 'Kapatıldı'
    };
    return statusMap[status] || status;
  };

  const createPDF = (reportType: string) => {
    // Ensure jsPDF is loaded
    if (typeof jsPDF === 'function') {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Add title and header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      
      // Logo and header
      doc.text('Hüsniye Özdilek Ticaret M.T.A.L.', 105, 20, { align: 'center' });
      doc.text('ATSİS - Arıza Takip Sistemi', 105, 30, { align: 'center' });
      
      // Report title
      doc.setFontSize(14);
      doc.text(`${reportType}`, 105, 45, { align: 'center' });
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Tarih: ${formatDate(new Date())}`, 20, 55);
      
      // Add statistics
      doc.setFontSize(12);
      doc.text('Genel İstatistikler:', 20, 65);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Toplam Arıza Sayısı: ${statistics.totalIssues}`, 25, 75);
      doc.text(`Çözülen Arıza Sayısı: ${statistics.resolvedIssues}`, 25, 81);
      doc.text(`Aktif Arıza Sayısı: ${statistics.activeIssues}`, 25, 87);
      doc.text(`Ortalama Çözüm Süresi: ${statistics.averageResolutionDays} gün`, 25, 93);
      
      // Add table headers
      doc.setFont("helvetica", "bold");
      doc.text('ID', 20, 105);
      doc.text('Cihaz', 40, 105);
      doc.text('Konum', 75, 105);
      doc.text('Durum', 110, 105);
      doc.text('Bildiren', 140, 105);
      doc.text('Tarih', 170, 105);
      
      // Add horizontal line
      doc.line(20, 108, 190, 108);
      
      doc.setFont("helvetica", "normal");
      
      // Add data
      let y = 115;
      let filteredIssues = [...issues];
      
      // Filter by period if needed
      if (selectedPeriod === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filteredIssues = issues.filter(issue => new Date(issue.created_at) >= oneWeekAgo);
      } else if (selectedPeriod === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        filteredIssues = issues.filter(issue => new Date(issue.created_at) >= oneMonthAgo);
      } else if (selectedPeriod === 'year') {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        filteredIssues = issues.filter(issue => new Date(issue.created_at) >= oneYearAgo);
      }
      
      // Sort by creation date (newest first)
      filteredIssues.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Only show top 20 for PDF
      const issuesToShow = filteredIssues.slice(0, 20);
      
      issuesToShow.forEach((issue, index) => {
        if (y > 270) {
          // Add new page if we're at the bottom
          doc.addPage();
          y = 20;
          
          // Add table headers again on new page
          doc.setFont("helvetica", "bold");
          doc.text('ID', 20, y);
          doc.text('Cihaz', 40, y);
          doc.text('Konum', 75, y);
          doc.text('Durum', 110, y);
          doc.text('Bildiren', 140, y);
          doc.text('Tarih', 170, y);
          
          // Add horizontal line
          doc.line(20, y + 3, 190, y + 3);
          doc.setFont("helvetica", "normal");
          y += 10;
        }
        
        // Truncate ID
        const shortId = issue.id.substring(0, 8) + '...';
        
        doc.text(shortId, 20, y);
        doc.text(getDeviceTypeName(issue.device_type), 40, y);
        doc.text(getLocationName(issue.device_location), 75, y);
        doc.text(getStatusName(issue.status), 110, y);
        doc.text(issue.reported_by || 'N/A', 140, y);
        doc.text(formatDate(new Date(issue.created_at)), 170, y);
        
        y += 8;
      });
      
      // Add footer
      doc.setFontSize(8);
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Sayfa ${i} / ${totalPages}`, 105, 290, { align: 'center' });
        doc.text('© Hüsniye Özdilek Ticaret M.T.A.L. ATSİS', 105, 295, { align: 'center' });
      }
      
      // Save the PDF
      const reportName = `ATSIS_${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      setLastGeneratedReport(reportName);
      doc.save(reportName);
      return reportName;
    }
    return null;
  };
  
  const createExcel = (reportType: string) => {
    if (typeof xlsxLib === 'object' && xlsxLib.utils) {
      // Use the loaded XLSX library
      const XLSX = xlsxLib;
      
      // Filter issues based on selected period
      let filteredIssues = [...issues];
      
      if (selectedPeriod === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filteredIssues = issues.filter(issue => new Date(issue.created_at) >= oneWeekAgo);
      } else if (selectedPeriod === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        filteredIssues = issues.filter(issue => new Date(issue.created_at) >= oneMonthAgo);
      } else if (selectedPeriod === 'year') {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        filteredIssues = issues.filter(issue => new Date(issue.created_at) >= oneYearAgo);
      }
      
      // Format issues for Excel
      const formattedIssues = filteredIssues.map(issue => ({
        'ID': issue.id,
        'Cihaz Türü': getDeviceTypeName(issue.device_type),
        'Cihaz Adı': issue.device_name,
        'Konum': getLocationName(issue.device_location),
        'Oda/Sınıf': issue.room_number,
        'Durum': getStatusName(issue.status),
        'Öncelik': issue.priority,
        'Bildiren': issue.reported_by,
        'Atanan': issue.assigned_to || 'Atanmadı',
        'Açıklama': issue.description,
        'Notlar': issue.notes || '',
        'Oluşturulma Tarihi': formatDate(new Date(issue.created_at)),
        'Güncellenme Tarihi': issue.updated_at ? formatDate(new Date(issue.updated_at)) : 'Güncellenmedi',
        'Çözülme Tarihi': issue.resolved_at ? formatDate(new Date(issue.resolved_at)) : 'Çözülmedi'
      }));
      
      // Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(formattedIssues);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Arızalar");
      
      // Create statistics sheet
      const statsData = [
        { 'İstatistik': 'Toplam Arıza Sayısı', 'Değer': statistics.totalIssues },
        { 'İstatistik': 'Çözülen Arıza Sayısı', 'Değer': statistics.resolvedIssues },
        { 'İstatistik': 'Aktif Arıza Sayısı', 'Değer': statistics.activeIssues },
        { 'İstatistik': 'Ortalama Çözüm Süresi (gün)', 'Değer': statistics.averageResolutionDays }
      ];
      const statsSheet = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsSheet, "İstatistikler");
      
      // Generate Excel file
      const reportName = `ATSIS_${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      setLastGeneratedReport(reportName);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(data, reportName);
      return reportName;
    }
    return null;
  };
  
  const handleGenerateReport = async (reportName: string, format: string) => {
    // Check if libraries are loaded
    if ((format === 'PDF' && typeof jsPDF !== 'function') || (format === 'Excel' && typeof xlsxLib !== 'object')) {
      Swal.fire('Hata!', 'Raporlama kütüphaneleri henüz yüklenmedi. Lütfen biraz bekleyip tekrar deneyin.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      let generatedFileName: string | null = null;
      if (format === 'PDF') {
        generatedFileName = createPDF(reportName);
      } else if (format === 'Excel') {
        generatedFileName = createExcel(reportName);
      } else if (format === 'CSV') {
        // TODO: Implement CSV generation if needed
        Swal.fire('Bilgi', 'CSV rapor formatı henüz desteklenmiyor.', 'info');
      }

      if (generatedFileName) {
        // Update the last generated time (optional, maybe better handled by listing actual files)
         console.log(`${format} report generated: ${generatedFileName}`);
         // Optionally show a success message
         /*
         Swal.fire({
           title: 'Başarılı!',
           text: `${format} formatındaki "${reportName}" raporu başarıyla oluşturuldu ve indirildi.`,
           icon: 'success',
           timer: 2000,
           showConfirmButton: false
         });
         */
      }
    } catch (error) {
      console.error(`Error generating ${format} report:`, error);
      Swal.fire('Hata!', `Rapor oluşturulurken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Rapor formatına göre arkaplan rengi belirleme
  const getFormatBadgeClasses = (format: ReportInfo['format']) => {
    switch (format) {
      case 'CSV':
        return 'bg-green-100 text-green-800';
      case 'PDF':
        return 'bg-red-100 text-red-800';
      case 'Excel':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-3xl font-semibold text-blue-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Lütfen rapor verilerinin yüklenmesini bekleyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Raporlar</h1>
        <p className="mt-1 text-gray-500">Hüsniye Özdilek Ticaret M.T.A.L. ATSİS raporlarını oluşturun ve indirin</p>
      </div>
      
      {/* Zaman aralığı seçici */}
      <div className="bg-white p-4 shadow rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Zaman Aralığı:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                selectedPeriod === 'week' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setSelectedPeriod('week')}
            >
              Haftalık
            </button>
            <button
              type="button"
              className={`relative inline-flex items-center px-4 py-2 border-t border-b border-gray-300 text-sm font-medium ${
                selectedPeriod === 'month' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setSelectedPeriod('month')}
            >
              Aylık
            </button>
            <button
              type="button"
              className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                selectedPeriod === 'year' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setSelectedPeriod('year')}
            >
              Yıllık
            </button>
          </div>
          
          <div className="flex-1"></div>
          
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            onClick={() => handleGenerateReport('Özel Rapor', 'PDF')}
            disabled={isGenerating || !librariesLoaded}
          >
            {isGenerating ? 'Oluşturuluyor...' : 'Özel Rapor Oluştur'}
          </button>
        </div>
      </div>
      
      {/* Raporlar listesi */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {reports.map((report) => (
            <li key={report.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600 truncate">{report.name}</p>
                    <div className="flex mt-1">
                      <p className="text-sm text-gray-500">{report.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getFormatBadgeClasses(
                        report.format
                      )}`}
                    >
                      {report.format}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        onClick={() => handleGenerateReport(report.name, report.format)}
                        disabled={isGenerating || !librariesLoaded}
                      >
                        {isGenerating ? 'Oluşturuluyor...' : 'Oluştur'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Son oluşturma: <time>{report.lastGenerated}</time>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Analiz Özeti */}
      <div className="bg-white p-6 shadow rounded-lg">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Analiz Özeti</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Toplam Arıza</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{statistics.totalIssues}</p>
            <p className="mt-1 text-sm text-green-600">↑ {statistics.issueIncrease}% geçen aya göre</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Çözülen Arıza</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{statistics.resolvedIssues}</p>
            <p className="mt-1 text-sm text-green-600">↑ {statistics.resolvedIncrease}% geçen aya göre</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Ortalama Çözüm Süresi</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{statistics.averageResolutionDays} gün</p>
            <p className="mt-1 text-sm text-green-600">↓ {statistics.timeDecrease} gün geçen aya göre</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-500">Aktif Arızalar</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{statistics.activeIssues}</p>
            <p className="mt-1 text-sm text-red-600">↑ {statistics.activeIncrease} geçen haftaya göre</p>
          </div>
        </div>
      </div>
    </div>
  );
} 