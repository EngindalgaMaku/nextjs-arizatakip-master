'use client';

import { getTestBySlug, updateTest, UpdateTestData } from '@/actions/testActions';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { baseFormTemplate, createNewOption, createNewQuestion } from '@/types/form-templates';
import { Test as TestType } from '@/types/tests';
import { ArrowLeftIcon, ArrowPathIcon, CheckIcon, ExclamationTriangleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

// Zod şemaları NewTestPage ile aynı olabilir, gerekirse özelleştirilebilir.
const optionSchema = z.object({
  id: z.string().optional(), // Varolan seçenekler için ID
  text: z.string().min(1, { message: 'Seçenek metni boş olamaz.' }),
  toBeDeleted: z.boolean(), // Seçeneği silmek için işaretleme
}).required();

const questionSchema = z.object({
  id: z.number().optional(), // Varolan sorular için ID
  text: z.string().min(1, { message: 'Soru metni boş olamaz.' }),
  imageUrl: z.string().optional(),
  options: z.array(optionSchema).min(2, { message: 'Her soru en az 2 seçenek içermelidir.' }).max(5, { message: 'Bir soru en fazla 5 seçenek içerebilir.' }),
  correctOptionIdOrIndex: z.union([z.string(), z.number()]) // Güncelleme için ID veya index
    .refine(val => (typeof val === 'string' && val.length > 0) || (typeof val === 'number' && val >= 0), {
      message: "Her soru için bir doğru seçenek işaretlenmelidir.",
    }),
  toBeDeleted: z.boolean(), // Soruyu silmek için işaretleme
}).required();

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
  questions: z.array(questionSchema).min(1, { message: 'Test en az bir soru içermelidir.' }),
}).required();

type TestFormValues = z.infer<typeof testSchema>;

// Default values for the form
const defaultValues: TestFormValues = {
  ...baseFormTemplate,
  isPublicViewable: false,
};

interface EditTestPageProps {
  params: { slug: string };
}

