import { useEffect, useState } from 'react';
import { PROFIL_FIELDS, emptyProfilRow, LOGO_MAX_BYTES } from '../../db/profilFields';
import { saveProfilToSheet, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import SaveProgressModal from '../../components/common/SaveProgressModal';
import KopSurat from '../../components/common/KopSurat';
import { TAMBAHAN_BAWAAN, TAMBAHAN_FIELDS, KOP_BAWAAN, KOP_PILIHAN, GARIS_OPSI, SEBUTAN_TELEPON } from '../../db/kopFields';

// Unggah gambar kecil (logo) -> data URL, dgn batas ukuran sel Google Sheets.
function bacaLogo(e, toast, setter) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('File harus berupa gambar.', 'error'); return; }
  if (file.size > LOGO_MAX_BYTES) {
    toast(`Ukuran logo maksimal ${Math.round(LOGO_MAX_BYTES / 1024)}KB (batasan sel Google Sheets). Kompres/perkecil dulu gambarnya.`, 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (evt) => setter(evt.target.result);
  reader.readAsDataURL(file);
}

function UnggahLogo({ label, value, onChange, toast, catatan }) {
  return (
    <div className="field" style={{ marginBottom: 18 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 72, height: 72, border: '1px dashed var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#F6F8F5', flexShrink: 0 }}>
          {value ? <img src={value} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: 'var(--muted)' }}>Belum ada</span>}
        </div>
        <div>
          <input type="file" accept="image/*" onChange={e => bacaLogo(e, toast, onChange)} style={{ fontSize: 12.5 }} />
          <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>{catatan || `Maks ${Math.round(LOGO_MAX_BYTES / 1024)}KB.`}</p>
          {value && <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => onChange('')}>↺ Hapus Logo</button>}
        </div>
      </div>
    </div>
  );
}

export default function ProfilSekolahForm() {
  const { profilSekolah, profilLoading, profilExists, refreshProfil, toast, tambahanProfil, pengaturanKop, simpanKunciSistem } = useAppData();
  const [form, setForm] = useState(emptyProfilRow());
  const [tambahan, setTambahan] = useState(TAMBAHAN_BAWAAN);
  const [kop, setKop] = useState(KOP_BAWAAN);
  const [simpanKop, setSimpanKop] = useState(false);
  // Sinkron hanya bila isi tersimpannya BERUBAH (auto-refresh 30 dtk tidak menimpa ketikan).
  const jsonTambahan = JSON.stringify(tambahanProfil), jsonKop = JSON.stringify(pengaturanKop);
  useEffect(() => { setTambahan({ ...TAMBAHAN_BAWAAN, ...JSON.parse(jsonTambahan) }); }, [jsonTambahan]);
  useEffect(() => { setKop(JSON.parse(jsonKop)); }, [jsonKop]);
  const setTmb = (key, value) => setTambahan(t => ({ ...t, [key]: value }));
  const profilPratinjau = { nama: form['Nama Sekolah'], npsn: form['NPSN'], alamat: form['Alamat'], telepon: form['Telepon'], email: form['Email'], logo: form['Logo'] };

  async function submitKop() {
    setSimpanKop(true);
    try {
      await simpanKunciSistem('kop', { ...kop, pada: new Date().toISOString() });
      toast('Pengaturan kop surat disimpan.');
    } catch (err) { toast(err.message, 'error'); }
    finally { setSimpanKop(false); }
  }
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

  async function submit(e) {
    e.preventDefault();
    if (!isConfigured()) { toast('Atur koneksi Google Sheets dulu (menu Pengaturan Koneksi).', 'error'); return; }
    const wajib = PROFIL_FIELDS.find(f => f.required && !String(form[f.key]).trim());
    if (wajib) { toast(`${wajib.label} wajib diisi.`, 'error'); return; }
    setSaving(true);
    setPhase('saving');
    try {
      await saveProfilToSheet(form, profilExists);
      await simpanKunciSistem('profil-tambahan', tambahan);
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
    <>
    <div className="card">
      <div className="card-head">
        <div><h3>Profil Sekolah</h3><p>Identitas sekolah — dipakai di seluruh aplikasi, termasuk kop surat dokumen cetak.</p></div>
      </div>
      <form onSubmit={submit}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <UnggahLogo label="Logo Sekolah (kanan kop)" value={form['Logo']} onChange={v => setField('Logo', v)} toast={toast}
              catatan={`Maks ${Math.round(LOGO_MAX_BYTES / 1024)}KB — disimpan langsung di sel Google Sheets.`} />
            <UnggahLogo label="Logo Yayasan / Pemda (kiri kop)" value={tambahan.logoPemda} onChange={v => setTmb('logoPemda', v)} toast={toast} />
          </div>

          <div className="form-grid">
            {PROFIL_FIELDS.map(f => (
              <div key={f.key} className="field">
                <label>{f.label}{f.required && <span style={{ color: 'var(--red)' }}> *</span>}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} />
              </div>
            ))}
            {TAMBAHAN_FIELDS.map(f => (
              <div key={f.key} className="field">
                <label>{f.label}</label>
                <input type="text" value={tambahan[f.key] || ''} placeholder={f.ph} onChange={e => setTmb(f.key, e.target.value)} />
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

    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-head">
        <div><h3>Kop Surat</h3><p>Centang data yang dicantumkan di kop surat dokumen cetak (naskah soal, kunci jawaban, dll). Isi datanya di Profil Sekolah di atas.</p></div>
      </div>
      <div className="card-body">
        <div className="kop-cek">
          {KOP_PILIHAN.map(o => (
            <label key={o.key}>
              <input type="checkbox" checked={!!kop.tampil?.[o.key]} onChange={e => setKop(k => ({ ...k, tampil: { ...k.tampil, [o.key]: e.target.checked } }))} />
              {o.label}
            </label>
          ))}
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Garis bawah kop</label>
            <select value={kop.garis} onChange={e => setKop(k => ({ ...k, garis: e.target.value }))}>
              {GARIS_OPSI.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Sebutan nomor telepon</label>
            <select value={kop.sebutanTelepon} onChange={e => setKop(k => ({ ...k, sebutanTelepon: e.target.value }))}>
              {SEBUTAN_TELEPON.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', display: 'block', marginTop: 6 }}>Pratinjau (ikut berubah saat Anda mengetik)</label>
        <div className="kop-pratinjau"><KopSurat profil={profilPratinjau} tambahan={tambahan} kop={kop} /></div>
      </div>
      <div className="card-body" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn" onClick={() => setKop(KOP_BAWAAN)}>Kembalikan bawaan</button>
        <button type="button" className="btn btn-primary" onClick={submitKop} disabled={simpanKop}>{simpanKop ? 'Menyimpan...' : 'Simpan Kop Surat'}</button>
      </div>
    </div>
    </>
  );
}
