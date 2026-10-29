import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { buatIdSiswa } from '../../db/siswaFields';
import { bulkUpdateSiswaInSheet, addLogEntry } from '../../services/googleSheets';
import { formatRaporTingkat } from '../../config/jenjang';

// Tombol capaian BB / MB / BSH / BSB. Klik lagi pilihan yg aktif = kosongkan.
export function CapaianPills({ value, onChange, skala, size = 'md', disabled }) {
  return (
    <div className={`capaian-pills capaian-${size}`} role="group" aria-label="Capaian perkembangan">
      {skala.map(k => (
        <button key={k.kode} type="button" title={k.nama} disabled={disabled}
          className={value === k.kode ? 'on' : ''} aria-pressed={value === k.kode}
          onClick={() => onChange(value === k.kode ? '' : k.kode)}>{k.kode}</button>
      ))}
    </div>
  );
}

// Rombel yg formatnya PAUD (menurut jenjang tingkatnya).
export const rombelPaud = (rombelList) => rombelList.filter(r => formatRaporTingkat(r.tingkat) === 'PAUD');

// Banner: siswa aktif yg belum punya ID Siswa + tombol buat massal.
export function BannerIdSiswa({ daftar }) {
  const { siswa, refreshSiswa, toast } = useAppData();
  const { currentUser } = useAuth();
  const [proses, setProses] = useState(false);
  const tanpaId = useMemo(() => (daftar || siswa.filter(x => x.status === 'Aktif')).filter(x => !x.idSiswa), [daftar, siswa]);
  if (!tanpaId.length) return null;
  async function buat() {
    setProses(true);
    try {
      const ada = siswa.map(x => x.idSiswa).filter(Boolean);
      const updates = tanpaId.map(x => { const id = buatIdSiswa(ada); ada.push(id); return { no: x.no, patch: { 'ID Siswa': id } }; });
      const hasil = await bulkUpdateSiswaInSheet(updates);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Buat ID Siswa', modul: 'Data Siswa', detail: `${hasil.jumlahDiupdate} siswa diberi ID Siswa` });
      await refreshSiswa();
      toast(`${hasil.jumlahDiupdate} siswa sudah punya ID Siswa.`);
    } catch (e) {
      toast(e.message, 'error');
    } finally { setProses(false); }
  }
  return (
    <div className="banner-info">
      <span><b>{tanpaId.length} siswa belum punya ID Siswa.</b> ID ini pengenal tetap anak dari KB/TK sampai SD, supaya penilaian &amp; rapornya tetap tersambung walau NISN belum ada.</span>
      <button className="btn btn-sm btn-primary" onClick={buat} disabled={proses}>{proses ? 'Membuat…' : 'Buat ID sekarang'}</button>
    </div>
  );
}

// Galeri foto kecil. `pilih` (opsional) = mode pilih; `hapus` = tombol ✕.
export function GaleriFoto({ foto, dipilih = [], onPilih, onHapus, kosong }) {
  if (!foto.length) return kosong ? <p className="paud-kosong">{kosong}</p> : null;
  return (
    <div className="foto-grid">
      {foto.map(u => {
        const on = dipilih.includes(u);
        return (
          <div key={u} className={`foto-thumb${on ? ' dipilih' : ''}`}>
            {onPilih
              ? <button type="button" onClick={() => onPilih(u)} aria-pressed={on} title={on ? 'Batal pilih' : 'Pilih utk rapor'} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}><img src={u} alt="" loading="lazy" /></button>
              : <a href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /></a>}
            {on && <span className="foto-cek">✓</span>}
            {onHapus && <button type="button" className="foto-x" onClick={() => onHapus(u)} aria-label="Hapus foto">✕</button>}
          </div>
        );
      })}
    </div>
  );
}
