import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { jenjangDariTingkat, formatRaporTingkat, SEMUA_JENJANG } from '../../config/jenjang';
import { labelRombel, predikatNilai, semesterDariTanggal, dalamRentang, badgePredikat } from '../../db/akademikFields';
import { cocokSiswa, STATUS_RIWAYAT_BADGE } from '../../db/riwayatAkademikFields';
import { labelKeputusan } from '../../db/kenaikanKelasHelpers';
import { BADGE_STATUS_PAUD } from '../../db/raporPaudFields';
import { formatTanggalAngka } from '../../db/helpers';
import { GaleriFoto } from '../paud/shared';
import CetakRaporPaud from '../../pages/akademik/raporPaud/CetakRaporPaud';

const rata = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);
const urutSem = (s) => (s === 'Genap' ? 2 : 1);
const WARNA_JENJANG = ['#1C7A3C', '#1E4FA0', '#B7791F', '#7B3FA0', '#B23B2E'];

// Linimasa perjalanan 1 anak di sekolah, per semester, dari KB/TK sampai SD (v1.47.0).
// Disambung lewat ID Siswa (PAUD) dan NISN (data nilai/presensi lama).
export default function LinimasaSiswa({ siswa: s }) {
  const {
    riwayatAkademik, raporPaud, rapor, nilai, presensi, asesmenPaud, prestasi, perkembangan, tahunAjaran,
  } = useAppData();
  const [cetak, setCetak] = useState(null);
  const [terbuka, setTerbuka] = useState({});

  const data = useMemo(() => {
    const punyaNisn = (x) => !!s.nisn && x.nisn === s.nisn;
    const punyaId = (x) => !!s.idSiswa && x.idSiswa === s.idSiswa;
    const taDariTanggal = (tgl) => tahunAjaran.find(t => dalamRentang(tgl, t.mulai, t.selesai))?.label || '';
    const per = {};
    const slot = (ta, sem) => { if (!ta || !sem) return null; return (per[`${ta}|${sem}`] ||= { ta, sem, nilai: [], hadir: { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0 }, prestasi: [], catatan: 0, foto: [], asesmen: [] }); };

    const riwayat = riwayatAkademik.filter(r => cocokSiswa(r, s));
    raporPaud.filter(punyaId).forEach(r => { const x = slot(r.tahunAjaran, r.semester); if (x) x.raporPaud = r; });
    rapor.filter(punyaNisn).forEach(r => { const x = slot(r.tahunAjaran, r.semester); if (x) x.raporSd = r; });
    nilai.filter(n => punyaNisn(n) && n.nilai !== null).forEach(n => { const x = slot(n.tahunAjaran, n.semester); if (x) { x.nilai.push(n); x.tingkat ||= n.tingkat; x.rombel ||= n.rombel; } });
    asesmenPaud.filter(a => punyaId(a) || (!a.idSiswa && punyaNisn(a))).forEach(a => {
      const x = slot(a.tahunAjaran, a.semester); if (!x) return;
      x.asesmen.push(a); x.catatan++; x.foto.push(...a.foto); x.tingkat ||= a.tingkat; x.rombel ||= a.rombel;
    });
    perkembangan.filter(punyaNisn).forEach(p => { const x = slot(p.tahunAjaran, p.semester); if (x) x.catatan++; });
    presensi.filter(punyaNisn).forEach(p => { const x = slot(taDariTanggal(p.tanggal), semesterDariTanggal(p.tanggal)); if (x && x.hadir[p.status] !== undefined) x.hadir[p.status]++; });
    prestasi.filter(punyaNisn).forEach(p => { const x = slot(p.tahunAjaran || taDariTanggal(p.tanggal), semesterDariTanggal(p.tanggal)); if (x) x.prestasi.push(p); });
    // Tahun ajaran yg ada di riwayat tapi belum punya data apa pun -> tetap tampil (semester Ganjil).
    riwayat.forEach(r => { if (!Object.values(per).some(x => x.ta === r.tahunAjaran)) slot(r.tahunAjaran, 'Ganjil'); });

    const list = Object.values(per).map(x => {
      const rw = riwayat.find(r => r.tahunAjaran === x.ta);
      const ar = x.raporPaud?.status === 'Terbit' ? x.raporPaud.arsip : null;
      const tingkat = rw?.kelasTingkat || x.raporPaud?.tingkat || x.raporSd?.tingkat || x.tingkat || '';
      const rombel = rw?.rombel || x.raporPaud?.rombel || x.raporSd?.rombel || x.rombel || '';
      const perMapel = {};
      x.nilai.forEach(n => { (perMapel[n.mapel] ||= []).push(n.nilai); });
      const totalHadir = Object.values(x.hadir).reduce((a, b) => a + b, 0);
      return {
        ...x, tingkat, rombel, jenjang: jenjangDariTingkat(tingkat), paud: tingkat ? formatRaporTingkat(tingkat) === 'PAUD' : !!x.raporPaud || x.asesmen.length > 0,
        riwayat: rw, arsip: ar, capaian: ar ? ar.elemen.filter(e => e.capaian).map(e => ({ nama: e.nama, kode: e.capaian })) : [],
        fotoRapor: ar ? ar.elemen.flatMap(e => e.foto) : [],
        rata: rata(Object.values(perMapel).map(rata)), jmlMapel: Object.keys(perMapel).length,
        persenHadir: totalHadir ? Math.round((x.hadir.Hadir / totalHadir) * 100) : null, totalHadir,
      };
    }).sort((a, b) => a.ta.localeCompare(b.ta) || urutSem(a.sem) - urutSem(b.sem));

    // Keputusan akhir tahun (naik / lanjut jenjang / lulus) cuma ditampilkan di semester terakhir tahun itu.
    list.forEach((x, i) => { x.akhirTahun = !list.slice(i + 1).some(y => y.ta === x.ta); });
    const fotoSemua = [...new Set(list.flatMap(x => [...x.fotoRapor, ...x.foto]))];
    const jenjangDilalui = [...new Set(list.map(x => x.jenjang).filter(Boolean))];
    return {
      list, jenjangDilalui, fotoSemua,
      raporTerbit: list.filter(x => x.raporPaud?.status === 'Terbit' || x.raporSd?.status === 'Terbit').length,
      jmlPrestasi: list.reduce((a, x) => a + x.prestasi.length, 0),
      sejak: list[0]?.ta || '',
    };
  }, [s, riwayatAkademik, raporPaud, rapor, nilai, presensi, asesmenPaud, prestasi, perkembangan, tahunAjaran]);

  const urutanJenjang = SEMUA_JENJANG.map(j => j.kode);
  const warna = (kode) => WARNA_JENJANG[Math.max(0, urutanJenjang.indexOf(kode)) % WARNA_JENJANG.length];

  if (!data.list.length) {
    return <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada jejak akademik untuk anak ini (riwayat kelas, penilaian, nilai, presensi, atau rapor).</p>;
  }

  return (
    <div className="lini">
      <div className="lini-ringkas">
        <div><b>{data.sejak}</b><span>mulai tercatat</span></div>
        <div><b>{data.jenjangDilalui.join(' → ') || '—'}</b><span>jenjang dilalui</span></div>
        <div><b>{data.list.length}</b><span>semester</span></div>
        <div><b>{data.raporTerbit}</b><span>rapor terbit</span></div>
        <div><b>{data.jmlPrestasi}</b><span>prestasi</span></div>
        <div><b>{data.fotoSemua.length}</b><span>foto kegiatan</span></div>
      </div>

      <ol className="lini-list">
        {data.list.map((x, i) => {
          const kunci = `${x.ta}|${x.sem}`;
          const foto = [...new Set([...x.fotoRapor, ...x.foto])];
          const gantiJenjang = i > 0 && x.jenjang && data.list[i - 1].jenjang && data.list[i - 1].jenjang !== x.jenjang;
          return (
            <li key={kunci} className="lini-item">
              {gantiJenjang && <div className="lini-jenjang-baru">Masuk jenjang {x.jenjang}</div>}
              <span className="lini-titik" style={{ background: warna(x.jenjang) }} aria-hidden="true" />
              <div className="lini-kartu">
                <div className="lini-head">
                  <div>
                    <div className="lini-periode">{x.ta} · Semester {x.sem === 'Genap' ? 'II' : 'I'}</div>
                    <div className="lini-kelas">{x.tingkat ? labelRombel(x.tingkat, x.rombel) : 'Kelas tidak tercatat'}
                      {x.jenjang && <span className="lini-chip" style={{ background: warna(x.jenjang) }}>{x.jenjang}</span>}</div>
                  </div>
                  <div className="lini-aksi no-print">
                    {x.raporPaud && <span className={`badge ${BADGE_STATUS_PAUD[x.raporPaud.status] || 'badge-muted'}`}>Rapor {x.raporPaud.status}</span>}
                    {x.raporSd && <span className={`badge ${x.raporSd.status === 'Terbit' ? 'badge-green' : 'badge-gold'}`}>Rapor {x.raporSd.status}</span>}
                    {x.arsip && <button className="btn btn-sm" onClick={() => setCetak([x.arsip])}>🖨️ Rapor</button>}
                  </div>
                </div>

                <div className="lini-isi">
                  {x.paud && x.capaian.length > 0 && (
                    <div className="lini-baris">{x.capaian.map(c => <span key={c.nama} className="lini-capaian" title={c.nama}><span>{c.nama}</span><b>{c.kode}</b></span>)}</div>
                  )}
                  {x.paud && !x.capaian.length && x.catatan > 0 && <div className="lini-baris lini-redup">{x.catatan} catatan penilaian · rapor belum terbit</div>}
                  {!x.paud && x.rata !== null && (
                    <div className="lini-baris">Rata-rata <b>{x.rata}</b> <span className={`badge ${badgePredikat(predikatNilai(x.rata))}`}>{predikatNilai(x.rata)}</span> dari {x.jmlMapel} mapel</div>
                  )}
                  <div className="lini-baris lini-kecil">
                    {x.persenHadir !== null && <span>Kehadiran <b>{x.persenHadir}%</b> ({x.hadir.Sakit} S · {x.hadir.Izin} I · {x.hadir.Alpha} A)</span>}
                    {x.catatan > 0 && <span>{x.catatan} catatan guru</span>}
                    {x.akhirTahun && x.riwayat && x.riwayat.status !== 'Aktif' && <span className={`badge ${STATUS_RIWAYAT_BADGE[x.riwayat.status] || 'badge-muted'}`}>{labelKeputusan(x.riwayat.status)}</span>}
                    {x.akhirTahun && x.riwayat?.keterangan && <span className="lini-redup">{x.riwayat.keterangan}</span>}
                  </div>
                  {x.prestasi.length > 0 && (
                    <ul className="lini-prestasi">{x.prestasi.map(p => <li key={p.id}>🏆 <b>{p.hasil}</b> {p.kegiatan}{p.tingkatLomba ? ` — ${p.tingkatLomba}` : ''} <span className="lini-redup">({formatTanggalAngka(p.tanggal)})</span></li>)}</ul>
                  )}
                  {foto.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <GaleriFoto foto={terbuka[kunci] ? foto : foto.slice(0, 4)} />
                      {foto.length > 4 && <button className="btn btn-sm no-print" style={{ marginTop: 6 }} onClick={() => setTerbuka(t => ({ ...t, [kunci]: !t[kunci] }))}>{terbuka[kunci] ? 'Tampilkan lebih sedikit' : `+ ${foto.length - 4} foto lainnya`}</button>}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {cetak && <CetakRaporPaud dokumen={cetak} onSelesai={() => setCetak(null)} />}
    </div>
  );
}
