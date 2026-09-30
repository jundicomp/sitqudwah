import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah, parseTanggalFleksibel } from '../../db/helpers';
import {
  pembayaranAsli, bulanTahunAjaran, rekapPemasukanBulanan, rekapPengeluaranBulanan,
  rekapCashflowPerAkunBulanan, piutangAsOf, totalAsOf,
} from '../../db/laporanHelpers';
import { akunAktivaOptions } from '../../db/akunBukuBesarFields';
import { nominalEfektifTagihan } from '../../db/beasiswaFields';
import { hitungTerbayar } from '../../db/tagihanHelpers';
import { KATEGORI_PENGELUARAN_OPTIONS } from '../../db/pengeluaranFields';
import { bulkDeletePengeluaranFromSheet, bulkDeletePemasukanLainFromSheet, perbaikiNomorGanda, addLogEntry } from '../../services/googleSheets';

// ---------------------------------------------------------------------------
// Helper analisis generik -- dipakai berulang di beberapa bagian di bawah.
// ---------------------------------------------------------------------------
function cariNomorGanda(rows) {
  const seen = new Set(); let jumlah = 0;
  rows.forEach(r => { if (seen.has(r.no)) jumlah++; else seen.add(r.no); });
  return jumlah;
}

// Kelompokkan baris yg PERSIS sama (tanggal+kategori+keterangan+nominal+akun) --
// biasanya bekas form ke-submit dobel. Simpan "No" paling kecil, sisanya kandidat hapus.
function cariDuplikat(rows, kunciFn) {
  const map = new Map();
  rows.forEach(r => {
    const k = kunciFn(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  const hasil = [];
  map.forEach((grup, kunci) => {
    if (grup.length <= 1) return;
    const terurut = [...grup].sort((a, b) => Number(a.no) - Number(b.no));
    hasil.push({ kunci, simpan: terurut[0], hapus: terurut.slice(1), jumlahBaris: grup.length });
  });
  return hasil.sort((a, b) => b.jumlahBaris - a.jumlahBaris);
}

// Baris yg field "Akun"-nya TERISI tapi TIDAK cocok dgn akun kas/bank manapun yg
// dikenal sistem (bawaan + custom Aktiva) -- nominalnya akan "hilang" dari SEMUA
// laporan berbasis akun (Buku Besar, Cashflow, Neraca), krn ketiganya mencocokkan
// nama akun PERSIS (lihat totalAsOf/bangunItemMentah/rekapCashflowPerAkunBulanan).
// Baris yg Akun-nya KOSONG dianggap "Kas" (fallback bawaan) -- itu bukan masalah.
function cariAkunTakDikenal(rows, akunDikenalSet) {
  return rows.filter(r => {
    const nama = String(r.akun ?? '').trim();
    return nama && !akunDikenalSet.has(nama);
  });
}

function cariNominalTidakValid(rows) {
  return rows.filter(r => !(Number(r.nominal) > 0));
}

function rentangTanggalTahunAjaran(taLabel) {
  const bulanList = bulanTahunAjaran(taLabel);
  const b0 = bulanList[0];
  const bAkhir = bulanList[bulanList.length - 1];
  return {
    awal: new Date(b0.calYear, b0.monthIdx, 1),
    akhir: new Date(bAkhir.calYear, bAkhir.monthIdx + 1, 0, 23, 59, 59),
  };
}

function Selisih({ nilai }) {
  const cocok = Math.abs(nilai) < 1;
  return (
    <span className={`badge ${cocok ? 'badge-green' : 'badge-red'}`}>
      {cocok ? '✅ Cocok' : `⚠️ Selisih ${formatRupiah(Math.abs(nilai))}`}
    </span>
  );
}

// Kartu 1 bagian pengecekan -- tombol "Cek Sekarang" mengungkap isi (findings) di
// bawahnya. Dipakai SETIAP bagian (Kas Masuk, Kas Keluar, Buku Besar, dst) supaya
// tampilannya konsisten & kodenya tidak diulang-ulang.
function BagianCek({ judul, deskripsi, terbuka, onBuka, children }) {
  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-head" style={{ alignItems: 'center' }}>
        <div><h3>{judul}</h3><p>{deskripsi}</p></div>
        {!terbuka && <button className="btn btn-primary" onClick={onBuka}>🔍 Cek Sekarang</button>}
      </div>
      {terbuka && <div className="card-body">{children}</div>}
    </div>
  );
}

export default function CekDataKeuanganTab() {
  const {
    pembayaran, pemasukanLain, pengeluaran, akun, allTagihan,
    tahunAjaran, tahunAjaranAktif, beasiswaSiswa, beasiswaKategori,
    refreshPengeluaran, refreshPemasukanLain, toast,
  } = useAppData();
  const { currentUser } = useAuth();

  const [dicek, setDicek] = useState({}); // { [sectionKey]: true }
  const [memproses, setMemproses] = useState(false);
  const [memperbaikiNomor, setMemperbaikiNomor] = useState({}); // { [sheetKey]: true }
  const buka = (key) => setDicek(d => ({ ...d, [key]: true }));

  // Perbaiki "No" yg kebetulan dobel di sheet Pemasukan Lain / Pengeluaran -- sama
  // persis mekanismenya dgn "Perbaiki Nomor Ganda" di tab Cek Data Duplikat (Tagihan
  // SPP/Lain/Pembayaran), cuma sheet targetnya beda. Aman dijalankan -- cuma mengganti
  // nomor, tidak menghapus apa pun.
  async function perbaikiNomorGandaSheet(sheetKey, label, refreshFn) {
    setMemperbaikiNomor(m => ({ ...m, [sheetKey]: true }));
    try {
      const jumlah = await perbaikiNomorGanda(sheetKey);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Perbaiki Nomor Ganda', modul: 'Cek Data Keuangan', detail: `Memperbaiki ${jumlah} nomor ganda di ${label}` });
      await refreshFn();
      toast(`${jumlah} nomor ganda di ${label} berhasil diperbaiki.`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMemperbaikiNomor(m => ({ ...m, [sheetKey]: false }));
    }
  }

  const taLabel = tahunAjaranAktif?.label || (tahunAjaran[0] && tahunAjaran[0].label) || null;
  const akunDikenalSet = useMemo(() => new Set(akunAktivaOptions(akun)), [akun]);
  const daftarAkunKasBank = useMemo(() => akunAktivaOptions(akun), [akun]);
  const asliSemua = useMemo(() => pembayaranAsli(pembayaran), [pembayaran]);
  const cutoffMsSekarang = Date.now();

  // ==================== 1. KAS MASUK (Pembayaran & Pemasukan Lain) ====================
  const nomorGandaPemasukanLain = useMemo(() => cariNomorGanda(pemasukanLain), [pemasukanLain]);
  const duplikatPemasukanLain = useMemo(
    () => cariDuplikat(pemasukanLain, p => `${p.tanggal}|${p.kategori}|${p.keterangan}|${p.nominal}|${p.akun}`),
    [pemasukanLain]
  );
  const totalHapusPemasukanLain = duplikatPemasukanLain.reduce((s, k) => s + k.hapus.length, 0);
  const akunTakDikenalMasuk = useMemo(() => ([
    ...cariAkunTakDikenal(asliSemua, akunDikenalSet).map(p => ({ ...p, sumber: 'Pembayaran', tanggal: p.tanggalBayar })),
    ...cariAkunTakDikenal(pemasukanLain, akunDikenalSet).map(p => ({ ...p, sumber: 'Pemasukan Lain' })),
  ]), [asliSemua, pemasukanLain, akunDikenalSet]);
  const nominalTidakValidMasuk = useMemo(() => ([
    ...cariNominalTidakValid(asliSemua).map(p => ({ ...p, sumber: 'Pembayaran', tanggal: p.tanggalBayar })),
    ...cariNominalTidakValid(pemasukanLain).map(p => ({ ...p, sumber: 'Pemasukan Lain' })),
  ]), [asliSemua, pemasukanLain]);

  async function hapusDuplikatPemasukanLain() {
    if (totalHapusPemasukanLain === 0) return;
    if (!confirm(`Hapus ${totalHapusPemasukanLain} baris Pemasukan Lain duplikat dari ${duplikatPemasukanLain.length} kelompok?`)) return;
    setMemproses(true);
    try {
      const nos = duplikatPemasukanLain.flatMap(k => k.hapus.map(r => r.no));
      const hasil = await bulkDeletePemasukanLainFromSheet(nos);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Hapus Duplikat', modul: 'Cek Data Keuangan', detail: `Menghapus ${hasil.jumlahDihapus} baris Pemasukan Lain duplikat` });
      await refreshPemasukanLain();
      toast(`${hasil.jumlahDihapus} baris duplikat Pemasukan Lain berhasil dihapus.`);
    } catch (err) { toast(err.message, 'error'); } finally { setMemproses(false); }
  }

  // ==================== 2. KAS KELUAR (Pengeluaran) ====================
  const nomorGandaPengeluaran = useMemo(() => cariNomorGanda(pengeluaran), [pengeluaran]);
  const duplikatPengeluaran = useMemo(
    () => cariDuplikat(pengeluaran, p => `${p.tanggal}|${p.kategori}|${p.keterangan}|${p.nominal}|${p.akun}`),
    [pengeluaran]
  );
  const totalHapusPengeluaran = duplikatPengeluaran.reduce((s, k) => s + k.hapus.length, 0);
  const akunTakDikenalKeluar = useMemo(() => cariAkunTakDikenal(pengeluaran, akunDikenalSet), [pengeluaran, akunDikenalSet]);
  const kategoriTidakValid = useMemo(() => pengeluaran.filter(p => p.kategori && !KATEGORI_PENGELUARAN_OPTIONS.includes(p.kategori)), [pengeluaran]);
  const nominalTidakValidKeluar = useMemo(() => cariNominalTidakValid(pengeluaran), [pengeluaran]);

  async function hapusDuplikatPengeluaran() {
    if (totalHapusPengeluaran === 0) return;
    if (!confirm(`Hapus ${totalHapusPengeluaran} baris Pengeluaran duplikat dari ${duplikatPengeluaran.length} kelompok?`)) return;
    setMemproses(true);
    try {
      const nos = duplikatPengeluaran.flatMap(k => k.hapus.map(r => r.no));
      const hasil = await bulkDeletePengeluaranFromSheet(nos);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Hapus Duplikat', modul: 'Cek Data Keuangan', detail: `Menghapus ${hasil.jumlahDihapus} baris Pengeluaran duplikat` });
      await refreshPengeluaran();
      toast(`${hasil.jumlahDihapus} baris duplikat Pengeluaran berhasil dihapus.`);
    } catch (err) { toast(err.message, 'error'); } finally { setMemproses(false); }
  }

  // ==================== 3. BUKU BESAR ====================
  const totalHilangDariMasuk = useMemo(() => akunTakDikenalMasuk.reduce((s, r) => s + (Number(r.nominal) || 0), 0), [akunTakDikenalMasuk]);
  const totalHilangDariKeluar = useMemo(() => akunTakDikenalKeluar.reduce((s, r) => s + (Number(r.nominal) || 0), 0), [akunTakDikenalKeluar]);
  const akunKewajibanModal = useMemo(() => akun.filter(a => a.jenis === 'Kewajiban' || a.jenis === 'Modal'), [akun]);

  // ==================== 4. CASHFLOW (vs Rekapitulasi & Pengeluaran, Tahun Ajaran Aktif) ====================
  const cashflowTA = useMemo(() => taLabel ? rekapCashflowPerAkunBulanan(taLabel, pembayaran, pemasukanLain, pengeluaran, daftarAkunKasBank) : [], [taLabel, pembayaran, pemasukanLain, pengeluaran, daftarAkunKasBank]);
  const totalMasukCashflow = useMemo(() => daftarAkunKasBank.reduce((s, nama) => s + cashflowTA.reduce((s2, c) => s2 + (c[nama + '__masuk'] || 0), 0), 0), [cashflowTA, daftarAkunKasBank]);
  const totalKeluarCashflow = useMemo(() => daftarAkunKasBank.reduce((s, nama) => s + cashflowTA.reduce((s2, c) => s2 + (c[nama + '__keluar'] || 0), 0), 0), [cashflowTA, daftarAkunKasBank]);

  // ==================== 5. REKAPITULASI (independen, tanpa lewat rekapPemasukanBulanan) ====================
  const rekapPemasukanTA = useMemo(() => taLabel ? rekapPemasukanBulanan(taLabel, pembayaran, pemasukanLain) : [], [taLabel, pembayaran, pemasukanLain]);
  const totalRekapPemasukanTA = useMemo(() => rekapPemasukanTA.reduce((s, r) => s + r.total, 0), [rekapPemasukanTA]);
  const totalPemasukanIndependen = useMemo(() => {
    if (!taLabel) return null;
    const { awal, akhir } = rentangTanggalTahunAjaran(taLabel);
    const dalamRentang = (tglRaw) => { const d = parseTanggalFleksibel(tglRaw); return d && d >= awal && d <= akhir; };
    const totalPembayaran = asliSemua.filter(p => dalamRentang(p.tanggalBayar)).reduce((s, p) => s + p.nominal, 0);
    const totalPemasukanLain = pemasukanLain.filter(p => dalamRentang(p.tanggal)).reduce((s, p) => s + p.nominal, 0);
    return totalPembayaran + totalPemasukanLain;
  }, [taLabel, asliSemua, pemasukanLain]);

  // ==================== 6. LABA RUGI (independen) ====================
  const rekapPengeluaranTA = useMemo(() => taLabel ? rekapPengeluaranBulanan(taLabel, pengeluaran) : [], [taLabel, pengeluaran]);
  const totalRekapPengeluaranTA = useMemo(() => rekapPengeluaranTA.reduce((s, r) => s + r.total, 0), [rekapPengeluaranTA]);
  const totalPengeluaranIndependen = useMemo(() => {
    if (!taLabel) return null;
    const { awal, akhir } = rentangTanggalTahunAjaran(taLabel);
    const dalamRentang = (tglRaw) => { const d = parseTanggalFleksibel(tglRaw); return d && d >= awal && d <= akhir; };
    return pengeluaran.filter(p => dalamRentang(p.tanggal)).reduce((s, p) => s + p.nominal, 0);
  }, [taLabel, pengeluaran]);
  const labaRugiDariLaporan = totalRekapPemasukanTA - totalRekapPengeluaranTA;
  const labaRugiIndependen = (totalPemasukanIndependen !== null && totalPengeluaranIndependen !== null) ? totalPemasukanIndependen - totalPengeluaranIndependen : null;

  // ==================== 7. NERACA ====================
  const piutangNeraca = useMemo(() => piutangAsOf(allTagihan, pembayaran, cutoffMsSekarang, beasiswaSiswa, beasiswaKategori), [allTagihan, pembayaran, beasiswaSiswa, beasiswaKategori, cutoffMsSekarang]);
  // Perhitungan ULANG independen -- SEMUA tagihan yg ada di sheet dianggap sudah
  // "berlaku" hari ini (tanpa gerbang tanggal "muncul" yg dipakai piutangAsOf).
  // Selisih dgn piutangNeraca WAJAR kalau ada tagihan bulan DEPAN yg sudah diterbitkan
  // lebih awal -- itu bukan bug, tapi disengaja (piutang bulan depan memang belum
  // dihitung sampai tanggal mulai bulan itu tiba).
  const piutangPolos = useMemo(() => {
    return allTagihan.reduce((s, t) => {
      const dibayar = hitungTerbayar(pembayaran, t.refType, t.no, t.nisn);
      const { nominalEfektif } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMsSekarang, dibayar);
      const sisa = nominalEfektif - dibayar;
      return s + (sisa > 0 ? sisa : 0);
    }, 0);
  }, [allTagihan, pembayaran, beasiswaSiswa, beasiswaKategori, cutoffMsSekarang]);
  const saldoKasPerAkun = useMemo(() => daftarAkunKasBank.map(nama => {
    const masuk = totalAsOf(asliSemua, p => p.tanggalBayar, p => p.nominal, p => p.akun, cutoffMsSekarang, nama)
      + totalAsOf(pemasukanLain, p => p.tanggal, p => p.nominal, p => p.akun, cutoffMsSekarang, nama);
    const keluar = totalAsOf(pengeluaran, p => p.tanggal, p => p.nominal, p => p.akun, cutoffMsSekarang, nama);
    return { nama, saldo: masuk - keluar };
  }), [daftarAkunKasBank, asliSemua, pemasukanLain, pengeluaran, cutoffMsSekarang]);
  const totalKasNeraca = saldoKasPerAkun.reduce((s, a) => s + a.saldo, 0);
  const totalAktivaNeraca = totalKasNeraca + piutangNeraca;
  // Modal menurut Neraca = Total Aktiva (Kewajiban selalu 0, blm ada modulnya) --
  // dihitung ULANG independen scr akrual: SEMUA pendapatan yg PERNAH diakui (nominal
  // efektif tiap tagihan yg PERNAH terbit, baik sudah lunas maupun masih piutang) +
  // semua Pemasukan Lain, dikurangi SEMUA pengeluaran sepanjang masa. Kalau tidak ada
  // modal awal/kewajiban yg belum tercatat sistem, angka ini SEHARUSNYA sama persis
  // dgn Total Aktiva Neraca (Kas + Piutang) -- identitas akuntansi dasar.
  const totalPendapatanAkrualSemua = useMemo(() => {
    const dariTagihan = allTagihan.reduce((s, t) => {
      const dibayar = hitungTerbayar(pembayaran, t.refType, t.no, t.nisn);
      const { nominalEfektif } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMsSekarang, dibayar);
      return s + nominalEfektif;
    }, 0);
    const dariPemasukanLain = pemasukanLain.reduce((s, p) => s + p.nominal, 0);
    return dariTagihan + dariPemasukanLain;
  }, [allTagihan, pembayaran, pemasukanLain, beasiswaSiswa, beasiswaKategori, cutoffMsSekarang]);
  const totalBebanSemua = useMemo(() => pengeluaran.reduce((s, p) => s + p.nominal, 0), [pengeluaran]);
  const modalIndependen = totalPendapatanAkrualSemua - totalBebanSemua;

  return (
    <div>
      <div className="card" style={{ background: 'var(--gold-soft)', marginBottom: 18 }}>
        <div className="card-body" style={{ fontSize: 12.5, color: '#8a5b00' }}>
          ⚠️ Alat ini memeriksa data keuangan mulai dari Kas Masuk/Keluar sampai Neraca -- mencari data duplikat,
          nomor ganda, akun/kategori yang tidak dikenal sistem, dan menghitung ULANG beberapa angka laporan secara
          independen (bukan cuma membaca angka yang sudah jadi) untuk menemukan selisih yang menandakan bug. Klik
          "🔍 Cek Sekarang" di tiap bagian untuk melihat hasilnya.
        </div>
      </div>

      <BagianCek
        judul="💰 1. Kas Masuk (Pembayaran &amp; Pemasukan Lain)"
        deskripsi="Cek nomor ganda, entri duplikat, akun tak dikenal, dan nominal tidak valid."
        terbuka={!!dicek.kasMasuk}
        onBuka={() => buka('kasMasuk')}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <span className={`badge ${nomorGandaPemasukanLain > 0 ? 'badge-red' : 'badge-green'}`}>Nomor Ganda Pemasukan Lain: {nomorGandaPemasukanLain}</span>
          <span className={`badge ${duplikatPemasukanLain.length > 0 ? 'badge-red' : 'badge-green'}`}>Kelompok Duplikat Pemasukan Lain: {duplikatPemasukanLain.length}</span>
          <span className={`badge ${akunTakDikenalMasuk.length > 0 ? 'badge-red' : 'badge-green'}`}>Akun Tak Dikenal: {akunTakDikenalMasuk.length}</span>
          <span className={`badge ${nominalTidakValidMasuk.length > 0 ? 'badge-red' : 'badge-green'}`}>Nominal ≤ 0: {nominalTidakValidMasuk.length}</span>
        </div>

        {nomorGandaPemasukanLain > 0 && (
          <div className="card-head" style={{ padding: '0 0 14px', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 12.5, color: 'var(--red)', margin: 0 }}>
              🔴 Ditemukan {nomorGandaPemasukanLain} nomor "No" ganda di sheet Pemasukan Lain -- ini bikin pencocokan akun/laporan bisa salah. Aman diperbaiki -- cuma mengganti nomor, tidak menghapus apa pun.
            </p>
            <button className="btn btn-sm btn-primary" onClick={() => perbaikiNomorGandaSheet('pemasukanLain', 'Pemasukan Lain', refreshPemasukanLain)} disabled={memperbaikiNomor.pemasukanLain}>
              {memperbaikiNomor.pemasukanLain ? 'Memperbaiki...' : '🔧 Perbaiki Nomor Ganda'}
            </button>
          </div>
        )}

        {duplikatPemasukanLain.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="card-head" style={{ padding: '10px 0' }}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>Baris Pemasukan Lain yang persis sama (tanggal, kategori, keterangan, nominal, akun) -- biasanya bekas submit dobel.</p>
              <button className="btn btn-sm btn-primary" onClick={hapusDuplikatPemasukanLain} disabled={memproses}>{memproses ? 'Menghapus...' : `🧹 Hapus ${totalHapusPemasukanLain} Baris Duplikat`}</button>
            </div>
            <table>
              <thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Jumlah Baris</th></tr></thead>
              <tbody>
                {duplikatPemasukanLain.map(k => (
                  <tr key={k.kunci}>
                    <td>{k.simpan.tanggal}</td><td>{k.simpan.kategori}</td><td>{k.simpan.keterangan}</td>
                    <td>{formatRupiah(k.simpan.nominal)}</td><td style={{ fontWeight: 700 }}>{k.jumlahBaris} baris (hapus {k.hapus.length})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {akunTakDikenalMasuk.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 8px' }}>
              🔴 Total <strong>{formatRupiah(totalHilangDariMasuk)}</strong> dari baris berikut memakai nama Akun yang TIDAK terdaftar di Data Akun -- uang ini tidak akan muncul di Buku Besar/Cashflow/Neraca akun manapun. Perbaiki nama Akun-nya di Google Sheets, atau tambahkan akun itu di menu Data Akun.
            </p>
            <table>
              <thead><tr><th>Sumber</th><th>Tanggal</th><th>Nama/Jenis</th><th>Akun (tidak dikenal)</th><th>Nominal</th></tr></thead>
              <tbody>
                {akunTakDikenalMasuk.map((r, i) => (
                  <tr key={i}><td>{r.sumber}</td><td>{r.tanggal}</td><td>{r.namaSiswa || r.keterangan || '-'}</td><td style={{ color: 'var(--red)' }}>{r.akun}</td><td>{formatRupiah(r.nominal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nominalTidakValidMasuk.length > 0 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 8px' }}>🔴 Baris dengan Nominal 0 atau minus (kemungkinan data salah input):</p>
            <table>
              <thead><tr><th>Sumber</th><th>Tanggal</th><th>Nama/Jenis</th><th>Nominal</th></tr></thead>
              <tbody>
                {nominalTidakValidMasuk.map((r, i) => (
                  <tr key={i}><td>{r.sumber}</td><td>{r.tanggal}</td><td>{r.namaSiswa || r.keterangan || '-'}</td><td style={{ color: 'var(--red)' }}>{formatRupiah(r.nominal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nomorGandaPemasukanLain === 0 && duplikatPemasukanLain.length === 0 && akunTakDikenalMasuk.length === 0 && nominalTidakValidMasuk.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 16 }}>✅ Tidak ditemukan masalah di Kas Masuk.</p>
        )}
      </BagianCek>

      <BagianCek
        judul="💸 2. Kas Keluar (Pengeluaran)"
        deskripsi="Cek nomor ganda, entri duplikat, akun/kategori tak dikenal, dan nominal tidak valid."
        terbuka={!!dicek.kasKeluar}
        onBuka={() => buka('kasKeluar')}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <span className={`badge ${nomorGandaPengeluaran > 0 ? 'badge-red' : 'badge-green'}`}>Nomor Ganda: {nomorGandaPengeluaran}</span>
          <span className={`badge ${duplikatPengeluaran.length > 0 ? 'badge-red' : 'badge-green'}`}>Kelompok Duplikat: {duplikatPengeluaran.length}</span>
          <span className={`badge ${akunTakDikenalKeluar.length > 0 ? 'badge-red' : 'badge-green'}`}>Akun Tak Dikenal: {akunTakDikenalKeluar.length}</span>
          <span className={`badge ${kategoriTidakValid.length > 0 ? 'badge-red' : 'badge-green'}`}>Kategori Tidak Valid: {kategoriTidakValid.length}</span>
          <span className={`badge ${nominalTidakValidKeluar.length > 0 ? 'badge-red' : 'badge-green'}`}>Nominal ≤ 0: {nominalTidakValidKeluar.length}</span>
        </div>

        {nomorGandaPengeluaran > 0 && (
          <div className="card-head" style={{ padding: '0 0 14px', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 12.5, color: 'var(--red)', margin: 0 }}>
              🔴 Ditemukan {nomorGandaPengeluaran} nomor "No" ganda di sheet Pengeluaran -- ini bikin pencocokan akun/laporan bisa salah. Aman diperbaiki -- cuma mengganti nomor, tidak menghapus apa pun.
            </p>
            <button className="btn btn-sm btn-primary" onClick={() => perbaikiNomorGandaSheet('pengeluaran', 'Pengeluaran', refreshPengeluaran)} disabled={memperbaikiNomor.pengeluaran}>
              {memperbaikiNomor.pengeluaran ? 'Memperbaiki...' : '🔧 Perbaiki Nomor Ganda'}
            </button>
          </div>
        )}

        {duplikatPengeluaran.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="card-head" style={{ padding: '10px 0' }}>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>Baris Pengeluaran yang persis sama -- biasanya bekas submit dobel.</p>
              <button className="btn btn-sm btn-primary" onClick={hapusDuplikatPengeluaran} disabled={memproses}>{memproses ? 'Menghapus...' : `🧹 Hapus ${totalHapusPengeluaran} Baris Duplikat`}</button>
            </div>
            <table>
              <thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Jumlah Baris</th></tr></thead>
              <tbody>
                {duplikatPengeluaran.map(k => (
                  <tr key={k.kunci}>
                    <td>{k.simpan.tanggal}</td><td>{k.simpan.kategori}</td><td>{k.simpan.keterangan}</td>
                    <td>{formatRupiah(k.simpan.nominal)}</td><td style={{ fontWeight: 700 }}>{k.jumlahBaris} baris (hapus {k.hapus.length})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {akunTakDikenalKeluar.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 8px' }}>
              🔴 Total <strong>{formatRupiah(totalHilangDariKeluar)}</strong> memakai Akun yang tidak terdaftar -- tidak akan mengurangi saldo akun manapun di Buku Besar/Cashflow/Neraca.
            </p>
            <table>
              <thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Akun (tidak dikenal)</th><th>Nominal</th></tr></thead>
              <tbody>
                {akunTakDikenalKeluar.map((r, i) => (
                  <tr key={i}><td>{r.tanggal}</td><td>{r.kategori}</td><td>{r.keterangan}</td><td style={{ color: 'var(--red)' }}>{r.akun}</td><td>{formatRupiah(r.nominal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {kategoriTidakValid.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 8px' }}>
              🔴 Baris dengan Kategori yang bukan salah satu pilihan resmi ({KATEGORI_PENGELUARAN_OPTIONS.join(', ')}) -- tetap terhitung benar di TOTAL Laba Rugi, tapi TIDAK akan muncul di akun Beban per-kategori manapun di Buku Besar (jadi rincian per-kategorinya kurang lengkap).
            </p>
            <table>
              <thead><tr><th>Tanggal</th><th>Kategori (tidak valid)</th><th>Keterangan</th><th>Nominal</th></tr></thead>
              <tbody>
                {kategoriTidakValid.map((r, i) => (
                  <tr key={i}><td>{r.tanggal}</td><td style={{ color: 'var(--red)' }}>{r.kategori}</td><td>{r.keterangan}</td><td>{formatRupiah(r.nominal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nominalTidakValidKeluar.length > 0 && (
          <div>
            <p style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 8px' }}>🔴 Baris dengan Nominal 0 atau minus:</p>
            <table>
              <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Nominal</th></tr></thead>
              <tbody>
                {nominalTidakValidKeluar.map((r, i) => (
                  <tr key={i}><td>{r.tanggal}</td><td>{r.keterangan}</td><td style={{ color: 'var(--red)' }}>{formatRupiah(r.nominal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nomorGandaPengeluaran === 0 && duplikatPengeluaran.length === 0 && akunTakDikenalKeluar.length === 0 && kategoriTidakValid.length === 0 && nominalTidakValidKeluar.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 16 }}>✅ Tidak ditemukan masalah di Kas Keluar.</p>
        )}
      </BagianCek>

      <BagianCek
        judul="📒 3. Buku Besar"
        deskripsi="Dampak akun tak dikenal ke Buku Besar, dan akun Kewajiban/Modal yang belum didukung sistem."
        terbuka={!!dicek.bukuBesar}
        onBuka={() => buka('bukuBesar')}
      >
        <p style={{ fontSize: 12.5, color: (totalHilangDariMasuk + totalHilangDariKeluar) > 0 ? 'var(--red)' : 'var(--muted)' }}>
          {(totalHilangDariMasuk + totalHilangDariKeluar) > 0
            ? <>🔴 Total <strong>{formatRupiah(totalHilangDariMasuk)}</strong> pemasukan dan <strong>{formatRupiah(totalHilangDariKeluar)}</strong> pengeluaran memakai Akun tak dikenal (lihat bagian Kas Masuk/Kas Keluar di atas) -- transaksi ini TIDAK tercatat di akun manapun di Buku Besar.</>
            : '✅ Semua transaksi memakai Akun yang dikenal sistem -- tidak ada yang "hilang" dari Buku Besar.'}
        </p>
        {akunKewajibanModal.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12.5, color: '#8a5b00', margin: '0 0 8px' }}>
              ℹ️ Ada {akunKewajibanModal.length} akun custom berjenis Kewajiban/Modal terdaftar di Data Akun -- sistem saat ini <strong>belum punya modul</strong> yang mencatat mutasi ke akun jenis ini (Buku Besar/Neraca hanya mendukung Kas, Piutang, Pendapatan, Beban, dan Aktiva custom). Akun ini akan selalu tampil kosong/tidak terpakai:
            </p>
            <table>
              <thead><tr><th>Kode</th><th>Nama Akun</th><th>Jenis</th></tr></thead>
              <tbody>{akunKewajibanModal.map(a => <tr key={a.id}><td>{a.kode}</td><td>{a.nama}</td><td>{a.jenis}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </BagianCek>

      <BagianCek
        judul="💵 4. Cashflow"
        deskripsi={`Bandingkan total Kas Masuk/Keluar Cashflow dengan Rekapitulasi & Pengeluaran, Tahun Ajaran ${taLabel || '-'}.`}
        terbuka={!!dicek.cashflow}
        onBuka={() => buka('cashflow')}
      >
        {!taLabel ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran aktif -- atur dulu di menu Profil Sekolah &amp; Tahun Ajaran.</p>
        ) : (
          <>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 12 }}>
              Catatan: saldo per akun di Cashflow SENGAJA mulai dari 0 tiap awal Tahun Ajaran (beda dari Buku Besar/Neraca yang kumulatif sejak awal) -- itu bukan bug. Pengecekan di sini fokus ke TOTAL masuk/keluar 1 tahun ajaran saja, yang seharusnya identik dengan Rekapitulasi &amp; Pengeluaran.
            </p>
            <table>
              <thead><tr><th></th><th>Cashflow</th><th>Rekapitulasi/Pengeluaran</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>Total Kas Masuk</td><td>{formatRupiah(totalMasukCashflow)}</td><td>{formatRupiah(totalRekapPemasukanTA)}</td><td><Selisih nilai={totalRekapPemasukanTA - totalMasukCashflow} /></td></tr>
                <tr><td>Total Kas Keluar</td><td>{formatRupiah(totalKeluarCashflow)}</td><td>{formatRupiah(totalRekapPengeluaranTA)}</td><td><Selisih nilai={totalRekapPengeluaranTA - totalKeluarCashflow} /></td></tr>
              </tbody>
            </table>
            {(Math.abs(totalRekapPemasukanTA - totalMasukCashflow) >= 1 || Math.abs(totalRekapPengeluaranTA - totalKeluarCashflow) >= 1) && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 10 }}>
                🔴 Ada selisih -- kemungkinan besar penyebabnya baris dengan Akun tak dikenal (lihat bagian Kas Masuk/Kas Keluar): Cashflow hanya menjumlahkan transaksi yang Akun-nya cocok dengan akun terdaftar, sedangkan Rekapitulasi/Pengeluaran menjumlahkan SEMUA baris tanpa peduli Akun-nya cocok atau tidak.
              </p>
            )}
          </>
        )}
      </BagianCek>

      <BagianCek
        judul="📈 5. Rekapitulasi"
        deskripsi={`Hitung ulang total Pemasukan Tahun Ajaran ${taLabel || '-'} secara independen, bandingkan dengan angka yang ditampilkan.`}
        terbuka={!!dicek.rekap}
        onBuka={() => buka('rekap')}
      >
        {!taLabel ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran aktif.</p>
        ) : (
          <table>
            <thead><tr><th></th><th>Ditampilkan Rekapitulasi</th><th>Dihitung Ulang Independen</th><th>Status</th></tr></thead>
            <tbody>
              <tr>
                <td>Total Pemasukan Setahun</td>
                <td>{formatRupiah(totalRekapPemasukanTA)}</td>
                <td>{formatRupiah(totalPemasukanIndependen)}</td>
                <td><Selisih nilai={totalPemasukanIndependen - totalRekapPemasukanTA} /></td>
              </tr>
            </tbody>
          </table>
        )}
      </BagianCek>

      <BagianCek
        judul="📊 6. Laba Rugi"
        deskripsi={`Hitung ulang Laba/Rugi Tahun Ajaran ${taLabel || '-'} secara independen dari data mentah.`}
        terbuka={!!dicek.labaRugi}
        onBuka={() => buka('labaRugi')}
      >
        {!taLabel ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran aktif.</p>
        ) : (
          <>
            <table>
              <thead><tr><th></th><th>Ditampilkan Laba Rugi</th><th>Dihitung Ulang Independen</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>Laba/Rugi Setahun</td><td>{formatRupiah(labaRugiDariLaporan)}</td><td>{formatRupiah(labaRugiIndependen)}</td><td><Selisih nilai={labaRugiIndependen - labaRugiDariLaporan} /></td></tr>
              </tbody>
            </table>
            {kategoriTidakValid.length > 0 && (
              <p style={{ fontSize: 12, color: '#8a5b00', marginTop: 10 }}>
                ℹ️ Total Laba Rugi tetap benar walau ada Kategori Pengeluaran tidak valid (lihat bagian Kas Keluar) -- yang terdampak cuma rincian per-kategori di Buku Besar, bukan totalnya.
              </p>
            )}
          </>
        )}
      </BagianCek>

      <BagianCek
        judul="⚖️ 7. Neraca"
        deskripsi="Cek Piutang, saldo Kas per akun, dan identitas Modal = Total Aktiva, dihitung ulang secara independen."
        terbuka={!!dicek.neraca}
        onBuka={() => buka('neraca')}
      >
        <table style={{ marginBottom: 14 }}>
          <thead><tr><th></th><th>Ditampilkan Neraca</th><th>Dihitung Ulang Independen</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Piutang</td><td>{formatRupiah(piutangNeraca)}</td><td>{formatRupiah(piutangPolos)}</td><td><Selisih nilai={piutangPolos - piutangNeraca} /></td></tr>
            <tr><td>Modal / Ekuitas (= Total Aktiva)</td><td>{formatRupiah(totalAktivaNeraca)}</td><td>{formatRupiah(modalIndependen)}</td><td><Selisih nilai={modalIndependen - totalAktivaNeraca} /></td></tr>
          </tbody>
        </table>
        {Math.abs(piutangPolos - piutangNeraca) >= 1 && (
          <p style={{ fontSize: 12, color: '#8a5b00', marginBottom: 10 }}>
            ℹ️ Selisih Piutang ini BISA WAJAR (bukan bug) kalau ada tagihan SPP bulan DEPAN yang sudah diterbitkan lebih awal -- Neraca sengaja belum menghitungnya sebagai piutang sampai tanggal mulai bulan itu tiba.
          </p>
        )}
        {Math.abs(modalIndependen - totalAktivaNeraca) >= 1 && (
          <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>
            🔴 Neraca TIDAK menghitung Modal secara independen -- dia cuma menyalin angka Total Aktiva apa adanya (Kewajiban dihardcode 0). Selisih di atas dihitung dari Pendapatan akrual (semua tagihan yang pernah terbit) dikurangi semua Pengeluaran sepanjang masa -- kalau ada selisih, kemungkinan penyebabnya sama dengan temuan Akun Tak Dikenal di atas (uang yang tidak tercatat ke akun manapun), atau ada modal awal/kewajiban yang belum tercatat di sistem ini.
          </p>
        )}
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', margin: '10px 0 6px' }}>Saldo Kas per Akun (hitung ulang independen)</div>
        <table>
          <thead><tr><th>Akun</th><th>Saldo</th></tr></thead>
          <tbody>{saldoKasPerAkun.map(a => <tr key={a.nama}><td>{a.nama}</td><td>{formatRupiah(a.saldo)}</td></tr>)}</tbody>
        </table>
      </BagianCek>
    </div>
  );
}
