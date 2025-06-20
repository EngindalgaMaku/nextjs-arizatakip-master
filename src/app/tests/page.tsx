'use client';

import { getPublicTests } from '@/actions/testActions';
import { TestCard } from '@/components/TestCard';
import { Test } from '@/types/tests';
import { useEffect, useState } from 'react';

const pageContainerStyle = {
  maxWidth: '1200px',
  margin: '20px auto',
  padding: '20px',
  fontFamily: 'Arial, sans-serif',
};

const pageTitleStyle = {
  textAlign: 'center' as const,
  marginBottom: '40px',
  fontSize: '2rem',
  fontWeight: 'bold',
  color: '#333',
};

const categoryFilterStyle = {
  marginBottom: '30px',
  display: 'flex',
  justifyContent: 'center',
  gap: '10px',
  flexWrap: 'wrap' as const,
};

const categoryButtonStyle = {
  padding: '8px 16px',
  borderRadius: '20px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const activeCategoryButtonStyle = {
  ...categoryButtonStyle,
  backgroundColor: '#4f46e5',
  color: '#fff',
  borderColor: '#4f46e5',
};

const categorySectionStyle = {
  marginBottom: '40px',
};

const categoryTitleStyle = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#1f2937',
  borderBottom: '2px solid #e5e7eb',
  paddingBottom: '10px',
};

const testGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '25px',
};

export default function PublicTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTests() {
      try {
        const fetchedTests = await getPublicTests();
        setTests(fetchedTests);
      } catch (error) {
        console.error('Error loading tests:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTests();
  }, []);

  // Group tests by category
  const testsByCategory = tests.reduce((acc, test) => {
    const category = test.category || 'Genel';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(test);
    return acc;
  }, {} as Record<string, Test[]>);

  // Get unique categories
  const categories = Object.keys(testsByCategory);

  // Filter tests based on selected category
  const filteredTestsByCategory = selectedCategory
    ? { [selectedCategory]: testsByCategory[selectedCategory] }
    : testsByCategory;

  if (isLoading) {
    return (
      <div style={pageContainerStyle}>
        <h1 style={pageTitleStyle}>TEST VE ÇALIŞMA PLATFORMU</h1>
        <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem' }}>
          <p>Testler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageContainerStyle}>
      <h1 style={pageTitleStyle}>TEST VE ÇALIŞMA PLATFORMU</h1>
      
      {(!tests || tests.length === 0) ? (
        <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2rem' }}>
          <p>Herkese açık test bulunmamaktadır.</p>
        </div>
      ) : (
        <>
          <div style={categoryFilterStyle}>
            <button
              style={selectedCategory === null ? activeCategoryButtonStyle : categoryButtonStyle}
              onClick={() => setSelectedCategory(null)}
            >
              Tümü
            </button>
            {categories.map(category => (
              <button
                key={category}
                style={selectedCategory === category ? activeCategoryButtonStyle : categoryButtonStyle}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {Object.entries(filteredTestsByCategory).map(([category, categoryTests]) => (
            <div key={category} style={categorySectionStyle}>
              <h2 style={categoryTitleStyle}>{category}</h2>
              <div style={testGridStyle}>
                {categoryTests.map(test => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
} 