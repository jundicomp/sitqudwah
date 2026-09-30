import { useEffect, useState } from 'react';

// Dipakai khusus utk momen klik "Simpan" pada form tambah data (bukan operasi
// bertahap spt Penerbitan SPP). Karena 1 kali simpan itu cuma 1 permintaan HTTP
// (tidak ada progres SUNGGUHAN per-langkah utk dilacak), progress bar di sini
// SENGAJA dianimasikan mendekati 90% dulu (kesan sedang bekerja), baru lompat ke
// 100% begitu server genuinely selesai merespons -- lalu tampil pesan sukses.
export default function SaveProgressModal({ phase }) {
  // phase: 'saving' | 'done'
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase !== 'saving') return;
    setProgress(8);
    const timer = setInterval(() => {
      setProgress(p => (p >= 90 ? 90 : p + Math.random() * 18 + 6));
    }, 140);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') setProgress(100);
  }, [phase]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(18,61,34,.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {phase === 'saving' ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 40px', width: 300, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--green-dark)' }}>Menyimpan...</div>
          <div style={{ height: 12, background: '#EEF2EC', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--green)', transition: 'width .2s ease', borderRadius: 8 }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-dark)' }}>{Math.round(progress)}%</div>
        </div>
      ) : (
        <div style={{
          background: '#CBFF3D',
          borderRadius: 14, padding: '30px 48px', textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,.35)', border: '3px solid #123D22',
        }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#123D22', letterSpacing: .3 }}>✓ Berhasil disimpan</div>
        </div>
      )}
    </div>
  );
}
