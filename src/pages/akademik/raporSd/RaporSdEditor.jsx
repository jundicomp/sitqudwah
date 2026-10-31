import { useMemo, useState } from 'react';
import Modal from '../../../components/common/Modal';
import FotoDriveField from '../../../components/common/FotoDrive';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { bolehMenerbitkan, isAdmin } from '../../../db/akses';
import { mapelUntukTingkat, predikatNilai, badgePredikat, PREDIKAT_LABEL } from '../../../db/akademikFields';
import { kehadiranSemester, buatLookupKkm } from '../../../db/akademikLanjutanFields';
import { tingkatBerikutnya, jenjangBerikutnya } from '../../../db/kenaikanKelasHelpers';
import {
  BADGE_STATUS_SD, isianAwalSd, nilaiMapelSd, susunBarisMapel, susunDokumenSd,
  kalimatAwalDeskripsi, cekKelengkapanSd, terbilangKelas,
} from '../../../db/raporSdFields';
import { todayWIB, formatTanggal } from '../../../db/helpers';
import { upsertRaporSekolahToSheet, bulkUpdateSiswaInSheet, addLogEntry, isConfigured } from '../../../services/googleSheets';
import DokumenRaporSd from './DokumenRaporSd';
import CetakRaporPaud from '../raporPaud/CetakRaporPaud';

const TABS = [
  { id: 'identitas', label: 'Identitas' },
  { id: 'sikap', label: 'A. Sikap' },
  { id: 'pengetahuan', label: 'B. Pengetahuan' },
  { id: 'catatan', label: 'C–D. Catatan, presensi & keputusan' },
];
const IDENTITAS_SEKALI = [
  ['panggilan', 'Nama Panggilan', 'Nama panggilan', 'text'],
  ['agama', 'Agama', 'Agama', 'agama'],
  ['desa', 'Kelurahan/Desa', 'Kelurahan / desa', 'text'],
  ['kecamatan', 'Kecamatan', 'Kecamatan', 'text'],
  ['provinsi', 'Provinsi', 'Provinsi', 'text'],
  ['pekerjaanAyah', 'Pekerjaan Ayah', 'Pekerjaan ayah', 'text'],
  ['pekerjaanIbu', 'Pekerjaan Ibu', 'Pekerjaan ibu', 'text'],
  ['namaWali', 'Nama Wali', 'Nama wali (kalau bukan orang tua)', 'text'],
  ['pekerjaanWali', 'Pekerjaan Wali', 'Pekerjaan wali', 'text'],
  ['alamatWali', 'Alamat Wali', 'Alamat wali', 'text'],
];
const AGAMA = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
const FRASA_SPIRITUAL = ['taat beribadah', 'berperilaku syukur', 'selalu berdoa sebelum dan sesudah melakukan kegiatan', 'khusyuk saat melakukan ibadah', 'rajin sholat berjamaah', 'gemar membaca Al-Qur\'an'];
const FRASA_SOSIAL = ['jujur', 'disiplin', 'bertanggung jawab', 'santun', 'peduli', 'percaya diri', 'mampu bekerja sama dengan teman'];
const tgl = (iso) => (iso ? formatTanggal(String(iso).slice(0, 10) + 'T00:00:00') : '-');

function gabungIsian(awal, simpan) {
  if (!simpan) return awal;
  return { ...awal, ...simpan, mapel: { ...awal.mapel, ...(simpan.mapel || {}) } };
}

