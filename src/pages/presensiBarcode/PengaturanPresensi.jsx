import { useEffect, useState } from 'react';
import Page from '../../components/layout/Page';
import usePengaturanPresensi from '../../hooks/usePengaturanPresensi';
import { AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { LABEL_PENGATURAN, PENGATURAN_DEFAULT, hitungKeterlambatan, keMenit } from '../../db/presensiBarcodeFields';
import { formatRupiah } from '../../db/helpers';
import { upsertPengaturanPresensiToSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { pageIdPresensi, pathPresensi } from './jenisPresensi';

// v1.62.0: halaman ini dipakai 2 sub-modul. Siswa: jam saja (tanpa denda). Guru & staff: jam + denda.
const GRUP = {
  siswa: [{ judul: 'Jam presensi siswa', kunci: ['jamMasukSiswa', 'batasMasukSiswa', 'jamPulangSiswa'] }],
  guru: [
    { judul: 'Jam presensi guru & staff', kunci: ['jamMasukGuru', 'batasMasukGuru', 'jamPulangGuru'] },
    { judul: 'Denda keterlambatan', kunci: ['satuanMenitDenda', 'nilaiDenda', 'perkalianDenda'] },
  ],
};
const JAM = (k) => k.startsWith('jam') || k.startsWith('batas');

export default function PengaturanPresensi({ jenis = 'siswa' }) {
  const S = jenis === 'siswa';
  const KUNCI = GRUP[jenis].flatMap(g => g.kunci);
  const { refreshPengaturanPresensi, toast } = useAppData();
  const { currentUser } = useAuth();
  const tersimpan = usePengaturanPresensi();
  const [form, setForm] = useState(tersimpan);
  const [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => { setForm(tersimpan); }, [tersimpan]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const berubah = KUNCI.some(k => String(form[k]) !== String(tersimpan[k]));

  function validasi() {
    for (const j of [S ? 'Siswa' : 'Guru']) {
      if (keMenit(form[`batasMasuk${j}`]) < keMenit(form[`jamMasuk${j}`])) return `Batas toleransi ${j.toLowerCase()} tidak boleh sebelum jam masuk.`;
      if (keMenit(form[`jamPulang${j}`]) <= keMenit(form[`jamMasuk${j}`])) return `Jam pulang ${j.toLowerCase()} harus setelah jam masuk.`;
    }
    if (S) return null;
    if (!(Number(form.satuanMenitDenda) >= 1)) return 'Satuan keterlambatan minimal 1 menit.';
    if (Number(form.nilaiDenda) < 0 || Number(form.perkalianDenda) < 0) return 'Denda dan pengali tidak boleh negatif.';
    return null;
  }

  async function simpan() {
    const err = validasi();
    if (err) { toast(err, 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      await upsertPengaturanPresensiToSheet(KUNCI.map(k => ({ Kunci: k, Nilai: String(form[k]) })));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Pengaturan', modul: `Pengaturan Presensi ${S ? 'Siswa' : 'Guru & Staff'}`, detail: KUNCI.map(k => `${k}=${form[k]}`).join(', ') });
      await refreshPengaturanPresensi();
      toast('Pengaturan presensi tersimpan.');
    } catch (e) { toast(e.message, 'error'); } finally { setMenyimpan(false); }
  }

  const contoh = [10, 20, 40].map(m => {
    const jam = `${String(Math.floor((keMenit(form.batasMasukGuru) + m) / 60)).padStart(2, '0')}:${String((keMenit(form.batasMasukGuru) + m) % 60).padStart(2, '0')}`;
    return { jam, ...hitungKeterlambatan('guru', jam, form) };
  });

  return (
    <Page pageId={pageIdPresensi('pengaturan-presensi', jenis)} title={`Pengaturan Presensi ${S ? 'Siswa' : 'Guru & Staff'}`} path={pathPresensi(jenis, 'Pengaturan Jam')}>
      <AkademikBelumTersambung />
      <div className="card">
        <div className="card-head"><div><h3>{S ? 'Jam presensi siswa' : 'Jam presensi & denda guru dan staff'}</h3><p>{S ? 'Dipakai Scan Presensi Siswa untuk menentukan terlambat dan pulang awal. Siswa tidak dikenai denda.' : 'Dipakai Scan Presensi Guru & Staff untuk menentukan terlambat, pulang awal, dan besaran denda.'} Semua jam dalam WIB.</p></div></div>
        <div className="card-body">
          {GRUP[jenis].map(g => (
            <div key={g.judul} style={{ marginBottom: 18 }}>
              <h4 style={{ margin: '0 0 8px', color: 'var(--green-dark)' }}>{g.judul}</h4>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
                {g.kunci.map(k => (
                  <div key={k} className="field"><label>{LABEL_PENGATURAN[k]}</label>
                    <input type={JAM(k) ? 'time' : 'number'} min={JAM(k) ? undefined : 0} value={form[k]} onChange={e => set(k, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!S && <><p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 6px' }}>
            Rumus: kelipatan {form.satuanMenitDenda} menit keterlambatan (dibulatkan ke atas) × {formatRupiah(Number(form.nilaiDenda) || 0)} × {form.perkalianDenda}. Contoh:
          </p>
          <div className="ringkas-bar">{contoh.map(c => <span key={c.jam} className="badge badge-muted">Masuk {c.jam} → terlambat {c.menitTerlambat} mnt, denda {formatRupiah(c.denda)}</span>)}</div></>}
          <div className="save-bar">
            <button className="btn" onClick={() => setForm(f => ({ ...f, ...Object.fromEntries(KUNCI.map(k => [k, PENGATURAN_DEFAULT[k]])) }))}>Kembalikan ke bawaan</button>
            <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !berubah}>{menyimpan ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
          </div>
        </div>
      </div>
    </Page>
  );
}
