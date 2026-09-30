import { useEffect, useState, useCallback } from 'react';
import Page from '../../components/layout/Page';
import DataTable from '../../components/common/DataTable';
import { fetchLogFromSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { initials, avatarColor } from '../../db/helpers';
import SaveProgressModal from '../../components/common/SaveProgressModal';

function GantiPasswordCard() {
  const { toast } = useAppData();
  const { currentUser, changeOwnPassword } = useAuth();
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [ulangi, setUlangi] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null);

  if (currentUser?.isMasterAdmin) {
    return (
      <div className="card">
        <div className="card-head"><div><h3>Ganti Password</h3></div></div>
        <div className="card-body" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          Akun Admin Induk tersimpan di kode sumber aplikasi (bukan di Google Sheets), jadi tidak bisa diganti dari sini.
          Untuk menggantinya, ubah nilai di file <code>src/config/masterAdmin.js</code> lalu build ulang.
        </div>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (String(lama).trim() !== String(currentUser.password).trim()) { toast('Password lama tidak cocok.', 'error'); return; }
    if (!baru || baru.length < 4) { toast('Password baru minimal 4 karakter.', 'error'); return; }
    if (baru !== ulangi) { toast('Konfirmasi password baru tidak sama.', 'error'); return; }
    setSaving(true);
    setPhase('saving');
    try {
      await changeOwnPassword(baru);
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Ganti Password',
        modul: 'Profil Saya',
        detail: 'Mengganti password akun sendiri.',
      });
      setPhase('done');
      await new Promise(r => setTimeout(r, 1100));
      setLama(''); setBaru(''); setUlangi('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
      setPhase(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Ganti Password</h3><p>Password lama diverifikasi dulu sebelum diganti.</p></div></div>
      <form onSubmit={submit}>
        <div className="card-body">
          <div className="form-grid">
            <div className="field"><label>Password Lama</label><input type="password" value={lama} onChange={e => setLama(e.target.value)} /></div>
            <div className="field"><label>Password Baru</label><input type="password" value={baru} onChange={e => setBaru(e.target.value)} /></div>
            <div className="field"><label>Ulangi Password Baru</label><input type="password" value={ulangi} onChange={e => setUlangi(e.target.value)} /></div>
          </div>
        </div>
        <div className="card-body" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Ganti Password'}</button>
        </div>
      </form>
      {phase && <SaveProgressModal phase={phase} />}
    </div>
  );
}

export default function ProfilSaya() {
  const { toast } = useAppData();
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!isConfigured() || !currentUser) return;
    setLoading(true);
    try {
      const data = await fetchLogFromSheet();
      const mine = data.filter(r => r['Username'] === currentUser.username).reverse();
      setRows(mine);
      setLoaded(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, currentUser]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'Waktu', label: 'Waktu', accessor: r => r['Waktu'] },
    { key: 'Aksi', label: 'Aksi', accessor: r => r['Aksi'] },
    { key: 'Modul', label: 'Modul', accessor: r => r['Modul'] },
    { key: 'Detail', label: 'Detail', accessor: r => r['Detail'] },
  ];

  return (
    <Page pageId="profil-saya" title="Profil Saya" path="Profil Saya">
      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarColor(currentUser?.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {initials(currentUser?.nama || '?')}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>{currentUser?.nama}</h2>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {currentUser?.role} &nbsp;·&nbsp; Username: {currentUser?.username} &nbsp;·&nbsp; {currentUser?.email || '-'}
            </div>
          </div>
        </div>
      </div>

      <GantiPasswordCard />

      <div className="card">
        <div className="card-head">
          <div><h3>Riwayat Aktivitas Saya</h3><p>Semua edit/hapus data yang pernah Anda lakukan.</p></div>
          <button className="btn btn-sm" onClick={load} disabled={loading}>{loading ? 'Memuat...' : '↻ Muat Ulang'}</button>
        </div>
        <div className="card-body">
          {!isConfigured() && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Belum tersambung ke Google Sheets.</p>}
          {isConfigured() && loaded && (
            <DataTable
              columns={columns}
              data={rows}
              emptyMessage="Belum ada aktivitas tercatat untuk akun ini."
              rowKey={(r, i) => r['No'] ?? i}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
