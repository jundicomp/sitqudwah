import { useState } from 'react';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SEMESTER_OPTIONS } from '../../db/akademikFields';
import { semesterApi, addLogEntry, isConfigured } from '../../services/googleSheets';

const FIELDS = [
  { key: 'Tahun Ajaran', label: 'Tahun Ajaran', type: 'text', required: true },
  { key: 'Semester', label: 'Semester', type: 'select', options: SEMESTER_OPTIONS, required: true },
  { key: 'Mulai', label: 'Mulai', type: 'date', required: true },
  { key: 'Selesai', label: 'Selesai', type: 'date', required: true },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];

// Cek periode bertabrakan dgn periode lain (selain dirinya sendiri).
function validasi(row, semua) {
  const m = String(row.Mulai).slice(0, 10); const s = String(row.Selesai).slice(0, 10);
  if (!m || !s || s < m) throw new Error('Tanggal selesai harus setelah tanggal mulai.');
  const bentrok = semua.find(x => String(x.no) !== String(row.No ?? '') && x.mulai <= s && x.selesai >= m);
  if (bentrok) throw new Error(`Bertabrakan dengan ${bentrok.tahunAjaran} ${bentrok.semester} (${bentrok.mulai} s.d. ${bentrok.selesai}).`);
  if (semua.some(x => String(x.no) !== String(row.No ?? '') && x.tahunAjaran === row['Tahun Ajaran'] && x.semester === row.Semester)) throw new Error(`${row['Tahun Ajaran']} semester ${row.Semester} sudah ada.`);
  return { ...row, Mulai: m, Selesai: s };
}

export default function PeriodeSemesterTab() {
  const { tahunAjaran, periodeSemester, refreshSemester, toast } = useAppData();
  const { currentUser } = useAuth();
  const [proses, setProses] = useState('');
  const [sinyal, setSinyal] = useState(0);

  // Buat 2 periode dari rentang tahun ajaran: Ganjil = mulai TA s.d. 31 Des; Genap = 1 Jan s.d. selesai TA.
  async function buatOtomatis(t) {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    const mulai = String(t.mulai || '').slice(0, 10); const selesai = String(t.selesai || '').slice(0, 10);
    if (!mulai || !selesai) { toast('Tanggal mulai/selesai tahun ajaran ini belum diisi di tab Tahun Ajaran.', 'error'); return; }
    const thn = mulai.slice(0, 4);
    const baris = [
      { 'Tahun Ajaran': t.label, Semester: 'Ganjil', Mulai: mulai, Selesai: `${thn}-12-31`, Keterangan: 'Dibuat otomatis' },
      { 'Tahun Ajaran': t.label, Semester: 'Genap', Mulai: `${Number(thn) + 1}-01-01`, Selesai: selesai, Keterangan: 'Dibuat otomatis' },
    ];
    setProses(t.label);
    try {
      for (const b of baris) await semesterApi.add(validasi(b, periodeSemester));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Buat Periode Semester', modul: 'Profil & Tahun Ajaran', detail: t.label });
      await refreshSemester(); setSinyal(x => x + 1);
      toast(`Periode semester ${t.label} dibuat. Sesuaikan tanggalnya kalau kalender sekolah berbeda.`);
    } catch (e) { toast(e.message, 'error'); } finally { setProses(''); }
  }

  const belumAda = tahunAjaran.filter(t => !periodeSemester.some(p => p.tahunAjaran === t.label));
  return (
    <>
      <AkademikBelumTersambung />
      <div className="card">
        <div className="card-head"><div><h3>Periode semester</h3><p>Kalau diatur, semua modul (presensi, nilai, rapor, laporan) menentukan semester dari tanggal ini. Kalau belum, dipakai aturan bawaan: Juli–Desember Ganjil, Januari–Juni Genap.</p></div></div>
        <div className="card-body">
          {!belumAda.length ? <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>Semua tahun ajaran sudah punya periode semester.</p> : (
            <div className="ringkas-bar">{belumAda.map(t => <button key={t.label} className="btn btn-sm" disabled={!!proses} onClick={() => buatOtomatis(t)}>{proses === t.label ? 'Membuat…' : `Buat periode ${t.label}`}</button>)}</div>
          )}
        </div>
      </div>
      <GenericStoredTable title="Daftar periode" subtitle="Edit tanggal kalau kalender pendidikan sekolah berbeda, mis. semester genap mulai pertengahan Januari."
        headers={['No', 'Tahun Ajaran', 'Semester', 'Mulai', 'Selesai', 'Keterangan']} fields={FIELDS} refreshSignal={sinyal}
        fetchFn={semesterApi.fetch} updateFn={r => semesterApi.update(validasi(r, periodeSemester))} deleteFn={semesterApi.remove}
        moduleLabel="Periode Semester" labelKey="Semester" target="akademik" onChanged={refreshSemester}
        searchFn={(r, t) => `${r['Tahun Ajaran']} ${r.Semester}`.toLowerCase().includes(t)} />
    </>
  );
}
