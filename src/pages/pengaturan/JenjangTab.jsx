import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SEMUA_JENJANG, TEMPLATE_JENJANG, jenjangDariSheets, namaTingkat } from '../../config/jenjang';
import { simpanJenjangKeSheet, addLogEntry, isConfigured } from '../../services/googleSheets';

const salin = (list) => list.map(j => ({ ...j, tingkat: [...j.tingkat], aktif: j.aktif !== false }));
const KOSONG = { kode: '', nama: '', tingkat: [], aktif: true };

function ChipInput({ onTambah }) {
  const [v, setV] = useState('');
  function kirim() {
    // Boleh sekaligus banyak: "1, 2, 3" atau "TK A, TK B"
    const daftar = v.split(',').map(x => x.trim()).filter(Boolean);
    if (daftar.length) onTambah(daftar);
    setV('');
  }
  return (
    <input className="chip-input" value={v} placeholder="+ tingkat, Enter" aria-label="Tambah tingkat"
      onChange={e => setV(e.target.value)} onBlur={kirim}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); kirim(); } }} />
  );
}

export default function JenjangTab() {
  const { kelas, siswa, refreshJenjang, toast } = useAppData();
  const { currentUser } = useAuth();
  const [draft, setDraft] = useState(() => salin(SEMUA_JENJANG));
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const tersimpan = jenjangDariSheets();

  // Muat ulang draft kalau data dari Sheets berubah & admin tidak sedang mengedit.
  const jejak = JSON.stringify(SEMUA_JENJANG);
  useEffect(() => { if (!berubah) setDraft(salin(SEMUA_JENJANG)); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pemakaian tiap tingkat -- utk ditampilkan & utk mencegah tingkat terpakai dihapus.
  const pakai = useMemo(() => {
    const m = {};
    kelas.forEach(k => { const t = String(k.tingkat); (m[t] ||= { kelas: 0, siswa: 0 }).kelas++; });
    siswa.filter(s => s.status === 'Aktif').forEach(s => { const t = String(s.kelasTingkat); if (t) (m[t] ||= { kelas: 0, siswa: 0 }).siswa++; });
    return m;
  }, [kelas, siswa]);

  const ubah = (i, patch) => { setDraft(d => d.map((j, k) => (k === i ? { ...j, ...patch } : j))); setBerubah(true); };
  const geser = (i, n) => { setDraft(d => { const a = [...d]; const j = i + n; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; }); setBerubah(true); };
  const hapus = (i) => { setDraft(d => d.filter((_, k) => k !== i)); setBerubah(true); };
  const tambah = (tpl) => { setDraft(d => [...d, { ...KOSONG, ...(tpl ? { kode: tpl.kode, nama: tpl.nama, tingkat: [...tpl.tingkat] } : {}) }]); setBerubah(true); };
  const tambahTingkat = (i, list) => ubah(i, { tingkat: [...draft[i].tingkat, ...list.filter(t => !draft[i].tingkat.includes(t))] });
  const hapusTingkat = (i, t) => ubah(i, { tingkat: draft[i].tingkat.filter(x => x !== t) });
  const geserTingkat = (i, idx, n) => { const a = [...draft[i].tingkat]; const j = idx + n; if (j < 0 || j >= a.length) return; [a[idx], a[j]] = [a[j], a[idx]]; ubah(i, { tingkat: a }); };

  function validasi() {
    const kode = new Set(); const tingkat = new Map();
    for (const j of draft) {
      const k = j.kode.trim();
      if (!k) return 'Setiap jenjang wajib punya Kode (mis. SD).';
      if (!/^[\w.-]+$/.test(k)) return `Kode "${k}" hanya boleh huruf, angka, titik, atau strip (tanpa spasi).`;
      if (kode.has(k.toLowerCase())) return `Kode jenjang "${k}" dipakai dua kali.`;
      kode.add(k.toLowerCase());
      if (!j.tingkat.length) return `Jenjang ${k} belum punya tingkat.`;
      for (const t of j.tingkat) {
        if (/,/.test(t)) return `Nama tingkat "${t}" tidak boleh mengandung koma.`;
        if (tingkat.has(t)) return `Tingkat "${t}" ada di dua jenjang (${tingkat.get(t)} dan ${k}). Bedakan namanya, mis. "MTs 7".`;
        tingkat.set(t, k);
      }
    }
    if (!draft.some(j => j.aktif)) return 'Minimal satu jenjang harus aktif.';
    // Tingkat yg masih dipakai kelas/siswa tidak boleh hilang dari daftar.
    const hilang = Object.keys(pakai).filter(t => !tingkat.has(t));
    if (hilang.length) return `Tingkat ${hilang.map(t => `"${t}" (${pakai[t].kelas} kelas, ${pakai[t].siswa} siswa)`).join(', ')} masih dipakai. Pindahkan dulu kelas/siswanya sebelum menghapus tingkat ini.`;
    return null;
  }

  async function simpan() {
    const err = validasi();
    if (err) { toast(err, 'error'); return; }
    if (!isConfigured('master')) { toast('Data Induk belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      await simpanJenjangKeSheet(draft.map((j, i) => ({ No: i + 1, Kode: j.kode.trim(), Nama: j.nama.trim() || j.kode.trim(), Tingkat: j.tingkat.join(', '), Aktif: j.aktif ? 'Ya' : 'Tidak' })));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Jenjang', modul: 'Data Kelas & Rombel', detail: draft.map(j => `${j.kode}${j.aktif ? '' : ' (nonaktif)'}: ${j.tingkat.join('/')}`).join('; ') });
      setBerubah(false);
      await refreshJenjang();
      toast('Jenjang & tingkat tersimpan. Semua pilihan kelas di aplikasi sudah ikut diperbarui.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Data Induk belum diperbarui (tab "jenjang" belum dikenal). Tempel ulang Code.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  const templateBelumAda = TEMPLATE_JENJANG.filter(t => !draft.some(j => j.kode.toLowerCase() === t.kode.toLowerCase()));

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Jenjang &amp; tingkat kelas</h3>
          <p>Menentukan pilihan tingkat di Data Kelas, Data Siswa, Tarif, KKM, Bank Soal, Kalender, dan Pengumuman. Urutan di sini = urutan tampil & urutan kenaikan kelas; tingkat terakhir tiap jenjang disarankan Lulus.</p></div>
      </div>
      <div className="card-body">
        {!tersimpan && <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--gold-dark, #8a6100)', background: 'var(--gold-soft)', padding: '8px 12px', borderRadius: 8 }}>Sekolah belum menyimpan daftar jenjangnya sendiri — saat ini memakai bawaan (TK, SD, SMP, SMA). Sesuaikan lalu klik Simpan.</p>}

        {draft.map((j, i) => (
          <div key={i} className={`jenjang-card${j.aktif ? '' : ' nonaktif'}`}>
            <div className="jenjang-head">
              <div className="field"><label>Kode</label><input value={j.kode} placeholder="mis. SD" onChange={e => ubah(i, { kode: e.target.value })} style={{ width: 110 }} /></div>
              <div className="field" style={{ flex: '1 1 200px' }}><label>Nama jenjang</label><input value={j.nama} placeholder="mis. Sekolah Dasar" onChange={e => ubah(i, { nama: e.target.value })} /></div>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, paddingBottom: 8 }}>
                <input type="checkbox" checked={j.aktif} onChange={e => ubah(i, { aktif: e.target.checked })} /> Aktif
              </label>
              <div style={{ display: 'flex', gap: 4, paddingBottom: 4 }}>
                <button className="btn btn-sm" onClick={() => geser(i, -1)} disabled={i === 0} aria-label="Naikkan urutan">▲</button>
                <button className="btn btn-sm" onClick={() => geser(i, 1)} disabled={i === draft.length - 1} aria-label="Turunkan urutan">▼</button>
                <button className="btn btn-sm" onClick={() => hapus(i)} aria-label={`Hapus jenjang ${j.kode}`}>Hapus</button>
              </div>
            </div>
            <div className="chip-list">
              {j.tingkat.map((t, idx) => (
                <span key={t} className="chip" title={`Tampil sbg "${namaTingkat(t)}"`}>
                  {idx > 0 && <button onClick={() => geserTingkat(i, idx, -1)} aria-label={`Geser ${t} ke kiri`} style={{ background: 'none' }}>‹</button>}
                  {t}{pakai[t] && <small>{pakai[t].kelas} kls · {pakai[t].siswa} sw</small>}
                  <button onClick={() => hapusTingkat(i, t)} aria-label={`Hapus tingkat ${t}`}>×</button>
                </span>
              ))}
              <ChipInput onTambah={list => tambahTingkat(i, list)} />
            </div>
          </div>
        ))}

        <div className="ringkas-bar" style={{ marginTop: 4 }}>
          <button className="btn" onClick={() => tambah(null)}>+ Tambah jenjang</button>
          {templateBelumAda.length > 0 && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>atau cepat:</span>}
          {templateBelumAda.map(t => <button key={t.kode} className="btn btn-sm" onClick={() => tambah(t)}>+ {t.kode}</button>)}
        </div>

        <div className="save-bar">
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Angka polos (7) tampil sebagai "Kelas 7"; nama lain (TK A, KB) tampil apa adanya. Nama tingkat yang sudah dipakai sebaiknya tidak diganti.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {berubah && <button className="btn" onClick={() => { setDraft(salin(SEMUA_JENJANG)); setBerubah(false); }}>Batalkan</button>}
            <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || (!berubah && tersimpan)}>{menyimpan ? 'Menyimpan…' : tersimpan ? 'Simpan perubahan' : 'Simpan daftar jenjang'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