export default function RaporSdEditor({ siswa, rombel, ta, semester, record, raporLama, onClose }) {
  const { pengaturanSd: p, nilai, kkm, presensi, guru, tahunAjaran, refreshRaporSekolah, refreshSiswa, toast, mapelList } = useAppData();
  const { currentUser } = useAuth();
  const penerbit = bolehMenerbitkan(currentUser);
  const [tab, setTab] = useState('pengetahuan');
  const [pratinjau, setPratinjau] = useState(false);
  const [cetak, setCetak] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [status, setStatus] = useState(record?.status || 'Belum Diisi');
  const terkunci = status === 'Terbit';

  const daftarMapel = useMemo(() => mapelUntukTingkat(rombel.tingkat), [rombel.tingkat, mapelList]); // eslint-disable-line react-hooks/exhaustive-deps
  const nilaiPerMapel = useMemo(() => nilaiMapelSd(nilai, siswa, ta, semester, p.bobot), [nilai, siswa, ta, semester, p.bobot]);
  const baris = useMemo(() => susunBarisMapel(daftarMapel, nilaiPerMapel), [daftarMapel, nilaiPerMapel]);
  const semuaMapel = useMemo(() => baris.flatMap(b => (b.kelompok ? b.anak.map(a => a.mapel) : [b.mapel])), [baris]);
  const lookupKkm = useMemo(() => buatLookupKkm(kkm), [kkm]);
  const kkmOf = (m) => lookupKkm(ta, rombel.tingkat, m);
  const taObj = tahunAjaran.find(x => x.label === ta);
  const hadir = useMemo(() => (siswa.nisn ? kehadiranSemester(presensi, siswa.nisn, taObj, semester) : { Sakit: 0, Izin: 0, Alpha: 0 }), [presensi, siswa, taObj, semester]);
  const presensiOtomatis = { sakit: hadir.Sakit, izin: hadir.Izin, alpha: hadir.Alpha };
  const waliNiy = guru.find(g => g.nama === rombel.wali)?.nip || '';
  const tingkatBerikut = tingkatBerikutnya(rombel.tingkat) || jenjangBerikutnya(rombel.tingkat)?.tingkat || '';

  const [isian, setIsian] = useState(() => {
    const awal = isianAwalSd();
    if (record?.isian && Object.keys(record.isian).length) return gabungIsian(awal, record.isian);
    if (raporLama) {
      // Rapor dari versi lama (sebelum v1.48.0): bawa isian yg masih relevan.
      return { ...awal, sikapSpiritual: raporLama.sikapSpiritual || '', sikapSosial: raporLama.sikapSosial || '', catatan: raporLama.catatan || '',
        presensi: raporLama.sakit !== null ? { sakit: raporLama.sakit || 0, izin: raporLama.izin || 0, alpha: raporLama.alpha || 0 } : null };
    }
    return awal;
  });
  const [identitas, setIdentitas] = useState(() => Object.fromEntries(IDENTITAS_SEKALI.map(([k]) => [k, siswa[k] || ''])));
  const [foto, setFoto] = useState(siswa.foto || '');
  const ubahMapel = (m, patch) => setIsian(x => ({ ...x, mapel: { ...x.mapel, [m]: { ...(x.mapel[m] || {}), ...patch } } }));
  const panggilan = identitas.panggilan || siswa.nama.split(' ')[0];
  const siswaKini = { ...siswa, ...identitas, foto };
  const nilaiAkhir = (m) => { const o = isian.mapel[m]?.nilai; return o !== undefined && o !== '' && o !== null ? Number(o) : (nilaiPerMapel[m]?.nilai ?? null); };

  const susun = (tanggal) => susunDokumenSd({ p, siswa: siswaKini, isian, rombel, ta, semester, presensiOtomatis, nilaiPerMapel, daftarMapel, kkmOf, waliNiy, tanggal, tingkatBerikut });
  const dokumen = record?.status === 'Terbit' && record?.arsip && status === 'Terbit' ? record.arsip : susun(record?.tanggalTerbit || todayWIB());
  const kurang = cekKelengkapanSd(isian, semuaMapel, nilaiPerMapel);

  function isiKalimatAwalSemua() {
    let n = 0;
    setIsian(x => {
      const mapel = { ...x.mapel };
      semuaMapel.forEach(m => {
        const v = nilaiAkhir(m);
        if (v === null || (mapel[m]?.deskripsi || '').trim()) return;
        mapel[m] = { ...(mapel[m] || {}), deskripsi: kalimatAwalDeskripsi(p, panggilan, v) };
        n++;
      });
      return { ...x, mapel };
    });
    setTimeout(() => toast(n ? `Kalimat awal diisi di ${n} deskripsi. Lanjutkan dengan materi yang dikuasai.` : 'Semua deskripsi sudah terisi.'), 0);
  }
  const tambahFrasa = (kunci, frasa) => setIsian(x => {
    const lama = (x[kunci] || '').trim();
    if (!lama) return { ...x, [kunci]: `${panggilan} ${frasa}` };
    return { ...x, [kunci]: `${lama.replace(/[.]$/, '')}, ${frasa}` };
  });

  async function simpan(statusBaru) {
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    if (!siswa.idSiswa) { toast('Siswa ini belum punya ID Siswa. Klik "Buat ID sekarang" di atas daftar dulu.', 'error'); return; }
    if ((statusBaru === 'Diajukan' || statusBaru === 'Terbit') && kurang.length) {
      toast(`Belum lengkap: ${kurang.slice(0, 4).join(', ')}${kurang.length > 4 ? ', …' : ''}.`, 'error'); return;
    }
    setMenyimpan(true);
    try {
      const patch = {};
      IDENTITAS_SEKALI.forEach(([k, kolom]) => { if (String(identitas[k] || '') !== String(siswa[k] || '')) patch[kolom] = String(identitas[k] || '').trim(); });
      if (foto !== (siswa.foto || '')) patch['Foto'] = foto;
      if (Object.keys(patch).length) { await bulkUpdateSiswaInSheet([{ no: siswa.no, patch }]); refreshSiswa(); }
      const tanggalTerbit = statusBaru === 'Terbit' ? (isian.tanggal || todayWIB()) : '';
      const arsip = statusBaru === 'Terbit' ? susun(tanggalTerbit) : null;
      await upsertRaporSekolahToSheet([{
        'Tahun Ajaran': ta, Semester: semester, 'ID Siswa': siswa.idSiswa, NISN: siswa.nisn, 'Nama Siswa': siswa.nama,
        Tingkat: rombel.tingkat, Rombel: rombel.rombel, Isian: JSON.stringify(isian), Status: statusBaru,
        'Tanggal Terbit': tanggalTerbit, Arsip: arsip ? JSON.stringify(arsip) : '',
        'Diubah Oleh': currentUser.nama, 'Diubah Pada': new Date().toISOString(),
      }]);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: `Rapor SD: ${statusBaru}`, modul: 'Rapor Digital', detail: `${siswa.nama}, ${ta} ${semester}` });
      await refreshRaporSekolah();
      setStatus(statusBaru);
      toast({ Draft: 'Rapor tersimpan sebagai draft.', Diajukan: 'Rapor diajukan ke kepala sekolah.', Terbit: 'Rapor diterbitkan dan diarsipkan.' }[statusBaru] || 'Tersimpan.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "raporSekolah" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
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

  const barisMapel = (m, label) => {
    const auto = nilaiPerMapel[m];
    const v = nilaiAkhir(m);
    const pr = v === null ? '' : predikatNilai(v);
    const k = kkmOf(m);
    return (
      <tr key={m}>
        <td style={{ minWidth: 150 }}><b>{label}</b><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{auto ? `${auto.jumlah} penilaian · otomatis ${auto.nilai}` : 'belum ada nilai'}{k !== null ? ` · KKM ${k}` : ''}</div></td>
        <td style={{ width: 86 }}><input className="input-cell" type="number" min="0" max="100" value={isian.mapel[m]?.nilai ?? ''} placeholder={auto ? String(auto.nilai) : '—'} onChange={e => ubahMapel(m, { nilai: e.target.value })} aria-label={`Nilai rapor ${m}`} title="Kosongkan untuk memakai nilai otomatis" /></td>
        <td style={{ width: 70 }}>{pr ? <span className={`badge ${badgePredikat(pr)}`} title={PREDIKAT_LABEL[pr]}>{pr}</span> : '—'}</td>
        <td>
          <textarea rows={2} className="input-cell" style={{ width: '100%', resize: 'vertical' }} value={isian.mapel[m]?.deskripsi || ''} placeholder={v === null ? 'Belum ada nilai' : kalimatAwalDeskripsi(p, panggilan, v) + '… (materi yang dikuasai)'} onChange={e => ubahMapel(m, { deskripsi: e.target.value })} aria-label={`Deskripsi ${m}`} />
        </td>
      </tr>
    );
  };

  return (
    <Modal wide title={`Rapor ${siswa.nama}`} subtitle={`${rombel.label} · ${ta} · Semester ${semester}`} onClose={onClose} actions={tombol}>
      {pratinjau ? (
        <div style={{ background: '#E9EDEA', padding: 12, borderRadius: 10, maxHeight: '64vh', overflow: 'auto' }}>
          <DokumenRaporSd dokumen={dokumen} />
          {cetak && <CetakRaporPaud dokumen={dokumen} onSelesai={() => setCetak(false)} />}
        </div>
      ) : (
        <>
          <div className="ringkas-bar" style={{ marginBottom: 12 }}>
            <span className={`badge ${BADGE_STATUS_SD[status]}`}>{status}{record?.tanggalTerbit && status === 'Terbit' ? ` · ${record.tanggalTerbit}` : ''}</span>
            <span className="badge badge-muted">{Object.keys(nilaiPerMapel).length} mapel bernilai</span>
            {kurang.length > 0 ? <span className="badge badge-gold" title={kurang.join(', ')}>{kurang.length} bagian belum lengkap</span> : <span className="badge badge-green">Isian lengkap</span>}
            {terkunci && <span className="badge badge-blue">Terkunci — sudah terbit &amp; diarsipkan</span>}
          </div>
          <div className="seg-tabs" style={{ marginBottom: 14 }}>
            {TABS.map(x => <button key={x.id} className={`seg-tab ${tab === x.id ? 'active' : ''}`} onClick={() => setTab(x.id)}>{x.label}</button>)}
          </div>
          <fieldset disabled={terkunci} style={{ border: 0, padding: 0, margin: 0 }}>
            {tab === 'identitas' && (
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)' }}>
                  <span className="paud-chip auto">otomatis</span> dari Data Siswa · <span className="paud-chip sekali">isi sekali</span> ikut tersimpan ke Data Siswa. Identitas sekolah &amp; kepala sekolah diatur di tab Pengaturan Rapor SD.
                </p>
                <div className="form-grid">
                  {[['Nama lengkap', siswa.nama], ['NISN / ID Siswa', [siswa.nisn, siswa.idSiswa].filter(Boolean).join(' / ')], ['Jenis kelamin', siswa.jenisKelamin], ['Tempat, tanggal lahir', [siswa.tempatLahir, tgl(siswa.tanggalLahir)].filter(Boolean).join(', ')], ['Alamat (jalan)', siswa.alamat], ['Kabupaten/Kota', siswa.kabupatenKota], ['Nama ayah', siswa.namaAyah], ['Nama ibu', siswa.namaIbu]].map(([l, v]) => (
                    <div key={l} className="field"><label>{l} <span className="paud-chip auto">otomatis</span></label><input value={v || ''} readOnly style={{ background: '#F5F8F6' }} /></div>
                  ))}
                  {IDENTITAS_SEKALI.map(([k, , label, jenis]) => (
                    <div key={k} className="field"><label>{label} <span className="paud-chip sekali">isi sekali</span></label>
                      {jenis === 'agama'
                        ? <select value={identitas[k]} onChange={e => setIdentitas(x => ({ ...x, [k]: e.target.value }))}><option value="">—</option>{AGAMA.map(a => <option key={a}>{a}</option>)}</select>
                        : <input value={identitas[k]} onChange={e => setIdentitas(x => ({ ...x, [k]: e.target.value }))} />}
                    </div>
                  ))}
                  <div className="field"><label>Pas foto <span className="paud-chip sekali">isi sekali</span></label>
                    <FotoDriveField value={foto} onChange={setFoto} nama={siswa.nama} onError={m => toast(m, 'error')} /></div>
                </div>
              </div>
            )}

            {tab === 'sikap' && (
              <div>
                {[['sikapSpiritual', 'Sikap spiritual', FRASA_SPIRITUAL], ['sikapSosial', 'Sikap sosial', FRASA_SOSIAL]].map(([k, l, frasa]) => (
                  <div key={k} className="field" style={{ marginBottom: 14 }}>
                    <label>{l} — deskripsi</label>
                    <textarea rows={3} value={isian[k]} placeholder={`mis. ${panggilan} ${frasa.slice(0, 3).join(', ')}.`} onChange={e => setIsian(x => ({ ...x, [k]: e.target.value }))} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Klik untuk menambahkan:</span>
                      {frasa.map(f => <button key={f} type="button" className="btn btn-sm" onClick={() => tambahFrasa(k, f)}>+ {f}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'pengetahuan' && (
              <div>
                <div className="ringkas-bar" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nilai otomatis dari Nilai Akademik (bobot: {Object.entries(p.bobot).map(([j, w]) => `${j} ${w}`).join(', ')}). Isi kolom nilai hanya kalau ingin mengganti. KKM satuan pendidikan: {p.kkmSatuan}.</span>
                  <button type="button" className="btn btn-sm" onClick={isiKalimatAwalSemua}>Isi kalimat awal deskripsi yang kosong</button>
                </div>
                <div className="table-scroll">
                  <table className="paud-tabel">
                    <thead><tr><th>Muatan pelajaran</th><th>Nilai</th><th>Predikat</th><th>Deskripsi</th></tr></thead>
                    <tbody>
                      {baris.map(b => (b.kelompok
                        ? [<tr key={'k' + b.kelompok}><td colSpan={4} style={{ background: '#F6F8F5', fontWeight: 800 }}>{b.kelompok}</td></tr>,
                          ...b.anak.map((a, i) => barisMapel(a.mapel, `${String.fromCharCode(97 + i)}. ${a.mapel}`))]
                        : barisMapel(b.mapel, b.mapel)))}
                    </tbody>
                  </table>
                </div>
                {!baris.length && <p className="paud-kosong">Belum ada mata pelajaran untuk jenjang kelas ini. Atur di Kurikulum &amp; KKM › Mata Pelajaran.</p>}
              </div>
            )}

            {tab === 'catatan' && (
              <div className="form-grid">
                <div className="field span2"><label>C. Catatan wali kelas</label>
                  <textarea rows={5} value={isian.catatan} placeholder={`mis. "Selamat atas pencapaianmu di semester ini! …" Semangat terus ${panggilan}!`} onChange={e => setIsian(x => ({ ...x, catatan: e.target.value }))} /></div>
                {[['sakit', 'Sakit'], ['izin', 'Izin'], ['alpha', 'Tanpa keterangan']].map(([k, l]) => (
                  <div key={k} className="field"><label>{l} (hari) <span className="paud-chip auto">dari presensi: {presensiOtomatis[k]}</span></label>
                    <input type="number" min="0" value={(isian.presensi || presensiOtomatis)[k]} onChange={e => setIsian(x => ({ ...x, presensi: { ...(x.presensi || presensiOtomatis), [k]: Number(e.target.value) || 0 } }))} /></div>
                ))}
                {semester === 'Genap' && (
                  <div className="field"><label>Keputusan akhir tahun</label>
                    <select value={isian.keputusan || 'Naik'} onChange={e => setIsian(x => ({ ...x, keputusan: e.target.value }))}>
                      <option value="Naik">{tingkatBerikut ? `Naik ke kelas ${terbilangKelas(tingkatBerikut)}` : 'Lulus'}</option>
                      <option value="Tinggal">Tinggal di kelas {terbilangKelas(rombel.tingkat)}</option>
                    </select></div>
                )}
                <div className="field"><label>Tanggal rapor</label>
                  <input type="date" value={isian.tanggal || ''} onChange={e => setIsian(x => ({ ...x, tanggal: e.target.value }))} />
                  <small style={{ color: 'var(--muted)' }}>Kosong = tanggal saat diterbitkan.</small></div>
                {!siswa.nisn && <p className="paud-kosong span2">Siswa ini belum punya NISN, jadi nilai & presensi otomatis tidak terbaca. Isi NISN di Data Siswa.</p>}
              </div>
            )}
          </fieldset>
        </>
      )}
    </Modal>
  );
}
