import { useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { perbaikiNomorSemua, addLogEntry } from '../../services/googleSheets';

// Kumpulan No yg kembar/kosong di baris tabel.
export function nomorBermasalah(rows) {
  const hitung = {};
  rows.forEach(r => { const k = String(r['No'] ?? '').trim(); hitung[k] = (hitung[k] || 0) + 1; });
  return new Set(Object.keys(hitung).filter(k => k === '' || hitung[k] > 1));
}

export default function BannerNomorGanda({ rows, target = 'master', onFixed }) {
  const { toast } = useAppData();
  const { currentUser } = useAuth();
  const [proses, setProses] = useState(false);
  const bermasalah = nomorBermasalah(rows);
  if (!bermasalah.size) return null;
  const jumlahBaris = rows.filter(r => bermasalah.has(String(r['No'] ?? '').trim())).length;
  async function perbaiki() {
    setProses(true);
    try {
      const hasil = await perbaikiNomorSemua(target);
      const total = Object.values(hasil).reduce((a, b) => a + b, 0);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Perbaiki Nomor Ganda', modul: 'Sistem', detail: Object.entries(hasil).map(([k, n]) => `${k}: ${n}`).join(', ') || 'tidak ada' });
      toast(total ? `${total} baris diberi nomor baru.` : 'Tidak ada nomor ganda.');
      onFixed && onFixed();
    } catch (e) { toast(e.message, 'error'); } finally { setProses(false); }
  }
  return (
    <div className="banner-info" style={{ background: 'var(--gold-soft)', color: '#6E4B00' }}>
      <span><b>{jumlahBaris} baris punya nomor (No) yang sama atau kosong di Google Sheets</b> (No {[...bermasalah].map(n => n || 'kosong').join(', ')}). Akibatnya baris bisa tampil dobel, dan edit/hapus bisa mengenai baris yang salah — jadi tombol edit &amp; hapus untuk baris itu dimatikan dulu. Klik perbaiki untuk memberi nomor baru; isi data tidak berubah.</span>
      <button className="btn btn-sm btn-primary" onClick={perbaiki} disabled={proses}>{proses ? 'Memperbaiki…' : 'Perbaiki nomor'}</button>
    </div>
  );
}
