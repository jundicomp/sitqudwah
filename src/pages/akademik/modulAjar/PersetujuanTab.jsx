import { useMemo, useState } from 'react';
import DataTable from '../../../components/common/DataTable';
import { Field, Select } from '../../../components/akademik/shared';
import { useAppData } from '../../../context/AppContext';
import useAkademikOptions from '../../../hooks/useAkademikOptions';
import { rombelPaud } from '../../../components/paud/shared';
import { namaTingkat } from '../../../config/jenjang';
import { BADGE_STATUS_MODUL, STATUS_MODUL } from '../../../db/modulAjarFields';
import { formatTanggalAngka } from '../../../db/helpers';
import { RencanaPaudEditor } from './RencanaPaudTab';

const tgl = (iso) => (iso ? formatTanggalAngka(String(iso).slice(0, 10)) : '');

// Modul Ajar › Persetujuan Kepala Sekolah: antrean modul ajar & rencana tema PAUD yang diajukan guru.
export default function PersetujuanTab({ onPeriksaModul }) {
  const { modulAjar, rencanaPaud } = useAppData();
  const { rombelList } = useAkademikOptions();
  const [status, setStatus] = useState('Diajukan');
  const [jenis, setJenis] = useState('');
  const [guru, setGuru] = useState('');
  const [rencana, setRencana] = useState(null);

  const semuaBaris = useMemo(() => [
    ...modulAjar.map(m => ({ key: 'M' + m.id, jenis: 'Modul Ajar', judul: m.judul, sub: m.isi.bab ? `Bab ${m.isi.bab}` : '', bidang: m.mapel, kelas: `${namaTingkat(m.tingkat)}${m.rombel ? ' · ' + m.rombel : ''}`, guru: m.guru, ta: `${m.tahunAjaran} ${m.semester}`, waktu: m.diubahPada, status: m.status, data: m })),
    ...rencanaPaud.map(r => ({ key: 'R' + r.id, jenis: 'Rencana PAUD', judul: r.tema, sub: [r.subtema, r.minggu && `Minggu ke-${r.minggu}`].filter(Boolean).join(' · '), bidang: 'Tema PAUD', kelas: `${namaTingkat(r.tingkat)} ${r.rombel}`, guru: r.guru, ta: `${r.tahunAjaran} ${r.semester}`, waktu: r.diubahPada, status: r.status, data: r })),
  ], [modulAjar, rencanaPaud]);
  const rows = semuaBaris.filter(x => (!status || x.status === status) && (!jenis || x.jenis === jenis) && (!guru || x.guru === guru));
  const jml = (st) => semuaBaris.filter(x => x.status === st).length;

  const columns = [
    { key: 'jenis', label: 'Jenis', sortable: true, render: r => <span className={`badge ${r.jenis === 'Modul Ajar' ? 'badge-blue' : 'badge-gold'}`}>{r.jenis}</span> },
    { key: 'judul', label: 'Judul', sortable: true, render: r => <><b>{r.judul || 'Tanpa judul'}</b>{r.sub ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.sub}</div> : null}</> },
    { key: 'bidang', label: 'Mapel / Tema', sortable: true },
    { key: 'kelas', label: 'Kelas', sortable: true },
    { key: 'guru', label: 'Guru', sortable: true },
    { key: 'ta', label: 'Semester', sortable: true },
    { key: 'waktu', label: 'Terakhir diubah', sortable: true, render: r => tgl(r.waktu) || '—' },
    { key: 'status', label: 'Status', sortable: true, render: r => <span className={`badge ${BADGE_STATUS_MODUL[r.status] || 'badge-muted'}`}>{r.status}</span> },
    { key: 'aksi', label: '', render: r => <button className={`btn btn-sm ${r.status === 'Diajukan' ? 'btn-primary' : ''}`} onClick={() => (r.jenis === 'Modul Ajar' ? onPeriksaModul(r.data) : setRencana(r.data))}>{r.status === 'Diajukan' ? 'Periksa' : 'Lihat'}</button> },
  ];

  return (
    <div className="card">
      <div className="card-head"><div><h3>Persetujuan kepala sekolah</h3><p>Modul ajar dan rencana tema PAUD yang diajukan guru. Buka, periksa lewat pratinjau, lalu setujui atau kembalikan dengan catatan. Yang disetujui terkunci dan dicetak dari arsipnya.</p></div></div>
      <div className="card-body">
        <div className="ringkas-bar" style={{ marginBottom: 10 }}>
          <button type="button" className={`badge ${status === 'Diajukan' ? 'badge-blue' : 'badge-muted'}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => setStatus('Diajukan')}>Menunggu {jml('Diajukan')}</button>
          <button type="button" className={`badge ${status === 'Dikembalikan' ? 'badge-gold' : 'badge-muted'}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => setStatus('Dikembalikan')}>Dikembalikan {jml('Dikembalikan')}</button>
          <button type="button" className={`badge ${status === 'Disetujui' ? 'badge-green' : 'badge-muted'}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => setStatus('Disetujui')}>Disetujui {jml('Disetujui')}</button>
        </div>
        <div className="filter-bar">
          <Field label="Status"><Select value={status} onChange={setStatus} options={STATUS_MODUL} placeholder="Semua" /></Field>
          <Field label="Jenis"><Select value={jenis} onChange={setJenis} options={['Modul Ajar', 'Rencana PAUD']} placeholder="Semua" /></Field>
          <Field label="Guru"><Select value={guru} onChange={setGuru} options={[...new Set(semuaBaris.map(x => x.guru).filter(Boolean))].sort()} placeholder="Semua" /></Field>
        </div>
        <DataTable columns={columns} data={rows} rowKey={r => r.key} defaultSortKey="waktu" defaultSortDir="desc" pageSize={25}
          searchFn={(r, t) => `${r.judul} ${r.sub} ${r.bidang} ${r.guru}`.toLowerCase().includes(t)}
          emptyMessage={status === 'Diajukan' ? 'Tidak ada yang menunggu persetujuan. 🎉' : 'Tidak ada data.'} />
      </div>
      {rencana && <RencanaPaudEditor key={rencana.id} rencana={rencana} mulaiPratinjau rombelBoleh={rombelPaud(rombelList)} onClose={() => setRencana(null)} onSelesaiPeriksa={() => setRencana(null)} />}
    </div>
  );
}
