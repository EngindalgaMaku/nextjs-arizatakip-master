"use client";

import { useEffect, useState } from "react";
import { getDashboardStats } from "@/actions/dashboardActions";
import { fetchDevices } from "@/actions/deviceActions";
import { getLiveExams } from "@/actions/liveExamActions";
import { fetchForms } from "@/actions/formActions";
import { getReceiptsForAdmin, type AdminReceiptListItem } from '@/actions/business-receipts/admin-actions';
import Link from "next/link";
import { UsersIcon, DevicePhoneMobileIcon, DocumentTextIcon, ClipboardDocumentListIcon, AcademicCapIcon, XCircleIcon } from "@heroicons/react/24/outline";

// Mapping of month numbers to Turkish month names for labels
const monthNames: { [key: number]: string } = {
  1: 'Ocak', 2: 'Şubat', 3: 'Mart', 4: 'Nisan', 5: 'Mayıs', 6: 'Haziran',
  7: 'Temmuz', 8: 'Ağustos', 9: 'Eylül', 10: 'Ekim', 11: 'Kasım', 12: 'Aralık'
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [statsRes, devicesRes, examsRes, formsRes, receiptsRes] = await Promise.all([
        getDashboardStats(),
        fetchDevices(),
        getLiveExams(),
        fetchForms(),
        getReceiptsForAdmin({ page: 1, pageSize: 5 }),
      ]);
      setStats(statsRes);
      setDevices(devicesRes);
      setExams(examsRes);
      setForms(formsRes);
      // Format receipts to include student name and month/year in a label
      const rawReceipts = receiptsRes.data || [];
      const formatted = rawReceipts.map((r: AdminReceiptListItem) => ({
        ...r,
        label: `${r.student_name || '-'} - ${monthNames[r.receipt_month]} ${r.receipt_year}`
      }));
      setRecentReceipts(formatted);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-xl">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-blue-50 to-white min-h-screen">
      <h1 className="text-4xl font-extrabold mb-8 text-blue-900">Yönetim Paneli</h1>
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        <StatCard icon={<DevicePhoneMobileIcon className="h-8 w-8 text-blue-600" />} label="Cihazlar" value={devices.length} href="/dashboard/devices" color="from-blue-400 to-blue-600" />
        <StatCard icon={<XCircleIcon className="h-8 w-8 text-orange-600" />} label="Arızalar" value={stats?.totalIssuesCount ?? 0} href="/dashboard/issues" color="from-orange-400 to-orange-600" />
        <StatCard icon={<UsersIcon className="h-8 w-8 text-green-600" />} label="Kullanıcılar" value={stats?.usersCount ?? 0} href="/dashboard/users" color="from-green-400 to-green-600" />
        <StatCard icon={<AcademicCapIcon className="h-8 w-8 text-purple-600" />} label="Sınavlar" value={exams.length} href="/dashboard/live-exams" color="from-purple-400 to-purple-600" />
        <StatCard icon={<DocumentTextIcon className="h-8 w-8 text-pink-600" />} label="Formlar" value={forms.length} href="/dashboard/forms" color="from-pink-400 to-pink-600" />
      </div>
      {/* Son 5 Arızalar, Son 5 İşletme Dekontları, Son 5 Sınavlar ve Son 5 Formlar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <RecentList
          title="Son 5 Arızalar"
          items={stats?.recentIssues ?? []}
          itemKey="id"
          itemLabel="description"
          hrefPrefix="/dashboard/issues/"
          badgeColor="bg-orange-100 text-orange-700"
        />
        <RecentList
          title="Son 5 İşletme Dekontları"
          items={recentReceipts}
          itemKey="receipt_id"
          itemLabel="label"
          hrefPrefix="/dashboard/business-receipts/"
          badgeColor="bg-blue-100 text-blue-700"
        />
        <RecentList
          title="Son 5 Sınavlar"
          items={exams.slice(0, 5)}
          itemKey="id"
          itemLabel="title"
          hrefPrefix="/dashboard/live-exams/"
          badgeColor="bg-purple-100 text-purple-700"
        />
        <RecentList
          title="Son 5 Formlar"
          items={forms.slice(0, 5)}
          itemKey="id"
          itemLabel="title"
          hrefPrefix="/dashboard/forms/"
          badgeColor="bg-pink-100 text-pink-700"
        />
      </div>
      {/* Hızlı Aksiyonlar */}
      <div className="bg-white rounded-xl shadow p-6 flex flex-wrap gap-4 justify-center">
        <Link href="/dashboard/devices/new" className="quick-action-btn">Cihaz Ekle</Link>
        <Link href="/dashboard/live-exams/new" className="quick-action-btn">Sınav Oluştur</Link>
        <Link href="/dashboard/forms/new" className="quick-action-btn">Form Oluştur</Link>
        <Link href="/dashboard/issues/new" className="quick-action-btn">Arıza Bildir</Link>
      </div>
      <style jsx>{`
        .quick-action-btn {
          @apply bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg shadow hover:from-blue-600 hover:to-blue-800 transition font-semibold;
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, href, color }: { icon: React.ReactNode; label: string; value: number; href: string; color: string }) {
  return (
    <Link href={href} className={`rounded-2xl shadow-lg flex flex-col items-center p-6 hover:scale-105 transition group bg-gradient-to-br ${color} text-white`}>
      <div className="mb-2 bg-white bg-opacity-20 rounded-full p-3 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-3xl font-bold group-hover:text-yellow-200">{value}</div>
      <div className="text-lg mt-1 font-semibold">{label}</div>
    </Link>
  );
}

function RecentList({ title, items, itemKey, itemLabel, hrefPrefix, badgeColor }: { title: string; items: any[]; itemKey: string; itemLabel: string; hrefPrefix: string; badgeColor: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <ul>
        {items.length === 0 && <li className="text-gray-400">Kayıt yok</li>}
        {items.map(item => (
          <li key={item[itemKey]} className="mb-2 flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}>{item[itemLabel]?.[0] || "?"}</span>
            <Link href={hrefPrefix + item[itemKey]} className="text-blue-700 hover:underline font-medium">
              {item[itemLabel] || "(İsimsiz)"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 