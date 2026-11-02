import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../db/akses';
import { statusPemeliharaan, teksWaktu, teksJam } from '../../db/sistemFields';
import { setBlokirTulis } from '../../services/googleSheets';
import { adaIsianBelumTersimpan } from '../../hooks/useDrafLokal';
import pkg from '../../../package.json';

// v1.58.0 -- dua penjaga saat deploy:
// 1) MODE PEMELIHARAAN: dinyalakan Admin di Pengaturan Sistem (atau otomatis selama jadwal).
//    User selain Admin melihat layar "sedang diperbarui" & tidak bisa menyimpan apa pun.
// 2) VERSI BARU: cek dist/version.json berkala. Kalau ada versi baru dan user TIDAK sedang
//    mengisi apa-apa -> muat ulang otomatis. Kalau sedang mengisi -> banner, tunggu disimpan.
const BUILD = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
const CEK_VERSI_MS = 3 * 60 * 1000;
const JEDA_KETIK_MS = 3 * 60 * 1000;

function sedangMengisi(lastInput, lastSukses) {
  if (adaIsianBelumTersimpan()) return true;
  if (document.querySelector('.modal-overlay')) return true;
  const el = document.activeElement;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.readOnly) return true;
  return lastInput > lastSukses && Date.now() - lastInput < JEDA_KETIK_MS;
}

