import { pad } from './helpers';

// ---- Tahun Ajaran ----
export const tahunAjaranList = [];
for (let y = 2021; y <= 2026; y++) {
  tahunAjaranList.push({
    id: 'TA' + y,
    label: `${y}/${y + 1}`,
    mulai: new Date(y, 6, 1),
    selesai: new Date(y + 1, 5, 30),
    aktif: y === 2026,
  });
}
export const tahunAjaranAktif = () => tahunAjaranList.find(t => t.aktif);

// ---- Kelas ----
export const kelasList = [
  { id: 'K1', nama: 'Kelas 1', waliKelas: 'Siti Nur Hasanah', kapasitas: 28, tingkat: 1 },
  { id: 'K2', nama: 'Kelas 2', waliKelas: 'Ahmad Zainuddin', kapasitas: 28, tingkat: 2 },
  { id: 'K3', nama: 'Kelas 3', waliKelas: 'Dewi Kurniawati', kapasitas: 30, tingkat: 3 },
  { id: 'K4', nama: 'Kelas 4', waliKelas: 'Muhammad Ridwan', kapasitas: 30, tingkat: 4 },
  { id: 'K5', nama: 'Kelas 5', waliKelas: 'Nurul Fadhilah', kapasitas: 30, tingkat: 5 },
  { id: 'K6', nama: 'Kelas 6', waliKelas: 'Bambang Setiawan', kapasitas: 28, tingkat: 6 },
];

// ---- Guru & Staff ----
export const guruList = [
  { id: 'G01', nama: 'Siti Nur Hasanah', jabatan: 'Wali Kelas 1' },
  { id: 'G02', nama: 'Ahmad Zainuddin', jabatan: 'Wali Kelas 2' },
  { id: 'G03', nama: 'Dewi Kurniawati', jabatan: 'Wali Kelas 3' },
  { id: 'G04', nama: 'Muhammad Ridwan', jabatan: 'Wali Kelas 4' },
  { id: 'G05', nama: 'Nurul Fadhilah', jabatan: 'Wali Kelas 5' },
  { id: 'G06', nama: 'Bambang Setiawan', jabatan: 'Wali Kelas 6' },
  { id: 'G07', nama: 'Yusuf Hidayat', jabatan: 'Bendahara' },
  { id: 'G08', nama: 'Rina Marlina', jabatan: 'Staf Tata Usaha' },
];

// ---- Siswa (digenerate) ----
const NAMA_DEPAN = ['Ahmad', 'Muhammad', 'Umar', 'Khadijah', 'Fatimah', 'Aisyah', 'Bagus', 'Salsabila', 'Rizky', 'Nadia', 'Fauzan', 'Zahra', 'Hasan', 'Husein', 'Maryam'];
const NAMA_BELAKANG = ['Ramadhan', 'Setiawan', 'Amelia', 'Lestari', 'Nur Aini', 'Firmansyah', 'Az-Zahra', 'Prasetyo', 'Hidayat', 'Kurniawan'];
export const siswaList = [];
let siswaCounter = 0;
kelasList.forEach((kls, kIdx) => {
  const jumlah = 6; // demo: 6 siswa per kelas
  for (let i = 0; i < jumlah; i++) {
    siswaCounter++;
    const tahunMasuk = 2026 - kls.tingkat + 1 <= 2021 ? 2021 : 2026 - kls.tingkat + 1;
    siswaList.push({
      id: 'S' + pad(siswaCounter, 3),
      nis: '1200' + pad(siswaCounter, 2),
      nama: `${NAMA_DEPAN[siswaCounter % NAMA_DEPAN.length]} ${NAMA_BELAKANG[(siswaCounter + kIdx) % NAMA_BELAKANG.length]}`,
      kelasId: kls.id,
      kelasNama: kls.nama,
      tahunMasuk,
      status: 'Aktif',
    });
  }
});

