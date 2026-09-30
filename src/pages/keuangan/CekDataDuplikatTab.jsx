import { useMemo, useState, Fragment } from 'react';
import { useAppData } from '../../context/AppContext';
import { deleteTagihanLainFromSheet, bulkDeleteTagihanSppFromSheet, bulkDeleteTagihanLainFromSheet, bulkDeletePembayaranFromSheet, addLogEntry, perbaikiNomorGanda, fetchPembayaranFromSheet, updatePembayaranInSheet } from '../../services/googleSheets';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah } from '../../db/helpers';
import ProgressModal from '../../components/common/ProgressModal';

// Analisis 1 kelompok (kunci) baris tagihan yg SAMA PERSIS (siswa+jenis+bulan sesuai) --
// pilih baris mana yg AMAN dihapus. Baris yg py PEMBAYARAN (pembayaran.refNo cocok)
// TIDAK PERNAH dihapus -- kalau lebih dari 1 baris dlm 1 kelompok punya pembayaran,
// itu kasus ambigu (jangan disentuh sama sekali, biar diperiksa manual).
function analisisKelompok(rows, pembayaranByRefNo) {
  const punyaPembayaran = rows.filter(r => pembayaranByRefNo.has(r.no));
  if (punyaPembayaran.length > 1) {
    return { aman: false, alasan: 'Lebih dari 1 baris dalam kelompok ini punya riwayat pembayaran -- tidak disentuh, perlu diperiksa manual.', simpan: null, hapus: [], punyaPembayaran };
  }
  if (punyaPembayaran.length === 1) {
    const simpan = punyaPembayaran[0];
    return { aman: true, alasan: null, simpan, hapus: rows.filter(r => r.no !== simpan.no), punyaPembayaran };
  }
  // Tidak ada yg py pembayaran sama sekali -- simpan yg PALING AWAL (No terkecil = pertama dibuat).
  const terurut = [...rows].sort((a, b) => Number(a.no) - Number(b.no));
  const simpan = terurut[0];
  return { aman: true, alasan: null, simpan, hapus: terurut.slice(1), punyaPembayaran };
}

