'use client';

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BranchFormData, BranchFormSchema } from '@/types/branches';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'react-toastify';

interface BranchFormProps {
  onSubmit: SubmitHandler<BranchFormData>;
  initialData?: BranchFormData;
  isPending: boolean;
  submitButtonText?: string;
}

export function BranchForm({
  onSubmit,
  initialData,
  isPending,
  submitButtonText = 'Kaydet'
}: BranchFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BranchFormData>({
    resolver: zodResolver(BranchFormSchema),
    defaultValues: initialData || { name: '', code: '', description: '', type: 'kultur' },
  });

  const watchType = watch('type');

  const handleFormSubmit: SubmitHandler<BranchFormData> = async (data) => {
    try {
      await onSubmit(data);
      // Formu sıfırlama veya başarılı mesajı burada genel olarak ele alınabilir
      // Ancak genellikle bu, çağıran komponentin sorumluluğundadır (redirect vs.)
    } catch (error) {
      // Hata burada da yakalanabilir ama genellikle onSubmit mutasyonu kendi hata yönetimini yapar.
      // toast.error(error instanceof Error ? error.message : 'Bir hata oluştu');
    }
  };

  // Select bileşeni için onChange handler
  const handleTypeChange = (value: string) => {
    setValue('type', value as 'meslek' | 'kultur', {
      shouldValidate: true,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="name">Branş Adı <span className="text-red-500">*</span></Label>
        <Input id="name" {...register('name')} disabled={isPending} />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="code">Branş Kodu</Label>
        <Input id="code" {...register('code')} disabled={isPending} />
        {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>}
      </div>

      <div>
        <Label htmlFor="type">Kategori</Label>
        <Select 
          value={watchType || 'kultur'} 
          onValueChange={handleTypeChange}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder="Kategori seçiniz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kultur">Kültür</SelectItem>
            <SelectItem value="meslek">Meslek</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Açıklama</Label>
        <Textarea id="description" {...register('description')} disabled={isPending} rows={4} />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Kaydediliyor...' : submitButtonText}
        </Button>
      </div>
    </form>
  );
} 