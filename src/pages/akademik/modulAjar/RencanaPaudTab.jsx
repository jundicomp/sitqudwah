import { useMemo, useState } from 'react';
import Modal from '../../../components/common/Modal';
import DataTable from '../../../components/common/DataTable';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import useAkademikOptions from '../../../hooks/useAkademikOptions';
import { rombelPaud } from '../../../components/paud/shared';
import { rombelUntukUser, bolehLihatSemuaKelas, bolehMenerbitkan, isAdmin } from '../../../db/akses';
import { namaTingkat } from '../../../config/jenjang';
import { TEKNIK_PAUD } from '../../../db/raporPaudFields';
import { BADGE_STATUS_MODUL } from '../../../db/modulAjarFields';
import {
  HARI_PAUD, hariKosong, isiRencanaAwal, buatIdRencana, barisSheetRencana, tambahHari, cekKelengkapanRencana, susunDokumenRencana, kegiatanDariRencana,
} from '../../../db/rencanaPaudFields';
import { formatTanggalAngka, todayWIB } from '../../../db/helpers';
import { upsertRencanaPaudToSheet, hapusRencanaPaudDiSheet, addLogEntry, isConfigured } from '../../../services/googleSheets';
import DokumenRencanaPaud from './DokumenRencanaPaud';
import CetakRaporPaud from '../raporPaud/CetakRaporPaud';

const salin = (x) => JSON.parse(JSON.stringify(x));
const ada = (v) => !!String(v ?? '').trim();
const tgl = (iso) => (iso ? formatTanggalAngka(iso) : '');

