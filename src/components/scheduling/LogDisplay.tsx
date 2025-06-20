'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area'; // Use ScrollArea for potentially long logs
import { Copy } from 'lucide-react';
import { toast } from 'react-toastify';

interface LogDisplayProps {
    logs: string[] | null | undefined;
}

export function LogDisplay({ logs }: LogDisplayProps) {
    if (!logs || logs.length === 0) {
        return <p className="text-sm text-gray-500">Bu çizelge için kaydedilmiş log bulunmuyor.</p>;
    }

    const logText = logs.join('\n');

    const handleCopyLogs = async () => {
        if (!navigator.clipboard) {
            toast.error('Panoya kopyalama bu tarayıcıda desteklenmiyor.');
            return;
        }
        try {
            await navigator.clipboard.writeText(logText);
            toast.success('Loglar panoya kopyalandı!');
        } catch (err) {
            toast.error('Loglar kopyalanırken bir hata oluştu.');
            console.error('Failed to copy logs: ', err);
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={handleCopyLogs}>
                    <Copy size={16} className="mr-1" />
                    Logları Kopyala
                </Button>
            </div>
            <ScrollArea className="h-72 w-full rounded-md border p-4 bg-gray-50">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                    {logText}
                </pre>
            </ScrollArea>
        </div>
    );
} 