// ---- Users (akun login) ----
export const usersSeed = [
  { id: 'U01', nama: 'Ahmad Fauzi Rahman', role: 'Kepala Sekolah', username: 'kepsek', password: 'kepsek123', email: 'kepsek@miikhlasiyah.sch.id' },
  { id: 'U02', nama: 'Yusuf Hidayat', role: 'Bendahara / TU', username: 'bendahara', password: 'bendahara123', email: 'bendahara@miikhlasiyah.sch.id' },
  { id: 'U03', nama: 'Rina Marlina', role: 'Staf TU', username: 'staftu', password: 'staftu123', email: 'staftu@miikhlasiyah.sch.id' },
  { id: 'U04', nama: 'Admin Sistem', role: 'Admin', username: 'admin', password: 'admin123', email: 'admin@miikhlasiyah.sch.id' },
];

// ---- Profil Sekolah ----
export const profilSekolahSeed = {
  nama: 'MI Ikhlasiyah',
  npsn: '60123456',
  alamat: 'Jl. Pendidikan No. 45, Palembang, Sumatera Selatan',
  kepalaSekolah: 'Ahmad Fauzi Rahman',
  telepon: '0711-123456',
  email: 'info@miikhlasiyah.sch.id',
  logo: null,
};

// ---- Tarif (per tahun ajaran) ----
export const tarifList = [];
tahunAjaranList.forEach((ta, idx) => {
  const base = 150000 + idx * 10000; // SPP naik bertahap tiap tahun
  tarifList.push(
    { id: 'TRF' + ta.id + '-1', tahunAjaran: ta.label, jenis: 'SPP Bulanan', tipe: 'bulanan', nominal: base, wajib: 'Ya' },
    { id: 'TRF' + ta.id + '-2', tahunAjaran: ta.label, jenis: 'Uang Pangkal', tipe: 'sekali-masuk', nominal: 1500000, wajib: 'Ya' },
    { id: 'TRF' + ta.id + '-3', tahunAjaran: ta.label, jenis: 'Seragam', tipe: 'sekali-masuk', nominal: 750000, wajib: 'Ya' },
    { id: 'TRF' + ta.id + '-4', tahunAjaran: ta.label, jenis: 'Kegiatan Tahunan', tipe: 'per-tahun', nominal: 250000, wajib: 'Ya' },
    { id: 'TRF' + ta.id + '-5', tahunAjaran: ta.label, jenis: 'Study Tour', tipe: 'opsional', nominal: 500000, wajib: 'Tidak' },
  );
});

// ---- Tagihan SPP (digenerate untuk semua tahun ajaran KECUALI tahun aktif —
//      tahun aktif sengaja hanya sebagian bulan yg "diterbitkan", mencerminkan alur penerbitan bertahap) ----
export const tagihanSppList = [];
let tagihanCounter = 0;
tahunAjaranList.forEach(ta => {
  const startYear = parseInt(ta.label.split('/')[0]);
  const tarifSpp = tarifList.find(t => t.tahunAjaran === ta.label && t.jenis === 'SPP Bulanan').nominal;
  const bulanTerbit = ta.aktif ? 1 : 12; // tahun aktif: baru bulan Juli yg terbit (demo)
  siswaList.forEach(s => {
    if (s.tahunMasuk > startYear) return; // siswa belum masuk tahun itu
    for (let m = 0; m < bulanTerbit; m++) {
      const monthIdx = (6 + m) % 12;
      const calYear = monthIdx >= 6 ? startYear : startYear + 1;
      tagihanCounter++;
      tagihanSppList.push({
        id: 'SPP' + pad(tagihanCounter, 4),
        siswaId: s.id,
        tahunAjaran: ta.label,
        bulan: monthIdx,
        tahunKalender: calYear,
        nominal: tarifSpp,
        jatuhTempo: new Date(calYear, monthIdx, 10),
      });
    }
  });
});

