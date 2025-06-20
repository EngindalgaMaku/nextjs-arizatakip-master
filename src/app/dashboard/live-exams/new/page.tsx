'use client';

import { createLiveExam } from "@/actions/liveExamActions";
import { getTests } from "@/actions/testActions";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import type { LiveExamCreationParams, Test } from "@/types/tests";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// ADMIN_USER_ID_PLACEHOLDER artık kullanılmayacak.
// const ADMIN_USER_ID_PLACEHOLDER = "admin-user-placeholder-id";

const liveExamSchema = z.object({
  testId: z.string({ required_error: "Lütfen bir test seçin." }),
  title: z.string().min(3, "Sınav başlığı en az 3 karakter olmalıdır.").max(100, "Sınav başlığı en fazla 100 karakter olabilir.").optional(),
  description: z.string().max(500, "Açıklama en fazla 500 karakter olabilir.").optional(),
  scheduledStartTime: z.date({ required_error: "Başlangıç zamanı zorunludur." }),
  scheduledEndTime: z.date({ required_error: "Bitiş zamanı zorunludur." }),
  timeLimit: z.coerce.number().int().min(1, "Süre en az 1 dakika olmalıdır.").max(360, "Süre en fazla 360 dakika olabilir."),
  maxAttempts: z.coerce.number().int().min(1, "Deneme sayısı en az 1 olmalıdır."),
  autoPublishResults: z.boolean(),
  allowLateSubmissions: z.boolean(),
  randomizeQuestions: z.boolean(),
  randomizeOptions: z.boolean(),
}).refine((data) => {
  const start = new Date(data.scheduledStartTime);
  const end = new Date(data.scheduledEndTime);
  return end > start;
}, {
  message: "Bitiş zamanı, başlangıç zamanından sonra olmalıdır.",
  path: ["scheduledEndTime"],
});

type LiveExamFormValues = z.infer<typeof liveExamSchema>;

