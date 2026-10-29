import { useMemo, useState } from 'react';
import DataTable from '../../../components/common/DataTable';
import { BannerIdSiswa } from '../../../components/paud/shared';
import { useAppData } from '../../../context/AppContext';
import { siswaDiRombel } from '../../../db/akademikFields';
import { BADGE_STATUS_PAUD, cekKelengkapan } from '../../../db/raporPaudFields';
import CetakRaporPaud from './CetakRaporPaud';
import RaporPaudEditor from './RaporPaudEditor';

// Daftar rapor PAUD satu rombel (format PAUD otomatis dipakai utk kelas berjenjang PAUD).
export default function RaporPaudKelas({ ta, semester, rombel }) {
  const { siswa, raporPaud, asesmenPaud, pengaturanPaud: p } = useAppData();
  const [buka, setBuka] = useState(null);
  const [cetakSemua, setCetakSemua] = useState(false);

  const anak = useMemo(() => siswaDiRombel(siswa, rombel.tingkat, rombel.rombel), [siswa, rombel]);
  const rows = useMemo(() => anak.map(s => {
    const r = raporPaud.find(x => x.idSiswa && x.idSiswa === s.idSiswa && x.tahunAjaran === ta && x.semester === semester) || null;
    const jml = asesmenPaud.filter(x => (s.idSiswa ? x.idSiswa === s.idSiswa : x.nisn && x.nisn === s.nisn) && x.tahunAjaran === ta && x.semester === semester).length;
    return { id: s.id, siswa: s, nama: s.nama, rapor: r, status: r?.status || 'Belum Diisi', catatan: jml, kurang: r ? cekKelengkapan(p, r.isian).length : null };
  }), [anak, raporPaud, asesmenPaud, ta, semester, p]);

  const terbit = rows.filter(r => r.status === 'Terbit' && r.rapor?.arsip);
  const jml = (st) => rows.filter(r => r.status === st).length;
  const dibuka = rows.find(r => r.id === buka);


  const columns = [
    { key: 'nama', label: 'Nama Anak', sortable: true, render: r => <><b>{r.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.siswa.idSiswa || 'belum ada ID'}{r.siswa.nisn ? ` · NISN ${r.siswa.nisn}` : ''}</div></> },
    { key: 'catatan', label: 'Catatan Penilaian', sortable: true, render: r => r.catatan ? `${r.catatan} catatan` : <span style={{ color: 'var(--muted)' }}>belum ada</span> },
    { key: 'kurang', label: 'Kelengkapan', sortable: true, accessor: r => r.kurang ?? 99, render: r => r.kurang === null ? '—' : r.kurang === 0 ? <span className="badge badge-green">lengkap</span> : <span className="badge badge-gold">{r.kurang} bagian kurang</span> },
    { key: 'status', label: 'Status', sortable: true, render: r => <span className={`badge ${BADGE_STATUS_PAUD[r.status]}`}>{r.status}</span> },
    { key: 'aksi', label: '', render: r => <button className="btn btn-sm" onClick={() => setBuka(r.id)} disabled={!r.siswa.idSiswa} title={r.siswa.idSiswa ? '' : 'Buat ID Siswa dulu'}>{r.status === 'Terbit' ? 'Lihat rapor' : 'Isi rapor'}</button> },
  ];

  return (
    <>
      <BannerIdSiswa daftar={anak} />
      <div className="ringkas-bar" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="badge badge-blue">Format PAUD</span>
          <span className="badge badge-green">Terbit {jml('Terbit')}</span>
          <span className="badge badge-blue">Diajukan {jml('Diajukan')}</span>
          <span className="badge badge-gold">Draft {jml('Draft')}</span>
          <span className="badge badge-muted">Belum diisi {jml('Belum Diisi')}</span>
        </div>
        <button className="btn btn-sm" disabled={!terbit.length} onClick={() => setCetakSemua(true)}>🖨️ Cetak semua yang terbit ({terbit.length})</button>
      </div>
      <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="nama" pageSize={50}
        searchFn={(r, t) => `${r.nama} ${r.siswa.nisn} ${r.siswa.idSiswa}`.toLowerCase().includes(t)} emptyMessage="Tidak ada siswa aktif di rombel ini." />
      {dibuka && <RaporPaudEditor key={dibuka.id + ta + semester} siswa={dibuka.siswa} rombel={rombel} ta={ta} semester={semester} record={dibuka.rapor} onClose={() => setBuka(null)} />}
      {cetakSemua && <CetakRaporPaud dokumen={terbit.map(r => r.rapor.arsip)} onSelesai={() => setCetakSemua(false)} />}
    </>
  );
}
