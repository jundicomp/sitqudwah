import { useEffect, useState } from 'react';
import { PROFIL_FIELDS, emptyProfilRow, LOGO_MAX_BYTES } from '../../db/profilFields';
import { saveProfilToSheet, isConfigured } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import SaveProgressModal from '../../components/common/SaveProgressModal';
import KopSurat from '../../components/common/KopSurat';
import AturHalaman from '../../components/common/AturHalaman';
import { Link } from 'react-router-dom';
import { TAMBAHAN_BAWAAN, TAMBAHAN_FIELDS, KOP_BAWAAN, KOP_PILIHAN, GARIS_OPSI, SEBUTAN_TELEPON, GAYA_KOP, KOP_PAUD_BAWAAN, KOP_PAUD_FIELDS, ukuranLogo, LOGO_MIN_MM, LOGO_MAKS_MM } from '../../db/kopFields';

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
  const { profilSekolah, profilLoading, profilExists, refreshProfil, toast, tambahanProfil, pengaturanKop, pengaturanKopPaud, simpanKunciSistem } = useAppData();
  const [form, setForm] = useState(emptyProfilRow());
  const [tambahan, setTambahan] = useState(TAMBAHAN_BAWAAN);
  const [kopUmum, setKopUmum] = useState(KOP_BAWAAN);
  const [kopPaud, setKopPaud] = useState(KOP_PAUD_BAWAAN);
  const [jenjangKop, setJenjangKop] = useState('umum');
  const [simpanKop, setSimpanKop] = useState(false);
  const paud = jenjangKop === 'PAUD';
  const kop = paud ? kopPaud : kopUmum;
  const setKop = paud ? setKopPaud : setKopUmum;
  const setDataPaud = (key, v) => setKopPaud(k => ({ ...k, data: { ...k.data, [key]: v } }));
  // Sinkron hanya bila isi tersimpannya BERUBAH (auto-refresh 30 dtk tidak menimpa ketikan).
  const jsonTambahan = JSON.stringify(tambahanProfil), jsonKop = JSON.stringify(pengaturanKop), jsonKopPaud = JSON.stringify(pengaturanKopPaud);
  useEffect(() => { setTambahan({ ...TAMBAHAN_BAWAAN, ...JSON.parse(jsonTambahan) }); }, [jsonTambahan]);
  useEffect(() => { setKopUmum(JSON.parse(jsonKop)); }, [jsonKop]);
  useEffect(() => { setKopPaud(JSON.parse(jsonKopPaud)); }, [jsonKopPaud]);
  const setTmb = (key, value) => setTambahan(t => ({ ...t, [key]: value }));
  const profilPratinjau = { nama: form['Nama Sekolah'], npsn: form['NPSN'], alamat: form['Alamat'], telepon: form['Telepon'], email: form['Email'], logo: form['Logo'] };

  async function submitKop() {
    setSimpanKop(true);
    try {
      await simpanKunciSistem(paud ? 'kop-PAUD' : 'kop', { ...kop, pada: new Date().toISOString() });
      toast(`Kop surat ${paud ? 'PAUD' : 'umum/SD'} disimpan.`);
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
        <div><h3>Kop Surat</h3><p>{paud
          ? 'Kop PAUD dipakai di dokumen PAUD (STSB, dll). Isian yang dikosongkan otomatis ikut kop umum.'
          : 'Kop umum/SD dipakai di naskah soal, kunci jawaban, dll. Isi datanya di Profil Sekolah di atas.'}</p></div>
      </div>
      <div className="card-body">
        <div className="seg-tabs" style={{ marginBottom: 14 }}>
          <button type="button" className={`seg-tab ${!paud ? 'active' : ''}`} onClick={() => setJenjangKop('umum')}>KOP UMUM / SD</button>
          <button type="button" className={`seg-tab ${paud ? 'active' : ''}`} onClick={() => setJenjangKop('PAUD')}>KOP PAUD</button>
        </div>
        {paud && (
          <>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <UnggahLogo label="Logo kiri (mis. Pemda)" value={kopPaud.data.logoKiri} onChange={v => setDataPaud('logoKiri', v)} toast={toast} catatan="Kosong = logo yayasan/pemda kop umum." />
              <UnggahLogo label="Logo kanan" value={kopPaud.data.logoKanan} onChange={v => setDataPaud('logoKanan', v)} toast={toast} catatan="Kosong = logo sekolah." />
            </div>
            <div className="form-grid" style={{ marginBottom: 10 }}>
              {KOP_PAUD_FIELDS.map(f => (
                <div key={f.key} className="field">
                  <label>{f.label}</label>
                  <input type="text" value={kopPaud.data[f.key] || ''} placeholder={f.ph || 'Kosong = ikut kop umum'} onChange={e => setDataPaud(f.key, e.target.value)} />
                </div>
              ))}
            </div>
          </>
        )}
        <div className="kop-cek">
          {KOP_PILIHAN.map(o => (
            <label key={o.key}>
              <input type="checkbox" checked={!!kop.tampil?.[o.key]} onChange={e => setKop(k => ({ ...k, tampil: { ...k.tampil, [o.key]: e.target.checked } }))} />
              {o.label}
            </label>
          ))}
        </div>
        <div className="kop-ukuran-logo">
          {[['logoKiriMm', 'Ukuran logo kiri'], ['logoKananMm', 'Ukuran logo kanan']].map(([key, label]) => {
            const mm = ukuranLogo(kop[key]);
            return (
              <div key={key} className="field">
                <label>{label}: <b>{String(mm / 10).replace('.', ',')} cm</b></label>
                <div className="kop-slider">
                  <button type="button" className="btn btn-sm" onClick={() => setKop(k => ({ ...k, [key]: ukuranLogo(mm - 1) }))} aria-label="Perkecil">−</button>
                  <input type="range" min={LOGO_MIN_MM} max={LOGO_MAKS_MM} step="1" value={mm} onChange={e => setKop(k => ({ ...k, [key]: Number(e.target.value) }))} />
                  <button type="button" className="btn btn-sm" onClick={() => setKop(k => ({ ...k, [key]: ukuranLogo(mm + 1) }))} aria-label="Perbesar">+</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Garis bawah kop</label>
            <select value={kop.garis} onChange={e => setKop(k => ({ ...k, garis: e.target.value }))}>
              {GARIS_OPSI.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Gaya susunan</label>
            <select value={kop.gaya || '1'} onChange={e => setKop(k => ({ ...k, gaya: e.target.value }))}>
              {GAYA_KOP.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Sebutan nomor telepon</label>
            <select value={kop.sebutanTelepon} onChange={e => setKop(k => ({ ...k, sebutanTelepon: e.target.value }))}>
              {SEBUTAN_TELEPON.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>
        {paud
          ? <div className="atur-hal" style={{ fontSize: 13 }}><b>Kertas & margin</b> — untuk STSB diatur di <Link to="/stsb-paud?tab=pengaturan">STSB PAUD › Pengaturan STSB</Link>.</div>
          : <AturHalaman judul="Kertas & margin dokumen ber-kop (naskah soal, kunci jawaban)" value={kopUmum.halaman} onChange={v => setKopUmum(k => ({ ...k, halaman: v }))} />}
        <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', display: 'block', marginTop: 6 }}>Pratinjau (ikut berubah saat Anda mengetik)</label>
        <div className="kop-pratinjau">{paud
          ? <KopSurat jenjang="PAUD" profil={profilPratinjau} tambahan={tambahan} kopPaud={kopPaud} />
          : <KopSurat profil={profilPratinjau} tambahan={tambahan} kop={kopUmum} />}</div>
      </div>
      <div className="card-body" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn" onClick={() => setKop(k => (paud ? { ...KOP_PAUD_BAWAAN, data: k.data } : KOP_BAWAAN))}>Kembalikan bawaan</button>
        <button type="button" className="btn btn-primary" onClick={submitKop} disabled={simpanKop}>{simpanKop ? 'Menyimpan...' : `Simpan Kop ${paud ? 'PAUD' : 'Umum/SD'}`}</button>
      </div>
    </div>
    </>
  );
}
