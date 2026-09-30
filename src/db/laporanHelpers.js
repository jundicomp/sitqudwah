import { BULAN_ID, parseTanggalFleksibel } from './helpers';
import { METODE_PEMUTIHAN } from './pembayaranFields';
import { nominalEfektifTagihan } from './beasiswaFields';

// Tanggal PIUTANG "muncul" (debit) utk 1 tagihan -- SENGAJA BUKAN tanggal jatuh tempo,
// krn siswa BIASA membayar SEBELUM jatuh tempo. Kalau piutang baru dianggap muncul di
// tanggal jatuh tempo, pembayaran yg lebih awal akan tampak LEBIH DULU drpd piutangnya
// sendiri di buku besar -- bikin saldo sempat minus sesaat (bug nyata yg ditemukan &
// diperbaiki). Dipakai BERSAMA oleh Buku Besar (mutasi) dan piutangAsOf (Neraca) supaya
// definisi "piutang" SELALU konsisten di kedua laporan.
// Utk tagihan SPP: piutang dianggap timbul di TANGGAL 1 bulan tagihan itu sendiri
// (mis. SPP Agustus -> 1 Agustus). Utk tagihan Biaya Lain (tidak py info bulan):
// mundurkan jatuh tempo 30 hari sbg perkiraan aman.
export function tanggalPiutangMuncul(t) {
  if (t.refType === 'SPP' && t.bulan && t.tahunKalender) {
    const monthIdx = BULAN_ID.indexOf(t.bulan);
    if (monthIdx >= 0) return new Date(t.tahunKalender, monthIdx, 1).toISOString().slice(0, 10);
  }
  const jt = parseTanggalFleksibel(t.jatuhTempo);
  if (jt) { const d = new Date(jt); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }
  return t.jatuhTempo;
}

// Pemutihan Piutang BUKAN uang yang benar-benar diterima -- WAJIB dikecualikan
// dari semua perhitungan "pemasukan" supaya laporan keuangan tidak menggelembung palsu.
export function pembayaranAsli(pembayaran) {
  return pembayaran.filter(p => p.metode !== METODE_PEMUTIHAN);
}

// Bangun daftar 12 bulan (Juli-Juni) utk satu tahun ajaran, format {monthIdx, calYear, label}.
export function bulanTahunAjaran(tahunAjaranLabel) {
  const startYear = parseInt(String(tahunAjaranLabel).split('/')[0]);
  const list = [];
  for (let m = 0; m < 12; m++) {
    const monthIdx = (6 + m) % 12; // mulai Juli
    const calYear = monthIdx >= 6 ? startYear : startYear + 1;
    list.push({ monthIdx, calYear, label: `${BULAN_ID[monthIdx]} ${calYear}` });
  }
  return list;
}

// Rekap pemasukan (dari pembayaran ASLI + Pemasukan Lain) per bulan dlm 1 tahun ajaran.
// "pemasukanLain" opsional -- kalau tidak dikirim, tetap jalan spt sebelumnya (backward compat
// utk pemanggil lama yg belum di-update), cuma kolom "lainnya"-nya akan 0.
export function rekapPemasukanBulanan(tahunAjaranLabel, pembayaran, pemasukanLain = []) {
  const bulanList = bulanTahunAjaran(tahunAjaranLabel);
  const asli = pembayaranAsli(pembayaran);
  return bulanList.map(b => {
    const inBulan = asli.filter(p => {
      const d = parseTanggalFleksibel(p.tanggalBayar);
      return d && d.getMonth() === b.monthIdx && d.getFullYear() === b.calYear;
    });
    const spp = inBulan.filter(p => p.refType === 'SPP').reduce((s, p) => s + p.nominal, 0);
    const lain = inBulan.filter(p => p.refType === 'LAIN').reduce((s, p) => s + p.nominal, 0);
    const lainnya = pemasukanLain
      .filter(p => {
        const d = parseTanggalFleksibel(p.tanggal);
        return d && d.getMonth() === b.monthIdx && d.getFullYear() === b.calYear;
      })
      .reduce((s, p) => s + p.nominal, 0);
    return { ...b, spp, lain, lainnya, total: spp + lain + lainnya };
  });
}

// Piutang Siswa "as-of" suatu titik waktu -- tagihan yg jatuh temponya sudah lewat
// cutoff, dikurangi yg sudah dibayar SEBELUM/PADA cutoff itu. Dipakai BERSAMA oleh
// Neraca dan Buku Besar supaya angka piutangnya SELALU konsisten di kedua laporan.
export function piutangAsOf(allTagihan, pembayaran, cutoffMs, beasiswaSiswa = [], beasiswaKategori = []) {
  return allTagihan.reduce((s, t) => {
    const muncul = parseTanggalFleksibel(tanggalPiutangMuncul(t));
    if (!muncul || muncul.getTime() > cutoffMs) return s;
    const dibayarSampaiCutoff = pembayaran
      .filter(p => p.refType === t.refType && p.refNo === t.no && p.metode !== 'Pemutihan Piutang')
      // Lapis pengaman NISN yg sama dgn hitungTerbayar() (lihat perbaikan v1.31.7) --
      // TANPA ini, pembayaran siswa lain yg kebetulan RefNo-nya sama (data lama sblm
      // perbaikan penomoran) bisa salah "ketiban" ke tagihan siswa ini, bikin Piutang
      // Neraca/Buku Besar keliru. Data lama yg NISN-nya kosong tetap dihitung spy
      // riwayat lama tidak berubah.
      .filter(p => !t.nisn || !p.nisn || p.nisn === t.nisn)
      .filter(p => { const d = parseTanggalFleksibel(p.tanggalBayar); return d && d.getTime() <= cutoffMs; })
      .reduce((sum, p) => sum + p.nominal, 0);
    // Nominal yg dipakai utk piutang adalah nominal EFEKTIF (mempertimbangkan beasiswa yg
    // aktif per cutoffMs) -- bukan nominal mentah yg tersimpan di Sheet -- supaya kasus
    // "SPP diterbitkan dulu, beasiswa dipasang belakangan" tidak keliru dianggap piutang.
    const { nominalEfektif } = nominalEfektifTagihan(t, beasiswaSiswa, beasiswaKategori, cutoffMs, dibayarSampaiCutoff);
    const sisa = nominalEfektif - dibayarSampaiCutoff;
    return s + (sisa > 0 ? sisa : 0);
  }, 0);
}

