import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase'; // Supabase tarafından generate edilen tipler
import { Test, TestOption, TestQuestion } from '@/types/tests'; // Bu Test tipi hala UI için kullanılabilir, ancak DB tipleri ayrı olacak

// Supabase tablo adı
const TABLE_NAME = 'tests';

// Veritabanı satırını UI Test tipine dönüştürmek için yardımcı fonksiyon
function mapSupabaseRowToTest(row: Database['public']['Tables']['tests']['Row']): Test {
  let questionsArray: TestQuestion[] = [];
  // questions alanı string ise (eski bir kayıt veya beklenmedik durum)
  if (typeof row.questions === 'string') {
    try {
      const parsedQuestions = JSON.parse(row.questions);
      if (Array.isArray(parsedQuestions)) {
        questionsArray = parsedQuestions.map((q: any): TestQuestion => ({
          id: q.id, 
          text: q.text,
          options: Array.isArray(q.options) // Önce array mi diye kontrol et
            ? q.options.map((opt: any) => ({ id: String(opt.id), text: String(opt.text) }))
            : q.options && typeof q.options === 'object' // Sonra obje mi diye kontrol et (eski format için)
              ? Object.entries(q.options).map(([key, value]): TestOption => ({
                  id: key, 
                  text: String(value),
                }))
              : [], // İkisi de değilse veya tanımsızsa boş array
          correctOptionId: q.correctOptionId,
          question_type: q.question_type || 'multiple_choice_single_answer',
          points: q.points === undefined ? 1 : q.points,
          explanation: q.explanation || null,
          imageUrl: q.imageUrl || undefined,
        }));
      }
    } catch (error) {
      console.error('Failed to parse questions JSON string during map:', error);
    }
  } else if (Array.isArray(row.questions)) {
    // questions alanı zaten bir array ise (Supabase JSONB'yi otomatik array olarak parse ettiyse)
    questionsArray = (row.questions as any[]).map((q: any): TestQuestion => ({
      id: q.id, 
      text: q.text,
      options: Array.isArray(q.options) // Önce array mi diye kontrol et
        ? q.options.map((opt: any) => ({ id: String(opt.id), text: String(opt.text) }))
        : q.options && typeof q.options === 'object' && !Array.isArray(q.options) // Sonra obje mi diye kontrol et (eski format için)
          ? Object.entries(q.options).map(([key, value]): TestOption => ({
              id: key,
              text: String(value),
            }))
          : [], // İkisi de değilse veya tanımsızsa boş array
      correctOptionId: q.correctOptionId,
      question_type: q.question_type || 'multiple_choice_single_answer',
      points: q.points === undefined ? 1 : q.points,
      explanation: q.explanation || null,
      imageUrl: q.imageUrl || undefined,
    }));
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description || '',
    questions: questionsArray, 
    category: row.category || undefined,
    passingScore: row.passing_score === null ? undefined : row.passing_score,
    timeLimit: row.time_limit === null ? undefined : row.time_limit,
    randomizeQuestions: row.randomize_questions === null ? false : row.randomize_questions,
    randomizeOptions: row.randomize_options === null ? false : row.randomize_options,
    isPublished: row.is_published === null ? false : row.is_published,
    isPublicViewable: row.is_public_viewable === null ? false : row.is_public_viewable,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

// Helper function to generate a simple slug (client-side zaten var, backend'de de tutarlılık için)
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '') // Tireye izin ver
    .replace(/^-+|-+$/g, ''); // Başta ve sonda olabilecek tireleri kaldır
}

