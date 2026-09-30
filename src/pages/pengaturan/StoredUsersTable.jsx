import { useState } from 'react';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import { USER_FIELDS, USER_HEADERS } from '../../db/userFields';
import { fetchUsersFromSheet, updateUserInSheet, deleteUserFromSheet, addLogEntry } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function StoredUsersTable({ refreshKey }) {
  const { toast } = useAppData();
  const { currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [bump, setBump] = useState(0);

  // Status "kosong" (baris lama sblm kolom ini ada) dianggap "Aktif" -- konsisten dgn
  // normalizeSheetUser di AuthContext.jsx yg dipakai saat login.
  function statusEfektif(r) { return (r['Status'] || '').trim() || 'Aktif'; }

  async function toggleStatus(r) {
    const statusBaru = statusEfektif(r) === 'Aktif' ? 'Nonaktif' : 'Aktif';
    if (statusBaru === 'Nonaktif' && String(r['Username'] || '').trim() === currentUser?.username) {
      toast('Tidak bisa menonaktifkan akun yang sedang Anda pakai login sekarang.', 'error');
      return;
    }
    setToggling(r['No']);
    try {
      // Kirim SELURUH baris (...r) supaya kolom lain (Password, dst) tidak ikut tertimpa
      // kosong -- updateRow_ di backend menulis ulang seluruh baris dari objek yg dikirim.
      await updateUserInSheet({ ...r, Status: statusBaru });
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Edit Data',
        modul: 'Manajemen User',
        detail: `Meng-${statusBaru === 'Aktif' ? 'aktifkan' : 'nonaktifkan'} akun "${r['Nama']}" (${r['Username']})`,
      });
      toast(`Akun "${r['Nama']}" berhasil di${statusBaru === 'Aktif' ? 'aktifkan' : 'nonaktifkan'}.`);
      setBump(b => b + 1);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setToggling(null);
    }
  }

  return (
    <GenericStoredTable
      title="Daftar User (Google Sheets)"
      subtitle="Akun ini bisa langsung dipakai login — edit, nonaktifkan, atau hapus lewat kolom Aksi."
      headers={USER_HEADERS}
      fields={USER_FIELDS}
      fetchFn={fetchUsersFromSheet}
      updateFn={updateUserInSheet}
      deleteFn={deleteUserFromSheet}
      moduleLabel="Manajemen User"
      labelKey="Nama"
      searchFn={(r, t) => String(r['Nama'] ?? '').toLowerCase().includes(t) || String(r['Username'] ?? '').toLowerCase().includes(t)}
      onChanged={() => {}}
      refreshSignal={`${refreshKey}-${bump}`}
      columnRenderers={{
        Password: (r) => (showPassword ? r['Password'] : '••••••••'),
        Status: (r) => (
          <span className={`badge ${statusEfektif(r) === 'Aktif' ? 'badge-green' : 'badge-muted'}`}>
            {statusEfektif(r) === 'Aktif' ? '✓ Aktif' : '🚫 Nonaktif'}
          </span>
        ),
      }}
      headExtra={
        <button className="btn btn-sm" onClick={() => setShowPassword(s => !s)}>{showPassword ? '🙈 Sembunyikan' : '👁 Tampilkan'} Password</button>
      }
      extraActions={(r) => (
        <button
          className="btn-icon"
          title={statusEfektif(r) === 'Aktif' ? 'Nonaktifkan akun ini' : 'Aktifkan kembali akun ini'}
          onClick={() => toggleStatus(r)}
          disabled={toggling === r['No']}
        >
          {statusEfektif(r) === 'Aktif' ? '🚫' : '✓'}
        </button>
      )}
    />
  );
}
