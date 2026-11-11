import { useMemo, useState } from 'react';
import { useAppData } from '../../../context/AppContext';
import { siswaDiRombel } from '../../../db/akademikFields';
import { kepalaPada } from '../../../db/penandatanganFields';
import { kunciAnak, kunciDataStsb, nomorSurat, aspekKurang, susunStsb } from '../../../db/stsbFields';
import useDrafLokal from '../../../hooks/useDrafLokal';
import DrafBanner from '../../../components/common/DrafBanner';
import CetakRaporPaud from '../raporPaud/CetakRaporPaud';

const s = (v) => String(v ?? '').trim();
const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

// Daftar STSB 1 rombel PAUD: nilai per aspek, kelompok usia, nomor urut, cetak.
export default function StsbKelas({ ta, rombel, data, tampilSemua }) {
  const { siswa, pengaturanStsb: st, penandatangan, simpanKunciSistem, toast } = useAppData();
  const anak = useMemo(() => siswaDiRombel(siswa, rombel.tingkat, rombel.rombel, !tampilSemua), [siswa, rombel, tampilSemua]);
  // awal = isi terakhir yg tersimpan (pembanding tombol Simpan).
  const [awal, setAwal] = useState(() => ({
    tanggal: data.tanggal || hariIni(),
    siswa: Object.fromEntries(anak.map(a => [kunciAnak(a), data.siswa[kunciAnak(a)] || {}])),
  }));
  const [isian, setIsian] = useState(awal);
  const [isiDengan, setIsiDengan] = useState(st.skala[0]?.kode || 'A');
  const [menyimpan, setMenyimpan] = useState(false);
  const [cetak, setCetak] = useState(null);
  const draf = useDrafLokal(`stsb:${ta}:${rombel.key}`, isian);
  const berubah = JSON.stringify(isian) !== JSON.stringify(awal);

  const ubah = (k, fn) => setIsian(x => ({ ...x, siswa: { ...x.siswa, [k]: fn(x.siswa[k] || {}) } }));
  const setNilai = (k, aspek, v) => ubah(k, o => ({ ...o, nilai: { ...(o.nilai || {}), [aspek]: v } }));
  const isiKosong = () => setIsian(x => ({
    ...x,
    siswa: Object.fromEntries(Object.entries(x.siswa).map(([k, o]) => [k, { ...o, nilai: Object.fromEntries(st.aspek.map(a => [a, s(o.nilai?.[a]) || isiDengan])) }])),
  }));

  // Nomor urut otomatis: lanjut dari nomor terbesar di tahun ajaran ini.
  function lengkapiUrut(semua) {
    let maks = Math.max(0, ...Object.values(semua).map(o => Number(o?.urut) || 0));
    const hasil = { ...semua };
    anak.forEach(a => { const k = kunciAnak(a); if (!Number(hasil[k]?.urut)) hasil[k] = { ...(hasil[k] || {}), urut: ++maks }; });
    return hasil;
  }

  async function simpan() {
    setMenyimpan(true);
    try {
      const siswaBaru = lengkapiUrut({ ...data.siswa, ...isian.siswa });
      await simpanKunciSistem(kunciDataStsb(ta), { tanggal: isian.tanggal, siswa: siswaBaru });
      const sesudah = { tanggal: isian.tanggal, siswa: Object.fromEntries(anak.map(a => [kunciAnak(a), siswaBaru[kunciAnak(a)] || {}])) };
      setIsian(sesudah); setAwal(sesudah);
      draf.tersimpan(sesudah);
      toast('STSB disimpan.');
    } catch (e) { toast(e.message, 'error'); }
    finally { setMenyimpan(false); }
  }

  const kepala = kepalaPada(penandatangan.PAUD, isian.tanggal);
  const dok = (a) => susunStsb({ st: { ...st, tempat: st.tempat || penandatangan.PAUD.tempat }, siswa: a, isi: isian.siswa[kunciAnak(a)], ta, tanggal: isian.tanggal, kepala });
  const rows = anak.map(a => {
    const k = kunciAnak(a), o = isian.siswa[k] || {};
    return { a, k, o, kurang: aspekKurang(st, o).length };
  });
  const siapCetak = rows.filter(r => r.kurang === 0 && Number(r.o.urut));
  const tersimpan = (r) => !!Number(awal.siswa[r.k]?.urut) && !berubah;

  return (
    <>
      <DrafBanner draf={draf.draf} onPulihkan={() => { const v = draf.pulihkan(); if (v) setIsian(v); }} onBuang={draf.buang} />
      {!kepala && <div className="banner-info"><span>Kepala sekolah PAUD untuk tanggal ini belum diatur. Isi di Rapor Digital PAUD › Penandatangan, atau isi nama kepala di tab Pengaturan STSB.</span></div>}
      <div className="filter-bar" style={{ alignItems: 'flex-end' }}>
        <div className="field"><label>Tanggal surat</label><input type="date" value={isian.tanggal} onChange={e => setIsian(x => ({ ...x, tanggal: e.target.value }))} /></div>
        <div className="field"><label>Isi nilai yang kosong dengan</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={isiDengan} onChange={e => setIsiDengan(e.target.value)}>{st.skala.map(k => <option key={k.kode} value={k.kode}>{k.kode} — {k.nama}</option>)}</select>
            <button type="button" className="btn btn-sm" onClick={isiKosong}>Terapkan</button>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn" disabled={!siapCetak.length || berubah} title={berubah ? 'Simpan dulu' : ''} onClick={() => setCetak(siapCetak.map(r => dok(r.a)))}>🖨️ Cetak semua yang lengkap ({siapCetak.length})</button>
        <button type="button" className="btn btn-primary" disabled={menyimpan || !berubah} onClick={simpan}>{menyimpan ? 'Menyimpan...' : berubah ? 'Simpan' : 'Tersimpan ✓'}</button>
      </div>
      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        <table className="data-table stsb-tabel">
          <thead>
            <tr>
              <th>Nama Anak</th><th>Nomor Surat</th><th>Kelompok Usia</th>
              {st.aspek.map(a => <th key={a} title={a} className="stsb-th-aspek">{a}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.k}>
                <td><b>{r.a.nama}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.a.idSiswa || 'tanpa ID'}{r.a.nisn ? ` · NISN ${r.a.nisn}` : ''}{r.a.status !== 'Aktif' ? ` · ${r.a.status}` : ''}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    {r.kurang === 0 ? <span className="badge badge-green">lengkap</span> : <span className="badge badge-gold">{r.kurang} belum dinilai</span>}
                    <button type="button" className="btn btn-sm" disabled={!tersimpan(r)} title={tersimpan(r) ? '' : 'Simpan dulu'} onClick={() => setCetak([dok(r.a)])}>🖨️ Cetak</button>
                  </div></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <input type="number" min="1" className="stsb-urut" value={r.o.urut || ''} placeholder="auto" title="Nomor urut (kosong = otomatis saat disimpan)"
                    onChange={e => ubah(r.k, o => ({ ...o, urut: e.target.value ? Number(e.target.value) : '' }))} />
                  <div className="stsb-nomor-teks">{r.o.urut ? nomorSurat(st.formatNomor, r.o.urut, st.digitNomor, isian.tanggal, ta) : 'otomatis saat disimpan'}</div>
                </td>
                <td><input type="text" value={r.o.usia || ''} placeholder={st.kelompokUsia} onChange={e => ubah(r.k, o => ({ ...o, usia: e.target.value }))} /></td>
                {st.aspek.map(a => (
                  <td key={a} style={{ textAlign: 'center' }}>
                    <select value={r.o.nilai?.[a] || ''} onChange={e => setNilai(r.k, a, e.target.value)} className={r.o.nilai?.[a] ? '' : 'stsb-kosong'}>
                      <option value="">–</option>
                      {st.skala.map(k => <option key={k.kode} value={k.kode}>{k.kode}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={st.aspek.length + 3} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Tidak ada siswa di kelas ini.</td></tr>}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Nilai: {st.skala.map(k => `${k.kode} = ${k.nama}`).join(' · ')}. Nomor surat berurutan per tahun ajaran (semua kelas PAUD).</p>
      {cetak && <CetakRaporPaud dokumen={cetak} onSelesai={() => setCetak(null)} />}
    </>
  );
}
