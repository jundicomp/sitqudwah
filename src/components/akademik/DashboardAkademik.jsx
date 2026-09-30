import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import InfoCard from '../common/InfoCard';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isConfigured } from '../../services/googleSheets';
import { semesterDariTanggal } from '../../db/akademikFields';
import { pegawaiAktif } from '../../db/kepegawaianFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatTanggalAngka } from '../../db/helpers';
import { pengumumanAktif } from '../../db/komunikasiFields';

// Kartu ringkasan Akademik, Kepegawaian & Kesiswaan utk Dashboard utama (v1.36.0).
export default function DashboardAkademik() {
  const { siswa, guru, presensi, presensiGuru, nilai, prestasi, pelanggaran, agenda, pengumuman, tahunAjaranAktif } = useAppData();
  const { canAccess } = useAuth();
  const { tanggal } = sekarangWIB();
  const d = useMemo(() => {
    const ta = tahunAjaranAktif?.label;
    const sem = semesterDariTanggal(tanggal);
    const ps = presensi.filter(p => p.tanggal === tanggal);
    const pg = presensiGuru.filter(p => p.tanggal === tanggal);
    const nil = nilai.filter(n => n.tahunAjaran === ta && n.semester === sem && n.nilai !== null).map(n => n.nilai);
    const batas = new Date(new Date(tanggal + 'T00:00:00').getTime() + 14 * 864e5).toISOString().slice(0, 10);
    return {
      hadirS: ps.filter(p => p.status === 'Hadir').length, aktifS: siswa.filter(s => s.status === 'Aktif').length,
      hadirG: pg.filter(p => p.status === 'Hadir' || p.status === 'Dinas Luar').length, aktifG: pegawaiAktif(guru).length,
      telat: [...ps, ...pg].filter(p => p.menitTerlambat > 0).length,
      rataNilai: nil.length ? Math.round((nil.reduce((a, b) => a + b, 0) / nil.length) * 10) / 10 : '—', sem,
      prestasi: prestasi.filter(p => p.tahunAjaran === ta).length,
      kasusTerbuka: pelanggaran.filter(p => p.statusTL !== 'Selesai').length,
      info: pengumuman.filter(p => pengumumanAktif(p, tanggal)).sort((a, b) => (b.penting - a.penting) || b.terbit.localeCompare(a.terbit)).slice(0, 3),
      agenda: agenda.filter(a => a.selesai >= tanggal && a.mulai <= batas).sort((a, b) => a.mulai.localeCompare(b.mulai)).slice(0, 5),
    };
  }, [siswa, guru, presensi, presensiGuru, nilai, prestasi, pelanggaran, agenda, pengumuman, tahunAjaranAktif, tanggal]);

  if (!isConfigured('akademik')) return null;
  const tautan = [['grafik-nilai', '/grafik-nilai', 'Grafik nilai'], ['grafik-absensi', '/grafik-absensi', 'Grafik absensi'], ['dashboard-presensi', '/dashboard-presensi', 'Presensi hari ini'], ['export-laporan', '/export-laporan', 'Export laporan']].filter(([p]) => canAccess(p));

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>📘 Akademik &amp; Kesiswaan</h3><p>Kehadiran hari ini, nilai semester {d.sem}, dan agenda dua minggu ke depan.</p></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{tautan.map(([, to, label]) => <NavLink key={to} to={to} className="btn btn-sm">{label}</NavLink>)}</div>
      </div>
      <div className="card-body">
        <div className="info-grid" style={{ marginBottom: 14 }}>
          <InfoCard color="c-green" value={`${d.hadirS}/${d.aktifS}`} label="Siswa hadir hari ini" />
          <InfoCard color="c-blue" value={`${d.hadirG}/${d.aktifG}`} label="Guru & staff hadir hari ini" />
          <InfoCard color="c-gold" value={d.telat} label="Terlambat hari ini" />
          <InfoCard color="c-purple" value={d.rataNilai} label={`Rata-rata nilai semester ${d.sem}`} />
          <InfoCard color="c-green" value={d.prestasi} label="Prestasi tahun ajaran ini" />
          <InfoCard color="c-red" value={d.kasusTerbuka} label="Kasus pelanggaran belum selesai" />
        </div>
        {d.info.length > 0 && (<>
          <h4 style={{ margin: '0 0 6px', color: 'var(--green-dark)' }}>Pengumuman</h4>
          <ul className="warn-list" style={{ marginBottom: 12 }}>{d.info.map(p => <li key={p.id}>{p.penting && '📌 '}<b>{p.judul}</b> <span style={{ color: 'var(--muted)' }}>— untuk {p.ditujukan}, {formatTanggalAngka(p.terbit)}</span></li>)}</ul>
        </>)}
        <h4 style={{ margin: '0 0 6px', color: 'var(--green-dark)' }}>Agenda terdekat</h4>
        {!d.agenda.length ? <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>Tidak ada agenda dalam dua minggu ke depan.</p> : (
          <ul className="warn-list">{d.agenda.map(a => <li key={a.id}><b>{a.judul}</b> — {formatTanggalAngka(a.mulai)}{a.selesai !== a.mulai ? ` s.d. ${formatTanggalAngka(a.selesai)}` : ''} <span className="badge badge-muted">{a.kategori}</span></li>)}</ul>
        )}
      </div>
    </div>
  );
}
