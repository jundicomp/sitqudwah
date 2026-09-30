import { useState } from 'react';

// Field tipe "image" -- upload foto, otomatis di-resize+kompresi lewat Canvas
// SEBELUM disimpan sbg base64 (bukan file asli) -- karena 1 sel Google Sheets
// cuma bisa menampung ~50.000 karakter. Target akhir base64 < 40.000 karakter.
const MAX_DIMENSI = 480; // px, sisi terpanjang
const MAX_BASE64_LEN = 40000;

export default function ImageField({ value, onChange, label }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSI || height > MAX_DIMENSI) {
          const skala = MAX_DIMENSI / Math.max(width, height);
          width = Math.round(width * skala);
          height = Math.round(height * skala);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        // Coba beberapa level kualitas JPEG turun bertahap sampai muat di batas ukuran.
        let kualitas = 0.75;
        let dataUrl = canvas.toDataURL('image/jpeg', kualitas);
        while (dataUrl.length > MAX_BASE64_LEN && kualitas > 0.25) {
          kualitas -= 0.15;
          dataUrl = canvas.toDataURL('image/jpeg', kualitas);
        }

        setLoading(false);
        if (dataUrl.length > MAX_BASE64_LEN) {
          setError('Gambar masih terlalu besar setelah dikompresi maksimal. Coba pakai foto lain.');
          return;
        }
        onChange(dataUrl);
      };
      img.onerror = () => { setLoading(false); setError('File bukan gambar yang valid.'); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFile} />
      {loading && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Memproses gambar...</p>}
      {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{error}</p>}
      {value && !loading && (
        <div style={{ marginTop: 8 }}>
          <img src={value} alt={label || 'Preview'} style={{ maxWidth: 150, maxHeight: 150, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }} />
          <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => onChange('')}>Hapus Foto</button>
        </div>
      )}
    </div>
  );
}
