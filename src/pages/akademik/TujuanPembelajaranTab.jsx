import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Field, Select } from '../../components/akademik/shared';
import { JENJANG, namaTingkat, formatRaporBawaan } from '../../config/jenjang';
import { mapelUntukJenjang } from '../../db/akademikFields';
import { faseDariTingkat, KELAS_FASE, buatIdTp, kodeTp } from '../../db/kurikulumFields';
import { simpanCpKeSheet, simpanTpKeSheet, addLogEntry, isConfigured } from '../../services/googleSheets';

const SEMESTER = ['Ganjil', 'Genap'];
const kunciKel = (t, sem) => `${t}|${sem}`;
const geser = (arr, i, n) => { const a = [...arr]; const j = i + n; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

// Kurikulum & KKM › Capaian & Tujuan Pembelajaran.
// Pilih jenjang + mapel + fase -> isi CP per elemen, lalu susun TP per kelas per semester (ATP).
export default function TujuanPembelajaranTab() {
  const { cp, tp, refreshCp, refreshTp, toast, mapelList } = useAppData();
  const { currentUser } = useAuth();
  const jenjangSekolah = JENJANG.filter(j => (j.formatRapor || formatRaporBawaan(j.kode)) !== 'PAUD');
  const [jenjang, setJenjang] = useState(jenjangSekolah[0]?.kode || '');
  const tingkatJenjang = jenjangSekolah.find(j => j.kode === jenjang)?.tingkat || [];
  const faseList = [...new Set(tingkatJenjang.map(faseDariTingkat).filter(Boolean))];
  const mapelJenjang = useMemo(() => mapelUntukJenjang(jenjang), [jenjang, mapelList]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mapel, setMapel] = useState('');
  const [fase, setFase] = useState('');
  useEffect(() => { if (!jenjangSekolah.some(j => j.kode === jenjang) && jenjangSekolah.length) setJenjang(jenjangSekolah[0].kode); }, [jenjangSekolah, jenjang]);
  useEffect(() => { if (!mapelJenjang.includes(mapel)) setMapel(mapelJenjang[0] || ''); }, [mapelJenjang, mapel]);
  useEffect(() => { if (!faseList.includes(fase)) setFase(faseList[0] || ''); }, [faseList.join(), fase]); // eslint-disable-line react-hooks/exhaustive-deps
  const tingkatFase = tingkatJenjang.filter(t => faseDariTingkat(t) === fase);

  // ---- draft lokal utk mapel+fase yg dipilih ----
  const ambilCp = () => cp.filter(c => c.mapel === mapel && c.fase === fase).map(c => ({ elemen: c.elemen, capaian: c.capaian }));
  const ambilTp = () => {
    const g = {};
    tingkatFase.forEach(t => SEMESTER.forEach(sem => {
      g[kunciKel(t, sem)] = tp.filter(x => x.mapel === mapel && x.tingkat === String(t) && x.semester === sem)
        .sort((a, b) => a.urutan - b.urutan)
        .map(x => ({ idTp: x.idTp || '', elemen: x.elemen, tujuan: x.tujuan, jp: x.jp, aktif: x.aktif }));
    }));
    return g;
  };
  const [dCp, setDCp] = useState([]);
  const [dTp, setDTp] = useState({});
  const [berubah, setBerubah] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [tempel, setTempel] = useState(null); // { kunci, teks }
  const jejak = JSON.stringify([mapel, fase, tingkatFase, cp.filter(c => c.mapel === mapel && c.fase === fase), tp.filter(x => x.mapel === mapel && x.fase === fase)]);
  useEffect(() => { setDCp(ambilCp()); setDTp(ambilTp()); setBerubah(false); setTempel(null); }, [jejak]); // eslint-disable-line react-hooks/exhaustive-deps
  const ubahCp = (fn) => { setDCp(fn); setBerubah(true); };
  const ubahTp = (kunci, fn) => { setDTp(d => ({ ...d, [kunci]: fn(d[kunci] || []) })); setBerubah(true); };
  const elemenList = dCp.map(c => c.elemen.trim()).filter(Boolean);

  // ---- ringkasan jumlah TP per mapel x tingkat (semua mapel jenjang ini) ----
  const ringkasan = useMemo(() => {
    const m = {};
    tp.filter(x => x.aktif).forEach(x => { m[`${x.mapel}|${x.tingkat}`] = (m[`${x.mapel}|${x.tingkat}`] || 0) + 1; });
    return m;
  }, [tp]);
  const adaCp = useMemo(() => new Set(cp.filter(c => c.capaian).map(c => `${c.mapel}|${c.fase}`)), [cp]);

  function terapkanTempel() {
    const baris = tempel.teks.split('\n').map(x => x.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
    if (!baris.length) { setTempel(null); return; }
    ubahTp(tempel.kunci, list => [...list, ...baris.map(t => ({ idTp: '', elemen: '', tujuan: t, jp: '', aktif: true }))]);
    toast(`${baris.length} tujuan pembelajaran ditambahkan. Jangan lupa Simpan.`);
    setTempel(null);
  }

  function validasi() {
    const el = dCp.map(c => c.elemen.trim().toLowerCase()).filter(Boolean);
    if (dCp.some(c => !c.elemen.trim() && c.capaian.trim())) return 'Ada capaian pembelajaran yang belum diberi nama elemen.';
    if (new Set(el).size !== el.length) return 'Ada nama elemen yang sama.';
    for (const [k, list] of Object.entries(dTp)) {
      const [t, sem] = k.split('|');
      if (list.some(x => !x.tujuan.trim())) return `Ada tujuan pembelajaran yang masih kosong di ${namaTingkat(t)} semester ${sem}.`;
      if (list.some(x => x.jp !== '' && x.jp !== null && (!Number.isFinite(Number(x.jp)) || Number(x.jp) < 0))) return `Alokasi JP di ${namaTingkat(t)} semester ${sem} harus angka.`;
    }
    return null;
  }

  async function simpan() {
    const err = validasi();
    if (err) { toast(err, 'error'); return; }
    if (!isConfigured('akademik')) { toast('File Sheets Akademik belum tersambung.', 'error'); return; }
    setMenyimpan(true);
    try {
      // CP: ganti baris mapel+fase ini, baris lain dipertahankan apa adanya.
      const cpLain = cp.filter(c => !(c.mapel === mapel && c.fase === fase));
      const cpBaru = dCp.filter(c => c.elemen.trim() || c.capaian.trim()).map(c => ({ mapel, fase, elemen: c.elemen.trim(), capaian: c.capaian.trim() }));
      const cpRows = [...cpLain, ...cpBaru].map((c, i) => ({ No: i + 1, 'Mata Pelajaran': c.mapel, Fase: c.fase, Elemen: c.elemen, 'Capaian Pembelajaran': c.capaian }));
      // TP: ganti baris mapel+tingkat(fase ini), sisanya tetap. ID TP lama dipertahankan.
      const idAda = new Set(tp.map(x => x.idTp).filter(Boolean));
      const tpLain = tp.filter(x => !(x.mapel === mapel && tingkatFase.map(String).includes(x.tingkat)));
      const sekarang = new Date().toISOString();
      const tpBaru = [];
      tingkatFase.forEach(t => SEMESTER.forEach(sem => {
        (dTp[kunciKel(t, sem)] || []).forEach((x, i) => {
          tpBaru.push({
            'ID TP': x.idTp || buatIdTp(idAda), 'Mata Pelajaran': mapel, Fase: fase, Tingkat: String(t), Semester: sem, Urutan: i + 1,
            Kode: kodeTp(t, sem, i + 1), Elemen: x.elemen, 'Tujuan Pembelajaran': x.tujuan.trim(), 'Alokasi JP': x.jp === '' || x.jp === null ? '' : Number(x.jp),
            Aktif: x.aktif === false ? 'Tidak' : 'Ya', 'Diubah Oleh': currentUser.nama, 'Diubah Pada': sekarang,
          });
        });
      }));
      const tpRows = [
        ...tpLain.map(x => ({ 'ID TP': x.idTp || buatIdTp(idAda), 'Mata Pelajaran': x.mapel, Fase: x.fase, Tingkat: x.tingkat, Semester: x.semester, Urutan: x.urutan, Kode: x.kode, Elemen: x.elemen, 'Tujuan Pembelajaran': x.tujuan, 'Alokasi JP': x.jp, Aktif: x.aktif ? 'Ya' : 'Tidak', 'Diubah Oleh': '', 'Diubah Pada': '' })),
        ...tpBaru,
      ].map((r, i) => ({ No: i + 1, ...r }));
      await simpanCpKeSheet(cpRows);
      await simpanTpKeSheet(tpRows);
      await addLogEntry({ username: currentUser.username, namaUser: currentUser.nama, aksi: 'Ubah CP & Tujuan Pembelajaran', modul: 'Kurikulum & KKM', detail: `${mapel} Fase ${fase}: ${cpBaru.length} elemen, ${tpBaru.length} TP` });
      setBerubah(false);
      await Promise.all([refreshCp(), refreshTp()]);
      toast(`Capaian & tujuan pembelajaran ${mapel} Fase ${fase} tersimpan.`);
    } catch (e) {
      toast(/tidak dikenal/i.test(e.message) ? 'Apps Script Akademik belum diperbarui (tab "cp"/"tp" belum dikenal). Tempel ulang Code-Akademik.gs terbaru lalu Deploy → New version.' : e.message, 'error');
    } finally { setMenyimpan(false); }
  }

  const totalTp = Object.values(dTp).reduce((a, l) => a + l.length, 0);
  const totalJp = Object.values(dTp).reduce((a, l) => a + l.reduce((b, x) => b + (Number(x.jp) || 0), 0), 0);

  if (!jenjangSekolah.length) return <p className="paud-kosong">Belum ada jenjang sekolah (non-PAUD). Atur di Data Kelas &amp; Rombel.</p>;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><div><h3>Capaian &amp; tujuan pembelajaran</h3>
          <p>CP diisi sekali per mapel per fase (sesuai dokumen resmi). Dari CP, sekolah memecahnya jadi tujuan pembelajaran (TP) per kelas per semester — urutannya menjadi alur tujuan pembelajaran (ATP). TP inilah yang nanti dipakai guru di Modul Ajar dan saat menilai.</p></div></div>
        <div className="card-body">
          <div className="filter-bar">
            <Field label="Jenjang"><Select value={jenjang} onChange={setJenjang} disabled={berubah} options={jenjangSekolah.map(j => ({ value: j.kode, label: j.nama || j.kode }))} /></Field>
            <Field label="Mata pelajaran" grow><Select value={mapel} onChange={setMapel} disabled={berubah} options={mapelJenjang} /></Field>
            <Field label="Fase"><Select value={fase} onChange={setFase} disabled={berubah} options={faseList.map(f => ({ value: f, label: `Fase ${f} (${KELAS_FASE[f]})` }))} /></Field>
          </div>
          {berubah && <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#8A5A00' }}>Ada perubahan yang belum disimpan — simpan atau batalkan dulu sebelum pindah mapel/fase.</p>}

          <div className="table-scroll">
            <table className="tp-ringkas">
              <thead><tr><th>Mata pelajaran</th>{tingkatJenjang.map(t => <th key={t}>{namaTingkat(t)}</th>)}</tr></thead>
              <tbody>
                {mapelJenjang.map(m => (
                  <tr key={m} className={m === mapel ? 'on' : ''}>
                    <td>{m}</td>
                    {tingkatJenjang.map(t => {
                      const n = ringkasan[`${m}|${t}`] || 0;
                      const f = faseDariTingkat(t);
                      return (
                        <td key={t}>
                          <button type="button" disabled={berubah} className={`tp-sel ${n ? 'isi' : ''} ${m === mapel && f === fase ? 'pilih' : ''}`}
                            title={`${m} · ${namaTingkat(t)}${adaCp.has(`${m}|${f}`) ? ' · CP sudah diisi' : ' · CP belum diisi'}`}
                            onClick={() => { setMapel(m); setFase(f); }}>
                            {n ? `${n} TP` : '—'}{adaCp.has(`${m}|${f}`) ? '' : <i className="tp-tanpa-cp" aria-label="CP belum diisi" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>Klik sel untuk membuka. Titik merah = CP fase itu belum diisi.</p>
        </div>
      </div>

      {mapel && fase && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><div><h3>Capaian pembelajaran — {mapel}, Fase {fase}</h3><p>Berlaku untuk {KELAS_FASE[fase]}. Satu baris per elemen, mis. "Bilangan", "Aljabar", "Pengukuran".</p></div></div>
            <div className="card-body">
              {dCp.map((c, i) => (
                <div key={i} className="tp-cp">
                  <input className="input-cell" value={c.elemen} placeholder="Nama elemen" aria-label={`Elemen ${i + 1}`} onChange={e => ubahCp(d => d.map((x, k) => (k === i ? { ...x, elemen: e.target.value } : x)))} />
                  <textarea rows={3} className="input-cell" value={c.capaian} placeholder="Tempel teks capaian pembelajaran elemen ini…" aria-label={`Capaian ${i + 1}`} onChange={e => ubahCp(d => d.map((x, k) => (k === i ? { ...x, capaian: e.target.value } : x)))} />
                  <button type="button" className="btn-icon danger" aria-label={`Hapus elemen ${c.elemen || i + 1}`} onClick={() => ubahCp(d => d.filter((_, k) => k !== i))}>✕</button>
                </div>
              ))}
              {!dCp.length && <p className="paud-kosong" style={{ marginTop: 0 }}>Belum ada CP untuk mapel &amp; fase ini.</p>}
              <button type="button" className="btn btn-sm" onClick={() => ubahCp(d => [...d, { elemen: '', capaian: '' }])}>+ Tambah elemen</button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><div><h3>Tujuan pembelajaran (ATP) — {mapel}</h3>
              <p>Urutan di sini = urutan diajarkan. Kode dibuat otomatis: kelas.semester.urutan. Total {totalTp} TP{totalJp ? `, ${totalJp} JP` : ''}.</p></div></div>
            <div className="card-body">
              {tingkatFase.map(t => (
                <div key={t} className="tp-kelas">
                  <h4>{namaTingkat(t)}</h4>
                  <div className="tp-sem-grid">
                    {SEMESTER.map(sem => {
                      const kunci = kunciKel(t, sem);
                      const list = dTp[kunci] || [];
                      const jp = list.reduce((a, x) => a + (Number(x.jp) || 0), 0);
                      return (
                        <div key={sem} className="tp-sem">
                          <div className="tp-sem-h"><b>Semester {sem}</b><span>{list.length} TP{jp ? ` · ${jp} JP` : ''}</span></div>
                          {list.map((x, i) => (
                            <div key={i} className="tp-baris">
                              <div className="tp-geser">
                                <button type="button" className="btn-icon" disabled={i === 0} onClick={() => ubahTp(kunci, l => geser(l, i, -1))} aria-label="Naikkan">▲</button>
                                <button type="button" className="btn-icon" disabled={i === list.length - 1} onClick={() => ubahTp(kunci, l => geser(l, i, 1))} aria-label="Turunkan">▼</button>
                              </div>
                              <div className="tp-isi">
                                <div className="tp-meta">
                                  <code>{kodeTp(t, sem, i + 1)}</code>
                                  <select className="input-cell" value={x.elemen} aria-label="Elemen" onChange={e => ubahTp(kunci, l => l.map((y, k) => (k === i ? { ...y, elemen: e.target.value } : y)))}>
                                    <option value="">— elemen —</option>
                                    {[...new Set([...elemenList, x.elemen].filter(Boolean))].map(el => <option key={el}>{el}</option>)}
                                  </select>
                                  <input className="input-cell tp-jp" type="number" min="0" value={x.jp ?? ''} placeholder="JP" aria-label="Alokasi JP" onChange={e => ubahTp(kunci, l => l.map((y, k) => (k === i ? { ...y, jp: e.target.value } : y)))} />
                                </div>
                                <textarea rows={2} className="input-cell" value={x.tujuan} placeholder="Peserta didik dapat …" aria-label={`Tujuan ${kodeTp(t, sem, i + 1)}`} onChange={e => ubahTp(kunci, l => l.map((y, k) => (k === i ? { ...y, tujuan: e.target.value } : y)))} />
                              </div>
                              <button type="button" className="btn-icon danger" aria-label={`Hapus ${kodeTp(t, sem, i + 1)}`} onClick={() => ubahTp(kunci, l => l.filter((_, k) => k !== i))}>✕</button>
                            </div>
                          ))}
                          {tempel?.kunci === kunci ? (
                            <div className="tp-tempel">
                              <textarea rows={5} autoFocus value={tempel.teks} placeholder={'Satu tujuan per baris, mis.\nPeserta didik dapat membilang sampai 20\nPeserta didik dapat membandingkan dua bilangan'} onChange={e => setTempel({ kunci, teks: e.target.value })} />
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button type="button" className="btn btn-sm btn-primary" onClick={terapkanTempel}>Tambahkan</button>
                                <button type="button" className="btn btn-sm" onClick={() => setTempel(null)}>Batal</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button type="button" className="btn btn-sm" onClick={() => ubahTp(kunci, l => [...l, { idTp: '', elemen: '', tujuan: '', jp: '', aktif: true }])}>+ Tambah TP</button>
                              <button type="button" className="btn btn-sm" onClick={() => setTempel({ kunci, teks: '' })}>Tempel banyak sekaligus</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="save-bar">
            {berubah ? <span className="badge badge-gold">Ada perubahan belum disimpan</span> : <span className="badge badge-muted">Tersimpan</span>}
            {berubah && <button className="btn" onClick={() => { setDCp(ambilCp()); setDTp(ambilTp()); setBerubah(false); }}>Batalkan</button>}
            <button className="btn btn-primary" onClick={simpan} disabled={menyimpan || !berubah}>{menyimpan ? 'Menyimpan…' : 'Simpan CP & TP'}</button>
          </div>
        </>
      )}
    </div>
  );
}