// Isi tab "Cek Data Duplikat" di dalam halaman "Cek Data dan Sistem" (lihat
// CekDataSistem.jsx) -- dulu file ini SENDIRI 1 halaman penuh ("Bersihkan Data
// Duplikat"), sekarang jadi tab pertama supaya bisa digabung 1 halaman dgn tab
// "Cek Data NISN" (CekDataNisnTab.jsx). pageId hak akses TETAP "bersihkan-duplikat"
// (tidak diganti) supaya pengaturan hak akses lama yg sudah tersimpan per role tidak
// hilang/ke-reset.
export default function CekDataDuplikatTab() {
  const { allTagihan, pembayaran, tarif, siswa, refreshTagihanSpp, refreshTagihanLain, refreshPembayaran, toast } = useAppData();
  const { currentUser } = useAuth();
  const [memproses, setMemproses] = useState(false);
  const [memperbaikiNomor, setMemperbaikiNomor] = useState(false);
  const [terbukaDetail, setTerbukaDetail] = useState({}); // { [kunci]: true }

  // Deteksi "No" yg KEBETULAN dobel dlm 1 sheet yg SAMA (akibat bug lama, race
  // condition saat penerbitan cepat berturut-turut -- sudah diperbaiki di server,
  // ini cuma soal DATA LAMA yg terlanjur rusak). Kalau ada, WAJIB diperbaiki DULU
  // sebelum analisis duplikat di bawah bisa dipercaya -- kalau tidak, pencocokan
  // "sudah dibayar atau belum" bisa salah (1 pembayaran keliatan cocok ke banyak
  // baris sekaligus krn "No"-nya kembar, bukan krn benar2 dibayar berkali-kali).
  // Sheet "Pembayaran" ikut dicek juga -- ditulis lewat appendRow_ yg SAMA, jadi
  // kena bug race condition yg SAMA persis di masa lalu.
  const nomorGandaSpp = useMemo(() => {
    const seen = new Set(); let jumlah = 0;
    allTagihan.filter(t => t.refType === 'SPP').forEach(t => { if (seen.has(t.no)) jumlah++; else seen.add(t.no); });
    return jumlah;
  }, [allTagihan]);
  const nomorGandaLain = useMemo(() => {
    const seen = new Set(); let jumlah = 0;
    allTagihan.filter(t => t.refType === 'LAIN').forEach(t => { if (seen.has(t.no)) jumlah++; else seen.add(t.no); });
    return jumlah;
  }, [allTagihan]);
  const nomorGandaPembayaran = useMemo(() => {
    const seen = new Set(); let jumlah = 0;
    pembayaran.forEach(p => { if (seen.has(p.no)) jumlah++; else seen.add(p.no); });
    return jumlah;
  }, [pembayaran]);
  const adaNomorGanda = nomorGandaSpp > 0 || nomorGandaLain > 0 || nomorGandaPembayaran > 0;

  async function perbaikiNomorGandaSemua() {
    setMemperbaikiNomor(true);
    try {
      const hasilSpp = nomorGandaSpp > 0 ? await perbaikiNomorGanda('tagihanSpp') : 0;
      const hasilLain = nomorGandaLain > 0 ? await perbaikiNomorGanda('tagihanLain') : 0;
      const hasilPembayaran = nomorGandaPembayaran > 0 ? await perbaikiNomorGanda('pembayaran') : 0;
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Perbaiki Nomor Ganda',
        modul: 'Tagihan & Biaya',
        detail: `Memperbaiki ${hasilSpp} nomor ganda di Tagihan SPP, ${hasilLain} di Tagihan Lain, ${hasilPembayaran} di Pembayaran`,
      });
      await refreshTagihanSpp();
      await refreshTagihanLain();
      await refreshPembayaran();
      toast(`${hasilSpp + hasilLain + hasilPembayaran} nomor ganda berhasil diperbaiki. Silakan periksa ulang daftar di bawah.`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMemperbaikiNomor(false);
    }
  }

  const [progress, setProgress] = useState(null);
  const [sudahDihapusKali, setSudahDihapusKali] = useState(0);

  const pembayaranByRefNo = useMemo(() => {
    const map = new Map(); // key: `${refType}-${refNo}` -> true
    pembayaran.forEach(p => map.set(`${p.refType}-${p.refNo}`, true));
    return map;
  }, [pembayaran]);

  const kelompokDuplikat = useMemo(() => {
    // Kunci kelompok: SPP -> nisn+bulan+tahunKalender. LAIN -> nisn+label (jenis biaya).
    const map = new Map();
    allTagihan.forEach(t => {
      const kunci = t.refType === 'SPP'
        ? `SPP|${t.nisn}|${t.bulan}|${t.tahunKalender}`
        : `LAIN|${t.nisn}|${t.label}`;
      if (!map.has(kunci)) map.set(kunci, []);
      map.get(kunci).push(t);
    });
    const hasil = [];
    map.forEach((rows, kunci) => {
      if (rows.length <= 1) return; // bukan duplikat
      const punyaPembayaranMap = new Map();
      rows.forEach(r => { punyaPembayaranMap.set(r.no, pembayaranByRefNo.has(`${r.refType}-${r.no}`)); });
      const cekPembayaran = { has: (no) => punyaPembayaranMap.get(no) };
      const analisis = analisisKelompok(rows, cekPembayaran);
      // Lampirkan detail PEMBAYARAN ASLI (tanggal, nominal, metode) utk tiap baris yg
      // kedapatan "punya pembayaran" -- supaya user bisa lihat SENDIRI kenapa suatu
      // kelompok dianggap ambigu, bukan cuma percaya label "Ambigu" begitu saja.
      const punyaPembayaranDetail = (analisis.punyaPembayaran || []).map(r => ({
        ...r,
        detailBayar: pembayaran.filter(p => p.refType === r.refType && p.refNo === r.no),
      }));
      hasil.push({ kunci, refType: rows[0].refType, nisn: rows[0].nisn, namaSiswa: rows[0].namaSiswa, label: rows[0].label, bulan: rows[0].bulan, tahunKalender: rows[0].tahunKalender, jumlahBaris: rows.length, rows, ...analisis, punyaPembayaranDetail });
    });
    return hasil.sort((a, b) => b.jumlahBaris - a.jumlahBaris);
  }, [allTagihan, pembayaranByRefNo, pembayaran]);

  const kelompokAman = kelompokDuplikat.filter(k => k.aman);
  const kelompokAmbigu = kelompokDuplikat.filter(k => !k.aman);
  const totalBarisAkanDihapus = kelompokAman.reduce((s, k) => s + k.hapus.length, 0);

  // Dipakai utk nampilin tagihan terkait di tabel Pembayaran Duplikat di bawah.
  const tagihanByRefNo = useMemo(() => {
    const m = new Map();
    allTagihan.forEach(t => m.set(`${t.refType}-${t.no}`, t));
    return m;
  }, [allTagihan]);

  // Deteksi PEMBAYARAN yg tercatat BERKALI-KALI utk transaksi yg SAMA PERSIS --
  // beda dari duplikat TAGIHAN di atas (baris tagihan yg belum dibayar dobel-dobel),
  // ini soal 1 PEMBAYARAN yg SAMA nyangkut jadi banyak baris (mis. akibat form
  // pembayaran ke-klik/ke-submit berkali-kali sebelum LockService dipasang -- lihat
  // catatan appendRow_ di Code-Keuangan.gs). Akibatnya "Sudah Dibayar" di Kartu SPP,
  // Invoice, Rekap Tunggakan, dan Laporan Keuangan semua kelihatan lebih besar dari
  // yg SEBENARNYA diterima (kadang sampai jauh melebihi nominal tagihannya -- itu
  // tandanya, bukan cicilan/kelebihan bayar sungguhan). Kunci kelompok: SEMUA field
  // yg merepresentasikan "pembayaran yg sama" (refType+refNo+nominal+tanggal+metode+
  // keterangan+akun) -- BUKAN cuma refType+refNo, krn cicilan/pembayaran bertahap yg
  // GENUINELY beda (nominal/tanggal beda-beda) itu SAH & tidak boleh ikut dianggap
  // duplikat. Yg disimpan: baris dgn "No" PALING KECIL (paling awal dicatat).
  const kelompokPembayaranDuplikat = useMemo(() => {
    const map = new Map();
    pembayaran.forEach(p => {
      const kunci = `${p.refType}|${p.refNo}|${p.nominal}|${p.tanggalBayar}|${p.metode}|${p.keterangan}|${p.akun}`;
      if (!map.has(kunci)) map.set(kunci, []);
      map.get(kunci).push(p);
    });
    const hasil = [];
    map.forEach((rows, kunci) => {
      if (rows.length <= 1) return; // bukan duplikat
      const terurut = [...rows].sort((a, b) => Number(a.no) - Number(b.no));
      const simpan = terurut[0];
      const hapus = terurut.slice(1);
      const tagihanTerkait = tagihanByRefNo.get(`${rows[0].refType}-${rows[0].refNo}`);
      hasil.push({
        kunci, refType: rows[0].refType, refNo: rows[0].refNo, nisn: rows[0].nisn, namaSiswa: rows[0].namaSiswa,
        labelTagihan: tagihanTerkait ? tagihanTerkait.label : `${rows[0].jenis} (tagihan No=${rows[0].refNo}, mungkin sudah dihapus)`,
        nominal: rows[0].nominal, tanggalBayar: rows[0].tanggalBayar, metode: rows[0].metode,
        jumlahBaris: rows.length, rows, simpan, hapus,
      });
    });
    return hasil.sort((a, b) => b.jumlahBaris - a.jumlahBaris);
  }, [pembayaran, tagihanByRefNo]);
  const totalBarisPembayaranAkanDihapus = kelompokPembayaranDuplikat.reduce((s, k) => s + k.hapus.length, 0);
  const totalKelebihanTercatat = kelompokPembayaranDuplikat.reduce((s, k) => s + k.hapus.reduce((s2, r) => s2 + r.nominal, 0), 0);

  async function bersihkanPembayaranDuplikat() {
    if (totalBarisPembayaranAkanDihapus === 0) return;
    if (!confirm(`Akan menghapus ${totalBarisPembayaranAkanDihapus} baris pembayaran duplikat dari ${kelompokPembayaranDuplikat.length} kelompok (total ${formatRupiah(totalKelebihanTercatat)} pencatatan berlebih). Baris "Sudah Dibayar" tiap tagihan akan otomatis terkoreksi setelah ini. Lanjutkan?`)) return;

    setMemproses(true);
    const noHapus = kelompokPembayaranDuplikat.flatMap(k => k.hapus.map(r => r.no));
    setProgress({ current: 0, total: 1, label: 'Menghapus baris pembayaran duplikat' });
    let sukses = 0;
    let pesanError = null;
    try {
      const hasil = await bulkDeletePembayaranFromSheet(noHapus);
      sukses = hasil.jumlahDihapus;
    } catch (err) {
      pesanError = err.message;
    }
    setProgress({ current: 1, total: 1, label: 'Menghapus baris pembayaran duplikat' });

    await addLogEntry({
      username: currentUser.username,
      namaUser: currentUser.nama,
      aksi: 'Bersihkan Pembayaran Duplikat',
      modul: 'Tagihan & Biaya',
      detail: `Menghapus ${sukses} baris pembayaran duplikat dari ${kelompokPembayaranDuplikat.length} kelompok (total ${formatRupiah(totalKelebihanTercatat)} pencatatan berlebih)`
        + (pesanError ? ` -- GAGAL: ${pesanError}` : ''),
    });

    await refreshPembayaran();
    if (pesanError) {
      toast(`Gagal menghapus pembayaran duplikat: ${pesanError}. Pastikan skrip Apps Script Keuangan sudah versi terbaru.`, 'error');
    } else {
      toast(`${sukses} baris pembayaran duplikat berhasil dihapus. Total tagihan yang terpengaruh akan otomatis terkoreksi.`);
    }
    setMemproses(false);
    setProgress(null);
  }

  // Diagnosa TERPISAH dari duplikat: tagihan Biaya Lain yg NISN-nya SEKARANG di kelas
  // yg TIDAK cocok dgn tarif yg tarifnya spesifik (bukan "Semua Kelas"). Ini BUKAN
  // duplikat, tapi kemungkinan besar dari: tarif dulu "Semua Kelas" (kena semua siswa),
  // BELAKANGAN diubah jadi spesifik 1 kelas -- tagihan yg SUDAH TERLANJUR terbit ke
  // kelas lain TIDAK otomatis ikut berubah/hilang (memang begitu perilakunya -- tagihan
  // itu rekaman independen, bukan tersambung langsung ke tarif).
  const siswaByNisn = useMemo(() => { const m = new Map(); siswa.forEach(s => m.set(s.nisn, s)); return m; }, [siswa]);
  const tagihanSalahKelas = useMemo(() => {
    const hasil = [];
    allTagihan.filter(t => t.refType === 'LAIN').forEach(t => {
      // Cari SEMUA tarif dgn nama jenis yg SAMA utk tahun ajaran itu -- kalau ADA yg
      // spesifik-kelas (bukan Semua Kelas) DAN kelas siswa itu SEKARANG tidak cocok
      // dgn tarif spesifik manapun utk jenis itu, tandai.
      const tarifSejenis = tarif.filter(x => x.jenis === t.label && x.tahunAjaran === t.tahunAjaran);
      const adaYangSpesifik = tarifSejenis.some(x => x.kelasTingkat !== 'Semua Kelas');
      if (!adaYangSpesifik) return; // tarifnya emang "Semua Kelas" -- wajar semua kelas kena
      const s = siswaByNisn.get(t.nisn);
      if (!s) return;
      const cocok = tarifSejenis.some(x => x.kelasTingkat === s.kelasTingkat);
      if (!cocok) {
        const kelasSeharusnya = tarifSejenis.filter(x => x.kelasTingkat !== 'Semua Kelas').map(x => x.kelasTingkat).join(', ');
        hasil.push({ ...t, kelasSeharusnya, kelasSiswaSekarang: s.kelasTingkat, punyaPembayaran: pembayaranByRefNo.has(`LAIN-${t.no}`) });
      }
    });
    return hasil;
  }, [allTagihan, tarif, siswaByNisn, pembayaranByRefNo]);

  // Gabungkan 1 kelompok AMBIGU jadi 1 baris tagihan -- prinsip "1 tagihan = 1 baris":
  // semua PEMBAYARAN yg tadinya "nyasar" ke baris-baris duplikat lain DIPINDAH (RefNo
  // diarahkan ulang) ke baris yg disimpan, BUKAN dihapus/hilang -- baris duplikat yg
  // pembayarannya sudah dipindah baru aman dihapus. Kalau hasil akhirnya jadi lebih
  // besar dari nominal tagihan (kelebihan bayar genuinely terjadi), user diberi tahu
  // scr eksplisit supaya bisa ditindaklanjuti manual (refund/kreditkan ke bulan lain).
  async function konsolidasikanKelompok(k) {
    const totalDibayarSemua = k.punyaPembayaranDetail.reduce((s, r) => s + r.detailBayar.reduce((s2, d) => s2 + d.nominal, 0), 0);
    const nominalAsli = k.rows[0]?.nominal || 0;
    const pesanKelebihan = totalDibayarSemua > nominalAsli
      ? `\n\n⚠️ PERHATIAN: total pembayaran gabungan (${formatRupiah(totalDibayarSemua)}) LEBIH BESAR dari nominal tagihan (${formatRupiah(nominalAsli)}) -- ini kelebihan bayar SUNGGUHAN, tindak lanjuti manual (refund ke orang tua, atau kreditkan ke tagihan bulan lain).`
      : '';
    if (!confirm(`Gabungkan ${k.jumlahBaris} baris "${k.refType === 'SPP' ? `SPP ${k.bulan} ${k.tahunKalender}` : k.label}" milik ${k.namaSiswa} jadi 1 baris? Semua riwayat pembayaran akan dipindah ke baris yg disimpan, baris lainnya dihapus.${pesanKelebihan}`)) return;

    setMemproses(true);
    try {
      const simpan = [...k.rows].sort((a, b) => Number(a.no) - Number(b.no))[0];
      const dihapus = k.rows.filter(r => r.no !== simpan.no);

      // Pindahkan SEMUA pembayaran yg tadinya nunjuk ke baris LAIN (bukan yg disimpan)
      // supaya nunjuk ke baris yg disimpan -- pakai data MENTAH biar field lain (Metode,
      // Akun, dst) tidak ikut hilang saat ditulis ulang.
      const rawPembayaran = await fetchPembayaranFromSheet();
      for (const r of dihapus) {
        const pembayaranNyasar = rawPembayaran.filter(p => p['RefType'] === k.refType && Number(p['RefNo']) === Number(r.no));
        for (const p of pembayaranNyasar) {
          await updatePembayaranInSheet({ ...p, RefNo: simpan.no });
        }
      }
      // Baris yg SUDAH tidak py pembayaran lagi (sudah dipindah) baru aman dihapus --
      // sekaligus (bulk), bukan 1-per-1, konsisten dgn bersihkanSemua() di atas.
      const noDihapus = dihapus.map(r => r.no);
      if (k.refType === 'SPP') await bulkDeleteTagihanSppFromSheet(noDihapus);
      else await bulkDeleteTagihanLainFromSheet(noDihapus);

      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Konsolidasi Tagihan Ambigu',
        modul: 'Tagihan & Biaya',
        detail: `Menggabungkan ${k.jumlahBaris} baris "${k.refType === 'SPP' ? `SPP ${k.bulan} ${k.tahunKalender}` : k.label}" milik ${k.namaSiswa} (${k.nisn}) jadi 1 baris (No=${simpan.no}), ${dihapus.length} baris dihapus, riwayat pembayaran dipindahkan${totalDibayarSemua > nominalAsli ? ' -- TERDETEKSI KELEBIHAN BAYAR' : ''}`,
      });
      await refreshTagihanSpp();
      await refreshTagihanLain();
      toast(`Berhasil digabung jadi 1 baris.${totalDibayarSemua > nominalAsli ? ' Ada kelebihan bayar, mohon tindak lanjuti manual.' : ''}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMemproses(false);
    }
  }

  async function bersihkanSemua() {
    if (totalBarisAkanDihapus === 0) return;
    if (!confirm(`Akan menghapus ${totalBarisAkanDihapus} baris duplikat dari ${kelompokAman.length} kelompok. Baris yang punya riwayat pembayaran TIDAK akan dihapus. Lanjutkan?`)) return;

    setMemproses(true);
    const semuaHapus = [];
    kelompokAman.forEach(k => k.hapus.forEach(r => semuaHapus.push(r)));
    const noSpp = semuaHapus.filter(r => r.refType === 'SPP').map(r => r.no);
    const noLain = semuaHapus.filter(r => r.refType === 'LAIN').map(r => r.no);

    // PENTING -- dulu dihapus SATU-PER-SATU (1 request per baris, tiap request di
    // server men-scan ULANG seluruh kolom "No" sel-per-sel dari awal). Utk sheet yg
    // sudah berisi ratusan/ribuan baris, ini bisa makan waktu SANGAT lama & rawan
    // timeout di tengah jalan -- baris yg gagal diam2 dilewati (try/catch kosong),
    // jadi user melihat tombol "berhasil" padahal efeknya nyaris nihil. Sekarang
    // dikirim BULK (maks 2 request -- 1 utk SPP, 1 utk Biaya Lain), server hapus
    // semuanya dlm 1 eksekusi. Errornya juga sekarang DITAMPILKAN, tidak didiamkan.
    setProgress({ current: 0, total: (noSpp.length > 0 ? 1 : 0) + (noLain.length > 0 ? 1 : 0), label: 'Menghapus baris duplikat' });

    let sukses = 0;
    const pesanError = [];
    const noTidakDitemukanSemua = [];
    let langkah = 0;

    if (noSpp.length > 0) {
      try {
        const hasil = await bulkDeleteTagihanSppFromSheet(noSpp);
        sukses += hasil.jumlahDihapus;
        if (hasil.noTidakDitemukan.length > 0) noTidakDitemukanSemua.push(...hasil.noTidakDitemukan.map(no => `SPP No=${no}`));
      } catch (err) {
        pesanError.push(`SPP: ${err.message}`);
      }
      langkah++;
      setProgress({ current: langkah, total: (noSpp.length > 0 ? 1 : 0) + (noLain.length > 0 ? 1 : 0), label: 'Menghapus baris duplikat' });
    }
    if (noLain.length > 0) {
      try {
        const hasil = await bulkDeleteTagihanLainFromSheet(noLain);
        sukses += hasil.jumlahDihapus;
        if (hasil.noTidakDitemukan.length > 0) noTidakDitemukanSemua.push(...hasil.noTidakDitemukan.map(no => `Biaya Lain No=${no}`));
      } catch (err) {
        pesanError.push(`Biaya Lain: ${err.message}`);
      }
      langkah++;
      setProgress({ current: langkah, total: (noSpp.length > 0 ? 1 : 0) + (noLain.length > 0 ? 1 : 0), label: 'Menghapus baris duplikat' });
    }

    await addLogEntry({
      username: currentUser.username,
      namaUser: currentUser.nama,
      aksi: 'Bersihkan Duplikat',
      modul: 'Tagihan & Biaya',
      detail: `Menghapus ${sukses} baris tagihan duplikat dari ${kelompokAman.length} kelompok (SPP & Biaya Lain)`
        + (pesanError.length > 0 ? ` -- GAGAL SEBAGIAN: ${pesanError.join('; ')}` : '')
        + (noTidakDitemukanSemua.length > 0 ? ` -- tidak ditemukan di sheet: ${noTidakDitemukanSemua.join(', ')}` : ''),
    });

    await refreshTagihanSpp();
    await refreshTagihanLain();
    setSudahDihapusKali(k => k + sukses);

    if (pesanError.length > 0) {
      toast(`Hanya ${sukses} dari ${totalBarisAkanDihapus} baris berhasil dihapus -- ada yang gagal: ${pesanError.join('; ')}. Coba lagi, atau pastikan URL/skrip Apps Script Keuangan sudah versi terbaru (Deploy > Manage deployments > New version).`, 'error');
    } else if (noTidakDitemukanSemua.length > 0) {
      toast(`${sukses} baris berhasil dihapus. ${noTidakDitemukanSemua.length} baris lain sudah tidak ada di sheet (mungkin sudah terhapus sebelumnya).`);
    } else {
      toast(`${sukses} baris duplikat berhasil dihapus.`);
    }
    setMemproses(false);
    setProgress(null);
  }

  async function hapusSatuSalahKelas(t) {
    if (t.punyaPembayaran) { toast('Tagihan ini sudah ada riwayat pembayarannya, tidak bisa dihapus dari sini.', 'error'); return; }
    if (!confirm(`Hapus tagihan "${t.label}" milik ${t.namaSiswa} (kelas ${t.kelasSiswaSekarang}, seharusnya cuma kelas ${t.kelasSeharusnya})?`)) return;
    try {
      await deleteTagihanLainFromSheet(t.no);
      await refreshTagihanLain();
      toast('Tagihan berhasil dihapus.');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      {adaNomorGanda && (
        <div className="card" style={{ background: 'var(--red-soft)', marginBottom: 18, border: '1px solid #e0a99f' }}>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12.5, color: '#8a2b1f' }}>
              🔴 <strong>Ditemukan nomor "No" ganda</strong> ({nomorGandaSpp} di SPP, {nomorGandaLain} di Biaya Lain,
              {' '}{nomorGandaPembayaran} di Pembayaran) --
              ini bikin pencocokan "sudah dibayar" di bawah bisa SALAH (1 pembayaran terlihat cocok ke banyak baris
              sekaligus, padahal cuma nomornya yang kebetulan sama). <strong>Perbaiki dulu sebelum lanjut membersihkan
              duplikat.</strong> Aman dijalankan — cuma mengganti nomor, tidak menghapus apa pun.
            </div>
            <button className="btn btn-primary" onClick={perbaikiNomorGandaSemua} disabled={memperbaikiNomor} style={{ flexShrink: 0 }}>
              {memperbaikiNomor ? 'Memperbaiki...' : '🔧 Perbaiki Nomor Ganda'}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ background: 'var(--gold-soft)', marginBottom: 18 }}>
        <div className="card-body" style={{ fontSize: 12.5, color: '#8a5b00' }}>
          ⚠️ Alat ini memindai tagihan SPP &amp; Biaya Lain yang <strong>persis sama</strong> (siswa + jenis/bulan yang
          sama) dan menghapus baris berlebih, menyisakan <strong>1 baris saja</strong>. Baris yang sudah punya riwayat
          pembayaran <strong>tidak pernah dihapus</strong> — kalau lebih dari 1 baris dalam 1 kelompok sama-sama sudah
          dibayar, kelompok itu dilewati (perlu diperiksa manual) demi keamanan data.
        </div>
      </div>

      <div className="info-grid" style={{ marginBottom: 18 }}>
        <div className="card"><div className="card-body">
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>{kelompokDuplikat.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Kelompok Duplikat Ditemukan</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>{totalBarisAkanDihapus}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Baris Akan Dihapus (Aman)</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)' }}>{kelompokAmbigu.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Kelompok Ambigu (Dilewati)</div>
        </div></div>
      </div>

      <div className="card">
        <div className="card-head">
          <div><h3>Daftar Kelompok Duplikat</h3><p>Urut dari yang paling banyak duplikatnya.</p></div>
          <button className="btn btn-primary" onClick={bersihkanSemua} disabled={memproses || totalBarisAkanDihapus === 0 || adaNomorGanda} title={adaNomorGanda ? 'Perbaiki nomor ganda dulu di atas' : undefined}>
            {memproses ? 'Membersihkan...' : `🧹 Hapus ${totalBarisAkanDihapus} Baris Duplikat`}
          </button>
        </div>
        <div className="card-body table-scroll">
          {kelompokDuplikat.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
              ✅ Tidak ditemukan tagihan duplikat. Data Anda bersih!
            </p>
          )}
          {kelompokDuplikat.length > 0 && (
            <table>
              <thead>
                <tr><th>NISN</th><th>Nama Siswa</th><th>Jenis / Bulan</th><th>Jumlah Baris</th><th>Status</th></tr>
              </thead>
              <tbody>
                {kelompokDuplikat.map(k => (
                  <Fragment key={k.kunci}>
                    <tr>
                      <td>{k.nisn}</td>
                      <td>{k.namaSiswa}</td>
                      <td>{k.refType === 'SPP' ? `SPP ${k.bulan} ${k.tahunKalender}` : k.label}</td>
                      <td style={{ fontWeight: 700 }}>{k.jumlahBaris} baris</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {k.aman ? (
                          <span className="badge badge-green">Simpan 1, hapus {k.hapus.length}</span>
                        ) : (
                          <>
                            <span className="badge badge-red" title={k.alasan}>⚠️ Ambigu — dilewati</span>
                            <button className="btn btn-sm btn-primary" onClick={() => konsolidasikanKelompok(k)} disabled={memproses}>
                              🔗 Konsolidasikan
                            </button>
                          </>
                        )}
                        <button className="btn btn-sm" onClick={() => setTerbukaDetail(t => ({ ...t, [k.kunci]: !t[k.kunci] }))}>
                          {terbukaDetail[k.kunci] ? 'Tutup Detail' : 'Lihat Detail'}
                        </button>
                      </td>
                    </tr>
                    {terbukaDetail[k.kunci] && (
                      <tr>
                        <td colSpan={5} style={{ background: '#FAFBFA', padding: 0 }}>
                          <div style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                              Rincian {k.jumlahBaris} baris dalam kelompok ini ("No" &amp; status pembayaran)
                            </div>
                            <table style={{ margin: 0 }}>
                              <thead><tr><th>No (Sheet)</th><th>Nominal</th><th>Status Bayar</th><th>Detail Pembayaran (kalau ada)</th></tr></thead>
                              <tbody>
                                {k.rows.slice().sort((a, b) => Number(a.no) - Number(b.no)).map(r => {
                                  const bayarUntukIni = k.punyaPembayaranDetail.find(x => x.no === r.no);
                                  return (
                                    <tr key={r.no}>
                                      <td>{r.no}</td>
                                      <td>{formatRupiah(r.nominal)}</td>
                                      <td>{bayarUntukIni ? <span className="badge badge-green">Ada pembayaran</span> : <span style={{ color: 'var(--muted)' }}>-</span>}</td>
                                      <td style={{ fontSize: 12 }}>
                                        {bayarUntukIni && bayarUntukIni.detailBayar.map(d => (
                                          <div key={d.no}>{formatRupiah(d.nominal)} — {d.tanggalBayar} — {d.metode}</div>
                                        ))}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ background: 'var(--gold-soft)', marginTop: 18, marginBottom: 18 }}>
        <div className="card-body" style={{ fontSize: 12.5, color: '#8a5b00' }}>
          ⚠️ Alat di bawah ini beda dari yang di atas -- ini bukan soal tagihan yang dobel, tapi soal <strong>1
          pembayaran yang kecatat berkali-kali</strong> untuk tagihan yang sama persis (nominal, tanggal, metode, dsb
          sama semua) -- biasanya bekas form pembayaran yang ke-submit berulang. Ini bikin "Sudah Dibayar" di Kartu
          SPP/Biaya Lain, Invoice, Rekap Tunggakan, dan Laporan Keuangan semua kelihatan lebih besar dari yang
          sebenarnya diterima. Cicilan/pembayaran bertahap yang nominal atau tanggalnya beda-beda <strong>tidak</strong> akan
          kena (itu sah, bukan duplikat).
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div><h3>Pembayaran Tercatat Berkali-kali (Duplikat)</h3><p>Urut dari yang paling banyak duplikatnya.</p></div>
          <button className="btn btn-primary" onClick={bersihkanPembayaranDuplikat} disabled={memproses || totalBarisPembayaranAkanDihapus === 0 || adaNomorGanda} title={adaNomorGanda ? 'Perbaiki nomor ganda dulu di atas' : undefined}>
            {memproses ? 'Membersihkan...' : `🧹 Hapus ${totalBarisPembayaranAkanDihapus} Baris Pembayaran Duplikat`}
          </button>
        </div>
        <div className="card-body table-scroll">
          {kelompokPembayaranDuplikat.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
              ✅ Tidak ditemukan pembayaran yang tercatat berkali-kali. Data Anda bersih!
            </p>
          )}
          {kelompokPembayaranDuplikat.length > 0 && (
            <>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>
                Total pencatatan berlebih: <strong style={{ color: 'var(--red)' }}>{formatRupiah(totalKelebihanTercatat)}</strong> dari
                {' '}{kelompokPembayaranDuplikat.length} kelompok.
              </p>
              <table>
                <thead>
                  <tr><th>Siswa</th><th>Tagihan Terkait</th><th>Nominal (per baris)</th><th>Tanggal Bayar</th><th>Metode</th><th>Jumlah Baris</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {kelompokPembayaranDuplikat.map(k => (
                    <Fragment key={k.kunci}>
                      <tr>
                        <td>{k.namaSiswa}</td>
                        <td>{k.labelTagihan}</td>
                        <td>{formatRupiah(k.nominal)}</td>
                        <td>{k.tanggalBayar}</td>
                        <td>{k.metode}</td>
                        <td style={{ fontWeight: 700 }}>{k.jumlahBaris} baris</td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="badge badge-green">Simpan 1, hapus {k.hapus.length}</span>
                          <button className="btn btn-sm" onClick={() => setTerbukaDetail(t => ({ ...t, [k.kunci]: !t[k.kunci] }))}>
                            {terbukaDetail[k.kunci] ? 'Tutup Detail' : 'Lihat Detail'}
                          </button>
                        </td>
                      </tr>
                      {terbukaDetail[k.kunci] && (
                        <tr>
                          <td colSpan={7} style={{ background: '#FAFBFA', padding: 0 }}>
                            <div style={{ padding: '12px 16px' }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                                Rincian {k.jumlahBaris} baris pembayaran dalam kelompok ini
                              </div>
                              <table style={{ margin: 0 }}>
                                <thead><tr><th>No (Sheet)</th><th>Nominal</th><th>Status</th></tr></thead>
                                <tbody>
                                  {k.rows.slice().sort((a, b) => Number(a.no) - Number(b.no)).map(r => (
                                    <tr key={r.no}>
                                      <td>{r.no}</td>
                                      <td>{formatRupiah(r.nominal)}</td>
                                      <td>{r.no === k.simpan.no ? <span className="badge badge-green">Disimpan</span> : <span className="badge badge-red">Akan dihapus</span>}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {progress && <ProgressModal title={progress.label} current={progress.current} total={progress.total} />}

      {tagihanSalahKelas.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <div>
              <h3>⚠️ Tagihan Biaya Lain yang Tidak Sesuai Kelas Tarif Saat Ini</h3>
              <p>
                Ini <strong>bukan</strong> duplikat, tapi tagihan yang kelas siswanya sekarang tidak cocok dengan
                Tarif yang berlaku. Biasanya terjadi kalau Tarif tadinya "Semua Kelas" lalu diubah jadi kelas
                spesifik <em>setelah</em> tagihan sudah terlanjur terbit — tagihan yang sudah ada tidak ikut berubah
                otomatis. Periksa satu-satu sebelum menghapus.
              </p>
            </div>
          </div>
          <div className="card-body table-scroll">
            <table>
              <thead>
                <tr><th>NISN</th><th>Nama Siswa</th><th>Jenis Biaya</th><th>Kelas Siswa Sekarang</th><th>Tarif Berlaku Untuk Kelas</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {tagihanSalahKelas.map(t => (
                  <tr key={`${t.refType}-${t.no}`}>
                    <td>{t.nisn}</td>
                    <td>{t.namaSiswa}</td>
                    <td>{t.label}</td>
                    <td>Kelas {t.kelasSiswaSekarang}</td>
                    <td>Kelas {t.kelasSeharusnya}</td>
                    <td>
                      {t.punyaPembayaran ? (
                        <span className="badge badge-green" title="Sudah dibayar, tidak bisa dihapus dari sini">Sudah dibayar</span>
                      ) : (
                        <button className="btn btn-sm" onClick={() => hapusSatuSalahKelas(t)}>🗑️ Hapus</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
