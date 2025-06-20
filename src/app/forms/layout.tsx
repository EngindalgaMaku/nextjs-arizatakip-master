import type { Metadata } from 'next';
import React from 'react';

// Define metadata for the forms route
export const metadata: Metadata = {
  title: 'Hüsniye Özdilek Ticaret Mesleki ve Teknik Anadolu Lisesi - Form Gönder',
  // You might want to omit or change the description inherited from root layout
  // description: 'Form gönderim sayfası',
};

// Simple layout component that just passes children through
export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 