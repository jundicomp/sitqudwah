import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { nominalEfektifTagihan } from '../../db/beasiswaFields';
import { statusTagihan } from '../../db/tagihanHelpers';
import { bulanTahunAjaran } from '../../db/laporanHelpers';
import { BULAN_ID, BULAN_SHORT } from '../../db/helpers';

// "Rekap Pembayaran per Rombel" -- ceklist Lunas/Belum per siswa x per bulan,
// 1 rombel per layar (bukan semua siswa sekaligus, supaya tabelnya tetap muat
// & enak dibaca walau sekolahnya banyak rombel). Ditambahkan di Dashboard SPP
// sejak v1.31.16 atas permintaan langsung, lihat CHANGELOG.
export default function RombelPembayaranTable() {
  const { siswa, kelas, allTagihan, tagihanTerbayar, beasiswaSiswa, beasiswaKategori, tahunAjaranAktif } = useAppData();
  const taLabel = tahunAjaranAktif?.label;

  const daftarRombel = useMemo(() => {
    return kelas.slice().sort((a, b) => {
      const t = String(a.tingkat).localeCompare(String(b.tingkat), 'id', { numeric: true });
      return t !== 0 ? t : String(a.namaKelas).localeCompare(String(b.namaKelas), 'id', { numeric: true });
    });
  }, [kelas]);

  const [rombelIdx, setRombelIdx] = useState(0);
  const idxAman = Math.min(rombelIdx, Math.max(daftarRombel.length - 1, 0));
  const rombelAktif = daftarRombel[idxAman];

  const bulanList = useMemo(() => (taLabel ? bulanTahunAjaran(taLabel) : []), [taLabel]);

  const siswaRombel = useMemo(() => {
    if (!rombelAktif) return [];
    return siswa
      .filter(s => s.kelasTingkat === rombelAktif.tingkat && s.rombel === rombelAktif.namaKelas)
      .slice()
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [siswa, rombelAktif]);

  // Peta status SPP per siswa per bulan, dihitung 1 kali dari SELURUH tagihan SPP
  // tahun ajaran aktif -- bukan per-baris tabel -- supaya pindah2 rombel (Next/Prev)
  // tetap cepat & angkanya konsisten dgn grafik2 Dashboard SPP di atasnya.
  const statusBulananPerSiswa = useMemo(() => {
    if (!taLabel) return {};
    const cutoffMs = Date.now();
    const map = {};
    allTagihan
      .filter(t => t.refType === 'SPP' && t.tahunAjaran === taLabel)
      .forEach(t => {
        const monthIdx = BULAN_ID.indexOf(t.bulan);
        if (monthIdx < 0) return;
        const terbayarMentah = tagihanTerbayar(t.refType, t.no, t.nisn);
        const { nominalEfektif } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMs, terbayarMentah);
        const terbayar = Math.min(terbayarMentah, nominalEfektif);
        if (!map[t.nisn]) map[t.nisn] = {};
        const prev = map[t.nisn][monthIdx] || { nominalEfektif: 0, terbayar: 0 };
        map[t.nisn][monthIdx] = { nominalEfektif: prev.nominalEfektif + nominalEfektif, terbayar: prev.terbayar + terbayar };
      });
    return map;
  }, [allTagihan, taLabel, tagihanTerbayar, beasiswaSiswa, beasiswaKategori]);

  function statusSel(nisn, monthIdx) {
    const cell = statusBulananPerSiswa[nisn]?.[monthIdx];
    if (!cell) return null; // belum ada tagihan SPP bulan itu (blm diterbitkan / siswa blm terdaftar bulan itu)
    return statusTagihan(cell.nominalEfektif, cell.terbayar);
  }

  if (!taLabel) {
    return <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran yang diaktifkan.</p>;
  }
  if (daftarRombel.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada data Rombel. Atur dulu lewat menu <strong>Data Kelas &amp; Rombel</strong>.</p>;
  }

  return (
    <>
      <div className="rb-toolbar">
        <button type="button" className="btn btn-sm" onClick={() => setRombelIdx(i => Math.max(0, i - 1))} disabled={idxAman === 0}>◀ Sebelumnya</button>
        <select value={idxAman} onChange={e => setRombelIdx(Number(e.target.value))}>
          {daftarRombel.map((r, i) => <option key={r.id} value={i}>Kelas {r.tingkat} — Rombel {r.namaKelas}</option>)}
        </select>
        <button type="button" className="btn btn-sm" onClick={() => setRombelIdx(i => Math.min(daftarRombel.length - 1, i + 1))} disabled={idxAman === daftarRombel.length - 1}>Berikutnya ▶</button>
        <span className="rb-toolbar-info">{siswaRombel.length} siswa di rombel ini</span>
      </div>

      {siswaRombel.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada siswa yang terdaftar di rombel ini.</p>
      ) : (
        <div className="table-scroll">
          <table className="rb-table">
            <thead>
              <tr>
                <th>No</th><th>NISN</th><th>Nama Lengkap</th><th>Rombel</th>
                {bulanList.map(b => <th key={b.monthIdx}>{BULAN_SHORT[b.monthIdx]}</th>)}
              </tr>
            </thead>
            <tbody>
              {siswaRombel.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.nisn || '-'}</td>
                  <td>{s.nama}</td>
                  <td>{s.rombel}</td>
                  {bulanList.map(b => {
                    const status = statusSel(s.nisn, b.monthIdx);
                    const judul = `${b.label} — ${status || 'Belum ada tagihan'}`;
                    return (
                      <td key={b.monthIdx} title={judul}>
                        {status === 'Lunas' && <span className="rb-yes">✓</span>}
                        {(status === 'Sebagian' || status === 'Belum Lunas') && <span className="rb-no">✕</span>}
                        {!status && <span className="rb-none">–</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rb-legend">
        <span><span className="rb-yes">✓</span> Sudah Lunas</span>
        <span><span className="rb-no">✕</span> Belum Lunas / Baru Sebagian</span>
        <span><span className="rb-none">–</span> Belum Ada Tagihan Bulan Itu</span>
      </div>
    </>
  );
}
