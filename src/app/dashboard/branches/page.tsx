'use client'; // Form etkileşimi ve @tanstack/react-query için

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBranches, deleteBranch } from '@/actions/branchActions';
import { Branch } from '@/types/branches';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'kultur' | 'meslek'>('meslek');

  const { data: branches, isLoading, error } = useQuery<Branch[], Error>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteBranch,
    onSuccess: () => {
      toast.success('Branş başarıyla silindi.');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (error) => {
      toast.error(`Branş silinirken hata: ${error.message}`);
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Bu branşı silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <DashboardLayout><div className="p-4">Yükleniyor...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-4 text-red-500">Hata: {error.message}</div></DashboardLayout>;

  // Branşları kategoriye göre grupla
  const allBranches = branches || [];
  const kulturBranches = allBranches.filter(branch => branch.type === 'kultur' || !branch.type);
  const meslekBranches = allBranches.filter(branch => branch.type === 'meslek');

  // Aktif tab'a göre gösterilecek branşları seç
  const activeBranches = activeTab === 'all' 
    ? allBranches 
    : activeTab === 'kultur' 
      ? kulturBranches 
      : meslekBranches;

  const renderBranchesTable = (branchesToRender: Branch[], tableType: 'all' | 'kultur' | 'meslek' = 'all') => (
    branchesToRender.length > 0 ? (
      <div className="rounded-md border bg-background shadow">
        <Table>
          <TableHeader className={
            tableType === 'meslek' 
              ? 'bg-blue-50' 
              : tableType === 'kultur' 
                ? 'bg-amber-50' 
                : 'bg-gray-50'
          }>
            <TableRow>
              <TableHead>Branş Adı</TableHead>
              <TableHead>Kod</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branchesToRender.map((branch) => (
              <TableRow 
                key={branch.id}
                className={
                  branch.type === 'meslek'
                    ? 'hover:bg-blue-50 transition-colors' 
                    : 'hover:bg-amber-50 transition-colors'
                }
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {branch.type === 'meslek' ? (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                    )}
                    {branch.name}
                  </div>
                </TableCell>
                <TableCell>{branch.code || '-'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    branch.type === 'meslek' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {branch.type === 'meslek' ? 'Meslek' : 'Kültür'}
                  </span>
                </TableCell>
                <TableCell>{branch.description || '-'}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/dashboard/dallar?branchId=${branch.id}`} passHref>
                    <Button variant="outline" size="sm" className="mr-2">
                      <BookOpen className="mr-1 h-3 w-3" />
                    </Button>
                  </Link>
                  <Link href={`/dashboard/branches/edit/${branch.id}`} passHref>
                    <Button variant="outline" size="sm" className="mr-2">
                      <Edit className="mr-1 h-3 w-3" /> Düzenle
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => branch.id && handleDelete(branch.id)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === branch.id}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Sil
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ) : (
      <div className="text-center py-8">
        <p className="text-gray-500">Bu kategoride henüz hiç branş eklenmemiş.</p>
        <Link href="/dashboard/branches/new" passHref>
          <Button className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Branş Ekle
          </Button>
        </Link>
      </div>
    )
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Branş Yönetimi</h1>
          <Link href="/dashboard/branches/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Branş Ekle
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Branşlar</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="meslek" value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger 
                  value="all"
                  className={activeTab === 'all' ? 'bg-gray-100 text-gray-900' : ''}
                >
                  Tümü ({allBranches.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="kultur"
                  className={activeTab === 'kultur' ? 'bg-amber-100 text-amber-900' : ''}
                >
                  Kültür ({kulturBranches.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="meslek"
                  className={activeTab === 'meslek' ? 'bg-blue-100 text-blue-900' : ''}
                >
                  Meslek ({meslekBranches.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {renderBranchesTable(allBranches, 'all')}
              </TabsContent>
              <TabsContent value="kultur">
                {renderBranchesTable(kulturBranches, 'kultur')}
              </TabsContent>
              <TabsContent value="meslek">
                {renderBranchesTable(meslekBranches, 'meslek')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 