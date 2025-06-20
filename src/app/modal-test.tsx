import { useState } from 'react';

export default function ModalTest() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)} style={{padding: '8px 16px', background: '#6366f1', color: 'white', borderRadius: 4}}>Aç</button>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-8 rounded shadow">
            <h1>Modal Açıldı!</h1>
            <button onClick={() => setOpen(false)} style={{marginTop: 16, padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: 4}}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
} 