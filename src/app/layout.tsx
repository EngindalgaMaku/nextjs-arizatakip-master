import { AuthProvider } from '@/contexts/AuthContext';
// import { ClerkProvider } from '@clerk/nextjs';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
// import { I18nextProvider } from 'react-i18next'; // Temporarily comment out
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Hüsniye Özdilek ATSİS',
  description: 'Hüsniye Özdilek Ticaret Meslek Lisesi Staj Takip ve İzleme Sistemi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Removed: <ClerkProvider>
      <html lang="tr">
        <body className={`${inter.className} bg-gray-50 min-h-screen`}>
          {/* <I18nextProvider i18n={i18n}> */}
            <AuthProvider>
              {children}
            </AuthProvider>
          {/* </I18nextProvider> */}
        </body>
      </html>
    // Removed: </ClerkProvider>
  );
}
