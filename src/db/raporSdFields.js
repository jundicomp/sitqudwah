// =====================================================================
// RAPOR SEKOLAH / SD (v1.48.0)
// Mengikuti format rapor SD Islam Terpadu Qudwah: halaman identitas sekolah,
// identitas peserta didik, lalu rapor: A. Sikap (deskripsi), B. Pengetahuan
// (nilai, predikat, deskripsi per muatan pelajaran -- dgn kelompok spt "Keagamaan:
// a. Tahfidz, b. Tahsin"), C. Catatan Wali Kelas, D. Presensi, keputusan kenaikan
// (semester Genap), tanda tangan orang tua, guru kelas & kepala sekolah.
// =====================================================================
import { predikatNilai, PREDIKAT_LABEL, JENIS_NILAI_OPTIONS, SEMUA_MAPEL } from './akademikFields';
import { namaTingkat } from '../config/jenjang';

const s = (v) => String(v ?? '').trim();
export const BADGE_STATUS_SD = { 'Belum Diisi': 'badge-muted', Draft: 'badge-gold', Diajukan: 'badge-blue', Terbit: 'badge-green' };

export const PENGATURAN_SD_BAWAAN = {
  judulJenjang: 'SEKOLAH DASAR (SD)',
  namaSekolah: 'SD Islam Terpadu Qudwah',
  namaSingkat: 'SD IT Qudwah',
  npsn: '70044738',
  alamat: 'Jl. Sungai Rengit',
  kodePos: '30961',
  desa: 'Sungai Rengit',
  kecamatan: 'Talang Kelapa',
  kabupaten: 'Banyuasin',
  provinsi: 'Sumatra Selatan',
  website: '-',
  email: '-',
  tempat: 'Talang Kelapa',
  namaKepala: '',
  niyKepala: '',
  sebutanWali: 'Guru Kelas',
  kkmSatuan: 75,
  bobot: { Harian: 1, Tugas: 1, UTS: 1, UAS: 1 },
  butuhPersetujuan: true,
  // Kalimat pembuka deskripsi otomatis per tingkat predikat (huruf depan predikat).
  frase: { A: 'sudah sangat baik dalam memahami', B: 'sudah baik dalam memahami', C: 'cukup baik dalam memahami', D: 'perlu bimbingan dalam memahami', E: 'perlu bimbingan khusus dalam memahami' },
  template: 'Ananda {panggilan} {frase}',
};

export function lengkapiPengaturanSd(p) {
  const b = PENGATURAN_SD_BAWAAN;
  const x = p && typeof p === 'object' ? p : {};
  return {
    ...b, ...x,
    bobot: { ...b.bobot, ...(x.bobot || {}) },
    frase: { ...b.frase, ...(x.frase || {}) },
    kkmSatuan: x.kkmSatuan === '' || x.kkmSatuan === undefined ? b.kkmSatuan : Number(x.kkmSatuan),
    butuhPersetujuan: x.butuhPersetujuan !== undefined ? !!x.butuhPersetujuan : b.butuhPersetujuan,
  };
}
export function pengaturanSdDariRows(rows) {
  const r = (rows || []).find(x => s(x['Kunci']) === 'pengaturan');
  if (!r) return null;
  try { return JSON.parse(r['Nilai'] || '{}'); } catch { return null; }
}

const parseJson = (v) => { try { const x = JSON.parse(v || 'null'); return x && typeof x === 'object' ? x : null; } catch { return null; } };
export function normalizeSheetRaporSekolah(r, i) {
  return {
    id: 'RPS-' + (r['No'] ?? i), no: r['No'],
    tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), idSiswa: s(r['ID Siswa']), nisn: s(r['NISN']),
    nama: s(r['Nama Siswa']), tingkat: s(r['Tingkat']), rombel: s(r['Rombel']),
    isian: parseJson(r['Isian']) || {}, status: s(r['Status']) || 'Draft', tanggalTerbit: s(r['Tanggal Terbit']).slice(0, 10),
    arsip: parseJson(r['Arsip']), diubahOleh: s(r['Diubah Oleh']),
  };
}