// ---- Tagihan Lain (Uang Pangkal dibuat sekali di tahun masuk, sisanya per tahun) ----
export const tagihanLainList = [];
let tagihanLainCounter = 0;
siswaList.forEach(s => {
  tahunAjaranList.forEach(ta => {
    const startYear = parseInt(ta.label.split('/')[0]);
    if (s.tahunMasuk > startYear) return;
    tarifList.filter(t => t.tahunAjaran === ta.label && t.jenis !== 'SPP Bulanan').forEach(t => {
      if (t.jenis === 'Uang Pangkal' && s.tahunMasuk !== startYear) return; // hanya sekali saat masuk
      tagihanLainCounter++;
      tagihanLainList.push({
        id: 'LAIN' + pad(tagihanLainCounter, 4),
        siswaId: s.id,
        tahunAjaran: ta.label,
        nama: t.jenis,
        wajib: t.wajib,
        nominal: t.nominal,
        jatuhTempo: new Date(startYear, 8, 30),
      });
    });
  });
});

// ---- Pembayaran (sebagian besar lunas, beberapa sengaja disisakan utk demo status) ----
export const pembayaranSeed = [];
let pembayaranCounter = 0;
const METODE_LIST = ['Tunai', 'Transfer Bank', 'QRIS', 'Virtual Account'];
function addPembayaranSeed(refType, refId, siswaId, nominal, tanggal) {
  pembayaranCounter++;
  pembayaranSeed.push({
    id: 'PMB' + pad(pembayaranCounter, 4),
    refType, refId, siswaId, nominal,
    tanggalBayar: tanggal,
    metode: METODE_LIST[pembayaranCounter % METODE_LIST.length],
  });
}
tagihanSppList.forEach((t, idx) => {
  // sisakan ~8% belum lunas, ~5% sebagian, sisanya lunas — demo variasi status
  const roll = idx % 20;
  if (roll === 0) return; // belum lunas sama sekali
  if (roll === 1) { addPembayaranSeed('SPP', t.id, t.siswaId, Math.round(t.nominal / 2), t.jatuhTempo); return; } // sebagian
  addPembayaranSeed('SPP', t.id, t.siswaId, t.nominal, t.jatuhTempo);
});
tagihanLainList.forEach((t, idx) => {
  if (idx % 15 === 0) return; // sebagian sisakan belum lunas
  addPembayaranSeed('LAIN', t.id, t.siswaId, t.nominal, t.jatuhTempo);
});

// ---- Aset Sarpras (contoh ringkas) ----
export const asetSeed = [
  { id: 'AST001', kodeAset: 'AST-001', nama: 'Proyektor Epson', kategori: 'Elektronik', lokasi: 'Ruang Kelas 4', kondisi: 'Baik', tanggalPerolehan: new Date(2023, 1, 10), nilai: 4500000 },
  { id: 'AST002', kodeAset: 'AST-002', nama: 'Meja Guru', kategori: 'Furnitur', lokasi: 'Kelas 2', kondisi: 'Baik', tanggalPerolehan: new Date(2021, 5, 3), nilai: 850000 },
  { id: 'AST003', kodeAset: 'AST-003', nama: 'AC Ruang Guru', kategori: 'Elektronik', lokasi: 'Ruang Guru', kondisi: 'Rusak Ringan', tanggalPerolehan: new Date(2020, 3, 20), nilai: 3200000 },
  { id: 'AST004', kodeAset: 'AST-004', nama: 'Lemari Arsip', kategori: 'Furnitur', lokasi: 'Ruang TU', kondisi: 'Baik', tanggalPerolehan: new Date(2022, 8, 15), nilai: 1200000 },
];

export const permissionRoles = ['Kepala Sekolah', 'Bendahara / TU', 'Staf TU', 'Admin'];
export const halamanSensitif = ['manajemen-user', 'hakakses', 'sistem', 'loghapus', 'log-histori', 'bersihkan-duplikat'];