export default function PenjagaSistem() {
  const { pemeliharaan, refreshSistem } = useAppData();
  const { currentUser, logout } = useAuth();
  const admin = isAdmin(currentUser);
  const [loginAdmin, setLoginAdmin] = useState(false); // tombol "Masuk sebagai Admin" di layar pemeliharaan
  const [, setDetak] = useState(0); // render ulang tiap 30 dtk utk jadwal otomatis
  const st = statusPemeliharaan(pemeliharaan);
  const blokirPemeliharaan = st.aktif && !!currentUser && !admin;
  const kunciLogin = st.aktif && !currentUser && !loginAdmin;

  const [versiBaru, setVersiBaru] = useState(null); // { versi, build, wajib }
  const [hitung, setHitung] = useState(null);       // hitung mundur muat ulang
  const [ditunda, setDitunda] = useState(0);
  const lastInput = useRef(0);
  const lastSukses = useRef(0);

  // Jam internal: jadwal pemeliharaan bisa mulai/berakhir tanpa ada perubahan data.
  useEffect(() => { const t = setInterval(() => setDetak(x => x + 1), 30000); return () => clearInterval(t); }, []);
  // Di halaman login status pemeliharaan diambil sendiri (data induk lain belum dimuat).
  useEffect(() => {
    if (currentUser) return undefined;
    refreshSistem();
    const t = setInterval(refreshSistem, 30000);
    return () => clearInterval(t);
  }, [currentUser, refreshSistem]);
  useEffect(() => { if (!st.aktif) setLoginAdmin(false); }, [st.aktif]);
  // Setelah keluar, layar pemeliharaan menutup form login lagi.
  useEffect(() => { if (!currentUser) setLoginAdmin(false); }, [currentUser]);
  // Saat layar pemeliharaan tampil, cek status lebih sering supaya cepat terbuka lagi.
  useEffect(() => {
    if (!blokirPemeliharaan) return undefined;
    const t = setInterval(refreshSistem, 20000);
    return () => clearInterval(t);
  }, [blokirPemeliharaan, refreshSistem]);

  // Ketikan di layar login tidak dihitung sebagai "sedang mengisi".
  useEffect(() => { lastInput.current = 0; }, [currentUser?.username]);
  // Lacak aktivitas mengetik & penyimpanan berhasil.
  useEffect(() => {
    const ketik = (e) => { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) lastInput.current = Date.now(); };
    const sukses = () => { lastSukses.current = Date.now(); };
    document.addEventListener('input', ketik, true);
    window.addEventListener('sq-toast-sukses', sukses);
    return () => { document.removeEventListener('input', ketik, true); window.removeEventListener('sq-toast-sukses', sukses); };
  }, []);

  // Cek versi baru: berkala, saat tab aktif lagi, dan saat pemeliharaan baru selesai.
  const cekVersi = useRef(async () => {});
  cekVersi.current = async () => {
    if (!BUILD) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const v = await res.json();
      if (v?.build && v.build !== BUILD) setVersiBaru(v);
    } catch { /* offline / dev: abaikan */ }
  };
  useEffect(() => {
    const jalan = () => cekVersi.current();
    const tampil = () => { if (document.visibilityState === 'visible') jalan(); };
    const awal = setTimeout(jalan, 15000);
    const t = setInterval(jalan, CEK_VERSI_MS);
    document.addEventListener('visibilitychange', tampil);
    return () => { clearTimeout(awal); clearInterval(t); document.removeEventListener('visibilitychange', tampil); };
  }, []);
  const tadiAktif = useRef(st.aktif);
  useEffect(() => { if (tadiAktif.current && !st.aktif) cekVersi.current(); tadiAktif.current = st.aktif; }, [st.aktif]);

  // v1.61.4: tanya dulu sebelum halaman ditutup / di-refresh (termasuk tarik layar ke bawah
  // di HP) selama ada isian rapor/modul yg belum disimpan.
  useEffect(() => {
    const cegah = (e) => { if (adaIsianBelumTersimpan()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', cegah);
    return () => window.removeEventListener('beforeunload', cegah);
  }, []);

  // Penghalang tulis global.
  const usangWajib = !!versiBaru?.wajib;
  useEffect(() => {
    if (blokirPemeliharaan) setBlokirTulis('Sistem sedang dalam pemeliharaan. Penyimpanan ditunda sampai pemeliharaan selesai.');
    else if (usangWajib) setBlokirTulis('Aplikasi sudah diperbarui dan versi di browser ini tidak boleh menyimpan lagi. Klik "Muat ulang" di bagian bawah layar.');
    else setBlokirTulis(null);
  }, [blokirPemeliharaan, usangWajib]);

  // Versi baru: muat ulang otomatis kalau aman, atau hitung mundur begitu jadi aman.
  useEffect(() => {
    if (!versiBaru || blokirPemeliharaan) return undefined;
    const t = setInterval(() => {
      if (Date.now() < ditunda) return;
      if (!sedangMengisi(lastInput.current, lastSukses.current)) {
        setHitung(h => {
          if (h === null) return lastInput.current === 0 ? 0 : 10; // tidak pernah mengetik -> langsung
          return Math.max(0, h - 1);
        });
      } else setHitung(null);
    }, 1000);
    return () => clearInterval(t);
  }, [versiBaru, blokirPemeliharaan, ditunda]);
  useEffect(() => { if (hitung === 0) window.location.reload(); }, [hitung]);

  return (
    <>
      {(blokirPemeliharaan || kunciLogin) && (
        <div className="pj-layar" role="alertdialog" aria-live="assertive">
          <div className="pj-kartu">
            <div className="pj-ikon" aria-hidden="true">🛠️</div>
            <h2>Sistem sedang diperbarui</h2>
            <p>{st.pesan || 'Kami sedang memasang pembaruan Siskom Qudwah. Mohon tunggu sebentar.'}</p>
            {st.perkiraanSelesai && <p className="pj-sub">Perkiraan selesai pukul <b>{teksJam(st.perkiraanSelesai)}</b>.</p>}
            <div className="pj-loader" aria-hidden="true"><i /></div>
            <p className="pj-sub">Halaman akan terbuka sendiri setelah pembaruan selesai. Tidak perlu menutup aplikasi.</p>
            {kunciLogin && <button type="button" className="pj-link" onClick={() => setLoginAdmin(true)}>Masuk sebagai Admin</button>}
            {blokirPemeliharaan && <button type="button" className="pj-link" onClick={logout}>Keluar</button>}
          </div>
        </div>
      )}

      {!currentUser && st.aktif && loginAdmin && (
        <div className="pj-pita pj-admin"><span>🛠️ <b>Mode pemeliharaan.</b> Hanya akun Admin yang bisa masuk; akun lain tetap melihat layar pemeliharaan.</span>
          <button type="button" className="btn btn-sm" onClick={() => setLoginAdmin(false)}>Kembali</button></div>
      )}

      {admin && st.aktif && currentUser && (
        <div className="pj-pita pj-admin">
          <span>🛠️ <b>Mode pemeliharaan {st.dariJadwal ? '(terjadwal) ' : ''}aktif</b> — user selain Admin tidak bisa memakai aplikasi.</span>
          <Link to="/pengaturan-sistem" className="btn btn-sm">Atur / matikan</Link>
        </div>
      )}

      {!st.aktif && st.akanDatang && (
        <div className="pj-pita pj-jadwal">
          <span>📢 <b>Pemeliharaan terjadwal</b> {teksWaktu(pemeliharaan.jadwalMulai)} – {teksJam(pemeliharaan.jadwalSelesai)}. {pemeliharaan.jadwalPesan || 'Mohon simpan pekerjaan sebelum waktu tersebut.'}</span>
        </div>
      )}

      {versiBaru && !blokirPemeliharaan && currentUser && (
        <div className={`pj-update ${usangWajib ? 'wajib' : ''}`} role="status">
          <div>
            <b>{usangWajib ? 'Pembaruan wajib' : 'Versi baru tersedia'}{versiBaru.versi && versiBaru.versi !== pkg.version ? ` (v${versiBaru.versi})` : ''}</b>
            <span>{hitung !== null && hitung > 0
              ? `Memuat ulang dalam ${hitung} detik…`
              : usangWajib ? 'Penyimpanan dari versi ini dikunci. Salin dulu isian penting bila perlu, lalu muat ulang.'
                : 'Simpan pekerjaan Anda; halaman akan dimuat ulang otomatis setelah tersimpan.'}</span>
          </div>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => window.location.reload()}>Muat ulang sekarang</button>
          {!usangWajib && <button type="button" className="btn btn-sm" onClick={() => { setDitunda(Date.now() + 10 * 60 * 1000); setHitung(null); }}>Nanti</button>}
        </div>
      )}
    </>
  );
}
