import React from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LocationTypeFormValues, locationTypeFormSchema, LocationType } from '@/types/locationTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming you have a Textarea component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Assuming you have Dialog components

interface LocationTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LocationTypeFormValues) => void;
  initialData?: LocationType | null;
  isLoading?: boolean;
}

export function LocationTypeFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: LocationTypeFormModalProps) {
  const { 
    control, 
    handleSubmit, 
    reset, 
    formState: { errors }
  } = useForm<LocationTypeFormValues>({
    resolver: zodResolver(locationTypeFormSchema),
    defaultValues: initialData || { name: '', description: '' },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset(initialData || { name: '', description: '' });
    } else {
      // Reset form when modal closes, but not on initial open if data is present
      // to avoid flicker or resetting just after initialData is set.
      if (!initialData) reset({ name: '', description: '' });
    }
  }, [isOpen, initialData, reset]);

  const handleFormSubmit: SubmitHandler<LocationTypeFormValues> = (data) => {
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Lokasyon Tipini Düzenle' : 'Yeni Lokasyon Tipi Ekle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Tip Adı <span className="text-red-500">*</span>
            </label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => <Input id="name" {...field} placeholder="Örn: Bilgisayar Laboratuvarı" />}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama (Opsiyonel)
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea 
                  id="description" 
                  {...field} 
                  value={field.value || ''} // Ensure value is not null for Textarea
                  placeholder="Bu lokasyon tipinin kısa bir açıklaması..." 
                  rows={3} 
                />
              )}
            />
            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (initialData ? 'Kaydediliyor...' : 'Ekleniyor...') : (initialData ? 'Değişiklikleri Kaydet' : 'Ekle')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 