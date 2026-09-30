import { useId, useMemo, useState } from 'react';
import DataTable from '../../components/common/DataTable';
import { hitungUsia } from '../../db/helpers';
import { exportToExcel, printElementById } from '../../utils/exportTable';
import { useAppData } from '../../context/AppContext';
import { fetchSiswaFromSheet, bulkUpdateSiswaInSheet } from '../../services/googleSheets';
import SaveProgressModal from '../../components/common/SaveProgressModal';
import { APP_NAME } from '../../config/appInfo';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 'Semua'];

function PindahRombelMassal() {
  const { siswa, kelas, refreshSiswa, toast } = useAppData();
  const [rombelTujuan, setRombelTujuan] = useState('');
  const [filterKelasSumber, setFilterKelasSumber] = useState('Semua');
  const [subTab, setSubTab] = useState('belum'); // 'belum' | 'sudah' -- blm/sudah ada Rombel
  const [cari, setCari] = useState('');
  const [terpilih, setTerpilih] = useState({}); // { [siswaId]: true }
  const [memproses, setMemproses] = useState(false);
  const [phase, setPhase] = useState(null);

  const siswaAktif = useMemo(() => siswa.filter(s => (s.status || 'Aktif') === 'Aktif'), [siswa]);

  const daftarKelasSumber = useMemo(() => {
    const set = new Set(siswaAktif.map(s => s.kelasTingkat).filter(Boolean));
    return Array.from(set).sort();
  }, [siswaAktif]);

  // Dipisah dulu berdasar Kelas & sudah/belum py Rombel -- SEBELUM pencarian nama/NISN,
  // supaya hitungan jumlah di label tab (Belum/Sudah) ikut Filter Kelas yg dipilih.
  const siswaSesuaiFilterAtas = useMemo(() => {
    return siswaAktif.filter(s => filterKelasSumber === 'Semua' || s.kelasTingkat === filterKelasSumber);
  }, [siswaAktif, filterKelasSumber]);

  const belumAdaRombel = useMemo(() => siswaSesuaiFilterAtas.filter(s => !s.rombel), [siswaSesuaiFilterAtas]);
  const sudahAdaRombel = useMemo(() => siswaSesuaiFilterAtas.filter(s => !!s.rombel), [siswaSesuaiFilterAtas]);
  const sumberSubTab = subTab === 'belum' ? belumAdaRombel : sudahAdaRombel;

  const hasilCari = useMemo(() => {
    if (!cari.trim()) return sumberSubTab;
    const t = cari.trim().toLowerCase();
    return sumberSubTab.filter(s => s.nama.toLowerCase().includes(t) || s.nisn.includes(t));
  }, [sumberSubTab, cari]);

  const jumlahTerpilih = Object.values(terpilih).filter(Boolean).length;

  function toggleSatu(id, checked) {
    setTerpilih(prev => ({ ...prev, [id]: checked }));
  }
  function toggleSemuaHasil(checked) {
    const next = { ...terpilih };
    hasilCari.forEach(s => { next[s.id] = checked; });
    setTerpilih(next);
  }
  const semuaHasilTercentang = hasilCari.length > 0 && hasilCari.every(s => terpilih[s.id]);

  async function pindahkan() {
    if (!rombelTujuan) { toast('Pilih rombel tujuan dulu.', 'error'); return; }
    const daftarNisn = siswaAktif.filter(s => terpilih[s.id]).map(s => s.nisn);
    if (daftarNisn.length === 0) { toast('Pilih minimal 1 siswa dulu.', 'error'); return; }
    const rombel = kelas.find(k => k.id === rombelTujuan);
    if (!rombel) { toast('Rombel tujuan tidak ditemukan.', 'error'); return; }

    setMemproses(true);
    setPhase('saving');
    try {
      // Ambil data MENTAH terbaru langsung dari Sheet (bukan dari state ternormalisasi)
      // hanya utk menerjemahkan NISN -> "No" baris -- lalu SEMUA siswa terpilih dikirim
      // dalam 1 REQUEST "bulkUpdate" (patch 2 kolom saja: Kelas/Tingkat & Rombel), BUKAN
      // 1 request update per siswa berturut-turut spt sebelumnya. Alasan: tiap request
      // "update" biasa (updateSiswaInSheet) membuat Apps Script mencari barisnya dari
      // awal sheet -- kalau sheet siswa sudah beratus-ratus baris, dan yg dipindah
      // banyak siswa sekaligus, waktu totalnya menumpuk (kelihatan spt macet di
      // "Memindahkan..." lalu akhirnya gagal/timeout tanpa pesan jelas). "bulkUpdate"
      // membaca kolom "No" SEKALI di sisi server lalu menerapkan semua patch dlm 1
      // eksekusi -- jauh lebih cepat & tahan gagal utk banyak siswa sekaligus.
      const rawRows = await fetchSiswaFromSheet();
      const updates = [];
      const nisnTidakKetemu = [];
      daftarNisn.forEach(nisn => {
        const raw = rawRows.find(r => String(r['NISN'] ?? '').trim() === nisn);
        if (!raw) { nisnTidakKetemu.push(nisn); return; }
        updates.push({ no: raw['No'], patch: { 'Kelas/Tingkat': rombel.tingkat, Rombel: rombel.namaKelas } });
      });
      const hasil = await bulkUpdateSiswaInSheet(updates);
      setPhase('done');
      await new Promise(r => setTimeout(r, 1000));
      const pesanGagal = (hasil.noTidakDitemukan?.length || 0) + nisnTidakKetemu.length;
      toast(
        `${hasil.jumlahDiupdate} siswa berhasil dipindahkan ke Kelas ${rombel.tingkat} Rombel ${rombel.namaKelas}.`
        + (pesanGagal > 0 ? ` (${pesanGagal} siswa gagal ditemukan di Sheet, coba muat ulang data.)` : ''),
        pesanGagal > 0 ? 'error' : undefined
      );
      setTerpilih({});
      refreshSiswa();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMemproses(false);
      setPhase(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h3>🔀 Pindah Rombel Massal</h3><p>Pilih beberapa siswa sekaligus, lalu pindahkan ke rombel (ruang kelas) tujuan.</p></div>
      </div>
      <div className="card-body">
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Filter Kelas (Sumber)</label>
            <select value={filterKelasSumber} onChange={e => { setFilterKelasSumber(e.target.value); setTerpilih({}); }}>
              <option value="Semua">Semua Kelas</option>
              {daftarKelasSumber.map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Rombel Tujuan</label>
            <select value={rombelTujuan} onChange={e => setRombelTujuan(e.target.value)}>
              <option value="">— pilih rombel tujuan —</option>
              {kelas.slice().sort((a, b) => a.tingkat.localeCompare(b.tingkat)).map(k => (
                <option key={k.id} value={k.id}>Kelas {k.tingkat} — Rombel {k.namaKelas}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Cari Siswa</label>
            <input type="text" value={cari} onChange={e => setCari(e.target.value)} placeholder="Nama atau NISN..." />
          </div>
        </div>

        <div className="seg-tabs" style={{ marginBottom: 14 }}>
          <button className={`seg-tab ${subTab === 'belum' ? 'active' : ''}`} onClick={() => { setSubTab('belum'); setTerpilih({}); }}>
            ⚠️ BELUM ADA ROMBEL ({belumAdaRombel.length})
          </button>
          <button className={`seg-tab ${subTab === 'sudah' ? 'active' : ''}`} onClick={() => { setSubTab('sudah'); setTerpilih({}); }}>
            ✅ SUDAH ADA ROMBEL ({sudahAdaRombel.length})
          </button>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input type="checkbox" checked={semuaHasilTercentang} onChange={e => toggleSemuaHasil(e.target.checked)} style={{ width: 15, height: 15 }} />
                </th>
                <th style={{ width: 50 }}>No</th>
                <th>NISN</th>
                <th>Nama</th>
                <th>Jenis Kelamin</th>
                <th>Rombel Saat Ini</th>
              </tr>
            </thead>
            <tbody>
              {hasilCari.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Tidak ada siswa yang cocok.</td></tr>
              )}
              {hasilCari.map((s, idx) => (
                <tr key={s.id}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={!!terpilih[s.id]} onChange={e => toggleSatu(s.id, e.target.checked)} style={{ width: 15, height: 15 }} />
                  </td>
                  <td>{idx + 1}</td>
                  <td>{s.nisn || '-'}</td>
                  <td>{s.nama}</td>
                  <td>{s.jenisKelamin || '-'}</td>
                  <td>{s.rombel ? s.rombel : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>belum ada</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{jumlahTerpilih} siswa dipilih</span>
          <button className="btn btn-primary" onClick={pindahkan} disabled={memproses || jumlahTerpilih === 0 || !rombelTujuan}>
            {memproses ? 'Memindahkan...' : `Pindahkan (${jumlahTerpilih})`}
          </button>
        </div>
      </div>
      {phase && <SaveProgressModal phase={phase} />}
    </div>
  );
}

export default function RombelTab() {
  const { siswa, siswaLoading, siswaLoaded, kelas, profilSekolah } = useAppData();

  // Dropdown "sedang dipilih" (blm tentu sdh ditampilkan) vs "laporanAktif" (snapshot
  // yg BENAR-BENAR ditampilkan setelah tombol Tampilkan diklik) -- sengaja dipisah,
  // supaya alurnya persis: pilih Kelas -> pilih Rombel -> klik Tampilkan -> baru
  // laporan (+ tombol Excel/PDF) muncul. Ganti pilihan dropdown TIDAK langsung
  // mengubah laporan yg sedang tampil sampai tombol Tampilkan diklik lagi.
  const [kelasDipilih, setKelasDipilih] = useState('');
  const [rombelDipilih, setRombelDipilih] = useState('');
  const [laporanAktif, setLaporanAktif] = useState(null); // { kelas, rombel } | null
  const [printingAll, setPrintingAll] = useState(false);
  const printId = 'print-' + useId().replace(/:/g, '');
  const namaSekolah = profilSekolah?.nama || APP_NAME;

  // Rombel hanya utk siswa Aktif -- yg Lulus/Pindah/Berhenti ada di tab Riwayat Siswa.
  const siswaAktif = useMemo(() => siswa.filter(s => (s.status || 'Aktif') === 'Aktif'), [siswa]);

  // Dicocokkan per ROMBEL spesifik (tingkat+namaKelas), BUKAN cuma tingkat -- 1
  // tingkat bisa py beberapa rombel (1A, 1B) dgn wali kelas BEDA-BEDA.
  const waliKelasByRombel = useMemo(() => {
    const map = {};
    kelas.forEach(k => { if (k.tingkat && k.namaKelas && k.waliKelas) map[`${k.tingkat}|${k.namaKelas}`] = k.waliKelas; });
    return map;
  }, [kelas]);

  // Pilihan Kelas & Rombel diambil dari data KONFIGURASI Kelas (menu Data Kelas &
  // Rombel), BUKAN dari siswa yg sudah ditempatkan -- supaya rombel yg baru dibuat
  // dan belum py siswa pun tetap muncul di dropdown.
  const daftarKelasOptions = useMemo(() => {
    const set = new Set(kelas.map(k => k.tingkat).filter(Boolean));
    return Array.from(set).sort();
  }, [kelas]);

  const daftarRombelOptions = useMemo(() => {
    if (!kelasDipilih) return [];
    const set = new Set(kelas.filter(k => k.tingkat === kelasDipilih).map(k => k.namaKelas).filter(Boolean));
    return Array.from(set).sort();
  }, [kelas, kelasDipilih]);

  function gantiKelasDipilih(v) {
    setKelasDipilih(v);
    setRombelDipilih(''); // daftar rombel berubah total kalau kelas ganti -- reset biar tdk kepilih rombel yg tdk relevan
  }

  function tampilkanLaporan() {
    setLaporanAktif({ kelas: kelasDipilih, rombel: rombelDipilih });
  }

  const dataLaporan = useMemo(() => {
    if (!laporanAktif) return [];
    return siswaAktif
      .filter(s => s.kelasTingkat === laporanAktif.kelas && s.rombel === laporanAktif.rombel)
      .map(s => {
        const usia = hitungUsia(s.tanggalLahir);
        const lp = s.jenisKelamin === 'Laki-laki' ? 'L' : s.jenisKelamin === 'Perempuan' ? 'P' : '-';
        const wali = waliKelasByRombel[`${s.kelasTingkat}|${s.rombel}`] || 'Belum ditentukan';
        return { ...s, usiaLabel: usia !== null ? `${usia} tahun` : '-', lp, wali };
      });
  }, [siswaAktif, laporanAktif, waliKelasByRombel]);

  const judulLaporan = laporanAktif ? `Kelas ${laporanAktif.kelas} — Rombel ${laporanAktif.rombel}` : '';

  const columns = [
    { key: 'nisn', label: 'NISN', accessor: r => r.nisn || '-' },
    { key: 'nama', label: 'Nama Lengkap', accessor: r => r.nama, sortable: true },
    { key: 'nik', label: 'NIK', accessor: r => r.nik || '-' },
    { key: 'usiaLabel', label: 'Usia', accessor: r => r.usiaLabel },
    { key: 'lp', label: 'L/P', accessor: r => r.lp },
    { key: 'rombel', label: 'Rombel', accessor: r => r.rombel || '-' },
    { key: 'wali', label: 'Wali Kelas', render: r => <span style={waliKelasByRombel[`${r.kelasTingkat}|${r.rombel}`] ? undefined : { color: 'var(--muted)', fontStyle: 'italic' }}>{r.wali}</span> },
  ];

  function handlePrint() {
    // Pola sama spt Riwayat Pembayaran/LaporanRekapAset -- nyalakan forceShowAll dulu,
    // tunggu React render ulang dgn SEMUA baris, baru panggil print.
    setPrintingAll(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        printElementById(printId);
        setPrintingAll(false);
      });
    });
  }

  function exportExcelRombel() {
    const headers = ['NISN', 'Nama Lengkap', 'NIK', 'Usia', 'L/P', 'Rombel', 'Wali Kelas'];
    const rows = dataLaporan.map(s => ({ NISN: s.nisn || '-', 'Nama Lengkap': s.nama, NIK: s.nik || '-', Usia: s.usiaLabel, 'L/P': s.lp, Rombel: s.rombel || '-', 'Wali Kelas': s.wali }));
    exportToExcel(
      headers, rows, `Laporan Rombel - ${judulLaporan}`,
      [namaSekolah, 'Laporan Rombel', judulLaporan],
      { 'Nama Lengkap': `Total: ${rows.length} siswa` }
    );
  }

  return (
    <>
      <PindahRombelMassal />

      <div className="card">
        <div className="card-head">
          <div>
            <h3>📋 Laporan Rombel</h3>
            <p>{laporanAktif ? `${dataLaporan.length} siswa — ${judulLaporan}` : 'Pilih kelas dan rombel, lalu klik Tampilkan untuk melihat daftar siswanya.'}</p>
          </div>
          {laporanAktif && (
            <div className="no-print" style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={exportExcelRombel} disabled={dataLaporan.length === 0}>📊 Excel</button>
              <button className="btn btn-sm" onClick={handlePrint} disabled={dataLaporan.length === 0}>🖨️ PDF</button>
            </div>
          )}
        </div>
        <div className="card-body">
          <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 16, padding: '12px 14px', background: '#F6F8F5', borderRadius: 8 }}>
            <div className="field">
              <label>Pilih Kelas</label>
              <select value={kelasDipilih} onChange={e => gantiKelasDipilih(e.target.value)}>
                <option value="">— pilih kelas —</option>
                {daftarKelasOptions.map(k => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Pilih Rombel</label>
              <select value={rombelDipilih} onChange={e => setRombelDipilih(e.target.value)} disabled={!kelasDipilih}>
                <option value="">— pilih rombel —</option>
                {daftarRombelOptions.map(r => <option key={r} value={r}>Rombel {r}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={tampilkanLaporan} disabled={!kelasDipilih || !rombelDipilih}>🔍 Tampilkan</button>
          </div>

          {siswaLoading && !siswaLoaded && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Memuat data...</p>}
          {siswaLoaded && !laporanAktif && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Pilih kelas dan rombel di atas, lalu klik <strong>Tampilkan</strong>.</p>}
          {siswaLoaded && laporanAktif && dataLaporan.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Belum ada siswa aktif di rombel ini.</p>}
          {siswaLoaded && laporanAktif && dataLaporan.length > 0 && (
            <div id={printId}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 19 }}>{namaSekolah}</h2>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Laporan Rombel</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{judulLaporan} — {dataLaporan.length} siswa</div>
              </div>
              <DataTable
                columns={columns}
                data={dataLaporan}
                searchFn={(r, t) => (r.nama || '').toLowerCase().includes(t) || (r.nisn || '').includes(t) || (r.nik || '').includes(t)}
                emptyMessage="Tidak ada siswa yang cocok dengan pencarian ini."
                rowKey={r => r.id}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                forceShowAll={printingAll}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
