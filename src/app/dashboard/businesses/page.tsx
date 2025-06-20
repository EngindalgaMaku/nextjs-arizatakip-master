'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { fetchBusinesses, deleteBusiness } from '@/actions/businessActions';
import { Business, BUSINESS_TYPE_OPTIONS } from '@/types/businesses';
import { Semester } from '@/types/semesters'; // To potentially map semesterId to name later
import { fetchSemesters } from '@/actions/semesterActions';
import { toast } from 'react-toastify';
import { PlusIcon, PencilIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const columnHelper = createColumnHelper<Business>();

export default function BusinessesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [hasRenderError, setHasRenderError] = useState(false);

  const {
    data: businesses,
    isLoading,
    error,
  } = useQuery<Business[], Error>({
    queryKey: ['businesses'],
    queryFn: () => fetchBusinesses(),
  });

  // Fetch semesters to map semesterId to name
  const { data: semestersMap } = useQuery<Semester[], Error, Record<string, string>>({
    queryKey: ['semestersMapForBusinesses'],
    queryFn: fetchSemesters,
    select: (data) => {
      const map: Record<string, string> = {};
      data.forEach(semester => { map[semester.id] = semester.name; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBusiness,
    onSuccess: (result) => {
      console.log('Delete mutation success result:', result);
      if (result.success) {
        toast.success('İşletme başarıyla silindi.');
      } else {
        toast.error(result.error || 'İşletme silinemedi.');
      }
    },
    onError: (err) => {
      console.error('Delete mutation error:', err);
      toast.error(`Bir hata oluştu: ${err.message}`);
    },
    onSettled: () => {
      console.log('Delete mutation settled, invalidating queries and closing modal');
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      closeConfirmModal();
    },
  });

  const openConfirmModal = (business: Business) => {
    try {
      console.log('Opening confirm modal for business:', business.id);
      setBusinessToDelete(business);
      setIsConfirmModalOpen(true);
    } catch (err) {
      console.error('Error opening confirm modal:', err);
      toast.error('Modal açılırken bir hata oluştu.');
    }
  };

  React.useEffect(() => {
    console.log('MODAL STATE', { isConfirmModalOpen, businessToDelete });
  }, [isConfirmModalOpen, businessToDelete]);

  const closeConfirmModal = () => {
    try {
      console.log('Closing confirm modal');
      setIsConfirmModalOpen(false);
      // Set businessToDelete to null after a short delay to prevent UI flicker
      setTimeout(() => {
        setBusinessToDelete(null);
      }, 100);
    } catch (err) {
      console.error('Error closing confirm modal:', err);
    }
  };

  const handleConfirmDelete = () => {
    try {
      if (businessToDelete) {
        console.log('Confirming delete for business:', businessToDelete.id);
        deleteMutation.mutate(businessToDelete.id);
      }
    } catch (err) {
      console.error('Error in handleConfirmDelete:', err);
      closeConfirmModal();
      toast.error('Silme işlemi sırasında hata oluştu.');
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'İşletme Adı',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('contactPerson', {
      header: 'Yetkili Kişi',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('contactPhone', {
      header: 'Telefon',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('industry', {
      header: () => (
        <span className="w-24 block truncate">Sektör</span>
      ),
      cell: info => (
        <span className="w-24 block truncate">{info.getValue() || '-'}</span>
      ),
    }),
    columnHelper.accessor('businessType', {
      header: 'Türü',
      cell: info => BUSINESS_TYPE_OPTIONS.find(opt => opt.value === info.getValue())?.label || '-',
    }),
    columnHelper.accessor('semesterId', {
        header: 'Sömestr',
        cell: info => semestersMap?.[info.getValue()] || info.getValue() || '-',
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Aksiyonlar',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={() => router.push(`/dashboard/businesses/${row.original.id}/edit`)}
            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
            title="Düzenle"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`'${row.original.name}' adlı işletmeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
                deleteMutation.mutate(row.original.id);
              }
            }}
            className="p-1 text-red-600 hover:text-red-800 transition-colors"
            title="Sil"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    }),
  ], [router, semestersMap]);

  const businessList: Business[] = businesses ?? [];

  try {
    const table = useReactTable({
      data: businessList,
      columns,
      state: {
        sorting,
        globalFilter,
      },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      onGlobalFilterChange: setGlobalFilter,
      getFilteredRowModel: getFilteredRowModel(),
    });

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="ml-3 text-gray-700">İşletmeler yükleniyor...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="container mx-auto p-4 md:p-6 text-center">
          <p className="text-red-600">Hata: {error.message}</p>
        </div>
      );
    }

    if (hasRenderError) {
      return (
        <div className="container mx-auto p-4 md:p-6 text-center">
          <p className="text-red-600">Sayfa render hatası. Lütfen sayfayı yenileyin.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">İşletme Yönetimi</h1>
          <Link href="/dashboard/businesses/new">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md flex items-center transition-colors">
              <PlusIcon className="h-5 w-5 mr-2" />
              Yeni İşletme Ekle
            </button>
          </Link>
        </div>

        <div className="mb-4">
          <div className="relative">
            <input 
              type="text"
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(String(e.target.value))}
              className="w-full md:w-1/3 p-2 pl-10 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="İşletmelerde ara..."
            />
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 transform -translate-y-1/2" />
          </div>
        </div>

        {businessList.length === 0 && !globalFilter ? (
          <div className="text-center py-10 bg-white shadow rounded-md">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz işletme kaydı yok.</h3>
            <p className="mt-1 text-sm text-gray-500">Başlamak için yeni bir işletme ekleyin.</p>
            <div className="mt-6">
              <Link href="/dashboard/businesses/new">
                <button type="button" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Yeni İşletme Ekle
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id}
                        scope="col"
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer ${header.column.id === 'industry' ? 'w-24 max-w-xs truncate' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ArrowUpIcon className="h-4 w-4 ml-1" />,
                            desc: <ArrowDownIcon className="h-4 w-4 ml-1" />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${cell.column.id === 'industry' ? 'w-24 max-w-xs truncate' : ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error('Render error in BusinessesPage:', err);
    // If we catch a render error, show a simplified error page
    setHasRenderError(true);
    return (
      <div className="container mx-auto p-4 md:p-6 text-center">
        <p className="text-red-600">Sayfa render hatası. Lütfen sayfayı yenileyin.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Sayfayı Yenile
        </button>
      </div>
    );
  }
} 