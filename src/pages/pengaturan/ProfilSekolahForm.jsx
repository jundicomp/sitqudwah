import { useEffect, useState } from 'react';
import { PROFIL_FIELDS, emptyProfilRow, LOGO_MAX_BYTES } from '../../db/profilFields';
import { saveProfilToSheet, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import SaveProgressModal from '../../components/common/SaveProgressModal';

export default function ProfilSekolahForm() {
  const { profilSekolah, profilLoading, profilExists, refreshProfil, toast } = useAppData();
  const [form, setForm] = useState(emptyProfilRow());
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(null);

  useEffect(() => {
    if (profilSekolah) {
      setForm({
        'Nama Sekolah': profilSekolah.nama || '',
        'NPSN': profilSekolah.npsn || '',
        'Alamat': profilSekolah.alamat || '',
        'Kepala Sekolah': profilSekolah.kepalaSekolah || '',
        'Telepon': profilSekolah.telepon || '',
        'Email': profilSekolah.email || '',
        'Logo': profilSekolah.logo || '',
      });
    }
  }, [profilSekolah]);

  function setField(key, value) { setForm(f => ({ ...f, [key]: value })); }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('File harus berupa gambar.', 'error'); return; }
    if (file.size > LOGO_MAX_BYTES) {
      toast(`Ukuran logo maksimal ${Math.round(LOGO_MAX_BYTES / 1024)}KB (batasan sel Google Sheets). Kompres/perkecil dulu gambarnya.`, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => setField('Logo', evt.target.result);
    reader.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault();
    if (!isConfigured()) { toast('Atur koneksi Google Sheets dulu (menu Pengaturan Koneksi).', 'error'); return; }
    const wajib = PROFIL_FIELDS.find(f => f.required && !String(form[f.key]).trim());
    if (wajib) { toast(`${wajib.label} wajib diisi.`, 'error'); return; }
    setSaving(true);
    setPhase('saving');
    try {
      await saveProfilToSheet(form, profilExists);
      setPhase('done');
      await new Promise(r => setTimeout(r, 1100));
      refreshProfil();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
      setPhase(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Profil Sekolah</h3><p>Identitas sekolah — dipakai di seluruh aplikasi (kwitansi, invoice, dsb saat modul terkait sudah dimigrasi).</p></div>
      </div>
      <form onSubmit={submit}>
        <div className="card-body">
          <div className="field span2" style={{ marginBottom: 18 }}>
            <label>Logo Sekolah</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 72, height: 72, border: '1px dashed var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#F6F8F5', flexShrink: 0 }}>
                {form['Logo'] ? <img src={form['Logo']} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: 'var(--muted)' }}>Belum ada</span>}
              </div>
              <div>
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ fontSize: 12.5 }} />
                <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>
                  Maks {Math.round(LOGO_MAX_BYTES / 1024)}KB — disimpan langsung di sel Google Sheets, jadi ukurannya dibatasi.
                </p>
                {form['Logo'] && <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => setField('Logo', '')}>↺ Hapus Logo</button>}
              </div>
            </div>
          </div>

          <div className="form-grid">
            {PROFIL_FIELDS.map(f => (
              <div key={f.key} className="field">
                <label>{f.label}{f.required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving || profilLoading}>{saving ? 'Menyimpan...' : 'Simpan Profil Sekolah'}</button>
        </div>
      </form>
      {phase && <SaveProgressModal phase={phase} />}
    </div>
  );
}
