// Akses berbasis wali kelas (v1.44.0).
// Admin & Kepala Sekolah melihat semua kelas. Akun lain hanya melihat rombel yg
// wali kelasnya (Data Kelas › Wali Kelas) = guru yg terhubung ke akunnya
// (Manajemen User › Terhubung ke Guru).
export const ROLE_LIHAT_SEMUA_KELAS = ['Admin', 'Kepala Sekolah'];

// v1.61.0: 1 akun boleh punya BEBERAPA role (guru rangkap jabatan). Disimpan di kolom
// Role yg sama, dipisah koma: "Guru TK, Bendahara". Akun lama (1 role) tetap jalan.
export function daftarRole(x) {
  const v = typeof x === 'string' ? x : (x?.role ?? '');
  const seen = new Set();
  return String(v).split(',').map(r => r.trim()).filter(r => r && !seen.has(r.toLowerCase()) && seen.add(r.toLowerCase()));
}
export const gabungRole = (list) => daftarRole((list || []).join(',')).join(', ');
export const punyaRole = (user, ...nama) => daftarRole(user).some(r => nama.includes(r));

export function bolehLihatSemuaKelas(user) {
  return !!user && (user.isMasterAdmin || punyaRole(user, ...ROLE_LIHAT_SEMUA_KELAS));
}

export function rombelUntukUser(rombelList, user) {
  if (bolehLihatSemuaKelas(user)) return rombelList;
  const g = String(user?.guru || '').trim();
  return g ? rombelList.filter(r => String(r.wali || '').trim() === g) : [];
}

// Menerbitkan / mengembalikan rapor = Kepala Sekolah & Admin.
export const bolehMenerbitkan = (user) => bolehLihatSemuaKelas(user);
export const isAdmin = (user) => !!user && (user.isMasterAdmin || punyaRole(user, 'Admin'));
