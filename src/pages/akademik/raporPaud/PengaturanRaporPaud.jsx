import { useEffect, useState } from 'react';
import { useAppData } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { PENGATURAN_PAUD_BAWAAN, lengkapiPengaturanPaud } from '../../../db/raporPaudFields';
import { simpanPengaturanRaporPaudKeSheet, addLogEntry, isConfigured } from '../../../services/googleSheets';

const salin = (x) => JSON.parse(JSON.stringify(x));
const geser = (arr, i, n) => { const a = [...arr]; const j = i + n; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

function Baris({ children, i, n, onGeser, onHapus, label }) {
  return (
    <div className="role-row" style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button type="button" className="btn-icon" style={{ padding: '0 4px', fontSize: 10 }} disabled={i === 0} onClick={() => onGeser(-1)} aria-label={`Naikkan ${label}`}>▲</button>
        <button type="button" className="btn-icon" style={{ padding: '0 4px', fontSize: 10 }} disabled={i === n - 1} onClick={() => onGeser(1)} aria-label={`Turunkan ${label}`}>▼</button>
      </div>
      {children}
      <button type="button" className="btn-icon danger" onClick={onHapus} aria-label={`Hapus ${label}`}>✕</button>
    </div>
  );
}

// Daftar teks sederhana (karakter, kegiatan, kalimat penyemangat).
function ListTeks({ items, onChange, placeholder, tambahLabel }) {
  return (
    <>
      {items.map((t, i) => (
        <Baris key={i} i={i} n={items.length} label={t || 'baris'} onGeser={n => onChange(geser(items, i, n))} onHapus={() => onChange(items.filter((_, k) => k !== i))}>
          <input className="input-cell" style={{ flex: 1 }} value={t} placeholder={placeholder} onChange={e => onChange(items.map((x, k) => (k === i ? e.target.value : x)))} />
        </Baris>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...items, ''])}>+ {tambahLabel}</button>
    </>
  );
}

function Kartu({ judul, sub, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-head"><div><h3>{judul}</h3>{sub && <p>{sub}</p>}</div></div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function PengaturanRaporPaud() {
  const { pengaturanPaud, pengaturanPaudTersimpan, refreshPengaturanPaud, toast } = useAppData();
  const { currentUser } = useAuth();
  const [d, setD] = useState(() => salin(pengaturanPaud));
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const jejak = JSON.stringify(pengaturanPaud);
  useEffect(() => { if (!berubah) setD(salin(pengaturanPaud)); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch) => { setD(x => ({ ...x, ...patch })); setBerubah(true); };

  function validasi() {
    if (!d.elemen.length) return 'Minimal harus ada satu elemen.';
    if (d.elemen.some(e => !e.nama.trim())) return 'Nama elemen tidak boleh kosong.';
    const n = d.elemen.map(e => e.nama.trim().toLowerCase());
    if (new Set(n).size !== n.length) return 'Ada nama elemen yang sama.';
    if (d.skala.some(k => !k.kode.trim() || !k.nama.trim())) return 'Kode dan nama skala tidak boleh kosong.';
    if (!d.template.includes('{capaian}')) return 'Template kalimat pembuka harus memuat {capaian}.';
    if (d.mulok.some(m => !m.program.trim())) return 'Nama program muatan lokal tidak boleh kosong.';
    return null;
  }

  async function simpan() {
    const err = validasi();
    if (err) { toast(err, 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    const bersih = lengkapiPengaturanPaud({
      ...d,
      semangat: d.semangat.map(x => x.trim()).filter(Boolean),
      karakter: d.karakter.map(x => x.trim()).filter(Boolean),
      mulok: d.mulok.map(m => ({ program: m.program.trim(), kegiatan: m.kegiatan.map(x => x.trim()).filter(Boolean) })),
      kesehatan: d.kesehatan.filter(k => k.nama.trim()),
    });
    setMenyimpan(true);
    try {
      await simpanPengaturanRaporPaudKeSheet([{ No: 1, Kunci: 'pengaturan', Nilai: JSON.stringify(bersih) }]);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Pengaturan Rapor PAUD', modul: 'Rapor Digital', detail: `${bersih.elemen.length} elemen, ${bersih.karakter.length} karakter, ${bersih.mulok.length} program muatan lokal` });
      setBerubah(false);
      await refreshPengaturanPaud();
      toast('Pengaturan rapor PAUD tersimpan.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui. Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  return (
    <div>
      {!pengaturanPaudTersimpan && <div className="banner-info"><span>Belum ada pengaturan tersimpan — saat ini memakai bawaan sesuai format rapor KB Islam Terpadu Qudwah. Sesuaikan lalu klik Simpan.</span></div>}
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0 }}>Rapor yang <b>sudah terbit</b> tidak ikut berubah — isinya tersimpan sebagai arsip. Perubahan di sini berlaku untuk rapor yang masih draft dan semester berikutnya.</p>

      <Kartu judul="Identitas cetak & alur" sub="Muncul di kop, halaman identitas, dan kolom tanda tangan.">
        <div className="form-grid">
          <div className="field"><label>Nama satuan</label><input value={d.namaSatuan} onChange={e => set({ namaSatuan: e.target.value })} /></div>
          <div className="field"><label>Jabatan kepala (di tanda tangan)</label><input value={d.jabatanKepala} onChange={e => set({ jabatanKepala: e.target.value })} /></div>
          <div className="field"><label>Tempat tanda tangan</label><input value={d.tempat} onChange={e => set({ tempat: e.target.value })} /></div>
          <div className="field"><label>Persetujuan kepala sekolah</label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 500 }}>
              <input type="checkbox" checked={d.butuhPersetujuan} onChange={e => set({ butuhPersetujuan: e.target.checked })} />
              Wali kelas mengajukan, kepala sekolah yang menerbitkan
            </label></div>
        </div>
      </Kartu>

      <Kartu judul="Elemen narasi" sub="1 elemen = 1 halaman rapor (deskripsi + foto). Urutan di sini = urutan cetak A, B, C…  Mengganti nama elemen tidak mengubah catatan penilaian lama yang memakai nama sebelumnya.">
        {d.elemen.map((e, i) => (
          <Baris key={e.id} i={i} n={d.elemen.length} label={e.nama} onGeser={n => set({ elemen: geser(d.elemen, i, n) })} onHapus={() => set({ elemen: d.elemen.filter((_, k) => k !== i) })}>
            <b style={{ width: 18 }}>{String.fromCharCode(65 + i)}</b>
            <input className="input-cell" style={{ flex: 2 }} value={e.nama} placeholder="Nama elemen" onChange={ev => set({ elemen: d.elemen.map((x, k) => (k === i ? { ...x, nama: ev.target.value } : x)) })} />
            <input className="input-cell" style={{ flex: 2 }} value={e.kalimat} placeholder="Ditulis di kalimat pembuka" title="Bagian {elemen} di kalimat pembuka" onChange={ev => set({ elemen: d.elemen.map((x, k) => (k === i ? { ...x, kalimat: ev.target.value } : x)) })} />
            <input className="input-cell" style={{ flex: 1 }} value={e.sub || ''} placeholder="Keterangan judul (opsional)" onChange={ev => set({ elemen: d.elemen.map((x, k) => (k === i ? { ...x, sub: ev.target.value } : x)) })} />
            <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={e.foto} onChange={ev => set({ elemen: d.elemen.map((x, k) => (k === i ? { ...x, foto: ev.target.checked } : x)) })} />foto</label>
          </Baris>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => set({ elemen: [...d.elemen, { id: 'el' + Date.now().toString(36), nama: '', kalimat: '', sub: '', foto: true }] })}>+ Tambah elemen</button>
        <p className="paud-kosong">Contoh tambahan khas SIT: "Tahfidz &amp; Doa Harian". Sejak revisi kurikulum 2025, "Projek P5" bisa diganti menjadi "Kokurikuler".</p>
      </Kartu>

      <Kartu judul="Skala capaian & kalimat" sub="Dipakai di semua elemen, muatan lokal, dan karakter.">
        <table className="paud-tabel" style={{ marginBottom: 12 }}>
          <thead><tr><th style={{ width: 90 }}>Kode</th><th>Nama</th><th>Kalimat di narasi</th></tr></thead>
          <tbody>{d.skala.map((k, i) => (
            <tr key={i}>
              <td><input className="input-cell" value={k.kode} onChange={e => set({ skala: d.skala.map((x, j) => (j === i ? { ...x, kode: e.target.value } : x)) })} /></td>
              <td><input className="input-cell" value={k.nama} onChange={e => set({ skala: d.skala.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })} /></td>
              <td><input className="input-cell" value={k.kalimat} onChange={e => set({ skala: d.skala.map((x, j) => (j === i ? { ...x, kalimat: e.target.value } : x)) })} /></td>
            </tr>
          ))}</tbody>
        </table>
        <div className="field"><label>Template kalimat pembuka — pakai {'{elemen}'}, {'{panggilan}'}, {'{capaian}'}</label>
          <textarea rows={2} value={d.template} onChange={e => set({ template: e.target.value })} /></div>
        <div style={{ fontSize: 12.5, fontWeight: 700, margin: '10px 0 6px' }}>Pilihan kalimat penyemangat</div>
        <ListTeks items={d.semangat} onChange={v => set({ semangat: v })} placeholder="mis. Pertahankan semangatmu!!!" tambahLabel="Tambah kalimat" />
      </Kartu>

      <Kartu judul="Muatan lokal" sub="Dikelompokkan per program. Kegiatan bisa diganti tiap semester — rapor yang sudah terbit tetap menyimpan daftar lamanya.">
        {d.mulok.map((m, i) => (
          <div key={i} className="paud-elemen">
            <Baris i={i} n={d.mulok.length} label={m.program} onGeser={n => set({ mulok: geser(d.mulok, i, n) })} onHapus={() => set({ mulok: d.mulok.filter((_, k) => k !== i) })}>
              <input className="input-cell" style={{ flex: 1, fontWeight: 700 }} value={m.program} placeholder="Nama program, mis. Kunjungan Edukatif" onChange={e => set({ mulok: d.mulok.map((x, k) => (k === i ? { ...x, program: e.target.value } : x)) })} />
            </Baris>
            <div style={{ paddingLeft: 30 }}>
              <ListTeks items={m.kegiatan} onChange={v => set({ mulok: d.mulok.map((x, k) => (k === i ? { ...x, kegiatan: v } : x)) })} placeholder="Nama kegiatan" tambahLabel="Tambah kegiatan" />
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => set({ mulok: [...d.mulok, { program: '', kegiatan: [''] }] })}>+ Tambah program</button>
      </Kartu>

      <Kartu judul="Bidang karakter" sub="Tabel centang di halaman Karakter Siswa.">
        <ListTeks items={d.karakter} onChange={v => set({ karakter: v })} placeholder="mis. Mandiri, disiplin dan tanggung jawab" tambahLabel="Tambah bidang" />
      </Kartu>

      <Kartu judul="Tumbuh kembang (kesehatan)" sub="Jenis 'pilihan' memakai daftar pilihan di bawah; 'angka' diisi manual dengan satuan.">
        {d.kesehatan.map((k, i) => (
          <Baris key={i} i={i} n={d.kesehatan.length} label={k.nama} onGeser={n => set({ kesehatan: geser(d.kesehatan, i, n) })} onHapus={() => set({ kesehatan: d.kesehatan.filter((_, j) => j !== i) })}>
            <input className="input-cell" style={{ flex: 2 }} value={k.nama} placeholder="Aspek" onChange={e => set({ kesehatan: d.kesehatan.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })} />
            <select value={k.jenis} onChange={e => set({ kesehatan: d.kesehatan.map((x, j) => (j === i ? { ...x, jenis: e.target.value } : x)) })}><option value="pilihan">pilihan</option><option value="angka">angka</option></select>
            <input className="input-cell" style={{ width: 70 }} value={k.satuan || ''} placeholder="satuan" disabled={k.jenis !== 'angka'} onChange={e => set({ kesehatan: d.kesehatan.map((x, j) => (j === i ? { ...x, satuan: e.target.value } : x)) })} />
          </Baris>
        ))}
        <button type="button" className="btn btn-sm" onClick={() => set({ kesehatan: [...d.kesehatan, { nama: '', jenis: 'pilihan' }] })}>+ Tambah aspek</button>
        <div className="field" style={{ marginTop: 12 }}><label>Daftar pilihan (pisahkan dengan koma)</label>
          <input value={d.pilihanKesehatan.join(', ')} onChange={e => set({ pilihanKesehatan: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></div>
      </Kartu>

      <Kartu judul="Petunjuk penggunaan (hal. ii)" sub="Satu baris = satu butir bernomor.">
        <textarea rows={9} style={{ width: '100%' }} value={d.petunjuk} onChange={e => set({ petunjuk: e.target.value })} />
      </Kartu>

      <div className="save-bar">
        <button className="btn" onClick={() => { setD(salin(PENGATURAN_PAUD_BAWAAN)); setBerubah(true); }}>Kembalikan ke bawaan</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {berubah && <button className="btn" onClick={() => { setD(salin(pengaturanPaud)); setBerubah(false); }}>Batalkan</button>}
          <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || (!berubah && pengaturanPaudTersimpan)}>{menyimpan ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
        </div>
      </div>
    </div>
  );
}
