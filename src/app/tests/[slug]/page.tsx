'use client';

import { getPublicTestBySlug } from '@/actions/testActions';
import { Test, TestQuestion } from '@/types/tests';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TestViewPageProps {
  params: {
    slug: string;
  };
}

interface QuestionDisplayProps {
  question: TestQuestion;
  index: number;
  selectedAnswer?: string | null;
  onAnswerSelect: (questionId: string, optionId: string) => void;
  showResults?: boolean;
  isIndividuallyRevealed?: boolean;
  onRevealAnswer: (questionId: string) => void;
}

const questionCardStyle = {
  border: '1px solid #e0e0e0',
  padding: '20px',
  marginBottom: '20px',
  borderRadius: '8px',
  backgroundColor: '#fff',
};

const questionTextStyle = {
  fontSize: '1.1rem',
  fontWeight: '600',
  marginBottom: '15px',
};

const optionButtonStyle = {
  display: 'block',
  width: '100%',
  padding: '12px 15px',
  marginBottom: '10px',
  border: '1px solid #ccc',
  borderRadius: '6px',
  textAlign: 'left' as const,
  cursor: 'pointer',
  backgroundColor: '#f9f9f9',
  transition: 'background-color 0.2s, border-color 0.2s',
};

const selectedOptionStyle = {
  ...optionButtonStyle,
  borderColor: '#007bff',
  backgroundColor: '#e7f3ff',
  fontWeight: 'bold',
};

const correctOptionStyle = {
  ...optionButtonStyle,
  borderColor: '#28a745',
  backgroundColor: '#d4edda',
  color: '#155724',
  fontWeight: 'bold',
};

const incorrectOptionStyle = {
  ...optionButtonStyle,
  borderColor: '#dc3545',
  backgroundColor: '#f8d7da',
  color: '#721c24',
};

const commonButtonStyles = {
  padding: '10px 20px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: '500',
  transition: 'background-color 0.2s',
};

const primaryButtonStyle = {
  ...commonButtonStyles,
  backgroundColor: '#007bff',
  color: 'white',
  marginRight: '10px',
};

const secondaryButtonStyle = {
  ...commonButtonStyles,
  backgroundColor: '#6c757d',
  color: 'white',
};

const revealButtonStyle = {
  ...commonButtonStyles,
  backgroundColor: '#ffc107', // Warning color for reveal
  color: 'black',
  padding: '6px 12px',
  fontSize: '0.9rem',
  marginTop: '10px',
};

function getOptionLabel(index: number): string {
  return String.fromCharCode(65 + index) + ')'; // A), B), C)...
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function QuestionDisplay({
  question,
  index,
  selectedAnswer,
  onAnswerSelect,
  showResults,
  isIndividuallyRevealed,
  onRevealAnswer,
  randomizeOptions = false,
}: QuestionDisplayProps & { randomizeOptions?: boolean }) {
  // Şıkları karıştır veya orijinal sırada göster
  const displayOptions = randomizeOptions ? shuffleArray(question.options) : question.options;

  return (
    <div style={questionCardStyle}>
      <h4 style={questionTextStyle}>
        Soru {index + 1}: {question.text}
      </h4>
      {question.imageUrl && (
        <div style={{ marginBottom: '20px' }}>
          <img
            src={question.imageUrl}
            alt={`Soru ${index + 1} resmi`}
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
        </div>
      )}
      <div>
        {displayOptions.map((option, optionIndex) => {
          let style = { ...optionButtonStyle };
          const isCorrect = option.id === question.correctOptionId;
          const isSelected = option.id === selectedAnswer;

          if (showResults) {
            if (isCorrect) {
              style = correctOptionStyle;
            } else if (isSelected && !isCorrect) {
              style = incorrectOptionStyle;
            } else {
              style.cursor = 'not-allowed';
              style.backgroundColor = '#f0f0f0';
            }
          } else if (isIndividuallyRevealed) {
            if (isCorrect) {
              style = correctOptionStyle;
            } else if (isSelected && !isCorrect) {
              style = incorrectOptionStyle;
            } else {
              style.cursor = 'not-allowed';
              style.backgroundColor = '#f0f0f0';
            }
          } else if (isSelected) {
            style = selectedOptionStyle;
          }

          return (
            <button
              key={option.id}
              style={style}
              onClick={() => 
                !showResults && 
                !isIndividuallyRevealed && 
                onAnswerSelect(String(question.id), option.id)
              }
              disabled={showResults || isIndividuallyRevealed}
            >
              {getOptionLabel(optionIndex)} {option.text}
            </button>
          );
        })}
      </div>
      {!showResults && !isIndividuallyRevealed && (
        <button 
          style={revealButtonStyle} 
          onClick={() => onRevealAnswer(String(question.id))}
        >
          Doğru Cevabı Göster
        </button>
      )}
      {showResults && selectedAnswer && !(selectedAnswer === question.correctOptionId) && question.explanation && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', border: '1px solid #f5c6cb'}}>
            <strong>Açıklama:</strong> {question.explanation}
        </div>
      )}
      {showResults && (selectedAnswer === question.correctOptionId) && question.explanation && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', border: '1px solid #c3e6cb'}}>
            <strong>Açıklama:</strong> {question.explanation}
        </div>
      )}
      {isIndividuallyRevealed && selectedAnswer && !(selectedAnswer === question.correctOptionId) && question.explanation && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', border: '1px solid #f5c6cb'}}>
            <strong>Açıklama:</strong> {question.explanation}
        </div>
      )}
      {isIndividuallyRevealed && (selectedAnswer === question.correctOptionId) && question.explanation && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px', border: '1px solid #c3e6cb'}}>
            <strong>Açıklama:</strong> {question.explanation}
        </div>
      )}
    </div>
  );
}

