import { useState } from 'react';
import { daftarRole, gabungRole } from '../../db/akses';

// v1.61.0: pilih BEBERAPA role utk 1 akun (guru rangkap jabatan). Nilai = teks "A, B".
const WARNA = ['#e3efff:#1d4f9a', '#fff1d6:#8a5a00', '#efe4ff:#5b2c9a', '#dff3e8:#1f6b4a', '#ffe4ec:#9a1d4f', '#e0f4f7:#0f5f6b'];
export const warnaRole = (r, options) => { const [bg, fg] = WARNA[Math.max(0, options.indexOf(r)) % WARNA.length].split(':'); return { background: bg, color: fg }; };

export default function RoleChips({ value, options, onChange, onTambahKategori, onKelola }) {
  const [buka, setBuka] = useState(false);
  const dipilih = daftarRole(value || '');
  const sisa = options.filter(o => !dipilih.includes(o));
  const lepas = (r) => onChange(gabungRole(dipilih.filter(x => x !== r)));
  const tambah = (r) => { onChange(gabungRole([...dipilih, r])); setBuka(false); };
  return (
    <div className="role-chips">
      <div className="role-chips-box">
        {dipilih.map(r => (
          <span key={r} className="role-chip" style={warnaRole(r, options)}>
            {r}{!options.includes(r) && <small title="Kategori ini sudah tidak ada di daftar"> ⚠</small>}
            <button type="button" onClick={() => lepas(r)} aria-label={`Lepas role ${r}`} title="Lepas role">✕</button>
          </span>
        ))}
        {!dipilih.length && <span className="role-chips-kosong">Belum ada role</span>}
        <button type="button" className="role-chips-tambah" onClick={() => setBuka(b => !b)} aria-expanded={buka}>＋ tambah role</button>
      </div>
      {buka && (
        <div className="role-chips-menu" role="listbox">
          {sisa.map(o => <button type="button" key={o} role="option" aria-selected="false" onClick={() => tambah(o)}><i style={{ background: warnaRole(o, options).color }} />{o}</button>)}
          {!sisa.length && <div className="role-chips-info">Semua role sudah dipasang.</div>}
          {(onTambahKategori || onKelola) && <hr />}
          {onTambahKategori && <button type="button" onClick={() => { setBuka(false); onTambahKategori(r => r && tambah(r)); }}>+ Tambah kategori baru…</button>}
          {onKelola && <button type="button" onClick={() => { setBuka(false); onKelola(); }}>✎ Edit / hapus kategori…</button>}
        </div>
      )}
      {dipilih.length > 1 && <div className="role-chips-info">Menu yang terbuka = gabungan semua role di atas.</div>}
    </div>
  );
}
