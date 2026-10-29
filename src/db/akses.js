// Akses berbasis wali kelas (v1.44.0).
// Admin & Kepala Sekolah melihat semua kelas. Akun lain hanya melihat rombel yg
// wali kelasnya (Data Kelas › Wali Kelas) = guru yg terhubung ke akunnya
// (Manajemen User › Terhubung ke Guru).
export const ROLE_LIHAT_SEMUA_KELAS = ['Admin', 'Kepala Sekolah'];

export function bolehLihatSemuaKelas(user) {
  return !!user && (user.isMasterAdmin || ROLE_LIHAT_SEMUA_KELAS.includes(user.role));
}

export function rombelUntukUser(rombelList, user) {
  if (bolehLihatSemuaKelas(user)) return rombelList;
  const g = String(user?.guru || '').trim();
  return g ? rombelList.filter(r => String(r.wali || '').trim() === g) : [];
}

// Menerbitkan / mengembalikan rapor = Kepala Sekolah & Admin.
export const bolehMenerbitkan = (user) => bolehLihatSemuaKelas(user);
export const isAdmin = (user) => !!user && (user.isMasterAdmin || user.role === 'Admin');
