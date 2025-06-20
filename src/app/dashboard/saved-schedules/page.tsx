'use client'; // <<< Make component client-side for mutation

import { DashboardLayout } from '@/layouts/DashboardLayout';
import { fetchSavedSchedulesAction, deleteSavedScheduleAction, SavedScheduleListItem } from '@/actions/savedScheduleActions'; // <<< Import delete action
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense, useState, useEffect } from 'react'; // <<< Import useState, useEffect
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // <<< Import query/mutation hooks
import { toast } from 'react-toastify'; // For notifications
import { Trash2 } from 'lucide-react'; // Delete Icon

// Helper to format date
function formatDate(dateString: string) {
    try {
        return new Date(dateString).toLocaleString('tr-TR', { // Use Turkish locale
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        return 'Geçersiz Tarih';
    }
}

// --- Client Component to Fetch and Display with Delete --- 
function SavedSchedulesList() {
    const queryClient = useQueryClient(); // Get query client
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null); // Track which item is being deleted

    // Use useQuery to fetch data on the client
    const { data: schedules, isLoading, error: fetchError, isError } = useQuery<SavedScheduleListItem[], Error>({
        queryKey: ['savedSchedules'], // Unique query key
        queryFn: fetchSavedSchedulesAction, // Action to fetch data
        staleTime: 5 * 60 * 1000, // Keep data fresh for 5 mins
    });

    // --- Delete Mutation --- 
    const deleteScheduleMutation = useMutation<
        { success: boolean; error?: string }, // Return type of the action
        Error,                        // Error type
        string                        // Input type to mutationFn (schedule id)
    >({
        mutationFn: async (id: string) => {
            setIsDeletingId(id); // Indicate deletion in progress for this ID
            return deleteSavedScheduleAction(id);
        },
        onSuccess: (result, id) => {
            setIsDeletingId(null);
            if (result.success) {
                toast.success("Çizelge başarıyla silindi.");
                // Invalidate the query to refetch the list
                queryClient.invalidateQueries({ queryKey: ['savedSchedules'] });
            } else {
                toast.error(result.error || "Çizelge silinirken bir hata oluştu.");
            }
        },
        onError: (error) => {
            setIsDeletingId(null);
            toast.error(`Silme işlemi başarısız: ${error.message}`);
        },
    });

    const handleDelete = (id: string, name: string | null) => {
        const scheduleName = name || `ID: ${id}`; 
        if (confirm(`'${scheduleName}' adlı çizelgeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            deleteScheduleMutation.mutate(id);
        }
    };

    // --- Render Logic --- 
    if (isLoading) {
        return <SavedSchedulesLoadingSkeleton />; // Show skeleton while loading
    }

    if (isError || fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Kaydedilmiş çizelgeler yüklenirken bir hata oluştu.";
        return <p className="text-red-600">{message}</p>;
    }

    if (!schedules || schedules.length === 0) {
        return <p className="text-gray-600">Kaydedilmiş çizelge bulunamadı.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule) => (
                <Card key={schedule.id}>
                    <CardHeader>
                        <CardTitle>{schedule.name || `Kaydedilmiş Çizelge`}</CardTitle>
                        <CardDescription>{formatDate(schedule.created_at)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {schedule.description && <p className="text-sm text-gray-700 mb-2">{schedule.description}</p>}
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>Fitness Skoru: {schedule.fitness_score?.toFixed(4) ?? 'N/A'}</p>
                            <p>Yük Varyansı: {schedule.workload_variance?.toFixed(4) ?? 'N/A'}</p>
                            <p>Toplam Boşluk: {schedule.total_gaps ?? 'N/A'}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center"> {/* Use flex for layout */}
                        {/* Link to detail page */}
                        <Link href={`/dashboard/saved-schedules/${schedule.id}`} passHref>
                            <Button size="sm" variant="outline" disabled={isDeletingId === schedule.id}>
                                Detayları Gör
                            </Button>
                        </Link>
                        {/* Delete Button */}
                        <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDelete(schedule.id, schedule.name)}
                            disabled={deleteScheduleMutation.isPending && isDeletingId === schedule.id}
                        >
                            {deleteScheduleMutation.isPending && isDeletingId === schedule.id ? (
                                'Siliniyor...'
                            ) : (
                                <Trash2 size={16} />
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

// --- Main Page Component (Remains Server Component) --- 
export default function SavedSchedulesPage() {
    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-semibold text-gray-800">Kaydedilmiş Çizelgeler</h1>
                    <Link href="/dashboard/scheduling" passHref>
                        <Button variant="outline">Yeni Çizelge Oluştur</Button>
                    </Link>
                </div>
                {/* SavedSchedulesList handles its own loading/error state now */}
                <SavedSchedulesList />
            </div>
        </DashboardLayout>
    );
}

// --- Loading Skeleton (can be simplified or kept) --- 
function SavedSchedulesLoadingSkeleton() {
     return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-1" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                         <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-3 w-1/3" />
                         <Skeleton className="h-3 w-1/3" />
                         <Skeleton className="h-3 w-1/3" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-8 w-24 mr-2" /> {/* Adjust skeleton */}
                         <Skeleton className="h-8 w-10" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
} 