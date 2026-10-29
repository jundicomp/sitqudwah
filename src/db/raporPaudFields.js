// =====================================================================
// RAPOR & PENILAIAN PAUD (v1.44.0)
// Format mengikuti "Laporan Perkembangan Anak Didik" KB Islam Terpadu Qudwah:
// keterangan diri, petunjuk, 1 halaman per elemen (deskripsi + foto), muatan lokal,
// karakter, kesehatan, presensi, tanda tangan.
// =====================================================================

const s = (v) => String(v ?? '').trim();

export const TEKNIK_PAUD = ['Ceklis', 'Catatan Anekdot', 'Hasil Karya', 'Foto Berseri'];
export const STATUS_RAPOR_PAUD = ['Belum Diisi', 'Draft', 'Diajukan', 'Terbit'];
export const BADGE_STATUS_PAUD = { 'Belum Diisi': 'badge-muted', Draft: 'badge-gold', Diajukan: 'badge-blue', Terbit: 'badge-green' };

export const PENGATURAN_PAUD_BAWAAN = {
  namaSatuan: 'KB Islam Terpadu Qudwah',
  jabatanKepala: 'Kepala Satuan PAUD KB Islam Terpadu Qudwah',
  tempat: 'Banyuasin',
  butuhPersetujuan: true,
  elemen: [
    { id: 'nab', nama: 'Nilai Agama dan Budi Pekerti', kalimat: 'nilai agama dan budi pekerti', foto: true },
    { id: 'jd', nama: 'Jati Diri', kalimat: 'jati diri', foto: true },
    { id: 'steam', nama: 'Literasi dan STEAM', sub: 'Science, Technology, Engineering, Art, Mathematic', kalimat: 'literasi dan STEAM', foto: true },
    { id: 'projek', nama: 'Projek Penguatan Profil Pelajar Pancasila', kalimat: 'Projek Penguatan Profil Pelajar Pancasila', foto: true },
  ],
  skala: [
    { kode: 'BB', nama: 'Belum Berkembang', kalimat: 'belum berkembang' },
    { kode: 'MB', nama: 'Mulai Berkembang', kalimat: 'mulai berkembang' },
    { kode: 'BSH', nama: 'Berkembang Sesuai Harapan', kalimat: 'berkembang sesuai harapan' },
    { kode: 'BSB', nama: 'Berkembang Sangat Baik', kalimat: 'berkembang sangat baik' },
  ],
  template: 'Dalam aspek perkembangan {elemen}, Ananda {panggilan} {capaian}. Karena Ananda {panggilan}',
  semangat: ['Pertahankan semangatmu!!!', 'Tingkatkan semangatmu!!!', 'Tetap semangat!!!', 'Pertahankan prestasimu!!!'],
  mulok: [
    { program: 'Kunjungan Edukatif', kegiatan: ['Kegiatan outbond', 'Kunjungan masjid', 'Cooking class'] },
  ],
  karakter: [
    'Mandiri, disiplin dan tanggung jawab',
    'Dermawan, suka menolong dan kerjasama',
    'Percaya diri, kreatif, dan pantang menyerah',
    'Pemimpin yang baik dan adil',
    'Kebersihan, kerapian, kesehatan dan keamanan',
  ],
  kesehatan: [
    { nama: 'Penglihatan ( Mata )', jenis: 'pilihan' },
    { nama: 'Pendengaran ( Telinga )', jenis: 'pilihan' },
    { nama: 'Kesehatan Mulut dan Gigi', jenis: 'pilihan' },
    { nama: 'Kerapian dalam Berpakaian', jenis: 'pilihan' },
    { nama: 'Berat Badan', jenis: 'angka', satuan: 'Kg' },
    { nama: 'Tinggi Badan', jenis: 'angka', satuan: 'Cm' },
  ],
  pilihanKesehatan: ['Baik', 'Cukup', 'Perlu Perhatian'],
  petunjuk: [
    'Buku Laporan Perkembangan ini digunakan selama anak didik mengikuti program pendidikan di KB Islam Terpadu Qudwah Banyuasin.',
    'Untuk melaporkan Capaian Pendidikan anak digunakan sistem penilaian kualitatif untuk setiap kemampuan dengan menggunakan empat kategori, yaitu Belum Berkembang (BB), Mulai Berkembang (MB), Berkembang Sesuai Harapan (BSH), Berkembang Sangat Baik (BSB).',
    'Untuk melaporkan perkembangan dalam bidang Muatan Kearifan Lokal digunakan sistem penilaian kualitatif untuk setiap kemampuan dengan menggunakan empat kategori, yaitu Belum Berkembang (BB), Mulai Berkembang (MB), Berkembang Sesuai Harapan (BSH), Berkembang Sangat Baik (BSB).',
    'Buku Laporan Perkembangan ini disesuaikan dengan Kurikulum Merdeka yang dilengkapi dengan catatan guru yang secara deskriptif menjelaskan perkembangan siswa dalam aspek Nilai Agama dan Budi Pekerti, Jati Diri, Literasi dan STEAM, serta Projek Penguatan Profil Pelajar Pancasila.',
    'Sumber penilaian terhadap anak didik adalah pengamatan sehari-hari dalam kelas yang direkam dalam catatan hasil belajar harian siswa (Ceklis, Foto Berseri, Hasil Karya, Portofolio, dan Anecdotal Record).',
  ].join('\n'),
};

