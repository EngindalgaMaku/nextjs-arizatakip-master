'use client';

import { fetchSemesters } from '@/actions/semesterActions';
import { loadUserData, signOut } from "@/lib/supabase";
import { useSemesterStore } from '@/stores/useSemesterStore';
import { Semester } from '@/types/semesters';
import {
    AcademicCapIcon,
    BookOpenIcon,
    BuildingLibraryIcon,
    BuildingOffice2Icon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    ComputerDesktopIcon,
    DocumentChartBarIcon,
    MapPinIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [queryClient] = useState(() => new QueryClient());
  
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId);
  const setSelectedSemesterId = useSemesterStore((state) => state.setSelectedSemesterId);

  function SemesterSelector() {
    const { data: semesters = [], isLoading } = useQuery<Semester[], Error>({
      queryKey: ['semestersForSelect'],
      queryFn: fetchSemesters,
      staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
      if (!selectedSemesterId && !isLoading && semesters.length > 0) {
        const activeSemester = semesters.find(s => s.is_active);
        if (activeSemester) {
          setSelectedSemesterId(activeSemester.id);
        }
      }
    }, [selectedSemesterId, semesters, isLoading, setSelectedSemesterId]);

    return (
      <div className="px-4 pt-4 pb-2">
        <label htmlFor="semester-select" className="block text-xs font-medium text-blue-300 mb-1">Aktif Sömestr</label>
        <select
          id="semester-select"
          value={selectedSemesterId || ''}
          onChange={(e) => setSelectedSemesterId(e.target.value || null)}
          disabled={isLoading}
          className="w-full p-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"
        >
          <option value="" disabled={!!selectedSemesterId}>-- Sömestr Seçin --</option>
          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.includes("/issues")) return "Arıza Takip";
    if (pathname.includes("/users")) return "Kullanıcılar";
    if (pathname.includes("/teachers")) return "Öğretmenler";
    if (pathname.includes("/reports")) return "Raporlar";
    if (pathname.includes("/settings")) return "Ayarlar";
    if (pathname.startsWith("/dashboard/tests")) return "Testler";
    return "Dashboard";
  };

  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      setWindowWidth(currentWidth);
      if (currentWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    if (windowWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname, windowWidth]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function getUserData() {
      try {
        const data = await loadUserData();
        setUserData(data);
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    }

    getUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminUser');
      }
      
      const { deleteCookie } = await import('cookies-next');
      deleteCookie('admin-session');
      
      await signOut();
      
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleOverlayClick = () => {
    if (windowWidth < 768 && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  const isPrintView = pathname === '/dashboard/locations/print' || pathname === '/dashboard/devices/print';

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen">
        {isSidebarOpen && windowWidth < 768 && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
            onClick={handleOverlayClick}
          />
        )}
        
        {!isPrintView && (
          <div
            className={`fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 shadow-lg transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="px-6 py-4 border-b border-blue-700 flex-shrink-0">
              <div className="flex items-center">
                <Image 
                  src="/okullogo.png" 
                  alt="Okul Logosu" 
                  width={40} 
                  height={40}
                  className="mr-3" 
                />
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">H.Ö. Ticaret M.T.A.L.</h1>
                  <p className="text-sm text-blue-200">Şeflik Paneli</p>
                </div>
              </div>
            </div>
            
            <SemesterSelector />

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              <Link
                href="/dashboard"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Gösterge Paneli
              </Link>

              <div className="pt-4 pb-2 px-3">
                <h4 className="text-xs font-semibold uppercase text-blue-300 tracking-wider">Okul Şeflik Yönetimi</h4>
              </div>

              <Link
                href="/dashboard/issues"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/issues")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <ClipboardDocumentListIcon className="mr-3 h-5 w-5" />
                Arızalar
              </Link>

              <div className="pt-4 pb-2 px-3">
                <h4 className="text-xs font-semibold uppercase text-blue-300 tracking-wider">Modüller</h4>
              </div>

              <Link
                href="/dashboard/business-receipts"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/dashboard/business-receipts")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <ClipboardDocumentListIcon className="mr-3 h-5 w-5" />
                İşletme Dekontları
              </Link>

              <Link
                href="/dashboard/live-exams"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.startsWith("/dashboard/live-exams")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <BookOpenIcon className="mr-3 h-5 w-5" />
                Sınavlar
              </Link>

              <Link
                href="/dashboard/forms"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/dashboard/forms")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <ClipboardDocumentListIcon className="mr-3 h-5 w-5" />
                Form Yönetimi
              </Link>

              <div className="pt-4 pb-2 px-3">
                <h4 className="text-xs font-semibold uppercase text-blue-300 tracking-wider">Alan Şeflik Yönetimi</h4>
              </div>

              <Link
                href="/dashboard/area-teachers"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/dashboard/area-teachers"
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <AcademicCapIcon className="mr-3 h-5 w-5" />
                Öğretmenler
              </Link>

              <Link
                href="/dashboard/branches"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/dashboard/branches")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <BuildingLibraryIcon className="mr-3 h-5 w-5" />
                Branş/Dal Yönetimi
              </Link>

              <Link
                href="/dashboard/classes"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/dashboard/classes")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <AcademicCapIcon className="mr-3 h-5 w-5" />
                Sınıf/Öğrenci İşlemleri
              </Link>

              <Link
                href="/dashboard/locations"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  (pathname.includes("/dashboard/locations") || pathname.includes("/dashboard/location-types")) && !pathname.includes("/dashboard/locations/print")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <MapPinIcon className="mr-3 h-5 w-5" />
                Lab./Sınıf/Odalar
              </Link>

              <Link
                href="/dashboard/devices"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/dashboard/devices") && !pathname.includes("/dashboard/devices/print")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <ComputerDesktopIcon className="mr-3 h-5 w-5" />
                Cihazlar
              </Link>

              <Link
                href="/dashboard/businesses"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.startsWith("/dashboard/businesses")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <BuildingOffice2Icon className="mr-3 h-5 w-5" />
                İşletmeler
              </Link>

              <Link
                href="/dashboard/reports"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/reports")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <DocumentChartBarIcon className="mr-3 h-5 w-5" />
                Raporlar
              </Link>

              <div className="pt-4 pb-2 px-3">
                <h4 className="text-xs font-semibold uppercase text-blue-300 tracking-wider">Yönetimsel İşlemler</h4>
              </div>

              <Link
                href="/dashboard/semesters"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.startsWith("/dashboard/semesters")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <CalendarDaysIcon className="mr-3 h-5 w-5" />
                Sömestr Yönetimi
              </Link>

              <Link
                href="/dashboard/settings"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/settings")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Ayarlar
              </Link>

              <Link
                href="/dashboard/users"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname.includes("/users")
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <UserGroupIcon className="mr-3 h-5 w-5" />
                Kullanıcılar
              </Link>

              <Link
                href="/dashboard/guide" 
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/dashboard/guide'
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              > 
                <BookOpenIcon className="mr-3 h-5 w-5" />
                Kullanım Kılavuzu
              </Link>

              <Link
                href="/dashboard/scheduling"
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/dashboard/scheduling'
                    ? "bg-blue-700 text-white"
                    : "text-gray-100 hover:bg-blue-700 hover:text-white"
                }`}
              >
                <ClockIcon className="mr-3 h-5 w-5" />
                Akıllı Ders Dağıtım
              </Link>
            </nav>
          </div>
        )}

        <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isPrintView ? '' : (isSidebarOpen ? 'md:ml-72' : 'md:ml-0')
        }`}>
          {!isPrintView && (
            <header className="bg-blue-50 shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center">
                <button
                  className="mr-3 text-gray-600 hover:text-gray-800 focus:outline-none"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  aria-label="Toggle sidebar"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                  </svg>
                </button>
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">{getPageTitle()}</h2>
              </div>
              
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 p-1 md:p-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {loading ? (
                    <span className="text-gray-500 text-xs md:text-sm">Yükleniyor...</span>
                  ) : userData ? (
                    <>
                      <span className="mr-1 text-xs md:text-sm">{userData.name || 'Kullanıcı'}</span>
                      <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isProfileMenuOpen ? 'transform rotate-180' : ''}`} />
                    </>
                  ) : (
                    <span className="text-red-500 text-xs md:text-sm">Hata</span>
                  )}
                </button>
                {isProfileMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5"
                    role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabIndex={-1}
                  >
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 focus:outline-none focus:ring-0"
                      role="menuitem" tabIndex={-1} id="user-menu-item-1"
                    >
                      <LogOutIcon className="mr-2 h-4 w-4" />
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </header>
          )}

          <main className={`flex-1 p-6 overflow-y-auto ${isPrintView ? '' : 'pt-20 md:pt-6'}`}>
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
} 