// Editor rencana mingguan PAUD (dipakai juga dari tab Persetujuan).
export function RencanaPaudEditor({ rencana, rombelBoleh, onClose, mulaiPratinjau = false, onSelesaiPeriksa }) {
  const { pengaturanPaud, refreshRencanaPaud, toast } = useAppData();
  const { currentUser } = useAuth();
  const semua = bolehLihatSemuaKelas(currentUser);
  const penerbit = bolehMenerbitkan(currentUser);
  const baru = !rencana.idRencana;
  const [r, setR] = useState(() => salin(rencana));
  const [pratinjau, setPratinjau] = useState(mulaiPratinjau);
  const [cetak, setCetak] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [berubah, setBerubah] = useState(false);
  const [catatanKepsek, setCatatanKepsek] = useState(rencana.catatan || '');
  const pemilik = !!currentUser?.guru && r.guru === currentUser.guru;
  const bolehUbah = semua || baru || pemilik;
  const terkunci = !bolehUbah || r.status === 'Diajukan' || r.status === 'Disetujui';
  const periksa = penerbit && r.status === 'Diajukan';
  const set = (patch) => { setR(x => ({ ...x, ...patch })); setBerubah(true); };
  const setIsi = (patch) => { setR(x => ({ ...x, isi: { ...x.isi, ...(typeof patch === 'function' ? patch(x.isi) : patch) } })); setBerubah(true); };
  const ubahHari = (k, patch) => setIsi(x => ({ hari: x.hari.map((h, j) => (j === k ? { ...h, ...patch } : h)) }));
  const elemenList = (pengaturanPaud?.elemen || []).map(e => e.nama).filter(Boolean);
  const kurang = cekKelengkapanRencana(r);
  const p = pengaturanPaud || {};
  const dokumenHidup = susunDokumenRencana({ r, satuan: p.namaSatuan, kepala: p.namaKepala, kepalaNiy: p.niyKepala, jabatanKepala: p.jabatanKepala, tempat: p.tempat, namaTingkat });
  const dokumen = r.status === 'Disetujui' && r.arsip ? r.arsip : dokumenHidup;

  function pilihRombel(key) {
    const rb = rombelBoleh.find(x => x.key === key);
    if (rb) set({ tingkat: rb.tingkat, rombel: rb.rombel, guru: semua ? (rb.wali || r.guru) : currentUser.guru });
  }

  async function simpan(aksiStatus = 'simpan') {
    if (!r.tingkat) { toast('Pilih kelas dulu.', 'error'); return; }
    if (!ada(r.tema)) { toast('Tema belum diisi.', 'error'); return; }
    if (aksiStatus === 'ajukan' && kurang.length) { toast(`Belum bisa diajukan, masih kurang: ${kurang.join(', ')}.`, 'error'); return; }
    if (aksiStatus === 'kembalikan' && !catatanKepsek.trim()) { toast('Tulis catatan untuk guru sebelum mengembalikan.', 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      const sekarang = new Date().toISOString();
      const statusBaru = { simpan: r.status || 'Draft', ajukan: 'Diajukan', tarik: 'Draft', setujui: 'Disetujui', kembalikan: 'Dikembalikan', buka: 'Draft' }[aksiStatus];
      const patch = { idRencana: r.idRencana || buatIdRencana(), status: statusBaru, diubahOleh: currentUser.nama, diubahPada: sekarang };
      if (aksiStatus === 'setujui') Object.assign(patch, { disetujuiOleh: currentUser.nama, tanggalDisetujui: sekarang.slice(0, 10), arsip: dokumenHidup, catatan: catatanKepsek.trim() });
      if (aksiStatus === 'kembalikan') Object.assign(patch, { catatan: catatanKepsek.trim(), disetujuiOleh: '', tanggalDisetujui: '', arsip: null });
      if (aksiStatus === 'buka' || aksiStatus === 'tarik') Object.assign(patch, { disetujuiOleh: '', tanggalDisetujui: '', arsip: null });
      await upsertRencanaPaudToSheet([barisSheetRencana({ ...r, ...patch })]);
      const LOG = { simpan: baru ? 'Buat Rencana PAUD' : 'Ubah Rencana PAUD', ajukan: 'Ajukan Rencana PAUD', tarik: 'Tarik Pengajuan Rencana PAUD', setujui: 'Setujui Rencana PAUD', kembalikan: 'Kembalikan Rencana PAUD', buka: 'Buka Kembali Rencana PAUD' };
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: LOG[aksiStatus], modul: 'Modul Ajar', detail: `${r.tema}${r.subtema ? ' / ' + r.subtema : ''} — ${namaTingkat(r.tingkat)} ${r.rombel} (${r.guru})` });
      setR(x => ({ ...x, ...patch }));
      setBerubah(false);
      await refreshRencanaPaud();
      toast({ simpan: 'Rencana tersimpan.', ajukan: 'Rencana diajukan ke kepala sekolah.', tarik: 'Pengajuan ditarik.', setujui: 'Rencana disetujui dan diarsipkan.', kembalikan: 'Rencana dikembalikan ke guru.', buka: 'Rencana dibuka kembali menjadi draft.' }[aksiStatus]);
      if (['setujui', 'kembalikan'].includes(aksiStatus) && onSelesaiPeriksa) onSelesaiPeriksa();
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "rencanaPaud" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  const aksi = (
    <>
      {pratinjau
        ? <><button className="btn" onClick={() => setPratinjau(false)}>{terkunci ? 'Lihat isian' : 'Kembali ke isian'}</button><button className="btn" onClick={() => setCetak(true)}>🖨️ Cetak / PDF</button></>
        : <button className="btn" onClick={() => setPratinjau(true)} disabled={!r.tingkat}>Pratinjau</button>}
      {!terkunci && <button className="btn" onClick={() => simpan('simpan')} disabled={menyimpan || (!berubah && !baru)}>{menyimpan ? 'Menyimpan…' : 'Simpan draft'}</button>}
      {!terkunci && r.idRencana && <button className="btn btn-primary" onClick={() => simpan('ajukan')} disabled={menyimpan}>Ajukan ke kepala sekolah</button>}
      {r.status === 'Diajukan' && pemilik && !penerbit && <button className="btn" onClick={() => simpan('tarik')} disabled={menyimpan}>Tarik pengajuan</button>}
      {periksa && <button className="btn" onClick={() => simpan('kembalikan')} disabled={menyimpan}>Kembalikan</button>}
      {periksa && <button className="btn btn-primary" onClick={() => simpan('setujui')} disabled={menyimpan}>Setujui</button>}
      {r.status === 'Disetujui' && isAdmin(currentUser) && <button className="btn" onClick={() => { if (window.confirm('Buka kembali rencana yang sudah disetujui?')) simpan('buka'); }} disabled={menyimpan}>Buka kembali (jadi draft)</button>}
    </>
  );

  return (
    <Modal wide title={baru && !r.idRencana ? 'Rencana tema PAUD baru' : `${r.tema || 'Rencana'}${r.subtema ? ' · ' + r.subtema : ''}`}
      subtitle={r.tingkat ? `${namaTingkat(r.tingkat)} ${r.rombel} · Minggu ke-${r.minggu || '?'} · ${r.tahunAjaran} ${r.semester}` : 'Pilih kelas'}
      onClose={() => { if (berubah && !window.confirm('Perubahan belum disimpan. Tutup saja?')) return; onClose(); }} actions={aksi}>
      {periksa && (
        <div className="md-periksa">
          <b>Pemeriksaan kepala sekolah</b>
          <textarea rows={2} value={catatanKepsek} placeholder="Catatan untuk guru (wajib bila dikembalikan)…" aria-label="Catatan kepala sekolah" onChange={e => setCatatanKepsek(e.target.value)} />
        </div>
      )}
      {pratinjau ? (
        <div style={{ background: '#E9EDEA', padding: 12, borderRadius: 10, maxHeight: '64vh', overflow: 'auto' }}>
          <DokumenRencanaPaud dokumen={dokumen} />
          {cetak && <CetakRaporPaud dokumen={dokumen} onSelesai={() => setCetak(false)} />}
        </div>
      ) : (
        <>
          <div className="ringkas-bar" style={{ marginBottom: 12 }}>
            <span className={`badge ${BADGE_STATUS_MODUL[r.status] || 'badge-muted'}`}>{r.status || 'Draft'}</span>
            {r.guru && <span className="badge badge-muted">Guru: {r.guru}</span>}
            {kurang.length ? <span className="badge badge-gold">Belum lengkap: {kurang.join(', ')}</span> : <span className="badge badge-green">Bagian utama lengkap</span>}
            {!bolehUbah && <span className="badge badge-blue">Hanya lihat</span>}
          </div>
          {r.status === 'Dikembalikan' && r.catatan && <div className="banner-info" style={{ marginBottom: 12 }}><span><b>Catatan kepala sekolah:</b> {r.catatan}</span></div>}
          {r.status === 'Disetujui' && <div className="banner-info" style={{ marginBottom: 12 }}><span>Disetujui {r.disetujuiOleh ? `oleh ${r.disetujuiOleh} ` : ''}{r.tanggalDisetujui ? `pada ${r.tanggalDisetujui}` : ''}. Hasil cetak memakai arsip saat disetujui.</span></div>}
          <fieldset disabled={terkunci} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="form-grid">
              {baru && (
                <div className="field"><label>Kelas</label>
                  <select value={r.tingkat ? `${r.tingkat}|${r.rombel}` : ''} onChange={e => pilihRombel(rombelBoleh.find(x => `${x.tingkat}|${x.rombel}` === e.target.value)?.key)}>
                    <option value="">— pilih —</option>
                    {rombelBoleh.map(x => <option key={x.key} value={`${x.tingkat}|${x.rombel}`}>{x.label}{semua && x.wali ? ` — ${x.wali}` : ''}</option>)}
                  </select></div>
              )}
              <div className="field"><label>Minggu ke</label><input type="number" min="1" max="30" value={r.minggu} onChange={e => set({ minggu: e.target.value })} /></div>
              <div className="field"><label>Tanggal mulai</label><input type="date" value={r.mulai} onChange={e => set({ mulai: e.target.value, selesai: r.selesai && r.selesai >= e.target.value ? r.selesai : tambahHari(e.target.value, 4) })} /></div>
              <div className="field"><label>Tanggal selesai</label><input type="date" value={r.selesai} onChange={e => set({ selesai: e.target.value })} /></div>
              <div className="field"><label>Tema</label><input value={r.tema} placeholder="mis. Diriku" onChange={e => set({ tema: e.target.value })} /></div>
              <div className="field"><label>Subtema</label><input value={r.subtema} placeholder="mis. Anggota Tubuhku" onChange={e => set({ subtema: e.target.value })} /></div>
              <div className="field span2"><label>Tujuan pembelajaran</label><textarea rows={3} value={r.isi.tujuan} placeholder="Anak dapat …" onChange={e => setIsi({ tujuan: e.target.value })} /></div>
              <div className="field span2"><label>Elemen yang dikembangkan</label>
                <div className="md-cek">
                  {elemenList.map(el => (
                    <label key={el} className={r.isi.elemen.includes(el) ? 'on' : ''}>
                      <input type="checkbox" checked={r.isi.elemen.includes(el)} onChange={e => setIsi(x => ({ elemen: e.target.checked ? [...x.elemen, el] : x.elemen.filter(y => y !== el) }))} />{el}
                    </label>
                  ))}
                </div></div>
            </div>

            <div className="md-langkah-h"><b>Kegiatan harian</b><span>Tiap baris di "Kegiatan inti" otomatis jadi pilihan kegiatan di Penilaian PAUD.</span></div>
            {r.isi.hari.map((h, k) => (
              <div key={h.hari} className="rp-hari">
                <div className="rp-hari-h">
                  <b>{h.hari}</b>
                  <div className="rp-hari-el">{elemenList.map(el => (
                    <label key={el} className={h.elemen.includes(el) ? 'on' : ''} title={el}>
                      <input type="checkbox" checked={h.elemen.includes(el)} onChange={e => ubahHari(k, { elemen: e.target.checked ? [...h.elemen, el] : h.elemen.filter(y => y !== el) })} />{el.split(' ').slice(0, 2).join(' ')}
                    </label>))}</div>
                  {k === r.isi.hari.length - 1 && k > 0 && <button type="button" className="btn-icon danger" aria-label={`Hapus hari ${h.hari}`} onClick={() => setIsi(x => ({ hari: x.hari.slice(0, -1) }))}>✕</button>}
                </div>
                <div className="rp-hari-g">
                  <textarea rows={3} value={h.pembukaan} placeholder="Pembukaan: salam, doa, berbaris, apersepsi…" aria-label={`Pembukaan ${h.hari}`} onChange={e => ubahHari(k, { pembukaan: e.target.value })} />
                  <textarea rows={3} value={h.inti} placeholder={'Kegiatan inti (satu kegiatan per baris), mis.\nMenempel gambar anggota tubuh\nBernyanyi "Dua Mata Saya"'} aria-label={`Kegiatan inti ${h.hari}`} onChange={e => ubahHari(k, { inti: e.target.value })} />
                  <textarea rows={3} value={h.penutup} placeholder="Penutup: recalling, doa, pulang…" aria-label={`Penutup ${h.hari}`} onChange={e => ubahHari(k, { penutup: e.target.value })} />
                </div>
              </div>
            ))}
            {r.isi.hari.length < HARI_PAUD.length && <button type="button" className="btn btn-sm" onClick={() => setIsi(x => ({ hari: [...x.hari, hariKosong(HARI_PAUD[x.hari.length])] }))}>+ Tambah hari {HARI_PAUD[r.isi.hari.length]}</button>}

            <div className="form-grid" style={{ marginTop: 12 }}>
              <div className="field span2"><label>Alat dan bahan</label><textarea rows={2} value={r.isi.alat} onChange={e => setIsi({ alat: e.target.value })} /></div>
              <div className="field span2"><label>Teknik asesmen</label>
                <div className="md-cek">{TEKNIK_PAUD.map(t => (
                  <label key={t} className={r.isi.teknik.includes(t) ? 'on' : ''}><input type="checkbox" checked={r.isi.teknik.includes(t)} onChange={e => setIsi(x => ({ teknik: e.target.checked ? [...x.teknik, t] : x.teknik.filter(y => y !== t) }))} />{t}</label>
                ))}</div></div>
              <div className="field span2"><label>Rencana asesmen (yang diamati)</label><textarea rows={2} value={r.isi.asesmen} onChange={e => setIsi({ asesmen: e.target.value })} /></div>
              <div className="field span2"><label>Catatan</label><textarea rows={2} value={r.isi.catatan} onChange={e => setIsi({ catatan: e.target.value })} /></div>
            </div>
          </fieldset>
        </>
      )}
    </Modal>
  );
}

// Tab Modul Ajar › Rencana Tema PAUD.
export default function RencanaPaudTab({ ta, semester }) {
  const { rencanaPaud, refreshRencanaPaud, toast } = useAppData();
  const { currentUser } = useAuth();
  const { rombelList } = useAkademikOptions();
  const semua = bolehLihatSemuaKelas(currentUser);
  const rombelBoleh = useMemo(() => rombelUntukUser(rombelPaud(rombelList), currentUser), [rombelList, currentUser]);
  const [editor, setEditor] = useState(null);
  const [kelas, setKelas] = useState('');

  const rows = useMemo(() => rencanaPaud.filter(x => x.tahunAjaran === ta && x.semester === semester)
    .filter(x => semua || (x.guru && x.guru === currentUser?.guru) || rombelBoleh.some(rb => rb.tingkat === x.tingkat && rb.rombel === x.rombel))
    .filter(x => !kelas || `${x.tingkat}|${x.rombel}` === kelas)
    .map(x => ({ ...x, jmlKegiatan: kegiatanDariRencana(x).length })), [rencanaPaud, ta, semester, semua, currentUser, rombelBoleh, kelas]);

  function baru() {
    const rb = rombelBoleh.length === 1 ? rombelBoleh[0] : null;
    const mingguAkhir = rencanaPaud.filter(x => x.tahunAjaran === ta && x.semester === semester && (!rb || (x.tingkat === rb.tingkat && x.rombel === rb.rombel))).reduce((a, x) => Math.max(a, Number(x.minggu) || 0), 0);
    const mulai = todayWIB();
    setEditor({
      idRencana: '', tahunAjaran: ta, semester, tingkat: rb?.tingkat || '', rombel: rb?.rombel || '', guru: semua ? (rb?.wali || '') : currentUser?.guru || '',
      tema: '', subtema: '', minggu: mingguAkhir + 1, mulai, selesai: tambahHari(mulai, 4), isi: isiRencanaAwal(), status: 'Draft', catatan: '',
    });
  }
  async function salinRencana(x) {
    try {
      await upsertRencanaPaudToSheet([barisSheetRencana({ ...x, idRencana: buatIdRencana(), tema: x.tema, subtema: `${x.subtema || ''} (salinan)`.trim(), status: 'Draft', catatan: '', guru: semua ? x.guru : currentUser.guru, diubahOleh: currentUser.nama, diubahPada: new Date().toISOString(), disetujuiOleh: '', tanggalDisetujui: '', arsip: null })]);
      await refreshRencanaPaud(); toast('Rencana disalin sebagai draft baru.');
    } catch (e) { toast(e.message, 'error'); }
  }
  async function hapus(x) {
    if (!window.confirm(`Hapus rencana "${x.tema}${x.subtema ? ' / ' + x.subtema : ''}"?`)) return;
    try { await hapusRencanaPaudDiSheet(x.no); await refreshRencanaPaud(); toast('Rencana dihapus.'); } catch (e) { toast(e.message, 'error'); }
  }
  const milik = (x) => semua || (x.guru && x.guru === currentUser?.guru);

  const columns = [
    { key: 'minggu', label: 'Minggu', sortable: true, render: r => r.minggu || '—' },
    { key: 'tema', label: 'Tema / Subtema', sortable: true, render: r => <><b>{r.tema}</b>{r.subtema ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.subtema}</div> : null}</> },
    { key: 'mulai', label: 'Tanggal', sortable: true, render: r => [tgl(r.mulai), tgl(r.selesai)].filter(Boolean).join(' – ') || '—' },
    { key: 'kelas', label: 'Kelas', sortable: true, accessor: r => `${r.tingkat} ${r.rombel}`, render: r => `${namaTingkat(r.tingkat)} ${r.rombel}` },
    ...(semua ? [{ key: 'guru', label: 'Guru', sortable: true }] : []),
    { key: 'jmlKegiatan', label: 'Kegiatan', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: r => <span className={`badge ${BADGE_STATUS_MODUL[r.status] || 'badge-muted'}`}>{r.status}</span> },
    { key: 'aksi', label: 'Aksi', render: r => (
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm" onClick={() => setEditor({ ...r, __pratinjau: true })}>Lihat</button>
        {milik(r) && ['Draft', 'Dikembalikan'].includes(r.status) && <button className="btn btn-sm" onClick={() => setEditor(r)}>Ubah</button>}
        {(semua || currentUser?.guru) && <button className="btn btn-sm" onClick={() => salinRencana(r)}>Salin</button>}
        {milik(r) && r.status !== 'Disetujui' && <button className="btn btn-sm" onClick={() => hapus(r)}>Hapus</button>}
      </div>
    ) },
  ];

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Rencana tema PAUD (RPPM)</h3><p>Rencana pembelajaran mingguan KB/TK per tema. Kegiatan inti di sini otomatis muncul sebagai pilihan kegiatan saat guru mengisi Penilaian PAUD.</p></div>
        <button className="btn btn-primary btn-sm" onClick={baru} disabled={!rombelBoleh.length}>+ Rencana baru</button>
      </div>
      <div className="card-body">
        {!rombelBoleh.length && <div className="banner-info" style={{ marginBottom: 10 }}><span>{semua ? 'Belum ada kelas KB/TK di Data Kelas.' : 'Anda belum tercatat sebagai wali kelas KB/TK di Data Kelas.'}</span></div>}
        {rombelBoleh.length > 1 && (
          <div className="filter-bar"><div className="field"><label>Kelas</label>
            <select value={kelas} onChange={e => setKelas(e.target.value)}><option value="">Semua</option>{rombelBoleh.map(x => <option key={x.key} value={`${x.tingkat}|${x.rombel}`}>{x.label}</option>)}</select></div></div>
        )}
        <DataTable columns={columns} data={rows} rowKey={r => r.id} defaultSortKey="minggu" pageSize={25}
          searchFn={(r, t) => `${r.tema} ${r.subtema} ${r.guru}`.toLowerCase().includes(t)} emptyMessage={`Belum ada rencana tema untuk ${ta} semester ${semester}.`} />
      </div>
      {editor && <RencanaPaudEditor key={(editor.idRencana || 'baru') + (editor.__pratinjau ? 'p' : '')} rencana={(({ __pratinjau, ...x }) => x)(editor)} mulaiPratinjau={!!editor.__pratinjau} rombelBoleh={rombelBoleh} onClose={() => setEditor(null)} />}
    </div>
  );
}
