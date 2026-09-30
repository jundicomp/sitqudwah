import { useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useTabAccess from '../../hooks/useTabAccess';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import Modal from '../../components/common/Modal';
import { TabBar, AkademikBelumTersambung, Field, Select } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { labelRombel, labelSiswa } from '../../db/akademikFields';
import { JENIS_MUTASI, STATUS_SISWA_SETELAH } from '../../db/komunikasiFields';
import { sekarangWIB } from '../../db/presensiBarcodeFields';
import { formatTanggal } from '../../db/helpers';
import { mutasiApi, fetchSiswaFromSheet, updateSiswaInSheet, addLogEntry, isConfigured } from '../../services/googleSheets';
import { printElementById } from '../../utils/exportTable';
import { APP_NAME } from '../../config/appInfo';

const TABS = [
  { id: 'daftar', label: 'DAFTAR MUTASI' },
  { id: 'catat', label: 'CATAT MUTASI' },
];
const EDIT_FIELDS = [
  { key: 'Sekolah Asal / Tujuan', label: 'Sekolah Asal / Tujuan', type: 'text' },
  { key: 'Alasan', label: 'Alasan', type: 'text' },
  { key: 'Nomor Surat', label: 'Nomor Surat', type: 'text' },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];

function SuratPindah({ m, onClose }) {
  const { profilSekolah } = useAppData();
  return (
    <Modal wide title="Surat keterangan pindah" subtitle={m['Nama Siswa']} onClose={onClose}
      actions={<><button className="btn" onClick={onClose}>Tutup</button><button className="btn btn-primary" onClick={() => printElementById('surat-pindah')}>🖨️ Cetak / PDF</button></>}>
      <div id="surat-pindah" className="doc-print">
        <h2>{(profilSekolah?.nama || APP_NAME).toUpperCase()}</h2>
        <p className="doc-sub">{profilSekolah?.alamat || ''}{profilSekolah?.npsn ? ` · NPSN ${profilSekolah.npsn}` : ''}</p>
        <div style={{ borderTop: '3px double #111', margin: '6px 0 16px' }} />
        <h3 style={{ textAlign: 'center', textDecoration: 'underline', margin: 0 }}>SURAT KETERANGAN PINDAH</h3>
        <p style={{ textAlign: 'center', marginTop: 2 }}>Nomor: {m['Nomor Surat'] || '....................'}</p>
        <p>Yang bertanda tangan di bawah ini, Kepala {profilSekolah?.nama || 'Madrasah'}, menerangkan bahwa:</p>
        <table><tbody>
          <tr><td style={{ width: '35%' }}>Nama</td><td>{m['Nama Siswa']}</td></tr>
          <tr><td>NISN</td><td>{m.NISN}</td></tr>
          <tr><td>Kelas</td><td>{labelRombel(m.Tingkat, m.Rombel)}</td></tr>
          <tr><td>Sekolah tujuan</td><td>{m['Sekolah Asal / Tujuan'] || '-'}</td></tr>
          <tr><td>Alasan pindah</td><td>{m.Alasan || '-'}</td></tr>
        </tbody></table>
        <p>terhitung sejak tanggal {formatTanggal(String(m.Tanggal).slice(0, 10) + 'T00:00:00')} telah pindah dari madrasah kami. Surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
        <div className="ttd" style={{ justifyContent: 'flex-end' }}>
          <div>{formatTanggal(sekarangWIB().tanggal + 'T00:00:00')}<br />Kepala Madrasah<div className="garis">{profilSekolah?.kepalaSekolah || '\u00a0'}</div></div>
        </div>
      </div>
    </Modal>
  );
}

function CatatMutasi() {
  const { siswa, refreshSiswa, refreshMutasi, toast } = useAppData();
  const { currentUser } = useAuth();
  const [jenis, setJenis] = useState('Mutasi Keluar');
  const [pilih, setPilih] = useState('');
  const [f, setF] = useState({ tanggal: sekarangWIB().tanggal, sekolah: '', alasan: '', nomor: '', ket: '' });
  const [menyimpan, setMenyimpan] = useState(false);
  const keluar = jenis !== 'Mutasi Masuk';
  // Keluar: dari siswa Aktif. Masuk: siswa yg sudah diinput di Data Siswa (biasanya baru ditambahkan).
  const kandidat = useMemo(() => siswa.filter(x => (keluar ? x.status === 'Aktif' : true) && x.nama).sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [siswa, keluar]);
  const sw = kandidat.find(x => labelSiswa(x) === pilih);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  async function simpan() {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (!sw) { toast('Pilih siswa dari daftar.', 'error'); return; }
    if (!f.tanggal) { toast('Isi tanggal mutasi.', 'error'); return; }
    if ((jenis === 'Mutasi Keluar' || jenis === 'Mutasi Masuk') && !f.sekolah.trim()) { toast(`Isi sekolah ${keluar ? 'tujuan' : 'asal'}.`, 'error'); return; }
    setMenyimpan(true);
    try {
      await mutasiApi.add({ Tanggal: f.tanggal, 'Jenis Mutasi': jenis, NISN: sw.nisn, 'Nama Siswa': sw.nama, Tingkat: sw.kelasTingkat, Rombel: sw.rombel, 'Sekolah Asal / Tujuan': f.sekolah, Alasan: f.alasan, 'Nomor Surat': f.nomor, Keterangan: f.ket, 'Dicatat Oleh': currentUser.nama });
      const statusBaru = STATUS_SISWA_SETELAH[jenis];
      if (statusBaru) {
        // Ambil baris siswa paling baru langsung dari Sheets, ubah Status saja.
        const semua = await fetchSiswaFromSheet();
        const baris = (sw.nisn && semua.find(r => String(r['NISN'] ?? '').trim() === sw.nisn))
          || semua.find(r => String(r['Nama Lengkap'] ?? '').trim() === sw.nama);
        if (baris) await updateSiswaInSheet({ ...baris, Status: statusBaru });
        else toast('Mutasi tercatat, tapi baris siswa tidak ditemukan untuk diubah statusnya. Ubah manual di Data Siswa.', 'error');
      }
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: jenis, modul: 'Mutasi Siswa', detail: `${sw.nama} (${sw.nisn || '-'})${statusBaru ? ` → status ${statusBaru}` : ''}${f.sekolah ? `, ${f.sekolah}` : ''}` });
      await Promise.all([refreshMutasi(), statusBaru ? refreshSiswa?.() : null]);
      toast(`${jenis} ${sw.nama} tercatat${statusBaru ? `, status siswa diubah menjadi ${statusBaru}` : ''}.`);
      setPilih(''); setF({ tanggal: sekarangWIB().tanggal, sekolah: '', alasan: '', nomor: '', ket: '' });
    } catch (e) { toast(e.message, 'error'); } finally { setMenyimpan(false); }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Catat mutasi</h3><p>Mutasi keluar, mengundurkan diri, dikeluarkan, atau meninggal otomatis mengubah status siswa di Data Siswa. Untuk mutasi masuk, tambahkan dulu siswanya di Data Siswa, lalu catat di sini.</p></div></div>
      <div className="card-body">
        <div className="form-grid">
          <Field label="Jenis mutasi"><Select value={jenis} onChange={v => { setJenis(v); setPilih(''); }} options={JENIS_MUTASI} /></Field>
          <Field label="Tanggal"><input type="date" value={f.tanggal} onChange={e => set('tanggal', e.target.value)} /></Field>
          <div className="field span2"><label>Siswa</label>
            <Select value={pilih} onChange={setPilih} placeholder="— pilih siswa —" options={kandidat.map(labelSiswa)} />
            {sw && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{labelRombel(sw.kelasTingkat, sw.rombel)} · status sekarang {sw.status}</div>}
          </div>
          <Field label={keluar ? 'Sekolah tujuan' : 'Sekolah asal'}><input value={f.sekolah} onChange={e => set('sekolah', e.target.value)} /></Field>
          <Field label="Nomor surat"><input value={f.nomor} onChange={e => set('nomor', e.target.value)} placeholder="opsional" /></Field>
          <div className="field span2"><label>Alasan</label><input value={f.alasan} onChange={e => set('alasan', e.target.value)} placeholder="mis. ikut orang tua pindah tugas" /></div>
          <div className="field span2"><label>Keterangan</label><input value={f.ket} onChange={e => set('ket', e.target.value)} /></div>
        </div>
        <div className="save-bar"><span /><button className="btn btn-primary" onClick={simpan} disabled={menyimpan}>{menyimpan ? 'Menyimpan…' : 'Simpan mutasi'}</button></div>
      </div>
    </div>
  );
}

