// =====================================================================
// MODUL AJAR (v1.53.0, format sekolah v1.54.0)
// Mengikuti contoh modul ajar SD IT Qudwah (Matematika Kelas 4 — Membandingkan Pecahan):
// Identitas · Capaian Pembelajaran · Lintas Disiplin Ilmu · IKTP · Topik Kontekstual —
// Pertanyaan Pemicu · Identifikasi · Desain Pembelajaran · Strategi Berdiferensiasi ·
// Dimensi Profil · Kegiatan Pembelajaran (per pertemuan, tabel tahapan) · Asesmen ·
// Remedial & Pengayaan · Penutup · tanda tangan.
// 1 modul = 1 mapel, 1 tingkat, 1 semester, mencakup 1+ TP (ID TP dari Kurikulum & KKM).
// =====================================================================

const s = (v) => String(v ?? '').trim();

export const DIMENSI_SET = {
  p3: { judul: 'Dimensi Profil Pelajar Pancasila', label: 'Profil Pelajar Pancasila (6 dimensi)', daftar: ['Beriman, Bertakwa, Berakhlak Mulia', 'Berkebinekaan Global', 'Bergotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'] },
  lulusan: { judul: 'Dimensi Profil Lulusan', label: 'Profil Lulusan (8 dimensi)', daftar: ['Keimanan dan Ketakwaan terhadap Tuhan YME', 'Kewargaan', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Kemandirian', 'Kesehatan', 'Komunikasi'] },
};
export const LEVEL_KOGNITIF = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
export const MODA = ['Tatap Muka', 'Daring', 'Campuran (Tatap Muka & Daring)'];

// Sintaks tahapan INTI per model pembelajaran (dipakai tombol "Isi tahapan sesuai model").
export const MODEL_PEMBELAJARAN = {
  'Blended Learning': ['Orientasi dan penjelasan tujuan secara tatap muka', 'Belajar mandiri daring atau luring', 'Aktivitas kolaboratif atau tugas terstruktur', 'Diskusi dan klarifikasi secara tatap muka', 'Penerapan dan pembuatan produk', 'Evaluasi dan refleksi'],
  'Problem Based Learning (PBL)': ['Orientasi peserta didik pada masalah', 'Mengorganisasi peserta didik untuk belajar', 'Membimbing penyelidikan individu dan kelompok', 'Mengembangkan dan menyajikan hasil karya', 'Menganalisis dan mengevaluasi proses pemecahan masalah'],
  'Project Based Learning (PjBL)': ['Penentuan pertanyaan mendasar', 'Mendesain perencanaan proyek', 'Menyusun jadwal', 'Memonitor kemajuan proyek', 'Menguji hasil', 'Mengevaluasi pengalaman'],
  'Discovery Learning': ['Stimulasi', 'Identifikasi masalah', 'Pengumpulan data', 'Pengolahan data', 'Pembuktian', 'Menarik kesimpulan'],
  'Inquiry Learning': ['Orientasi', 'Merumuskan masalah', 'Merumuskan hipotesis', 'Mengumpulkan data', 'Menguji hipotesis', 'Merumuskan kesimpulan'],
  'Pembelajaran Mendalam': ['Memahami', 'Mengaplikasi', 'Merefleksi'],
  'Pembelajaran Kooperatif': ['Menyampaikan tujuan dan memotivasi', 'Menyajikan informasi', 'Mengorganisasi peserta didik dalam kelompok', 'Membimbing kelompok bekerja dan belajar', 'Evaluasi', 'Memberikan penghargaan'],
};
export const DAFTAR_MODEL = [...Object.keys(MODEL_PEMBELAJARAN), 'Lainnya'];

// ---- Format (susunan bagian) modul -- dinamis, diatur di Modul Ajar › Format Modul (v1.55.0) ----
// tipe: 'bawaan' (isi & tampilan khusus), 'paragraf', 'tabel' (komponen | deskripsi).
export const BAGIAN_BAWAAN = [
  { id: 'identitas', judul: 'Identitas', wajib: true, ket: 'Penyusun, satuan pendidikan, bab, materi pokok, alokasi waktu, model, moda, sarana + TP yang dicakup' },
  { id: 'cp', judul: 'Capaian Pembelajaran', ket: 'Otomatis dari Kurikulum & KKM' },
  { id: 'lintas', judul: 'Lintas Disiplin Ilmu', ket: 'Paragraf' },
  { id: 'iktp', judul: 'Indikator Ketercapaian Tujuan Pembelajaran (IKTP)', ket: 'Daftar bernomor + level kognitif' },
  { id: 'pemicu', judul: 'Topik Pembelajaran Kontekstual — Pertanyaan Pemicu', ket: 'Paragraf' },
  { id: 'identifikasi', judul: 'Identifikasi', ket: 'Kesiapan murid, karakteristik materi' },
  { id: 'desain', judul: 'Desain Pembelajaran', ket: 'Tujuan, topik, praktik pedagogis, lingkungan, digital' },
  { id: 'diferensiasi', judul: 'Strategi Pembelajaran Berdiferensiasi', ket: 'Konten, proses, produk' },
  { id: 'dimensi', judul: '', ket: 'Judul mengikuti acuan dimensi (Profil Pelajar Pancasila / Profil Lulusan)' },
  { id: 'kegiatan', judul: 'Kegiatan Pembelajaran', wajib: true, ket: 'Per pertemuan, tabel tahapan' },
  { id: 'asesmen', judul: 'Asesmen Pembelajaran', ket: 'Diagnostik, formatif, sumatif' },
  { id: 'remedial', judul: 'Remedial dan Pengayaan', ket: 'Tabel remedial & pengayaan' },
  { id: 'penutup', judul: 'Penutup', ket: 'Paragraf' },
  { id: 'lampiran', judul: 'Lampiran', ket: 'Link LKPD/materi (dicetak bila ada)' },
];
export const INFO_BAWAAN = Object.fromEntries(BAGIAN_BAWAAN.map(b => [b.id, b]));
// Format modul sebelum fitur ini ada -- dipakai modul lama supaya tampilannya tidak berubah.
export const FORMAT_BAWAAN = BAGIAN_BAWAAN.map(b => ({ id: b.id, tipe: 'bawaan', judul: '', tampil: true }));
export const PENGATURAN_MODUL_BAWAAN = { format: FORMAT_BAWAAN, setDimensi: 'p3' };

// Rapikan format: buang duplikat/rusak; utk pengaturan sekolah, bagian bawaan yg hilang ditambahkan lagi.
export function rapikanFormat(fmt, { lengkapiBawaan = false } = {}) {
  const list = (Array.isArray(fmt) ? fmt : []).filter(b => b && b.id && (b.tipe !== 'bawaan' || INFO_BAWAAN[b.id]));
  const unik = []; const ada = new Set();
  list.forEach(b => { if (!ada.has(b.id)) { ada.add(b.id); unik.push({ id: String(b.id), tipe: b.tipe || 'paragraf', judul: String(b.judul || ''), tampil: b.tampil !== false || !!INFO_BAWAAN[b.id]?.wajib, petunjuk: String(b.petunjuk || ''), komponen: Array.isArray(b.komponen) ? b.komponen.map(String) : [], bolehTambah: b.bolehTambah !== false }); } });
  if (lengkapiBawaan) BAGIAN_BAWAAN.forEach(b => { if (!ada.has(b.id)) unik.push({ id: b.id, tipe: 'bawaan', judul: '', tampil: true, petunjuk: '', komponen: [], bolehTambah: true }); });
  return unik.length ? unik : rapikanFormat(FORMAT_BAWAAN);
}
export function lengkapiPengaturanModul(p) {
  const x = p && typeof p === 'object' ? p : {};
  return { format: rapikanFormat(x.format || FORMAT_BAWAAN, { lengkapiBawaan: true }), setDimensi: DIMENSI_SET[x.setDimensi] ? x.setDimensi : 'p3' };
}
export function pengaturanModulDariRows(rows) {
  const r = (rows || []).find(x => s(x['Kunci']) === 'pengaturan');
  if (!r) return null;
  try { return JSON.parse(r['Nilai'] || '{}'); } catch { return null; }
}
// Judul bagian utk ditampilkan: judul custom > judul bawaan (dimensi ikut acuan modul).
export function judulBagian(b, isi) {
  if (s(b.judul)) return s(b.judul);
  if (b.id === 'dimensi') return (DIMENSI_SET[isi?.setDimensi] || DIMENSI_SET.p3).judul;
  return INFO_BAWAAN[b.id]?.judul || 'Bagian';
}
// Format milik modul: salinan yg disimpan di modul; modul lama (sebelum v1.55.0) = format bawaan.
export const formatModul = (isi) => rapikanFormat(isi?.format || FORMAT_BAWAAN);
export const formatSama = (a, b) => JSON.stringify(rapikanFormat(a)) === JSON.stringify(rapikanFormat(b));
export const buatIdBagian = () => 'bg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export const STATUS_MODUL = ['Draft', 'Diajukan', 'Dikembalikan', 'Disetujui'];
export const BADGE_STATUS_MODUL = { Draft: 'badge-muted', Diajukan: 'badge-blue', Dikembalikan: 'badge-gold', Disetujui: 'badge-green' };

export const asesmenAwal = () => [
  { jenis: 'Diagnostik', teknik: '', instrumen: '', waktu: '' },
  { jenis: 'Formatif', teknik: '', instrumen: '', waktu: '' },
  { jenis: 'Sumatif', teknik: '', instrumen: '', waktu: '' },
];
export const pertemuanKosong = (ke) => ({ ke, subMateri: '', model: '', tujuan: '', langkah: [] });

export function isiModulAwal() {
  return {
    bab: '', pertemuan: 1, jpPerPertemuan: 2, menitPerJp: 35, kurikulum: 'Kurikulum Merdeka', model: '', modelLain: '', moda: 'Tatap Muka', sarana: '',
    lintasDisiplin: '', iktp: [], pertanyaanPemicu: '',
    kesiapan: '', karakteristik: '',
    tujuan: '', topik: '', praktik: '', lingkungan: '', digital: '',
    diferensiasi: { konten: '', proses: '', produk: '' },
    setDimensi: 'p3', dimensi: [],
    kegiatan: [pertemuanKosong(1)],
    asesmen: asesmenAwal(),
    remedial: '', pengayaan: '', penutup: '',
    lampiran: [],
    tambahan: {}, // isi bagian buatan sekolah: { [idBagian]: teks | [{komponen, deskripsi}] }
    format: null, // salinan susunan bagian saat modul dibuat / format diperbarui
  };
}

// Isian modul versi v1.53.0 (awal/memahami/…) dipetakan ke format baru.
function migrasiIsi(x) {
  const isi = { ...isiModulAwal(), ...x };
  isi.diferensiasi = { ...isiModulAwal().diferensiasi, ...(x.diferensiasi || {}) };
  isi.tambahan = x.tambahan && typeof x.tambahan === 'object' ? x.tambahan : {};
  isi.format = Array.isArray(x.format) ? rapikanFormat(x.format) : null;
  if (Array.isArray(x.dimensi) && x.dimensi.length && typeof x.dimensi[0] === 'string') {
    isi.dimensi = x.dimensi.map(nama => ({ nama, wujud: '' }));
    isi.setDimensi = x.setDimensi || 'lulusan';
  }
  if (!Array.isArray(x.kegiatan) && (x.awal || x.memahami || x.mengaplikasi || x.merefleksi || x.penutup)) {
    const L = [];
    if (x.awal) L.push({ tahap: 'AWAL', sub: '', menit: '', teks: x.awal });
    if (x.memahami) L.push({ tahap: 'INTI', sub: 'Memahami', menit: '', teks: x.memahami });
    if (x.mengaplikasi) L.push({ tahap: 'INTI', sub: 'Mengaplikasi', menit: '', teks: x.mengaplikasi });
    if (x.merefleksi) L.push({ tahap: 'INTI', sub: 'Merefleksi', menit: '', teks: x.merefleksi });
    if (x.penutup) L.push({ tahap: 'PENUTUP', sub: '', menit: '', teks: x.penutup });
    isi.kegiatan = [{ ...pertemuanKosong(1), langkah: L }];
    isi.penutup = '';
  }
  if (!Array.isArray(x.asesmen)) {
    isi.asesmen = asesmenAwal();
    if (x.asesmenAwal) isi.asesmen[0].instrumen = x.asesmenAwal;
    if (x.asesmenFormatif) isi.asesmen[1].instrumen = x.asesmenFormatif;
    if (x.asesmenSumatif) isi.asesmen[2].instrumen = x.asesmenSumatif;
  }
  if (x.jp && !x.jpPerPertemuan) {
    const n = Number(x.pertemuan) || 1;
    isi.pertemuan = n; isi.jpPerPertemuan = Math.max(1, Math.round(Number(x.jp) / n));
  }
  if (x.praktik && !x.model && DAFTAR_MODEL.some(m => x.praktik.startsWith(m.split(' (')[0]))) { isi.model = x.praktik; isi.praktik = ''; }
  isi.pertemuan = Math.max(1, Number(isi.pertemuan) || 1);
  while (isi.kegiatan.length < isi.pertemuan) isi.kegiatan.push(pertemuanKosong(isi.kegiatan.length + 1));
  delete isi.awal; delete isi.memahami; delete isi.mengaplikasi; delete isi.merefleksi; delete isi.asesmenAwal; delete isi.asesmenFormatif; delete isi.asesmenSumatif; delete isi.jp; delete isi.kemitraan;
  return isi;
}

const parseJson = (v) => { try { const x = JSON.parse(v || 'null'); return x && typeof x === 'object' ? x : null; } catch { return null; } };
export function normalizeSheetModul(r, i) {
  return {
    id: s(r['ID Modul']) || 'MDX-' + (r['No'] ?? i), idModul: s(r['ID Modul']), no: r['No'],
    tahunAjaran: s(r['Tahun Ajaran']), semester: s(r['Semester']) || 'Ganjil', mapel: s(r['Mata Pelajaran']),
    tingkat: s(r['Tingkat']), rombel: s(r['Rombel']), guru: s(r['Guru']), judul: s(r['Judul']),
    tp: s(r['ID TP']).split(',').map(x => x.trim()).filter(Boolean),
    isi: migrasiIsi(parseJson(r['Isi']) || {}),
    status: s(r['Status']) || 'Draft', catatan: s(r['Catatan Kepala Sekolah']),
    diubahOleh: s(r['Diubah Oleh']), diubahPada: s(r['Diubah Pada']),
    disetujuiOleh: s(r['Disetujui Oleh']), tanggalDisetujui: s(r['Tanggal Disetujui']).slice(0, 10), arsip: parseJson(r['Arsip']),
  };
}

const ACAK = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function buatIdModul(ada = new Set()) {
  for (;;) {
    let x = 'MA-';
    for (let i = 0; i < 6; i++) x += ACAK[Math.floor(Math.random() * ACAK.length)];
    if (!ada.has(x)) return x;
  }
}

export const jpTotal = (isi) => (Number(isi.pertemuan) || 0) * (Number(isi.jpPerPertemuan) || 0);
export const menitPertemuan = (isi) => (Number(isi.jpPerPertemuan) || 0) * (Number(isi.menitPerJp) || 0);
export const namaModel = (isi) => (isi.model === 'Lainnya' ? s(isi.modelLain) : s(isi.model));
export function teksAlokasi(isi) {
  const n = Number(isi.pertemuan) || 0; const jp = Number(isi.jpPerPertemuan) || 0; const mnt = Number(isi.menitPerJp) || 0;
  if (!n || !jp) return '';
  return `${n} Pertemuan (${n * jp} JP; 1 pertemuan = ${jp} JP × ${mnt} menit = ${jp * mnt} menit)`;
}

// Langkah kegiatan bawaan sesuai model + pembagian menit (awal ±13%, penutup ±7%, sisanya rata ke INTI).
export function langkahSesuaiModel(model, totalMenit) {
  const inti = MODEL_PEMBELAJARAN[model] || MODEL_PEMBELAJARAN['Pembelajaran Mendalam'];
  const t = Number(totalMenit) || 70;
  const awal = Math.max(5, Math.round(t * 0.13));
  const tutup = Math.max(5, Math.round(t * 0.07));
  const sisa = Math.max(inti.length * 2, t - awal - tutup);
  const per = Math.floor(sisa / inti.length);
  const lebih = sisa - per * inti.length;
  return [
    { tahap: 'AWAL', sub: '', menit: String(awal), teks: '' },
    ...inti.map((sub, i) => ({ tahap: 'INTI', sub, menit: String(per + (i < lebih ? 1 : 0)), teks: '' })),
    { tahap: 'PENUTUP', sub: '', menit: String(tutup), teks: '' },
  ];
}

// Pasangan mapel+tingkat yg diajar (dari Jadwal Pelajaran). guru kosong = semua guru.
export function pasanganMengajar(jadwal, { guru = '', ta, semester }) {
  const map = {};
  jadwal.filter(j => j.mapel && j.tingkat && (!ta || j.tahunAjaran === ta) && (!semester || !j.semester || j.semester === semester) && (!guru || j.guru === guru))
    .forEach(j => {
      const k = `${j.mapel}|${j.tingkat}`;
      const x = (map[k] ||= { kunci: k, mapel: j.mapel, tingkat: j.tingkat, rombel: new Set(), guru: new Set(), jpMinggu: 0 });
      if (j.rombel) x.rombel.add(j.rombel);
      if (j.guru) x.guru.add(j.guru);
      x.jpMinggu++;
    });
  return Object.values(map).map(x => ({ ...x, rombel: [...x.rombel].sort(), guru: [...x.guru].sort() }));
}

export function cekKelengkapanModul(m) {
  const k = [];
  const i = m.isi;
  if (!s(m.judul)) k.push('Materi pokok');
  if (!m.tp.length) k.push('Tujuan pembelajaran');
  if (!i.kegiatan.slice(0, i.pertemuan).some(p => p.langkah.some(l => s(l.teks)))) k.push('Kegiatan pembelajaran');
  if (!i.asesmen.some(a => s(a.teknik) || s(a.instrumen))) k.push('Asesmen');
  return k;
}

const JENJANG_PANJANG = { SD: 'Sekolah Dasar (SD)', MI: 'Madrasah Ibtidaiyah (MI)', SMP: 'Sekolah Menengah Pertama (SMP)', SMA: 'Sekolah Menengah Atas (SMA)', SMK: 'Sekolah Menengah Kejuruan (SMK)' };
export const namaJenjangPanjang = (kode) => JENJANG_PANJANG[kode] || kode || '';

// Dokumen utk pratinjau / cetak.
export function susunDokumenModul({ m, tpList, cpList, sekolah, kepala = '', kepalaNiy = '', tempat = '', jenjang = '', namaTingkat }) {
  const tpTerpilih = m.tp.map(id => tpList.find(t => t.idTp === id)).filter(Boolean);
  const fase = tpTerpilih[0]?.fase || '';
  const isi = m.isi;
  return {
    jenis: 'MODUL', sekolah, kepala, kepalaNiy, tempat, jenjang: namaJenjangPanjang(jenjang),
    judul: m.judul, bab: isi.bab, mapel: m.mapel, kelas: namaTingkat(m.tingkat), tingkat: m.tingkat, rombel: m.rombel,
    fase, semester: m.semester, ta: m.tahunAjaran, guru: m.guru, status: m.status,
    alokasi: teksAlokasi(isi), model: namaModel(isi), menit: menitPertemuan(isi),
    tp: tpTerpilih.map(t => ({ kode: t.kode, tujuan: t.tujuan, elemen: t.elemen })),
    cp: cpList.filter(c => c.mapel === m.mapel && c.fase === fase && c.capaian),
    dimensiJudul: (DIMENSI_SET[isi.setDimensi] || DIMENSI_SET.p3).judul,
    format: formatModul(isi).filter(b => b.tampil).map(b => ({ ...b, judulTampil: judulBagian(b, isi) })),
    isi: { ...isi, kegiatan: isi.kegiatan.slice(0, isi.pertemuan) },
  };
}

// Baris sheet lengkap utk 1 modul (bulkUpsert menimpa SELURUH baris, jadi semua kolom wajib dikirim).
export function barisSheetModul(m, patch = {}) {
  const x = { ...m, ...patch };
  return {
    'ID Modul': x.idModul, 'Tahun Ajaran': x.tahunAjaran, Semester: x.semester, 'Mata Pelajaran': x.mapel, Tingkat: x.tingkat,
    Rombel: x.rombel, Guru: x.guru, Judul: String(x.judul || '').trim(), 'ID TP': (x.tp || []).join(','), Isi: JSON.stringify(x.isi), Status: x.status || 'Draft',
    'Catatan Kepala Sekolah': x.catatan || '', 'Diubah Oleh': x.diubahOleh || '', 'Diubah Pada': x.diubahPada || new Date().toISOString(),
    'Disetujui Oleh': x.disetujuiOleh || '', 'Tanggal Disetujui': x.tanggalDisetujui || '', Arsip: x.arsip ? JSON.stringify(x.arsip) : '',
  };
}
// Salinan modul (Duplikat) -- format & isi ikut tersalin, status kembali Draft.
export function barisDuplikatModul(x, guru, oleh) {
  return barisSheetModul(x, {
    idModul: buatIdModul(), guru, judul: `${x.judul} (salinan)`, status: 'Draft', catatan: '', diubahOleh: oleh, diubahPada: new Date().toISOString(),
    disetujuiOleh: '', tanggalDisetujui: '', arsip: null,
  });
}
