import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Page from '../../components/layout/Page';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import InfoCard from '../../components/common/InfoCard';
import { AkademikBelumTersambung, Field, Select } from '../../components/akademik/shared';
import { ChartCard, Baris, WARNA, WARNA_STATUS } from '../../components/akademik/charts';
import { useAppData } from '../../context/AppContext';
import { dalamRentang, STATUS_PRESENSI, labelRombel } from '../../db/akademikFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const persen = (h, t) => (t ? Math.round((h / t) * 1000) / 10 : null);

export default function GrafikAbsensi() {
  const { presensi, presensiGuru, tahunAjaranAktif } = useAppData();
  const { rombelList } = useAkademikOptions();
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(sekarangWIB().tanggal);
  const [rombelKey, setRombelKey] = useState('');
  useEffect(() => { if (!dari && tahunAjaranAktif?.mulai) setDari(String(tahunAjaranAktif.mulai).slice(0, 10)); }, [tahunAjaranAktif, dari]);

  const d = useMemo(() => {
    const rb = rombelList.find(r => r.key === rombelKey);
    const ps = presensi.filter(p => dalamRentang(p.tanggal, dari, sampai) && STATUS_PRESENSI.includes(p.status) && (!rb || (p.tingkat === rb.tingkat && p.rombel === rb.rombel)));
    const pg = presensiGuru.filter(p => dalamRentang(p.tanggal, dari, sampai));
    const hadirG = (p) => p.status === 'Hadir' || p.status === 'Dinas Luar';
    const perTgl = {};
    ps.forEach(p => { const x = (perTgl[p.tanggal] ||= { t: 0, h: 0, gt: 0, gh: 0 }); x.t++; if (p.status === 'Hadir') x.h++; });
    pg.forEach(p => { const x = (perTgl[p.tanggal] ||= { t: 0, h: 0, gt: 0, gh: 0 }); x.gt++; if (hadirG(p)) x.gh++; });
    const tren = Object.keys(perTgl).sort().map(t => ({ tgl: `${t.slice(8, 10)}/${t.slice(5, 7)}`, Siswa: persen(perTgl[t].h, perTgl[t].t), Guru: persen(perTgl[t].gh, perTgl[t].gt) }));
    const perHari = [1, 2, 3, 4, 5, 6].map(i => {
      const r = ps.filter(p => new Date(p.tanggal + 'T00:00:00').getDay() === i);
      return { hari: HARI[i], '% Hadir': persen(r.filter(p => p.status === 'Hadir').length, r.length), Alpha: r.filter(p => p.status === 'Alpha').length };
    }).filter(x => x['% Hadir'] !== null);
    const perKelas = rombelList.map(r => {
      const x = ps.filter(p => p.tingkat === r.tingkat && p.rombel === r.rombel);
      return { kelas: labelRombel(r.tingkat, r.rombel).replace('Kelas ', ''), '% Hadir': persen(x.filter(p => p.status === 'Hadir').length, x.length) };
    }).filter(x => x['% Hadir'] !== null);
    const komposisi = STATUS_PRESENSI.map(s => ({ name: s, value: ps.filter(p => p.status === s).length })).filter(x => x.value);
    const alphaPer = {};
    ps.filter(p => p.status === 'Alpha').forEach(p => { (alphaPer[p.nisn] ||= { nama: p.nama, kelas: labelRombel(p.tingkat, p.rombel), n: 0 }).n++; });
    const telat = ps.filter(p => p.menitTerlambat > 0).length;
    return {
      persenSiswa: persen(ps.filter(p => p.status === 'Hadir').length, ps.length), persenGuru: persen(pg.filter(hadirG).length, pg.length),
      hari: Object.keys(perTgl).length, telat, tren, perHari, perKelas, komposisi,
      alphaTop: Object.values(alphaPer).sort((a, b) => b.n - a.n).slice(0, 10),
    };
  }, [presensi, presensiGuru, dari, sampai, rombelKey, rombelList]);

  return (
    <Page pageId="grafik-absensi" title="Grafik Absensi" path="Laporan & Grafik / Grafik Absensi">
      <AkademikBelumTersambung />
      <div className="filter-bar">
        <Field label="Dari"><input type="date" value={dari} onChange={e => setDari(e.target.value)} /></Field>
        <Field label="Sampai"><input type="date" value={sampai} onChange={e => setSampai(e.target.value)} /></Field>
        <Field label="Kelas / Rombel" grow><Select value={rombelKey} onChange={setRombelKey} placeholder="Semua kelas" options={rombelList.map(r => ({ value: r.key, label: r.label }))} /></Field>
      </div>
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={d.persenSiswa === null ? '—' : `${d.persenSiswa}%`} label="Kehadiran siswa" color="c-green" />
        <InfoCard value={d.persenGuru === null ? '—' : `${d.persenGuru}%`} label="Kehadiran guru & staff" color="c-blue" />
        <InfoCard value={d.hari} label="Hari tercatat" color="c-purple" />
        <InfoCard value={d.telat} label="Kali siswa terlambat (scan)" color="c-gold" />
      </div>
      <ChartCard judul="Tren kehadiran harian" sub="Persentase hadir per tanggal; guru termasuk dinas luar." tinggi={280} kosong={!d.tren.length && 'Belum ada presensi di rentang ini.'}>
        <LineChart data={d.tren}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="tgl" tick={{ fontSize: 11 }} minTickGap={16} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={v => (v === null ? '—' : `${v}%`)} /><Legend />
          <Line type="monotone" dataKey="Siswa" stroke={WARNA.hijau} strokeWidth={2.5} dot={false} connectNulls />
          <Line type="monotone" dataKey="Guru" stroke={WARNA.biru} strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ChartCard>
      <Baris>
        <ChartCard judul="Kehadiran per hari dalam seminggu" sub="Membantu melihat pola, mis. Senin/Jumat lebih banyak absen." kosong={!d.perHari.length && 'Belum ada data.'}>
          <BarChart data={d.perHari}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="hari" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="p" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis yAxisId="a" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip /><Legend />
            <Bar yAxisId="p" dataKey="% Hadir" fill={WARNA.hijau} radius={[3, 3, 0, 0]} />
            <Bar yAxisId="a" dataKey="Alpha" fill={WARNA.merah} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard judul="Komposisi status" kosong={!d.komposisi.length && 'Belum ada data.'}>
          <PieChart>
            <Pie data={d.komposisi} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {d.komposisi.map(x => <Cell key={x.name} fill={WARNA_STATUS[x.name]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ChartCard>
      </Baris>
      <Baris>
        <ChartCard judul="Kehadiran per kelas" kosong={!d.perKelas.length && 'Belum ada data.'}>
          <BarChart data={d.perKelas}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="kelas" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={v => `${v}%`} />
            <Bar dataKey="% Hadir" fill={WARNA.biru} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
        <div className="card" style={{ flex: '1 1 380px' }}>
          <div className="card-head"><div><h3>Alpha terbanyak</h3><p>Kandidat panggilan orang tua.</p></div></div>
          <div className="card-body table-scroll">
            {!d.alphaTop.length ? <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>Tidak ada alpha di rentang ini.</p> : (
              <table><thead><tr><th>Nama</th><th>Kelas</th><th>Alpha</th></tr></thead>
                <tbody>{d.alphaTop.map((s, i) => <tr key={s.nama + i}><td><b>{s.nama}</b></td><td>{s.kelas}</td><td><span className="badge badge-red">{s.n}×</span></td></tr>)}</tbody></table>
            )}
          </div>
        </div>
      </Baris>
    </Page>
  );
}
