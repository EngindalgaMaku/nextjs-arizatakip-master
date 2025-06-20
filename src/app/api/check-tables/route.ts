import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Tablo bilgisi için tip tanımı
interface TableInfo {
  exists: boolean;
  error: string | null;
  hasData: boolean | null;
  rowCount?: number;
}

export async function GET() {
  try {
    // Kontrol edilecek tablolar
    const tablesToCheck = ['settings', 'issues', 'users'];
    const results: Record<string, TableInfo> = {};

    // Her tablonun varlığını kontrol edelim
    for (const table of tablesToCheck) {
      try {
        // Tablodan bir satır almaya çalışalım (limit 1)
        const { data, error } = await supabase
          .from(table as any)
          .select('*')
          .limit(1);

        results[table] = {
          exists: !error,
          error: error ? error.message : null,
          hasData: data && data.length > 0,
          rowCount: data ? data.length : 0
        };
      } catch (err) {
        results[table] = {
          exists: false,
          error: err instanceof Error ? err.message : String(err),
          hasData: null,
          rowCount: 0
        };
      }
    }

    return NextResponse.json({
      success: true,
      tables: results,
      message: 'Tablo durumları kontrol edildi'
    });
  } catch (err) {
    console.error('Tablolar kontrol edilirken hata:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
} 