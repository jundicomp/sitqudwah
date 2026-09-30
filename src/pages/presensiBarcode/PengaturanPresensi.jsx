import { useEffect, useState } from 'react';
import Page from '../../components/layout/Page';
import usePengaturanPresensi from '../../hooks/usePengaturanPresensi';
import { AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { LABEL_PENGATURAN, PENGATURAN_DEFAULT, hitungKeterlambatan, keMenit } from '../../db/presensiBarcodeFields';
import { formatRupiah } from '../../db/helpers';
import { upsertPengaturanPresensiToSheet, addLogEntry, isConfigured } from '../../services/googleSheets';

const GRUP = [
  { judul: 'Siswa', kunci: ['jamMasukSiswa', 'batasMasukSiswa', 'jamPulangSiswa'] },
  { judul: 'Guru & Staff', kunci: ['jamMasukGuru', 'batasMasukGuru', 'jamPulangGuru'] },
  { judul: 'Denda keterlambatan', kunci: ['satuanMenitDenda', 'nilaiDenda', 'perkalianDenda'] },
];
const JAM = (k) => k.startsWith('jam') || k.startsWith('batas');

export default function PengaturanPresensi() {
  const { refreshPengaturanPresensi, toast } = useAppData();
  const { currentUser } = useAuth();
  const tersimpan = usePengaturanPresensi();
  const [form, setForm] = useState(tersimpan);
  const [menyimpan, setMenyimpan] = useState(false);
  useEffect(() => { setForm(tersimpan); }, [tersimpan]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const berubah = Object.keys(PENGATURAN_DEFAULT).some(k => String(form[k]) !== String(tersimpan[k]));

  function validasi() {
    for (const j of ['Siswa', 'Guru']) {
      if (keMenit(form[`batasMasuk${j}`]) < keMenit(form[`jamMasuk${j}`])) return `Batas toleransi ${j.toLowerCase()} tidak boleh sebelum jam masuk.`;
      if (keMenit(form[`jamPulang${j}`]) <= keMenit(form[`jamMasuk${j}`])) return `Jam pulang ${j.toLowerCase()} harus setelah jam masuk.`;
    }
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
      await upsertPengaturanPresensiToSheet(Object.keys(PENGATURAN_DEFAULT).map(k => ({ Kunci: k, Nilai: String(form[k]) })));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Pengaturan', modul: 'Pengaturan Presensi', detail: Object.keys(PENGATURAN_DEFAULT).map(k => `${k}=${form[k]}`).join(', ') });
      await refreshPengaturanPresensi();
      toast('Pengaturan presensi tersimpan.');
    } catch (e) { toast(e.message, 'error'); } finally { setMenyimpan(false); }
  }

  const contoh = [10, 20, 40].map(m => {
    const jam = `${String(Math.floor((keMenit(form.batasMasukSiswa) + m) / 60)).padStart(2, '0')}:${String((keMenit(form.batasMasukSiswa) + m) % 60).padStart(2, '0')}`;
    return { jam, ...hitungKeterlambatan('siswa', jam, form) };
  });

  return (
    <Page pageId="pengaturan-presensi" title="Pengaturan Presensi" path="Presensi Barcode / Pengaturan Presensi">
      <AkademikBelumTersambung />
      <div className="card">
        <div className="card-head"><div><h3>Jam presensi &amp; denda</h3><p>Dipakai Scan Presensi untuk menentukan terlambat, pulang awal, dan besaran denda. Semua jam dalam WIB.</p></div></div>
        <div className="card-body">
          {GRUP.map(g => (
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
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 6px' }}>
            Rumus: kelipatan {form.satuanMenitDenda} menit keterlambatan (dibulatkan ke atas) × {formatRupiah(Number(form.nilaiDenda) || 0)} × {form.perkalianDenda}. Contoh untuk siswa:
          </p>
          <div className="ringkas-bar">{contoh.map(c => <span key={c.jam} className="badge badge-muted">Masuk {c.jam} → terlambat {c.menitTerlambat} mnt, denda {formatRupiah(c.denda)}</span>)}</div>
          <div className="save-bar">
            <button className="btn" onClick={() => setForm(PENGATURAN_DEFAULT)}>Kembalikan ke bawaan</button>
            <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !berubah}>{menyimpan ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
          </div>
        </div>
      </div>
    </Page>
  );
}