export default function PublicTestViewPage({ params }: TestViewPageProps) {
  const { slug } = params;
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [displayQuestions, setDisplayQuestions] = useState<TestQuestion[]>([]);

  useEffect(() => {
    async function fetchTest() {
      setIsLoading(true);
      setError(null);
      setTest(null);
      setSelectedAnswers({});
      setShowResults(false);
      setRevealedAnswers({});
      try {
        const fetchedTest = await getPublicTestBySlug(slug);
        if (fetchedTest) {
          setTest(fetchedTest);
          
          // Soruları ve şıkları bir kez karıştır
          let questions = [...fetchedTest.questions];
          if (fetchedTest.randomizeQuestions) {
            questions = shuffleArray(questions);
          }
          
          if (fetchedTest.randomizeOptions) {
            questions = questions.map(question => ({
              ...question,
              options: shuffleArray(question.options)
            }));
          }
          
          setDisplayQuestions(questions);
        } else {
          setError('Aradığınız test bulunamadı veya herkese açık değil.');
        }
      } catch (e) {
        console.error(e);
        setError('Test yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    }
    if (slug) {
      fetchTest();
    }
  }, [slug]);

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleRevealAnswer = (questionId: string) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [questionId]: true,
    }));
  };

  const handleSubmitOrShowResults = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setRevealedAnswers({});
  }

  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem' }}>Test yükleniyor...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem' }}>
        <p>{error}</p>
        <Link href="/tests" style={primaryButtonStyle}>
          Test Listesine Dön
        </Link>
      </div>
    );
  }

  if (!test) {
    return null;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>{test.title}</h1>
        {test.description && (
          <p style={{ color: '#666', marginBottom: '20px' }}>{test.description}</p>
        )}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div>
            <strong>Geçme Puanı:</strong> {test.passingScore}%
          </div>
          {test.timeLimit && (
            <div>
              <strong>Süre:</strong> {test.timeLimit} dakika
            </div>
          )}
        </div>
      </div>

      {displayQuestions.map((question, index) => (
        <QuestionDisplay
          key={question.id}
          question={question}
          index={index}
          selectedAnswer={selectedAnswers[question.id]}
          onAnswerSelect={handleAnswerSelect}
          showResults={showResults}
          isIndividuallyRevealed={revealedAnswers[question.id]}
          onRevealAnswer={handleRevealAnswer}
          randomizeOptions={false} // Artık her zaman false çünkü şıklar zaten karıştırıldı
        />
      ))}

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        {!showResults ? (
          <button
            style={primaryButtonStyle}
            onClick={handleSubmitOrShowResults}
          >
            Testi Bitir
          </button>
        ) : (
          <button
            style={secondaryButtonStyle}
            onClick={handleReset}
          >
            Testi Yeniden Başlat
          </button>
        )}
        <Link href="/tests" style={secondaryButtonStyle}>
          Test Listesine Dön
        </Link>
      </div>
    </div>
  );
} 