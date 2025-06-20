'use client';

import { useState } from 'react';

// API yanıt tipi tanımı
interface AuthTestResult {
  success: boolean;
  supabaseSignIn: {
    success: boolean;
    error?: string;
  };
  directSignIn: {
    success: boolean;
    error?: string;
  };
  env: {
    supabaseUrl: string;
    hasAnonKey: boolean;
  };
  [key: string]: unknown; // Ekstra alanlar için
}

export default function AuthTestPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuthTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function testAuth() {
    if (!email || !password) {
      setError('Email ve şifre giriniz');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      setResult(data);
      
      if (!data.success) {
        setError('Auth testi başarısız. Detaylar için sonuçları kontrol edin.');
      }
    } catch (err) {
      console.error('Test sırasında hata:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supabase Auth Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email adresiniz"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şifreniz"
            />
          </div>
          
          <button
            onClick={testAuth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Test Yapılıyor...' : 'Auth Test Et'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 p-6 rounded-lg shadow mb-6 border border-red-200">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Hata</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Test Sonuçları</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700">Genel Durum:</h3>
                <p className={`text-lg font-bold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.success ? 'Başarılı' : 'Başarısız'}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Supabase.ts SignIn:</h3>
                <div className={`p-4 rounded ${result.supabaseSignIn.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="font-medium mb-2">
                    {result.supabaseSignIn.success ? 'Başarılı' : 'Başarısız'}
                  </p>
                  {result.supabaseSignIn.error && (
                    <p className="text-red-600">{result.supabaseSignIn.error}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Direkt Supabase Client:</h3>
                <div className={`p-4 rounded ${result.directSignIn.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="font-medium mb-2">
                    {result.directSignIn.success ? 'Başarılı' : 'Başarısız'}
                  </p>
                  {result.directSignIn.error && (
                    <p className="text-red-600">{result.directSignIn.error}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Çevre Değişkenleri:</h3>
                <div className="p-4 rounded bg-gray-50">
                  <p><span className="font-medium">Supabase URL:</span> {result.env.supabaseUrl}</p>
                  <p><span className="font-medium">Anon Key Var mı:</span> {result.env.hasAnonKey ? 'Evet' : 'Hayır'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Ham Veri:</h3>
                <pre className="p-4 bg-gray-50 rounded overflow-x-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 