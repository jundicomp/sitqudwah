import { useRef, useState } from 'react';
import { kompresFoto } from '../../utils/kompresFoto';
import { uploadFotoKeDrive } from '../../services/googleSheets';

// Tombol unggah foto ke Google Drive. onUploaded(url) dipanggil per foto.
export function TombolUnggahFoto({ onUploaded, subfolder, nama, multiple = false, label = 'Unggah foto', onError, disabled, style }) {
  const ref = useRef(null);
  const [proses, setProses] = useState(0);
  async function pilih(e) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setProses(files.length);
    for (const f of files) {
      try {
        const dataUrl = await kompresFoto(f);
        const { url } = await uploadFotoKeDrive(dataUrl, { subfolder, nama: `${nama || 'foto'}-${Date.now()}.jpg` });
        onUploaded(url);
      } catch (err) {
        onError ? onError(err.message) : alert(err.message);
      } finally {
        setProses(p => p - 1);
      }
    }
  }
  return (
    <>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} hidden onChange={pilih} />
      <button type="button" className="foto-tambah" style={style} disabled={disabled || proses > 0} onClick={() => ref.current?.click()}>
        {proses > 0 ? `Mengunggah… (${proses})` : <>📷 {label}</>}
      </button>
    </>
  );
}

// Field form "Foto" tunggal (mis. pas foto siswa): pratinjau + ganti + hapus.
export default function FotoDriveField({ value, onChange, subfolder = 'Pas Foto Siswa', nama, onError }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {value
        ? <img src={value} alt="Foto" style={{ width: 60, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
        : <div style={{ width: 60, height: 80, borderRadius: 6, border: '1px dashed var(--border)', display: 'grid', placeItems: 'center', fontSize: 11, color: 'var(--muted)' }}>belum ada</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <TombolUnggahFoto subfolder={subfolder} nama={nama} label={value ? 'Ganti foto' : 'Unggah foto'} onUploaded={onChange} onError={onError} />
        {value && <button type="button" className="btn btn-sm" onClick={() => onChange('')}>Hapus</button>}
      </div>
    </div>
  );
}
