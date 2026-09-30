import { useMemo } from 'react';
import Page from '../../components/layout/Page';
import { useAppData } from '../../context/AppContext';
import { statusTagihan } from '../../db/tagihanHelpers';
import { nominalEfektifTagihan } from '../../db/beasiswaFields';
import { rekapPemasukanBulanan } from '../../db/laporanHelpers';
import { BULAN_SHORT, formatRupiah } from '../../db/helpers';
import InfoCard from '../../components/common/InfoCard';
import { IconGraduationCap, IconMoney, IconCheckCircle, IconAlertTriangle, IconPercent } from '../../components/common/icons';
import RombelPembayaranTable from './RombelPembayaranTable';

// Dashboard SPP -- infografis ringkasan SPP & Biaya Lain utk TAHUN AJARAN AKTIF,
// dihitung REAL-TIME dari data siswa/tagihan/pembayaran yg sudah ada (bukan input
// manual terpisah). Baru sejak v1.31.14, lihat mockup "Reorganisasi Modul SPP" yg
// sudah disetujui utk detail rancangannya.
export default function DashboardSpp() {
  const { siswa, allTagihan, pembayaran, tagihanTerbayar, beasiswaSiswa, beasiswaKategori, tahunAjaranAktif, siswaLoaded, tagihanSppLoaded, tagihanLainLoaded } = useAppData();
  const taLabel = tahunAjaranAktif?.label;

  const siswaByNisn = useMemo(() => {
    const m = {};
    siswa.forEach(s => { if (s.nisn) m[s.nisn] = s; });
    return m;
  }, [siswa]);

  // 1 kali hitung nominal efektif (mempertimbangkan beasiswa) + terbayar utk SETIAP
  // tagihan tahun ajaran aktif -- dipakai bersama oleh grafik per-kelas, donut status,
  // dan ranking tunggakan, supaya angkanya SELALU konsisten satu sama lain.
  const tagihanEfektif = useMemo(() => {
    const cutoffMs = Date.now();
    return allTagihan
      .filter(t => t.tahunAjaran === taLabel)
      .map(t => {
        const terbayarMentah = tagihanTerbayar(t.refType, t.no, t.nisn);
        const { nominalEfektif } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMs, terbayarMentah);
        const terbayar = Math.min(terbayarMentah, nominalEfektif); // clamp: kelebihan bayar tdk bikin grafik "lebih dari total"
        return { nisn: t.nisn, tingkat: siswaByNisn[t.nisn]?.kelasTingkat || 'Lainnya', nominalEfektif, terbayar, sisa: Math.max(0, nominalEfektif - terbayar) };
      });
  }, [allTagihan, taLabel, tagihanTerbayar, beasiswaSiswa, beasiswaKategori, siswaByNisn]);

  const perTingkat = useMemo(() => {
    const map = {};
    tagihanEfektif.forEach(t => {
      if (!map[t.tingkat]) map[t.tingkat] = { tingkat: t.tingkat, tagihan: 0, terbayar: 0, tunggakan: 0 };
      map[t.tingkat].tagihan += t.nominalEfektif;
      map[t.tingkat].terbayar += t.terbayar;
      map[t.tingkat].tunggakan += t.sisa;
    });
    return Object.values(map).sort((a, b) => String(a.tingkat).localeCompare(String(b.tingkat), 'id', { numeric: true }));
  }, [tagihanEfektif]);

  const totalTagihan = perTingkat.reduce((s, k) => s + k.tagihan, 0);
  const totalTerbayar = perTingkat.reduce((s, k) => s + k.terbayar, 0);
  const totalTunggakan = perTingkat.reduce((s, k) => s + k.tunggakan, 0);
  const kepatuhan = totalTagihan > 0 ? (totalTerbayar / totalTagihan * 100) : 0;

  const statusSiswa = useMemo(() => {
    const map = {}; // nisn -> {tagihan, terbayar}
    tagihanEfektif.forEach(t => {
      if (!t.nisn) return;
      if (!map[t.nisn]) map[t.nisn] = { tagihan: 0, terbayar: 0 };
      map[t.nisn].tagihan += t.nominalEfektif;
      map[t.nisn].terbayar += t.terbayar;
    });
    const counts = { Lunas: 0, Sebagian: 0, 'Belum Lunas': 0 };
    Object.values(map).forEach(v => { counts[statusTagihan(v.tagihan, v.terbayar)]++; });
    return { counts, totalSiswaTertagih: Object.keys(map).length };
  }, [tagihanEfektif]);

  const tren = useMemo(() => {
    if (!taLabel) return [];
    const rekap = rekapPemasukanBulanan(taLabel, pembayaran, []); // "" pemasukanLain sengaja dikosongkan -- domain Dashboard SPP cuma tagihan SPP+Biaya Lain, bukan pemasukan non-tagihan
    const now = new Date();
    return rekap.map(b => ({ label: BULAN_SHORT[b.monthIdx], nilai: b.total, akanDatang: new Date(b.calYear, b.monthIdx, 1) > now }));
  }, [taLabel, pembayaran]);

  const rankingTunggakan = useMemo(() => perTingkat.slice().sort((a, b) => b.tunggakan - a.tunggakan), [perTingkat]);

  const dataSiap = siswaLoaded && (tagihanSppLoaded || tagihanLainLoaded);
  const jumlahTingkatan = new Set(siswa.map(s => s.kelasTingkat).filter(Boolean)).size;

  return (
    <Page pageId="dashboard-spp" title="Dashboard SPP" path="SPP / Dashboard SPP">
      {!taLabel && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum ada Tahun Ajaran yang diaktifkan. Atur dulu lewat menu <strong>Profil Sekolah &amp; Tahun Ajaran</strong>.
        </div></div>
      )}

      {taLabel && !dataSiap && (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>📊 Memuat data dashboard...</div></div>
      )}

      {taLabel && dataSiap && (
        <>
          <div className="info-grid-5" style={{ marginBottom: 20 }}>
            <InfoCard icon={IconGraduationCap} color="c-green" value={siswa.length} label={`Total Siswa (${jumlahTingkatan} Tingkatan)`} />
            <InfoCard icon={IconMoney} color="c-blue" value={formatRupiah(totalTagihan)} label={`Total Tagihan ${taLabel}`} valueFontSize={19} />
            <InfoCard icon={IconCheckCircle} color="c-green" value={formatRupiah(totalTerbayar)} label="Sudah Terbayar" valueFontSize={19} />
            <InfoCard icon={IconAlertTriangle} color="c-red" value={formatRupiah(totalTunggakan)} label="Total Tunggakan" valueFontSize={19} />
            <InfoCard icon={IconPercent} color="c-gold" value={`${kepatuhan.toFixed(1)}%`} label="Tingkat Kepatuhan Bayar" />
          </div>

          <div className="dspp-grid">
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-head"><h3 style={{ fontSize: 13.5 }}>Tagihan vs Terbayar per Tingkatan Kelas</h3></div>
              <div className="card-body">
                {perTingkat.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada tagihan tahun ajaran ini.</p> : <BarKelasChart data={perTingkat} />}
                <div className="dspp-legend">
                  <span><i className="dspp-dot" style={{ background: 'var(--green)' }} />Terbayar</span>
                  <span><i className="dspp-dot" style={{ background: 'var(--red)' }} />Tunggakan</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-head"><h3 style={{ fontSize: 13.5 }}>Status Pembayaran Siswa</h3></div>
              <div className="card-body">
                {statusSiswa.totalSiswaTertagih === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada siswa yang punya tagihan tahun ini.</p> : (
                  <>
                    <DonutStatusChart counts={statusSiswa.counts} total={statusSiswa.totalSiswaTertagih} />
                    <div className="dspp-legend" style={{ justifyContent: 'center' }}>
                      <span><i className="dspp-dot dspp-dot-round" style={{ background: 'var(--green)' }} />Lunas {statusSiswa.counts.Lunas}</span>
                      <span><i className="dspp-dot dspp-dot-round" style={{ background: 'var(--gold)' }} />Sebagian {statusSiswa.counts.Sebagian}</span>
                      <span><i className="dspp-dot dspp-dot-round" style={{ background: 'var(--red)' }} />Belum Bayar {statusSiswa.counts['Belum Lunas']}</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>dari {statusSiswa.totalSiswaTertagih} siswa yang sudah punya tagihan tahun ini</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="dspp-grid" style={{ marginTop: 16 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-head"><h3 style={{ fontSize: 13.5 }}>Tren Nominal Masuk per Bulan (Juli–Juni)</h3><p>Bulan yang belum sampai ditampilkan pudar</p></div>
              <div className="card-body">
                <TrenBulananChart data={tren} />
              </div>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-head"><h3 style={{ fontSize: 13.5 }}>Kelas Tunggakan Tertinggi</h3></div>
              <div className="card-body">
                {rankingTunggakan.length === 0 || rankingTunggakan.every(k => k.tunggakan === 0) ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>🎉 Tidak ada tunggakan tahun ajaran ini.</p>
                ) : (
                  <div className="dspp-rank-list">
                    {rankingTunggakan.map(k => (
                      <RankRow key={k.tingkat} label={`Kelas ${k.tingkat}`} value={k.tunggakan} max={rankingTunggakan[0].tunggakan} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16, marginBottom: 0 }}>
            <div className="card-head"><div><h3 style={{ fontSize: 13.5 }}>Rekap Pembayaran SPP per Rombel</h3><p>Ceklist hijau = sudah lunas bulan itu, silang merah = belum/baru sebagian</p></div></div>
            <div className="card-body">
              <RombelPembayaranTable />
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function RankRow({ label, value, max }) {
  const pct = max > 0 ? (value / max * 100) : 0;
  return (
    <div className="dspp-rank-row">
      <div className="dspp-rank-name">{label}</div>
      <div className="dspp-rank-track"><div className="dspp-rank-fill" style={{ width: `${pct}%` }} /></div>
      <div className="dspp-rank-val">{formatRupiah(value)}</div>
    </div>
  );
}

function BarKelasChart({ data }) {
  const W = 560, H = 240, padL = 46, padR = 16, padB = 24, padT = 10;
  const innerW = W - padL - padR, innerH = H - padB - padT;
  const maxVal = Math.max(...data.map(d => d.tagihan)) * 1.15 || 1;
  const bw = (innerW / data.length) * 0.5;
  const gap = innerW / data.length;
  const ticks = [0, 1, 2, 3, 4];

  return (
    <svg className="dspp-chart-svg" viewBox={`0 0 ${W} ${H}`}>
      {ticks.map(g => {
        const y = padT + innerH - (innerH * g / 4);
        return (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} className="dspp-axis" />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="dspp-label">{formatRupiah(maxVal * g / 4).replace('Rp ', '')}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = padL + gap * i + (gap - bw) / 2;
        const hBayar = innerH * (d.terbayar / maxVal);
        const hTunggak = innerH * (d.tunggakan / maxVal);
        const yBayarTop = padT + innerH - hBayar;
        const yTunggakTop = yBayarTop - (hTunggak > 0 ? hTunggak + 2 : 0);
        return (
          <g key={d.tingkat}>
            <title>{`Kelas ${d.tingkat} — Terbayar ${formatRupiah(d.terbayar)}, Tunggakan ${formatRupiah(d.tunggakan)}`}</title>
            <rect x={x} width={bw} y={yBayarTop} height={Math.max(hBayar, 0)} rx={4} fill="var(--green)" />
            {hTunggak > 0 && <rect x={x} width={bw} y={yTunggakTop} height={hTunggak} rx={4} fill="var(--red)" />}
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="dspp-label">K{d.tingkat}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutStatusChart({ counts, total }) {
  const cx = 100, cy = 100, r = 72, rInner = 44;
  const segs = [
    { key: 'Lunas', color: 'var(--green)' },
    { key: 'Sebagian', color: 'var(--gold)' },
    { key: 'Belum Lunas', color: 'var(--red)' },
  ].map(s => ({ ...s, count: counts[s.key] || 0, pct: total > 0 ? (counts[s.key] || 0) / total * 100 : 0 })).filter(s => s.count > 0);

  let start = -90;
  const arcs = segs.map(s => {
    const angle = s.pct / 100 * 360;
    const end = start + angle - (segs.length > 1 ? 2 : 0);
    const large = (end - start) > 180 ? 1 : 0;
    const pt = (a, radius) => { const rad = a * Math.PI / 180; return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)]; };
    const [x1, y1] = pt(start, r), [x2, y2] = pt(end, r), [x3, y3] = pt(end, rInner), [x4, y4] = pt(start, rInner);
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
    start += angle;
    return { ...s, d };
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg className="dspp-chart-svg" viewBox="0 0 200 200" style={{ maxWidth: 190 }}>
        {arcs.map(a => (
          <path key={a.key} d={a.d} fill={a.color}><title>{`${a.key} — ${a.count} siswa (${a.pct.toFixed(0)}%)`}</title></path>
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 18, fontWeight: 800, fill: 'var(--text)' }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--muted)' }}>Siswa</text>
      </svg>
    </div>
  );
}

// Label singkat ala Indonesia (350rb / 2,3jt / 1,2M) -- dipakai utk label
// LANGSUNG di atas titik grafik Tren Bulanan (bukan cuma di tooltip hover),
// supaya nominal per bulan kelihatan sekilas tanpa perlu arahkan mouse.
// Sengaja TIDAK memakai formatRupiah() penuh ("Rp 386.225.000") di sini krn
// kepanjangan & bisa saling tumpuk kalau makin banyak bulan yg terisi data.
function formatRupiahSingkat(n) {
  const v = Math.round(n || 0);
  if (v >= 1_000_000_000) return 'Rp ' + (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'M';
  if (v >= 1_000_000) return 'Rp ' + (v / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'jt';
  if (v >= 1_000) return 'Rp ' + Math.round(v / 1000) + 'rb';
  return formatRupiah(v);
}

function TrenBulananChart({ data }) {
  if (data.length === 0) return <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada data.</p>;
  const W = 560, H = 210, padL = 42, padR = 16, padB = 24, padT = 26;
  const innerW = W - padL - padR, innerH = H - padB - padT;
  const maxVal = Math.max(...data.map(d => d.nilai), 1) * 1.15;
  const stepX = innerW / (data.length - 1 || 1);
  const xy = (i) => [padL + stepX * i, padT + innerH - innerH * (data[i].nilai / maxVal)];

  const lastReal = (() => { let idx = -1; data.forEach((d, i) => { if (!d.akanDatang) idx = i; }); return idx; })();
  const pathFor = (indices) => indices.map((i, k) => { const [x, y] = xy(i); return `${k === 0 ? 'M' : 'L'} ${x} ${y}`; }).join(' ');
  const solidIdx = Array.from({ length: Math.max(lastReal + 1, 0) }, (_, i) => i);
  const dashIdx = lastReal >= 0 ? Array.from({ length: data.length - lastReal }, (_, i) => lastReal + i) : data.map((_, i) => i);

  return (
    <svg className="dspp-chart-svg" viewBox={`0 0 ${W} ${H}`}>
      {[0, 1, 2, 3].map(g => {
        const y = padT + innerH - (innerH * g / 3);
        return <line key={g} x1={padL} x2={W - padR} y1={y} y2={y} className="dspp-axis" />;
      })}
      {solidIdx.length > 1 && <path d={pathFor(solidIdx)} fill="none" stroke="var(--green)" strokeWidth="2" />}
      {dashIdx.length > 1 && <path d={pathFor(dashIdx)} fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="5 4" />}
      {data.map((d, i) => {
        const [x, y] = xy(i);
        // Label langsung (nominal) HANYA utk bulan yg sudah lewat & ada nilainya --
        // "selective direct label", bukan angka di tiap titik (bulan yg belum sampai
        // sudah cukup ditandai pudar/putus-putus, tidak perlu label "Rp 0").
        const tampilkanLabel = !d.akanDatang && d.nilai > 0;
        const labelDiAtas = (y - 12) >= (padT - 12);
        const ly = labelDiAtas ? y - 12 : y + 18;
        return (
          <g key={d.label + i}>
            <title>{`${d.label} — ${formatRupiah(d.nilai)}${d.akanDatang ? ' (belum sampai)' : ''}`}</title>
            <circle cx={x} cy={y} r={d.akanDatang ? 3 : 4} fill={d.akanDatang ? 'var(--surface, #fff)' : 'var(--green)'} stroke={d.akanDatang ? 'var(--muted)' : 'var(--green)'} strokeWidth="1.5" />
            {tampilkanLabel && <text x={x} y={ly} textAnchor="middle" className="dspp-point-label">{formatRupiahSingkat(d.nilai)}</text>}
            <text x={x} y={H - 6} textAnchor="middle" className="dspp-label">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
