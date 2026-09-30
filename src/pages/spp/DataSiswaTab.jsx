import { useMemo, useRef, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { statusTagihan } from '../../db/tagihanHelpers';
import { initials, avatarColor } from '../../db/helpers';
import SuggestionDropdown from '../../components/common/SuggestionDropdown';
import { shareCardAsImage } from '../../utils/shareCardImage';
import { bulanTahunAjaran } from '../../db/laporanHelpers';
import { nominalEfektifTagihan } from '../../db/beasiswaFields';
import { kelasRombelPadaTahun } from '../../db/riwayatAkademikFields';

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

function StatusBadge({ status }) {
  const map = { Lunas: 'badge-green', Sebagian: 'badge-gold', 'Belum Lunas': 'badge-red' };
  return <span className={`badge ${map[status] || 'badge-muted'}`}>{status}</span>;
}

// Format nilai Rupiah, DIPECAH jadi { prefix: 'Rp', angka: '200.000' } -- supaya
// "Rp" bisa ditaruh rata kiri dan angkanya rata kanan sekaligus (teknik flex),
// persis kartu fisik/struk sungguhan yg nilainya rapi sejajar.
function pecahRupiah(n) {
  const angka = Math.round(n || 0).toLocaleString('id-ID');
  return { prefix: 'Rp', angka };
}

function NilaiRupiah({ n }) {
  const { prefix, angka } = pecahRupiah(n);
  return (
    <span style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{prefix}</span><span>{angka}</span>
    </span>
  );
}

// Baris ringkasan (Total/Sudah Dibayar/Sisa/Keterangan) ditulis LANGSUNG sbg <tr>
// di tabel yg SAMA dgn data di atasnya -- BUKAN blok terpisah -- supaya label
// sejajar PERSIS dgn kolom label (mis. "Bulan"/"Jenis Biaya") dan nilainya sejajar
// PERSIS dgn kolom "Nominal", persis kartu fisik/struk sungguhan.
function BarisRingkasan({ label, jumlahKolom, labelKolomKe, nilaiKolomKe, isTotal, children }) {
  const sel = [];
  for (let i = 0; i < jumlahKolom; i++) {
    if (i === labelKolomKe) {
      sel.push(<td key={i} style={isTotal ? { borderTop: '2px solid var(--green-dark)', paddingTop: 14, color: 'var(--muted)' } : { color: 'var(--muted)' }}>{label}</td>);
    } else if (i === nilaiKolomKe) {
      sel.push(<td key={i} style={{ textAlign: 'right', fontWeight: 700, ...(isTotal ? { borderTop: '2px solid var(--green-dark)', paddingTop: 14 } : {}) }}>{children}</td>);
    } else {
      sel.push(<td key={i} style={isTotal ? { borderTop: '2px solid var(--green-dark)', paddingTop: 14 } : {}}></td>);
    }
  }
  return <tr className="spp-ringkasan-row">{sel}</tr>;
}

// Kartu tunggal (dipakai utk SPP MAUPUN Biaya Lain) -- ada header sekolah + DETAIL SISWA
// (nama/kelas/rombel/tahun pelajaran, supaya ikut kefoto saat di-share), judul kartu,
// TABEL (header+kolom SELALU tampil, walau baris datanya kosong -- supaya kartunya tetap
// terlihat lengkap seperti template kartu fisik), dan ringkasan jumlah di bawahnya sejajar
// kolom. Tombol share pojok kanan atas.
function KartuTagihan({ namaSekolah, namaSiswa, kelasLabel, rombelLabel, tahunAjaran, judulKartu, headerKolom, rows, renderBaris, totalTagihan, totalBayar, filenamePrefix, labelKolomKe, nilaiKolomKe }) {
  const cardRef = useRef(null);
  const sisa = totalTagihan - totalBayar;
  const status = statusTagihan(totalTagihan, totalBayar);
  const jumlahKolom = headerKolom.length;

  return (
    <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <button
        className="no-print spp-share-btn"
        title="Share sebagai gambar (WhatsApp, dll)"
        onClick={() => shareCardAsImage(cardRef, `${filenamePrefix} - ${namaSiswa} - ${tahunAjaran}`)}
      >📤</button>
      <div ref={cardRef} style={{ padding: 20, background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{namaSekolah}</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{judulKartu}</div>
        </div>
        <div style={{ background: '#F6F8F5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12.5 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 4, columnGap: 10 }}>
            <div><span style={{ color: 'var(--muted)' }}>Nama</span>: <b>{namaSiswa}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Tahun Pelajaran</span>: <b>{tahunAjaran}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Kelas</span>: <b>{kelasLabel || '-'}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Rombel</span>: <b>{rombelLabel || '-'}</b></div>
          </div>
        </div>
        <table>
          <thead><tr>{headerKolom.map((h, i) => <th key={h} style={i === nilaiKolomKe ? { textAlign: 'right' } : undefined}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length > 0
              ? rows.map(renderBaris)
              : <tr><td colSpan={jumlahKolom} style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, padding: '14px 12px' }}>Belum ada tagihan.</td></tr>}
            <BarisRingkasan label="Total" jumlahKolom={jumlahKolom} labelKolomKe={labelKolomKe} nilaiKolomKe={nilaiKolomKe} isTotal>
              <NilaiRupiah n={totalTagihan} />
            </BarisRingkasan>
            <BarisRingkasan label="Sudah Dibayar" jumlahKolom={jumlahKolom} labelKolomKe={labelKolomKe} nilaiKolomKe={nilaiKolomKe}>
              <NilaiRupiah n={totalBayar} />
            </BarisRingkasan>
            <BarisRingkasan label="Sisa" jumlahKolom={jumlahKolom} labelKolomKe={labelKolomKe} nilaiKolomKe={nilaiKolomKe}>
              <NilaiRupiah n={sisa} />
            </BarisRingkasan>
            <BarisRingkasan label="Keterangan" jumlahKolom={jumlahKolom} labelKolomKe={labelKolomKe} nilaiKolomKe={nilaiKolomKe}>
              <StatusBadge status={status} />
            </BarisRingkasan>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TahunSection({ namaSekolah, namaSiswa, kelasLabel, rombelLabel, tahunAjaran, items, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  // "items" di sini SUDAH nominal efektif (mempertimbangkan beasiswa yg aktif sekarang) --
  // dihitung 1x di komponen induk (riwayatSiswa), tidak perlu dihitung ulang di sini.
  const sppAsli = items.filter(t => t.refType === 'SPP');
  const lain = items.filter(t => t.refType === 'LAIN');

  // Kartu SPP HARUS selalu menampilkan 12 bulan (Juli-Juni) penuh -- bulan yg belum
  // diterbitkan tagihannya SENGAJA tetap ditampilkan (bukan disembunyikan) dgn tulisan
  // "(belum terbit)" abu-abu miring, supaya kartu ini genuinely terlihat spt kartu SPP
  // fisik 1 tahun ajaran penuh, bukan cuma daftar transaksi yg sudah ada.
  const sppDua12Bulan = bulanTahunAjaran(tahunAjaran).map(b => {
    const t = sppAsli.find(x => x.bulan === b.label.split(' ')[0] && Number(x.tahunKalender) === b.calYear);
    return t ? { ...t, sudahTerbit: true } : { id: `kosong-${b.label}`, bulan: b.label.split(' ')[0], tahunKalender: b.calYear, sudahTerbit: false, nominal: 0, terbayar: 0, status: null };
  });

  const totalTagihanSemua = items.reduce((s, t) => s + t.nominal, 0);
  const totalBayarSemua = items.reduce((s, t) => s + t.terbayar, 0);
  const statusTahun = statusTagihan(totalTagihanSemua, totalBayarSemua);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#F6F8F5', cursor: 'pointer' }}>
        <strong style={{ fontSize: 13.5 }}>Tahun Pelajaran {tahunAjaran}</strong>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><StatusBadge status={statusTahun} /> {open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div style={{ padding: 16 }}>
          <div className="spp-kartu-grid">
            <KartuTagihan
              namaSekolah={namaSekolah} namaSiswa={namaSiswa} kelasLabel={kelasLabel} rombelLabel={rombelLabel} tahunAjaran={tahunAjaran}
              judulKartu="KARTU SPP" filenamePrefix="Kartu SPP"
              headerKolom={['No', 'Bulan', 'Nominal', 'Status', 'Keterangan']}
              labelKolomKe={1} nilaiKolomKe={2}
              rows={sppDua12Bulan}
              renderBaris={(t, idx) => (
                <tr key={t.id}>
                  <td>{idx + 1}</td>
                  <td>{t.bulan} {t.tahunKalender}</td>
                  <td style={{ textAlign: 'right' }}>
                    {t.sudahTerbit ? (
                      t.potonganBeasiswa ? (
                        <>
                          <span style={{ display: 'block', textDecoration: 'line-through', color: 'var(--muted)', fontSize: 11 }}>{formatRupiah(t.nominalAsli)}</span>
                          <span style={{ display: 'block', fontWeight: 800 }}>{formatRupiah(t.nominal)}</span>
                        </>
                      ) : formatRupiah(t.nominal)
                    ) : <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>-</span>}
                  </td>
                  <td>{t.sudahTerbit ? <StatusBadge status={t.status} /> : <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>(belum terbit)</span>}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--purple-dark)' }}>
                    {t.potonganBeasiswa
                      ? `Beasiswa`
                      : (t.keterangan ? (t.keterangan.includes('Beasiswa') ? 'Beasiswa' : t.keterangan) : '-')}
                  </td>
                </tr>
              )}
              totalTagihan={sppAsli.reduce((s, t) => s + t.nominal, 0)}
              totalBayar={sppAsli.reduce((s, t) => s + t.terbayar, 0)}
            />
            <KartuTagihan
              namaSekolah={namaSekolah} namaSiswa={namaSiswa} kelasLabel={kelasLabel} rombelLabel={rombelLabel} tahunAjaran={tahunAjaran}
              judulKartu="KARTU BIAYA LAIN (DI LUAR SPP)" filenamePrefix="Kartu Biaya Lain"
              headerKolom={['Jenis Biaya', 'Nominal', 'Status', 'Keterangan']}
              labelKolomKe={0} nilaiKolomKe={1}
              rows={lain}
              renderBaris={(t) => (
                <tr key={t.id}>
                  <td>{t.label}</td>
                  <td style={{ textAlign: 'right' }}>
                    {t.potonganBeasiswa ? (
                      <>
                        <span style={{ display: 'block', textDecoration: 'line-through', color: 'var(--muted)', fontSize: 11 }}>{formatRupiah(t.nominalAsli)}</span>
                        <span style={{ display: 'block', fontWeight: 800 }}>{formatRupiah(t.nominal)}</span>
                      </>
                    ) : formatRupiah(t.nominal)}
                  </td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ fontSize: 11.5, color: 'var(--purple-dark)' }}>
                    {t.potonganBeasiswa
                      ? `Beasiswa`
                      : (t.keterangan ? (t.keterangan.includes('Beasiswa') ? 'Beasiswa' : t.keterangan) : '-')}
                  </td>
                </tr>
              )}
              totalTagihan={lain.reduce((s, t) => s + t.nominal, 0)}
              totalBayar={lain.reduce((s, t) => s + t.terbayar, 0)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Dulu halaman berdiri sendiri ("SPP Peserta Didik") -- sejak v1.31.14 dipindah jadi
// tab "Data Siswa" di dalam Sub Modul Pembayaran (lihat src/pages/spp/Pembayaran.jsx),
// digabung dgn tab Pembayaran & Invoice supaya 1 alur kerja (cari siswa -> lihat
// riwayat -> langsung bayar) tidak perlu pindah-pindah menu. Isi/logikanya TIDAK
// berubah sama sekali, cuma <Page> pembungkusnya dilepas krn sekarang jadi tab.
export default function DataSiswaTab() {
  const { siswa, siswaLoading, siswaError, siswaLoaded, allTagihan, tagihanTerbayar, tagihanSppLoaded, tagihanLainLoaded, profilSekolah, kelas, beasiswaSiswa, beasiswaKategori, riwayatAkademik } = useAppData();
  const [term, setTerm] = useState('');
  const inputRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterRombel, setFilterRombel] = useState('');

  const daftarKelas = useMemo(() => Array.from(new Set(siswa.map(s => s.kelasTingkat).filter(Boolean))).sort(), [siswa]);
  const daftarRombel = useMemo(() => kelas.filter(k => !filterKelas || k.tingkat === filterKelas), [kelas, filterKelas]);

  const siswaTerfilter = useMemo(() => {
    return siswa
      .filter(s => !filterKelas || s.kelasTingkat === filterKelas)
      .filter(s => {
        if (!filterRombel) return true;
        const rombelDipilih = kelas.find(k => k.id === filterRombel);
        return rombelDipilih && s.kelasTingkat === rombelDipilih.tingkat && s.rombel === rombelDipilih.namaKelas;
      });
  }, [siswa, filterKelas, filterRombel]);

  const keteranganFilter = useMemo(() => {
    if (!filterKelas && !filterRombel) return null;
    const rombelDipilih = filterRombel ? kelas.find(k => k.id === filterRombel) : null;
    if (rombelDipilih) return `Terdapat ${siswaTerfilter.length} Siswa Kelas ${rombelDipilih.tingkat} Rombel ${rombelDipilih.namaKelas} dari ${siswa.length} Siswa`;
    if (filterKelas) return `Terdapat ${siswaTerfilter.length} Siswa Kelas ${filterKelas} dari ${siswa.length} Siswa`;
    return null;
  }, [filterKelas, filterRombel, siswaTerfilter, siswa, kelas]);

  const suggestions = useMemo(() => {
    if (!term.trim()) return [];
    const t = term.toLowerCase();
    return siswa
      .filter(s => s.nama.toLowerCase().includes(t) || s.nisn.includes(t))
      .filter(s => !filterKelas || s.kelasTingkat === filterKelas)
      .filter(s => {
        if (!filterRombel) return true;
        const rombelDipilih = kelas.find(k => k.id === filterRombel);
        return rombelDipilih && s.kelasTingkat === rombelDipilih.tingkat && s.rombel === rombelDipilih.namaKelas;
      })
      .slice(0, 6);
  }, [term, siswa, filterKelas, filterRombel, kelas]);

  const selected = siswa.find(s => s.id === selectedId);
  // Catatan histori (v1.31.27): label Rombel di Kartu SPP dulu ditebak/mengambil
  // kondisi siswa SAAT INI apa adanya (lihat kelasRombelPadaTahun di
  // riwayatAkademikFields.js utk versi terbaru yg sudah benar per-tahun-ajaran).
  const beasiswaSelected = selected ? beasiswaSiswa.find(b => b.nisn === selected.nisn) : null;

  const riwayatSiswa = useMemo(() => {
    if (!selected) return [];
    const cutoffMs = Date.now();
    return allTagihan
      .filter(t => t.nisn === selected.nisn)
      .map(t => {
        const terbayar = tagihanTerbayar(t.refType, t.no, t.nisn);
        const { nominalEfektif, potongan } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMs, terbayar);
        return { ...t, nominalAsli: t.nominal, nominal: nominalEfektif, potonganBeasiswa: potongan, terbayar, status: statusTagihan(nominalEfektif, terbayar) };
      });
  }, [selected, allTagihan, tagihanTerbayar, beasiswaSiswa, beasiswaKategori]);

  const perTahunAjaran = useMemo(() => {
    const map = {};
    riwayatSiswa.forEach(t => {
      if (!map[t.tahunAjaran]) map[t.tahunAjaran] = [];
      map[t.tahunAjaran].push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])); // terbaru dulu
  }, [riwayatSiswa]);

  const totalKeseluruhan = useMemo(() => {
    const totalTagihan = riwayatSiswa.reduce((s, t) => s + t.nominal, 0);
    const totalBayar = riwayatSiswa.reduce((s, t) => s + t.terbayar, 0);
    return { totalTagihan, totalBayar, sisa: totalTagihan - totalBayar };
  }, [riwayatSiswa]);

  const keuanganSiap = tagihanSppLoaded || tagihanLainLoaded;

  return (
    <>
      <div className="card">
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Jumlah siswa terdaftar</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-dark)' }}>{siswa.length} Siswa</div>
            {keteranganFilter && <div style={{ fontSize: 12.5, color: 'var(--green-dark)', marginTop: 4, fontWeight: 600 }}>{keteranganFilter}</div>}
          </div>
          {siswaLoading && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Memuat data...</span>}
        </div>
      </div>

      {siswaError && (
        <div className="card"><div className="card-body" style={{ color: 'var(--red)', fontSize: 13 }}>Gagal memuat data siswa: {siswaError}</div></div>
      )}

      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Filter Kelas</label>
              <select value={filterKelas} onChange={e => { setFilterKelas(e.target.value); setFilterRombel(''); }} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
                <option value="">Semua Kelas</option>
                {daftarKelas.map(k => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Filter Rombel</label>
              <select value={filterRombel} onChange={e => setFilterRombel(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13 }}>
                <option value="">Semua Rombel</option>
                {daftarRombel.map(r => <option key={r.id} value={r.id}>{r.namaKelas}</option>)}
              </select>
            </div>
          </div>
          <div style={{ maxWidth: 420 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={term}
              onChange={e => { setTerm(e.target.value); setSelectedId(null); }}
              style={{ width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
            />
            <SuggestionDropdown anchorRef={inputRef} visible={suggestions.length > 0 && !selected}>
              {suggestions.map(s => (
                <div key={s.id} onClick={() => { setSelectedId(s.id); setTerm(s.nama); }} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(s.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials(s.nama || '?')}</div>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{s.nama}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>NISN {s.nisn || '-'} · Kelas {s.kelasTingkat || '-'}</div></div>
                </div>
              ))}
            </SuggestionDropdown>
            <SuggestionDropdown anchorRef={inputRef} visible={!!term.trim() && suggestions.length === 0 && !selected}>
              <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--muted)' }}>
                Tidak ditemukan siswa dengan nama/NISN itu.
              </div>
            </SuggestionDropdown>
          </div>
        </div>
      </div>

      {selected && (
        <>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarColor(selected.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>{initials(selected.nama)}</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ margin: 0, fontSize: 19 }}>{selected.nama}</h2>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  NISN: {selected.nisn || '-'} &nbsp;·&nbsp; Kelas: {selected.kelasTingkat || '-'} &nbsp;·&nbsp; Jenis Kelamin: {selected.jenisKelamin || '-'}
                </div>
                {beasiswaSelected && (
                  <div style={{ marginTop: 6 }}>
                    <span className="badge badge-purple">🎓 Penerima Beasiswa: {beasiswaSelected.kategoriBeasiswa}</span>
                  </div>
                )}
                {keuanganSiap && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-gold">Total Tagihan: {formatRupiah(totalKeseluruhan.totalTagihan)}</span>
                    <span className="badge badge-green">Terbayar: {formatRupiah(totalKeseluruhan.totalBayar)}</span>
                    <span className={`badge ${totalKeseluruhan.sisa > 0 ? 'badge-red' : 'badge-green'}`}>Sisa: {formatRupiah(totalKeseluruhan.sisa)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!keuanganSiap && (
            <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
              📋 Memuat riwayat SPP...
            </div></div>
          )}

          {keuanganSiap && perTahunAjaran.length === 0 && (
            <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
              Belum ada tagihan untuk siswa ini. Terbitkan SPP dulu lewat menu <strong>Tagihan &amp; Biaya</strong>.
            </div></div>
          )}

          {keuanganSiap && perTahunAjaran.map(([ta, items], idx) => {
            // PENTING: kelas/rombel yg ditampilkan HARUS kelas/rombel siswa PADA tahun
            // ajaran itu (mis. Kelas 5 utk kartu SPP tahun lalu), BUKAN kelas/rombel
            // siswa SAAT INI (selected.kelasTingkat/rombel) -- kalau siswa sudah naik
            // ke Kelas 6, kartu SPP tahun lalu dulunya SALAH ikut menampilkan "Kelas 6".
            // Diambil dari Riwayat Akademik kalau tahun itu sudah tercatat; kalau belum
            // (data lama sblm fitur Riwayat Akademik ada), jatuhkan ke kondisi siswa
            // saat ini apa adanya (perilaku lama, drpd kosong sama sekali).
            const kondisiTahunItu = kelasRombelPadaTahun(selected.nisn, ta, riwayatAkademik, { kelasTingkat: selected.kelasTingkat, rombel: selected.rombel });
            return (
              <TahunSection
                key={ta} namaSekolah={profilSekolah?.nama || 'MI Ikhlasiyah'} namaSiswa={selected.nama}
                kelasLabel={kondisiTahunItu.kelasTingkat ? `Kelas ${kondisiTahunItu.kelasTingkat}` : '-'}
                rombelLabel={kondisiTahunItu.rombel || 'Rombel belum ditentukan'}
                tahunAjaran={ta} items={items} defaultOpen={idx === 0}
              />
            );
          })}
        </>
      )}

      {!selected && !siswaLoading && siswaLoaded && siswa.length === 0 && (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>Belum ada data siswa. Tambahkan lewat menu Data Siswa dulu.</div></div>
      )}

      {!selected && siswa.length > 0 && (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>Cari nama atau NISN siswa di atas untuk melihat detailnya.</div></div>
      )}
    </>
  );
}
