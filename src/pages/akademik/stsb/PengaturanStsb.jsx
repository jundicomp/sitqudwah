import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../../context/AppContext';
import { STSB_BAWAAN, lengkapiStsb, nomorSurat, susunStsb } from '../../../db/stsbFields';
import { kepalaPada } from '../../../db/penandatanganFields';
import { useAuth } from '../../../context/AuthContext';
import { SatuStsb } from './DokumenStsb';

const CONTOH_ANAK = { nama: 'Nama Anak', idSiswa: '20202025001', nisn: '3209618850', tempatLahir: 'Banyuasin', tanggalLahir: '2020-02-12', namaIbu: 'Nama Ibu', alamat: 'Sungai Rengit', agama: 'Islam', foto: '' };

export default function PengaturanStsb() {
  const { pengaturanStsb, penandatangan, simpanKunciSistem, toast, tahunAjaranAktif } = useAppData();
  const { currentUser } = useAuth();
  const [f, setF] = useState(pengaturanStsb);
  const [aspekTeks, setAspekTeks] = useState(pengaturanStsb.aspek.join('\n'));
  const [menyimpan, setMenyimpan] = useState(false);
  const json = JSON.stringify(pengaturanStsb);
  useEffect(() => { const x = JSON.parse(json); setF(x); setAspekTeks(x.aspek.join('\n')); }, [json]);

  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const setSisi = (sisi, k, v) => setF(x => ({ ...x, [sisi]: { ...x[sisi], [k]: v } }));
  const setSkala = (i, k, v) => setF(x => ({ ...x, skala: x.skala.map((y, j) => (j === i ? { ...y, [k]: v } : y)) }));
  const hasil = lengkapiStsb({ ...f, aspek: aspekTeks.split('\n') });
  const tgl = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const ta = tahunAjaranAktif?.label || '2025/2026';
  const kepala = kepalaPada(penandatangan.PAUD, tgl);
  const contoh = susunStsb({ st: hasil, siswa: CONTOH_ANAK, isi: { urut: 1, nilai: Object.fromEntries(hasil.aspek.map(a => [a, hasil.skala[0]?.kode || 'A'])) }, ta, tanggal: tgl, kepala });

  async function simpan() {
    setMenyimpan(true);
    try {
      await simpanKunciSistem('stsb', { ...hasil, oleh: currentUser?.nama || currentUser?.username || '', pada: new Date().toISOString() });
      toast('Pengaturan STSB disimpan.');
    } catch (e) { toast(e.message, 'error'); }
    finally { setMenyimpan(false); }
  }

  const teks = (label, k, ph) => <div className="field"><label>{label}</label><input type="text" value={f[k] ?? ''} placeholder={ph} onChange={e => set(k, e.target.value)} /></div>;
  const cek = (label, k) => <label className="stsb-cek"><input type="checkbox" checked={!!f[k]} onChange={e => set(k, e.target.checked)} /> {label}</label>;
  const sisi = (judul, k, catatanNama, catatanNomor) => (
    <div className="stsb-sisi">
      <h4>{judul}</h4>
      {k === 'kiri' && <label className="stsb-cek"><input type="checkbox" checked={!!f.kiri.aktif} onChange={e => setSisi('kiri', 'aktif', e.target.checked)} /> Tampilkan tanda tangan ini</label>}
      {k === 'kiri' && <div className="field"><label>Kata pembuka</label><input type="text" value={f.kiri.pembuka} onChange={e => setSisi('kiri', 'pembuka', e.target.value)} /></div>}
      <div className="field"><label>Jabatan (boleh beberapa baris)</label><textarea rows={3} value={f[k].jabatan} onChange={e => setSisi(k, 'jabatan', e.target.value)} /></div>
      <div className="field"><label>Nama</label><input type="text" value={f[k].nama} placeholder={catatanNama} onChange={e => setSisi(k, 'nama', e.target.value)} /></div>
      <div className="form-grid">
        <div className="field"><label>Sebutan nomor</label><input type="text" value={f[k].labelNomor} placeholder="mis. NUPTK / NIY / NIP" onChange={e => setSisi(k, 'labelNomor', e.target.value)} /></div>
        <div className="field"><label>Nomor</label><input type="text" value={f[k].nomor} placeholder={catatanNomor} onChange={e => setSisi(k, 'nomor', e.target.value)} /></div>
      </div>
    </div>
  );

  return (
    <div className="stsb-atur">
      <div className="card">
        <div className="card-head"><div><h3>Pengaturan STSB</h3><p>Berlaku untuk semua STSB PAUD. Kop surat memakai <b>Kop PAUD</b> — atur di <Link to="/profil">Pengaturan › Sekolah › Profil Sekolah</Link>, kartu Kop Surat, tab PAUD.</p></div></div>
        <div className="card-body">
          <div className="form-grid">
            {teks('Judul surat', 'judul')}
            {teks('Sebutan tahun', 'labelTahun', 'TAHUN PELAJARAN')}
            <div className="field"><label>Format nomor surat</label><input type="text" value={f.formatNomor} onChange={e => set('formatNomor', e.target.value)} />
              <small style={{ color: 'var(--muted)', fontSize: 11.5 }}>{'{no}'} nomor urut · {'{bulan}'} bulan romawi · {'{tahun}'} tahun surat · {'{ta}'} tahun ajaran. Contoh: <b>{nomorSurat(hasil.formatNomor, 1, hasil.digitNomor, tgl, ta)}</b></small></div>
            <div className="field"><label>Jumlah digit nomor urut</label><input type="number" min="1" max="6" value={f.digitNomor} onChange={e => set('digitNomor', e.target.value)} /></div>
            {teks('Kelompok usia bawaan', 'kelompokUsia', '5 – 6 TAHUN')}
            {teks('Tempat tanda tangan', 'tempat', penandatangan.PAUD.tempat || 'Sungai Rengit')}
          </div>
          <div className="field"><label>Kalimat keikutsertaan <small style={{ fontWeight: 400, color: 'var(--muted)' }}>— apit dengan **dua bintang** untuk huruf tebal</small></label>
            <textarea rows={2} value={f.kalimat} onChange={e => set('kalimat', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '6px 0 14px' }}>
            {cek('Data anak huruf besar', 'hurufBesar')}
            {cek('Kotak pas foto di antara tanda tangan', 'pasFoto')}
            {cek('Pakai foto siswa bila ada', 'fotoSiswa')}
            {cek('Cetak halaman 2 (Laporan Perkembangan Anak)', 'halaman2')}
          </div>
          <div className="stsb-dua">
            {sisi('Tanda tangan kiri', 'kiri', 'mis. Muhammad Syahrussiyam, S.Pd.', 'kosongkan bila tidak perlu')}
            {sisi('Tanda tangan kanan (kepala sekolah)', 'kanan', kepala?.nama ? `Kosongkan = ${kepala.nama} (dari Penandatangan PAUD)` : 'Kosongkan = kepala dari Penandatangan PAUD', kepala?.niy ? `Kosongkan = ${kepala.niy}` : 'Kosongkan = NIY dari Penandatangan PAUD')}
          </div>
          <div className="stsb-dua">
            <div className="stsb-sisi">
              <h4>Halaman 2: aspek perkembangan</h4>
              {teks('Judul halaman 2', 'judul2')}
              <div className="field"><label>Daftar aspek (1 baris = 1 aspek)</label><textarea rows={7} value={aspekTeks} onChange={e => setAspekTeks(e.target.value)} /></div>
            </div>
            <div className="stsb-sisi">
              <h4>Keterangan nilai</h4>
              {f.skala.map((k, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input type="text" value={k.kode} onChange={e => setSkala(i, 'kode', e.target.value)} style={{ width: 60 }} />
                  <input type="text" value={k.nama} onChange={e => setSkala(i, 'nama', e.target.value)} style={{ flex: 1 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card-body" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn" onClick={() => { setF(STSB_BAWAAN); setAspekTeks(STSB_BAWAAN.aspek.join('\n')); }}>Kembalikan bawaan</button>
          <button type="button" className="btn btn-primary" disabled={menyimpan} onClick={simpan}>{menyimpan ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div><h3>Pratinjau</h3><p>Contoh dengan data anak rekaan, ikut berubah saat Anda mengetik.</p></div></div>
        <div className="card-body stsb-pratinjau"><div className="rp-dok"><SatuStsb d={contoh} /></div></div>
      </div>
    </div>
  );
}