export default function CreateLiveExamPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<LiveExamFormValues>({
    resolver: zodResolver(liveExamSchema),
    defaultValues: {
      testId: "",
      title: undefined,
      description: "",
      timeLimit: 60,
      maxAttempts: 1,
      autoPublishResults: true,
      allowLateSubmissions: false,
      randomizeQuestions: true,
      randomizeOptions: true,
      scheduledStartTime: new Date(new Date().getTime() + 5 * 60000),
      scheduledEndTime: new Date(new Date().getTime() + 65 * 60000),
    },
  });

  useEffect(() => {
    async function fetchTestsData() {
      setIsLoadingTests(true);
      try {
        const testsData = await getTests();
        if (Array.isArray(testsData)) {
          setTests(testsData);
        } else if (testsData && typeof testsData === 'object' && 'data' in testsData && Array.isArray((testsData as {data: Test[]}).data)) {
          setTests((testsData as {data: Test[]}).data); 
        } else {
          setTests([]);
          toast.error("Testler yüklenirken bir sorun oluştu.");
        }
      } catch (error) {
        console.error("Error fetching tests:", error);
        toast.error("Testler yüklenemedi.");
      } finally {
        setIsLoadingTests(false);
      }
    }
    fetchTestsData();
  }, []);

  const onSubmit: SubmitHandler<LiveExamFormValues> = async (data) => {
    console.log('Form submission started', { data });
    setIsSubmitting(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Auth check result:', { user, userError });

      if (userError || !user) {
        toast.error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.");
        console.error("Error getting user session:", userError);
        return;
      }

      const selectedTest = tests.find(t => t.id === data.testId);
      if (!selectedTest) {
        toast.error("Seçilen test bulunamadı.");
        return;
      }

      const creationParams: LiveExamCreationParams = {
        ...data,
        title: data.title || selectedTest.title,
        description: data.description || selectedTest.description,
        scheduledStartTime: new Date(data.scheduledStartTime),
        scheduledEndTime: new Date(data.scheduledEndTime),
      };
      
      const result = await createLiveExam(user.id, creationParams);

      if ('id' in result && result.id) {
        toast.success(`Canlı sınav "${result.title}" başarıyla oluşturuldu.`);
        router.push("/dashboard/live-exams");
      } else if ('error' in result) {
        toast.error(result.error || "Canlı sınav oluşturulurken bir hata oluştu.");
      } else {
        toast.error("Canlı sınav oluşturulurken bilinmeyen bir hata oluştu.");
      }
    } catch (error) {
      console.error("Error creating live exam:", error);
      toast.error("Canlı sınav oluşturma başarısız oldu.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const selectedTestId = watch("testId");
  useEffect(() => {
    if (selectedTestId) {
      const selectedTest = tests.find(t => t.id === selectedTestId);
      if (selectedTest && !watch("title")) { // Sadece başlık boşsa otomatik doldur
        setValue("title", selectedTest.title + " - Canlı Sınav");
      }
    }
  }, [selectedTestId, tests, setValue, watch]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-2xl">Yeni Canlı Sınav Oluştur</CardTitle>
            <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/live-exams">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Sınav Listesine Dön
                </Link>
            </Button>
          </div>
          <CardDescription>
            Seçtiğiniz bir testi canlı sınava dönüştürün ve ayarlarını yapılandırın.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="testId">Temel Alınacak Test</Label>
              <Controller
                name="testId"
                control={control}
                rules={{ required: "Lütfen bir test seçin" }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingTests || isSubmitting}
                  >
                    <SelectTrigger id="testId">
                      <SelectValue placeholder={isLoadingTests ? "Testler yükleniyor..." : "Bir test seçin"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tests.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.testId && <p className="text-sm text-red-500">{errors.testId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Sınav Başlığı</Label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input 
                    id="title" 
                    {...field} 
                    value={field.value || ''} 
                    placeholder="Örn: 1. Dönem Matematik Canlı Sınavı" 
                    disabled={isSubmitting} 
                  />
                )}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea 
                    id="description" 
                    {...field} 
                    value={field.value || ''} 
                    placeholder="Sınavla ilgili ek bilgiler..." 
                    disabled={isSubmitting} 
                    rows={3} 
                  />
                )}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="scheduledStartTime">Başlangıç Zamanı</Label>
                <Controller
                  name="scheduledStartTime"
                  control={control}
                  rules={{ required: "Başlangıç zamanı zorunludur" }}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      type="datetime-local"
                      id="scheduledStartTime"
                      value={value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={(e) => {
                        console.log("scheduledStartTime raw value:", e.target.value);
                        const dateValue = new Date(e.target.value);
                        console.log("scheduledStartTime parsed date:", dateValue);
                        onChange(dateValue);
                      }}
                      disabled={isSubmitting}
                    />
                  )}
                />
                {errors.scheduledStartTime && <p className="text-sm text-red-500">{errors.scheduledStartTime.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledEndTime">Bitiş Zamanı</Label>
                <Controller
                  name="scheduledEndTime"
                  control={control}
                  rules={{ required: "Bitiş zamanı zorunludur" }}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      type="datetime-local"
                      id="scheduledEndTime"
                      value={value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={(e) => {
                        console.log("scheduledEndTime raw value:", e.target.value);
                        const dateValue = new Date(e.target.value);
                        console.log("scheduledEndTime parsed date:", dateValue);
                        onChange(dateValue);
                      }}
                      disabled={isSubmitting}
                    />
                  )}
                />
                {errors.scheduledEndTime && <p className="text-sm text-red-500">{errors.scheduledEndTime.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Sınav Süresi (dakika)</Label>
                  <Controller
                    name="timeLimit"
                    control={control}
                    render={({ field }) => <Input id="timeLimit" type="number" {...field} disabled={isSubmitting} />}
                  />
                  {errors.timeLimit && <p className="text-sm text-red-500">{errors.timeLimit.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAttempts">Maksimum Deneme Sayısı</Label>
                  <Controller
                    name="maxAttempts"
                    control={control}
                    render={({ field }) => <Input id="maxAttempts" type="number" {...field} disabled={isSubmitting} />}
                  />
                  {errors.maxAttempts && <p className="text-sm text-red-500">{errors.maxAttempts.message}</p>}
                </div>
            </div>

            <h3 className="text-lg font-medium border-b pb-2 mt-6">Sınav Ayarları</h3>
            <div className="space-y-4 pt-2">
              <Controller
                name="autoPublishResults"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                    <Label htmlFor="autoPublishResults" className="mb-0 flex flex-col">
                        <span>Sonuçları Otomatik Yayınla</span>
                        <span className="text-xs text-gray-500 font-normal">Sınav bitince sonuçlar öğrencilere gösterilsin mi?</span>
                    </Label>
                    <Switch id="autoPublishResults" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </div>
                )}
              />
               <Controller
                name="allowLateSubmissions"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                    <Label htmlFor="allowLateSubmissions" className="mb-0 flex flex-col">
                        <span>Geç Teslime İzin Ver</span>
                        <span className="text-xs text-gray-500 font-normal">Süre bitiminden sonra gönderime izin verilsin mi?</span>
                    </Label>
                    <Switch id="allowLateSubmissions" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </div>
                )}
              />
              <Controller
                name="randomizeQuestions"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                    <Label htmlFor="randomizeQuestions" className="mb-0">Soruları Karıştır</Label>
                    <Switch id="randomizeQuestions" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </div>
                )}
              />
              <Controller
                name="randomizeOptions"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                    <Label htmlFor="randomizeOptions" className="mb-0">Seçenekleri Karıştır</Label>
                    <Switch id="randomizeOptions" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </div>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="mt-6 flex justify-end border-t pt-6">
            <Button 
              type="submit" 
              className="w-full md:w-auto bg-primary text-white hover:bg-primary/90" 
              disabled={isSubmitting || isLoadingTests}
            >
              {isSubmitting ? "Oluşturuluyor..." : (isLoadingTests ? "Testler Yükleniyor..." : "Canlı Sınavı Oluştur")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 