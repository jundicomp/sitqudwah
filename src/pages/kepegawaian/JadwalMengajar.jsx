import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import DataTable from '../../components/common/DataTable';
import { TabBar, AkademikBelumTersambung, Field, Select, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { HARI_OPTIONS, SEMESTER_OPTIONS, semesterDariTanggal, labelRombel, daftarNamaGuru } from '../../db/akademikFields';
import { menitAntara, jpDariMenit, TARGET_JP_MINGGU, MENIT_PER_JP } from '../../db/kepegawaianFields';
import { exportToExcel } from '../../utils/exportTable';

const TABS = [
  { id: 'guru', label: 'JADWAL PER GURU' },
  { id: 'beban', label: 'BEBAN MENGAJAR' },
];

// Jadwal Mengajar = Jadwal Pelajaran dilihat dari sisi guru. Tidak ada input
// terpisah; ubah jadwal lewat menu Akademik › Jadwal Pelajaran.
function usePeriode() {
  const { taAktif, tahunAjaranOptions } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState(semesterDariTanggal());
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  return { ta, setTa, semester, setSemester, tahunAjaranOptions };
}

function PerGuru() {
  const { jadwal, guru, jadwalLoaded } = useAppData();
  const p = usePeriode();
  const namaGuru = useMemo(() => daftarNamaGuru(guru), [guru]);
  const [nama, setNama] = useState('');
  useEffect(() => { if (!nama && namaGuru.length) setNama(namaGuru[0]); }, [namaGuru, nama]);

  const milik = useMemo(() => jadwal.filter(j => j.guru === nama && j.tahunAjaran === p.ta && j.semester === p.semester)
    .sort((a, b) => HARI_OPTIONS.indexOf(a.hari) - HARI_OPTIONS.indexOf(b.hari) || a.jamMulai.localeCompare(b.jamMulai)), [jadwal, nama, p.ta, p.semester]);
  const totalJp = jpDariMenit(milik.reduce((a, j) => a + menitAntara(j.jamMulai, j.jamSelesai), 0));

  function exportData() {
    exportToExcel(['Hari', 'Jam', 'Kelas', 'Mata Pelajaran', 'Ruang', 'JP'], milik.map(j => ({
      Hari: j.hari, Jam: `${j.jamMulai}–${j.jamSelesai}`, Kelas: labelRombel(j.tingkat, j.rombel), 'Mata Pelajaran': j.mapel, Ruang: j.ruang, JP: jpDariMenit(menitAntara(j.jamMulai, j.jamSelesai)),
    })), `Jadwal_Mengajar_${nama}_${p.ta}_${p.semester}`.replace(/[^\w-]+/g, '_'), `Jadwal Mengajar ${nama} — ${p.ta} ${p.semester}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Jadwal mengajar per guru</h3><p>Diambil dari Jadwal Pelajaran. Untuk mengubah, edit di Akademik › Jadwal Pelajaran.</p></div>
        <button className="btn btn-sm" onClick={exportData} disabled={!milik.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Guru" grow><Select value={nama} onChange={setNama} options={namaGuru} /></Field>
          <Field label="Tahun Ajaran"><Select value={p.ta} onChange={p.setTa} options={p.tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={p.semester} onChange={p.setSemester} options={SEMESTER_OPTIONS} /></Field>
        </div>
        <div className="ringkas-bar" style={{ marginBottom: 12 }}>
          <span className="badge badge-muted">{milik.length} jam pelajaran/minggu</span>
          <span className={`badge ${totalJp >= TARGET_JP_MINGGU ? 'badge-green' : 'badge-gold'}`}>{totalJp} JP/minggu</span>
          <span className="badge badge-muted">{new Set(milik.map(j => j.tingkat + j.rombel)).size} kelas · {new Set(milik.map(j => j.mapel)).size} mapel</span>
        </div>
        {!jadwalLoaded ? <Kosong>Memuat jadwal…</Kosong> : !milik.length ? <Kosong>{nama || 'Guru ini'} belum punya jadwal di {p.ta} semester {p.semester}.</Kosong> : (
          <div className="table-scroll">
            <table className="jadwal-grid">
              <thead><tr>{HARI_OPTIONS.filter(h => h !== 'Sabtu' || milik.some(j => j.hari === 'Sabtu')).map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody><tr>
                {HARI_OPTIONS.filter(h => h !== 'Sabtu' || milik.some(j => j.hari === 'Sabtu')).map(h => (
                  <td key={h}>{milik.filter(j => j.hari === h).map(j => (
                    <div key={j.id} className="jadwal-slot"><b>{j.jamMulai}–{j.jamSelesai}</b>{j.mapel}<br />{labelRombel(j.tingkat, j.rombel)}{j.ruang ? ` · ${j.ruang}` : ''}</div>
                  ))}{!milik.some(j => j.hari === h) && <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}</td>
                ))}
              </tr></tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BebanMengajar() {
  const { jadwal, guru, kelas } = useAppData();
  const p = usePeriode();
  const rows = useMemo(() => {
    const periode = jadwal.filter(j => j.tahunAjaran === p.ta && j.semester === p.semester);
    return daftarNamaGuru(guru).map(nama => {
      const milik = periode.filter(j => j.guru === nama);
      const g = guru.find(x => x.nama === nama);
      const wali = kelas.filter(k => k.waliKelas === nama).map(k => labelRombel(k.tingkat, k.namaKelas));
      const jp = jpDariMenit(milik.reduce((a, j) => a + menitAntara(j.jamMulai, j.jamSelesai), 0));
      return {
        id: nama, nama, nip: g?.nip || '', sertifikasi: g?.sertifikasi || '', jp, jam: milik.length,
        kelas: [...new Set(milik.map(j => labelRombel(j.tingkat, j.rombel)))].join(', '),
        mapel: [...new Set(milik.map(j => j.mapel))].join(', '),
        tugas: [...wali.map(w => `Wali ${w}`), g?.tugasTambahan].filter(Boolean).join(', '),
      };
    });
  }, [jadwal, guru, kelas, p.ta, p.semester]);

  const columns = [
    { key: 'nama', label: 'Guru', sortable: true, render: r => <><b>{r.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.nip}</div></> },
    { key: 'jp', label: 'JP / Minggu', sortable: true, render: r => <span className={`badge ${r.jp >= TARGET_JP_MINGGU ? 'badge-green' : r.jp > 0 ? 'badge-gold' : 'badge-muted'}`}>{r.jp}</span> },
    { key: 'jam', label: 'Jam Tatap Muka', sortable: true },
    { key: 'kelas', label: 'Kelas Diampu' },
    { key: 'mapel', label: 'Mata Pelajaran' },
    { key: 'tugas', label: 'Tugas Tambahan', render: r => r.tugas || '—' },
  ];

  function exportData() {
    exportToExcel(['Guru', 'NIP', 'JP/Minggu', 'Jam Tatap Muka', 'Kelas Diampu', 'Mata Pelajaran', 'Tugas Tambahan'], rows.map(r => ({
      Guru: r.nama, NIP: r.nip, 'JP/Minggu': r.jp, 'Jam Tatap Muka': r.jam, 'Kelas Diampu': r.kelas, 'Mata Pelajaran': r.mapel, 'Tugas Tambahan': r.tugas,
    })), `Beban_Mengajar_${p.ta}_${p.semester}`.replace(/[^\w-]+/g, '_'), `Beban Mengajar Guru — ${p.ta} ${p.semester}`);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Beban mengajar</h3><p>JP dihitung dari durasi jadwal ({MENIT_PER_JP} menit = 1 JP). Hijau = memenuhi {TARGET_JP_MINGGU} JP/minggu.</p></div>
        <button className="btn btn-sm" onClick={exportData} disabled={!rows.length}>📊 Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={p.ta} onChange={p.setTa} options={p.tahunAjaranOptions} /></Field>
          <Field label="Semester"><Select value={p.semester} onChange={p.setSemester} options={SEMESTER_OPTIONS} /></Field>
        </div>
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="nama" pageSize={50}
          searchFn={(r, t) => `${r.nama} ${r.mapel} ${r.kelas}`.toLowerCase().includes(t)} emptyMessage="Belum ada data guru." />
      </div>
    </div>
  );
}

export default function JadwalMengajar() {
  const { tab, setTab, bolehTab } = useTabAccess('jadwal-mengajar', TABS.map(t => t.id));
  return (
    <Page pageId="jadwal-mengajar" title="Jadwal Mengajar" path="Kepegawaian / Jadwal Mengajar">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'guru' && bolehTab('guru') && <PerGuru />}
          {tab === 'beban' && bolehTab('beban') && <BebanMengajar />}
        </div>
      </div>
    </Page>
  );
}