// Total nominal transaksi (array of {tanggal, nominal, akun}) yg tanggalnya <= cutoff,
// OPSIONAL difilter ke akun kas/bank tertentu (akunNama) -- dipakai Neraca & Buku Besar
// supaya bisa menampilkan/menghitung SETIAP akun kas/bank secara terpisah.
export function totalAsOf(items, getTanggal, getNominal, getAkun, cutoffMs, akunNama) {
  return items.reduce((s, it) => {
    const d = parseTanggalFleksibel(getTanggal(it));
    if (!d || d.getTime() > cutoffMs) return s;
    if (akunNama !== undefined) {
      const akunItem = getAkun(it) || 'Kas'; // data lama tanpa field akun -> fallback Kas
      if (akunItem !== akunNama) return s;
    }
    return s + getNominal(it);
  }, 0);
}
export function rekapPengeluaranBulanan(tahunAjaranLabel, pengeluaran) {
  const bulanList = bulanTahunAjaran(tahunAjaranLabel);
  return bulanList.map(b => {
    const total = pengeluaran
      .filter(p => {
        const d = parseTanggalFleksibel(p.tanggal);
        return d && d.getMonth() === b.monthIdx && d.getFullYear() === b.calYear;
      })
      .reduce((s, p) => s + p.nominal, 0);
    return { ...b, total };
  });
}

// Cashflow per bulan (kas masuk vs kas keluar) + SALDO KAS KUMULATIF di akhir tiap
// bulan, dihitung berjalan dari bulan pertama tahun ajaran (Juli) -- bukan cuma
// per-bulan berdiri sendiri. "saldoAwal" opsional (default 0) utk kasus sekolah yg
// mau memasukkan saldo kas dari sebelum tahun ajaran ini dimulai.
// Sama seperti rekapCashflowBulanan, TAPI dipecah per akun kas/bank (Kas, Bank BCA, dst)
// -- bukan digabung jadi 1 angka "Kas" gabungan. "daftarAkun" = array nama akun kas/bank.
// Data lama tanpa field "akun" dianggap masuk "Kas" (fallback, konsisten dgn Buku Besar).
export function rekapCashflowPerAkunBulanan(tahunAjaranLabel, pembayaran, pemasukanLain, pengeluaran, daftarAkun) {
  const bulanList = bulanTahunAjaran(tahunAjaranLabel);
  const asli = pembayaranAsli(pembayaran);
  const saldoBerjalan = {};
  daftarAkun.forEach(a => { saldoBerjalan[a] = 0; });

  return bulanList.map(b => {
    const dalamBulan = (tglRaw) => {
      const d = parseTanggalFleksibel(tglRaw);
      return d && d.getMonth() === b.monthIdx && d.getFullYear() === b.calYear;
    };
    const hasil = { label: b.label, monthIdx: b.monthIdx, calYear: b.calYear };
    daftarAkun.forEach(akunNama => {
      const cocok = (item) => (item.akun || 'Kas') === akunNama;
      const masuk = asli.filter(p => dalamBulan(p.tanggalBayar) && cocok(p)).reduce((s, p) => s + p.nominal, 0)
        + pemasukanLain.filter(p => dalamBulan(p.tanggal) && cocok(p)).reduce((s, p) => s + p.nominal, 0);
      const keluar = pengeluaran.filter(p => dalamBulan(p.tanggal) && cocok(p)).reduce((s, p) => s + p.nominal, 0);
      saldoBerjalan[akunNama] += (masuk - keluar);
      hasil[akunNama] = saldoBerjalan[akunNama];
      hasil[akunNama + '__masuk'] = masuk;
      hasil[akunNama + '__keluar'] = keluar;
    });
    return hasil;
  });
}

export function rekapCashflowBulanan(tahunAjaranLabel, pembayaran, pemasukanLain, pengeluaran, saldoAwal = 0) {
  const pemasukanBulanan = rekapPemasukanBulanan(tahunAjaranLabel, pembayaran, pemasukanLain);
  const pengeluaranBulanan = rekapPengeluaranBulanan(tahunAjaranLabel, pengeluaran);
  let saldoBerjalan = saldoAwal;
  return pemasukanBulanan.map((p, i) => {
    const kasMasuk = p.total;
    const kasKeluar = pengeluaranBulanan[i].total;
    const netBulanIni = kasMasuk - kasKeluar;
    saldoBerjalan += netBulanIni;
    return { ...p, kasMasuk, kasKeluar, netBulanIni, saldoAkhirBulan: saldoBerjalan };
  });
}
