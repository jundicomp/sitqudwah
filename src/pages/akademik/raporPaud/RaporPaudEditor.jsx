import { useMemo, useState } from 'react';
import Modal from '../../../components/common/Modal';
import FotoDriveField, { TombolUnggahFoto } from '../../../components/common/FotoDrive';
import { CapaianPills, GaleriFoto } from '../../../components/paud/shared';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { bolehMenerbitkan, isAdmin } from '../../../db/akses';
import {
  BADGE_STATUS_PAUD, isianAwal, kalimatPembuka, saranCapaian, susunDokumenPaud, cekKelengkapan,
  kunciMulok, bidangMulok, bidangKarakter,
} from '../../../db/raporPaudFields';
import { kehadiranSemester } from '../../../db/akademikLanjutanFields';
import { todayWIB, formatTanggal } from '../../../db/helpers';
import { upsertRaporPaudToSheet, bulkUpdateSiswaInSheet, addLogEntry, isConfigured } from '../../../services/googleSheets';
import DokumenRaporPaud from './DokumenRaporPaud';
import CetakRaporPaud from './CetakRaporPaud';

const TABS = [
  { id: 'identitas', label: 'Identitas' },
  { id: 'perkembangan', label: 'Perkembangan' },
  { id: 'mulok', label: 'Muatan lokal & karakter' },
  { id: 'kesehatan', label: 'Kesehatan & presensi' },
];
const IDENTITAS_SEKALI = [
  ['panggilan', 'Nama Panggilan', 'Nama panggilan'],
  ['anakKe', 'Anak Ke', 'Anak ke-'],
  ['jumlahSaudara', 'Jumlah Saudara', 'Dari … bersaudara'],
  ['pekerjaanAyah', 'Pekerjaan Ayah', 'Pekerjaan ayah'],
  ['pekerjaanIbu', 'Pekerjaan Ibu', 'Pekerjaan ibu'],
  ['hpAyah', 'No HP Ayah', 'No. HP ayah'],
  ['hpIbu', 'No HP Ibu', 'No. HP ibu'],
];
const tgl = (iso) => (iso ? formatTanggal(String(iso).slice(0, 10) + 'T00:00:00') : '-');

// Gabung isian tersimpan di atas isian awal (supaya elemen/kegiatan baru di pengaturan ikut muncul).
function gabungIsian(awal, simpan) {
  if (!simpan) return awal;
  return {
    ...awal, ...simpan,
    elemen: Object.fromEntries(Object.keys(awal.elemen).map(k => [k, { ...awal.elemen[k], ...(simpan.elemen?.[k] || {}) }])),
    mulok: { ...awal.mulok, ...(simpan.mulok || {}) },
    karakter: { ...awal.karakter, ...(simpan.karakter || {}) },
    kesehatan: { ...awal.kesehatan, ...(simpan.kesehatan || {}) },
  };
}

