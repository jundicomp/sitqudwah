import { useMemo, useState } from 'react';
import DataTable from '../../../components/common/DataTable';
import { Field, Select } from '../../../components/akademik/shared';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { bolehLihatSemuaKelas } from '../../../db/akses';
import { namaTingkat } from '../../../config/jenjang';
import { SEMESTER_OPTIONS } from '../../../db/akademikFields';
import { faseDariTingkat } from '../../../db/kurikulumFields';
import { BADGE_STATUS_MODUL, STATUS_MODUL, jpTotal, barisDuplikatModul } from '../../../db/modulAjarFields';
import { formatTanggalAngka } from '../../../db/helpers';
import { upsertModulAjarToSheet, isConfigured } from '../../../services/googleSheets';
import { exportToExcel } from '../../../utils/exportTable';

const rombelDari = (x) => x.rombel.split(',').map(r => r.trim()).filter(Boolean);
const kelasRombel = (x) => `${namaTingkat(x.tingkat)}${x.rombel ? ` · ${rombelDari(x).join(', ')}` : ''}`;
const tglUbah = (iso) => (iso ? formatTanggalAngka(String(iso).slice(0, 10)) : '');

// Modul Ajar › Galeri Modul: semua modul (lintas tahun ajaran) dalam satu tabel ber-filter.
// Admin & Kepala Sekolah: semua modul. Guru: modul yang dia buat sendiri.
export default function GaleriModul({ onBuka, onLihat }) {
  const { modulAjar, tp, refreshModulAjar, toast } = useAppData();
  const { currentUser } = useAuth();
  const semua = bolehLihatSemuaKelas(currentUser);
  const [f, setF] = useState({ ta: '', semester: '', mapel: '', kelas: '', guru: '', status: '' });
  const set = (k) => (v) => setF(x => ({ ...x, [k]: v }));

  const milikku = useMemo(() => modulAjar.filter(x => semua || (x.guru && x.guru === currentUser?.guru)), [modulAjar, semua, currentUser]);
  const opsi = useMemo(() => {
    const uniq = (arr) => [...new Set(arr.filter(Boolean))];
    const kelas = new Map();
    milikku.forEach(x => {
      kelas.set(x.tingkat, { value: x.tingkat, label: namaTingkat(x.tingkat) });
      rombelDari(x).forEach(r => kelas.set(`${x.tingkat}|${r}`, { value: `${x.tingkat}|${r}`, label: `${namaTingkat(x.tingkat)} · ${r}` }));
    });
    return {
      ta: uniq(milikku.map(x => x.tahunAjaran)).sort().reverse(),
      mapel: uniq(milikku.map(x => x.mapel)).sort(),
      guru: uniq(milikku.map(x => x.guru)).sort(),
      kelas: [...kelas.values()].sort((a, b) => a.label.localeCompare(b.label, 'id', { numeric: true })),
    };
  }, [milikku]);

  const rows = useMemo(() => milikku.filter(x => {
    if (f.ta && x.tahunAjaran !== f.ta) return false;
    if (f.semester && x.semester !== f.semester) return false;
    if (f.mapel && x.mapel !== f.mapel) return false;
    if (f.guru && x.guru !== f.guru) return false;
    if (f.status && x.status !== f.status) return false;
    if (f.kelas) {
      const [t, r] = f.kelas.split('|');
      if (x.tingkat !== t) return false;
      if (r && !rombelDari(x).includes(r)) return false;
    }
    return true;
  }).map(x => ({
    ...x, kodeTp: x.tp.map(id => tp.find(t => t.idTp === id)?.kode).filter(Boolean).join(', '),
    fase: faseDariTingkat(x.tingkat), jp: jpTotal(x.isi), pertemuan: Number(x.isi.pertemuan) || 0,
  })), [milikku, f, tp]);

  const ringkas = {
    modul: rows.length, mapel: new Set(rows.map(x => x.mapel)).size, guru: new Set(rows.map(x => x.guru).filter(Boolean)).size,
    setuju: rows.filter(x => x.status === 'Disetujui').length,
  };
  const adaFilter = Object.values(f).some(Boolean);
  const bolehUbah = (x) => semua || (x.guru && x.guru === currentUser?.guru);

  async function duplikat(x) {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    try {
      await upsertModulAjarToSheet([barisDuplikatModul(x, semua ? x.guru : currentUser.guru, currentUser.nama)]);
      await refreshModulAjar();
      toast('Modul diduplikat sebagai draft baru.');
    } catch (e) { toast(e.message, 'error'); }
  }
  function ekspor() {
    const headers = ['Materi Pokok', 'Bab', 'Kode TP', 'Mata Pelajaran', 'Kelas / Rombel', 'Fase', 'Guru', 'Semester', 'Tahun Ajaran', 'JP', 'Pertemuan', 'Status', 'Diperbarui'];
    exportToExcel(headers, rows.map(x => ({
      'Materi Pokok': x.judul, Bab: x.isi.bab, 'Kode TP': x.kodeTp, 'Mata Pelajaran': x.mapel, 'Kelas / Rombel': kelasRombel(x), Fase: x.fase,
      Guru: x.guru, Semester: x.semester, 'Tahun Ajaran': x.tahunAjaran, JP: x.jp || '', Pertemuan: x.pertemuan || '', Status: x.status, Diperbarui: tglUbah(x.diubahPada),
    })), 'Galeri_Modul_Ajar', 'Galeri Modul Ajar');
  }

  const columns = [
    { key: 'judul', label: 'Materi Pokok', sortable: true, render: r => <><b>{r.judul || 'Tanpa judul'}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{[r.isi.bab && `Bab ${r.isi.bab}`, r.kodeTp].filter(Boolean).join(' · ') || '—'}</div></> },
    { key: 'mapel', label: 'Mata Pelajaran', sortable: true },
    { key: 'kelas', label: 'Kelas / Rombel', sortable: true, accessor: r => `${String(r.tingkat).padStart(3, '0')} ${r.rombel}`, render: r => kelasRombel(r) },
    { key: 'fase', label: 'Fase', sortable: true, render: r => r.fase || '—' },
    { key: 'guru', label: 'Guru', sortable: true, render: r => r.guru || '—' },
    { key: 'semester', label: 'Semester', sortable: true, accessor: r => `${r.tahunAjaran} ${r.semester === 'Genap' ? 2 : 1}`, render: r => <>{r.semester}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.tahunAjaran}</div></> },
    { key: 'jp', label: 'JP', sortable: true, render: r => r.jp || '—' },
    { key: 'pertemuan', label: 'Pert.', sortable: true, render: r => r.pertemuan || '—' },
    { key: 'status', label: 'Status', sortable: true, render: r => <span className={`badge ${BADGE_STATUS_MODUL[r.status] || 'badge-muted'}`}>{r.status}</span> },
    { key: 'diubahPada', label: 'Diperbarui', sortable: true, render: r => tglUbah(r.diubahPada) || '—' },
    { key: 'aksi', label: 'Aksi', render: r => (
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm" onClick={() => onLihat(r)} title="Pratinjau & cetak/PDF">Lihat</button>
        {bolehUbah(r) && ['Draft', 'Dikembalikan'].includes(r.status) && <button className="btn btn-sm" onClick={() => onBuka(r)}>Ubah</button>}
        {(semua || currentUser?.guru) && <button className="btn btn-sm" onClick={() => duplikat(r)} title="Duplikat: salin jadi draft baru">Salin</button>}
      </div>
    ) },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Galeri modul ajar</h3><p>{semua ? 'Semua modul ajar dari semua guru dan tahun ajaran.' : 'Semua modul ajar yang Anda buat, dari semua tahun ajaran.'}</p></div>
        <button className="btn btn-sm" onClick={ekspor} disabled={!rows.length}>📊 Ekspor Excel</button>
      </div>
      <div className="card-body">
        <div className="filter-bar">
          <Field label="Tahun Ajaran"><Select value={f.ta} onChange={set('ta')} options={opsi.ta} placeholder="Semua" /></Field>
          <Field label="Semester"><Select value={f.semester} onChange={set('semester')} options={SEMESTER_OPTIONS} placeholder="Semua" /></Field>
          <Field label="Mata Pelajaran"><Select value={f.mapel} onChange={set('mapel')} options={opsi.mapel} placeholder="Semua" /></Field>
          <Field label="Kelas / Rombel"><Select value={f.kelas} onChange={set('kelas')} options={opsi.kelas} placeholder="Semua" /></Field>
          {semua && <Field label="Guru"><Select value={f.guru} onChange={set('guru')} options={opsi.guru} placeholder="Semua" /></Field>}
          <Field label="Status"><Select value={f.status} onChange={set('status')} options={STATUS_MODUL} placeholder="Semua" /></Field>
        </div>
        <div className="ringkas-bar" style={{ marginBottom: 10 }}>
          <span className="badge badge-muted">{ringkas.modul} modul</span>
          <span className="badge badge-muted">{ringkas.mapel} mapel</span>
          {semua && <span className="badge badge-muted">{ringkas.guru} guru</span>}
          <span className="badge badge-green">{ringkas.setuju} disetujui</span>
          {adaFilter && <button className="btn btn-sm" onClick={() => setF({ ta: '', semester: '', mapel: '', kelas: '', guru: '', status: '' })}>Hapus filter</button>}
        </div>
        <div className="galeri-tabel">
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="diubahPada" defaultSortDir="desc" pageSize={25} pageSizeOptions={[25, 50, 100, 'Semua']}
          searchFn={(r, t) => `${r.judul} ${r.isi.bab} ${r.kodeTp} ${r.mapel} ${r.guru}`.toLowerCase().includes(t)}
          emptyMessage={adaFilter ? 'Tidak ada modul yang cocok dengan filter.' : 'Belum ada modul ajar.'} />
        </div>
      </div>
    </div>
  );
}