const rata = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const bulat = (v) => (v === null ? null : Math.round(v));

// Nilai rapor per mapel: rata-rata tiap jenis penilaian, lalu digabung memakai bobot
// (Pengaturan Rapor SD). Jenis yg belum ada nilainya tidak ikut dihitung.
export function nilaiMapelSd(nilaiRows, siswa, ta, semester, bobot) {
  const milik = nilaiRows.filter(n => n.nisn && n.nisn === siswa.nisn && n.tahunAjaran === ta && n.semester === semester && n.nilai !== null);
  const per = {};
  milik.forEach(n => { ((per[n.mapel] ||= {})[n.jenis || 'Harian'] ||= []).push(n.nilai); });
  const hasil = {};
  Object.entries(per).forEach(([mapel, perJenis]) => {
    let total = 0, berat = 0, jumlah = 0;
    Object.entries(perJenis).forEach(([jenis, arr]) => {
      const w = Number(bobot?.[jenis] ?? 1) || 0;
      jumlah += arr.length;
      if (w > 0) { total += rata(arr) * w; berat += w; }
    });
    hasil[mapel] = { nilai: berat ? bulat(total / berat) : bulat(rata(Object.values(perJenis).flat())), jumlah, jenis: Object.keys(perJenis) };
  });
  return hasil;
}

// Daftar baris rapor: mapel aktif utk jenjang ini (urut daftar Mata Pelajaran), dikelompokkan
// kalau mapel punya "Kelompok". Mapel di luar daftar yg punya nilai tetap ikut di akhir.
export function susunBarisMapel(daftarMapel, nilaiPerMapel) {
  const info = Object.fromEntries(SEMUA_MAPEL.map(m => [m.nama, m]));
  const nama = [...daftarMapel, ...Object.keys(nilaiPerMapel).filter(m => !daftarMapel.includes(m))];
  const baris = [];
  nama.forEach(m => {
    const kel = info[m]?.kelompok || '';
    if (!kel) { baris.push({ mapel: m }); return; }
    let g = baris.find(b => b.kelompok === kel);
    if (!g) { g = { kelompok: kel, anak: [] }; baris.push(g); }
    g.anak.push({ mapel: m });
  });
  return baris;
}

export const levelPredikat = (p) => { const h = String(p || '')[0]?.toUpperCase(); return ['A', 'B', 'C', 'D', 'E'].includes(h) ? h : 'C'; };
export function kalimatAwalDeskripsi(p, panggilan, nilai) {
  if (nilai === null || nilai === undefined || nilai === '') return '';
  const f = p.frase[levelPredikat(predikatNilai(nilai))] || '';
  return p.template.replaceAll('{panggilan}', panggilan || '').replaceAll('{frase}', f).replace(/\s+/g, ' ').trim() + ' ';
}

export function isianAwalSd() {
  return { sikapSpiritual: '', sikapSosial: '', mapel: {}, catatan: '', presensi: null, keputusan: 'Naik', tanggal: '' };
}

const ANGKA = ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas', 'Dua Belas'];
export const terbilangKelas = (t) => (/^\d+$/.test(String(t)) && ANGKA[Number(t)] ? `${t} ( ${ANGKA[Number(t)]} )` : namaTingkat(t));