export default function RaporPaudEditor({ siswa, rombel, ta, semester, record, onClose }) {
  const { pengaturanPaud: p, asesmenPaud, presensi, perkembangan, tahunAjaran, profilSekolah, refreshRaporPaud, refreshSiswa, toast } = useAppData();
  const { currentUser } = useAuth();
  const penerbit = bolehMenerbitkan(currentUser);
  const [tab, setTab] = useState('perkembangan');
  const [pratinjau, setPratinjau] = useState(false);
  const [cetak, setCetak] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [status, setStatus] = useState(record?.status || 'Belum Diisi');
  const terkunci = status === 'Terbit';

  // ---- Bahan otomatis dari Penilaian PAUD semester ini ----
  const milik = useMemo(() => asesmenPaud.filter(x =>
    (siswa.idSiswa ? x.idSiswa === siswa.idSiswa : (x.nisn && x.nisn === siswa.nisn)) && x.tahunAjaran === ta && x.semester === semester), [asesmenPaud, siswa, ta, semester]);
  const perBidang = useMemo(() => milik.reduce((m, x) => { (m[x.bidang] ||= []).push(x); return m; }, {}), [milik]);
  const saranElemen = useMemo(() => Object.fromEntries(p.elemen.map(e => [e.id, saranCapaian(perBidang[e.nama] || [])])), [p, perBidang]);
  const saranMulok = useMemo(() => Object.fromEntries(p.mulok.flatMap(m => m.kegiatan).map(k => [k, saranCapaian(perBidang[bidangMulok(k)] || [])?.kode || ''])), [p, perBidang]);
  const saranKarakter = useMemo(() => Object.fromEntries(p.karakter.map(k => [k, saranCapaian(perBidang[bidangKarakter(k)] || [])?.kode || ''])), [p, perBidang]);
  const catatanPerkembangan = useMemo(() => perkembangan.filter(x => x.nisn && x.nisn === siswa.nisn && x.tahunAjaran === ta && x.semester === semester), [perkembangan, siswa, ta, semester]);
  const taObj = tahunAjaran.find(t => t.label === ta);
  const hadir = useMemo(() => (siswa.nisn ? kehadiranSemester(presensi, siswa.nisn, taObj, semester) : { Sakit: 0, Izin: 0, Alpha: 0 }), [presensi, siswa, taObj, semester]);
  const presensiOtomatis = { sakit: hadir.Sakit, izin: hadir.Izin, alpha: hadir.Alpha };

  const [isian, setIsian] = useState(() => gabungIsian(
    isianAwal(p, { saranElemen: Object.fromEntries(Object.entries(saranElemen).map(([k, v]) => [k, v?.kode || ''])), saranMulok, saranKarakter }),
    record?.isian && Object.keys(record.isian).length ? record.isian : null,
  ));
  const [identitas, setIdentitas] = useState(() => Object.fromEntries(IDENTITAS_SEKALI.map(([k]) => [k, siswa[k] || ''])));
  const [foto, setFoto] = useState(siswa.foto || '');
  const ubahElemen = (id, patch) => setIsian(x => ({ ...x, elemen: { ...x.elemen, [id]: { ...x.elemen[id], ...patch } } }));
  const ubah = (bagian, key, v) => setIsian(x => ({ ...x, [bagian]: { ...x[bagian], [key]: v } }));

  const panggilan = identitas.panggilan || siswa.nama.split(' ')[0];
  const siswaKini = { ...siswa, ...identitas, foto };
  const dokumen = record?.status === 'Terbit' && record?.arsip && status === 'Terbit'
    ? record.arsip
    : susunDokumenPaud({ p, siswa: siswaKini, isian, rombel, ta, semester, profil: profilSekolah, presensiOtomatis, tanggal: record?.tanggalTerbit || todayWIB() });
  const kurang = cekKelengkapan(p, isian);

  async function simpan(statusBaru) {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (!siswa.idSiswa) { toast('Anak ini belum punya ID Siswa. Klik "Buat ID sekarang" di atas daftar dulu.', 'error'); return; }
    if ((statusBaru === 'Diajukan' || statusBaru === 'Terbit') && kurang.length) {
      toast(`Belum lengkap: ${kurang.slice(0, 4).join(', ')}${kurang.length > 4 ? ', …' : ''}.`, 'error'); return;
    }
    setMenyimpan(true);
    try {
      // 1) Data "isi sekali" ke Data Siswa (hanya yg berubah)
      const patch = {};
      IDENTITAS_SEKALI.forEach(([k, kolom]) => { if (String(identitas[k] || '') !== String(siswa[k] || '')) patch[kolom] = String(identitas[k] || '').trim(); });
      if (foto !== (siswa.foto || '')) patch['Foto'] = foto;
      if (Object.keys(patch).length) { await bulkUpdateSiswaInSheet([{ no: siswa.no, patch }]); refreshSiswa(); }

      // 2) Rapor
      const tanggalTerbit = statusBaru === 'Terbit' ? (isian.tanggal || todayWIB()) : '';
      const arsip = statusBaru === 'Terbit'
        ? susunDokumenPaud({ p, siswa: siswaKini, isian, rombel, ta, semester, profil: profilSekolah, presensiOtomatis, tanggal: tanggalTerbit })
        : null;
      await upsertRaporPaudToSheet([{
        'Tahun Ajaran': ta, Semester: semester, 'ID Siswa': siswa.idSiswa, NISN: siswa.nisn, 'Nama Siswa': siswa.nama,
        Tingkat: rombel.tingkat, Rombel: rombel.rombel, Isian: JSON.stringify(isian), Status: statusBaru,
        'Tanggal Terbit': tanggalTerbit, Arsip: arsip ? JSON.stringify(arsip) : '',
        'Diubah Oleh': currentUser.nama, 'Diubah Pada': new Date().toISOString(),
      }]);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: `Rapor PAUD: ${statusBaru}`, modul: 'Rapor Digital', detail: `${siswa.nama}, ${ta} ${semester}` });
      await refreshRaporPaud();
      setStatus(statusBaru);
      toast({ Draft: 'Rapor tersimpan sebagai draft.', Diajukan: 'Rapor diajukan ke kepala sekolah.', Terbit: 'Rapor diterbitkan dan diarsipkan.' }[statusBaru] || 'Tersimpan.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "raporPaud" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  const tombol = pratinjau ? (
    <>
      <button className="btn" onClick={() => setPratinjau(false)}>Kembali ke isian</button>
      <button className="btn btn-primary" onClick={() => setCetak(true)}>🖨️ Cetak / PDF</button>
    </>
  ) : terkunci ? (
    <>
      <button className="btn" onClick={() => setPratinjau(true)}>Lihat &amp; cetak</button>
      {isAdmin(currentUser) && <button className="btn" disabled={menyimpan} onClick={() => simpan('Draft')}>Buka kembali (jadi draft)</button>}
    </>
  ) : (
    <>
      <button className="btn" onClick={() => setPratinjau(true)}>Pratinjau</button>
      <button className="btn" disabled={menyimpan} onClick={() => simpan('Draft')}>Simpan draft</button>
      {penerbit && status === 'Diajukan' && <button className="btn" disabled={menyimpan} onClick={() => simpan('Draft')}>Kembalikan ke wali kelas</button>}
      {(penerbit || !p.butuhPersetujuan)
        ? <button className="btn btn-primary" disabled={menyimpan} onClick={() => simpan('Terbit')}>{menyimpan ? 'Menyimpan…' : 'Terbitkan'}</button>
        : <button className="btn btn-primary" disabled={menyimpan || status === 'Diajukan'} onClick={() => simpan('Diajukan')}>{status === 'Diajukan' ? 'Sudah diajukan' : 'Ajukan ke kepala sekolah'}</button>}
    </>
  );

  return (
    <Modal wide title={`Rapor ${siswa.nama}`} subtitle={`${rombel.label} · ${ta} · Semester ${semester}`} onClose={onClose} actions={tombol}>
      {pratinjau ? (
        <div style={{ background: '#E9EDEA', padding: 12, borderRadius: 10, maxHeight: '64vh', overflow: 'auto' }}>
          <DokumenRaporPaud id="rapor-paud-pratinjau" dokumen={dokumen} />
          {cetak && <CetakRaporPaud dokumen={dokumen} onSelesai={() => setCetak(false)} />}
        </div>
      ) : (
        <>
          <div className="ringkas-bar" style={{ marginBottom: 12 }}>
            <span className={`badge ${BADGE_STATUS_PAUD[status]}`}>{status}{record?.tanggalTerbit && status === 'Terbit' ? ` · ${record.tanggalTerbit}` : ''}</span>
            <span className="badge badge-muted">{milik.length} catatan penilaian semester ini</span>
            {kurang.length > 0 ? <span className="badge badge-gold" title={kurang.join(', ')}>{kurang.length} bagian belum lengkap</span> : <span className="badge badge-green">Isian lengkap</span>}
            {terkunci && <span className="badge badge-blue">Terkunci — sudah terbit &amp; diarsipkan</span>}
          </div>
          <div className="seg-tabs" style={{ marginBottom: 14 }}>
            {TABS.map(t => <button key={t.id} className={`seg-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
          </div>
          <fieldset disabled={terkunci} style={{ border: 0, padding: 0, margin: 0 }}>

            {tab === 'identitas' && (
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)' }}>
                  <span className="paud-chip auto">otomatis</span> dari Data Siswa · <span className="paud-chip sekali">isi sekali</span> ikut tersimpan ke Data Siswa, jadi semester berikutnya terisi sendiri.
                </p>
                <div className="form-grid">
                  {[['Nama lengkap', siswa.nama], ['NISN', siswa.nisn || '—'], ['ID Siswa', siswa.idSiswa || '—'], ['Jenis kelamin', siswa.jenisKelamin], ['Tempat, tanggal lahir', [siswa.tempatLahir, tgl(siswa.tanggalLahir)].filter(Boolean).join(', ')], ['Nama ayah', siswa.namaAyah], ['Nama ibu', siswa.namaIbu], ['Alamat', siswa.alamat]].map(([l, v]) => (
                    <div key={l} className="field"><label>{l} <span className="paud-chip auto">otomatis</span></label><input value={v || ''} readOnly style={{ background: '#F5F8F6' }} /></div>
                  ))}
                  {IDENTITAS_SEKALI.map(([k, , label]) => (
                    <div key={k} className="field"><label>{label} <span className="paud-chip sekali">isi sekali</span></label>
                      <input type={k === 'anakKe' || k === 'jumlahSaudara' ? 'number' : 'text'} value={identitas[k]} onChange={e => setIdentitas(x => ({ ...x, [k]: e.target.value }))} /></div>
                  ))}
                  <div className="field"><label>Pas foto <span className="paud-chip sekali">isi sekali</span></label>
                    <FotoDriveField value={foto} onChange={setFoto} nama={siswa.nama} onError={m => toast(m, 'error')} /></div>
                  <div className="field"><label>Tanggal rapor</label>
                    <input type="date" value={isian.tanggal || ''} onChange={e => setIsian(x => ({ ...x, tanggal: e.target.value }))} />
                    <small style={{ color: 'var(--muted)' }}>Kosong = tanggal saat diterbitkan.</small></div>
                </div>
              </div>
            )}

            {tab === 'perkembangan' && p.elemen.map((e, i) => {
              const x = isian.elemen[e.id] || {};
              const saran = saranElemen[e.id];
              const catatan = (perBidang[e.nama] || []).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
              const fotoTersedia = [...new Set([...catatan.flatMap(c => c.foto), ...(x.foto || [])])];
              const pilihFoto = (u) => {
                const ada = x.foto || [];
                if (ada.includes(u)) ubahElemen(e.id, { foto: ada.filter(f => f !== u) });
                else if (ada.length >= 2) toast('Maksimal 2 foto per elemen.', 'error');
                else ubahElemen(e.id, { foto: [...ada, u] });
              };
              return (
                <div key={e.id} className="paud-elemen">
                  <div className="paud-elemen-head">
                    <h4>{String.fromCharCode(65 + i)}. {e.nama}</h4>
                    <CapaianPills value={x.capaian} onChange={v => ubahElemen(e.id, { capaian: v })} skala={p.skala} />
                  </div>
                  <div className="paud-saran" style={{ marginBottom: 8 }}>
                    {saran
                      ? <>Saran dari {saran.total} catatan penilaian: <b>{saran.kode}</b> ({Object.entries(saran.hitung).map(([k, n]) => `${k} ${n}×`).join(', ')})</>
                      : 'Belum ada catatan penilaian untuk elemen ini di semester ini.'}
                  </div>
                  <p className="paud-pembuka">{x.capaian ? kalimatPembuka(p, e, panggilan, x.capaian) : 'Pilih capaian dulu — kalimat pembuka akan muncul otomatis di sini.'}</p>
                  <textarea className="paud-lanjutan" rows={3} value={x.lanjutan || ''} placeholder="Lanjutkan kalimatnya… mis. sudah bisa melafalkan bacaan sholat dengan jelas, sholat dhuha dengan tertib…" onChange={ev => ubahElemen(e.id, { lanjutan: ev.target.value })} />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 10px' }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700 }}>Penyemangat{' '}
                      <select value={x.semangat || ''} onChange={ev => ubahElemen(e.id, { semangat: ev.target.value })}>
                        <option value="">— tanpa —</option>
                        {p.semangat.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </label>
                  </div>
                  {e.foto && (
                    <>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Foto kegiatan <span style={{ fontWeight: 500, color: 'var(--muted)' }}>— klik untuk memilih (maks. 2). Foto dari Penilaian PAUD otomatis muncul di sini.</span></div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <GaleriFoto foto={fotoTersedia} dipilih={x.foto || []} onPilih={terkunci ? undefined : pilihFoto} />
                        {!terkunci && <TombolUnggahFoto subfolder={`Rapor PAUD ${ta.replace('/', '-')} ${semester}`} nama={`${siswa.nama}-${e.id}`} onUploaded={u => setIsian(xx => { const a = xx.elemen[e.id].foto || []; return { ...xx, elemen: { ...xx.elemen, [e.id]: { ...xx.elemen[e.id], foto: a.length >= 2 ? a : [...a, u] } } }; })} onError={m => toast(m, 'error')} />}
                      </div>
                    </>
                  )}
                  {(catatan.length > 0 || i === 0) && (
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--green-dark)' }}>Bahan menulis: {catatan.length} catatan penilaian{i === 0 && catatanPerkembangan.length ? ` + ${catatanPerkembangan.length} catatan perkembangan` : ''}</summary>
                      <div className="paud-riwayat">
                        {catatan.map(c => <div key={c.id}><b>{c.tanggal}</b> · {c.teknik}{c.kegiatan ? ` · ${c.kegiatan}` : ''}{c.capaian ? ` · ${c.capaian}` : ''}{c.catatan ? <><br />{c.catatan}</> : null}</div>)}
                        {i === 0 && catatanPerkembangan.map(c => <div key={c.id}><b>{c.tanggal}</b> · Catatan perkembangan · {c.aspek}{c.arah ? ` (${c.arah})` : ''}<br />{c.catatan}</div>)}
                        {!catatan.length && !(i === 0 && catatanPerkembangan.length) && <span className="paud-kosong">Belum ada catatan.</span>}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}

            {tab === 'mulok' && (
              <div>
                {p.mulok.map(m => (
                  <div key={m.program} className="paud-elemen">
                    <div className="paud-elemen-head">
                      <h4>Muatan lokal — {m.program}</h4>
                      <button type="button" className="btn btn-sm" onClick={() => setIsian(x => ({ ...x, mulok: { ...x.mulok, ...Object.fromEntries(m.kegiatan.map(k => [kunciMulok(m.program, k), 'BSH'])) } }))}>Isi semua BSH</button>
                    </div>
                    <table className="paud-tabel"><tbody>
                      {m.kegiatan.map(k => (
                        <tr key={k}><td>{k}{saranMulok[k] ? <span className="paud-saran"> · saran <b>{saranMulok[k]}</b></span> : null}</td>
                          <td style={{ width: 230 }}><CapaianPills size="sm" value={isian.mulok[kunciMulok(m.program, k)]} onChange={v => ubah('mulok', kunciMulok(m.program, k), v)} skala={p.skala} /></td></tr>
                      ))}
                    </tbody></table>
                  </div>
                ))}
                <div className="paud-elemen">
                  <div className="paud-elemen-head">
                    <h4>Karakter siswa</h4>
                    <button type="button" className="btn btn-sm" onClick={() => setIsian(x => ({ ...x, karakter: Object.fromEntries(p.karakter.map(k => [k, 'BSH'])) }))}>Isi semua BSH</button>
                  </div>
                  <table className="paud-tabel"><tbody>
                    {p.karakter.map(k => (
                      <tr key={k}><td>{k}{saranKarakter[k] ? <span className="paud-saran"> · saran <b>{saranKarakter[k]}</b></span> : null}</td>
                        <td style={{ width: 230 }}><CapaianPills size="sm" value={isian.karakter[k]} onChange={v => ubah('karakter', k, v)} skala={p.skala} /></td></tr>
                    ))}
                  </tbody></table>
                  <div className="field" style={{ marginTop: 10 }}><label>Deskripsi perkembangan karakter</label>
                    <textarea rows={4} value={isian.deskripsiKarakter} placeholder={`Ananda ${panggilan} adalah siswa yang…`} onChange={e => setIsian(x => ({ ...x, deskripsiKarakter: e.target.value }))} /></div>
                  <div className="field"><label>Kalimat penutup</label>
                    <input value={isian.semangatKarakter} onChange={e => setIsian(x => ({ ...x, semangatKarakter: e.target.value }))} /></div>
                </div>
              </div>
            )}

            {tab === 'kesehatan' && (
              <div className="form-grid">
                {p.kesehatan.map(k => (
                  <div key={k.nama} className="field"><label>{k.nama}{k.satuan ? ` (${k.satuan})` : ''}</label>
                    {k.jenis === 'pilihan'
                      ? <select value={isian.kesehatan[k.nama] || ''} onChange={e => ubah('kesehatan', k.nama, e.target.value)}><option value="">—</option>{p.pilihanKesehatan.map(o => <option key={o}>{o}</option>)}</select>
                      : <input inputMode="decimal" value={isian.kesehatan[k.nama] || ''} placeholder={k.satuan ? `mis. ${k.satuan === 'Kg' ? '15,5' : '105'}` : ''} onChange={e => ubah('kesehatan', k.nama, e.target.value)} />}
                  </div>
                ))}
                {[['sakit', 'Sakit'], ['izin', 'Izin'], ['alpha', 'Alpa / tanpa keterangan']].map(([k, l]) => (
                  <div key={k} className="field"><label>{l} (hari) <span className="paud-chip auto">dari presensi: {presensiOtomatis[k]}</span></label>
                    <input type="number" min="0" value={(isian.presensi || presensiOtomatis)[k]} onChange={e => setIsian(x => ({ ...x, presensi: { ...(x.presensi || presensiOtomatis), [k]: Number(e.target.value) || 0 } }))} /></div>
                ))}
                {!siswa.nisn && <p className="paud-kosong span2">Anak ini belum punya NISN, jadi presensi otomatis tidak terbaca. Isi jumlah hari secara manual.</p>}
              </div>
            )}
          </fieldset>
        </>
      )}
    </Modal>
  );
}
