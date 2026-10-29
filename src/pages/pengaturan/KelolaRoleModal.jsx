import { useEffect, useRef, useState } from 'react';
import Modal from '../../components/common/Modal';
import { useAppData, ROLE_TERKUNCI } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { fetchUsersFromSheet, addLogEntry, isConfigured } from '../../services/googleSheets';

// Kelola kategori user (role): tambah, ganti nama, urutkan, hapus.
// `tambahBaru` = langsung sediakan 1 baris kosong (dipanggil dari opsi "+ Tambah kategori").
// `onSelesai(namaBaru)` = dipanggil setelah tersimpan; namaBaru = kategori terakhir yg
// ditambahkan (kalau ada) supaya form yg memanggil bisa langsung memilihnya.
export default function KelolaRoleModal({ onClose, onSelesai, tambahBaru = false }) {
  const { permissionRoles, simpanDaftarRole, toast } = useAppData();
  const { currentUser } = useAuth();
  const [draft, setDraft] = useState(() => {
    const a = permissionRoles.map(r => ({ nama: r, namaAwal: r }));
    // Baris baru diselipkan sebelum "Admin" supaya Admin tetap paling bawah.
    if (tambahBaru) { const iAdmin = a.findIndex(x => x.namaAwal === 'Admin'); a.splice(iAdmin < 0 ? a.length : iAdmin, 0, { nama: '', namaAwal: '' }); }
    return a;
  });
  const [pakai, setPakai] = useState(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const inputBaruRef = useRef(null);

  useEffect(() => {
    let batal = false;
    fetchUsersFromSheet()
      .then(rows => {
        if (batal) return;
        const m = {};
        rows.forEach(u => { const r = String(u['Role'] ?? '').trim(); if (r) m[r] = (m[r] || 0) + 1; });
        setPakai(m);
      })
      .catch(() => !batal && setPakai({}));
    return () => { batal = true; };
  }, []);

  useEffect(() => { if (tambahBaru) inputBaruRef.current?.focus(); }, [tambahBaru]);

  const terkunci = (d) => ROLE_TERKUNCI.includes(d.namaAwal);
  const ubah = (i, nama) => setDraft(d => d.map((x, k) => (k === i ? { ...x, nama } : x)));
  const hapus = (i) => setDraft(d => d.filter((_, k) => k !== i));
  const geser = (i, n) => setDraft(d => {
    const a = [...d]; const j = i + n;
    if (j < 0 || j >= a.length || terkunci(a[j])) return a;
    [a[i], a[j]] = [a[j], a[i]]; return a;
  });
  function tambah() {
    setDraft(d => {
      // Kategori baru diselipkan sebelum "Admin" supaya Admin tetap paling bawah.
      const iAdmin = d.findIndex(x => x.namaAwal === 'Admin');
      const a = [...d]; a.splice(iAdmin < 0 ? a.length : iAdmin, 0, { nama: '', namaAwal: '' }); return a;
    });
    setTimeout(() => inputBaruRef.current?.focus(), 0);
  }

  async function simpan() {
    if (!isConfigured()) { toast('Atur koneksi Google Sheets dulu.', 'error'); return; }
    setMenyimpan(true);
    try {
      const daftar = draft.filter(d => d.namaAwal || d.nama.trim()); // baris baru yg dibiarkan kosong diabaikan
      const { ganti, dihapus } = await simpanDaftarRole(daftar);
      const baru = daftar.filter(d => !d.namaAwal).map(d => d.nama.trim());
      const ringkas = [
        baru.length && `tambah ${baru.join(', ')}`,
        Object.keys(ganti).length && `ganti nama ${Object.entries(ganti).map(([a, b]) => `${a} → ${b}`).join(', ')}`,
        dihapus.length && `hapus ${dihapus.join(', ')}`,
      ].filter(Boolean).join('; ');
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Kategori User', modul: 'Manajemen User', detail: ringkas || 'ubah urutan' });
      toast('Kategori user tersimpan.');
      onSelesai && onSelesai(baru[baru.length - 1] || null, ganti);
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setMenyimpan(false);
    }
  }

  const iBaruTerakhir = draft.reduce((m, d, i) => (!d.namaAwal ? i : m), -1);

  return (
    <Modal title="Kategori User" subtitle="Daftar pilihan Role di form user. Ganti nama otomatis ikut memperbarui user & hak aksesnya. Kategori yang masih dipakai user tidak bisa dihapus." onClose={onClose}
      actions={<>
        <button className="btn" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={simpan} disabled={menyimpan}>{menyimpan ? 'Menyimpan…' : 'Simpan'}</button>
      </>}>
      <div className="role-list">
        {draft.map((d, i) => {
          const kunci = terkunci(d);
          const n = pakai?.[d.namaAwal] || 0;
          return (
            <div key={i} className="role-row">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn-icon" style={{ padding: '0 4px', fontSize: 10 }} onClick={() => geser(i, -1)} disabled={kunci || i === 0} aria-label="Naikkan">▲</button>
                <button className="btn-icon" style={{ padding: '0 4px', fontSize: 10 }} onClick={() => geser(i, 1)} disabled={kunci || i === draft.length - 1} aria-label="Turunkan">▼</button>
              </div>
              <input
                className="input-cell"
                ref={i === iBaruTerakhir ? inputBaruRef : undefined}
                value={d.nama}
                onChange={e => ubah(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); simpan(); } }}
                placeholder="mis. Guru, Wali Kelas, Operator"
                readOnly={kunci}
                title={kunci ? 'Kategori sistem — tidak bisa diganti nama atau dihapus' : undefined}
                style={{ flex: 1, ...(kunci ? { background: '#F6F8F5' } : {}) }}
              />
              <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 58, textAlign: 'right' }}>
                {kunci ? '🔒 sistem' : pakai === null ? '…' : n ? `${n} user` : d.namaAwal ? '—' : 'baru'}
              </span>
              <button className="btn-icon danger" onClick={() => hapus(i)} disabled={kunci || n > 0}
                title={kunci ? 'Kategori sistem' : n > 0 ? `Masih dipakai ${n} user` : 'Hapus kategori'} aria-label={`Hapus ${d.nama || 'kategori'}`}>✕</button>
            </div>
          );
        })}
      </div>
      <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={tambah}>+ Tambah kategori</button>
    </Modal>
  );
}
