import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { STATUS_RIWAYAT_AKADEMIK_OPTIONS, kelasRombelPadaTahun } from '../../db/riwayatAkademikFields';
import {
  keputusanDefault, targetKelasUntukKeputusan, saranRombelTujuan, waliKelasUntuk,
  buildRencanaKenaikanKelas, STATUS_TIDAK_LANJUT,
} from '../../db/kenaikanKelasHelpers';
import { bulkAddRiwayatAkademikToSheet, bulkUpdateRiwayatAkademikInSheet, bulkUpdateSiswaInSheet, addLogEntry } from '../../services/googleSheets';
import SaveProgressModal from '../../components/common/SaveProgressModal';

// Keputusan yg TIDAK butuh Kelas/Rombel tujuan (siswa tdk lanjut ke tahun ajaran baru).
const KEPUTUSAN_LANJUT = STATUS_RIWAYAT_AKADEMIK_OPTIONS.filter(s => !STATUS_TIDAK_LANJUT.includes(s) && s !== 'Aktif');
const SEMUA_KEPUTUSAN = [...KEPUTUSAN_LANJUT, ...STATUS_TIDAK_LANJUT];

function tanggalHariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function KenaikanKelasTab() {
  const {
    siswa, siswaLoading, siswaLoaded, kelas, tahunAjaran, tahunAjaranAktif,
    riwayatAkademik, refreshRiwayatAkademik, refreshSiswa, toast,
  } = useAppData();
  const { currentUser } = useAuth();

  const daftarTahunAjaran = useMemo(
    () => tahunAjaran.slice().sort((a, b) => String(a.mulai).localeCompare(String(b.mulai))),
    [tahunAjaran]
  );

  const [taAsal, setTaAsal] = useState(() => tahunAjaranAktif?.label || '');
  const [taTujuan, setTaTujuan] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [cari, setCari] = useState('');
  const [terpilih, setTerpilih] = useState({}); // { [siswaId]: true }
  const [override, setOverride] = useState({}); // { [siswaId]: { decision, targetKelas, targetRombel, keterangan } }
  const [tampilkanSudahDiproses, setTampilkanSudahDiproses] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [phase, setPhase] = useState(null);

  const siswaAktif = useMemo(() => siswa.filter(s => (s.status || 'Aktif') === 'Aktif'), [siswa]);

  // Kondisi siswa PADA Tahun Ajaran Asal yg dipilih -- utamakan Riwayat Akademik kalau
  // sudah tercatat, jatuhkan ke kondisi Data Siswa saat ini kalau belum (baru pertama
  // kali fitur ini dipakai, jadi tahun asal belum pernah tercatat sama sekali).
  const kondisiAsalById = useMemo(() => {
    const map = {};
    siswaAktif.forEach(s => {
      map[s.id] = taAsal
        ? kelasRombelPadaTahun(s.nisn, taAsal, riwayatAkademik, { kelasTingkat: s.kelasTingkat, rombel: s.rombel })
        : { kelasTingkat: s.kelasTingkat, rombel: s.rombel, dariRiwayat: false };
    });
    return map;
  }, [siswaAktif, taAsal, riwayatAkademik]);

  const sudahDiprosesSet = useMemo(() => {
    if (!taTujuan) return new Set();
    return new Set(
      riwayatAkademik.filter(r => r.tahunAjaran === taTujuan).map(r => r.nisn)
    );
  }, [riwayatAkademik, taTujuan]);

  const daftarKelasSumber = useMemo(() => {
    const set = new Set(Object.values(kondisiAsalById).map(k => k.kelasTingkat).filter(Boolean));
    return Array.from(set).sort();
  }, [kondisiAsalById]);

  function keputusanEfektif(s) {
    const kondisi = kondisiAsalById[s.id] || { kelasTingkat: s.kelasTingkat, rombel: s.rombel };
    const ov = override[s.id];
    const decision = ov?.decision || keputusanDefault(kondisi.kelasTingkat);
    const targetKelasDefault = targetKelasUntukKeputusan(decision, kondisi.kelasTingkat);
    const targetKelas = ov?.targetKelas !== undefined && ov.targetKelas !== null ? ov.targetKelas : targetKelasDefault;
    const targetRombelDefault = targetKelas ? saranRombelTujuan(kelas, targetKelas, kondisi.rombel) : '';
    const targetRombel = ov?.targetRombel !== undefined ? ov.targetRombel : targetRombelDefault;
    const keterangan = ov?.keterangan || '';
    return { kondisi, decision, targetKelas, targetRombel, keterangan };
  }

  function setOverrideField(siswaId, field, value) {
    setOverride(prev => ({ ...prev, [siswaId]: { ...prev[siswaId], [field]: value } }));
  }

  function gantiKeputusan(s, decision) {
    const kondisi = kondisiAsalById[s.id];
    const targetKelas = targetKelasUntukKeputusan(decision, kondisi.kelasTingkat);
    const targetRombel = targetKelas ? saranRombelTujuan(kelas, targetKelas, kondisi.rombel) : '';
    setOverride(prev => ({ ...prev, [s.id]: { ...prev[s.id], decision, targetKelas, targetRombel } }));
  }

  const daftarTerfilter = useMemo(() => {
    return siswaAktif
      .filter(s => tampilkanSudahDiproses || !sudahDiprosesSet.has(s.nisn))
      .filter(s => filterKelas === 'Semua' || (kondisiAsalById[s.id]?.kelasTingkat || '') === filterKelas)
      .filter(s => {
        if (!cari.trim()) return true;
        const t = cari.trim().toLowerCase();
        return s.nama.toLowerCase().includes(t) || s.nisn.includes(t);
      });
  }, [siswaAktif, tampilkanSudahDiproses, sudahDiprosesSet, filterKelas, kondisiAsalById, cari]);

  const jumlahTerpilih = Object.values(terpilih).filter(Boolean).length;

  function toggleSatu(id, checked) {
    setTerpilih(prev => ({ ...prev, [id]: checked }));
  }
  function toggleSemuaHasil(checked) {
    const next = { ...terpilih };
    daftarTerfilter.forEach(s => { next[s.id] = checked; });
    setTerpilih(next);
  }
  const semuaHasilTercentang = daftarTerfilter.length > 0 && daftarTerfilter.every(s => terpilih[s.id]);

  // ---- Tetapkan keputusan yg SAMA sekaligus utk semua baris terpilih ----
  const [keputusanMassal, setKeputusanMassal] = useState('Naik Kelas');
  const [rombelMassal, setRombelMassal] = useState('');
  function terapkanKeputusanMassal() {
    const next = { ...override };
    daftarTerfilter.forEach(s => {
      if (!terpilih[s.id]) return;
      const kondisi = kondisiAsalById[s.id];
      const targetKelas = targetKelasUntukKeputusan(keputusanMassal, kondisi.kelasTingkat);
      const targetRombel = rombelMassal || (targetKelas ? saranRombelTujuan(kelas, targetKelas, kondisi.rombel) : '');
      next[s.id] = { ...next[s.id], decision: keputusanMassal, targetKelas, targetRombel };
    });
    setOverride(next);
    toast(`Keputusan "${keputusanMassal}" diterapkan ke ${jumlahTerpilih} siswa terpilih.`);
  }

  const daftarRombelUntukTingkat = (tingkat) => Array.from(new Set(kelas.filter(k => k.tingkat === tingkat).map(k => k.namaKelas))).filter(Boolean).sort();

  async function prosesKenaikanKelas() {
    if (!taAsal || !taTujuan) { toast('Pilih Tahun Ajaran Asal dan Tujuan dulu.', 'error'); return; }
    if (taAsal === taTujuan) { toast('Tahun Ajaran Asal dan Tujuan tidak boleh sama.', 'error'); return; }
    const siswaTerpilih = daftarTerfilter.filter(s => terpilih[s.id]);
    if (siswaTerpilih.length === 0) { toast('Pilih minimal 1 siswa dulu.', 'error'); return; }

    const keputusanPerSiswa = {};
    for (const s of siswaTerpilih) {
      const eff = keputusanEfektif(s);
      if (!STATUS_TIDAK_LANJUT.includes(eff.decision) && !eff.targetKelas) {
        toast(`${s.nama}: Kelas/Tingkat tujuan tidak bisa ditentukan otomatis. Cek keputusannya.`, 'error');
        return;
      }
      keputusanPerSiswa[s.id] = {
        decision: eff.decision,
        targetKelas: eff.targetKelas,
        targetRombel: eff.targetRombel,
        targetWaliKelas: eff.targetKelas ? waliKelasUntuk(kelas, eff.targetKelas, eff.targetRombel) : '',
        keterangan: eff.keterangan,
      };
    }

    const rencana = buildRencanaKenaikanKelas({
      siswaTerpilih, keputusanPerSiswa, taAsalLabel: taAsal, taTujuanLabel: taTujuan,
      riwayatAkademik, tanggalHariIni: tanggalHariIni(),
    });

    setMemproses(true);
    setPhase('saving');
    try {
      if (rencana.riwayatAsalInsert.length > 0) await bulkAddRiwayatAkademikToSheet(rencana.riwayatAsalInsert);
      if (rencana.riwayatAsalUpdate.length > 0) await bulkUpdateRiwayatAkademikInSheet(rencana.riwayatAsalUpdate);
      if (rencana.riwayatTujuanInsert.length > 0) await bulkAddRiwayatAkademikToSheet(rencana.riwayatTujuanInsert);
      if (rencana.siswaCacheUpdate.length > 0) await bulkUpdateSiswaInSheet(rencana.siswaCacheUpdate);

      const jumlahNaik = siswaTerpilih.filter(s => keputusanPerSiswa[s.id].decision === 'Naik Kelas').length;
      const jumlahTinggal = siswaTerpilih.filter(s => keputusanPerSiswa[s.id].decision === 'Tinggal Kelas').length;
      const jumlahLulus = siswaTerpilih.filter(s => keputusanPerSiswa[s.id].decision === 'Lulus').length;
      const jumlahLain = siswaTerpilih.length - jumlahNaik - jumlahTinggal - jumlahLulus;

      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Proses Kenaikan Kelas Tahunan',
        modul: 'Data Siswa',
        detail: `${taAsal} -> ${taTujuan}: ${jumlahNaik} naik kelas, ${jumlahTinggal} tinggal kelas, ${jumlahLulus} lulus, ${jumlahLain} pindah/berhenti.`,
      });

      setPhase('done');
      await new Promise(r => setTimeout(r, 1000));
      toast(`Berhasil diproses: ${jumlahNaik} naik kelas, ${jumlahTinggal} tinggal kelas, ${jumlahLulus} lulus, ${jumlahLain} pindah/berhenti.`);
      setTerpilih({});
      setOverride({});
      await Promise.all([refreshRiwayatAkademik(), refreshSiswa()]);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMemproses(false);
      setPhase(null);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <h3>🎓 Proses Kenaikan Kelas Tahunan</h3>
            <p>
              Memproses naik/tinggal kelas/lulus/pindah/berhenti utk banyak siswa sekaligus di awal tahun ajaran baru.
              Setiap siswa yg diproses otomatis tercatat di <strong>Riwayat Akademik</strong> — data lama tidak pernah ditimpa, hanya ditambah.
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="field">
              <label>Tahun Ajaran Asal (yang berakhir)</label>
              <select value={taAsal} onChange={e => setTaAsal(e.target.value)}>
                <option value="">— pilih tahun ajaran asal —</option>
                {daftarTahunAjaran.map(t => <option key={t.id} value={t.label}>{t.label}{t.aktif ? ' (aktif)' : ''}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tahun Ajaran Tujuan (yang baru)</label>
              <select value={taTujuan} onChange={e => setTaTujuan(e.target.value)}>
                <option value="">— pilih tahun ajaran tujuan —</option>
                {daftarTahunAjaran.filter(t => t.label !== taAsal).map(t => <option key={t.id} value={t.label}>{t.label}{t.aktif ? ' (aktif)' : ''}</option>)}
              </select>
            </div>
          </div>
          {!taTujuan && (
            <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Belum ada Tahun Ajaran Tujuan yang cocok? Tambahkan dulu lewat tab <strong>Profil Sekolah &amp; Tahun Ajaran &gt; Tahun Ajaran</strong>.
            </p>
          )}
        </div>
      </div>

      {taAsal && taTujuan && (
        <div className="card">
          <div className="card-head">
            <div><h3>Daftar Siswa &amp; Keputusan</h3><p>{daftarTerfilter.length} siswa ditampilkan. Ubah keputusan per baris, atau tetapkan massal ke siswa yang dicentang.</p></div>
          </div>
          <div className="card-body">
            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>Filter Kelas Asal</label>
                <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}>
                  <option value="Semua">Semua Kelas</option>
                  {daftarKelasSumber.map(k => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Cari Siswa</label>
                <input type="text" value={cari} onChange={e => setCari(e.target.value)} placeholder="Nama atau NISN..." />
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
                  <input type="checkbox" checked={tampilkanSudahDiproses} onChange={e => setTampilkanSudahDiproses(e.target.checked)} style={{ width: 15, height: 15 }} />
                  Tampilkan yang sudah diproses ke {taTujuan || 'tahun tujuan'}
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', padding: '12px 14px', background: '#F6F8F5', borderRadius: 8, marginBottom: 14 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Tetapkan keputusan massal ke terpilih</label>
                <select value={keputusanMassal} onChange={e => { setKeputusanMassal(e.target.value); setRombelMassal(''); }}>
                  {SEMUA_KEPUTUSAN.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              {KEPUTUSAN_LANJUT.includes(keputusanMassal) && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Rombel tujuan (opsional, kosongkan utk saran otomatis)</label>
                  <input type="text" value={rombelMassal} onChange={e => setRombelMassal(e.target.value)} placeholder="mis. A" style={{ width: 140 }} />
                </div>
              )}
              <button type="button" className="btn btn-sm btn-primary" onClick={terapkanKeputusanMassal} disabled={jumlahTerpilih === 0}>
                Terapkan ke {jumlahTerpilih} siswa terpilih
              </button>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }} className="table-scroll">
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input type="checkbox" checked={semuaHasilTercentang} onChange={e => toggleSemuaHasil(e.target.checked)} style={{ width: 15, height: 15 }} />
                    </th>
                    <th>NISN</th>
                    <th>Nama</th>
                    <th>Kelas/Rombel Asal</th>
                    <th>Keputusan</th>
                    <th>Kelas Tujuan</th>
                    <th>Rombel Tujuan</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {daftarTerfilter.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Tidak ada siswa yang cocok.</td></tr>
                  )}
                  {daftarTerfilter.map(s => {
                    const eff = keputusanEfektif(s);
                    const sudahDiproses = sudahDiprosesSet.has(s.nisn);
                    return (
                      <tr key={s.id} style={sudahDiproses ? { opacity: 0.55 } : undefined}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={!!terpilih[s.id]} onChange={e => toggleSatu(s.id, e.target.checked)} style={{ width: 15, height: 15 }} />
                        </td>
                        <td>{s.nisn || '-'}</td>
                        <td>{s.nama} {sudahDiproses && <span className="badge badge-muted" style={{ marginLeft: 6 }}>sudah diproses</span>}</td>
                        <td>{eff.kondisi.kelasTingkat ? `Kelas ${eff.kondisi.kelasTingkat}` : '-'} {eff.kondisi.rombel ? `· ${eff.kondisi.rombel}` : ''}</td>
                        <td>
                          <select value={eff.decision} onChange={e => gantiKeputusan(s, e.target.value)} style={{ padding: '6px 8px', fontSize: 12.5 }}>
                            {SEMUA_KEPUTUSAN.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </td>
                        <td>{eff.targetKelas ? `Kelas ${eff.targetKelas}` : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>-</span>}</td>
                        <td>
                          {KEPUTUSAN_LANJUT.includes(eff.decision) ? (
                            <select value={eff.targetRombel} onChange={e => setOverrideField(s.id, 'targetRombel', e.target.value)} style={{ padding: '6px 8px', fontSize: 12.5 }}>
                              <option value="">— pilih rombel —</option>
                              {daftarRombelUntukTingkat(eff.targetKelas).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          ) : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>-</span>}
                        </td>
                        <td>
                          <input type="text" value={eff.keterangan} onChange={e => setOverrideField(s.id, 'keterangan', e.target.value)} placeholder="opsional" style={{ padding: '6px 8px', fontSize: 12.5, width: 130 }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{jumlahTerpilih} siswa dipilih utk diproses</span>
              <button className="btn btn-primary" onClick={prosesKenaikanKelas} disabled={memproses || jumlahTerpilih === 0}>
                {memproses ? 'Memproses...' : `Proses Kenaikan Kelas (${jumlahTerpilih})`}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
              Catatan: proses ini TIDAK mengubah Tahun Ajaran mana yang aktif untuk penagihan SPP — atur itu terpisah lewat tab Tahun Ajaran kalau sudah siap.
            </p>
          </div>
        </div>
      )}

      {siswaLoading && !siswaLoaded && <div className="card"><div className="card-body" style={{ color: 'var(--muted)', fontSize: 13 }}>Memuat data siswa...</div></div>}

      {phase && <SaveProgressModal phase={phase} />}
    </>
  );
}