// Helper function to call the revalidate API
async function triggerRevalidation(pathsToRevalidate: string[], slug?: string) {
  const revalidateUrl = new URL('/api/revalidate', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  // NEXT_PUBLIC_APP_URL ortam değişkenini .env.local dosyanızda tanımlamanız gerekir.
  // Örneğin: NEXT_PUBLIC_APP_URL=http://localhost:3000 (geliştirme için)
  // veya NEXT_PUBLIC_APP_URL=https://atsis.husniyeozdilek.k12.tr (canlı site için)
  
  const revalidateSecret = process.env.REVALIDATE_SECRET_TOKEN;
  if (!revalidateSecret) {
    console.warn('REVALIDATE_SECRET_TOKEN is not set. Skipping revalidation.');
    return;
  }

  for (const singlePath of pathsToRevalidate) {
    // Eğer slug varsa ve path dinamikse, slug'ı path'e ekle
    const actualPath = slug && singlePath.includes('[slug]') ? singlePath.replace('[slug]', slug) : singlePath;
    try {
      const res = await fetch(revalidateUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': revalidateSecret,
        },
        body: JSON.stringify({ path: actualPath }), // Şimdilik sadece path ile revalidate edelim
      });

      const result = await res.json();
      if (res.ok && result.revalidated) {
        console.log(`Successfully revalidated: ${actualPath}`, result);
      } else {
        console.error(`Failed to revalidate ${actualPath}:`, result);
      }
    } catch (error) {
      console.error(`Error triggering revalidation for ${actualPath}:`, error);
    }
  }
}

// --- Veri Çekme Fonksiyonları ---
export async function getTests(): Promise<Test[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching tests:', error);
    return [];
  }
  return data ? data.map(mapSupabaseRowToTest) : [];
}

export async function getTestBySlug(slug: string): Promise<Test | null> {
  const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('slug', slug).maybeSingle();
  if (error) {
    console.error(`Error fetching test by slug ${slug}:`, error);
    return null;
  }
  return data ? mapSupabaseRowToTest(data) : null;
}

export async function getTestById(id: string): Promise<Test | null> {
  const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error(`Error fetching test by id ${id}:`, error);
    return null;
  }
  return data ? mapSupabaseRowToTest(data) : null;
}

// --- Herkese Açık Testler İçin Fonksiyonlar ---

export async function getPublicTests(): Promise<Test[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('is_public_viewable', true)
    .eq('is_published', true) // Genellikle public testlerin aynı zamanda yayınlanmış olması beklenir
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching public tests:', error);
    return [];
  }
  return data ? data.map(mapSupabaseRowToTest) : [];
}

export async function getPublicTestBySlug(slug: string): Promise<Test | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('slug', slug)
    .eq('is_public_viewable', true)
    .eq('is_published', true) // Yayınlanmış ve public ise getir
    .maybeSingle();

  if (error) {
    console.error(`Error fetching public test by slug ${slug}:`, error);
    return null;
  }
  return data ? mapSupabaseRowToTest(data) : null;
}

// --- CRUD Fonksiyonları ---

// NewTestData arayüzü client tarafındaki formdan gelen veriyi temsil eder.
export interface NewTestData {
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
    id?: number; // Opsiyonel ID alanı eklendi
    text: string;
    options: {
      id: string;
      text: string;
    }[];
    correctOptionId: string;
  }[];
}

