import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import { Select } from '../../components/akademik/shared';
import { SEMESTER_OPTIONS, semesterDariTanggal, predikatNilai, mapelUntukTingkat, getSkalaPredikat, labelRombel } from '../../db/akademikFields';
import { buatLookupKkm } from '../../db/akademikLanjutanFields';
import { formatRaporTingkat } from '../../config/jenjang';

// v1.66.0: ringkasan nilai di atas halaman Nilai Akademik. Ikut lingkup guru (lihat
// db/lingkupNilai.js): guru hanya melihat kelas & mapel yg dia ajar / walikan.
const rata = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);
const koma = (v) => (v === null || v === undefined ? '—' : String(v).replace('.', ','));
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tglPendek = (iso) => { const d = new Date(String(iso) + 'T00:00:00'); return Number.isNaN(d.getTime()) ? (iso || '—') : `${d.getDate()} ${BULAN[d.getMonth()]}`; };
const KUNCI_LIPAT = 'sq-infografis-nilai-lipat';
const WARNA_SEBARAN = ['#1f6b4a', '#3e9a6e', '#e0a020', '#d0503a', '#9a1d1d', '#6b1414'];

export default function InfografisNilai({ lingkup }) {
  const { nilai, kkm, mapelList, nilaiLoaded } = useAppData();
  const { tahunAjaranOptions, taAktif, rombelList: semuaRombel } = useAkademikOptions();
  const rombelList = useMemo(() => semuaRombel.filter(r => formatRaporTingkat(r.tingkat) !== 'PAUD' && lingkup.bolehRombel(r)), [semuaRombel, lingkup]);
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState(semesterDariTanggal());
  const [rombelKey, setRombelKey] = useState('');
  const [lipat, setLipat] = useState(() => { try { return localStorage.getItem(KUNCI_LIPAT) === '1'; } catch { return false; } });
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { try { localStorage.setItem(KUNCI_LIPAT, lipat ? '1' : '0'); } catch { /* abaikan */ } }, [lipat]);
  const rombel = rombelList.find(r => r.key === rombelKey) || null;
  const lookupKkm = useMemo(() => buatLookupKkm(kkm), [kkm]);

  const d = useMemo(() => {
    const kelasDipakai = rombel ? [rombel] : rombelList;
    const kunciKelas = new Set(kelasDipakai.map(r => `${r.tingkat}|${r.rombel}`));
    const rows = nilai.filter(n => n.nilai !== null && n.tahunAjaran === ta && n.semester === semester
      && kunciKelas.has(`${n.tingkat}|${n.rombel}`) && lingkup.bolehNilai(n));
    // Pasangan kelas+mapel yg SEHARUSNYA dinilai (sesuai lingkup).
    const harus = kelasDipakai.flatMap(r => {
      const boleh = lingkup.mapelBoleh(r);
      return mapelUntukTingkat(r.tingkat).filter(m => !boleh || boleh.has(m)).map(m => ({ r, m }));
    });
    const sudah = new Set(rows.map(n => `${n.tingkat}|${n.rombel}|${n.mapel}`));
    const belum = harus.filter(x => !sudah.has(`${x.r.tingkat}|${x.r.rombel}|${x.m}`));

    // Rata-rata per mapel + KKM (rata-rata KKM tingkat2 yg dipakai).
    const perMapel = {};
    rows.forEach(n => { (perMapel[n.mapel] ||= { nilai: [], kkm: new Set() }).nilai.push(n.nilai); const k = lookupKkm(ta, n.tingkat, n.mapel); if (k !== null) perMapel[n.mapel].kkm.add(k); });
    const bar = Object.entries(perMapel).map(([m, x]) => ({ m, rata: rata(x.nilai), kkm: x.kkm.size ? rata([...x.kkm]) : null }))
      .sort((a, b) => b.rata - a.rata);

    // Siswa yg punya minimal 1 mapel dgn rata-rata di bawah KKM.
    const perSiswaMapel = {};
    rows.forEach(n => { (perSiswaMapel[`${n.nisn}|${n.mapel}|${n.tingkat}`] ||= []).push(n.nilai); });
    const siswaBawah = new Set();
    Object.entries(perSiswaMapel).forEach(([k, v]) => { const [nisn, m, t] = k.split('|'); const batas = lookupKkm(ta, t, m); if (batas !== null && rata(v) < batas) siswaBawah.add(nisn); });

    // Sebaran predikat (dikelompokkan per huruf depan: A, B, C, ...).
    const urutHuruf = [...new Set(getSkalaPredikat().map(x => x.huruf[0].toUpperCase()))];
    const sebaran = urutHuruf.map(h => ({ h, n: rows.filter(n => (predikatNilai(n.nilai) || ' ')[0].toUpperCase() === h).length }));

    // Input terbaru = kelompok (tanggal, jenis, mapel, kelas).
    const sesi = {};
    rows.forEach(n => { const k = `${n.tanggal}|${n.jenis}|${n.mapel}|${n.tingkat}|${n.rombel}`; (sesi[k] ||= { ...n, jumlah: 0, guruHitung: {} }).jumlah++; if (n.guru) sesi[k].guruHitung[n.guru] = (sesi[k].guruHitung[n.guru] || 0) + 1; });
    const terbaru = Object.values(sesi).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 4)
      .map(x => ({ ...x, guru: Object.entries(x.guruHitung).sort((a, b) => b[1] - a[1])[0]?.[0] || '' }));

    return {
      jumlah: rows.length, rata: rata(rows.map(n => n.nilai)), siswaBawah: siswaBawah.size,
      mapelSudah: rombel ? new Set(rows.map(n => n.mapel)).size : sudah.size, mapelHarus: harus.length || (rombel ? new Set(rows.map(n => n.mapel)).size : sudah.size),
      bar, sebaran, terbaru, belum, terakhir: terbaru[0] || null,
    };
  }, [nilai, ta, semester, rombel, rombelList, lingkup, lookupKkm, mapelList]); // eslint-disable-line react-hooks/exhaustive-deps

  if (lingkup.tanpaGuru) return null;
  const maxSebaran = Math.max(1, ...d.sebaran.map(x => x.n));
  const opsiKelas = [{ value: '', label: lingkup.semua ? 'Semua kelas' : 'Semua kelas saya' }, ...rombelList.map(r => ({ value: r.key, label: r.label }))];

  return (
    <div className="card ifn">
      <div className="ifn-head">
        <div><h3>📊 Ringkasan nilai</h3><p>{lingkup.semua ? 'Seluruh kelas sesuai filter.' : 'Hanya kelas & mapel yang Anda ajar atau walikan.'}</p></div>
        <div className="ifn-filter">
          <Select value={ta} onChange={setTa} options={tahunAjaranOptions} />
          <Select value={semester} onChange={setSemester} options={SEMESTER_OPTIONS} />
          <Select value={rombelKey} onChange={setRombelKey} options={opsiKelas} />
          <button type="button" className="btn btn-sm" onClick={() => setLipat(x => !x)} aria-expanded={!lipat}>{lipat ? '▾ Tampilkan' : '▴ Lipat'}</button>
        </div>
      </div>
      {!lipat && (!nilaiLoaded ? <p className="ifn-kosong">Memuat nilai…</p> : (
        <>
          <div className="ifn-kpi">
            <div className="ifn-k k1"><i>🧾</i><b>{d.jumlah.toLocaleString('id-ID')}</b><small>nilai tercatat</small></div>
            <div className="ifn-k k2"><i>📚</i><b>{d.mapelSudah} / {d.mapelHarus}</b><small>{rombel ? 'mapel sudah dinilai' : 'kelas·mapel sudah dinilai'}</small></div>
            <div className="ifn-k k3"><i>📈</i><b>{koma(d.rata)}</b><small>rata-rata semua nilai</small></div>
            <div className="ifn-k k4"><i>⚠️</i><b>{d.siswaBawah}</b><small>siswa punya mapel di bawah KKM</small></div>
            <div className="ifn-k k5"><i>🕒</i><b>{d.terakhir ? tglPendek(d.terakhir.tanggal) : '—'}</b><small>{d.terakhir ? `input terakhir · ${d.terakhir.mapel}` : 'belum ada input'}</small></div>
          </div>
          {d.jumlah === 0 ? <p className="ifn-kosong">Belum ada nilai di {ta} semester {semester}{rombel ? ` untuk ${rombel.label}` : ''}.</p> : (
            <div className="ifn-row">
              <div className="ifn-pan"><h4>Rata-rata per mata pelajaran</h4>
                {d.bar.slice(0, 8).map(x => (
                  <div key={x.m} className="ifn-bar">
                    <span title={x.m}>{x.m}</span>
                    <div className="t"><i style={{ width: `${Math.min(100, x.rata)}%`, background: x.kkm !== null && x.rata < x.kkm ? '#d0503a' : undefined }} />{x.kkm !== null && <span className="kk" style={{ left: `${x.kkm}%` }} title={`KKM ${x.kkm}`} />}</div>
                    <b className={x.kkm !== null && x.rata < x.kkm ? 'lo' : ''}>{koma(x.rata)}</b>
                  </div>
                ))}
                {d.bar.length > 8 && <div className="ifn-lg">+{d.bar.length - 8} mapel lain</div>}
                <div className="ifn-lg">Garis merah = KKM. Batang merah = rata-rata mapel di bawah KKM.</div>
              </div>
              <div className="ifn-pan"><h4>Sebaran predikat</h4>
                <div className="ifn-dist">
                  {d.sebaran.map((x, i) => (
                    <div key={x.h}><b>{x.n}</b><i style={{ height: `${Math.max(3, (x.n / maxSebaran) * 90)}px`, background: WARNA_SEBARAN[Math.min(i, WARNA_SEBARAN.length - 1)] }} /><span>{x.h}</span></div>
                  ))}
                </div>
                <div className="ifn-lg">Jumlah nilai per predikat (A = A dan A-, dst.), mengikuti Skala Predikat.</div>
              </div>
              <div className="ifn-pan"><h4>Input terbaru</h4>
                <ul className="ifn-akt">
                  {d.terbaru.map(x => (
                    <li key={`${x.tanggal}|${x.jenis}|${x.mapel}|${x.tingkat}|${x.rombel}`}><span className="dot" /><div><b>{x.mapel} · {x.jenis}</b> · {labelRombel(x.tingkat, x.rombel)}<small>{tglPendek(x.tanggal)}{x.guru ? ` · ${x.guru}` : ''} · {x.jumlah} siswa</small></div></li>
                  ))}
                </ul>
                {d.belum.length > 0 && (
                  <div className="ifn-warn">⚠️ {d.belum.length} {rombel ? 'mapel' : 'kelas·mapel'} belum ada nilai semester ini: {d.belum.slice(0, 3).map(x => (rombel ? x.m : `${x.m} (${labelRombel(x.r.tingkat, x.r.rombel)})`)).join(', ')}{d.belum.length > 3 ? ', …' : ''}</div>
                )}
              </div>
            </div>
          )}
        </>
      ))}
    </div>
  );
}