// Rakit dokumen lengkap (pratinjau/cetak, dan disimpan sbg ARSIP saat terbit).
export function susunDokumenSd({ p, siswa, isian, rombel, ta, semester, presensiOtomatis, nilaiPerMapel, daftarMapel, kkmOf, waliNiy, tanggal, tingkatBerikut }) {
  const panggilan = siswa.panggilan || siswa.nama.split(' ')[0];
  const nilaiAkhir = (m) => {
    const o = isian.mapel?.[m]?.nilai;
    if (o !== undefined && o !== null && o !== '') return Number(o);
    return nilaiPerMapel[m]?.nilai ?? null;
  };
  const isiBaris = (m) => {
    const v = nilaiAkhir(m);
    const kkm = kkmOf ? kkmOf(m) : null;
    return { mapel: m, nilai: v, predikat: v === null ? '' : predikatNilai(v), deskripsi: s(isian.mapel?.[m]?.deskripsi), kkm, tuntas: v === null || kkm === null ? null : v >= kkm };
  };
  const baris = susunBarisMapel(daftarMapel, nilaiPerMapel).map(b => (b.kelompok ? { kelompok: b.kelompok, anak: b.anak.map(a => isiBaris(a.mapel)) } : isiBaris(b.mapel)));
  return {
    versi: 1, jenis: 'SD',
    sekolah: {
      judulJenjang: p.judulJenjang, nama: p.namaSekolah, singkat: p.namaSingkat, npsn: p.npsn, alamat: p.alamat, kodePos: p.kodePos,
      desa: p.desa, kecamatan: p.kecamatan, kabupaten: p.kabupaten, provinsi: p.provinsi, website: p.website, email: p.email,
    },
    tempat: p.tempat, tanggal: isian.tanggal || tanggal, ta, semester, kkmSatuan: p.kkmSatuan,
    rombel: rombel?.label || '', tingkat: rombel?.tingkat || '', wali: rombel?.wali || '', waliNiy: waliNiy || '', sebutanWali: p.sebutanWali,
    kepala: p.namaKepala, kepalaNiy: p.niyKepala,
    anak: {
      nama: siswa.nama, panggilan, nisn: siswa.nisn, idSiswa: siswa.idSiswa, jk: siswa.jenisKelamin, agama: siswa.agama,
      tempatLahir: siswa.tempatLahir, tanggalLahir: siswa.tanggalLahir, alamat: siswa.alamat, foto: siswa.foto,
      desa: siswa.desa, kecamatan: siswa.kecamatan, kabupaten: siswa.kabupatenKota, provinsi: siswa.provinsi,
    },
    ortu: { ayah: siswa.namaAyah, ibu: siswa.namaIbu, pekerjaanAyah: siswa.pekerjaanAyah, pekerjaanIbu: siswa.pekerjaanIbu },
    walimurid: { nama: siswa.namaWali, pekerjaan: siswa.pekerjaanWali, alamat: siswa.alamatWali },
    sikapSpiritual: s(isian.sikapSpiritual), sikapSosial: s(isian.sikapSosial),
    baris, catatan: s(isian.catatan),
    presensi: isian.presensi || presensiOtomatis || { sakit: 0, izin: 0, alpha: 0 },
    keputusan: semester === 'Genap' ? { status: isian.keputusan || 'Naik', kelas: isian.keputusan === 'Tinggal' ? rombel?.tingkat : (tingkatBerikut || '') } : null,
  };
}

export function semuaMapelBaris(baris) {
  return baris.flatMap(b => (b.kelompok ? b.anak : [b]));
}

export function cekKelengkapanSd(isian, barisMapel, nilaiPerMapel) {
  const kurang = [];
  if (!s(isian.sikapSpiritual)) kurang.push('Sikap spiritual');
  if (!s(isian.sikapSosial)) kurang.push('Sikap sosial');
  barisMapel.forEach(m => {
    const ada = (isian.mapel?.[m]?.nilai ?? '') !== '' || nilaiPerMapel[m];
    if (ada && !s(isian.mapel?.[m]?.deskripsi)) kurang.push(`Deskripsi ${m}`);
  });
  if (!s(isian.catatan)) kurang.push('Catatan wali kelas');
  return kurang;
}

export { PREDIKAT_LABEL, JENIS_NILAI_OPTIONS };