export async function addTest(testData: NewTestData): Promise<Test | { error: string }> {
  try {
    const slugToSave = testData.slug || generateSlug(testData.title);

    // Slug'ın benzersiz olup olmadığını kontrol et (DB seviyesinde unique constraint var ama ön kontrol iyi)
    const { data: existingTest, error: slugError } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .eq('slug', slugToSave)
      .maybeSingle();

    if (slugError && slugError.code !== 'PGRST116') { // PGRST116: no rows found, bu bir hata değil
        console.error('Slug check error:', slugError);
        return { error: `Slug kontrol edilirken bir hata oluştu: ${slugError.message}` };
    }
    if (existingTest) {
      return { error: 'Bu slug zaten kullanılıyor. Lütfen farklı bir slug deneyin.' };
    }
    
    if (!testData.questions || testData.questions.length === 0) {
        return { error: 'Test en az bir soru içermelidir.' };
    }
    
    // Sorular için basit ID ataması
    const processedQuestions = testData.questions.map((q, index) => {
        const questionId = index + 1; // Her zaman yeni ID oluştur
        const optionsWithIds = q.options.map((opt, optIndex) => ({
            id: opt.id || String.fromCharCode(97 + optIndex), // a, b, c...
            text: opt.text,
        })); 

        if (!optionsWithIds.find(opt => opt.id === q.correctOptionId)) {
            throw new Error(`Soru "${q.text.substring(0,20)}..." için belirtilen doğru seçenek ID (${q.correctOptionId}) seçenekler arasında bulunamadı.`);
        }

        return {
            id: questionId,
            text: q.text,
            options: optionsWithIds,
            correctOptionId: q.correctOptionId,
        };
    });

    const newSupabaseTest: Database['public']['Tables']['tests']['Insert'] = {
      title: testData.title,
      slug: slugToSave,
      description: testData.description,
      category: testData.category || null,
      passing_score: testData.passingScore,
      time_limit: testData.timeLimit,
      randomize_questions: testData.randomizeQuestions,
      randomize_options: testData.randomizeOptions,
      is_published: testData.isPublished,
      is_public_viewable: testData.isPublicViewable,
      questions: processedQuestions as any, // JSONB alanı, Supabase any kabul eder
      // created_at ve updated_at DB tarafından otomatik ayarlanacak
    };

    const { data: insertedData, error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert(newSupabaseTest)
      .select()
      .single(); // Tek bir satır eklediğimizi ve dönmesini istediğimizi belirtir

    if (insertError) {
      console.error('Error adding test to Supabase:', insertError);
      return { error: `Test eklenirken bir veritabanı hatası oluştu: ${insertError.message}` };
    }
    if (!insertedData) {
        return { error: 'Test eklendi ancak veritabanından geri alınamadı.' };
    }

    // Revalidation trigger for addTest
    const pathsToRevalidate = ['/tests']; 
    if (insertedData.is_public_viewable && insertedData.is_published && insertedData.slug) {
        // Eğer test public ve yayınlanmışsa, slug sayfasını da revalidate et
        pathsToRevalidate.push(`/tests/[slug]`);
        await triggerRevalidation(pathsToRevalidate, insertedData.slug);
    } else {
        await triggerRevalidation(pathsToRevalidate);
    }

    // Admin dashboard için de revalidation gerekebilir
    // await triggerRevalidation([`/dashboard/tests/${insertedData.slug}/edit`, '/dashboard/tests']);

    return mapSupabaseRowToTest(insertedData);
  } catch (error) {
    console.error('addTest genel hata:', error);
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// UpdateTestData arayüzü client tarafındaki formdan gelen veriyi temsil eder.
export interface UpdateTestData {
  title?: string;
  slug?: string;
  description?: string;
  category?: string;
  passingScore?: number;
  timeLimit?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  isPublished?: boolean;
  isPublicViewable?: boolean;
  questions?: Array<{
    id?: number; // Varolan sorular için ID, yeni sorular için tanımsız
    text: string;
    options: Array<{ id?: string; text: string; toBeDeleted?: boolean }>;
    correctOptionIdOrIndex: string | number; // ID (varolan) veya index (yeni/güncellenmiş)
    toBeDeleted?: boolean; // Soru silinecek mi?
  }>;
}

export async function updateTest(testId: string, updates: UpdateTestData): Promise<Test | { error: string }> {
  try {
    let slugToSave = updates.slug;
    // Slug kontrolü (eğer başlık değiştiyse ve slug belirtilmediyse veya aynıysa)
    if (updates.title && (!updates.slug || updates.slug === (await getTestById(testId))?.slug)) {
        const potentialNewSlug = generateSlug(updates.title);
        const { data: existingTestWithSlug } = await supabase.from(TABLE_NAME).select('id').eq('slug', potentialNewSlug).not('id', 'eq', testId).maybeSingle();
        if (existingTestWithSlug) {
            // Slug zaten başkası tarafından kullanılıyor
        } else {
            slugToSave = potentialNewSlug;
        }
    } else if (updates.slug) {
        const { data: existingTestWithSlug } = await supabase.from(TABLE_NAME).select('id').eq('slug', updates.slug).not('id', 'eq', testId).maybeSingle();
        if (existingTestWithSlug) {
            return { error: 'Bu slug zaten başka bir test tarafından kullanılıyor.' };
        }
    }

    let processedQuestions: TestQuestion[] | undefined = undefined;
    if (updates.questions) {
        let nextQuestionId = 1; 
        const numericIdsInUpdate = updates.questions
            .map(qUpd => qUpd.id) 
            .filter((id): id is number => typeof id === 'number' && id > 0);

        if (numericIdsInUpdate.length > 0) {
            nextQuestionId = Math.max(0, ...numericIdsInUpdate) + 1;
        }
        
        processedQuestions = updates.questions
            .filter(qUpdate => !qUpdate.toBeDeleted)
            .map(qUpdate => {
                const liveOptions = qUpdate.options
                    .filter(opt => !opt.toBeDeleted)
                    .map((opt, optIndex) => ({ 
                        id: opt.id || String.fromCharCode(97 + optIndex), 
                        text: opt.text 
                    }));
                
                let correctOptionIdToSet: string;
                if (typeof qUpdate.correctOptionIdOrIndex === 'string') {
                    correctOptionIdToSet = qUpdate.correctOptionIdOrIndex;
                } else { 
                    if (qUpdate.correctOptionIdOrIndex < 0 || qUpdate.correctOptionIdOrIndex >= liveOptions.length) {
                        throw new Error(`Soru "${qUpdate.text.substring(0,20)}..." için geçersiz doğru seçenek indeksi.`);
                    }
                    correctOptionIdToSet = liveOptions[qUpdate.correctOptionIdOrIndex].id;
                }
                if (!liveOptions.find(opt => opt.id === correctOptionIdToSet)){
                     throw new Error(`Soru "${qUpdate.text.substring(0,20)}..." için belirtilen doğru seçenek ID (${correctOptionIdToSet}) seçenekler arasında bulunamadı.`);
                }

                return {
                    id: String(qUpdate.id || nextQuestionId++), 
                    text: qUpdate.text,
                    options: liveOptions,
                    correctOptionId: correctOptionIdToSet,
                } as TestQuestion; 
            });
    }

    const updateData: Partial<Database['public']['Tables']['tests']['Row']> = {};

    if (updates.title) updateData.title = updates.title;
    if (slugToSave) updateData.slug = slugToSave;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.passingScore !== undefined) updateData.passing_score = updates.passingScore;
    if (updates.timeLimit !== undefined) updateData.time_limit = updates.timeLimit;
    if (updates.randomizeQuestions !== undefined) updateData.randomize_questions = updates.randomizeQuestions;
    if (updates.randomizeOptions !== undefined) updateData.randomize_options = updates.randomizeOptions;
    if (updates.isPublished !== undefined) updateData.is_published = updates.isPublished;
    if (updates.isPublicViewable !== undefined) updateData.is_public_viewable = updates.isPublicViewable;
    if (processedQuestions) updateData.questions = processedQuestions as any; 
    updateData.updated_at = new Date().toISOString(); 

    if (Object.keys(updateData).length === 1 && updateData.updated_at) {
        const currentTest = await getTestById(testId);
        return currentTest || { error: 'Test bulunamadı ama değişiklik de yoktu.' };
    }

    const { data: updatedData, error: updateError } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq('id', testId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating test in Supabase:', updateError);
      return { error: `Test güncellenirken bir veritabanı hatası oluştu: ${updateError.message}` };
    }
    if (!updatedData) {
        return { error: 'Test güncellendi ancak veritabanından geri alınamadı.' };
    }

    // Revalidation trigger
    const pathsToRevalidate = ['/tests']; // Her zaman test listeleme sayfasını revalidate et
    // Eğer slug değiştiyse eski slug sayfasını da (varsa) revalidate etmek gerekebilir, ama bu daha karmaşık.
    // Şimdilik güncel slug'ı ve genel listeyi revalidate edelim.
    if (updatedData.slug) {
        pathsToRevalidate.push(`/tests/[slug]`); // Dinamik yolu template olarak ver
        await triggerRevalidation(pathsToRevalidate, updatedData.slug);
    } else {
        await triggerRevalidation(pathsToRevalidate);
    }
    
    // Admin dashboard için de revalidation gerekebilir
    // await triggerRevalidation([`/dashboard/tests/${updatedData.slug}/edit`, '/dashboard/tests']);

    return mapSupabaseRowToTest(updatedData);
  } catch (error) {
    console.error('updateTest genel hata:', error);
    return { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

export async function deleteTest(testId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', testId);

    if (error) {
      console.error('Error deleting test from Supabase:', error);
      return { success: false, error: `Test silinirken bir veritabanı hatası oluştu: ${error.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error('deleteTest genel hata:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.' };
  }
} 