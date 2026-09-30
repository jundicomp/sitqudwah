import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchLogFromSheet, fetchUsersFromSheet, isConfigured } from '../../services/googleSheets';

// Cuma role ini yg boleh melihat panel "User Aktif" -- konsisten dgn kebutuhan
// user: admin/kepala sekolah mau pantau petugas lain yg sedang login & ngapain.
const ROLE_BOLEH_LIHAT = ['Admin', 'Kepala Sekolah'];

const JEDA_POLLING_MS = 20 * 1000; // cek log baru tiap 20 detik
const UMUR_MAKS_MS = 15 * 60 * 1000; // box otomatis hilang sendiri stlh 15 menit kalau tak ditutup manual
const MAKS_BOX = 5; // jangan biarkan menumpuk tak terbatas di layar

function inisialDariNama(nama) {
  const bersih = String(nama || '').trim();
  if (!bersih) return '?';
  const bagian = bersih.split(/\s+/);
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase();
  return (bagian[0][0] + bagian[bagian.length - 1][0]).toUpperCase();
}

function formatJamSaja(waktuMentah) {
  // 'Waktu' di sheet log berupa string locale (mis. "16/09/2026 14.05.10") -- cukup
  // ambil bagian jamnya saja utk ditampilkan di box supaya ringkas.
  const teks = String(waktuMentah || '');
  const bagian = teks.split(' ');
  return bagian.length > 1 ? bagian[bagian.length - 1] : teks;
}

export default function UserAktifPanel() {
  const { currentUser } = useAuth();
  const bolehLihat = !!currentUser && ROLE_BOLEH_LIHAT.includes(currentUser.role);

  const [boxes, setBoxes] = useState([]);
  const lastNoRef = useRef(null); // null = baseline blm diambil -- jgn tampilkan histori lama sbg "baru"
  const roleMapRef = useRef({}); // username(lowercase) -> role, utk badge kecil di box

  // Ambil daftar user sekali di awal utk lookup role by username (badge di tiap box).
  useEffect(() => {
    if (!bolehLihat || !isConfigured()) return;
    let batal = false;
    fetchUsersFromSheet()
      .then(rows => {
        if (batal) return;
        const map = {};
        (rows || []).forEach(u => {
          const uname = String(u['Username'] ?? '').trim().toLowerCase();
          if (uname) map[uname] = String(u['Role'] ?? '').trim();
        });
        roleMapRef.current = map;
      })
      .catch(() => { /* gagal ambil daftar user -- badge role cukup dikosongkan, bukan fatal */ });
    return () => { batal = true; };
  }, [bolehLihat]);

  // Polling log aktivitas -- baseline dulu (jgn tampilkan histori lama), lalu tiap
  // jeda cek baris baru (No lebih besar dari terakhir) milik user LAIN.
  useEffect(() => {
    if (!bolehLihat || !isConfigured()) return;

    async function cekLogBaru() {
      try {
        const rows = await fetchLogFromSheet();
        if (!rows || rows.length === 0) return;

        if (lastNoRef.current === null) {
          // Kunjungan pertama: cuma catat baseline, jgn munculkan box utk histori lama.
          const noMaks = Math.max(...rows.map(r => Number(r['No']) || 0));
          lastNoRef.current = noMaks;
          return;
        }

        const baruSaja = rows
          .filter(r => Number(r['No']) > lastNoRef.current)
          .filter(r => String(r['Username'] ?? '').trim().toLowerCase() !== String(currentUser.username ?? '').trim().toLowerCase())
          .sort((a, b) => Number(a['No']) - Number(b['No']));

        if (baruSaja.length === 0) return;

        lastNoRef.current = Math.max(lastNoRef.current, ...baruSaja.map(r => Number(r['No']) || 0));

        setBoxes(prev => {
          const tambahan = baruSaja.map(r => {
            const usernameLower = String(r['Username'] ?? '').trim().toLowerCase();
            return {
              id: Number(r['No']),
              namaUser: String(r['Nama User'] ?? r['Username'] ?? 'Seseorang').trim(),
              role: roleMapRef.current[usernameLower] || '',
              aksi: String(r['Aksi'] ?? '').trim(),
              modul: String(r['Modul'] ?? '').trim(),
              detail: String(r['Detail'] ?? '').trim(),
              jam: formatJamSaja(r['Waktu']),
              munculPada: Date.now(),
            };
          });
          const gabungan = [...prev, ...tambahan];
          // Simpan yg TERBARU saja kalau kelebihan kapasitas.
          return gabungan.slice(Math.max(0, gabungan.length - MAKS_BOX));
        });
      } catch {
        // Gagal ambil log -- diamkan saja, coba lagi di jeda polling berikutnya.
      }
    }

    cekLogBaru();
    const interval = setInterval(cekLogBaru, JEDA_POLLING_MS);
    return () => clearInterval(interval);
  }, [bolehLihat, currentUser]);

  // Sapu box yg sudah kadaluarsa (>15 menit) tiap 30 detik -- jaga2 kalau user lupa nutup manual.
  useEffect(() => {
    if (!bolehLihat) return;
    const sapu = setInterval(() => {
      setBoxes(prev => prev.filter(b => Date.now() - b.munculPada < UMUR_MAKS_MS));
    }, 30 * 1000);
    return () => clearInterval(sapu);
  }, [bolehLihat]);

  function tutup(id) {
    setBoxes(prev => prev.filter(b => b.id !== id));
  }

  if (!bolehLihat || boxes.length === 0) return null;

  return (
    <div className="useraktif-stack">
      {boxes.map(b => (
        <div key={b.id} className="useraktif-box">
          <button className="useraktif-close" onClick={() => tutup(b.id)} title="Tutup" aria-label="Tutup">✕</button>
          <div className="useraktif-head">
            <span className="useraktif-avatar">
              {inisialDariNama(b.namaUser)}
              <span className="useraktif-dot" />
            </span>
            <div className="useraktif-nama-wrap">
              <div className="useraktif-nama">{b.namaUser}</div>
              {b.role && <span className="useraktif-badge">{b.role}</span>}
            </div>
          </div>
          <div className="useraktif-aksi">
            {b.aksi}{b.modul ? ` — ${b.modul}` : ''}
            {b.detail ? <div className="useraktif-detail">{b.detail}</div> : null}
          </div>
          <div className="useraktif-jam">{b.jam}</div>
        </div>
      ))}
    </div>
  );
}
