import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import usePengaturanPresensi from '../../hooks/usePengaturanPresensi';
import { TabBar, AkademikBelumTersambung, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { labelRombel } from '../../db/akademikFields';
import { cariDariKode, sekarangWIB, hitungKeterlambatan, keMenit, kodeSiswa, kodeGuru, guruAktifUntukScan } from '../../db/presensiBarcodeFields';
import { formatRupiah } from '../../db/helpers';
import { upsertPresensiToSheet, upsertPresensiGuruToSheet, isConfigured } from '../../services/googleSheets';

const TABS = [
  { id: 'siswa', label: 'SCAN SISWA' },
  { id: 'guru', label: 'SCAN GURU & STAFF' },
];
const JEDA_SCAN_GANDA_MENIT = 5; // scan ulang < 5 menit setelah masuk dianggap tidak sengaja

// Kamera HP/laptop sbg scanner -- hanya kalau browser punya BarcodeDetector (Chrome Android, dst).
function KameraScanner({ onKode }) {
  const videoRef = useRef(null);
  const [aktif, setAktif] = useState(false);
  const [error, setError] = useState('');
  const tersedia = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!aktif) return undefined;
    let stream; let timer; let batal = false; const terakhir = { kode: '', waktu: 0 };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (batal) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new window.BarcodeDetector({ formats: ['code_128', 'qr_code'] });
        timer = setInterval(async () => {
          try {
            const hasil = await detector.detect(videoRef.current);
            const kode = hasil[0]?.rawValue;
            if (kode && (kode !== terakhir.kode || Date.now() - terakhir.waktu > 3000)) {
              terakhir.kode = kode; terakhir.waktu = Date.now(); onKode(kode);
            }
          } catch { /* frame belum siap */ }
        }, 350);
      } catch (e) { setError('Kamera tidak bisa dibuka: ' + e.message); setAktif(false); }
    })();
    return () => { batal = true; clearInterval(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, [aktif, onKode]);

  if (!tersedia) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <button className="btn btn-sm" onClick={() => setAktif(a => !a)}>{aktif ? 'Matikan kamera' : '📷 Scan pakai kamera'}</button>
      {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
      {aktif && <video ref={videoRef} className="scan-video" muted playsInline />}
    </div>
  );
}

