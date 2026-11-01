import { useEffect, useState } from 'react';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import {
  INFO_BAWAAN, DIMENSI_SET, FORMAT_BAWAAN, lengkapiPengaturanModul, judulBagian, buatIdBagian,
} from '../../../db/modulAjarFields';
import { simpanPengaturanModulKeSheet, addLogEntry, isConfigured } from '../../../services/googleSheets';

const salin = (x) => JSON.parse(JSON.stringify(x));
const geser = (arr, i, n) => { const a = [...arr]; const j = i + n; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };
const LABEL_TIPE = { bawaan: 'Bawaan', paragraf: 'Paragraf', tabel: 'Tabel' };

// Modul Ajar › Format Modul: CRUD susunan bagian modul ajar (khusus Admin & Kepala Sekolah).
// Modul yg sudah ada menyimpan salinan formatnya sendiri, jadi perubahan di sini hanya
// berlaku utk modul BARU (draft lama bisa memilih "pakai format terbaru" sendiri).
export default function PengaturanFormatModul() {
  const { pengaturanModul, pengaturanModulTersimpan, refreshPengaturanModul, modulAjar, toast } = useAppData();
  const { currentUser } = useAuth();
  const [d, setD] = useState(() => salin(pengaturanModul));
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [bukaId, setBukaId] = useState(null);
  const jejak = JSON.stringify(pengaturanModul);
  useEffect(() => { if (!berubah) setD(salin(pengaturanModul)); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps
  const ubahFormat = (fn) => { setD(x => ({ ...x, format: fn(x.format) })); setBerubah(true); };
  const ubahBagian = (i, patch) => ubahFormat(f => f.map((b, k) => (k === i ? { ...b, ...patch } : b)));

  // Berapa modul yg memakai bagian buatan sekolah (punya isi) -- info sebelum menghapus.
  const pemakaian = (id) => modulAjar.filter(m => {
    const v = m.isi.tambahan?.[id];
    return Array.isArray(v) ? v.some(r => String(r.deskripsi || '').trim()) : String(v || '').trim();
  }).length;

  function tambah(tipe) {
    const id = buatIdBagian();
    ubahFormat(f => [...f, { id, tipe, judul: '', tampil: true, petunjuk: '', komponen: tipe === 'tabel' ? ['', ''] : [], bolehTambah: true }]);
    setBukaId(id);
  }
  function hapus(i) {
    const b = d.format[i];
    const n = pemakaian(b.id);
    if (n && !window.confirm(`Bagian "${b.judul || 'tanpa judul'}" sudah diisi di ${n} modul. Bagian ini hanya hilang dari format untuk modul baru — isi di modul lama tetap tersimpan dan tetap tercetak. Lanjut hapus?`)) return;
    ubahFormat(f => f.filter((_, k) => k !== i));
  }

  function validasi() {
    for (const b of d.format) {
      if (b.tipe !== 'bawaan' && !b.judul.trim()) return 'Ada bagian buatan sekolah yang belum diberi judul.';
      if (b.tipe === 'tabel' && !b.bolehTambah && !b.komponen.some(k => k.trim())) return `Bagian tabel "${b.judul}" belum punya baris komponen, padahal guru tidak boleh menambah baris.`;
    }
    const judul = d.format.filter(b => b.tampil).map(b => judulBagian(b, { setDimensi: d.setDimensi }).toLowerCase());
    const ganda = judul.find((j, i) => judul.indexOf(j) !== i);
    if (ganda) return `Ada dua bagian dengan judul yang sama: "${ganda}".`;
    return null;
  }

  async function simpan() {
    const err = validasi();
    if (err) { toast(err, 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    const bersih = lengkapiPengaturanModul({
      ...d,
      format: d.format.map(b => ({ ...b, judul: b.judul.trim(), petunjuk: (b.petunjuk || '').trim(), komponen: (b.komponen || []).map(k => k.trim()).filter(Boolean) })),
    });
    setMenyimpan(true);
    try {
      await simpanPengaturanModulKeSheet([{ No: 1, Kunci: 'pengaturan', Nilai: JSON.stringify(bersih) }]);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Format Modul Ajar', modul: 'Modul Ajar', detail: bersih.format.filter(b => b.tampil).map(b => judulBagian(b, bersih)).join(' · ') });
      setBerubah(false);
      await refreshPengaturanModul();
      toast('Format modul ajar tersimpan. Berlaku untuk modul baru.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "pengaturanModul" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  let nomor = 0;
  return (
    <div>
      {!pengaturanModulTersimpan && <div className="banner-info" style={{ marginBottom: 12 }}><span>Belum ada format tersimpan — saat ini memakai format bawaan sesuai contoh modul ajar sekolah.</span></div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><div><h3>Format modul ajar</h3>
          <p>Atur bagian-bagian modul ajar: ganti judul, sembunyikan, ubah urutan, atau tambah bagian khas sekolah (paragraf / tabel). <b>Modul yang sudah dibuat tidak ikut berubah</b> — tiap modul menyimpan formatnya sendiri. Guru bisa memilih memperbarui draft-nya ke format terbaru.</p></div></div>
        <div className="card-body">
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="field"><label>Acuan dimensi untuk modul baru</label>
              <select value={d.setDimensi} onChange={e => { setD(x => ({ ...x, setDimensi: e.target.value })); setBerubah(true); }}>
                {Object.entries(DIMENSI_SET).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select></div>
          </div>

          <div className="fm-list">
            {d.format.map((b, i) => {
              const info = INFO_BAWAAN[b.id];
              const judul = judulBagian(b, { setDimensi: d.setDimensi });
              if (b.tampil) nomor++;
              const buka = bukaId === b.id;
              return (
                <div key={b.id} className={`fm-baris ${b.tampil ? '' : 'sembunyi'} ${b.tipe !== 'bawaan' ? 'custom' : ''}`}>
                  <div className="fm-atas">
                    <div className="tp-geser">
                      <button type="button" className="btn-icon" disabled={i === 0} onClick={() => ubahFormat(f => geser(f, i, -1))} aria-label={`Naikkan ${judul}`}>▲</button>
                      <button type="button" className="btn-icon" disabled={i === d.format.length - 1} onClick={() => ubahFormat(f => geser(f, i, 1))} aria-label={`Turunkan ${judul}`}>▼</button>
                    </div>
                    <span className="fm-no">{b.tampil ? nomor : '–'}</span>
                    <input className="input-cell fm-judul" value={b.judul} placeholder={b.tipe === 'bawaan' ? judulBagian({ ...b, judul: '' }, { setDimensi: d.setDimensi }) : 'Judul bagian, mis. Integrasi Nilai Islam'}
                      aria-label={`Judul bagian ${judul}`} onChange={e => ubahBagian(i, { judul: e.target.value })} />
                    <span className={`badge ${b.tipe === 'bawaan' ? 'badge-muted' : 'badge-blue'}`}>{LABEL_TIPE[b.tipe]}</span>
                    <label className="fm-tampil" title={info?.wajib ? 'Bagian wajib, tidak bisa disembunyikan' : ''}>
                      <input type="checkbox" checked={b.tampil} disabled={!!info?.wajib} onChange={e => ubahBagian(i, { tampil: e.target.checked })} /> Tampil
                    </label>
                    {b.tipe !== 'bawaan'
                      ? <>
                        <button type="button" className="btn btn-sm" onClick={() => setBukaId(buka ? null : b.id)}>{buka ? 'Tutup' : 'Atur'}</button>
                        <button type="button" className="btn-icon danger" aria-label={`Hapus bagian ${judul}`} onClick={() => hapus(i)}>✕</button>
                      </>
                      : <span className="fm-ket">{info?.ket}</span>}
                  </div>
                  {buka && b.tipe !== 'bawaan' && (
                    <div className="fm-detail">
                      <div className="field"><label>Petunjuk untuk guru (opsional)</label>
                        <input value={b.petunjuk || ''} placeholder="mis. Tuliskan ayat/hadis yang relevan beserta artinya" onChange={e => ubahBagian(i, { petunjuk: e.target.value })} /></div>
                      {b.tipe === 'tabel' && (
                        <>
                          <label style={{ fontSize: 13, fontWeight: 700, display: 'block', margin: '8px 0 4px' }}>Baris komponen (kolom kiri tabel)</label>
                          {b.komponen.map((k, j) => (
                            <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                              <input className="input-cell" style={{ flex: 1 }} value={k} placeholder={`Komponen ${j + 1}, mis. Ayat Al-Qur'an`} onChange={e => ubahBagian(i, { komponen: b.komponen.map((x, y) => (y === j ? e.target.value : x)) })} />
                              <button type="button" className="btn-icon danger" aria-label="Hapus komponen" onClick={() => ubahBagian(i, { komponen: b.komponen.filter((_, y) => y !== j) })}>✕</button>
                            </div>
                          ))}
                          <button type="button" className="btn btn-sm" onClick={() => ubahBagian(i, { komponen: [...b.komponen, ''] })}>+ Baris komponen</button>
                          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 8 }}>
                            <input type="checkbox" checked={b.bolehTambah !== false} onChange={e => ubahBagian(i, { bolehTambah: e.target.checked })} /> Guru boleh menambah baris sendiri
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <button type="button" className="btn btn-sm" onClick={() => tambah('paragraf')}>+ Bagian paragraf</button>
            <button type="button" className="btn btn-sm" onClick={() => tambah('tabel')}>+ Bagian tabel</button>
            <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { if (window.confirm('Kembalikan ke format bawaan? Bagian buatan sekolah akan dihapus dari format (isi di modul lama tetap aman).')) { setD(x => ({ ...x, format: salin(FORMAT_BAWAAN).map(b => ({ ...b, petunjuk: '', komponen: [], bolehTambah: true })) })); setBerubah(true); } }}>Kembalikan ke format bawaan</button>
          </div>
        </div>
      </div>
      <div className="save-bar">
        {berubah ? <span className="badge badge-gold">Ada perubahan belum disimpan</span> : <span className="badge badge-muted">Tersimpan</span>}
        {berubah && <button className="btn" onClick={() => { setD(salin(pengaturanModul)); setBerubah(false); }}>Batalkan</button>}
        <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !berubah}>{menyimpan ? 'Menyimpan…' : 'Simpan format'}</button>
      </div>
    </div>
  );
}
