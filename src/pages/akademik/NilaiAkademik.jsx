import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  MAPEL_OPTIONS, mapelUntukTingkat, SEMESTER_OPTIONS, JENIS_NILAI_OPTIONS, NILAI_HEADERS,
  siswaDiRombel, semesterDariTanggal, predikatNilai, badgePredikat, PREDIKAT_LABEL, getSkalaPredikat,
} from '../../db/akademikFields';
import { todayWIB } from '../../db/helpers';
import { formatRaporTingkat } from '../../config/jenjang';
import {
  upsertNilaiToSheet, fetchNilaiFromSheet, updateNilaiInSheet, deleteNilaiFromSheet, addLogEntry, isConfigured,
} from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';
import { buatLookupKkm } from '../../db/akademikLanjutanFields';

const TABS = [
  { id: 'input', label: 'INPUT NILAI' },
  { id: 'rekap', label: 'REKAP NILAI' },
  { id: 'tabel', label: 'DATA NILAI' },
  { id: 'mapel', label: 'PER MAPEL' },
];
const EDIT_FIELDS = [
  { key: 'Nilai', label: 'Nilai (0–100)', type: 'number', required: true },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];

const nilaiValid = (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100);
const rata = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

function useFilterPeriode(preset) {
  const { tahunAjaranOptions, taAktif, rombelList: semuaRombel } = useAkademikOptions();
  // Kelas berformat PAUD dinilai lewat menu Penilaian PAUD, bukan nilai angka per mapel.
  const rombelList = useMemo(() => semuaRombel.filter(r => formatRaporTingkat(r.tingkat) !== 'PAUD'), [semuaRombel]);
  const [ta, setTa] = useState(preset?.ta || '');
  const [semester, setSemester] = useState(preset?.semester || semesterDariTanggal());
  const [rombelKey, setRombelKey] = useState(preset?.rombelKey || '');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { if (!rombelKey && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey]);
  const rombel = rombelList.find(r => r.key === rombelKey);
  return { ta, setTa, semester, setSemester, rombelKey, setRombelKey, rombel, rombelList, tahunAjaranOptions };
}

