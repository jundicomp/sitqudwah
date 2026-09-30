import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  MAPEL_OPTIONS, SEMESTER_OPTIONS, JENIS_NILAI_OPTIONS, NILAI_HEADERS,
  siswaDiRombel, semesterDariTanggal, predikatNilai, badgePredikat, PREDIKAT_LABEL,
} from '../../db/akademikFields';
import { todayWIB } from '../../db/helpers';
import {
  upsertNilaiToSheet, fetchNilaiFromSheet, updateNilaiInSheet, deleteNilaiFromSheet, addLogEntry, isConfigured,
} from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'input', label: 'INPUT NILAI' },
  { id: 'rekap', label: 'REKAP NILAI' },
  { id: 'tabel', label: 'DATA NILAI' },
];
const EDIT_FIELDS = [
  { key: 'Nilai', label: 'Nilai (0–100)', type: 'number', required: true },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];

const nilaiValid = (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100);
const rata = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

function useFilterPeriode() {
  const { tahunAjaranOptions, taAktif, rombelList } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState(semesterDariTanggal());
  const [rombelKey, setRombelKey] = useState('');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { if (!rombelKey && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey]);
  const rombel = rombelList.find(r => r.key === rombelKey);
  return { ta, setTa, semester, setSemester, rombelKey, setRombelKey, rombel, rombelList, tahunAjaranOptions };
}

// ---------------------------------------------------------------------------
function InputNilai() {
  const { siswa, nilai, nilaiLoaded, jadwal, refreshNilai, toast } = useAppData();
  const { currentUser } = useAuth();
  const { guruOptions } = useAkademikOptions();
  const f = useFilterPeriode();
  const [mapel, setMapel] = useState(MAPEL_OPTIONS[0]);
  const [jenis, setJenis] = useState('Harian');
  const [tanggal, setTanggal] = useState(todayWIB());
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
          <Field label="Mata Pelajaran"><Select value={mapel} onChange={setMapel} options={MAPEL_OPTIONS} /></Field>
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
        <div><h3>Rekap nilai per kelas</h3><p>Rata-rata semua penilaian per mata pelajaran. Predikat: A ≥ 90, B ≥ 80, C ≥ 70, D di bawahnya.</p></div>
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
export default function NilaiAkademik() {
  const { refreshNilai } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('nilai', TABS.map(t => t.id));
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
          {tab === 'input' && bolehTab('input') && <InputNilai />}
          {tab === 'rekap' && bolehTab('rekap') && <RekapNilai />}
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
