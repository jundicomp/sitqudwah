import { useMemo } from 'react';
import { useAppData } from '../../context/AppContext';
import { STATUS_PRESENSI, predikatNilai, labelRombel } from '../../db/akademikFields';
import { formatTanggalAngka } from '../../db/helpers';

const rata = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);
const judul = { fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--green-dark)', borderBottom: '2px solid var(--green-soft)', paddingBottom: 6, margin: '18px 0 10px' };

// Bagian akademik & kesiswaan di Portofolio Siswa (v1.38.0): rekap per semester, prestasi,
// pelanggaran, rapor, mutasi, dan peminjaman buku. Semua dari data yg sudah ada.
export default function PortofolioAkademikSiswa({ nisn }) {
  const { nilai, presensi, prestasi, pelanggaran, rapor, mutasi, sirkulasi, perkembangan } = useAppData();
  const d = useMemo(() => {
    const nil = nilai.filter(n => n.nisn === nisn && n.nilai !== null);
    const pres = presensi.filter(p => p.nisn === nisn);
    const periode = {};
    nil.forEach(n => { (periode[`${n.tahunAjaran}|${n.semester}`] ||= { nilai: [], pres: [] }).nilai.push(n); });
    rapor.filter(r => r.nisn === nisn).forEach(r => { (periode[`${r.tahunAjaran}|${r.semester}`] ||= { nilai: [], pres: [] }).rapor = r; });
    const semester = Object.entries(periode).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => {
      const [ta, sem] = k.split('|');
      const perMapel = {};
      v.nilai.forEach(n => { (perMapel[n.mapel] ||= []).push(n.nilai); });
      const r = rata(Object.values(perMapel).map(rata));
      return { ta, sem, mapel: Object.keys(perMapel).length, rata: r, rapor: v.rapor };
    });
    const hadir = Object.fromEntries(STATUS_PRESENSI.map(s => [s, pres.filter(p => p.status === s).length]));
    return {
      semester, hadir, totalPres: pres.length, telat: pres.filter(p => p.menitTerlambat > 0).length,
      prestasi: prestasi.filter(p => p.nisn === nisn).sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
      pelanggaran: pelanggaran.filter(p => p.nisn === nisn).sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
      perkembangan: perkembangan.filter(x => x.nisn === nisn).sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
      mutasi: mutasi.filter(m => m.nisn === nisn), pinjam: sirkulasi.filter(x => x.kodeAnggota === `S:${nisn}`).length,
    };
  }, [nisn, nilai, presensi, prestasi, pelanggaran, rapor, mutasi, sirkulasi, perkembangan]);

  if (!nisn) return <p style={{ fontSize: 13, color: 'var(--muted)' }}>Siswa ini belum punya NISN, data akademik tidak bisa ditautkan.</p>;
  return (
    <div>
      <div style={judul}>Rekam Akademik per Semester</div>
      {!d.semester.length ? <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Belum ada nilai atau rapor.</p> : (
        <table><thead><tr><th>Tahun Ajaran</th><th>Semester</th><th>Mapel Dinilai</th><th>Rata-rata</th><th>Rapor</th></tr></thead>
          <tbody>{d.semester.map(x => <tr key={x.ta + x.sem}><td>{x.ta}</td><td>{x.sem}</td><td>{x.mapel}</td><td>{x.rata ?? '—'} {x.rata !== null && <span className="badge badge-muted">{predikatNilai(x.rata)}</span>}</td>
            <td>{x.rapor ? <span className={`badge ${x.rapor.status === 'Terbit' ? 'badge-green' : 'badge-gold'}`}>{x.rapor.status}</span> : '—'}</td></tr>)}</tbody></table>
      )}
      <div style={judul}>Kehadiran (seluruh riwayat)</div>
      <div className="ringkas-bar">
        {STATUS_PRESENSI.map(s => <span key={s} className="badge badge-muted">{s} {d.hadir[s]}</span>)}
        {d.totalPres > 0 && <span className="badge badge-green">{Math.round((d.hadir.Hadir / d.totalPres) * 100)}% hadir</span>}
        {d.telat > 0 && <span className="badge badge-gold">Terlambat {d.telat}×</span>}
        {d.pinjam > 0 && <span className="badge badge-blue">Pinjam buku {d.pinjam}×</span>}
      </div>
      <div style={judul}>Prestasi ({d.prestasi.length})</div>
      {!d.prestasi.length ? <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Belum ada.</p> : (
        <ul className="warn-list">{d.prestasi.map(p => <li key={p.id}><b>{p.hasil}</b> {p.kegiatan} — {p.tingkatLomba}, {formatTanggalAngka(p.tanggal)}</li>)}</ul>
      )}
      <div style={judul}>Catatan Pelanggaran ({d.pelanggaran.length}{d.pelanggaran.length ? `, ${d.pelanggaran.reduce((a, p) => a + p.poin, 0)} poin` : ''})</div>
      {!d.pelanggaran.length ? <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Tidak ada.</p> : (
        <ul className="warn-list">{d.pelanggaran.map(p => <li key={p.id}>{formatTanggalAngka(p.tanggal)}: {p.jenis} ({p.kategori}, {p.poin} poin, {p.statusTL})</li>)}</ul>
      )}
      <div style={judul}>Catatan Perkembangan ({d.perkembangan.length})</div>
      {!d.perkembangan.length ? <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Belum ada.</p> : (
        <ul className="warn-list">{d.perkembangan.slice(0, 6).map(x => <li key={x.id}>{formatTanggalAngka(x.tanggal)} · <b>{x.aspek}</b>{x.arah ? ` (${x.arah})` : ''}: {x.catatan}</li>)}
          {d.perkembangan.length > 6 && <li style={{ color: 'var(--muted)' }}>…dan {d.perkembangan.length - 6} catatan lain di menu Catatan Perkembangan.</li>}</ul>
      )}
      {d.mutasi.length > 0 && (<>
        <div style={judul}>Mutasi</div>
        <ul className="warn-list">{d.mutasi.map(m => <li key={m.id}>{formatTanggalAngka(m.tanggal)}: {m.jenis}{m.sekolah ? ` — ${m.sekolah}` : ''} (dari {labelRombel(m.tingkat, m.rombel)})</li>)}</ul>
      </>)}
    </div>
  );
}
