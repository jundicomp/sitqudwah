import { useMemo, useState } from 'react';
import { terapkanTtd } from '../../../db/penandatanganFields';
import Modal from '../../../components/common/Modal';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { bolehLihatSemuaKelas, bolehMenerbitkan, isAdmin } from '../../../db/akses';
import { namaTingkat, jenjangDariTingkat } from '../../../config/jenjang';
import { siswaDiRombel } from '../../../db/akademikFields';
import { tpUntuk, faseDariTingkat } from '../../../db/kurikulumFields';
import {
  DIMENSI_SET, LEVEL_KOGNITIF, MODA, DAFTAR_MODEL, BADGE_STATUS_MODUL, pertemuanKosong, langkahSesuaiModel,
  buatIdModul, cekKelengkapanModul, susunDokumenModul, teksAlokasi, menitPertemuan, namaModel, jpTotal,
  formatModul, formatSama, judulBagian, barisSheetModul,
} from '../../../db/modulAjarFields';
import { upsertModulAjarToSheet, addLogEntry, isConfigured } from '../../../services/googleSheets';
import DokumenModul from './DokumenModul';
import CetakRaporPaud from '../raporPaud/CetakRaporPaud';

const salin = (x) => JSON.parse(JSON.stringify(x));
const ada = (v) => !!String(v ?? '').trim();
const geser = (arr, i, n) => { const a = [...arr]; const j = i + n; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

function Bagian({ no, judul, sub, buka, onToggle, lengkap, children }) {
  return (
    <div className={`md-bagian ${buka ? 'buka' : ''}`}>
      <button type="button" className="md-bagian-h" onClick={onToggle} aria-expanded={buka}>
        <span className={`md-titik ${lengkap ? 'ok' : ''}`} aria-hidden="true" />
        <span><b>{no}. {judul}</b>{sub && <small>{sub}</small>}</span>
        <span className="md-panah" aria-hidden="true">▸</span>
      </button>
      {buka && <div className="md-bagian-isi">{children}</div>}
    </div>
  );
}
function Area({ label, value, onChange, rows = 3, placeholder, bantuan, aksi }) {
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><label>{label}</label>{aksi}</div>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      {bantuan && <small style={{ color: 'var(--muted)' }}>{bantuan}</small>}
    </div>
  );
}

const SUB_BAGIAN = {
  identitas: 'Bab, materi pokok, alokasi waktu, model, moda, sarana, TP yang dicakup',
  cp: 'Otomatis dari Kurikulum & KKM', lintas: 'Keterkaitan dengan mata pelajaran lain', iktp: 'Indikator + level kognitif',
  pemicu: 'Topik kontekstual', identifikasi: 'Kesiapan murid, karakteristik materi pelajaran',
  desain: 'Tujuan, topik, praktik pedagogis, lingkungan, pemanfaatan digital', diferensiasi: 'Konten, proses, produk',
  dimensi: 'Dimensi yang disasar dan wujud penerapannya', kegiatan: 'Per pertemuan · tabel tahapan, alokasi waktu, kegiatan guru & murid',
  asesmen: 'Diagnostik, formatif, sumatif — teknik, instrumen, waktu', remedial: 'Remedial & pengayaan', penutup: 'Paragraf penutup',
  lampiran: 'LKPD, materi, media (link) — opsional',
};

// Bagian buatan sekolah (Format Modul): paragraf bebas atau tabel komponen | deskripsi.
function BagianTambahan({ b, nilai, onChange }) {
  if (b.tipe === 'tabel') {
    const tetap = (b.komponen || []).filter(Boolean);
    const simpan = Array.isArray(nilai) ? nilai : [];
    // Baris = komponen tetap dari format + baris tambahan guru (yg tidak ada di daftar tetap).
    const baris = [...tetap.map(k => ({ komponen: k, deskripsi: simpan.find(r => r.komponen === k)?.deskripsi || '', tetap: true })),
      ...simpan.filter(r => !tetap.includes(r.komponen) && (r.tambahan || b.bolehTambah !== false)).map(r => ({ ...r, tetap: false }))];
    const kirim = (list) => onChange(list.map(r => ({ komponen: r.komponen, deskripsi: r.deskripsi, ...(r.tetap ? {} : { tambahan: true }) })));
    return (
      <div>
        {baris.map((r, i) => (
          <div key={i} className="md-tabel-baris">
            {r.tetap ? <b>{r.komponen}</b> : <input className="input-cell" value={r.komponen} placeholder="Komponen" aria-label="Komponen" onChange={e => kirim(baris.map((x, j) => (j === i ? { ...x, komponen: e.target.value } : x)))} />}
            <textarea rows={2} className="input-cell" value={r.deskripsi} placeholder="Deskripsi…" aria-label={`Deskripsi ${r.komponen || i + 1}`} onChange={e => kirim(baris.map((x, j) => (j === i ? { ...x, deskripsi: e.target.value } : x)))} />
            {!r.tetap ? <button type="button" className="btn-icon danger" aria-label="Hapus baris" onClick={() => kirim(baris.filter((_, j) => j !== i))}>✕</button> : <span />}
          </div>
        ))}
        {b.bolehTambah !== false && <button type="button" className="btn btn-sm" onClick={() => kirim([...baris, { komponen: '', deskripsi: '', tetap: false }])}>+ Tambah baris</button>}
      </div>
    );
  }
  return <Area label="Isi" rows={4} value={typeof nilai === 'string' ? nilai : ''} onChange={onChange} placeholder={b.petunjuk || 'Tulis isi bagian ini…'} />;
}

