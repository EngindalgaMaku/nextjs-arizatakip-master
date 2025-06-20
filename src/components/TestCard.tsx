'use client';

import { Test } from '@/types/tests'; // Assuming types are accessible via @/types
import Link from 'next/link';

const testCardStyle = {
  border: '1px solid #e0e0e0',
  borderRadius: '10px',
  padding: '20px',
  backgroundColor: '#fff',
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  transition: 'transform 0.2s ease-in-out, boxShadow 0.2s ease-in-out',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  height: '100%', // Ensure cards in a row take up same height for alignment
};

const testTitleStyle = {
  fontSize: '1.4rem',
  fontWeight: '600',
  color: '#007bff',
  marginBottom: '10px',
  minHeight: '50px', 
};

const testDescriptionStyle = {
  fontSize: '0.95rem',
  color: '#555',
  marginBottom: '20px',
  flexGrow: 1, 
  lineHeight: '1.6',
};

const testButtonLinkStyle = {
  display: 'inline-block',
  padding: '10px 20px',
  backgroundColor: '#007bff',
  color: 'white',
  textAlign: 'center' as const,
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '500',
  marginTop: 'auto', 
  transition: 'background-color 0.2s',
};

interface TestCardProps {
  test: Test;
}

export function TestCard({ test }: TestCardProps) {
  return (
    <div 
      style={testCardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
      }}
    >
      <div>
        <h2 style={testTitleStyle}>{test.title}</h2>
        <p style={testDescriptionStyle}>
          {test.description 
            ? (test.description.length > 150 ? test.description.substring(0, 147) + '...' : test.description)
            : 'Açıklama bulunmuyor.'
          }
        </p>
      </div>
      <Link href={`/tests/${test.slug}`} style={testButtonLinkStyle}>
          Teste Git
      </Link>
    </div>
  );
} 