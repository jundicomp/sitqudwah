import { useEffect, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { statusPemeliharaan, teksWaktu, teksJam } from '../../db/sistemFields';
import { addLogEntry, isConfigured } from '../../services/googleSheets';

// "2026-11-01T21:00" (input datetime-local, waktu lokal) <-> ISO
const keInput = (iso) => { if (!iso) return ''; const d = new Date(iso); if (Number.isNaN(d.getTime())) return ''; const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
const dariInput = (v) => (v ? new Date(v).toISOString() : '');

// Pengaturan Sistem › Mode pemeliharaan (v1.58.0).
export default function PemeliharaanCard() {
  const { pemeliharaan, refreshSistem, simpanKunciSistem, toast } = useAppData();
  const { currentUser } = useAuth();
  const [d, setD] = useState(pemeliharaan);
  const [menyimpan, setMenyimpan] = useState(false);
  const jejak = JSON.stringify(pemeliharaan);
  useEffect(() => { setD(pemeliharaan); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = statusPemeliharaan(pemeliharaan);

  async function simpan(patch, pesanOk) {
    if (!isConfigured('master')) { toast('File Sheets Data Induk belum tersambung.', 'error'); return; }
    const baru = { ...d, ...patch, oleh: currentUser.nama, pada: new Date().toISOString() };
    if (baru.jadwalMulai && baru.jadwalSelesai && baru.jadwalSelesai <= baru.jadwalMulai) { toast('Jam selesai jadwal harus setelah jam mulai.', 'error'); return; }
    setMenyimpan(true);
    try {
      await simpanKunciSistem('pemeliharaan', baru);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Mode Pemeliharaan', modul: 'Pengaturan Sistem', detail: baru.aktif ? 'Pemeliharaan DINYALAKAN' : (baru.jadwalMulai ? `Jadwal ${teksWaktu(baru.jadwalMulai)}–${teksJam(baru.jadwalSelesai)}` : 'Pemeliharaan dimatikan') });
      await refreshSistem();
      toast(pesanOk);
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Data Induk belum diperbarui (tab "sistem" belum dikenal). Tempel ulang Code.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Mode pemeliharaan</h3><p>Nyalakan sebelum memasang pembaruan besar (yang juga mengubah Apps Script). Selama aktif, semua user selain Admin melihat layar "Sistem sedang diperbarui" dan tidak bisa menyimpan apa pun. Berlaku dalam ±30 detik di semua perangkat yang sedang login.</p></div>
        <span className={`badge ${st.aktif ? 'badge-gold' : 'badge-green'}`}>{st.aktif ? (st.dariJadwal ? 'AKTIF (terjadwal)' : 'AKTIF') : 'Normal'}</span>
      </div>
      <div className="card-body">
        <div className="form-grid">
          <div className="field span2"><label>Pesan untuk user</label>
            <input value={d.pesan} placeholder="Kami sedang memasang pembaruan Siskom Qudwah. Mohon tunggu sebentar." onChange={e => setD({ ...d, pesan: e.target.value })} /></div>
          <div className="field"><label>Perkiraan selesai (opsional)</label>
            <input type="datetime-local" value={keInput(d.perkiraanSelesai)} onChange={e => setD({ ...d, perkiraanSelesai: dariInput(e.target.value) })} /></div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            {pemeliharaan.aktif
              ? <button className="btn" disabled={menyimpan} onClick={() => simpan({ aktif: false }, 'Mode pemeliharaan dimatikan. User bisa bekerja lagi; aplikasi mereka dimuat ulang otomatis bila ada versi baru.')}>Matikan pemeliharaan</button>
              : <button className="btn btn-primary" disabled={menyimpan} onClick={() => simpan({ aktif: true }, 'Mode pemeliharaan dinyalakan.')}>Nyalakan pemeliharaan sekarang</button>}
          </div>
        </div>

        <div className="pj-jadwal-box">
          <b>Jadwal pemeliharaan (opsional)</b>
          <p>Pengumuman tampil di semua layar sejak disimpan. Saat jam mulai tiba, mode pemeliharaan menyala sendiri dan mati sendiri di jam selesai.</p>
          <div className="form-grid">
            <div className="field"><label>Mulai</label><input type="datetime-local" value={keInput(d.jadwalMulai)} onChange={e => setD({ ...d, jadwalMulai: dariInput(e.target.value) })} /></div>
            <div className="field"><label>Selesai</label><input type="datetime-local" value={keInput(d.jadwalSelesai)} onChange={e => setD({ ...d, jadwalSelesai: dariInput(e.target.value) })} /></div>
            <div className="field span2"><label>Pesan pengumuman</label><input value={d.jadwalPesan} placeholder="Mohon simpan pekerjaan sebelum waktu tersebut." onChange={e => setD({ ...d, jadwalPesan: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn btn-sm btn-primary" disabled={menyimpan || !d.jadwalMulai || !d.jadwalSelesai} onClick={() => simpan({}, 'Jadwal pemeliharaan disimpan dan diumumkan.')}>Simpan jadwal</button>
            {(pemeliharaan.jadwalMulai || pemeliharaan.jadwalSelesai) && <button className="btn btn-sm" disabled={menyimpan} onClick={() => simpan({ jadwalMulai: '', jadwalSelesai: '', jadwalPesan: '' }, 'Jadwal pemeliharaan dihapus.')}>Hapus jadwal</button>}
          </div>
        </div>

        <details className="pj-panduan">
          <summary>Urutan deploy yang aman</summary>
          <ol>
            <li><b>Pembaruan biasa</b> (hanya aplikasi): cukup push ke GitHub. Setelah ±2 menit, aplikasi di semua perangkat dimuat ulang sendiri — langsung kalau user sedang tidak mengisi apa-apa, atau setelah mereka menyimpan.</li>
            <li><b>Pembaruan besar</b> (ada perubahan Apps Script): nyalakan pemeliharaan → tempel Apps Script &amp; Deploy → New version → push ke GitHub → tunggu GitHub Pages selesai (tab Actions hijau) → cek sebagai Admin → matikan pemeliharaan.</li>
          </ol>
        </details>
        {pemeliharaan.oleh && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 0' }}>Terakhir diubah oleh {pemeliharaan.oleh}{pemeliharaan.pada ? `, ${teksWaktu(pemeliharaan.pada)}` : ''}.</p>}
      </div>
    </div>
  );
}