// modul: objek modul (normalizeSheetModul) atau draft baru (idModul '').
// pasanganList: pasangan mapel+tingkat yg boleh dipilih saat membuat modul baru.
export default function ModulEditor({ modul, pasanganList, onClose, mulaiPratinjau = false, onSelesaiPeriksa }) {
  const { tp, cp, siswa, nilai, refreshModulAjar, profilSekolah, pengaturanSd, pengaturanModul, toast, penandatangan } = useAppData();
  const { currentUser } = useAuth();
  const semua = bolehLihatSemuaKelas(currentUser);
  const penerbit = bolehMenerbitkan(currentUser);
  const baru = !modul.idModul;
  const [catatanKepsek, setCatatanKepsek] = useState(modul.catatan || '');
  const [m, setM] = useState(() => { const x = salin(modul); delete x.__pratinjau; delete x.__periksa; return x; });
  const [buka, setBuka] = useState(baru ? 'identitas' : 'kegiatan');
  const [pertemuanAktif, setPertemuanAktif] = useState(0);
  const [pratinjau, setPratinjau] = useState(mulaiPratinjau);
  const [cetak, setCetak] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [berubah, setBerubah] = useState(false);
  const bolehUbah = semua || (!!currentUser?.guru && (baru || m.guru === currentUser.guru));
  const terkunci = !bolehUbah || m.status === 'Diajukan' || m.status === 'Disetujui';
  const isi = m.isi;

  const set = (patch) => { setM(x => ({ ...x, ...patch })); setBerubah(true); };
  const setIsi = (patch) => { setM(x => ({ ...x, isi: { ...x.isi, ...(typeof patch === 'function' ? patch(x.isi) : patch) } })); setBerubah(true); };
  const toggle = (n) => setBuka(b => (b === n ? 0 : n));

  const tpPilihan = useMemo(() => (m.mapel && m.tingkat ? tpUntuk(tp, m.mapel, m.tingkat, m.semester) : []), [tp, m.mapel, m.tingkat, m.semester]);
  const tpTerpilih = tpPilihan.filter(t => m.tp.includes(t.idTp));
  const tpHilang = m.tp.filter(id => !tpPilihan.some(t => t.idTp === id));
  const fase = faseDariTingkat(m.tingkat);
  const cpFase = cp.filter(c => c.mapel === m.mapel && c.fase === fase && c.capaian);
  const target = menitPertemuan(isi);
  const setDim = DIMENSI_SET[isi.setDimensi] || DIMENSI_SET.p3;

  // Data pendukung utk "kesiapan murid".
  const pendukung = useMemo(() => {
    if (!m.tingkat) return null;
    const rombel = m.rombel ? m.rombel.split(',').map(x => x.trim()).filter(Boolean) : [];
    const anak = rombel.length ? rombel.flatMap(r => siswaDiRombel(siswa, m.tingkat, r)) : siswa.filter(x => x.kelasTingkat === m.tingkat && (x.status || 'Aktif') === 'Aktif');
    const nisn = new Set(anak.map(a => a.nisn).filter(Boolean));
    const nil = nilai.filter(n => n.mapel === m.mapel && n.tahunAjaran === m.tahunAjaran && nisn.has(n.nisn) && n.nilai !== null).map(n => n.nilai);
    const rata = nil.length ? Math.round((nil.reduce((a, b) => a + b, 0) / nil.length) * 10) / 10 : null;
    return { jumlah: anak.length, laki: anak.filter(a => /^l/i.test(a.jenisKelamin || '')).length, rata, jmlNilai: nil.length };
  }, [m.tingkat, m.rombel, m.mapel, m.tahunAjaran, siswa, nilai]);

  const kurang = cekKelengkapanModul(m);
  const p = pengaturanSd || {};
  const dokumenHidup = terapkanTtd(susunDokumenModul({
    m, tpList: tp, cpList: cp, namaTingkat, jenjang: jenjangDariTingkat(m.tingkat),
    sekolah: [p.namaSingkat, p.desa].filter(Boolean).join(' ') || p.namaSekolah || profilSekolah?.nama || '',
    kepala: p.namaKepala || profilSekolah?.kepalaSekolah || '', kepalaNiy: p.niyKepala || '', tempat: p.tempat || '',
  }), penandatangan.SD);
  // Modul yg sudah disetujui dicetak dari ARSIP (salinan saat disetujui), bukan data terkini.
  const dokumen = m.status === 'Disetujui' && m.arsip ? m.arsip : dokumenHidup;

  function pilihPasangan(kunci) {
    const ps = pasanganList.find(x => x.kunci === kunci);
    if (!ps) return;
    set({ mapel: ps.mapel, tingkat: ps.tingkat, rombel: ps.rombel.join(', '), guru: semua ? (ps.guru[0] || m.guru) : currentUser.guru, tp: [] });
  }
  function ubahPertemuan(n) {
    const jml = Math.max(1, Math.min(12, Number(n) || 1));
    setIsi(x => {
      const keg = [...x.kegiatan];
      while (keg.length < jml) keg.push(pertemuanKosong(keg.length + 1));
      return { pertemuan: jml, kegiatan: keg };
    });
    if (pertemuanAktif >= jml) setPertemuanAktif(jml - 1);
  }
  const ubahKeg = (k, patch) => setIsi(x => ({ kegiatan: x.kegiatan.map((pt, j) => (j === k ? { ...pt, ...(typeof patch === 'function' ? patch(pt) : patch) } : pt)) }));
  const ubahLangkah = (k, j, patch) => ubahKeg(k, pt => ({ langkah: pt.langkah.map((l, i) => (i === j ? { ...l, ...patch } : l)) }));
  function isiTahapanModel(k) {
    const pt = isi.kegiatan[k];
    if (pt.langkah.some(l => ada(l.teks)) && !window.confirm('Tahapan pertemuan ini sudah berisi kegiatan. Ganti dengan tahapan baru sesuai model?')) return;
    ubahKeg(k, { langkah: langkahSesuaiModel(pt.model || isi.model, target) });
  }
  const teksTp = () => tpTerpilih.map(t => t.tujuan).join(' ');

  // aksiStatus: 'simpan' | 'ajukan' | 'tarik' | 'setujui' | 'kembalikan' | 'buka'
  async function simpan(aksiStatus = 'simpan') {
    if (!m.mapel || !m.tingkat) { toast('Pilih mata pelajaran & kelas dulu.', 'error'); setBuka('identitas'); return; }
    if (!m.judul.trim()) { toast('Materi pokok belum diisi.', 'error'); setBuka('identitas'); return; }
    if (aksiStatus === 'ajukan' && kurang.length) { toast(`Belum bisa diajukan, masih kurang: ${kurang.join(', ')}.`, 'error'); return; }
    if (aksiStatus === 'kembalikan' && !catatanKepsek.trim()) { toast('Tulis catatan untuk guru sebelum mengembalikan modul.', 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      const idModul = m.idModul || buatIdModul();
      const sekarang = new Date().toISOString();
      const statusBaru = { simpan: m.status || 'Draft', ajukan: 'Diajukan', tarik: 'Draft', setujui: 'Disetujui', kembalikan: 'Dikembalikan', buka: 'Draft' }[aksiStatus];
      const patch = { idModul, status: statusBaru, diubahOleh: currentUser.nama, diubahPada: sekarang };
      if (aksiStatus === 'setujui') Object.assign(patch, { disetujuiOleh: currentUser.nama, tanggalDisetujui: sekarang.slice(0, 10), arsip: { ...dokumenHidup, status: 'Disetujui' }, catatan: catatanKepsek.trim() });
      if (aksiStatus === 'kembalikan') Object.assign(patch, { catatan: catatanKepsek.trim(), disetujuiOleh: '', tanggalDisetujui: '', arsip: null });
      if (aksiStatus === 'buka' || aksiStatus === 'tarik') Object.assign(patch, { disetujuiOleh: '', tanggalDisetujui: '', arsip: null });
      await upsertModulAjarToSheet([barisSheetModul(m, patch)]);
      const LOG = { simpan: baru ? 'Buat Modul Ajar' : 'Ubah Modul Ajar', ajukan: 'Ajukan Modul Ajar', tarik: 'Tarik Pengajuan Modul Ajar', setujui: 'Setujui Modul Ajar', kembalikan: 'Kembalikan Modul Ajar', buka: 'Buka Kembali Modul Ajar' };
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: LOG[aksiStatus], modul: 'Modul Ajar', detail: `${m.judul.trim()} — ${m.mapel} ${namaTingkat(m.tingkat)} (${m.guru})` });
      setM(x => ({ ...x, ...patch }));
      setBerubah(false);
      await refreshModulAjar();
      toast({ simpan: 'Modul ajar tersimpan.', ajukan: 'Modul diajukan ke kepala sekolah.', tarik: 'Pengajuan ditarik, modul kembali menjadi draft.', setujui: 'Modul disetujui dan diarsipkan.', kembalikan: 'Modul dikembalikan ke guru dengan catatan.', buka: 'Modul dibuka kembali menjadi draft.' }[aksiStatus]);
      if (['setujui', 'kembalikan'].includes(aksiStatus) && onSelesaiPeriksa) onSelesaiPeriksa();
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "modulAjar" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  const pemilik = !!currentUser?.guru && m.guru === currentUser.guru;
  const periksa = penerbit && m.status === 'Diajukan';
  const aksi = (
    <>
      {pratinjau
        ? <><button className="btn" onClick={() => setPratinjau(false)}>{terkunci ? 'Lihat isian' : 'Kembali ke isian'}</button><button className="btn" onClick={() => setCetak(true)}>🖨️ Cetak / PDF</button></>
        : <button className="btn" onClick={() => setPratinjau(true)} disabled={!m.mapel}>Pratinjau</button>}
      {!terkunci && <button className="btn" onClick={() => simpan('simpan')} disabled={menyimpan || (!berubah && !baru)}>{menyimpan ? 'Menyimpan…' : 'Simpan draft'}</button>}
      {!terkunci && (pemilik || semua) && m.idModul && <button className="btn btn-primary" onClick={() => simpan('ajukan')} disabled={menyimpan}>Ajukan ke kepala sekolah</button>}
      {m.status === 'Diajukan' && pemilik && !penerbit && <button className="btn" onClick={() => simpan('tarik')} disabled={menyimpan}>Tarik pengajuan</button>}
      {periksa && <button className="btn" onClick={() => simpan('kembalikan')} disabled={menyimpan}>Kembalikan</button>}
      {periksa && <button className="btn btn-primary" onClick={() => simpan('setujui')} disabled={menyimpan}>Setujui</button>}
      {m.status === 'Disetujui' && isAdmin(currentUser) && <button className="btn" onClick={() => { if (window.confirm('Buka kembali modul yang sudah disetujui? Statusnya kembali menjadi draft dan arsip persetujuannya dilepas.')) simpan('buka'); }} disabled={menyimpan}>Buka kembali (jadi draft)</button>}
    </>
  );

  const ok = {
    identitas: ada(m.judul) && m.tp.length > 0 && ada(namaModel(isi)),
    cp: cpFase.length > 0,
    lintas: ada(isi.lintasDisiplin),
    iktp: isi.iktp.some(x => ada(x.teks)),
    pemicu: ada(isi.pertanyaanPemicu),
    identifikasi: ada(isi.kesiapan) && ada(isi.karakteristik),
    desain: ada(isi.topik) && ada(isi.praktik),
    diferensiasi: ada(isi.diferensiasi.konten) || ada(isi.diferensiasi.proses) || ada(isi.diferensiasi.produk),
    dimensi: isi.dimensi.length > 0,
    kegiatan: isi.kegiatan.slice(0, isi.pertemuan).every(pt2 => pt2.langkah.some(l => ada(l.teks))),
    asesmen: isi.asesmen.some(a => ada(a.instrumen)),
    remedial: ada(isi.remedial) && ada(isi.pengayaan),
    penutup: ada(isi.penutup),
    lampiran: isi.lampiran.length > 0,
  };
  const okTambahan = (b) => { const v = isi.tambahan?.[b.id]; return Array.isArray(v) ? v.some(r => ada(r.deskripsi)) : ada(v); };
  const formatIni = formatModul(isi);
  const bagianTampil = formatIni.filter(b => b.tampil);
  const formatBeda = !!pengaturanModul && !formatSama(formatIni, pengaturanModul.format);
  function pakaiFormatTerbaru() {
    setIsi({ format: salin(pengaturanModul.format) });
    toast('Modul ini sekarang memakai format terbaru. Isian yang sudah ada tetap tersimpan.');
  }
  const pt = isi.kegiatan[pertemuanAktif] || pertemuanKosong(pertemuanAktif + 1);
  const totalMenit = pt.langkah.reduce((a, l) => a + (Number(l.menit) || 0), 0);

  const ISI_BAGIAN = {
    identitas: (
      <>
          <div className="form-grid">
            {baru && (
              <div className="field span2"><label>Mata pelajaran &amp; kelas</label>
                <select value={m.mapel ? `${m.mapel}|${m.tingkat}` : ''} onChange={e => pilihPasangan(e.target.value)}>
                  <option value="">— pilih —</option>
                  {pasanganList.map(ps => <option key={ps.kunci} value={ps.kunci}>{ps.mapel} · {namaTingkat(ps.tingkat)}{ps.rombel.length ? ` (${ps.rombel.join(', ')})` : ''}{semua && ps.guru.length ? ` — ${ps.guru.join(', ')}` : ''}</option>)}
                </select>
                {!pasanganList.length && <small style={{ color: '#8A5A00' }}>Belum ada mapel yang tercatat Anda ajar di Jadwal Pelajaran tahun ajaran &amp; semester ini.</small>}
              </div>
            )}
            <div className="field"><label>Bab</label><input value={isi.bab} placeholder="mis. Pecahan" onChange={e => setIsi({ bab: e.target.value })} /></div>
            <div className="field"><label>Materi pokok</label><input value={m.judul} placeholder="mis. Membandingkan Pecahan" onChange={e => set({ judul: e.target.value })} /></div>
            <div className="field"><label>Jumlah pertemuan</label><input type="number" min="1" max="12" value={isi.pertemuan} onChange={e => ubahPertemuan(e.target.value)} /></div>
            <div className="field"><label>JP per pertemuan</label><input type="number" min="1" value={isi.jpPerPertemuan} onChange={e => setIsi({ jpPerPertemuan: e.target.value })} /></div>
            <div className="field"><label>Menit per JP</label><input type="number" min="1" value={isi.menitPerJp} onChange={e => setIsi({ menitPerJp: e.target.value })} /></div>
            <div className="field"><label>Alokasi waktu (otomatis)</label><input readOnly value={teksAlokasi(isi)} style={{ background: '#F5F8F6' }} /></div>
            <div className="field"><label>Model pembelajaran</label>
              <select value={isi.model} onChange={e => setIsi({ model: e.target.value })}><option value="">— pilih —</option>{DAFTAR_MODEL.map(x => <option key={x}>{x}</option>)}</select></div>
            {isi.model === 'Lainnya' && <div className="field"><label>Nama model</label><input value={isi.modelLain} onChange={e => setIsi({ modelLain: e.target.value })} /></div>}
            <div className="field"><label>Moda pembelajaran</label>
              <select value={isi.moda} onChange={e => setIsi({ moda: e.target.value })}>{MODA.map(x => <option key={x}>{x}</option>)}</select></div>
            <div className="field"><label>Kurikulum</label><input value={isi.kurikulum} onChange={e => setIsi({ kurikulum: e.target.value })} /></div>
            <div className="field span2"><label>Sarana dan prasarana</label><input value={isi.sarana} placeholder="mis. Buku paket, papan tulis, kertas lipat" onChange={e => setIsi({ sarana: e.target.value })} /></div>
          </div>
          <div className="field" style={{ marginTop: 6 }}>
            <label>Tujuan pembelajaran yang dicakup ({m.tp.length} dipilih)</label>
            {!m.mapel ? <p className="paud-kosong" style={{ margin: 0 }}>Pilih mata pelajaran &amp; kelas dulu.</p>
              : !tpPilihan.length ? <p className="paud-kosong" style={{ margin: 0 }}>Belum ada tujuan pembelajaran {m.mapel} {namaTingkat(m.tingkat)} semester {m.semester}. Tambahkan di tab Kelas &amp; Mapel Saya atau Kurikulum &amp; KKM.</p>
                : (
                  <div className="md-tp-list">
                    {tpPilihan.map(t2 => (
                      <label key={t2.idTp} className={`md-tp ${m.tp.includes(t2.idTp) ? 'on' : ''}`}>
                        <input type="checkbox" checked={m.tp.includes(t2.idTp)} onChange={e => set({ tp: e.target.checked ? [...m.tp, t2.idTp] : m.tp.filter(x => x !== t2.idTp) })} />
                        <code>{t2.kode}</code><span>{t2.tujuan}{t2.elemen ? <small> · {t2.elemen}</small> : null}{t2.jp ? <small> · {t2.jp} JP</small> : null}</span>
                      </label>
                    ))}
                  </div>
                )}
            {tpHilang.length > 0 && <small style={{ color: '#8A5A00' }}>{tpHilang.length} TP yang dulu dipilih sudah tidak ada di daftar aktif.</small>}
          </div>
      </>
    ),
    cp: (
      <>
          {cpFase.length ? (
            <div className="md-cp-lihat">
              {cpFase.map(c => <div key={c.elemen}><b>{c.elemen}</b><span>{c.capaian}</span></div>)}
              <small>Diambil dari Kurikulum &amp; KKM › Capaian &amp; Tujuan Pembelajaran ({m.mapel}, Fase {fase}). Ubah di sana kalau perlu.</small>
            </div>
          ) : <p className="paud-kosong" style={{ marginTop: 0 }}>{m.mapel ? `CP ${m.mapel} Fase ${fase || '?'} belum diisi di Kurikulum & KKM.` : 'Pilih mata pelajaran & kelas dulu.'}</p>}
      </>
    ),
    lintas: (
      <>
          <Area label="Isi" rows={4} value={isi.lintasDisiplin} onChange={v => setIsi({ lintasDisiplin: v })} placeholder="Keterkaitan materi ini dengan mata pelajaran lain (mis. IPAS, Pendidikan Pancasila, PAI)…" />
      </>
    ),
    iktp: (
      <>
          <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>Indikator Ketercapaian Tujuan Pembelajaran (IKTP)</label>
          {isi.iktp.map((x, k) => (
            <div key={k} className="md-iktp-baris">
              <span>{k + 1}.</span>
              <textarea rows={2} className="input-cell" value={x.teks} placeholder="Murid dapat …" aria-label={`IKTP ${k + 1}`} onChange={e => setIsi(s2 => ({ iktp: s2.iktp.map((y, j) => (j === k ? { ...y, teks: e.target.value } : y)) }))} />
              <select className="input-cell" value={x.level} aria-label="Level kognitif" onChange={e => setIsi(s2 => ({ iktp: s2.iktp.map((y, j) => (j === k ? { ...y, level: e.target.value } : y)) }))}>
                <option value="">—</option>{LEVEL_KOGNITIF.map(l => <option key={l}>{l}</option>)}
              </select>
              <button type="button" className="btn-icon danger" aria-label={`Hapus IKTP ${k + 1}`} onClick={() => setIsi(s2 => ({ iktp: s2.iktp.filter((_, j) => j !== k) }))}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button type="button" className="btn btn-sm" onClick={() => setIsi(s2 => ({ iktp: [...s2.iktp, { teks: '', level: '' }] }))}>+ Tambah IKTP</button>
            {tpTerpilih.length > 0 && <button type="button" className="btn btn-sm" onClick={() => setIsi(s2 => ({ iktp: [...s2.iktp, ...tpTerpilih.map(t2 => ({ teks: t2.tujuan.replace(/^peserta didik/i, 'Murid'), level: '' }))] }))}>Ambil dari TP terpilih</button>}
          </div>
      </>
    ),
    pemicu: (
      <>
          <Area label="Pertanyaan pemicu" rows={4} value={isi.pertanyaanPemicu} onChange={v => setIsi({ pertanyaanPemicu: v })} placeholder="mis. Bayangkan kalian memiliki dua potong kue yang sama besar…" />
      </>
    ),
    identifikasi: (
      <>
          {pendukung && (
            <div className="md-pendukung">
              <span>👥 <b>{pendukung.jumlah}</b> siswa{pendukung.jumlah ? ` (${pendukung.laki} L, ${pendukung.jumlah - pendukung.laki} P)` : ''}</span>
              <span>📊 Rata-rata nilai {m.mapel} tahun ini: <b>{pendukung.rata ?? '—'}</b>{pendukung.jmlNilai ? ` dari ${pendukung.jmlNilai} nilai` : ''}</span>
            </div>
          )}
          <Area label="Kesiapan murid" rows={4} value={isi.kesiapan} onChange={v => setIsi({ kesiapan: v })} placeholder="Pengetahuan awal, pengalaman, kesulitan yang mungkin dialami, kebutuhan belajar…" />
          <Area label="Karakteristik materi pelajaran" rows={4} value={isi.karakteristik} onChange={v => setIsi({ karakteristik: v })} placeholder="Posisi materi dalam kurikulum, sifat materi (konkret/abstrak), keterkaitan dengan materi sebelumnya…" />
      </>
    ),
    desain: (
      <>
          <Area label="Tujuan pembelajaran" rows={3} value={isi.tujuan} onChange={v => setIsi({ tujuan: v })} placeholder="Melalui pembelajaran ini, murid dapat …"
            aksi={tpTerpilih.length > 0 && <button type="button" className="btn btn-sm" onClick={() => setIsi({ tujuan: `Melalui pembelajaran ini, ${teksTp().replace(/^peserta didik/i, 'murid')}` })}>Isi dari TP</button>}
            bantuan="Kosongkan untuk memakai teks TP yang dipilih." />
          <Area label="Topik pembelajaran" rows={2} value={isi.topik} onChange={v => setIsi({ topik: v })} />
          <Area label="Praktik pedagogis" rows={5} value={isi.praktik} onChange={v => setIsi({ praktik: v })} placeholder={`Bagaimana guru menerapkan ${namaModel(isi) || 'model pembelajaran'}: peran guru, alur kegiatan, kerja kelompok…`} />
          <Area label="Lingkungan pembelajaran" rows={3} value={isi.lingkungan} onChange={v => setIsi({ lingkungan: v })} placeholder="Pengaturan ruang kelas, suasana psikologis, budaya belajar…" />
          <Area label="Pemanfaatan digital" rows={3} value={isi.digital} onChange={v => setIsi({ digital: v })} placeholder="Media digital yang dipakai, atau alternatif luring bila sarana terbatas…" />
      </>
    ),
    diferensiasi: (
      <>
          <Area label="Diferensiasi konten" value={isi.diferensiasi.konten} onChange={v => setIsi(s2 => ({ diferensiasi: { ...s2.diferensiasi, konten: v } }))} placeholder="Bagi murid yang kesulitan … ; bagi murid yang sudah paham …" />
          <Area label="Diferensiasi proses" value={isi.diferensiasi.proses} onChange={v => setIsi(s2 => ({ diferensiasi: { ...s2.diferensiasi, proses: v } }))} placeholder="Pengelompokan, waktu tambahan, pendampingan…" />
          <Area label="Diferensiasi produk" value={isi.diferensiasi.produk} onChange={v => setIsi(s2 => ({ diferensiasi: { ...s2.diferensiasi, produk: v } }))} placeholder="Bentuk hasil karya yang berbeda sesuai kesiapan murid…" />
      </>
    ),
    dimensi: (
      <>
          <div className="field" style={{ maxWidth: 360, marginBottom: 10 }}><label>Acuan dimensi</label>
            <select value={isi.setDimensi} onChange={e => setIsi({ setDimensi: e.target.value, dimensi: [] })}>
              {Object.entries(DIMENSI_SET).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></div>
          {setDim.daftar.map(nama => {
            const d = isi.dimensi.find(x => x.nama === nama);
            return (
              <div key={nama} className={`md-dim ${d ? 'on' : ''}`}>
                <label><input type="checkbox" checked={!!d} onChange={e => setIsi(s2 => ({ dimensi: e.target.checked ? [...s2.dimensi, { nama, wujud: '' }] : s2.dimensi.filter(x => x.nama !== nama) }))} /> {nama}</label>
                {d && <textarea rows={2} value={d.wujud} placeholder="Wujud penerapan dalam pembelajaran…" aria-label={`Wujud ${nama}`} onChange={e => setIsi(s2 => ({ dimensi: s2.dimensi.map(x => (x.nama === nama ? { ...x, wujud: e.target.value } : x)) }))} />}
              </div>
            );
          })}
      </>
    ),
    kegiatan: (
      <>
          <div className="seg-tabs" style={{ marginBottom: 10 }}>
            {isi.kegiatan.slice(0, isi.pertemuan).map((_, k) => <button key={k} type="button" className={`seg-tab ${pertemuanAktif === k ? 'active' : ''}`} onClick={() => setPertemuanAktif(k)}>Pertemuan {k + 1}</button>)}
          </div>
          <div className="form-grid">
            <div className="field"><label>Sub-bab / materi</label><input value={pt.subMateri} onChange={e => ubahKeg(pertemuanAktif, { subMateri: e.target.value })} /></div>
            <div className="field"><label>Model pembelajaran</label><input value={pt.model} placeholder={namaModel(isi) || 'sama dengan identitas'} onChange={e => ubahKeg(pertemuanAktif, { model: e.target.value })} /></div>
            <div className="field span2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label>Tujuan pembelajaran pertemuan ini</label>
                {tpTerpilih.length > 0 && <button type="button" className="btn btn-sm" onClick={() => ubahKeg(pertemuanAktif, { tujuan: teksTp() })}>Isi dari TP</button>}</div>
              <textarea rows={2} value={pt.tujuan} onChange={e => ubahKeg(pertemuanAktif, { tujuan: e.target.value })} />
            </div>
          </div>
          <div className="md-langkah-h">
            <b>Tahapan</b>
            <span className={totalMenit && target && totalMenit !== target ? 'beda' : ''}>Total {totalMenit} menit{target ? ` dari ${target} menit` : ''}</span>
            <button type="button" className="btn btn-sm" onClick={() => isiTahapanModel(pertemuanAktif)}>Isi tahapan sesuai model</button>
          </div>
          {pt.langkah.map((l, j) => (
            <div key={j} className="md-langkah">
              <div className="tp-geser">
                <button type="button" className="btn-icon" disabled={j === 0} onClick={() => ubahKeg(pertemuanAktif, x => ({ langkah: geser(x.langkah, j, -1) }))} aria-label="Naikkan">▲</button>
                <button type="button" className="btn-icon" disabled={j === pt.langkah.length - 1} onClick={() => ubahKeg(pertemuanAktif, x => ({ langkah: geser(x.langkah, j, 1) }))} aria-label="Turunkan">▼</button>
              </div>
              <div className="md-langkah-meta">
                <select className="input-cell" value={l.tahap} aria-label="Tahapan" onChange={e => ubahLangkah(pertemuanAktif, j, { tahap: e.target.value })}>{['AWAL', 'INTI', 'PENUTUP'].map(x => <option key={x}>{x}</option>)}</select>
                <input className="input-cell" value={l.sub} placeholder="Sub-tahap (opsional)" aria-label="Sub-tahap" onChange={e => ubahLangkah(pertemuanAktif, j, { sub: e.target.value })} />
                <label className="md-menit"><input className="input-cell" type="number" min="0" value={l.menit} aria-label="Menit" onChange={e => ubahLangkah(pertemuanAktif, j, { menit: e.target.value })} /> menit</label>
              </div>
              <textarea rows={3} className="input-cell" value={l.teks} placeholder="Kegiatan guru dan murid…" aria-label={`Kegiatan ${l.tahap} ${l.sub}`} onChange={e => ubahLangkah(pertemuanAktif, j, { teks: e.target.value })} />
              <button type="button" className="btn-icon danger" aria-label="Hapus tahapan" onClick={() => ubahKeg(pertemuanAktif, x => ({ langkah: x.langkah.filter((_, i) => i !== j) }))}>✕</button>
            </div>
          ))}
          {!pt.langkah.length && <p className="paud-kosong" style={{ marginTop: 0 }}>Belum ada tahapan. Klik "Isi tahapan sesuai model" untuk membuat baris AWAL–INTI–PENUTUP sesuai model pembelajaran, lengkap dengan pembagian menitnya.</p>}
          <button type="button" className="btn btn-sm" onClick={() => ubahKeg(pertemuanAktif, x => ({ langkah: [...x.langkah, { tahap: 'INTI', sub: '', menit: '', teks: '' }] }))}>+ Tambah tahapan</button>
      </>
    ),
    asesmen: (
      <>
          {isi.asesmen.map((a, k) => (
            <div key={a.jenis} className="md-asesmen">
              <b>{a.jenis}</b>
              <input className="input-cell" value={a.teknik} placeholder="Teknik, mis. Tes awal tertulis" aria-label={`Teknik ${a.jenis}`} onChange={e => setIsi(s2 => ({ asesmen: s2.asesmen.map((y, j) => (j === k ? { ...y, teknik: e.target.value } : y)) }))} />
              <textarea rows={2} className="input-cell" value={a.instrumen} placeholder="Instrumen & contoh soal/aspek yang diamati" aria-label={`Instrumen ${a.jenis}`} onChange={e => setIsi(s2 => ({ asesmen: s2.asesmen.map((y, j) => (j === k ? { ...y, instrumen: e.target.value } : y)) }))} />
              <input className="input-cell" value={a.waktu} placeholder="Waktu, mis. 15 menit awal pertemuan" aria-label={`Waktu ${a.jenis}`} onChange={e => setIsi(s2 => ({ asesmen: s2.asesmen.map((y, j) => (j === k ? { ...y, waktu: e.target.value } : y)) }))} />
            </div>
          ))}
          <small style={{ color: 'var(--muted)' }}>Nilai hasil asesmen tetap diinput di menu Nilai Akademik.</small>
      </>
    ),
    remedial: (
      <>
          <Area label="Remedial" rows={3} value={isi.remedial} onChange={v => setIsi({ remedial: v })} placeholder="Bagi murid yang kesulitan memahami materi…" />
          <Area label="Pengayaan" rows={3} value={isi.pengayaan} onChange={v => setIsi({ pengayaan: v })} placeholder="Bagi murid yang sudah menguasai materi…" />
      </>
    ),
    penutup: (
      <>
          <Area label="Penutup" rows={4} value={isi.penutup} onChange={v => setIsi({ penutup: v })}
            aksi={m.mapel && <button type="button" className="btn btn-sm" onClick={() => setIsi({ penutup: `Modul ajar ini dirancang untuk membantu murid ${namaTingkat(m.tingkat).toLowerCase()}${fase ? ` Fase ${fase}` : ''} memahami ${(m.judul || 'materi ini').toLowerCase()} melalui pendekatan yang konkret dan kolaboratif. Dengan lingkungan pembelajaran yang mendukung dan diferensiasi yang tepat, diharapkan semua murid dapat mencapai tujuan pembelajaran. Melalui pembelajaran ini, murid tidak hanya mengembangkan kemampuan akademis, tetapi juga nilai-nilai karakter yang penting untuk kehidupan sehari-hari.` })}>Buat kalimat penutup</button>} />
      </>
    ),
    lampiran: (
      <>
          {isi.lampiran.map((l, k) => (
            <div key={k} className="md-lamp">
              <input className="input-cell" value={l.label} placeholder="Nama lampiran, mis. LKPD 1" onChange={e => setIsi(s2 => ({ lampiran: s2.lampiran.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) }))} />
              <input className="input-cell" value={l.url} placeholder="Link (Google Drive, YouTube, …)" onChange={e => setIsi(s2 => ({ lampiran: s2.lampiran.map((x, j) => (j === k ? { ...x, url: e.target.value } : x)) }))} />
              {l.url && /^https?:\/\//.test(l.url) && <a className="btn btn-sm" href={l.url} target="_blank" rel="noreferrer">Buka</a>}
              <button type="button" className="btn-icon danger" aria-label="Hapus lampiran" onClick={() => setIsi(s2 => ({ lampiran: s2.lampiran.filter((_, j) => j !== k) }))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={() => setIsi(s2 => ({ lampiran: [...s2.lampiran, { label: '', url: '' }] }))}>+ Tambah lampiran</button>
      </>
    ),
  };

  return (
    <Modal wide title={!m.idModul ? 'Modul ajar baru' : (m.judul || 'Modul ajar')}
      subtitle={m.mapel ? `${m.mapel} · ${namaTingkat(m.tingkat)}${m.rombel ? ` (${m.rombel})` : ''}${fase ? ` · Fase ${fase}` : ''} · ${m.tahunAjaran} ${m.semester}` : 'Pilih mata pelajaran & kelas'}
      onClose={() => { if (berubah && !window.confirm('Perubahan belum disimpan. Tutup saja?')) return; onClose(); }} actions={aksi}>
      {periksa && (
        <div className="md-periksa">
          <b>Pemeriksaan kepala sekolah</b>
          <textarea rows={2} value={catatanKepsek} placeholder="Catatan untuk guru (wajib bila dikembalikan, opsional bila disetujui)…" aria-label="Catatan kepala sekolah" onChange={e => setCatatanKepsek(e.target.value)} />
          <small>Periksa isi lewat Pratinjau, lalu klik <b>Setujui</b> atau <b>Kembalikan</b> di bawah.</small>
        </div>
      )}
      {pratinjau ? (
        <div style={{ background: '#E9EDEA', padding: 12, borderRadius: 10, maxHeight: '64vh', overflow: 'auto' }}>
          <DokumenModul dokumen={dokumen} />
          {cetak && <CetakRaporPaud dokumen={dokumen} onSelesai={() => setCetak(false)} />}
        </div>
      ) : (
        <>
          <div className="ringkas-bar" style={{ marginBottom: 12 }}>
            <span className={`badge ${BADGE_STATUS_MODUL[m.status] || 'badge-muted'}`}>{m.status || 'Draft'}</span>
            {m.guru && <span className="badge badge-muted">Penyusun: {m.guru}</span>}
            {jpTotal(isi) > 0 && <span className="badge badge-muted">{jpTotal(isi)} JP</span>}
            {kurang.length ? <span className="badge badge-gold" title={kurang.join(', ')}>Belum lengkap: {kurang.join(', ')}</span> : <span className="badge badge-green">Bagian utama lengkap</span>}
            {!bolehUbah && <span className="badge badge-blue">Hanya lihat — modul guru lain</span>}
            {bolehUbah && terkunci && <span className="badge badge-blue">Terkunci — sedang/sudah disetujui</span>}
          </div>
          {m.status === 'Dikembalikan' && m.catatan && <div className="banner-info" style={{ marginBottom: 12 }}><span><b>Catatan kepala sekolah:</b> {m.catatan}</span></div>}
          {m.status === 'Disetujui' && <div className="banner-info" style={{ marginBottom: 12 }}><span>Disetujui {m.disetujuiOleh ? `oleh ${m.disetujuiOleh} ` : ''}{m.tanggalDisetujui ? `pada ${m.tanggalDisetujui}` : ''}. Hasil cetak memakai arsip saat disetujui.{m.catatan ? ` Catatan: ${m.catatan}` : ''}</span></div>}

          {formatBeda && !terkunci && (
            <div className="banner-info" style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Format modul sekolah sudah diperbarui sejak modul ini dibuat. Modul ini tetap memakai format lamanya sampai Anda memilih memperbarui.</span>
              <button type="button" className="btn btn-sm" onClick={pakaiFormatTerbaru}>Pakai format terbaru</button>
            </div>
          )}
          <fieldset disabled={terkunci} style={{ border: 0, padding: 0, margin: 0 }}>
            {bagianTampil.map((b, k) => (
              <Bagian key={b.id} no={k + 1} judul={judulBagian(b, isi)} sub={b.tipe === 'bawaan' ? SUB_BAGIAN[b.id] : (b.petunjuk || (b.tipe === 'tabel' ? 'Tabel komponen | deskripsi' : 'Paragraf'))}
                buka={buka === b.id} onToggle={() => toggle(b.id)} lengkap={b.tipe === 'bawaan' ? ok[b.id] : okTambahan(b)}>
                {b.tipe === 'bawaan' ? ISI_BAGIAN[b.id] : <BagianTambahan b={b} nilai={isi.tambahan?.[b.id]} onChange={v => setIsi(x => ({ tambahan: { ...(x.tambahan || {}), [b.id]: v } }))} />}
              </Bagian>
            ))}
          </fieldset>
        </>
      )}
    </Modal>
  );
}
