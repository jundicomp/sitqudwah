import { useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import { USER_FIELDS, emptyUserRow, USER_HEADERS } from '../../db/userFields';
import { addUserToSheet, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import StoredUsersTable from './StoredUsersTable';
import SaveProgressModal from '../../components/common/SaveProgressModal';
import Modal from '../../components/common/Modal';
import useTabAccess from '../../hooks/useTabAccess';

function TambahRoleModal({ onClose }) {
  const { addRole, toast } = useAppData();
  const [nama, setNama] = useState('');
  const [saving, setSaving] = useState(false);

  async function simpan(e) {
    e.preventDefault();
    if (!nama.trim()) { toast('Nama role tidak boleh kosong.', 'error'); return; }
    setSaving(true);
    try {
      await addRole(nama);
      toast(`Role "${nama.trim()}" berhasil ditambahkan.`);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Tambah Role Baru" subtitle="Role baru langsung bisa dipilih di form Tambah User & diatur hak aksesnya di Manajemen Hak Akses." onClose={onClose}>
      <form onSubmit={simpan}>
        <div className="field">
          <label>Nama Role</label>
          <input type="text" value={nama} onChange={e => setNama(e.target.value)} placeholder="mis. Guru, Wali Kelas, Operator Sarpras" autoFocus />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Role'}</button>
        </div>
      </form>
    </Modal>
  );
}

function TambahUserForm({ onSaved }) {
  const { toast, permissionRoles } = useAppData();
  const [form, setForm] = useState(emptyUserRow());
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null);
  const [tambahRoleOpen, setTambahRoleOpen] = useState(false);

  // Opsi Role field dibangun DINAMIS dari permissionRoles (4 bawaan + role tambahan
  // yg dibuat lewat "+ Tambah Role") -- bukan lagi daftar statis dari userFields.js.
  const fieldsDenganRole = useMemo(() => USER_FIELDS.map(f => f.key === 'Role' ? { ...f, options: permissionRoles } : f), [permissionRoles]);

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }

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
                    <button type="button" onClick={() => setTambahRoleOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--green-dark)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>+ Tambah Role</button>
                  )}
                </label>
                {f.type === 'select' ? (
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
      {tambahRoleOpen && <TambahRoleModal onClose={() => setTambahRoleOpen(false)} />}
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
