'use client';

import { getTestBySlug } from '@/actions/testActions';
import { TestQuestion, Test as TestType, TestUserState } from '@/types/tests';
import { ArrowLeftIcon, ArrowPathIcon, ArrowRightIcon, CheckCircleIcon, CheckIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type AnswerStatus = 'correct' | 'incorrect' | 'unanswered';

// Moved shuffleArray outside or wrap with useCallback if it uses component scope
const shuffleArray = <T,>(array: T[]): T[] => {
  if (!array) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function TestViewPage({ params }: { params: { slug: string } }) {
  // 1. All Hooks at the top level
  const router = useRouter();
  console.log("TestViewPage params:", params); // Log params to check its value
  const { slug } = params;
  
  const [test, setTest] = useState<TestType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testState, setTestState] = useState<TestUserState>({
    answers: {},
    startTime: new Date(),
    isSubmitted: false
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    async function fetchTest() {
      if (typeof slug !== 'string' || !slug) {
        setIsLoading(false);
        setError('Geçersiz test kimliği.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTest = await getTestBySlug(slug);
        setTest(fetchedTest);
        if (!fetchedTest) {
          setError('Test bulunamadı.');
        }
      } catch (error) {
        console.error("Failed to fetch test:", error);
        setError(error instanceof Error ? error.message : 'Test yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTest();
  }, [slug, setIsLoading, setError, setTest, getTestBySlug]);
  
  const questionsToDisplay = useMemo(() => {
    if (test && test.questions && test.randomizeQuestions) {
      return shuffleArray(test.questions);
    }
    return test && test.questions ? test.questions : [];
  }, [test]);

  const testResults = useMemo(() => {
    if (!test || !questionsToDisplay || questionsToDisplay.length === 0) {
      return {
        totalQuestions: 0,
        answered: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        score: 0,
        hasPassed: false
      };
    }
    const totalQuestions = questionsToDisplay.length;
    const answered = Object.keys(testState.answers).length;
    const correct = questionsToDisplay.filter(
      q => testState.answers[q.id] === q.correctOptionId
    ).length;
    const incorrect = answered - correct;
    const unanswered = totalQuestions - answered;
    const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const hasPassed = score >= (test.passingScore || 70); // test is guaranteed to be non-null here
    
    return {
      totalQuestions,
      answered,
      correct,
      incorrect,
      unanswered,
      score,
      hasPassed
    };
  }, [test, testState.answers, questionsToDisplay]);

  // 2. Conditional returns after all Hooks
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <ArrowPathIcon className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Test Yükleniyor...</h2>
      </div>
    );
  }

  if (error) {
     return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <ExclamationCircleIcon className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Hata</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => router.push('/dashboard/tests')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Testlere Dön
        </button>
      </div>
    );
  }
  
  // If test is still null after loading and no error, it means not found or slug was invalid initially
  if (!test) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <ExclamationCircleIcon className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Test Bulunamadı</h2>
        <p className="text-gray-600 mb-6">İstediğiniz test mevcut değil veya geçersiz bir kimlik ile istendi.</p>
        <button
          onClick={() => router.push('/dashboard/tests')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Testlere Dön
        </button>
      </div>
    );
  }
  
  // From this point, 'test' is guaranteed to be non-null.
  // However, questionsToDisplay might be empty if test.questions is empty.

  const currentQuestion = questionsToDisplay[currentQuestionIndex];
  
  // This condition handles if the test has no questions.
  if (questionsToDisplay.length === 0) { 
     return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <ExclamationCircleIcon className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Test İçeriği Boş</h2>
        <p className="text-gray-600 mb-6">Bu testte henüz soru bulunmamaktadır.</p>
         <button
          onClick={() => router.push('/dashboard/tests')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Testlere Dön
        </button>
      </div>
    );
  }

  // This handles if currentQuestionIndex is somehow out of bounds after questions are loaded.
  // Should ideally not happen if navigation logic is correct, but as a safeguard.
  if (!currentQuestion) {
     console.warn("Current question is undefined, possibly out of bounds. Resetting or showing error.");
     // Depending on desired behavior, you could reset index or show a generic error.
     // For now, let's show a generic error to avoid infinite loops if reset logic is flawed.
     return (
        <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
          <ExclamationCircleIcon className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Soru Yükleme Hatası</h2>
          <p className="text-gray-600">Güncel soru yüklenemedi. Lütfen testlere dönüp tekrar deneyin.</p>
          <button
            onClick={() => router.push('/dashboard/tests')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Testlere Dön
          </button>
        </div>
      );
  }
  
  // Kullanıcının bir seçenek seçmesini işle
  const handleOptionSelect = (questionId: string, optionId: string) => {
    setTestState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: optionId
      }
    }));
  };
  
  // Bir sonraki soruya geç
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questionsToDisplay.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Bir önceki soruya dön
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Belirli bir soruya git
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questionsToDisplay.length) {
      setCurrentQuestionIndex(index);
    }
  };
  
  // Testi bitir ve sonuçları göster
  const handleSubmitTest = () => {
    setTestState(prev => ({
      ...prev,
      isSubmitted: true
    }));
    setShowResults(true);
  };
  
  // Testi baştan başlat
  const handleRestartTest = () => {
    setTestState({
      answers: {},
      startTime: new Date(),
      isSubmitted: false
    });
    setCurrentQuestionIndex(0);
    setShowResults(false);
  };
  
  // Sorunun doğru/yanlış/cevaplanmamış durumunu kontrol et
  const getAnswerStatus = (question: TestQuestion): AnswerStatus => {
    const userAnswer = testState.answers[question.id];
    
    if (!userAnswer) {
      return 'unanswered';
    }
    
    return userAnswer === question.correctOptionId ? 'correct' : 'incorrect';
  };
  
  // Test sonuçları görünümü
  if (showResults) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">{test.title}</h1>
          <p className="text-gray-600">{test.description}</p>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Test Sonucu</h2>
              <p className="text-gray-600">
                Skorunuz: <span className="font-semibold">{testResults.score}%</span> 
                ({testResults.correct}/{testResults.totalQuestions} soru doğru)
              </p>
            </div>
            <div className={`mt-4 md:mt-0 px-4 py-2 rounded-full flex items-center ${testResults.hasPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {testResults.hasPassed ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  <span className="font-medium">Başarılı</span>
                </>
              ) : (
                <>
                  <XMarkIcon className="w-5 h-5 mr-2" />
                  <span className="font-medium">Başarısız</span>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-900 mb-2">İstatistikler</h3>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span className="text-gray-700">Toplam Soru:</span>
                  <span className="font-medium">{testResults.totalQuestions}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Doğru Cevap:</span>
                  <span className="font-medium text-green-600">{testResults.correct}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Yanlış Cevap:</span>
                  <span className="font-medium text-red-600">{testResults.incorrect}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Boş Bırakılan:</span>
                  <span className="font-medium text-gray-500">{testResults.unanswered}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Başarı Yüzdesi:</span>
                  <span className="font-medium">{testResults.score}%</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-700">Geçer Not:</span>
                  <span className="font-medium">{test.passingScore || 70}%</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-900 mb-2">Sonuç</h3>
              {testResults.hasPassed ? (
                <div className="text-green-700">
                  <p className="mb-2 font-medium">Tebrikler! Testi başarıyla geçtiniz.</p>
                  <p>Bilginizi başarıyla kanıtladınız ve gerekli puanı elde ettiniz.</p>
                </div>
              ) : (
                <div className="text-red-700">
                  <p className="mb-2 font-medium">Üzgünüz, testi geçemediniz.</p>
                  <p>Daha iyi bir sonuç elde etmek için konuları tekrar gözden geçirebilir ve testi yeniden alabilirsiniz.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Soru Detayları</h3>
            <div className="space-y-6">
              {questionsToDisplay.map((question, index) => {
                const status = getAnswerStatus(question);
                const userAnswer = testState.answers[question.id];
                const correctOption = question.options?.find(opt => opt.id === question.correctOptionId);
                
                return (
                  <div 
                    key={question.id} 
                    className={`p-4 rounded-lg border ${
                      status === 'correct' ? 'border-green-200 bg-green-50' : 
                      status === 'incorrect' ? 'border-red-200 bg-red-50' : 
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start mb-3">
                      <span className="font-semibold mr-2">{index + 1}.</span>
                      <div>
                        <p className="font-medium">{question.text}</p>
                        <div className="mt-3 space-y-2">
                          {/* ---- DEBUG BAŞLANGIÇ ---- */}
                          {/* {console.log(`Result Question ${index} ID: ${question.id}, Options:`, question.options)} */}
                          {/* {console.log(`Result Question ${index} ID: ${question.id}, Type of Options:`, typeof question.options)} */}
                          {/* ---- DEBUG BİTİŞ ---- */}
                          {question.options && Object.entries(question.options).map(([optionKey, optionText]) => {
                            const isUserSelection = userAnswer === optionKey;
                            const isCorrect = optionKey === question.correctOptionId;
                            
                            return (
                              <div 
                                key={optionKey}
                                className={`flex items-center p-2 rounded ${
                                  isCorrect ? 'bg-green-100 text-green-800' : 
                                  isUserSelection && !isCorrect ? 'bg-red-100 text-red-800' : 
                                  'bg-white text-gray-700'
                                }`}
                              >
                                <span className="w-6 mr-2">
                                  {optionKey.toUpperCase()}.
                                </span>
                                <span>{optionText.text}</span>
                                {isUserSelection && !isCorrect && (
                                  <XMarkIcon className="w-5 h-5 ml-auto text-red-600" />
                                )}
                                {isCorrect && (
                                  <CheckIcon className="w-5 h-5 ml-auto text-green-600" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {status === 'incorrect' && correctOption && (
                      <div className="mt-2 ml-6 pl-2 border-l-4 border-red-400">
                        <p className="text-sm text-red-700">
                          Cevabınız yanlış. Doğru cevap: <span className="font-semibold">
                            {question.correctOptionId.toUpperCase()}. {correctOption.text}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => router.push('/dashboard/tests')}
              className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Testlere Dön
            </button>
            
            <button
              onClick={handleRestartTest}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              Testi Yeniden Başlat
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Test görünümü
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">{test.title}</h1>
        <p className="text-gray-600">{test.description}</p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xl font-semibold">Soru {currentQuestionIndex + 1}/{questionsToDisplay.length}</span>
          </div>
          <div>
            <span className="text-gray-500">
              Cevaplanan: {Object.keys(testState.answers).length}/{questionsToDisplay.length}
            </span>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">{currentQuestion.text}</h2>
          {/* ---- DEBUG BAŞLANGIÇ ---- */}
          {/* {console.log('Current Question ID:', currentQuestion.id, 'Options:', currentQuestion.options)} */}
          {/* {console.log('Current Question ID:', currentQuestion.id, 'Type of Options:', typeof currentQuestion.options)} */}
          {/* ---- DEBUG BİTİŞ ---- */}
          <div className="space-y-3">
            {currentQuestion.options && Array.isArray(currentQuestion.options) && currentQuestion.options.map((option, index) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  testState.answers[currentQuestion.id] === option.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full border mr-3 ${
                    testState.answers[currentQuestion.id] === option.id
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-gray-400'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span>{option.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              currentQuestionIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Önceki Soru
          </button>
          
          {currentQuestionIndex < questionsToDisplay.length - 1 ? (
            <button
              onClick={goToNextQuestion}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              Sonraki Soru
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmitTest}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Testi Bitir
              <CheckIcon className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Sorular</h3>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1">
          {questionsToDisplay.map((question, index) => {
            const isAnswered = !!testState.answers[question.id];
            const isCurrentQuestion = index === currentQuestionIndex;
            
            return (
              <button
                key={question.id}
                onClick={() => goToQuestion(index)}
                className={`w-8 h-8 rounded-md flex items-center justify-center font-medium text-xs ${
                  isCurrentQuestion
                    ? 'bg-indigo-600 text-white'
                    : isAnswered
                    ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
} 