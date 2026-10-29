import { useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import { USER_FIELDS, emptyUserRow, USER_HEADERS } from '../../db/userFields';
import { addUserToSheet, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import StoredUsersTable from './StoredUsersTable';
import SaveProgressModal from '../../components/common/SaveProgressModal';
import KelolaRoleModal from './KelolaRoleModal';
import useTabAccess from '../../hooks/useTabAccess';

export const OPSI_TAMBAH = '__tambah_kategori__';
export const OPSI_KELOLA = '__kelola_kategori__';

// Dropdown Role + 2 opsi aksi di bawah daftar: "+ Tambah kategori…" & "✎ Edit / hapus kategori…".
export function RoleSelect({ value, options, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— pilih —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      {value && !options.includes(value) && <option value={value}>{value}</option>}
      <option disabled>──────────</option>
      <option value={OPSI_TAMBAH}>+ Tambah kategori…</option>
      <option value={OPSI_KELOLA}>✎ Edit / hapus kategori…</option>
    </select>
  );
}

function TambahUserForm({ onSaved }) {
  const { toast, permissionRoles } = useAppData();
  const [form, setForm] = useState(emptyUserRow());
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null);
  const [kelolaRole, setKelolaRole] = useState(null); // null | { tambahBaru }

  // Opsi Role dibangun DINAMIS dari daftar kategori user (bisa ditambah/diubah/dihapus).
  const fieldsDenganRole = useMemo(() => USER_FIELDS.map(f => f.key === 'Role' ? { ...f, options: permissionRoles } : f), [permissionRoles]);

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }
  function pilihRole(v) {
    if (v === OPSI_TAMBAH) setKelolaRole({ tambahBaru: true });
    else if (v === OPSI_KELOLA) setKelolaRole({ tambahBaru: false });
    else setField('Role', v);
  }

  async function submit(e) {
    e.preventDefault();
    if (!isConfigured()) { toast('Atur koneksi Google Sheets dulu di menu Pengaturan Koneksi (khusus Admin).', 'error'); return; }
    const wajib = fieldsDenganRole.find(f => f.required && !String(form[f.key]).trim());
    if (wajib) { toast(`${wajib.label} wajib diisi.`, 'error'); return; }
    setSaving(true);
    setPhase('saving');
    try {
      await addUserToSheet(form);
      setPhase('done');
      await new Promise(r => setTimeout(r, 1100));
      setForm(emptyUserRow());
      onSaved && onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
      setPhase(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Tambah User</h3><p>Akun baru bisa langsung dipakai login begitu tersimpan.</p></div></div>
      <form onSubmit={submit}>
        <div className="card-body">
          <div className="form-grid">
            {fieldsDenganRole.map(f => (
              <div key={f.key} className="field">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{f.label}{f.required && <span style={{ color: 'var(--red)' }}> *</span>}</span>
                  {f.key === 'Role' && (
                    <button type="button" onClick={() => setKelolaRole({ tambahBaru: false })} style={{ background: 'none', border: 'none', color: 'var(--green-dark)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>✎ Kelola kategori</button>
                  )}
                </label>
                {f.key === 'Role' ? (
                  <RoleSelect value={form[f.key]} options={f.options} onChange={pilihRole} />
                ) : f.type === 'select' ? (
                  <select value={form[f.key]} onChange={e => setField(f.key, e.target.value)}>
                    <option value="">— pilih —</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn" onClick={() => setForm(emptyUserRow())}>Bersihkan</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan User'}</button>
        </div>
      </form>
      {phase && <SaveProgressModal phase={phase} />}
      {kelolaRole && (
        <KelolaRoleModal tambahBaru={kelolaRole.tambahBaru} onClose={() => setKelolaRole(null)}
          onSelesai={(baru, ganti) => setForm(fm => ({ ...fm, Role: baru || ganti[fm.Role] || fm.Role }))} />
      )}
    </div>
  );
}

export default function ManajemenUser() {
  const { tab, setTab, bolehTab } = useTabAccess('manajemen-user', ['tambah', 'daftar']);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey(k => k + 1);

  return (
    <Page pageId="manajemen-user" title="Manajemen User" path="Pengaturan / User / Manajemen User">
      {!isConfigured() && (
        <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>
          ℹ️ Belum tersambung ke Google Sheets. Minta Admin mengatur koneksi lewat menu <strong>Pengaturan Koneksi</strong> dulu.
        </div></div>
      )}
      <div className="card">
        <div className="seg-tabs">
          {bolehTab('tambah') && <button className={`seg-tab ${tab === 'tambah' ? 'active' : ''}`} onClick={() => setTab('tambah')}>➕ TAMBAH USER</button>}
          {bolehTab('daftar') && <button className={`seg-tab ${tab === 'daftar' ? 'active' : ''}`} onClick={() => setTab('daftar')}>📋 DAFTAR USER</button>}
        </div>
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'tambah' && bolehTab('tambah') && <TambahUserForm onSaved={bump} />}
          {tab === 'daftar' && bolehTab('daftar') && <StoredUsersTable refreshKey={refreshKey} />}
        </div>
      </div>
    </Page>
  );
}