// Gabung pengaturan tersimpan dgn bawaan (key yg belum ada diisi bawaan).
export function lengkapiPengaturanPaud(p) {
  const b = PENGATURAN_PAUD_BAWAAN;
  const x = p && typeof p === 'object' ? p : {};
  const arr = (v, d) => (Array.isArray(v) && v.length ? v : d);
  return {
    ...b, ...x,
    elemen: arr(x.elemen, b.elemen).map((e, i) => ({ id: e.id || `el${i}`, nama: s(e.nama), sub: s(e.sub), kalimat: s(e.kalimat) || s(e.nama).toLowerCase(), foto: e.foto !== false })),
    skala: arr(x.skala, b.skala),
    semangat: arr(x.semangat, b.semangat),
    mulok: Array.isArray(x.mulok) ? x.mulok : b.mulok,
    karakter: Array.isArray(x.karakter) ? x.karakter : b.karakter,
    kesehatan: arr(x.kesehatan, b.kesehatan),
    pilihanKesehatan: arr(x.pilihanKesehatan, b.pilihanKesehatan),
    butuhPersetujuan: x.butuhPersetujuan !== undefined ? !!x.butuhPersetujuan : b.butuhPersetujuan,
  };
}
export function pengaturanPaudDariRows(rows) {
  const r = (rows || []).find(x => s(x['Kunci']) === 'pengaturan');
  if (!r) return null;
  try { return JSON.parse(r['Nilai'] || '{}'); } catch { return null; }
}

export const kunciMulok = (program, kegiatan) => `${program}|${kegiatan}`;
export const bidangMulok = (kegiatan) => `Muatan Lokal: ${kegiatan}`;
export const bidangKarakter = (nama) => `Karakter: ${nama}`;
export function daftarBidangPaud(p) {
  return [
    ...p.elemen.map(e => ({ value: e.nama, label: e.nama, grup: 'Elemen' })),
    ...p.mulok.flatMap(m => m.kegiatan.map(k => ({ value: bidangMulok(k), label: `${m.program} — ${k}`, grup: 'Muatan lokal' }))),
    ...p.karakter.map(k => ({ value: bidangKarakter(k), label: k, grup: 'Karakter' })),
  ];
}

export const semesterRomawi = (sem) => (sem === 'Genap' ? 'II' : 'I');

export function kalimatPembuka(p, elemen, panggilan, kode) {
  const sk = p.skala.find(x => x.kode === kode);
  if (!sk) return '';
  return p.template
    .replaceAll('{elemen}', elemen.kalimat || elemen.nama.toLowerCase())
    .replaceAll('{panggilan}', panggilan || '…')
    .replaceAll('{capaian}', sk.kalimat || sk.nama.toLowerCase());
}