// ---------------------------------------------------------------------------
function InputNilai({ preset }) {
  const { siswa, nilai, nilaiLoaded, jadwal, refreshNilai, toast, mapelList } = useAppData();
  const { currentUser } = useAuth();
  const { guruOptions } = useAkademikOptions();
  const f = useFilterPeriode(preset);
  const [mapel, setMapel] = useState(preset?.mapel || MAPEL_OPTIONS[0]);
  // Pilihan mapel mengikuti jenjang kelas yg dipilih (Kurikulum & KKM › Mata Pelajaran).
  const mapelKelas = useMemo(() => (f.rombel ? mapelUntukTingkat(f.rombel.tingkat) : MAPEL_OPTIONS), [f.rombel, mapelList]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (mapelKelas.length && !mapelKelas.includes(mapel)) setMapel(mapelKelas[0]); }, [mapelKelas, mapel]);
  const [jenis, setJenis] = useState(preset?.jenis || 'Harian');
  const [tanggal, setTanggal] = useState(preset?.tanggal || todayWIB());
  const [guru, setGuru] = useState('');
  const [isian, setIsian] = useState({});
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  const daftar = useMemo(() => f.rombel ? siswaDiRombel(siswa, f.rombel.tingkat, f.rombel.rombel) : [], [siswa, f.rombel]);
  const daftarKey = daftar.map(s => s.nisn || s.id).join(',');

  // Guru default = pengajar mapel ini di rombel ini menurut Jadwal Pelajaran.
  useEffect(() => {
    if (!f.rombel) return;
    const j = jadwal.find(x => x.tahunAjaran === f.ta && x.semester === f.semester && x.tingkat === f.rombel.tingkat && x.rombel === f.rombel.rombel && x.mapel === mapel && x.guru);
    setGuru(j?.guru || '');
  }, [jadwal, f.ta, f.semester, f.rombel, mapel]);

  const tersimpan = useMemo(() => {
    const map = {};
    nilai.forEach(n => {
      if (n.tahunAjaran === f.ta && n.semester === f.semester && n.mapel === mapel && n.jenis === jenis && n.tanggal === tanggal) map[n.nisn] = n;
    });
    return map;
  }, [nilai, f.ta, f.semester, mapel, jenis, tanggal]);

  useEffect(() => {
    const awal = {};
    daftar.forEach(s => {
      const t = tersimpan[s.nisn];
      awal[s.nisn || s.id] = { nilai: t?.nilai ?? '', ket: t?.keterangan || '' };
    });
    setIsian(awal);
    setBerubah(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarKey, tersimpan]);

  function set(key, patch) { setIsian(v => ({ ...v, [key]: { ...v[key], ...patch } })); setBerubah(true); }

  const terisi = daftar.filter(s => isian[s.nisn || s.id]?.nilai !== '' && isian[s.nisn || s.id]?.nilai !== undefined);
  const adaInvalid = daftar.some(s => !nilaiValid(isian[s.nisn || s.id]?.nilai ?? ''));
  const rataKelas = rata(terisi.map(s => Number(isian[s.nisn || s.id].nilai)));
  const sudahAda = Object.keys(tersimpan).length;

  async function simpan() {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (adaInvalid) { toast('Ada nilai di luar rentang 0–100.', 'error'); return; }
    if (!f.ta) { toast('Pilih tahun ajaran dulu.', 'error'); return; }
    const rows = terisi.filter(s => s.nisn).map(s => ({
      'Tahun Ajaran': f.ta, Semester: f.semester, Tanggal: tanggal, 'Mata Pelajaran': mapel, 'Jenis Nilai': jenis,
      NISN: s.nisn, 'Nama Siswa': s.nama, Tingkat: s.kelasTingkat, Rombel: s.rombel,
      Nilai: Number(isian[s.nisn].nilai), Guru: guru, Keterangan: isian[s.nisn].ket || '',
    }));
    if (!rows.length) { toast('Belum ada nilai yang diisi.', 'error'); return; }
    setMenyimpan(true);
    try {
      const { ditambah, diupdate } = await upsertNilaiToSheet(rows);
      await addLogEntry({
        username: currentUser.username, namaUser: currentUser.nama, aksi: 'Input Nilai', modul: 'Nilai Akademik',
        detail: `${f.rombel.label} · ${mapel} · ${jenis} ${tanggal} (${f.ta} ${f.semester}): ${ditambah} baru, ${diupdate} diperbarui`,
      });
      await refreshNilai();
      toast(`Nilai tersimpan: ${ditambah} baru, ${diupdate} diperbarui.`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Input nilai per kelas</h3><p>Satu kali input = satu penilaian (mis. Ulangan Harian Matematika tanggal ini) untuk seluruh kelas. Kosongkan siswa yang belum dinilai.</p></div>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={f.ta} onChange={f.setTa} options={f.tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={f.semester} onChange={f.setSemester} options={SEMESTER_OPTIONS} /></Field>
          <Field label="Kelas / Rombel" grow>
            <Select value={f.rombelKey} onChange={f.setRombelKey} options={f.rombelList.map(r => ({ value: r.key, label: r.label }))} />
          </Field>
        </div>
        <div className="filter-bar">
          <Field label="Mata Pelajaran"><Select value={mapel} onChange={setMapel} options={mapelKelas} /></Field>
          <Field label="Jenis Nilai"><Select value={jenis} onChange={setJenis} options={JENIS_NILAI_OPTIONS} /></Field>
          <Field label="Tanggal Penilaian"><input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} /></Field>
          <Field label="Guru" grow><Select value={guru} onChange={setGuru} options={guruOptions} placeholder="— pilih —" /></Field>
        </div>

        {sudahAda > 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Penilaian ini sudah punya {sudahAda} nilai tersimpan. Menyimpan lagi akan memperbarui nilai yang diubah.
          </p>
        )}

        {!nilaiLoaded && isConfigured('akademik') ? <Kosong>Memuat data nilai…</Kosong>
          : !daftar.length ? <Kosong>Tidak ada siswa aktif di rombel ini.</Kosong>
          : (
            <div className="table-scroll">
              <table>
                <thead><tr><th style={{ width: 40 }}>#</th><th>Nama Siswa</th><th>NISN</th><th>Nilai</th><th>Predikat</th><th>Catatan</th></tr></thead>
                <tbody>
                  {daftar.map((s, i) => {
                    const key = s.nisn || s.id;
                    const v = isian[key] || { nilai: '', ket: '' };
                    const p = predikatNilai(v.nilai);
                    return (
                      <tr key={key}>
                        <td>{i + 1}</td>
                        <td><b>{s.nama}</b></td>
                        <td style={{ color: 'var(--muted)' }}>{s.nisn || 'belum ada NISN'}</td>
                        <td>
                          <input className={`input-cell nilai${nilaiValid(v.nilai) ? '' : ' invalid'}`} type="number" min="0" max="100" inputMode="decimal"
                            value={v.nilai} disabled={!s.nisn} aria-label={`Nilai ${s.nama}`}
                            onChange={e => set(key, { nilai: e.target.value })} />
                        </td>
                        <td>{p && nilaiValid(v.nilai) ? <span className={`badge ${badgePredikat(p)}`}>{p}</span> : '—'}</td>
                        <td><input className="input-cell" value={v.ket} disabled={!s.nisn} onChange={e => set(key, { ket: e.target.value })} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        <div className="save-bar">
          <div className="ringkas-bar">
            <span className="badge badge-muted">{terisi.length}/{daftar.length} terisi</span>
            {rataKelas !== null && <span className="badge badge-green">Rata-rata {rataKelas}</span>}
            {adaInvalid && <span className="badge badge-red">Ada nilai di luar 0–100</span>}
          </div>
          <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !berubah || adaInvalid}>
            {menyimpan ? 'Menyimpan…' : 'Simpan nilai'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function RekapNilai() {
  const { siswa, nilai } = useAppData();
  const f = useFilterPeriode();

  const daftar = useMemo(() => f.rombel ? siswaDiRombel(siswa, f.rombel.tingkat, f.rombel.rombel) : [], [siswa, f.rombel]);
  const periode = useMemo(() => nilai.filter(n => n.tahunAjaran === f.ta && n.semester === f.semester && n.nilai !== null), [nilai, f.ta, f.semester]);
  const nisnSet = useMemo(() => new Set(daftar.map(s => s.nisn)), [daftar]);
  const mapelAda = useMemo(
    () => MAPEL_OPTIONS.filter(m => periode.some(n => n.mapel === m && nisnSet.has(n.nisn)))
      .concat([...new Set(periode.filter(n => nisnSet.has(n.nisn) && !MAPEL_OPTIONS.includes(n.mapel)).map(n => n.mapel))]),
    [periode, nisnSet],
  );

  const baris = useMemo(() => {
    const hasil = daftar.map(s => {
      const milik = periode.filter(n => n.nisn === s.nisn);
      const perMapel = {};
      mapelAda.forEach(m => { perMapel[m] = rata(milik.filter(n => n.mapel === m).map(n => n.nilai)); });
      const nilaiMapel = Object.values(perMapel).filter(v => v !== null);
      return { s, perMapel, rata: rata(nilaiMapel) };
    });
    const urut = hasil.filter(h => h.rata !== null).sort((a, b) => b.rata - a.rata);
    urut.forEach((h, i) => { h.peringkat = i > 0 && urut[i - 1].rata === h.rata ? urut[i - 1].peringkat : i + 1; });
    return hasil;
  }, [daftar, periode, mapelAda]);

  function exportRekap() {
    const headers = ['Nama Siswa', 'NISN', ...mapelAda, 'Rata-rata', 'Predikat', 'Peringkat'];
    exportToExcel(headers, baris.map(b => ({
      'Nama Siswa': b.s.nama, NISN: b.s.nisn, ...Object.fromEntries(mapelAda.map(m => [m, b.perMapel[m] ?? ''])),
      'Rata-rata': b.rata ?? '', Predikat: predikatNilai(b.rata), Peringkat: b.peringkat ?? '',
    })), `Rekap_Nilai_${f.rombel?.label}_${f.ta}_${f.semester}`.replace(/[^\w-]+/g, '_'), `Rekap Nilai ${f.rombel?.label} — ${f.ta} ${f.semester}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Rekap nilai per kelas</h3><p>Rata-rata semua penilaian per mata pelajaran. Predikat mengikuti skala di Kurikulum &amp; KKM › Skala Predikat ({getSkalaPredikat().map(x => `${x.huruf} ≥ ${x.min}`).join(', ')}).</p></div>
        <button className="btn btn-sm" onClick={exportRekap} disabled={!mapelAda.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={f.ta} onChange={f.setTa} options={f.tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={f.semester} onChange={f.setSemester} options={SEMESTER_OPTIONS} /></Field>
          <Field label="Kelas / Rombel" grow>
            <Select value={f.rombelKey} onChange={f.setRombelKey} options={f.rombelList.map(r => ({ value: r.key, label: r.label }))} />
          </Field>
        </div>
        {!mapelAda.length ? <Kosong>Belum ada nilai untuk kelas ini di periode terpilih.</Kosong> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  {mapelAda.map(m => <th key={m} style={{ textAlign: 'center' }}>{m}</th>)}
                  <th style={{ textAlign: 'center' }}>Rata-rata</th><th>Predikat</th><th style={{ textAlign: 'center' }}>Peringkat</th>
                </tr>
              </thead>
              <tbody>
                {baris.map(b => {
                  const p = predikatNilai(b.rata);
                  return (
                    <tr key={b.s.id}>
                      <td><b>{b.s.nama}</b></td>
                      {mapelAda.map(m => (
                        <td key={m} style={{ textAlign: 'center', color: b.perMapel[m] !== null && b.perMapel[m] < 70 ? 'var(--red)' : undefined }}>
                          {b.perMapel[m] ?? '—'}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{b.rata ?? '—'}</td>
                      <td>{p ? <span className={`badge ${badgePredikat(p)}`}>{p} · {PREDIKAT_LABEL[p]}</span> : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{b.peringkat ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// v1.65.0: nilai satu mapel dalam satu tabel. Siswa ke bawah, setiap kali input
// (tanggal + jenis) jadi satu kolom ke kanan. Hanya untuk dilihat; edit lewat Input Nilai.
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmtTgl = (iso) => { const d = new Date(iso + 'T00:00:00'); return Number.isNaN(d.getTime()) ? { hari: '', tgl: iso || '—' } : { hari: HARI[d.getDay()], tgl: `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` }; };
const koma = (v) => (v === null || v === undefined ? '—' : String(v).replace('.', ','));
const KELAS_JENIS = { Harian: 'kH', Tugas: 'kT', UTS: 'kU', UAS: 'kA' };

function NilaiPerMapel({ onEdit }) {
  const { siswa, nilai, nilaiLoaded, kkm, mapelList, jadwal } = useAppData();
  const f = useFilterPeriode();
  const mapelKelas = useMemo(() => (f.rombel ? mapelUntukTingkat(f.rombel.tingkat) : MAPEL_OPTIONS), [f.rombel, mapelList]); // eslint-disable-line react-hooks/exhaustive-deps
  const daftar = useMemo(() => (f.rombel ? siswaDiRombel(siswa, f.rombel.tingkat, f.rombel.rombel) : []), [siswa, f.rombel]);
  const nisnKelas = useMemo(() => new Set(daftar.map(s => s.nisn).filter(Boolean)), [daftar]);
  // Semua nilai kelas ini di periode terpilih (termasuk siswa yg sudah pindah kelas: dicocokkan
  // juga lewat Tingkat+Rombel yg tercatat di baris nilai).
  const nilaiKelas = useMemo(() => (f.rombel ? nilai.filter(n => n.tahunAjaran === f.ta && n.semester === f.semester && n.nilai !== null
    && (nisnKelas.has(n.nisn) || (n.tingkat === f.rombel.tingkat && n.rombel === f.rombel.rombel))) : []), [nilai, f.ta, f.semester, f.rombel, nisnKelas]);
  const jumlahPerMapel = useMemo(() => {
    const m = {};
    nilaiKelas.forEach(n => { (m[n.mapel] ||= new Set()).add(`${n.tanggal}|${n.jenis}`); });
    return m;
  }, [nilaiKelas]);
  const daftarMapel = useMemo(() => [...mapelKelas, ...Object.keys(jumlahPerMapel).filter(m => !mapelKelas.includes(m))], [mapelKelas, jumlahPerMapel]);
  const [mapel, setMapel] = useState('');
  // Ganti kelas/periode -> pilih otomatis mapel pertama yang sudah punya nilai.
  useEffect(() => { setMapel(''); }, [f.rombelKey, f.ta, f.semester]);
  useEffect(() => {
    if (!mapel || !daftarMapel.includes(mapel)) setMapel(daftarMapel.find(m => jumlahPerMapel[m]?.size) || daftarMapel[0] || '');
  }, [daftarMapel, mapel, jumlahPerMapel]);

  const lookupKkm = useMemo(() => buatLookupKkm(kkm), [kkm]);
  const batas = f.rombel ? lookupKkm(f.ta, f.rombel.tingkat, mapel) : null;
  const rendah = (v) => v !== null && v !== undefined && batas !== null && v < batas;

  const data = useMemo(() => {
    const rows = nilaiKelas.filter(n => n.mapel === mapel);
    // Guru tiap kolom = nama guru yg tercatat di baris nilai penilaian itu (yg paling banyak).
    const peta = new Map();
    rows.forEach(n => {
      const k = `${n.tanggal}|${n.jenis}`;
      if (!peta.has(k)) peta.set(k, { kunci: k, tanggal: n.tanggal, jenis: n.jenis, hitung: {} });
      if (n.guru) peta.get(k).hitung[n.guru] = (peta.get(k).hitung[n.guru] || 0) + 1;
    });
    const kolom = [...peta.values()].map(k => ({ ...k, guru: Object.entries(k.hitung).sort((a, b) => b[1] - a[1])[0]?.[0] || '' }))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.jenis.localeCompare(b.jenis));
    const sel = {};
    rows.forEach(n => { sel[`${n.nisn}|${n.tanggal}|${n.jenis}`] = n.nilai; });
    // Siswa di kelas sekarang + siswa lain yg punya nilai di kelas ini (mis. sudah pindah).
    const lain = [...new Map(rows.filter(n => !nisnKelas.has(n.nisn)).map(n => [n.nisn, { id: 'X' + n.nisn, nisn: n.nisn, nama: n.nama, keluar: true }])).values()];
    const siswaTabel = [...daftar, ...lain];
    const baris = siswaTabel.map(s => {
      const v = kolom.map(k => sel[`${s.nisn}|${k.kunci}`] ?? null);
      return { s, v, rata: rata(v.filter(x => x !== null)) };
    });
    const rataKolom = kolom.map((_, i) => rata(baris.map(b => b.v[i]).filter(x => x !== null)));
    const rataSiswa = baris.map(b => b.rata).filter(x => x !== null);
    return { kolom, baris, rataKolom, rataKelas: rata(rataSiswa) };
  }, [nilaiKelas, mapel, daftar, nisnKelas]);

  // Guru pengampu menurut Jadwal Pelajaran + semua guru yg pernah menginput nilai mapel ini.
  const pengampu = useMemo(() => (f.rombel ? [...new Set(jadwal.filter(j => j.tahunAjaran === f.ta && j.semester === f.semester && j.tingkat === f.rombel.tingkat && j.rombel === f.rombel.rombel && j.mapel === mapel && j.guru).map(j => j.guru))] : []), [jadwal, f.ta, f.semester, f.rombel, mapel]);
  const penginput = [...new Set(data.kolom.map(k => k.guru).filter(Boolean))];
  const bawahKolom = data.kolom.map((_, i) => data.baris.filter(b => rendah(b.v[i])).length);
  const bawahSiswa = data.baris.filter(b => rendah(b.rata)).length;

  function exportData() {
    const head = data.kolom.map((k, i) => `${i + 1}. ${k.jenis} ${k.tanggal}`);
    const headGuru = data.kolom.map((k, i) => `${head[i]} (${k.guru || '-'})`);
    head.splice(0, head.length, ...headGuru);
    exportToExcel(['No', 'Nama Siswa', 'NISN', ...head, 'Rata-rata', 'Predikat'], data.baris.map((b, i) => ({
      No: i + 1, 'Nama Siswa': b.s.nama, NISN: b.s.nisn, ...Object.fromEntries(head.map((h, k) => [h, b.v[k] ?? ''])),
      'Rata-rata': b.rata ?? '', Predikat: predikatNilai(b.rata),
    })), `Nilai_${mapel}_${f.rombel?.label}_${f.ta}_${f.semester}`.replace(/[^\w-]+/g, '_'), `Nilai ${mapel} — ${f.rombel?.label} — ${f.ta} ${f.semester}`);
  }

  const Pd = ({ v }) => { const p = predikatNilai(v); return p ? <span className={`badge pm-pd ${badgePredikat(p)}`}>{p}</span> : null; };

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Nilai per mata pelajaran</h3><p>Siswa ke bawah, setiap kali input nilai jadi satu kolom ke kanan. Kolom paling kanan = rata-rata tiap siswa.</p></div>
        <button className="btn btn-sm" onClick={exportData} disabled={!data.kolom.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={f.ta} onChange={f.setTa} options={f.tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={f.semester} onChange={f.setSemester} options={SEMESTER_OPTIONS} /></Field>
          <Field label="Kelas / Rombel" grow><Select value={f.rombelKey} onChange={f.setRombelKey} options={f.rombelList.map(r => ({ value: r.key, label: r.label }))} /></Field>
        </div>
        <div className="pm-mapel" role="tablist" aria-label="Mata pelajaran">
          {daftarMapel.map(m => (
            <button key={m} type="button" role="tab" aria-selected={m === mapel} className={m === mapel ? 'on' : ''} onClick={() => setMapel(m)}>
              {m} <small>{jumlahPerMapel[m]?.size || 0}×</small>
            </button>
          ))}
        </div>
        {!nilaiLoaded ? <Kosong>Memuat nilai…</Kosong> : !f.rombel ? <Kosong>Belum ada kelas.</Kosong> : !data.kolom.length ? (
          <Kosong>Belum ada nilai {mapel} untuk {f.rombel.label} di {f.ta} semester {f.semester}. <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => onEdit({ ta: f.ta, semester: f.semester, rombelKey: f.rombelKey, mapel })}>＋ Input nilai</button></Kosong>
        ) : (
          <>
            <div className="ringkas-bar" style={{ margin: '4px 0 12px' }}>
              <span className="badge badge-blue">👤 {pengampu.length ? `Guru pengampu: ${pengampu.join(', ')}` : penginput.length ? `Diinput oleh: ${penginput.join(', ')}` : 'Guru belum tercatat'}</span>
              {pengampu.length > 0 && penginput.some(g => !pengampu.includes(g)) && <span className="badge badge-muted">Juga diinput oleh: {penginput.filter(g => !pengampu.includes(g)).join(', ')}</span>}
              <span className="badge badge-muted">{data.kolom.length} kali input</span>
              {batas !== null && <span className="badge badge-muted">KKM {batas}</span>}
              <span className="badge badge-green">Rata-rata kelas {koma(data.rataKelas)}</span>
              {batas !== null && (bawahSiswa ? <span className="badge badge-red">{bawahSiswa} siswa rata-rata di bawah KKM</span> : <span className="badge badge-green">Semua rata-rata tuntas</span>)}
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => onEdit({ ta: f.ta, semester: f.semester, rombelKey: f.rombelKey, mapel })}>＋ Input nilai {mapel}</button>
            </div>
            <div className="table-scroll">
              <table className="pm-tabel">
                <thead>
                  <tr>
                    <th>#</th><th className="pm-nama">Nama Siswa</th>
                    {data.kolom.map((k, i) => { const t = fmtTgl(k.tanggal); return (
                      <th key={k.kunci} className="pm-kol" title={k.guru ? `Guru: ${k.guru}` : undefined}>
                        <div className="pm-no">Input ke-{i + 1}</div><div className="pm-hari">{t.hari}</div><div className="pm-tgl">{t.tgl}</div>
                        <span className={`pm-kat ${KELAS_JENIS[k.jenis] || ''}`}>{k.jenis}</span>
                        <div className="pm-guru">{k.guru || 'guru tidak tercatat'}</div>
                      </th>
                    ); })}
                    <th className="pm-rata">Rata-rata<br />siswa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.baris.map((b, i) => (
                    <tr key={b.s.id || b.s.nisn}>
                      <td className="pm-i">{i + 1}</td>
                      <td className="pm-nama"><b>{b.s.nama}</b>{b.s.keluar && <small> · sudah tidak di kelas ini</small>}</td>
                      {b.v.map((v, k) => (
                        <td key={k} className={`pm-v ${rendah(v) ? 'lo' : ''}`}>{v === null ? <span className="pm-kos">belum<br />dinilai</span> : <>{v}<Pd v={v} /></>}</td>
                      ))}
                      <td className={`pm-v pm-av ${rendah(b.rata) ? 'lo' : ''}`}>{b.rata === null ? '—' : <>{koma(b.rata)}<Pd v={b.rata} /></>}</td>
                    </tr>
                  ))}
                  <tr className="pm-ft"><td /><td className="pm-nama">Rata-rata kelas</td>{data.rataKolom.map((r, i) => <td key={i} className="pm-v">{koma(r)}</td>)}<td className="pm-v pm-av">{koma(data.rataKelas)}</td></tr>
                  {batas !== null && <tr className="pm-ft"><td /><td className="pm-nama">Di bawah KKM</td>{bawahKolom.map((n, i) => <td key={i} className={`pm-v ${n ? 'lo' : ''}`}>{n} siswa</td>)}<td className={`pm-v pm-av ${bawahSiswa ? 'lo' : ''}`}>{bawahSiswa} siswa</td></tr>}
                  <tr className="pm-aksi"><td /><td />{data.kolom.map(k => (
                    <td key={k.kunci}><button type="button" className="btn btn-sm" onClick={() => onEdit({ ta: f.ta, semester: f.semester, rombelKey: f.rombelKey, mapel, jenis: k.jenis, tanggal: k.tanggal })} aria-label={`Edit ${k.jenis} ${k.tanggal}`}>✏️ Edit</button></td>
                  ))}<td /></tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0' }}>Angka merah = di bawah KKM. Huruf kecil = predikat. "Belum dinilai" tidak ikut dihitung ke rata-rata. ✏️ Edit membuka penilaian itu di tab Input Nilai.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function NilaiAkademik() {
  const { refreshNilai } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('nilai', TABS.map(t => t.id));
  const [preset, setPreset] = useState(null); // dari tombol Edit / Input di tab Per Mapel
  const bukaInput = (p) => { setPreset({ ...p, n: Date.now() }); setTab('input'); };
  const updateFn = (row) => {
    if (!nilaiValid(row.Nilai) || row.Nilai === '') throw new Error('Nilai harus angka 0–100.');
    return updateNilaiInSheet({ ...row, Nilai: Number(row.Nilai) });
  };
  return (
    <Page pageId="nilai" title="Nilai Akademik" path="Akademik / Nilai Akademik">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'input' && bolehTab('input') && <InputNilai key={preset?.n || 0} preset={preset} />}
          {tab === 'rekap' && bolehTab('rekap') && <RekapNilai />}
          {tab === 'mapel' && bolehTab('mapel') && <NilaiPerMapel onEdit={bukaInput} />}
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Data nilai"
              subtitle="Semua baris nilai mentah dari seluruh kelas dan periode."
              headers={NILAI_HEADERS}
              fields={EDIT_FIELDS}
              fetchFn={fetchNilaiFromSheet}
              updateFn={updateFn}
              deleteFn={deleteNilaiFromSheet}
              moduleLabel="Nilai Akademik"
              labelKey="Nama Siswa"
              target="akademik"
              columnRenderers={{ Nilai: r => { const p = predikatNilai(r.Nilai); return <span className={`badge ${badgePredikat(p)}`}>{r.Nilai}</span>; } }}
              searchFn={(r, t) => `${r['Nama Siswa']} ${r.NISN} ${r['Mata Pelajaran']} ${r.Rombel} ${r['Jenis Nilai']}`.toLowerCase().includes(t)}
              onChanged={refreshNilai}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
