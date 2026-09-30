import { useState } from 'react';

// Field tipe "list" -- isian yang bisa ditambah beberapa item (mis. beberapa Tugas
// Tambahan sekaligus: "Kepala Madrasah", "Kaur Kurikulum", dst). Disimpan sbg SATU
// string ke Google Sheets (dipisah "; "), karena sel spreadsheet cuma bisa simpan
// teks tunggal -- tapi tampil di form sbg daftar interaktif, bukan teks mentah.
export default function ListField({ value, onChange, placeholder }) {
  const items = value ? String(value).split(';').map(s => s.trim()).filter(Boolean) : [];
  const [draft, setDraft] = useState('');

  function tambah() {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v].join('; '));
    setDraft('');
  }

  function hapus(idx) {
    onChange(items.filter((_, i) => i !== idx).join('; '));
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); tambah(); } }}
          placeholder={placeholder || 'Ketik lalu tekan Tambah atau Enter'}
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-sm" onClick={tambah}>+ Tambah</button>
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {items.map((item, i) => (
            <span key={i} className="badge badge-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {item}
              <button type="button" onClick={() => hapus(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'var(--red)', fontWeight: 700 }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
