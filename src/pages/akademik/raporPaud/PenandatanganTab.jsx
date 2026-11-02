import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { addLogEntry, isConfigured } from '../../../services/googleSheets';
import {
  PILIHAN_ORTU, kunciTtd, jabatanBawaan, buatIdKepala, statusKepala, simpanKepalaKeDaftar, cekKepala, kemarinDari,
} from '../../../db/penandatanganFields';

// v1.60.0: Rapor Digital PAUD / SD › Penandatangan. Dua pengaturan terpisah (per jenis).
const tglId = (iso) => { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
const BADGE = { Aktif: 'badge-green', Selesai: 'badge-muted', 'Akan datang': 'badge-blue' };

export default function PenandatanganTab({ jenis }) {
  const { penandatangan, simpanKunciSistem, toast, pengaturanPaud, pengaturanSd, profilSekolah } = useAppData();
  const { currentUser } = useAuth();
  const ttd = penandatangan[jenis];
  const pr = jenis === 'PAUD' ? pengaturanPaud : pengaturanSd;
  const jabatanAwal = (jenis === 'PAUD' ? pr?.jabatanKepala : '') || jabatanBawaan(jenis);
  const [edit, setEdit] = useState(null); // { k, baru }
  const [lain, setLain] = useState({ ortu: ttd.ortu, tempat: ttd.tempat || pr?.tempat || '', niyKepala: ttd.niyKepala, niyWali: ttd.niyWali });
  const [menyimpan, setMenyimpan] = useState(false);
  const label = jenis === 'PAUD' ? 'Kepala Satuan PAUD' : 'Kepala Sekolah SD';

  async function simpan(patch, aksi, detail) {
    if (!isConfigured('master')) { toast('Data Induk belum tersambung.', 'error'); return false; }
    setMenyimpan(true);
    try {
      const { kepala, ortu, tempat, niyKepala, niyWali } = { ...ttd, ...lain, ...patch };
      await simpanKunciSistem(kunciTtd(jenis), { kepala, ortu, tempat, niyKepala, niyWali, oleh: currentUser?.nama || '', pada: new Date().toISOString() });
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi, modul: `Rapor Digital ${jenis}`, detail });
      toast('Penandatangan disimpan.');
      return true;
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Data Induk belum mengenal tab "sistem". Tempel ulang Code.gs terbaru lalu Deploy → New version.' : e.message, 'error');
      return false;
    } finally { setMenyimpan(false); }
  }

  async function simpanKepala(k, baru) {
    const kepala = simpanKepalaKeDaftar(ttd.kepala, k, baru);
    if (await simpan({ kepala }, baru ? 'Tambah Kepala' : 'Ubah Kepala', `${k.nama}${k.niy ? ` (NIY ${k.niy})` : ''}, mulai ${k.mulai}`)) setEdit(null);
  }
  async function hapusKepala(k) {
    if (await simpan({ kepala: ttd.kepala.filter(x => x.id !== k.id) }, 'Hapus Kepala', k.nama)) setEdit(null);
  }

  const lama = (jenis === 'PAUD' ? pr?.namaKepala || profilSekolah?.kepalaSekolah : pr?.namaKepala) || '';

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div><h3>{label} — riwayat jabatan</h3>
            <p>Kalau kepala berganti, cukup tambah kepala baru. Rapor memakai kepala yang menjabat pada <b>tanggal rapor</b>, jadi rapor lama tidak ikut berubah.</p></div>
          <button className="btn btn-sm btn-primary" onClick={() => setEdit({ baru: true, k: { id: buatIdKepala(), nama: '', niy: '', jabatan: jabatanAwal, mulai: '', selesai: '' } })}>＋ Kepala baru</button>
        </div>
        <div className="card-body">
          {!ttd.kepala.length && (
            <div className="banner-info" style={{ marginBottom: 12 }}><span>Belum ada kepala yang diisi. {lama ? <>Rapor sementara memakai nama <b>{lama}</b> dari Pengaturan Rapor.</> : 'Tanda tangan kepala di rapor masih berupa titik-titik.'}</span></div>
          )}
          {ttd.kepala.length > 0 && (
            <div className="table-scroll"><table>
              <thead><tr><th>Nama (dengan gelar)</th><th>NIY</th><th>Jabatan di tanda tangan</th><th>Menjabat</th><th>Status</th><th /></tr></thead>
              <tbody>{ttd.kepala.map(k => {
                const st = statusKepala(k);
                return (
                  <tr key={k.id}>
                    <td><b>{k.nama}</b></td><td>{k.niy || '—'}</td><td>{k.jabatan || jabatanAwal}</td>
                    <td>{tglId(k.mulai)} – {k.selesai ? tglId(k.selesai) : 'sekarang'}</td>
                    <td><span className={`badge ${BADGE[st]}`}>{st}</span></td>
                    <td><button className="btn btn-sm" onClick={() => setEdit({ baru: false, k })} aria-label={`Edit ${k.nama}`}>✏️ Edit</button></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Tanda tangan lain</h3><p>Berlaku untuk Rapor {jenis}.</p></div></div>
        <div className="card-body">
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div className="field"><label htmlFor={`ortu-${jenis}`}>Nama Orang Tua / Wali Murid</label>
              <select id={`ortu-${jenis}`} value={lain.ortu} onChange={e => setLain(x => ({ ...x, ortu: e.target.value }))}>
                {PILIHAN_ORTU.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></div>
            <div className="field"><label htmlFor={`tempat-${jenis}`}>Tempat tanda tangan</label>
              <input id={`tempat-${jenis}`} value={lain.tempat} placeholder="mis. Banyuasin" onChange={e => setLain(x => ({ ...x, tempat: e.target.value }))} /></div>
          </div>
          <div className="field" style={{ marginTop: 12 }}><label>Tampilkan NIY di bawah nama</label></div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={lain.niyKepala} onChange={e => setLain(x => ({ ...x, niyKepala: e.target.checked }))} /> Kepala sekolah</label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={lain.niyWali} onChange={e => setLain(x => ({ ...x, niyWali: e.target.checked }))} /> Wali kelas <span style={{ color: 'var(--muted)' }}>(dari kolom NIY di Data Guru)</span></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-primary" disabled={menyimpan} onClick={() => simpan({}, 'Ubah Tanda Tangan Rapor', `Ortu: ${lain.ortu}, tempat: ${lain.tempat}`)}>{menyimpan ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
          </div>
          <div className="banner-info" style={{ marginTop: 14 }}><span>Rapor yang sudah <b>Terbit</b> menyimpan nama penandatangan saat itu. Kalau perlu diperbaiki, buka tab Arsip Rapor lalu klik <b>✍️ Perbarui penandatangan</b>. Nilai dan isi rapor tidak berubah.</span></div>
        </div>
      </div>

      {edit && <FormKepala jenis={jenis} label={label} awal={edit.k} baru={edit.baru} daftar={ttd.kepala} tempat={lain.tempat} menyimpan={menyimpan}
        onClose={() => setEdit(null)} onSimpan={simpanKepala} onHapus={hapusKepala} />}
    </>
  );
}

function FormKepala({ label, awal, baru, daftar, tempat, menyimpan, onClose, onSimpan, onHapus }) {
  const [k, setK] = useState(awal);
  const [yakinHapus, setYakinHapus] = useState(false);
  const set = (patch) => setK(x => ({ ...x, ...patch }));
  const salah = cekKepala({ ...k, nama: k.nama.trim() }, daftar, baru);
  const sebelumnya = baru && k.mulai ? daftar.find(x => !x.selesai && x.mulai && x.mulai < k.mulai) : null;
  const hariIni = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  return (
    <Modal title={`${baru ? 'Tambah' : 'Edit'} ${label}`} subtitle="Data ini muncul di tanda tangan rapor." onClose={onClose}
      actions={<>
        {!baru && (yakinHapus
          ? <button className="btn" style={{ marginRight: 'auto', background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }} disabled={menyimpan} onClick={() => onHapus(k)}>Yakin hapus?</button>
          : <button className="btn" style={{ marginRight: 'auto', color: 'var(--red)' }} onClick={() => setYakinHapus(true)}>🗑 Hapus</button>)}
        <button className="btn" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" disabled={!!salah || menyimpan} onClick={() => onSimpan({ ...k, nama: k.nama.trim(), niy: k.niy.trim(), jabatan: k.jabatan.trim() }, baru)}>{menyimpan ? 'Menyimpan…' : 'Simpan'}</button>
      </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="field"><label htmlFor="kp-nama">Nama lengkap dengan gelar (wajib)</label><input id="kp-nama" value={k.nama} onChange={e => set({ nama: e.target.value })} placeholder="mis. Umi Laila Sari, S.Sos.I." /></div>
        <div className="field"><label htmlFor="kp-niy">NIY</label><input id="kp-niy" value={k.niy} onChange={e => set({ niy: e.target.value })} />
          <small style={{ color: 'var(--muted)' }}>Kosongkan bila belum ada; baris NIY tidak dicetak.</small></div>
        <div className="field"><label htmlFor="kp-jab">Jabatan di tanda tangan</label><input id="kp-jab" value={k.jabatan} onChange={e => set({ jabatan: e.target.value })} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field"><label htmlFor="kp-mulai">Mulai menjabat (wajib)</label><input id="kp-mulai" type="date" value={k.mulai} onChange={e => set({ mulai: e.target.value })} /></div>
          <div className="field"><label htmlFor="kp-selesai">Selesai menjabat</label><input id="kp-selesai" type="date" value={k.selesai} onChange={e => set({ selesai: e.target.value })} />
            <small style={{ color: 'var(--muted)' }}>Kosong = masih menjabat</small></div>
        </div>
        <div className="field"><label>Pratinjau di rapor</label>
          <div style={{ background: 'var(--bg, #f6f8f7)', border: '1px dashed var(--border)', borderRadius: 10, padding: 12, textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 13 }}>
            {tempat || '…'}, {new Date(hariIni + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />{k.jabatan || '…'}<br /><br />
            <b><u>{k.nama || '................................'}</u></b>{k.niy ? <><br />NIY {k.niy}</> : null}
          </div></div>
        {sebelumnya && <div className="banner-info"><span>💡 Masa jabatan <b>{sebelumnya.nama}</b> akan otomatis diakhiri pada {tglId(kemarinDari(k.mulai))}.</span></div>}
        {salah && (k.nama || k.mulai) && <div className="badge badge-red" style={{ whiteSpace: 'normal' }}>{salah}</div>}
      </div>
    </Modal>
  );
}
