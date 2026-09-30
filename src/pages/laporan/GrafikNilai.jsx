import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import Page from '../../components/layout/Page';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import InfoCard from '../../components/common/InfoCard';
import { AkademikBelumTersambung, Field, Select } from '../../components/akademik/shared';
import { ChartCard, Baris, WARNA, WARNA_PREDIKAT } from '../../components/akademik/charts';
import { useAppData } from '../../context/AppContext';
import { MAPEL_OPTIONS, SEMESTER_OPTIONS, semesterDariTanggal, predikatNilai, labelRombel, PREDIKAT_LABEL } from '../../db/akademikFields';
import { buatLookupKkm } from '../../db/akademikLanjutanFields';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const rata = (a) => a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null;
const singkat = (m) => (m.length > 12 ? m.replace("Al-Qur'an Hadits", 'Qurdis').replace('Bahasa ', 'B. ').replace('Akidah Akhlak', 'Akidah') : m);

export default function GrafikNilai() {
  const { nilai, kkm } = useAppData();
  const { tahunAjaranOptions, taAktif, rombelList } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState(semesterDariTanggal());
  const [tingkat, setTingkat] = useState('');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  const tingkatList = useMemo(() => [...new Set(rombelList.map(r => r.tingkat))], [rombelList]);

  const d = useMemo(() => {
    const data = nilai.filter(n => n.tahunAjaran === ta && (semester === 'Semua' || n.semester === semester) && n.nilai !== null && (!tingkat || n.tingkat === tingkat));
    const kkmOf = buatLookupKkm(kkm);
    const mapel = [...MAPEL_OPTIONS, ...new Set(data.map(n => n.mapel).filter(m => !MAPEL_OPTIONS.includes(m)))]
      .map(m => {
        const baris = data.filter(n => n.mapel === m);
        const kkmList = [...new Set(baris.map(n => n.tingkat))].map(t => kkmOf(ta, t, m)).filter(v => v !== null);
        return { mapel: singkat(m), Rata: rata(baris.map(n => n.nilai)), KKM: rata(kkmList), n: baris.length };
      }).filter(x => x.n);
    const perRombel = rombelList.filter(r => !tingkat || r.tingkat === tingkat).map(r => ({
      kelas: labelRombel(r.tingkat, r.rombel).replace('Kelas ', ''), Rata: rata(data.filter(n => n.tingkat === r.tingkat && n.rombel === r.rombel).map(n => n.nilai)),
    })).filter(x => x.Rata !== null);
    const perBulan = {};
    data.forEach(n => { const k = n.tanggal.slice(0, 7); if (k.length === 7) (perBulan[k] ||= []).push(n.nilai); });
    const tren = Object.keys(perBulan).sort().map(k => ({ bulan: `${BULAN[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`, Rata: rata(perBulan[k]) }));
    // Predikat per SISWA (rata semua nilainya), bukan per baris nilai.
    const perSiswa = {};
    data.forEach(n => { (perSiswa[n.nisn] ||= { nama: n.nama, kelas: labelRombel(n.tingkat, n.rombel), v: [] }).v.push(n.nilai); });
    const siswaRata = Object.values(perSiswa).map(s => ({ ...s, rata: rata(s.v) }));
    const distribusi = ['A', 'B', 'C', 'D'].map(p => ({ name: `${p} · ${PREDIKAT_LABEL[p]}`, key: p, value: siswaRata.filter(s => predikatNilai(s.rata) === p).length })).filter(x => x.value);
    const top = [...siswaRata].sort((a, b) => b.rata - a.rata).slice(0, 10);
    const bawah = siswaRata.filter(s => s.rata < 70).sort((a, b) => a.rata - b.rata);
    const kurangKkm = mapel.filter(m => m.KKM !== null && m.Rata < m.KKM);
    return { total: data.length, rataAll: rata(data.map(n => n.nilai)), mapel, perRombel, tren, distribusi, top, bawah, jmlSiswa: siswaRata.length, kurangKkm };
  }, [nilai, kkm, ta, semester, tingkat, rombelList]);

  return (
    <Page pageId="grafik-nilai" title="Grafik Nilai & Tren" path="Laporan & Grafik / Grafik Nilai & Tren">
      <AkademikBelumTersambung />
      <div className="filter-bar">
        <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
        <Field label="Semester"><Select value={semester} onChange={setSemester} options={['Semua', ...SEMESTER_OPTIONS]} /></Field>
        <Field label="Tingkat"><Select value={tingkat} onChange={setTingkat} placeholder="Semua kelas" options={tingkatList.map(t => ({ value: t, label: `Kelas ${t}` }))} /></Field>
      </div>
      <div className="info-grid" style={{ marginBottom: 16 }}>
        <InfoCard value={d.rataAll ?? '—'} label="Rata-rata nilai" color="c-green" />
        <InfoCard value={d.jmlSiswa} label={`Siswa dinilai · ${d.total} nilai`} color="c-blue" />
        <InfoCard value={d.bawah.length} label="Siswa rata-rata di bawah 70" color="c-red" />
        <InfoCard value={d.kurangKkm.length} label="Mapel rata-rata di bawah KKM" color="c-gold" />
      </div>
      <Baris>
        <ChartCard judul="Rata-rata per mata pelajaran" sub="Hijau = rata-rata nilai, emas = rata-rata KKM mapel itu. Hijau lebih pendek dari emas berarti belum tuntas." tinggi={300} kosong={!d.mapel.length && 'Belum ada nilai di periode ini.'}>
          <BarChart data={d.mapel} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mapel" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip /><Legend verticalAlign="top" />
            <Bar dataKey="Rata" fill={WARNA.hijau} radius={[3, 3, 0, 0]} />
            <Bar dataKey="KKM" fill={WARNA.emas} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard judul="Rata-rata per kelas" tinggi={300} kosong={!d.perRombel.length && 'Belum ada nilai di periode ini.'}>
          <BarChart data={d.perRombel}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="kelas" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip /><ReferenceLine y={70} stroke={WARNA.merah} strokeDasharray="4 4" />
            <Bar dataKey="Rata" fill={WARNA.biru} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
      </Baris>
      <Baris>
        <ChartCard judul="Tren rata-rata per bulan" sub="Berdasarkan tanggal penilaian." kosong={d.tren.length < 2 && 'Butuh nilai dari minimal 2 bulan berbeda untuk melihat tren.'}>
          <LineChart data={d.tren}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip /><ReferenceLine y={70} stroke={WARNA.merah} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="Rata" stroke={WARNA.hijau} strokeWidth={2.5} dot={{ r: 4 }} />
          </LineChart>
        </ChartCard>
        <ChartCard judul="Sebaran predikat siswa" sub="Dari rata-rata semua nilai tiap siswa." kosong={!d.distribusi.length && 'Belum ada nilai.'}>
          <PieChart>
            <Pie data={d.distribusi} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {d.distribusi.map(x => <Cell key={x.key} fill={WARNA_PREDIKAT[x.key]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ChartCard>
      </Baris>
      <Baris>
        <div className="card" style={{ flex: '1 1 380px' }}>
          <div className="card-head"><div><h3>10 besar</h3><p>Rata-rata tertinggi di periode ini.</p></div></div>
          <div className="card-body table-scroll">
            <table><thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Rata-rata</th></tr></thead>
              <tbody>{d.top.map((s, i) => <tr key={s.nama + i}><td>{i + 1}</td><td><b>{s.nama}</b></td><td>{s.kelas}</td><td>{s.rata}</td></tr>)}</tbody></table>
          </div>
        </div>
        <div className="card" style={{ flex: '1 1 380px' }}>
          <div className="card-head"><div><h3>Perlu pendampingan ({d.bawah.length})</h3><p>Rata-rata di bawah 70.</p></div></div>
          <div className="card-body table-scroll">
            {!d.bawah.length ? <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>Tidak ada.</p> : (
              <table><thead><tr><th>Nama</th><th>Kelas</th><th>Rata-rata</th></tr></thead>
                <tbody>{d.bawah.slice(0, 15).map((s, i) => <tr key={s.nama + i}><td><b>{s.nama}</b></td><td>{s.kelas}</td><td style={{ color: 'var(--red)' }}>{s.rata}</td></tr>)}</tbody></table>
            )}
          </div>
        </div>
      </Baris>
    </Page>
  );
}
