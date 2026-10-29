import { useEffect, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SKALA_PREDIKAT_BAWAAN, rentangPredikat, badgePredikat } from '../../db/akademikFields';
import { simpanSkalaPredikatKeSheet, addLogEntry, isConfigured } from '../../services/googleSheets';

const salin = (list) => list.map(x => ({ huruf: x.huruf, min: String(x.min), keterangan: x.keterangan || '' }));

// Skala predikat (huruf mutu) yg dipakai Nilai, Rapor, Laporan Siswa, Grafik & Export.
// Cukup huruf + nilai minimal; batas atas otomatis = nilai minimal huruf di atasnya.
export default function SkalaPredikatTab() {
  const { skalaPredikat, skalaPredikatDariSheets, refreshSkalaPredikat, toast } = useAppData();
  const { currentUser } = useAuth();
  const [draft, setDraft] = useState(() => salin(skalaPredikat));
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const jejak = JSON.stringify(skalaPredikat);
  useEffect(() => { if (!berubah) setDraft(salin(skalaPredikat)); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps

  const ubah = (i, patch) => { setDraft(d => d.map((x, k) => (k === i ? { ...x, ...patch } : x))); setBerubah(true); };

  // Pratinjau rentang dari baris yg sudah valid, urut dari nilai minimal tertinggi.
  const valid = draft.map((x, i) => ({ ...x, i, minN: Number(String(x.min).replace(',', '.')) }))
    .filter(x => x.huruf.trim() && x.min !== '' && Number.isFinite(x.minN));
  const urut = [...valid].sort((a, b) => b.minN - a.minN);
  const rentangDari = {};
  urut.forEach((x, k) => { rentangDari[x.i] = rentangPredikat(urut.map(u => ({ ...u, min: u.minN })), k); });

  function validasi() {
    const huruf = new Set(); const min = new Set();
    for (const x of draft) {
      const h = x.huruf.trim();
      if (!h) return 'Huruf mutu tidak boleh kosong.';
      if (huruf.has(h.toLowerCase())) return `Huruf "${h}" ada dua kali.`;
      huruf.add(h.toLowerCase());
      const n = Number(String(x.min).replace(',', '.'));
      if (x.min === '' || !Number.isFinite(n) || n < 0 || n > 100) return `Nilai minimal huruf "${h}" harus angka 0–100.`;
      if (min.has(n)) return `Nilai minimal ${n} dipakai dua huruf.`;
      min.add(n);
    }
    if (!draft.length) return 'Minimal harus ada satu huruf.';
    if (!min.has(0)) return 'Huruf paling bawah harus punya nilai minimal 0, supaya semua nilai dapat predikat.';
    return null;
  }

  async function simpan() {
    const err = validasi();
    if (err) { toast(err, 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      const baris = [...draft].sort((a, b) => Number(b.min) - Number(a.min))
        .map((x, i) => ({ No: i + 1, Huruf: x.huruf.trim(), 'Nilai Minimal': Number(String(x.min).replace(',', '.')), Keterangan: x.keterangan.trim() }));
      await simpanSkalaPredikatKeSheet(baris);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Skala Predikat', modul: 'Kurikulum & KKM', detail: baris.map(b => `${b.Huruf} ≥ ${b['Nilai Minimal']}`).join(', ') });
      setBerubah(false);
      await refreshSkalaPredikat();
      toast('Skala predikat tersimpan. Nilai, rapor, dan laporan langsung memakai skala baru.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "skalaPredikat" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Skala predikat (huruf mutu)</h3>
        <p>Dipakai untuk predikat di Nilai, Rapor, Laporan Siswa, Grafik Nilai, dan Export. Cukup isi huruf dan nilai minimalnya — batas atas otomatis mengikuti huruf di atasnya. Nilai tepat di batas ikut huruf itu (mis. 80 = A-).</p></div></div>
      <div className="card-body">
        {!skalaPredikatDariSheets && <p style={{ margin: '0 0 12px', fontSize: 13.5, background: 'var(--gold-soft)', padding: '8px 12px', borderRadius: 8 }}>Sekolah belum menyimpan skalanya sendiri — saat ini memakai skala bawaan (A sampai E). Sesuaikan lalu klik Simpan.</p>}
        <div className="table-scroll">
          <table>
            <thead><tr><th style={{ width: 110 }}>Huruf mutu</th><th style={{ width: 130 }}>Nilai minimal</th><th>Rentang nilai angka</th><th>Keterangan</th><th style={{ width: 70 }}></th></tr></thead>
            <tbody>
              {draft.map((x, i) => (
                <tr key={i}>
                  <td><input className="input-cell" value={x.huruf} onChange={e => ubah(i, { huruf: e.target.value })} placeholder="mis. A-" style={{ width: 80 }} aria-label="Huruf mutu" /></td>
                  <td><input className="input-cell" type="number" min="0" max="100" step="0.5" value={x.min} onChange={e => ubah(i, { min: e.target.value })} style={{ width: 90 }} aria-label={`Nilai minimal ${x.huruf}`} /></td>
                  <td>{rentangDari[i] ? <span className={`badge ${badgePredikat(x.huruf.trim())}`}>{rentangDari[i]}</span> : '—'}</td>
                  <td><input className="input-cell" value={x.keterangan} onChange={e => ubah(i, { keterangan: e.target.value })} placeholder="mis. Sangat Baik" aria-label={`Keterangan ${x.huruf}`} /></td>
                  <td><button className="btn btn-sm" onClick={() => { setDraft(d => d.filter((_, k) => k !== i)); setBerubah(true); }}>Hapus</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => { setDraft(d => [...d, { huruf: '', min: '', keterangan: '' }]); setBerubah(true); }}>+ Tambah huruf</button>
          <button className="btn" onClick={() => { setDraft(salin(SKALA_PREDIKAT_BAWAAN)); setBerubah(true); }}>Pakai skala bawaan</button>
        </div>
        <div className="save-bar">
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Urutan baris otomatis disusun dari nilai minimal tertinggi saat disimpan.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {berubah && <button className="btn" onClick={() => { setDraft(salin(skalaPredikat)); setBerubah(false); }}>Batalkan</button>}
            <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || (!berubah && skalaPredikatDariSheets)}>{menyimpan ? 'Menyimpan…' : 'Simpan skala'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