export default function ScanPresensi() {
  const { siswa, guru, presensi, presensiGuru, refreshPresensi, refreshPresensiGuru, toast } = useAppData();
  const { currentUser } = useAuth();
  const { tab, setTab, bolehTab } = useTabAccess('scan-presensi', TABS.map(t => t.id));
  const st = usePengaturanPresensi();
  const [kode, setKode] = useState('');
  const [hasil, setHasil] = useState(null); // { kelas, judul, detail }
  const [cari, setCari] = useState('');
  const [sesi, setSesi] = useState({}); // rekaman scan sesi ini: { 'siswa|nisn' atau 'guru|nama': row }
  const inputRef = useRef(null);
  const antrian = useRef(Promise.resolve());
  const timerRefresh = useRef(null);
  const { tanggal: hariIni } = sekarangWIB();

  useEffect(() => { inputRef.current?.focus(); }, [tab]);

  // Refresh data presensi di belakang layar, 8 dtk setelah scan terakhir (bukan tiap scan).
  const jadwalkanRefresh = useCallback((jenis) => {
    clearTimeout(timerRefresh.current);
    timerRefresh.current = setTimeout(() => (jenis === 'siswa' ? refreshPresensi() : refreshPresensiGuru()), 8000);
  }, [refreshPresensi, refreshPresensiGuru]);
  useEffect(() => () => clearTimeout(timerRefresh.current), []);

  const catatanHariIni = useCallback((jenis, orang) => {
    const key = `${jenis}|${jenis === 'siswa' ? orang.nisn : orang.nama}`;
    if (sesi[key]) return sesi[key];
    const r = jenis === 'siswa' ? presensi.find(p => p.tanggal === hariIni && p.nisn === orang.nisn) : presensiGuru.find(p => p.tanggal === hariIni && p.nama === orang.nama);
    if (!r) return null;
    return { status: r.status, jamMasuk: r.jamMasuk, jamPulang: r.jamPulang, keterangan: r.keterangan, menitTerlambat: r.menitTerlambat, denda: r.denda, metode: r.metode };
  }, [sesi, presensi, presensiGuru, hariIni]);

  const proses = useCallback((raw) => {
    antrian.current = antrian.current.then(async () => {
      if (!isConfigured('akademik')) { setHasil({ kelas: 'gagal', judul: 'Belum tersambung', detail: 'File Sheets Akademik belum tersambung.' }); return; }
      const ketemu = cariDariKode(raw, siswa, guru);
      if (!ketemu) { setHasil({ kelas: 'gagal', judul: 'Kode tidak dikenal', detail: `"${raw}" tidak cocok dengan NISN siswa atau NIP guru mana pun.` }); return; }
      if (ketemu.tipe !== tab) { setHasil({ kelas: 'gagal', judul: 'Salah tab', detail: `Ini kartu ${ketemu.tipe === 'siswa' ? 'siswa' : 'guru/staff'} (${ketemu.data.nama}). Pindah ke tab ${ketemu.tipe === 'siswa' ? 'Scan Siswa' : 'Scan Guru & Staff'}.` }); return; }
      const o = ketemu.data;
      const jenis = ketemu.tipe;
      if (jenis === 'siswa' && o.status !== 'Aktif') { setHasil({ kelas: 'gagal', judul: o.nama, detail: `Berstatus "${o.status}", bukan siswa aktif.` }); return; }
      if (jenis === 'guru' && !guruAktifUntukScan([o]).length) { setHasil({ kelas: 'gagal', judul: o.nama, detail: `Berstatus "${o.status}", bukan pegawai aktif.` }); return; }

      const { tanggal, jam } = sekarangWIB();
      const lama = catatanHariIni(jenis, o);
      let rec; let aksi;
      if (!lama) {
        const { menitTerlambat, denda } = hitungKeterlambatan(jenis, jam, st);
        rec = { status: 'Hadir', jamMasuk: jam, jamPulang: '', keterangan: '', menitTerlambat, denda, metode: 'Barcode' };
        aksi = 'masuk';
      } else if (lama.status !== 'Hadir') {
        setHasil({ kelas: 'gagal', judul: o.nama, detail: `Sudah tercatat "${lama.status}" hari ini. Ubah lewat menu presensi kalau keliru.` }); return;
      } else if (lama.jamPulang) {
        setHasil({ kelas: 'gagal', judul: o.nama, detail: `Presensi hari ini sudah lengkap (masuk ${lama.jamMasuk || '-'}, pulang ${lama.jamPulang}).` }); return;
      } else if (lama.jamMasuk && keMenit(jam) - keMenit(lama.jamMasuk) < JEDA_SCAN_GANDA_MENIT) {
        setHasil({ kelas: 'gagal', judul: o.nama, detail: `Sudah tercatat masuk pukul ${lama.jamMasuk}. Scan pulang bisa dilakukan nanti.` }); return;
      } else {
        rec = { ...lama, jamPulang: jam, metode: lama.metode === 'Barcode' ? 'Barcode' : lama.metode };
        aksi = 'pulang';
      }

      try {
        if (jenis === 'siswa') {
          await upsertPresensiToSheet([{
            Tanggal: tanggal, NISN: o.nisn, 'Nama Siswa': o.nama, Tingkat: o.kelasTingkat, Rombel: o.rombel, Status: 'Hadir',
            'Jam Masuk': rec.jamMasuk, 'Jam Pulang': rec.jamPulang, Metode: rec.metode, 'Menit Terlambat': rec.menitTerlambat || 0, Denda: rec.denda || 0,
            Keterangan: rec.keterangan || '', 'Dicatat Oleh': currentUser.nama,
          }]);
        } else {
          await upsertPresensiGuruToSheet([{
            Tanggal: tanggal, Nama: o.nama, NIP: o.nip || '', Kategori: o.kategori || '', Status: 'Hadir',
            'Jam Masuk': rec.jamMasuk, 'Jam Pulang': rec.jamPulang, Metode: rec.metode, 'Menit Terlambat': rec.menitTerlambat || 0, Denda: rec.denda || 0,
            Keterangan: rec.keterangan || '', 'Dicatat Oleh': currentUser.nama,
          }]);
        }
        const key = `${jenis}|${jenis === 'siswa' ? o.nisn : o.nama}`;
        setSesi(s => ({ ...s, [key]: { ...rec, nama: o.nama, jenis, info: jenis === 'siswa' ? labelRombel(o.kelasTingkat, o.rombel) : (o.kategori || ''), waktu: jam } }));
        jadwalkanRefresh(jenis);
        const pulangAwal = aksi === 'pulang' && keMenit(jam) < keMenit(jenis === 'siswa' ? st.jamPulangSiswa : st.jamPulangGuru);
        setHasil(aksi === 'masuk'
          ? { kelas: rec.menitTerlambat ? 'telat' : 'masuk', judul: `${o.nama} — MASUK ${jam}`, detail: rec.menitTerlambat ? `Terlambat ${rec.menitTerlambat} menit${rec.denda ? ` · denda ${formatRupiah(rec.denda)}` : ''}.` : 'Tepat waktu.' }
          : { kelas: 'pulang', judul: `${o.nama} — PULANG ${jam}`, detail: pulangAwal ? 'Pulang sebelum jam pulang yang ditetapkan.' : `Masuk ${rec.jamMasuk || '-'}.` });
      } catch (err) {
        setHasil({ kelas: 'gagal', judul: 'Gagal menyimpan', detail: err.message });
        toast(err.message, 'error');
      }
    });
  }, [siswa, guru, tab, st, catatanHariIni, currentUser, jadwalkanRefresh, toast]);

  function onSubmit(e) {
    e.preventDefault();
    const k = kode.trim();
    setKode('');
    if (k) proses(k);
    inputRef.current?.focus();
  }

  // Daftar hari ini = data tersimpan + hasil sesi ini (sesi menimpa yg lebih lama).
  const feed = useMemo(() => {
    const map = {};
    if (tab === 'siswa') presensi.filter(p => p.tanggal === hariIni && p.status === 'Hadir').forEach(p => { map[`siswa|${p.nisn}`] = { nama: p.nama, info: labelRombel(p.tingkat, p.rombel), jamMasuk: p.jamMasuk, jamPulang: p.jamPulang, menitTerlambat: p.menitTerlambat, metode: p.metode }; });
    else presensiGuru.filter(p => p.tanggal === hariIni && p.status === 'Hadir').forEach(p => { map[`guru|${p.nama}`] = { nama: p.nama, info: p.kategori, jamMasuk: p.jamMasuk, jamPulang: p.jamPulang, menitTerlambat: p.menitTerlambat, metode: p.metode }; });
    Object.entries(sesi).forEach(([k, v]) => { if (k.startsWith(tab + '|')) map[k] = v; });
    return Object.values(map).sort((a, b) => String(b.jamPulang || b.jamMasuk).localeCompare(String(a.jamPulang || a.jamMasuk)));
  }, [tab, presensi, presensiGuru, sesi, hariIni]);

  const kandidat = useMemo(() => {
    const t = cari.trim().toLowerCase();
    if (t.length < 2) return [];
    const list = tab === 'siswa' ? siswa.filter(s => s.status === 'Aktif' && s.nisn) : guruAktifUntukScan(guru);
    return list.filter(o => `${o.nama} ${o.nisn || o.nip || ''}`.toLowerCase().includes(t)).slice(0, 6);
  }, [cari, tab, siswa, guru]);

  return (
    <Page pageId="scan-presensi" title="Scan Presensi" path="Presensi Barcode / Scan Presensi">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={t => { setTab(t); setHasil(null); }} bolehTab={bolehTab} />
        <div className="card-body">
          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--muted)' }}>
            Arahkan scanner ke kartu, atau ketik kodenya lalu Enter. Scan pertama hari ini = <b>masuk</b>, scan berikutnya = <b>pulang</b>.
            Batas masuk {tab === 'siswa' ? st.batasMasukSiswa : st.batasMasukGuru}, jam pulang {tab === 'siswa' ? st.jamPulangSiswa : st.jamPulangGuru} WIB.
          </p>
          <form className="scan-box" onSubmit={onSubmit}>
            <input ref={inputRef} value={kode} onChange={e => setKode(e.target.value)} autoComplete="off" spellCheck={false}
              placeholder={tab === 'siswa' ? 'Scan kartu siswa…' : 'Scan kartu guru/staff…'} aria-label="Kode kartu" />
            <button type="submit" className="btn btn-primary">Catat</button>
          </form>
          <KameraScanner onKode={proses} />
          {hasil && <div className={`scan-hasil ${hasil.kelas}`} role="status" aria-live="polite"><b>{hasil.judul}</b><br />{hasil.detail}</div>}

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13.5, fontWeight: 700 }}>Kartu tertinggal? Catat lewat pencarian nama</summary>
            <input className="input-cell" style={{ marginTop: 8, maxWidth: 380 }} value={cari} onChange={e => setCari(e.target.value)} placeholder="Ketik minimal 2 huruf nama atau NISN/NIP" />
            {kandidat.map(o => (
              <div key={o.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, fontSize: 13.5 }}>
                <button className="btn btn-sm" onClick={() => { proses(tab === 'siswa' ? kodeSiswa(o) : kodeGuru(o)); setCari(''); }}>Catat</button>
                {o.nama} <span style={{ color: 'var(--muted)' }}>{tab === 'siswa' ? `${o.nisn} · ${labelRombel(o.kelasTingkat, o.rombel)}` : (o.nip || o.kategori)}</span>
              </div>
            ))}
          </details>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Tercatat hadir hari ini ({feed.length})</h3><p>Terbaru di atas. Termasuk yang dicatat manual.</p></div></div>
        <div className="card-body table-scroll">
          {!feed.length ? <Kosong>Belum ada yang tercatat hadir hari ini.</Kosong> : (
            <table>
              <thead><tr><th>Nama</th><th>{tab === 'siswa' ? 'Kelas' : 'Kategori'}</th><th>Masuk</th><th>Pulang</th><th>Keterangan</th></tr></thead>
              <tbody>
                {feed.slice(0, 60).map((f, i) => (
                  <tr key={f.nama + i}>
                    <td><b>{f.nama}</b></td><td>{f.info || '—'}</td><td>{f.jamMasuk || '—'}</td><td>{f.jamPulang || '—'}</td>
                    <td>{f.menitTerlambat ? <span className="badge badge-gold">Terlambat {f.menitTerlambat} mnt</span> : <span className="badge badge-green">Tepat waktu</span>}
                      {f.metode === 'Manual' && <span className="badge badge-muted" style={{ marginLeft: 4 }}>manual</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Page>
  );
}