export default function EditTestPage({ params }: EditTestPageProps) {
  const router = useRouter();
  const currentSlug = params.slug;
  const [testData, setTestData] = useState<TestType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({});

  const {
    control,
    handleSubmit,
    register,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'questions',
  });

  useEffect(() => {
    async function fetchAndSetTestData() {
      if (currentSlug) {
        setIsLoading(true);
        setSubmissionError(null);
        try {
          const fetchedTest = await getTestBySlug(currentSlug as string);
          if (fetchedTest) {
            setTestData(fetchedTest);
            const formValues: TestFormValues = {
              title: fetchedTest.title,
              slug: fetchedTest.slug,
              description: fetchedTest.description || '',
              category: fetchedTest.category || '',
              passingScore: fetchedTest.passingScore || 70,
              timeLimit: fetchedTest.timeLimit || 60,
              randomizeQuestions: fetchedTest.randomizeQuestions || false,
              randomizeOptions: fetchedTest.randomizeOptions || false,
              isPublished: fetchedTest.isPublished || false,
              isPublicViewable: fetchedTest.isPublicViewable || false,
              questions: fetchedTest.questions.map(q => ({
                id: parseInt(q.id, 10),
                text: q.text,
                imageUrl: q.imageUrl || '',
                options: q.options.map(opt => ({ 
                  id: opt.id, 
                  text: opt.text, 
                  toBeDeleted: false 
                })),
                correctOptionIdOrIndex: q.options.findIndex(opt => opt.id === q.correctOptionId),
                toBeDeleted: false
              }))
            };
            reset(formValues);
          } else {
            setSubmissionError('Düzenlenecek test bulunamadı.');
          }
        } catch (e: any) {
          console.error("Error fetching test for edit:", e);
          setSubmissionError(e.message || 'Test yüklenirken bir hata oluştu.');
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchAndSetTestData();
  }, [currentSlug, reset, setIsLoading, setSubmissionError, setTestData]);
  
  // Sorulardaki seçenek sayısı değiştiğinde veya bir seçenek silindiğinde correctOptionIdOrIndex'in geçerliliğini kontrol et
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name && name.startsWith('questions')) {
        value.questions?.forEach((question, qIndex) => {
          if (!question || !question.options) return;
          
          const currentOptions = question.options.filter((opt) => opt && typeof opt.toBeDeleted !== 'undefined' ? !opt.toBeDeleted : true);
          if (typeof question.correctOptionIdOrIndex === 'number') {
            if (question.correctOptionIdOrIndex >= currentOptions.length) {
                setValue(`questions.${qIndex}.correctOptionIdOrIndex`, -1);
                trigger(`questions.${qIndex}.correctOptionIdOrIndex`);
            }
          } else if (typeof question.correctOptionIdOrIndex === 'string') {
            if (!currentOptions.some(opt => opt?.id === question.correctOptionIdOrIndex)) {
                setValue(`questions.${qIndex}.correctOptionIdOrIndex`, -1);
                trigger(`questions.${qIndex}.correctOptionIdOrIndex`);
            }
          }
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, trigger]);

  const onSubmit: SubmitHandler<TestFormValues> = async (data) => {
    if (!testData) {
      setSubmissionError('Güncellenecek test verisi bulunamadı.');
      return;
    }
    setIsSubmitting(true);
    setSubmissionError(null);

    const updatePayload: UpdateTestData = {
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      passingScore: Number(data.passingScore),
      timeLimit: Number(data.timeLimit),
      randomizeQuestions: data.randomizeQuestions,
      randomizeOptions: data.randomizeOptions,
      isPublished: data.isPublished,
      isPublicViewable: data.isPublicViewable,
      questions: data.questions.map(q => {
        const liveOptions = q.options.filter(opt => !opt.toBeDeleted);
        let correctOptIdOrIdx: string | number;
        if(typeof q.correctOptionIdOrIndex === 'number'){
            // Eğer index ise ve geçerliyse, o indexteki seçeneğin ID'sini al
            // Veya seçenek yeni eklenmişse ID'si olmayabilir, bu durumda index olarak kalır
            const optAtIndex = liveOptions[q.correctOptionIdOrIndex];
            correctOptIdOrIdx = optAtIndex?.id || q.correctOptionIdOrIndex;
        } else {
            correctOptIdOrIdx = q.correctOptionIdOrIndex; // Zaten ID ise direkt kullan
        }

        return {
            id: q.id, // Varolan soru ID'si
            text: q.text,
            imageUrl: q.imageUrl,
            options: liveOptions.map(opt => ({ id: opt.id, text: opt.text })),
            correctOptionIdOrIndex: correctOptIdOrIdx,
            toBeDeleted: q.toBeDeleted,
            optionsToBeDeleted: q.options.filter(opt => opt.toBeDeleted && opt.id).map(opt => opt.id as string),
        };
      }).filter(q => !q.toBeDeleted), // Silinmek üzere işaretlenmemiş soruları al
    };
    
    const result = await updateTest(testData.id, updatePayload);

    if ('error' in result) {
      setSubmissionError(result.error);
    } else {
      router.push(`/dashboard/tests/${result.slug}`); // Güncellenen slug ile yönlendir
    }
    setIsSubmitting(false);
  };

  const handleAddQuestion = () => {
    append(createNewQuestion());
  };

  const handleToggleDeleteQuestion = (index: number) => {
    const currentQuestion = watch(`questions.${index}`);
    if (currentQuestion.id) { // Sadece ID'si olan (varolan) sorular silinmek üzere işaretlenebilir
        setValue(`questions.${index}.toBeDeleted`, !currentQuestion.toBeDeleted);
    } else { // Yeni eklenmiş, henüz ID'si olmayan soruysa direkt listeden kaldır
        remove(index);
    }
  };
  
  const handleAddOption = (qIndex: number) => {
    const questionPath = `questions.${qIndex}.options` as const;
    const currentOptions = watch(questionPath) || [];
    if (currentOptions.filter(opt => !opt.toBeDeleted).length < 5) {
      const newOption = createNewOption();
      newOption.id = `temp_${Date.now()}`; // Geçici string ID
      setValue(`${questionPath}.${currentOptions.length}` as const, newOption);
      trigger(questionPath);
    }
  };

  const handleToggleDeleteOption = (qIndex: number, oIndex: number) => {
     const optionPath = `questions.${qIndex}.options.${oIndex}` as const;
     const currentOption = watch(optionPath);
     const questionOptionsPath = `questions.${qIndex}.options` as const;
     const allOptions = watch(questionOptionsPath) || [];

     if (currentOption.id) { // ID'si olan (varolan) seçenekler silinmek üzere işaretlenir
        setValue(`${optionPath}.toBeDeleted`, !currentOption.toBeDeleted);
     } else { // Yeni eklenmiş, ID'si olmayan seçenek direkt listeden kaldırılır
        const newOptions = allOptions.filter((_, idx) => idx !== oIndex);
        setValue(questionOptionsPath, newOptions);
     }
     
     // Doğru seçenek kontrolü
     const questionCorrectPath = `questions.${qIndex}.correctOptionIdOrIndex` as const;
     const currentCorrect = watch(questionCorrectPath);
     const liveOptions = allOptions.filter(opt => !opt.toBeDeleted && opt.id !== currentOption.id );
     
     if (typeof currentCorrect === 'number' && currentCorrect === oIndex) {
        setValue(questionCorrectPath, -1); // İşaretli olan silinirse sıfırla
     } else if (typeof currentCorrect === 'string' && currentCorrect === currentOption.id) {
        setValue(questionCorrectPath, -1); // İşaretli olan silinirse sıfırla
     }
     // Eğer silinen seçenekten sonraki bir seçenek doğruysa ve index olarak tutuluyorsa, index'i güncellemek gerekebilir.
     // Bu durum, options dizisi filtrelendiğinde ve yeniden render edildiğinde ele alınmalı veya useEffect ile yönetilmeli.

     trigger(questionOptionsPath);
     trigger(questionCorrectPath);
  };

  const handleImageUpload = async (file: File, questionIndex: number) => {
    if (!file) return;
    try {
      setUploadingImages(prev => ({ ...prev, [questionIndex]: true }));
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `test-questions/${fileName}`;
      const { data, error } = await supabase.storage
        .from('test-images')
        .upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('test-images')
        .getPublicUrl(filePath);
      setValue(`questions.${questionIndex}.imageUrl`, publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      // toast.error('Resim yüklenirken bir hata oluştu.');
    } finally {
      setUploadingImages(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const handleRemoveImage = async (questionIndex: number) => {
    const imageUrl = watch(`questions.${questionIndex}.imageUrl`);
    if (!imageUrl) return;
    try {
      const filePath = imageUrl.split('/').pop();
      if (filePath) {
        const { error } = await supabase.storage
          .from('test-images')
          .remove([`test-questions/${filePath}`]);
        if (error) throw error;
      }
      setValue(`questions.${questionIndex}.imageUrl`, '');
    } catch (error) {
      console.error('Error removing image:', error);
      // toast.error('Resim silinirken bir hata oluştu.');
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <ArrowPathIcon className="h-12 w-12 text-indigo-600 animate-spin" />
            <p className="ml-4 text-lg text-gray-700">Test verileri yükleniyor...</p>
        </div>
    );
  }

  if (submissionError && !testData) { // Test bulunamadıysa veya yüklenemediyse
    return (
        <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Hata</h2>
            <p className="text-gray-600 mb-6">{submissionError}</p>
            <button
                onClick={() => router.push('/dashboard/tests')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
            >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Test Listesine Dön
            </button>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2" />
        Geri Dön
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-8">Testi Düzenle: {testData?.title}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 shadow-xl rounded-lg">
        {/* Test Genel Bilgileri (NewTestPage'den kopyalanıp register ve error handling eklenecek) */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Test Detayları</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Test Başlığı <span className="text-red-500">*</span></label>
                <input type="text" id="title" {...register('title')} className={`mt-1 block w-full px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">Kısa Ad (Slug)</label>
                <input type="text" id="slug" {...register('slug')} className={`mt-1 block w-full px-3 py-2 border ${errors.slug ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} placeholder="otomatik-oluşturulur (isteğe bağlı)" />
                {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea id="description" rows={3} {...register('description')} className={`mt-1 block w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <input type="text" id="category" {...register('category')} className={`mt-1 block w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
              </div>
              <div>
                <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700 mb-1">Geçme Puanı (%)</label>
                <input type="number" id="passingScore" {...register('passingScore')} className={`mt-1 block w-full px-3 py-2 border ${errors.passingScore ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                {errors.passingScore && <p className="mt-1 text-xs text-red-600">{errors.passingScore.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 mb-1">Süre Limiti (dakika)</label>
                <input type="number" id="timeLimit" {...register('timeLimit')} className={`mt-1 block w-full px-3 py-2 border ${errors.timeLimit ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
                {errors.timeLimit && <p className="mt-1 text-xs text-red-600">{errors.timeLimit.message}</p>}
              </div>
            </div>
            <div className="space-y-3 pt-2">
                <h3 className="text-md font-medium text-gray-700">Test Seçenekleri</h3>
              <div className="flex items-center"><Controller name="randomizeQuestions" control={control} render={({ field }) => <Switch id="randomizeQuestions" checked={field.value} onCheckedChange={field.onChange} />} /><label htmlFor="randomizeQuestions" className="ml-2 block text-sm text-gray-900">Soruları Karıştır</label></div>
              <div className="flex items-center"><Controller name="randomizeOptions" control={control} render={({ field }) => <Switch id="randomizeOptions" checked={field.value} onCheckedChange={field.onChange} />} /><label htmlFor="randomizeOptions" className="ml-2 block text-sm text-gray-900">Seçenekleri Karıştır</label></div>
              <div className="flex items-center"><Controller name="isPublished" control={control} render={({ field }) => <Switch id="isPublished" checked={field.value} onCheckedChange={field.onChange} />} /><label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">Test Yayında Olsun</label></div>
              <div className="flex items-center"><Controller name="isPublicViewable" control={control} render={({ field }) => <Switch id="isPublicViewable" checked={field.value} onCheckedChange={field.onChange} />} /><label htmlFor="isPublicViewable" className="ml-2 block text-sm text-gray-900">Herkese Açık Görüntülenebilir</label></div>
            </div>
        </div>

        {/* Sorular Bölümü (NewTestPage'den kopyalanıp düzenlenecek) */}
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-700">Sorular <span className="text-red-500">*</span></h2>
            <button type="button" onClick={handleAddQuestion} disabled={isSubmitting} className="inline-flex items-center px-4 py-2 border border-dashed border-indigo-400 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"><PlusIcon className="w-5 h-5 mr-2" />Yeni Soru Ekle</button>
          </div>
          {errors.questions && !errors.questions.root && !Array.isArray(errors.questions) && <p className="mt-1 text-xs text-red-600">{errors.questions.message}</p>}
          
          {fields.map((field, qIndex) => (
            !watch(`questions.${qIndex}.toBeDeleted`) && (
            <div key={field.id} className={`p-5 mb-6 border rounded-lg shadow bg-gray-50 relative ${watch(`questions.${qIndex}.toBeDeleted`) ? 'opacity-50 border-red-300' : 'border-gray-300'}`}>
              <div className="flex justify-between items-start mb-3">
                <label htmlFor={`questions.${qIndex}.text`} className="block text-md font-semibold text-gray-700">Soru #{qIndex + 1} <span className="text-red-500">*</span></label>
                <button type="button" onClick={() => handleToggleDeleteQuestion(qIndex)} disabled={isSubmitting} className={`p-1 rounded-full hover:bg-red-100 disabled:opacity-50 ${watch(`questions.${qIndex}.id`) ? 'text-red-500' : 'text-gray-500'}`} title={watch(`questions.${qIndex}.id`) ? "Soruyu silmek için işaretle" : "Yeni soruyu sil"}>
                    <TrashIcon className="w-5 h-5" />
                </button>
              </div>
              <input type="hidden" {...register(`questions.${qIndex}.id`)} />
              <textarea id={`questions.${qIndex}.text`} rows={2} {...register(`questions.${qIndex}.text`)} placeholder="Soru metnini buraya girin" className={`mt-1 block w-full px-3 py-2 border ${errors.questions?.[qIndex]?.text ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
              {errors.questions?.[qIndex]?.text && <p className="mt-1 text-xs text-red-600">{errors.questions[qIndex]?.text?.message}</p>}

              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Seçenekler <span className="text-red-500">*</span> (En az 2, en fazla 5)</h3>
                {watch(`questions.${qIndex}.options`)?.map((option, oIndex) => (
                  !watch(`questions.${qIndex}.options.${oIndex}.toBeDeleted`) && (
                  <div key={`${field.id}-option-${oIndex}`} className={`flex items-center mb-2 ${watch(`questions.${qIndex}.options.${oIndex}.toBeDeleted`) ? 'opacity-50' : ''}`}>
                     <Controller
                        name={`questions.${qIndex}.correctOptionIdOrIndex`}
                        control={control}
                        render={({ field: radioField }) => (
                            <input type="radio" id={`questions.${qIndex}.options.${oIndex}.correct`} {...radioField} value={oIndex} checked={typeof radioField.value === 'number' ? radioField.value === oIndex : radioField.value === option.id} onChange={(e) => {
                                // Eğer seçenek ID'si varsa ID'yi, yoksa index'i kaydet
                                radioField.onChange(option.id || parseInt(e.target.value, 10));
                                trigger(`questions.${qIndex}.correctOptionIdOrIndex`);
                            }} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 mr-2" disabled={watch(`questions.${qIndex}.options.${oIndex}.toBeDeleted`)} />
                        )}
                    />
                    <input type="hidden" {...register(`questions.${qIndex}.options.${oIndex}.id`)} />
                    <input type="text" id={`questions.${qIndex}.options.${oIndex}.text`} {...register(`questions.${qIndex}.options.${oIndex}.text`)} placeholder={`Seçenek ${oIndex + 1}`} className={`flex-grow px-3 py-2 border ${errors.questions?.[qIndex]?.options?.[oIndex]?.text ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} disabled={watch(`questions.${qIndex}.options.${oIndex}.toBeDeleted`)} />
                    {(watch(`questions.${qIndex}.options`)?.filter(opt => !opt.toBeDeleted)?.length ?? 0) > 2 || !option.id && (watch(`questions.${qIndex}.options`)?.length ?? 0) > 2  ? (
                      <button type="button" onClick={() => handleToggleDeleteOption(qIndex, oIndex)} disabled={isSubmitting} className="ml-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 disabled:opacity-50" title={option.id ? "Seçeneği silmek için işaretle" : "Yeni seçeneği sil"}>
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                  )
                ))}
                {errors.questions?.[qIndex]?.options && !Array.isArray(errors.questions?.[qIndex]?.options) && <p className="mt-1 text-xs text-red-600">{errors.questions?.[qIndex]?.options?.message}</p>}
                 {(watch(`questions.${qIndex}.options`)?.filter(opt => !opt.toBeDeleted).length ?? 0) < 5 && (
                    <button type="button" onClick={() => handleAddOption(qIndex)} disabled={isSubmitting || watch(`questions.${qIndex}.toBeDeleted`)} className="mt-2 inline-flex items-center px-3 py-1.5 border border-dashed border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"><PlusIcon className="w-4 h-4 mr-1" />Seçenek Ekle</button>
                 )}
                 {errors.questions?.[qIndex]?.correctOptionIdOrIndex && <p className="mt-1 text-xs text-red-600">{errors.questions?.[qIndex]?.correctOptionIdOrIndex?.message}</p>}
              </div>

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
            </div>
            )
          ))}
        </div>
        
        {submissionError && (
            <div className="rounded-md bg-red-50 p-4 mt-4">
                <div className="flex">
                    <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" /></div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Test Kaydedilemedi</h3>
                        <div className="mt-2 text-sm text-red-700"><p>{submissionError}</p></div>
                    </div>
                </div>
            </div>
        )}

        <div className="pt-5 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => router.push(`/dashboard/tests/${currentSlug}`)} disabled={isSubmitting} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">İptal</button>
            <button type="submit" disabled={isSubmitting || !isDirty} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-indigo-400">
              <CheckIcon className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 