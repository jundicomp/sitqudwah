// "Status" ditaruh di AKHIR (kompatibel mundur) -- lihat normalizeSheetUser di
// AuthContext.jsx: baris lama tanpa nilai di kolom ini otomatis dianggap "Aktif".
export const USER_HEADERS = ['No', 'Nama', 'Role', 'Username', 'Password', 'Email', 'Status'];

export const USER_ROLE_OPTIONS = ['Kepala Sekolah', 'Bendahara / TU', 'Staf TU', 'Admin'];

export const STATUS_USER_OPTIONS = ['Aktif', 'Nonaktif'];

export const USER_FIELDS = [
  { key: 'Nama', label: 'Nama Lengkap', type: 'text', required: true },
  { key: 'Role', label: 'Role', type: 'select', options: USER_ROLE_OPTIONS, required: true },
  { key: 'Username', label: 'Username', type: 'text', required: true },
  { key: 'Password', label: 'Password', type: 'text', required: true },
  { key: 'Email', label: 'Email', type: 'email' },
  // User "Nonaktif" tidak bisa login sama sekali (lihat AuthContext.jsx login()) --
  // dipakai kalau akunnya perlu dinonaktifkan sementara tanpa harus dihapus datanya.
  { key: 'Status', label: 'Status Akun', type: 'select', options: STATUS_USER_OPTIONS, required: true },
];

export function emptyUserRow() {
  const row = {};
  USER_FIELDS.forEach(f => { row[f.key] = ''; });
  row['Status'] = 'Aktif';
  return row;
}
