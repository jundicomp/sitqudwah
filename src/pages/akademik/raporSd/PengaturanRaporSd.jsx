import { useEffect, useState } from 'react';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { lengkapiPengaturanSd, kalimatAwalDeskripsi } from '../../../db/raporSdFields';
import { JENIS_NILAI_OPTIONS } from '../../../db/akademikFields';
import { simpanPengaturanRaporSdKeSheet, addLogEntry, isConfigured } from '../../../services/googleSheets';

const salin = (x) => JSON.parse(JSON.stringify(x));
const IDENTITAS = [
  ['judulJenjang', 'Judul jenjang (sampul)'], ['namaSekolah', 'Nama sekolah'], ['namaSingkat', 'Nama singkat (kop rapor)'],
  ['npsn', 'NPSN'], ['alamat', 'Alamat sekolah'], ['kodePos', 'Kode pos'], ['desa', 'Kelurahan/desa'], ['kecamatan', 'Kecamatan'],
  ['kabupaten', 'Kabupaten/kota'], ['provinsi', 'Provinsi'], ['website', 'Website'], ['email', 'E-mail'],
];
const LEVEL = [['A', 'Predikat A (sangat baik)'], ['B', 'Predikat B (baik)'], ['C', 'Predikat C (cukup)'], ['D', 'Predikat D (kurang)'], ['E', 'Predikat E']];

function Kartu({ judul, sub, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-head"><div><h3>{judul}</h3>{sub && <p>{sub}</p>}</div></div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function PengaturanRaporSd() {
  const { pengaturanSd, pengaturanSdTersimpan, refreshPengaturanSd, toast } = useAppData();
  const { currentUser } = useAuth();
  const [d, setD] = useState(() => salin(pengaturanSd));
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const jejak = JSON.stringify(pengaturanSd);
  useEffect(() => { if (!berubah) setD(salin(pengaturanSd)); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch) => { setD(x => ({ ...x, ...patch })); setBerubah(true); };
  const jenisBobot = [...new Set([...JENIS_NILAI_OPTIONS, ...Object.keys(d.bobot)])];

  async function simpan() {
    if (!d.namaSekolah.trim()) { toast('Nama sekolah tidak boleh kosong.', 'error'); return; }
    if (!d.template.includes('{frase}')) { toast('Template kalimat awal harus memuat {frase}.', 'error'); return; }
    if (!Object.values(d.bobot).some(w => Number(w) > 0)) { toast('Minimal satu jenis penilaian harus punya bobot lebih dari 0.', 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    const bersih = lengkapiPengaturanSd({ ...d, bobot: Object.fromEntries(Object.entries(d.bobot).map(([k, v]) => [k, Number(v) || 0])) });
    setMenyimpan(true);
    try {
      await simpanPengaturanRaporSdKeSheet([{ No: 1, Kunci: 'pengaturan', Nilai: JSON.stringify(bersih) }]);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Pengaturan Rapor SD', modul: 'Rapor Digital', detail: bersih.namaSekolah });
      setBerubah(false);
      await refreshPengaturanSd();
      toast('Pengaturan rapor SD tersimpan.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui. Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  return (
    <div>
      {!pengaturanSdTersimpan && <div className="banner-info"><span>Belum ada pengaturan tersimpan — saat ini memakai bawaan sesuai contoh rapor SD Islam Terpadu Qudwah. Periksa nama kepala sekolah, lalu klik Simpan.</span></div>}
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Rapor yang <b>sudah terbit</b> tidak ikut berubah — isinya tersimpan sebagai arsip. Daftar mata pelajaran &amp; kelompoknya (mis. Keagamaan: Tahfidz, Tahsin) diatur di Kurikulum &amp; KKM › Mata Pelajaran.</p>

      <Kartu judul="Identitas sekolah" sub="Dicetak di halaman sampul dan kop rapor.">
        <div className="form-grid">
          {IDENTITAS.map(([k, l]) => <div key={k} className="field"><label>{l}</label><input value={d[k] || ''} onChange={e => set({ [k]: e.target.value })} /></div>)}
        </div>
      </Kartu>

      <Kartu judul="Tanda tangan & alur" sub="Kepala SD bisa berbeda dengan kepala KB/TK, jadi diisi terpisah di sini.">
        <div className="form-grid">
          <div className="field"><label>Nama kepala sekolah</label><input value={d.namaKepala} onChange={e => set({ namaKepala: e.target.value })} /></div>
          <div className="field"><label>NIY kepala sekolah</label><input value={d.niyKepala} onChange={e => set({ niyKepala: e.target.value })} /></div>
          <div className="field"><label>Sebutan wali kelas</label><input value={d.sebutanWali} placeholder="Guru Kelas" onChange={e => set({ sebutanWali: e.target.value })} /></div>
          <div className="field"><label>Tempat tanda tangan</label><input value={d.tempat} onChange={e => set({ tempat: e.target.value })} /></div>
          <div className="field"><label>Persetujuan kepala sekolah</label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 500 }}>
              <input type="checkbox" checked={d.butuhPersetujuan} onChange={e => set({ butuhPersetujuan: e.target.checked })} />
              Wali kelas mengajukan, kepala sekolah yang menerbitkan
            </label></div>
        </div>
        <p className="paud-kosong">NIY wali kelas diambil dari Data Guru (kolom NIY) sesuai wali kelas di Data Kelas.</p>
      </Kartu>

      <Kartu judul="Nilai rapor" sub="Nilai per mapel dihitung otomatis dari Nilai Akademik: rata-rata tiap jenis penilaian, lalu digabung dengan bobot ini. Wali kelas tetap bisa mengganti nilai per siswa.">
        <div className="form-grid">
          <div className="field"><label>KKM satuan pendidikan</label><input type="number" min="0" max="100" value={d.kkmSatuan} onChange={e => set({ kkmSatuan: e.target.value })} /></div>
          {jenisBobot.map(j => (
            <div key={j} className="field"><label>Bobot {j}</label>
              <input type="number" min="0" step="0.5" value={d.bobot[j] ?? 0} onChange={e => set({ bobot: { ...d.bobot, [j]: e.target.value } })} /></div>
          ))}
        </div>
        <p className="paud-kosong">Contoh: Harian 2, UTS 1, UAS 1 artinya rata-rata harian dihitung dua kali lipat. Bobot 0 = tidak dihitung.</p>
      </Kartu>

      <Kartu judul="Kalimat awal deskripsi" sub="Dipakai tombol &quot;Isi kalimat awal&quot; di editor. Wali kelas melanjutkan dengan materi yang dikuasai anak.">
        <div className="field" style={{ marginBottom: 10 }}><label>Template (pakai {'{panggilan}'} dan {'{frase}'})</label>
          <input value={d.template} onChange={e => set({ template: e.target.value })} /></div>
        <div className="form-grid">
          {LEVEL.map(([k, l]) => <div key={k} className="field"><label>{l}</label><input value={d.frase[k] || ''} onChange={e => set({ frase: { ...d.frase, [k]: e.target.value } })} /></div>)}
        </div>
        <p className="paud-kosong">Contoh hasil (nilai 92): <i>{kalimatAwalDeskripsi(lengkapiPengaturanSd(d), 'Syahrul', 92)}materi …</i></p>
      </Kartu>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {berubah && <button className="btn" onClick={() => { setD(salin(pengaturanSd)); setBerubah(false); }}>Batalkan perubahan</button>}
        <button className="btn btn-primary" disabled={menyimpan || !berubah} onClick={simpan}>{menyimpan ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
      </div>
    </div>
  );
}
