'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSavedScheduleDetailsAction } from '@/actions/savedScheduleActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

interface EditScheduleDetailsFormProps {
    scheduleId: string;
    initialName: string | null;
    initialDescription: string | null;
    onSaveSuccess?: () => void; // Optional callback after successful save
    onCancel?: () => void;     // Optional callback for canceling
}

export function EditScheduleDetailsForm({
    scheduleId,
    initialName,
    initialDescription,
    onSaveSuccess,
    onCancel
}: EditScheduleDetailsFormProps) {
    const [name, setName] = useState(initialName || '');
    const [description, setDescription] = useState(initialDescription || '');
    const queryClient = useQueryClient();

    // Update state if initial props change (e.g., if form stays mounted while navigating)
    useEffect(() => {
        setName(initialName || '');
        setDescription(initialDescription || '');
    }, [initialName, initialDescription]);

    const updateMutation = useMutation<
        { success: boolean; error?: string }, // Action return type
        Error,                             // Error type
        { name?: string | null; description?: string | null } // Variables passed to mutationFn
    >({
        mutationFn: async (variables) => {
            return updateSavedScheduleDetailsAction({
                id: scheduleId,
                name: variables.name,
                description: variables.description,
            });
        },
        onSuccess: (result) => {
            if (result.success) {
                toast.success("Detaylar başarıyla güncellendi.");
                // Invalidate relevant queries if needed, e.g., the detail page query
                // queryClient.invalidateQueries({ queryKey: ['savedScheduleDetail', scheduleId] }); 
                if (onSaveSuccess) {
                    onSaveSuccess(); // Call callback if provided
                }
            } else {
                toast.error(result.error || "Detaylar güncellenirken bir hata oluştu.");
            }
        },
        onError: (error) => {
            toast.error(`Güncelleme başarısız: ${error.message}`);
        },
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        updateMutation.mutate({ name: name || null, description: description || null });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-md bg-gray-50">
            <div>
                <Label htmlFor="scheduleName" className="text-sm font-medium">Çizelge Adı</Label>
                <Input
                    id="scheduleName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: 2024-2025 Güz Dönemi V1"
                    disabled={updateMutation.isPending}
                    className="mt-1"
                />
            </div>
            <div>
                <Label htmlFor="scheduleDescription" className="text-sm font-medium">Açıklama</Label>
                <Textarea
                    id="scheduleDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Bu çizelge hakkında kısa bir not..."
                    rows={3}
                    disabled={updateMutation.isPending}
                    className="mt-1"
                />
            </div>
            <div className="flex justify-end gap-2">
                 {onCancel && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onCancel} 
                        disabled={updateMutation.isPending}
                      >
                          İptal
                      </Button>
                 )}
                <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Kaydediliyor...
                        </>
                    ) : (
                        'Değişiklikleri Kaydet'
                    )}
                </Button>
            </div>
        </form>
    );
} 