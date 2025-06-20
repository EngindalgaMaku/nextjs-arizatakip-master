'use client';

import { addTest, NewTestData } from '@/actions/testActions';
import { supabase } from '@/lib/supabase';
import { ArrowLeftIcon, ArrowPathIcon, CheckIcon, ExclamationTriangleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

const optionSchema = z.object({
  text: z.string().min(1, { message: 'Seçenek metni boş olamaz.' })
});

const questionSchema = z.object({
  text: z.string().min(1, { message: 'Soru metni boş olamaz.' }),
  imageUrl: z.string().optional(),
  options: z.array(optionSchema)
    .min(2, { message: 'Her soru en az 2 seçenek içermelidir.' })
    .max(5, { message: 'Bir soru en fazla 5 seçenek içerebilir.' }),
  correctOptionIndex: z.number()
    .min(0, { message: 'Doğru seçenek işaretlenmelidir.' })
});

const testSchema = z.object({
  title: z.string().min(1, { message: 'Test başlığı boş olamaz.' }),
  slug: z.string().optional(),
  description: z.string(),
  category: z.string().optional(),
  passingScore: z.coerce.number().min(0).max(100),
  timeLimit: z.coerce.number().min(1),
  randomizeQuestions: z.boolean(),
  randomizeOptions: z.boolean(),
  isPublished: z.boolean(),
  isPublicViewable: z.boolean(),
  questions: z.array(questionSchema)
    .min(1, { message: 'Test en az bir soru içermelidir.' })
});

type TestFormValues = {
  title: string;
  slug?: string;
  description: string;
  category?: string;
  passingScore: number;
  timeLimit: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  isPublished: boolean;
  isPublicViewable: boolean;
  questions: {
    text: string;
    imageUrl?: string;
    options: { text: string }[];
    correctOptionIndex: number;
  }[];
};

const defaultValues: TestFormValues = {
  title: '',
  description: '',
  passingScore: 70,
  timeLimit: 60,
  randomizeQuestions: false,
  randomizeOptions: false,
  isPublished: false,
  isPublicViewable: false,
  questions: []
};

export default function NewTestPage() {
  const router = useRouter();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
    setValue,
    watch,
    trigger
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });
  
  // Sorulardaki seçenek sayısı değiştiğinde correctOptionIndex'in geçerliliğini kontrol et
  // ve gerekirse sıfırla. Ayrıca bir seçenek silindiğinde, eğer o doğru seçenekse,
  // doğru seçeneği sıfırla.
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name && (name.startsWith('questions') && (name.endsWith('options') || name.endsWith('correctOptionIndex')))) {
        const questions = value.questions;
        if (!questions) return;

        questions.forEach((question, qIndex) => {
          if (!question || !question.options) return;
          
          const optionsLength = question.options.length;
          const currentIndex = question.correctOptionIndex;
          
          if (typeof currentIndex === 'number' && currentIndex >= optionsLength) {
            setValue(`questions.${qIndex}.correctOptionIndex`, -1);
            trigger(`questions.${qIndex}.correctOptionIndex`);
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, trigger]);


  const onSubmit: SubmitHandler<TestFormValues> = async (data) => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const testDataToSubmit: NewTestData = {
      ...data,
      passingScore: Number(data.passingScore),
      timeLimit: Number(data.timeLimit),
      questions: data.questions.map(q => {
        // Her seçenek için geçici ID oluştur
        const optionsWithIds = q.options.map((opt, index) => ({
          text: opt.text,
          id: `temp_${Date.now()}_${index}`
        }));

        // Doğru seçeneğin ID'sini al
        const correctOptionId = optionsWithIds[q.correctOptionIndex]?.id;
        
        if (!correctOptionId) {
          throw new Error('Doğru seçenek ID\'si oluşturulamadı');
        }

        return {
          text: q.text,
          options: optionsWithIds,
          correctOptionId: correctOptionId
        };
      })
    };

    const result = await addTest(testDataToSubmit);

    if ('error' in result) {
      setSubmissionError(result.error);
    } else {
      router.push('/dashboard/tests');
    }
    setIsSubmitting(false);
  };

  const handleAddQuestion = () => {
    append({ text: '', options: [{ text: '' }], correctOptionIndex: -1 });
  };

  const handleRemoveQuestion = (index: number) => {
    remove(index);
  };
  
  const handleAddOption = (qIndex: number) => {
    const questionPath = `questions.${qIndex}.options` as const;
    const currentOptions = watch(questionPath);
    if (currentOptions && currentOptions.length < 5) {
      // useFieldArray for options inside each question
      // For simplicity, direct setValue for now. For complex scenarios, nested useFieldArray is better.
      setValue(`${questionPath}.${currentOptions.length}` as const, { text: '' });
      trigger(questionPath); // Validate options array after adding
    }
  };

  const handleRemoveOption = (qIndex: number, oIndex: number) => {
     const questionPath = `questions.${qIndex}` as const;
     const currentQuestion = watch(questionPath);
     if (currentQuestion && currentQuestion.options.length > 2) {
        const newOptions = currentQuestion.options.filter((_, idx) => idx !== oIndex);
        setValue(`${questionPath}.options`, newOptions);
        // Eğer silinen seçenek doğru seçenekse, doğru seçeneği sıfırla
        if (currentQuestion.correctOptionIndex === oIndex) {
            setValue(`${questionPath}.correctOptionIndex`, -1);
            trigger(`${questionPath}.correctOptionIndex`);
        } else if (currentQuestion.correctOptionIndex > oIndex) {
            // Eğer silinen seçenekten sonraki bir seçenek doğruysa, index'i güncelle
            setValue(`${questionPath}.correctOptionIndex`, currentQuestion.correctOptionIndex -1);
        }
        trigger(`${questionPath}.options`); // Validate options array after removing
     }
  };

  const handleImageUpload = async (file: File, questionIndex: number) => {
    if (!file) return;

    try {
      setUploadingImages(prev => ({ ...prev, [questionIndex]: true }));
      
      // Dosya adını benzersiz yap
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `test-questions/${fileName}`;

      // Supabase'e yükle
      const { data, error } = await supabase.storage
        .from('test-images')
        .upload(filePath, file);

      if (error) throw error;

      // Public URL al
      const { data: { publicUrl } } = supabase.storage
        .from('test-images')
        .getPublicUrl(filePath);

      // Form değerini güncelle
      setValue(`questions.${questionIndex}.imageUrl`, publicUrl);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Resim yüklenirken bir hata oluştu.');
    } finally {
      setUploadingImages(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const handleRemoveImage = async (questionIndex: number) => {
    const imageUrl = watch(`questions.${questionIndex}.imageUrl`);
    if (!imageUrl) return;

    try {
      // Supabase'den dosyayı sil
      const filePath = imageUrl.split('/').pop();
      if (filePath) {
        const { error } = await supabase.storage
          .from('test-images')
          .remove([`test-questions/${filePath}`]);

        if (error) throw error;
      }

      // Form değerini temizle
      setValue(`questions.${questionIndex}.imageUrl`, undefined);
      
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Resim silinirken bir hata oluştu.');
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2" />
        Geri Dön
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-8">Yeni Test Oluştur</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 shadow-xl rounded-lg">
        {/* Test Genel Bilgileri */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Test Detayları</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Test Başlığı <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  id="title"
                  {...register('title')}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">Kısa Ad (Slug)</label>
                <input
                  type="text"
                  id="slug"
                  {...register('slug')}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.slug ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="otomatik-oluşturulur (isteğe bağlı)"
                />
                {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <input
                  type="text"
                  id="category"
                  {...register('category')}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
              </div>
              <div>
                <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700 mb-1">Geçme Puanı (%)</label>
                <input
                  type="number"
                  id="passingScore"
                  {...register('passingScore', { valueAsNumber: true })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.passingScore ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.passingScore && <p className="mt-1 text-xs text-red-600">{errors.passingScore.message}</p>}
              </div>
              <div>
                <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 mb-1">Süre Limiti (dakika)</label>
                <input
                  type="number"
                  id="timeLimit"
                  {...register('timeLimit', { valueAsNumber: true })}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.timeLimit ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.timeLimit && <p className="mt-1 text-xs text-red-600">{errors.timeLimit.message}</p>}
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
                <h3 className="text-md font-medium text-gray-700">Test Seçenekleri</h3>
              <div className="flex items-center">
                <input
                  id="randomizeQuestions"
                  type="checkbox"
                  {...register('randomizeQuestions')}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="randomizeQuestions" className="ml-2 block text-sm text-gray-900">Soruları Karıştır</label>
              </div>
              <div className="flex items-center">
                <input
                  id="randomizeOptions"
                  type="checkbox"
                  {...register('randomizeOptions')}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="randomizeOptions" className="ml-2 block text-sm text-gray-900">Seçenekleri Karıştır</label>
              </div>
              <div className="flex items-center">
                <input
                  id="isPublished"
                  type="checkbox"
                  {...register('isPublished')}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">Test Yayında Olsun</label>
              </div>
              <div className="flex items-center">
                <input
                  id="isPublicViewable"
                  type="checkbox"
                  {...register('isPublicViewable')}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isPublicViewable" className="ml-2 block text-sm text-gray-900">Herkes Görebilsin</label>
              </div>
            </div>
        </div>

        {/* Sorular Bölümü */}
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-700">Sorular <span className="text-red-500">*</span></h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-dashed border-indigo-400 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Yeni Soru Ekle
            </button>
          </div>
          {errors.questions && !errors.questions.root && !Array.isArray(errors.questions) && <p className="mt-1 text-xs text-red-600">{errors.questions.message}</p>}
          
          {fields.map((field, qIndex) => (
            <div key={field.id} className="p-5 mb-6 border border-gray-300 rounded-lg shadow bg-gray-50 relative">
              <div className="flex justify-between items-start mb-3">
                <label htmlFor={`questions.${qIndex}.text`} className="block text-md font-semibold text-gray-700">
                  Soru #{qIndex + 1} <span className="text-red-500">*</span>
                </label>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIndex)}
                    disabled={isSubmitting}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 disabled:opacity-50"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
              <textarea
                id={`questions.${qIndex}.text`}
                rows={2}
                {...register(`questions.${qIndex}.text`)}
                placeholder="Soru metnini buraya girin"
                className={`mt-1 block w-full px-3 py-2 border ${errors.questions?.[qIndex]?.text ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
              />
              {errors.questions?.[qIndex]?.text && <p className="mt-1 text-xs text-red-600">{errors.questions[qIndex]?.text?.message}</p>}

              {/* Resim Yükleme Alanı */}
              <div className="mt-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    id={`questions.${qIndex}.image`}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, qIndex);
                    }}
                    className="hidden"
                    disabled={isSubmitting || uploadingImages[qIndex]}
                  />
                  <label
                    htmlFor={`questions.${qIndex}.image`}
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${(isSubmitting || uploadingImages[qIndex]) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {uploadingImages[qIndex] ? (
                      <>
                        <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-500" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                        Resim Ekle
                      </>
                    )}
                  </label>
                  {watch(`questions.${qIndex}.imageUrl`) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(qIndex)}
                      disabled={isSubmitting || uploadingImages[qIndex]}
                      className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <TrashIcon className="-ml-1 mr-2 h-5 w-5 text-red-500" />
                      Resmi Kaldır
                    </button>
                  )}
                </div>
                {watch(`questions.${qIndex}.imageUrl`) && (
                  <div className="mt-2">
                    <img
                      src={watch(`questions.${qIndex}.imageUrl`)}
                      alt={`Soru ${qIndex + 1} resmi`}
                      className="max-w-md rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Seçenekler <span className="text-red-500">*</span> (En az 2, en fazla 5)</h3>
                {watch(`questions.${qIndex}.options`)?.map((option, oIndex) => (
                  <div key={`${field.id}-option-${oIndex}`} className="flex items-center mb-2">
                     <Controller
                        name={`questions.${qIndex}.correctOptionIndex`}
                        control={control}
                        render={({ field: radioField }) => (
                            <input
                                type="radio"
                                id={`questions.${qIndex}.options.${oIndex}.correct`}
                                {...radioField}
                                value={oIndex}
                                checked={radioField.value === oIndex}
                                onChange={(e) => {
                                    radioField.onChange(parseInt(e.target.value, 10));
                                    trigger(`questions.${qIndex}.correctOptionIndex`); // Trigger validation after change
                                }}
                                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 mr-2"
                            />
                        )}
                    />
                    <input
                      type="text"
                      id={`questions.${qIndex}.options.${oIndex}.text`}
                      {...register(`questions.${qIndex}.options.${oIndex}.text`)}
                      placeholder={`Seçenek ${oIndex + 1}`}
                      className={`flex-grow px-3 py-2 border ${errors.questions?.[qIndex]?.options?.[oIndex]?.text ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                    {(watch(`questions.${qIndex}.options`)?.length ?? 0) > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(qIndex, oIndex)}
                        disabled={isSubmitting}
                        className="ml-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 disabled:opacity-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {errors.questions?.[qIndex]?.options && !Array.isArray(errors.questions?.[qIndex]?.options) && <p className="mt-1 text-xs text-red-600">{errors.questions?.[qIndex]?.options?.message}</p>}
                 {(watch(`questions.${qIndex}.options`)?.length ?? 0) < 5 && (
                    <button
                        type="button"
                        onClick={() => handleAddOption(qIndex)}
                        disabled={isSubmitting}
                        className="mt-2 inline-flex items-center px-3 py-1.5 border border-dashed border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Seçenek Ekle
                    </button>
                 )}
                 {errors.questions?.[qIndex]?.correctOptionIndex && <p className="mt-1 text-xs text-red-600">{errors.questions?.[qIndex]?.correctOptionIndex?.message}</p>}
              </div>
            </div>
          ))}
        </div>
        
        {submissionError && (
            <div className="rounded-md bg-red-50 p-4 mt-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Test Kaydedilemedi</h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p>{submissionError}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}


        <div className="pt-5 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard/tests')}
              disabled={isSubmitting}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-indigo-400"
            >
              <CheckIcon className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Kaydediliyor...' : 'Testi Kaydet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 