// Saran capaian dari catatan penilaian: modus dari maks. 5 catatan terakhir;
// kalau seri, pakai yg paling baru. Hasil null kalau belum ada catatan bercapaian.
export function saranCapaian(entri) {
  const ada = entri.filter(e => e.capaian).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  if (!ada.length) return null;
  const hitungSemua = ada.reduce((m, e) => { m[e.capaian] = (m[e.capaian] || 0) + 1; return m; }, {});
  const akhir = ada.slice(-5);
  const hitung = akhir.reduce((m, e) => { m[e.capaian] = (m[e.capaian] || 0) + 1; return m; }, {});
  const maks = Math.max(...Object.values(hitung));
  const kandidat = Object.keys(hitung).filter(k => hitung[k] === maks);
  const kode = kandidat.length === 1 ? kandidat[0] : [...akhir].reverse().find(e => kandidat.includes(e.capaian)).capaian;
  return { kode, hitung: hitungSemua, total: ada.length };
}

export function normalizeSheetAsesmenPaud(r, i) {
  return {
    id: 'ASP-' + (r['No'] ?? i), no: r['No'],
    tanggal: s(r['Tanggal']).slice(0, 10), idSiswa: s(r['ID Siswa']), nisn: s(r['NISN']), nama: s(r['Nama Siswa']),
    tingkat: s(r['Tingkat']), rombel: s(r['Rombel']), tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']),
    bidang: s(r['Bidang']), kegiatan: s(r['Kegiatan']), teknik: s(r['Teknik']), capaian: s(r['Capaian']),
    catatan: s(r['Catatan']), foto: s(r['Foto']).split(/\n+/).map(x => x.trim()).filter(Boolean), oleh: s(r['Dicatat Oleh']),
  };
}
export const ASESMEN_PAUD_HEADERS = ['No', 'Tanggal', 'Nama Siswa', 'Tingkat', 'Rombel', 'Bidang', 'Kegiatan', 'Teknik', 'Capaian', 'Catatan', 'Dicatat Oleh'];

const parseJson = (v) => { try { const x = JSON.parse(v || 'null'); return x && typeof x === 'object' ? x : null; } catch { return null; } };
export function normalizeSheetRaporPaud(r, i) {
  return {
    id: 'RPD-' + (r['No'] ?? i), no: r['No'],
    tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']), idSiswa: s(r['ID Siswa']), nisn: s(r['NISN']),
    nama: s(r['Nama Siswa']), tingkat: s(r['Tingkat']), rombel: s(r['Rombel']),
    isian: parseJson(r['Isian']) || {}, status: s(r['Status']) || 'Draft', tanggalTerbit: s(r['Tanggal Terbit']).slice(0, 10),
    arsip: parseJson(r['Arsip']), diubahOleh: s(r['Diubah Oleh']), diubahPada: s(r['Diubah Pada']),
  };
}

// Isian kosong + bawaan otomatis (capaian = saran dari penilaian, kesehatan "Baik").
export function isianAwal(p, { saranElemen = {}, saranMulok = {}, saranKarakter = {} } = {}) {
  const elemen = {};
  p.elemen.forEach(e => { elemen[e.id] = { capaian: saranElemen[e.id] || '', lanjutan: '', semangat: p.semangat[0] || '', foto: [] }; });
  const mulok = {};
  p.mulok.forEach(m => m.kegiatan.forEach(k => { mulok[kunciMulok(m.program, k)] = saranMulok[k] || ''; }));
  const karakter = {};
  p.karakter.forEach(k => { karakter[k] = saranKarakter[k] || ''; });
  const kesehatan = {};
  p.kesehatan.forEach(k => { kesehatan[k.nama] = k.jenis === 'pilihan' ? (p.pilihanKesehatan[0] || 'Baik') : ''; });
  return { elemen, mulok, karakter, deskripsiKarakter: '', semangatKarakter: 'Pertahankan prestasi dan semangatmu nak!!!', kesehatan, presensi: null, tanggal: '' };
}

