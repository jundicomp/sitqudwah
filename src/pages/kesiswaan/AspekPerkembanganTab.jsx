import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { simpanAspekPerkembanganKeSheet, addLogEntry, isConfigured } from '../../services/googleSheets';

const salin = (list) => list.map(a => ({ ...a, aktif: a.aktif !== false, namaAwal: a.nama }));

// Kelola kategori aspek perkembangan: tambah, ubah nama, urutkan, nonaktifkan, hapus.
export default function AspekPerkembanganTab() {
  const { aspekSemua, aspekDariSheets, perkembangan, refreshAspek, toast } = useAppData();
  const { currentUser } = useAuth();
  const [draft, setDraft] = useState(() => salin(aspekSemua));
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const jejak = JSON.stringify(aspekSemua);
  useEffect(() => { if (!berubah) setDraft(salin(aspekSemua)); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps

  const pakai = useMemo(() => perkembangan.reduce((m, p) => { m[p.aspek] = (m[p.aspek] || 0) + 1; return m; }, {}), [perkembangan]);
  const ubah = (i, patch) => { setDraft(d => d.map((a, k) => (k === i ? { ...a, ...patch } : a))); setBerubah(true); };
  const geser = (i, n) => { setDraft(d => { const a = [...d]; const j = i + n; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; }); setBerubah(true); };

  function validasi() {
    const nama = new Set();
    for (const a of draft) {
      const n = a.nama.trim();
      if (!n) return 'Nama aspek tidak boleh kosong.';
      if (nama.has(n.toLowerCase())) return `Aspek "${n}" ada dua kali.`;
      nama.add(n.toLowerCase());
    }
    if (!draft.some(a => a.aktif)) return 'Minimal satu aspek harus aktif.';
    // Aspek yg sudah dipakai catatan tidak boleh hilang/berganti nama (catatan lama jadi yatim).
    const hilang = Object.keys(pakai).filter(n => !draft.some(a => a.nama.trim() === n));
    if (hilang.length) return `Aspek ${hilang.map(n => `"${n}" (${pakai[n]} catatan)`).join(', ')} sudah dipakai sehingga tidak bisa dihapus atau diganti namanya. Nonaktifkan saja kalau tidak dipakai lagi.`;
    return null;
  }

  async function simpan() {
    const err = validasi();
    if (err) { toast(err, 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      await simpanAspekPerkembanganKeSheet(draft.map((a, i) => ({ No: i + 1, Nama: a.nama.trim(), Keterangan: (a.keterangan || '').trim(), Aktif: a.aktif ? 'Ya' : 'Tidak' })));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Aspek', modul: 'Catatan Perkembangan', detail: draft.map(a => a.nama + (a.aktif ? '' : ' (nonaktif)')).join(', ') });
      setBerubah(false);
      await refreshAspek();
      toast('Kategori aspek tersimpan.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui. Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Kategori aspek perkembangan</h3><p>Pilihan "Aspek" saat mencatat perkembangan. Urutan di sini = urutan tampil. Aspek yang sudah dipakai tidak bisa dihapus, tapi bisa dinonaktifkan supaya tidak muncul lagi di form.</p></div></div>
      <div className="card-body">
        {!aspekDariSheets && <p style={{ margin: '0 0 12px', fontSize: 13.5, background: 'var(--gold-soft)', padding: '8px 12px', borderRadius: 8 }}>Sekolah belum menyimpan daftar aspeknya sendiri — saat ini memakai daftar bawaan. Sesuaikan lalu klik Simpan.</p>}
        <div className="table-scroll">
          <table>
            <thead><tr><th style={{ width: 70 }}>Urutan</th><th>Nama aspek</th><th>Keterangan (opsional)</th><th>Dipakai</th><th>Aktif</th><th></th></tr></thead>
            <tbody>
              {draft.map((a, i) => {
                const n = pakai[a.namaAwal] || 0;
                return (
                  <tr key={i} style={a.aktif ? undefined : { opacity: 0.55 }}>
                    <td>
                      <button className="btn-icon" onClick={() => geser(i, -1)} disabled={i === 0} aria-label="Naikkan">▲</button>
                      <button className="btn-icon" onClick={() => geser(i, 1)} disabled={i === draft.length - 1} aria-label="Turunkan">▼</button>
                    </td>
                    <td><input className="input-cell" value={a.nama} onChange={e => ubah(i, { nama: e.target.value })} placeholder="mis. Kemandirian" readOnly={n > 0} title={n > 0 ? 'Sudah dipakai catatan — tidak bisa diganti nama' : undefined} style={n > 0 ? { background: '#F6F8F5' } : undefined} /></td>
                    <td><input className="input-cell" value={a.keterangan || ''} onChange={e => ubah(i, { keterangan: e.target.value })} placeholder="penjelasan singkat utk guru" /></td>
                    <td>{n ? <span className="badge badge-muted">{n} catatan</span> : '—'}</td>
                    <td><input type="checkbox" checked={a.aktif} onChange={e => ubah(i, { aktif: e.target.checked })} aria-label={`Aktifkan ${a.nama}`} /></td>
                    <td><button className="btn btn-sm" disabled={n > 0} onClick={() => { setDraft(d => d.filter((_, k) => k !== i)); setBerubah(true); }}>Hapus</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="btn" style={{ marginTop: 10 }} onClick={() => { setDraft(d => [...d, { nama: '', keterangan: '', aktif: true, namaAwal: '' }]); setBerubah(true); }}>+ Tambah aspek</button>
        <div className="save-bar">
          <span />
          <div style={{ display: 'flex', gap: 8 }}>
            {berubah && <button className="btn" onClick={() => { setDraft(salin(aspekSemua)); setBerubah(false); }}>Batalkan</button>}
            <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || (!berubah && aspekDariSheets)}>{menyimpan ? 'Menyimpan…' : aspekDariSheets ? 'Simpan perubahan' : 'Simpan daftar aspek'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
