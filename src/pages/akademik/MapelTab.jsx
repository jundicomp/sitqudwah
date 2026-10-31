import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { JENJANG, formatRaporBawaan } from '../../config/jenjang';
import { simpanMapelKeSheet, addLogEntry, isConfigured } from '../../services/googleSheets';

const salin = (list) => list.map(m => ({ nama: m.nama, jenjang: [...m.jenjang], aktif: m.aktif !== false, kelompok: m.kelompok || '', namaAwal: m.nama }));

// Kelola daftar mata pelajaran: tambah, ganti nama, urutkan, pilih jenjang, nonaktifkan, hapus.
export default function MapelTab() {
  const { mapelList, mapelDariSheets, refreshMapel, nilai, kkm, jadwal, bankSoal, toast } = useAppData();
  const { currentUser } = useAuth();
  const [draft, setDraft] = useState(() => salin(mapelList));
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const jejak = JSON.stringify(mapelList);
  useEffect(() => { if (!berubah) setDraft(salin(mapelList)); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Jenjang sekolah saja (PAUD tidak memakai mapel).
  const jenjangSekolah = JENJANG.filter(j => (j.formatRapor || formatRaporBawaan(j.kode)) !== 'PAUD');

  // Pemakaian tiap nama mapel di data (nilai, KKM, jadwal, bank soal).
  const pakai = useMemo(() => {
    const m = {};
    const tambah = (nama, jenis) => { if (!nama) return; (m[nama] ||= { nilai: 0, kkm: 0, jadwal: 0, soal: 0 })[jenis]++; };
    nilai.forEach(x => tambah(x.mapel, 'nilai'));
    kkm.forEach(x => tambah(x.mapel, 'kkm'));
    jadwal.forEach(x => tambah(x.mapel, 'jadwal'));
    (bankSoal || []).forEach(x => tambah(x.mapel, 'soal'));
    return m;
  }, [nilai, kkm, jadwal, bankSoal]);
  const totalPakai = (nama) => { const p = pakai[nama]; return p ? p.nilai + p.kkm + p.jadwal + p.soal : 0; };
  const ketPakai = (nama) => { const p = pakai[nama]; if (!p) return ''; return [p.nilai && `${p.nilai} nilai`, p.kkm && `${p.kkm} KKM`, p.jadwal && `${p.jadwal} jadwal`, p.soal && `${p.soal} soal`].filter(Boolean).join(', '); };
  // Nama mapel yg ada di data tapi tidak ada di daftar (mis. data lama).
  const yatim = Object.keys(pakai).filter(n => !draft.some(d => d.nama.trim() === n));

  const ubah = (i, patch) => { setDraft(d => d.map((x, k) => (k === i ? { ...x, ...patch } : x))); setBerubah(true); };
  const geser = (i, n) => { setDraft(d => { const a = [...d]; const j = i + n; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; }); setBerubah(true); };
  const toggleJenjang = (i, kode) => {
    const j = draft[i].jenjang;
    ubah(i, { jenjang: j.includes(kode) ? j.filter(x => x !== kode) : [...j, kode] });
  };

  function validasi() {
    const nama = new Set();
    for (const m of draft) {
      const n = m.nama.trim();
      if (!n) return 'Nama mata pelajaran tidak boleh kosong.';
      if (/,/.test(n)) return `Nama "${n}" tidak boleh mengandung koma.`;
      if (nama.has(n.toLowerCase())) return `Mata pelajaran "${n}" ada dua kali.`;
      nama.add(n.toLowerCase());
    }
    if (!draft.some(m => m.aktif)) return 'Minimal satu mata pelajaran harus aktif.';
    const hilang = mapelList.map(x => x.nama).filter(n => totalPakai(n) && !draft.some(d => d.nama.trim() === n));
    if (hilang.length) return `${hilang.map(n => `"${n}" (${ketPakai(n)})`).join(', ')} sudah dipakai sehingga tidak bisa dihapus atau diganti namanya. Nonaktifkan saja kalau tidak dipakai lagi.`;
    return null;
  }

  async function simpan() {
    const err = validasi();
    if (err) { toast(err, 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      await simpanMapelKeSheet(draft.map((m, i) => ({ No: i + 1, Nama: m.nama.trim(), Jenjang: m.jenjang.join(', '), Aktif: m.aktif ? 'Ya' : 'Tidak', Kelompok: (m.kelompok || '').trim() })));
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah Mata Pelajaran', modul: 'Kurikulum & KKM', detail: draft.map(m => m.nama + (m.aktif ? '' : ' (nonaktif)')).join(', ') });
      setBerubah(false);
      await refreshMapel();
      toast('Daftar mata pelajaran tersimpan. Pilihan mapel di Nilai, KKM, Jadwal, dan Bank Soal sudah ikut diperbarui.');
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "mapel" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  return (
    <div className="card">
      <div className="card-head"><div><h3>Mata pelajaran</h3>
        <p>Dipakai di Jadwal, Nilai Akademik, KKM, Bank Soal, Rapor, dan laporan. Urutan di sini = urutan tampil di rapor. Kosongkan jenjang kalau mapel dipakai di semua jenjang. Mapel yang sudah punya data tidak bisa dihapus atau diganti nama, tapi bisa dinonaktifkan.</p></div></div>
      <div className="card-body">
        {!mapelDariSheets && <p style={{ margin: '0 0 12px', fontSize: 13.5, background: 'var(--gold-soft)', padding: '8px 12px', borderRadius: 8 }}>Sekolah belum menyimpan daftar mapelnya sendiri — saat ini memakai daftar bawaan (Kurikulum Merdeka SD + mapel khas SIT). Sesuaikan lalu klik Simpan.</p>}
        <div className="table-scroll">
          <table>
            <thead><tr><th style={{ width: 70 }}>Urutan</th><th>Nama mata pelajaran</th><th title="Mapel dengan kelompok yang sama tampil sebagai a., b., … di bawah judul kelompok pada rapor">Kelompok di rapor</th>{jenjangSekolah.length > 1 && <th>Jenjang</th>}<th>Dipakai</th><th>Aktif</th><th></th></tr></thead>
            <tbody>
              {draft.map((m, i) => {
                const n = totalPakai(m.namaAwal);
                return (
                  <tr key={i} style={m.aktif ? undefined : { opacity: 0.55 }}>
                    <td>
                      <button className="btn-icon" onClick={() => geser(i, -1)} disabled={i === 0} aria-label="Naikkan">▲</button>
                      <button className="btn-icon" onClick={() => geser(i, 1)} disabled={i === draft.length - 1} aria-label="Turunkan">▼</button>
                    </td>
                    <td><input className="input-cell" value={m.nama} placeholder="mis. Tahfidz" onChange={e => ubah(i, { nama: e.target.value })}
                      readOnly={n > 0} title={n > 0 ? 'Sudah dipakai data — tidak bisa diganti nama' : undefined} style={n > 0 ? { background: '#F6F8F5' } : undefined} /></td>
                    <td><input className="input-cell" value={m.kelompok} placeholder="mis. Keagamaan" onChange={e => ubah(i, { kelompok: e.target.value })} style={{ width: 140 }} /></td>
                    {jenjangSekolah.length > 1 && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {jenjangSekolah.map(j => (
                          <label key={j.kode} style={{ marginRight: 10, fontSize: 12.5 }}>
                            <input type="checkbox" checked={m.jenjang.includes(j.kode)} onChange={() => toggleJenjang(i, j.kode)} /> {j.kode}
                          </label>
                        ))}
                        {!m.jenjang.length && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>(semua)</span>}
                      </td>
                    )}
                    <td style={{ fontSize: 12.5 }}>{n ? ketPakai(m.namaAwal) : '—'}</td>
                    <td><input type="checkbox" checked={m.aktif} onChange={e => ubah(i, { aktif: e.target.checked })} aria-label={`Aktifkan ${m.nama}`} /></td>
                    <td><button className="btn btn-sm" disabled={n > 0} onClick={() => { setDraft(d => d.filter((_, k) => k !== i)); setBerubah(true); }}>Hapus</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="btn" style={{ marginTop: 10 }} onClick={() => { setDraft(d => [...d, { nama: '', jenjang: [], aktif: true, kelompok: '', namaAwal: '' }]); setBerubah(true); }}>+ Tambah mata pelajaran</button>

        {yatim.length > 0 && (
          <div className="banner-info" style={{ marginTop: 14, background: 'var(--gold-soft)', color: '#6E4B00' }}>
            <span><b>Ada mapel di data yang tidak ada di daftar:</b> {yatim.map(n => `${n} (${ketPakai(n)})`).join(', ')}. Biasanya data lama. Tambahkan ke daftar supaya tetap tampil rapi di KKM & rapor, lalu nonaktifkan kalau sudah tidak dipakai.</span>
            <button className="btn btn-sm" onClick={() => { setDraft(d => [...d, ...yatim.map(nama => ({ nama, jenjang: [], aktif: true, kelompok: '', namaAwal: nama }))]); setBerubah(true); }}>Tambahkan ke daftar</button>
          </div>
        )}

        <div className="save-bar">
          <span />
          <div style={{ display: 'flex', gap: 8 }}>
            {berubah && <button className="btn" onClick={() => { setDraft(salin(mapelList)); setBerubah(false); }}>Batalkan</button>}
            <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || (!berubah && mapelDariSheets)}>{menyimpan ? 'Menyimpan…' : mapelDariSheets ? 'Simpan perubahan' : 'Simpan daftar mapel'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