// Rakit dokumen rapor lengkap (dipakai utk pratinjau/cetak, dan disimpan sbg ARSIP saat terbit).
export function susunDokumenPaud({ p, siswa, isian, rombel, ta, semester, profil, presensiOtomatis, tanggal }) {
  const tgl = isian.tanggal || tanggal;
  const panggilan = siswa.panggilan || siswa.nama.split(' ')[0];
  const ttl = [siswa.tempatLahir, siswa.tanggalLahir].filter(Boolean);
  return {
    versi: 1,
    satuan: p.namaSatuan, jabatanKepala: p.jabatanKepala, tempat: p.tempat, tanggal: tgl,
    ta, semester, semesterRomawi: semesterRomawi(semester),
    rombel: rombel?.label || '', wali: rombel?.wali || '', kepala: profil?.kepalaSekolah || '',
    skala: p.skala.map(x => x.kode),
    anak: {
      nama: siswa.nama, panggilan, nisn: siswa.nisn, jk: siswa.jenisKelamin,
      tempatLahir: siswa.tempatLahir, tanggalLahir: siswa.tanggalLahir, ttl: ttl.length ? ttl : null,
      anakKe: siswa.anakKe, jumlahSaudara: siswa.jumlahSaudara, foto: siswa.foto, idSiswa: siswa.idSiswa,
    },
    keluarga: {
      ayah: siswa.namaAyah, pekerjaanAyah: siswa.pekerjaanAyah, hpAyah: siswa.hpAyah,
      ibu: siswa.namaIbu, pekerjaanIbu: siswa.pekerjaanIbu, hpIbu: siswa.hpIbu, alamat: siswa.alamat,
    },
    petunjuk: String(p.petunjuk || '').split(/\n+/).map(x => x.trim()).filter(Boolean),
    elemen: p.elemen.map((e, i) => {
      const x = isian.elemen?.[e.id] || {};
      const pembuka = kalimatPembuka(p, e, panggilan, x.capaian);
      return {
        huruf: String.fromCharCode(65 + i), nama: e.nama, sub: e.sub || '', capaian: x.capaian || '',
        teks: [pembuka, s(x.lanjutan)].filter(Boolean).join(' ').replace(/\s+([.,])/g, '$1'),
        semangat: x.semangat || '', foto: e.foto ? (x.foto || []).slice(0, 2) : [],
      };
    }),
    mulok: p.mulok.map(m => ({ program: m.program, rows: m.kegiatan.map(k => ({ nama: k, capaian: isian.mulok?.[kunciMulok(m.program, k)] || '' })) })),
    karakter: p.karakter.map(k => ({ nama: k, capaian: isian.karakter?.[k] || '' })),
    deskripsiKarakter: s(isian.deskripsiKarakter), semangatKarakter: s(isian.semangatKarakter),
    kesehatan: p.kesehatan.map(k => {
      const v = s(isian.kesehatan?.[k.nama]);
      return { nama: k.nama, nilai: v && k.jenis === 'angka' && k.satuan ? `${v} ${k.satuan}` : v };
    }),
    presensi: isian.presensi || presensiOtomatis || { sakit: 0, izin: 0, alpha: 0 },
  };
}

// Kelengkapan isian (utk progres & validasi sebelum diajukan).
export function cekKelengkapan(p, isian) {
  const kurang = [];
  p.elemen.forEach(e => {
    const x = isian.elemen?.[e.id] || {};
    if (!x.capaian) kurang.push(`Capaian ${e.nama}`);
    if (!s(x.lanjutan)) kurang.push(`Deskripsi ${e.nama}`);
  });
  if (p.karakter.some(k => !isian.karakter?.[k])) kurang.push('Tabel karakter');
  if (p.mulok.some(m => m.kegiatan.some(k => !isian.mulok?.[kunciMulok(m.program, k)]))) kurang.push('Tabel muatan lokal');
  if (!s(isian.deskripsiKarakter)) kurang.push('Deskripsi karakter');
  return kurang;
}