export default function MutasiSiswa() {
  const { mutasi, refreshMutasi } = useAppData();
  const { tab, setTab, bolehTab } = useTabAccess('mutasi', TABS.map(t => t.id));
  const [surat, setSurat] = useState(null);
  const tahunIni = sekarangWIB().tanggal.slice(0, 4);
  const ringkas = JENIS_MUTASI.map(j => `${j}: ${mutasi.filter(m => m.jenis === j && m.tanggal.startsWith(tahunIni)).length}`).join(' · ');
  return (
    <Page pageId="mutasi" title="Mutasi Siswa" path="Kesiswaan / Mutasi Siswa">
      <AkademikBelumTersambung />
      <div className="card">
        <TabBar tabs={TABS} tab={tab} setTab={setTab} bolehTab={bolehTab} />
        <div className="card-body" style={{ background: 'transparent', padding: 20 }}>
          {tab === 'daftar' && bolehTab('daftar') && (
            <GenericStoredTable title="Riwayat mutasi" subtitle={`Tahun ${tahunIni} — ${ringkas}`}
              headers={['No', 'Tanggal', 'Jenis Mutasi', 'Nama Siswa', 'NISN', 'Tingkat', 'Rombel', 'Sekolah Asal / Tujuan', 'Alasan', 'Nomor Surat']} fields={EDIT_FIELDS}
              fetchFn={mutasiApi.fetch} updateFn={mutasiApi.update} deleteFn={mutasiApi.remove}
              moduleLabel="Mutasi Siswa" labelKey="Nama Siswa" target="akademik" onChanged={refreshMutasi}
              columnRenderers={{ 'Jenis Mutasi': r => <span className={`badge ${r['Jenis Mutasi'] === 'Mutasi Masuk' ? 'badge-green' : 'badge-gold'}`}>{r['Jenis Mutasi']}</span> }}
              extraActions={r => r['Jenis Mutasi'] === 'Mutasi Keluar' && <button className="btn btn-sm" onClick={() => setSurat(r)}>Surat pindah</button>}
              searchFn={(r, t) => `${r['Nama Siswa']} ${r.NISN} ${r['Jenis Mutasi']} ${r['Sekolah Asal / Tujuan']}`.toLowerCase().includes(t)} />
          )}
          {tab === 'catat' && bolehTab('catat') && <CatatMutasi />}
        </div>
      </div>
      {surat && <SuratPindah m={surat} onClose={() => setSurat(null)} />}
    </Page>
  );
}
