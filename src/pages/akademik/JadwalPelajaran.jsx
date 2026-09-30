import { useCallback, useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { HARI_OPTIONS, SEMESTER_OPTIONS, buildJadwalFields, semesterDariTanggal, labelRombel } from '../../db/akademikFields';
import { fetchJadwalFromSheet, addJadwalToSheet, updateJadwalInSheet, deleteJadwalFromSheet } from '../../services/googleSheets';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'grid', label: 'JADWAL PER KELAS' },
  { id: 'tabel', label: 'DAFTAR JADWAL' },
  { id: 'manual', label: 'TAMBAH JADWAL' },
];
const TABEL_HEADERS = ['No', 'Hari', 'Jam Mulai', 'Jam Selesai', 'Kelas', 'Mata Pelajaran', 'Guru', 'Ruang', 'Tahun Ajaran', 'Semester'];

const tumpang = (a, b) => a.jamMulai < b.jamSelesai && b.jamMulai < a.jamSelesai;

// Cari jadwal yg bentrok dlm 1 TA+semester: guru yg sama mengajar di 2 tempat pada
// jam yg beririsan, atau 1 rombel punya 2 pelajaran di jam yg beririsan.
function cariBentrok(items) {
  const hasil = [];
  const idBentrok = new Set();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]; const b = items[j];
      if (a.hari !== b.hari || !tumpang(a, b)) continue;
      const rombelSama = a.tingkat === b.tingkat && a.rombel === b.rombel;
      const guruSama = a.guru && a.guru === b.guru;
      if (!rombelSama && !guruSama) continue;
      idBentrok.add(a.id); idBentrok.add(b.id);
      hasil.push(rombelSama
        ? `${labelRombel(a.tingkat, a.rombel)}, ${a.hari} ${a.jamMulai}–${a.jamSelesai}: ${a.mapel} bertabrakan dengan ${b.mapel} (${b.jamMulai}–${b.jamSelesai})`
        : `${a.guru}, ${a.hari}: mengajar ${labelRombel(a.tingkat, a.rombel)} (${a.jamMulai}–${a.jamSelesai}) dan ${labelRombel(b.tingkat, b.rombel)} (${b.jamMulai}–${b.jamSelesai}) bersamaan`);
    }
  }
  return { pesan: hasil, idBentrok };
}

