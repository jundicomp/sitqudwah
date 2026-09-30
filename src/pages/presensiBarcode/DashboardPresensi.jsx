import { useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import InfoCard from '../../components/common/InfoCard';
import { AkademikBelumTersambung, Field, Kosong } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { siswaDiRombel, badgeHadir } from '../../db/akademikFields';
import { pegawaiAktif } from '../../db/kepegawaianFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatRupiah, formatTanggal } from '../../db/helpers';

export default function DashboardPresensi() {
  const { siswa, guru, presensi, presensiGuru, muatAkademik } = useAppData();
  const { rombelList } = useAkademikOptions();
  const [tanggal, setTanggal] = useState(sekarangWIB().tanggal);
  const [memuat, setMemuat] = useState(false);

  const d = useMemo(() => {
    const ps = presensi.filter(p => p.tanggal === tanggal);
    const pg = presensiGuru.filter(p => p.tanggal === tanggal);
    const byNisn = Object.fromEntries(ps.map(p => [p.nisn, p]));
    const byNama = Object.fromEntries(pg.map(p => [p.nama, p]));
    const siswaAktif = siswa.filter(s => s.status === 'Aktif');
    const pegawai = pegawaiAktif(guru);
    const hadirS = ps.filter(p => p.status === 'Hadir');
    const hadirG = pg.filter(p => p.status === 'Hadir' || p.status === 'Dinas Luar');
    const perKelas = rombelList.map(r => {
      const anggota = siswaDiRombel(siswa, r.tingkat, r.rombel);
      const rec = anggota.map(s => byNisn[s.nisn]).filter(Boolean);
      const c = (st) => rec.filter(x => x.status === st).length;
      return { ...r, jumlah: anggota.length, hadir: c('Hadir'), telat: rec.filter(x => x.status === 'Hadir' && x.menitTerlambat).length, sakit: c('Sakit'), izin: c('Izin'), alpha: c('Alpha'), belum: anggota.length - rec.length };
    });
    const telatList = [...hadirS.map(p => ({ nama: p.nama, info: `Kelas ${p.tingkat} · ${p.rombel}`, ...p })), ...pg.filter(p => p.menitTerlambat).map(p => ({ ...p, info: p.kategori }))]
      .filter(p => p.menitTerlambat).sort((a, b) => b.menitTerlambat - a.menitTerlambat);
    return {
      siswaAktif: siswaAktif.length, hadirS: hadirS.length, pegawai: pegawai.length, hadirG: hadirG.length,
      terlambat: telatList.length, denda: [...ps, ...pg].reduce((a, p) => a + (p.denda || 0), 0),
      scan: [...ps, ...pg].filter(p => p.metode === 'Barcode').length,
      perKelas, telatList, guruBelum: pegawai.filter(g => !byNama[g.nama]),
    };
  }, [siswa, guru, presensi, presensiGuru, rombelList, tanggal]);

  async function muatUlang() { setMemuat(true); try { await muatAkademik(true); } finally { setMemuat(false); } }

  return (
    <Page pageId="dashboard-presensi" title="Dashboard Rekapitulasi" path="Presensi Barcode / Dashboard Rekapitulasi">
      <AkademikBelumTersambung />
      <div className="filter-bar">
        <Field label="Tanggal"><input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} /></Field>
        <button className="btn" onClick={muatUlang} disabled={memuat}>{memuat ? 'Memuat…' : '↻ Muat ulang data'}</button>
        <span style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>{formatTanggal(tanggal + 'T00:00:00')}</span>
      </div>
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={`${d.hadirS}/${d.siswaAktif}`} label="Siswa hadir" color="c-green" />
        <InfoCard value={`${d.hadirG}/${d.pegawai}`} label="Guru & staff hadir (termasuk dinas luar)" color="c-blue" />
        <InfoCard value={d.terlambat} label="Terlambat" color="c-gold" />
        <InfoCard value={formatRupiah(d.denda)} label={`Total denda · ${d.scan} lewat scan`} color="c-red" valueFontSize={20} />
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Kehadiran siswa per kelas</h3><p>"Belum tercatat" = belum scan dan belum diisi manual.</p></div></div>
        <div className="card-body table-scroll">
          {!d.perKelas.length ? <Kosong>Belum ada data kelas.</Kosong> : (
            <table>
              <thead><tr><th>Kelas</th><th>Siswa</th><th>Hadir</th><th>Terlambat</th><th>Sakit</th><th>Izin</th><th>Alpha</th><th>Belum Tercatat</th><th>% Hadir</th></tr></thead>
              <tbody>
                {d.perKelas.map(k => {
                  const persen = k.jumlah ? Math.round((k.hadir / k.jumlah) * 100) : null;
                  return (
                    <tr key={k.key}>
                      <td><b>{k.label}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{k.wali}</div></td>
                      <td>{k.jumlah}</td><td>{k.hadir}</td><td>{k.telat || '—'}</td><td>{k.sakit || '—'}</td><td>{k.izin || '—'}</td><td>{k.alpha ? <span className="badge badge-red">{k.alpha}</span> : '—'}</td>
                      <td>{k.belum ? <span className="badge badge-muted">{k.belum}</span> : '0'}</td>
                      <td>{persen === null ? '—' : <span className={`badge ${badgeHadir(persen)}`}>{persen}%</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Terlambat ({d.telatList.length})</h3><p>Siswa dan guru/staff, urut dari yang paling lama.</p></div></div>
        <div className="card-body table-scroll">
          {!d.telatList.length ? <Kosong>Tidak ada yang terlambat.</Kosong> : (
            <table><thead><tr><th>Nama</th><th>Kelas / Kategori</th><th>Masuk</th><th>Terlambat</th><th>Denda</th></tr></thead>
              <tbody>{d.telatList.map((p, i) => <tr key={p.nama + i}><td><b>{p.nama}</b></td><td>{p.info}</td><td>{p.jamMasuk}</td><td>{p.menitTerlambat} menit</td><td>{formatRupiah(p.denda)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Guru &amp; staff belum tercatat ({d.guruBelum.length})</h3></div></div>
        <div className="card-body">
          {!d.guruBelum.length ? <Kosong>Semua guru dan staff sudah tercatat.</Kosong> : (
            <div className="ringkas-bar">{d.guruBelum.map(g => <span key={g.nama} className="badge badge-muted">{g.nama}</span>)}</div>
          )}
        </div>
      </div>
    </Page>
  );
}