function JadwalGrid() {
  const { jadwal, jadwalLoaded } = useAppData();
  const { tahunAjaranOptions, taAktif, rombelList } = useAkademikOptions();
  const [ta, setTa] = useState(taAktif);
  const [semester, setSemester] = useState(semesterDariTanggal());
  const [rombelKey, setRombelKey] = useState('');

  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { if (!rombelKey && rombelList.length) setRombelKey(rombelList[0].key); }, [rombelList, rombelKey]);

  const periode = useMemo(() => jadwal.filter(j => j.tahunAjaran === ta && j.semester === semester), [jadwal, ta, semester]);
  const { pesan, idBentrok } = useMemo(() => cariBentrok(periode), [periode]);
  const rombelDipilih = rombelList.find(r => r.key === rombelKey);
  const milikRombel = useMemo(
    () => rombelDipilih ? periode.filter(j => j.tingkat === rombelDipilih.tingkat && j.rombel === rombelDipilih.rombel) : [],
    [periode, rombelDipilih],
  );
  const slots = useMemo(
    () => [...new Set(milikRombel.map(j => `${j.jamMulai}|${j.jamSelesai}`))].sort(),
    [milikRombel],
  );
  const hariTerpakai = HARI_OPTIONS.filter(h => h !== 'Sabtu' || milikRombel.some(j => j.hari === 'Sabtu'));

  function exportGrid() {
    const headers = ['Jam', ...hariTerpakai];
    const rows = slots.map(slot => {
      const [m, s] = slot.split('|');
      const row = { Jam: `${m}–${s}` };
      hariTerpakai.forEach(h => {
        row[h] = milikRombel.filter(j => j.hari === h && j.jamMulai === m && j.jamSelesai === s).map(j => `${j.mapel}${j.guru ? ' (' + j.guru + ')' : ''}`).join('; ');
      });
      return row;
    });
    exportToExcel(headers, rows, `Jadwal_${rombelDipilih?.label || ''}_${ta}_${semester}`.replace(/[^\w-]+/g, '_'), `Jadwal ${rombelDipilih?.label} — ${ta} ${semester}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Jadwal mingguan per kelas</h3><p>Pilih periode dan kelas. Blok merah menandakan jadwal yang bentrok.</p></div>
        <button className="btn btn-sm" onClick={exportGrid} disabled={!slots.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} /></Field>
          <Field label="Kelas / Rombel" grow>
            <Select value={rombelKey} onChange={setRombelKey} options={rombelList.map(r => ({ value: r.key, label: r.label }))} />
          </Field>
        </div>

        {pesan.length > 0 && (
          <div className="card" style={{ background: 'var(--red-soft)', border: '1px solid #f0c9c2', marginBottom: 16 }}>
            <div className="card-body">
              <b style={{ color: 'var(--red)' }}>{pesan.length} jadwal bentrok di periode ini</b>
              <ul className="warn-list">{pesan.slice(0, 8).map((p, i) => <li key={i}>{p}</li>)}</ul>
              {pesan.length > 8 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>…dan {pesan.length - 8} lainnya.</div>}
            </div>
          </div>
        )}

        {!jadwalLoaded ? <Kosong>Memuat jadwal…</Kosong>
          : !rombelList.length ? <Kosong>Belum ada data kelas. Tambahkan dulu di Pengaturan › Data Kelas &amp; Rombel.</Kosong>
          : !slots.length ? <Kosong>Belum ada jadwal untuk {rombelDipilih?.label} pada {ta} semester {semester}. Tambahkan lewat tab Tambah Jadwal.</Kosong>
          : (
            <div className="table-scroll">
              <table className="jadwal-grid">
                <thead><tr><th>Jam</th>{hariTerpakai.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {slots.map(slot => {
                    const [m, s] = slot.split('|');
                    return (
                      <tr key={slot}>
                        <td className="jam">{m}–{s}</td>
                        {hariTerpakai.map(h => (
                          <td key={h}>
                            {milikRombel.filter(j => j.hari === h && j.jamMulai === m && j.jamSelesai === s).map(j => (
                              <div key={j.id} className={`jadwal-slot${idBentrok.has(j.id) ? ' bentrok' : ''}`}>
                                <b>{j.mapel}</b>{j.guru || '—'}{j.ruang ? ` · ${j.ruang}` : ''}
                              </div>
                            ))}
                          </td>
                        ))}
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

export default function JadwalPelajaran() {
  const { refreshJadwal } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('jadwal', TABS.map(t => t.id));
  const { tahunAjaranOptions, taAktif, rombelLabels, guruOptions, withKelasVirtual, fromKelasVirtual } = useAkademikOptions();

  const fields = useMemo(() => buildJadwalFields({ tahunAjaranOptions, rombelLabels, guruOptions }), [tahunAjaranOptions, rombelLabels, guruOptions]);
  const emptyRow = useCallback(() => ({
    'Tahun Ajaran': taAktif, Semester: semesterDariTanggal(), Kelas: '', Hari: '', 'Jam Mulai': '07:30', 'Jam Selesai': '08:40',
    'Mata Pelajaran': '', Guru: '', Ruang: '',
  }), [taAktif]);

  const cekJam = (row) => {
    if (String(row['Jam Selesai']) <= String(row['Jam Mulai'])) throw new Error('Jam selesai harus setelah jam mulai.');
    return row;
  };
  const fetchFn = useCallback(async () => (await fetchJadwalFromSheet()).map(withKelasVirtual), [withKelasVirtual]);
  const addFn = useCallback(async (form) => { await addJadwalToSheet(fromKelasVirtual(cekJam(form))); await refreshJadwal(); }, [fromKelasVirtual, refreshJadwal]);
  const updateFn = useCallback((row) => updateJadwalInSheet(fromKelasVirtual(cekJam(row))), [fromKelasVirtual]);

  return (
    <Page pageId="jadwal" title="Jadwal Pelajaran" path="Akademik / Jadwal Pelajaran">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'grid' && bolehTab('grid') && <JadwalGrid />}
          {tab === 'tabel' && bolehTab('tabel') && (
            <GenericStoredTable
              title="Daftar Jadwal Pelajaran"
              subtitle="Semua jadwal di semua kelas dan periode."
              headers={TABEL_HEADERS}
              fields={fields}
              fetchFn={fetchFn}
              updateFn={updateFn}
              deleteFn={deleteJadwalFromSheet}
              moduleLabel="Jadwal Pelajaran"
              labelKey="Mata Pelajaran"
              target="akademik"
              searchFn={(r, t) => `${r.Kelas} ${r['Mata Pelajaran']} ${r.Guru} ${r.Hari}`.toLowerCase().includes(t)}
              onChanged={refreshJadwal}
            />
          )}
          {tab === 'manual' && bolehTab('manual') && (
            <GenericManualForm
              fields={fields}
              emptyRow={emptyRow}
              addFn={addFn}
              target="akademik"
              title="Tambah Jadwal"
              subtitle="Satu baris = satu jam pelajaran di satu kelas. Jadwal yang bentrok akan ditandai di tab Jadwal per Kelas."
            />
          )}
        </div>
      </div>
    </Page>
  );
}
