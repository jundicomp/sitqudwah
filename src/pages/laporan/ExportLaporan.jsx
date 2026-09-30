import { useEffect, useMemo, useState } from 'react';
import Page from '../../components/layout/Page';
import useAkademikOptions from '../../hooks/useAkademikOptions';
import { Field, Select } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { MAPEL_OPTIONS, SEMESTER_OPTIONS, STATUS_PRESENSI, dalamRentang, labelRombel, predikatNilai, semesterDariTanggal } from '../../db/akademikFields';
import { STATUS_PRESENSI_GURU, pegawaiAktif } from '../../db/kepegawaianFields';
import { rekapPemasukanBulanan, rekapPengeluaranBulanan } from '../../db/laporanHelpers';
import { exportToExcel } from '../../utils/exportTable';
import { sekarangWIB } from '../../db/presensiBarcodeFields';

const rata = (a) => a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : '';
const pct = (h, t) => (t ? Math.round((h / t) * 1000) / 10 : '');

// Tiap laporan: grup, judul, keterangan, halaman acuan izin (pageId), filter yg dipakai, dan pembuat data.
function daftarLaporan(ctx, f) {
  const { siswa, guru, kelas, presensi, presensiGuru, nilai, prestasi, pelanggaran, kinerja, aset, allTagihan, tagihanTerbayar, pembayaran, pemasukanLain, pengeluaran, rombelList } = ctx;
  const siswaAktif = siswa.filter(s => s.status === 'Aktif');
  const semOk = (tgl) => f.semester === 'Semua' || semesterDariTanggal(tgl) === f.semester;
  const presRentang = presensi.filter(p => dalamRentang(p.tanggal, f.dari, f.sampai));
  const nilaiP = nilai.filter(n => n.tahunAjaran === f.ta && (f.semester === 'Semua' || n.semester === f.semester) && n.nilai !== null);
  return [
    { id: 'ringkasan', grup: 'Umum', judul: 'Ringkasan statistik sekolah', ket: 'Jumlah siswa per tingkat & jenis kelamin, guru, kelas, kehadiran, dan rata-rata nilai.', page: 'dashboard', filter: ['ta', 'rentang'],
      build: () => {
        const rows = [];
        const add = (Indikator, Nilai) => rows.push({ Indikator, Nilai });
        add('Siswa aktif', siswaAktif.length);
        [...new Set(siswaAktif.map(s => s.kelasTingkat))].sort().forEach(t => add(`  Kelas ${t || '-'}`, siswaAktif.filter(s => s.kelasTingkat === t).length));
        add('  Laki-laki', siswaAktif.filter(s => s.jenisKelamin === 'Laki-laki').length);
        add('  Perempuan', siswaAktif.filter(s => s.jenisKelamin === 'Perempuan').length);
        add('Guru & staff aktif', pegawaiAktif(guru).length);
        add('Kelas / rombel', kelas.length);
        add('Kehadiran siswa pada rentang (%)', pct(presRentang.filter(p => p.status === 'Hadir').length, presRentang.length));
        add(`Rata-rata nilai ${f.ta} ${f.semester}`, rata(nilaiP.map(n => n.nilai)));
        add(`Prestasi ${f.ta}`, prestasi.filter(p => p.tahunAjaran === f.ta).length);
        add(`Kasus pelanggaran ${f.ta}`, pelanggaran.filter(p => p.tahunAjaran === f.ta).length);
        return { headers: ['Indikator', 'Nilai'], rows };
      } },
    { id: 'siswa', grup: 'Data Induk', judul: 'Data siswa aktif', ket: 'Identitas dan kelas semua siswa aktif.', page: 'siswa', filter: [],
      build: () => ({ headers: ['Nama', 'NISN', 'Kelas', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'Alamat'],
        rows: siswaAktif.sort((a, b) => (a.kelasTingkat + a.rombel + a.nama).localeCompare(b.kelasTingkat + b.rombel + b.nama)).map(s => ({ Nama: s.nama, NISN: s.nisn, Kelas: labelRombel(s.kelasTingkat, s.rombel), 'Jenis Kelamin': s.jenisKelamin, 'Tempat Lahir': s.tempatLahir, 'Tanggal Lahir': s.tanggalLahir, 'Nama Ayah': s.namaAyah, 'Nama Ibu': s.namaIbu, Alamat: s.alamat })) }) },
    { id: 'guru', grup: 'Data Induk', judul: 'Data guru & staff', ket: 'Semua guru dan staff aktif.', page: 'guru', filter: [],
      build: () => ({ headers: ['Nama', 'NIP/NUPTK', 'Kategori', 'Jabatan', 'Mata Pelajaran', 'Status Kepegawaian', 'No HP'],
        rows: pegawaiAktif(guru).map(g => ({ Nama: g.nama, 'NIP/NUPTK': g.nip, Kategori: g.kategori, Jabatan: g.jabatan, 'Mata Pelajaran': g.mapel, 'Status Kepegawaian': g.statusKepegawaian, 'No HP': g.hp })) }) },
    { id: 'hadir-kelas', grup: 'Kehadiran', judul: 'Rekap kehadiran siswa per kelas', ket: 'Jumlah H/S/I/A dan persentase hadir tiap rombel.', page: 'presensi', filter: ['rentang'],
      build: () => ({ headers: ['Kelas', 'Wali Kelas', ...STATUS_PRESENSI, '% Hadir'],
        rows: rombelList.map(r => { const x = presRentang.filter(p => p.tingkat === r.tingkat && p.rombel === r.rombel); return { Kelas: r.label, 'Wali Kelas': r.wali, ...Object.fromEntries(STATUS_PRESENSI.map(s => [s, x.filter(p => p.status === s).length])), '% Hadir': pct(x.filter(p => p.status === 'Hadir').length, x.length) }; }) }) },
    { id: 'hadir-siswa', grup: 'Kehadiran', judul: 'Rekap kehadiran per siswa', ket: 'H/S/I/A, terlambat, dan persentase hadir setiap siswa aktif.', page: 'presensi', filter: ['rentang'],
      build: () => { const per = {}; presRentang.forEach(p => (per[p.nisn] ||= []).push(p)); return { headers: ['Nama', 'NISN', 'Kelas', ...STATUS_PRESENSI, 'Terlambat', '% Hadir'],
        rows: siswaAktif.map(s => { const x = per[s.nisn] || []; return { Nama: s.nama, NISN: s.nisn, Kelas: labelRombel(s.kelasTingkat, s.rombel), ...Object.fromEntries(STATUS_PRESENSI.map(st => [st, x.filter(p => p.status === st).length])), Terlambat: x.filter(p => p.menitTerlambat > 0).length, '% Hadir': pct(x.filter(p => p.status === 'Hadir').length, x.length) }; }) }; } },
    { id: 'hadir-guru', grup: 'Kehadiran', judul: 'Rekap kehadiran guru & staff', ket: 'Status per orang; dinas luar dihitung hadir.', page: 'presensi-guru', filter: ['rentang'],
      build: () => { const per = {}; presensiGuru.filter(p => dalamRentang(p.tanggal, f.dari, f.sampai)).forEach(p => (per[p.nama] ||= []).push(p)); return { headers: ['Nama', 'Kategori', ...STATUS_PRESENSI_GURU, 'Terlambat', '% Hadir'],
        rows: pegawaiAktif(guru).map(g => { const x = per[g.nama] || []; return { Nama: g.nama, Kategori: g.kategori, ...Object.fromEntries(STATUS_PRESENSI_GURU.map(st => [st, x.filter(p => p.status === st).length])), Terlambat: x.filter(p => p.menitTerlambat > 0).length, '% Hadir': pct(x.filter(p => p.status === 'Hadir' || p.status === 'Dinas Luar').length, x.length) }; }) }; } },
    { id: 'nilai-mapel', grup: 'Akademik', judul: 'Rata-rata nilai per mata pelajaran', ket: 'Per mapel dan per tingkat kelas.', page: 'nilai', filter: ['ta', 'semester'],
      build: () => { const tk = [...new Set(rombelList.map(r => r.tingkat))]; return { headers: ['Mata Pelajaran', ...tk.map(t => `Kelas ${t}`), 'Semua', 'Predikat'],
        rows: MAPEL_OPTIONS.map(m => { const x = nilaiP.filter(n => n.mapel === m); const semua = rata(x.map(n => n.nilai)); return { 'Mata Pelajaran': m, ...Object.fromEntries(tk.map(t => [`Kelas ${t}`, rata(x.filter(n => n.tingkat === t).map(n => n.nilai))])), Semua: semua, Predikat: predikatNilai(semua) }; }).filter(r => r.Semua !== '') }; } },
    { id: 'leger', grup: 'Akademik', judul: 'Leger nilai (siswa × mapel)', ket: 'Rata-rata tiap mapel per siswa beserta peringkat dalam kelas.', page: 'nilai', filter: ['ta', 'semester'],
      build: () => { const mp = MAPEL_OPTIONS.filter(m => nilaiP.some(n => n.mapel === m)); const rows = siswaAktif.map(s => { const x = nilaiP.filter(n => n.nisn === s.nisn); const per = Object.fromEntries(mp.map(m => [m, rata(x.filter(n => n.mapel === m).map(n => n.nilai))])); const r = rata(Object.values(per).filter(v => v !== '')); return { Nama: s.nama, NISN: s.nisn, Kelas: labelRombel(s.kelasTingkat, s.rombel), ...per, 'Rata-rata': r }; });
        const grupKelas = {}; rows.forEach(r => (grupKelas[r.Kelas] ||= []).push(r)); Object.values(grupKelas).forEach(g => g.filter(r => r['Rata-rata'] !== '').sort((a, b) => b['Rata-rata'] - a['Rata-rata']).forEach((r, i) => { r.Peringkat = i + 1; }));
        return { headers: ['Nama', 'NISN', 'Kelas', ...mp, 'Rata-rata', 'Peringkat'], rows: rows.sort((a, b) => (a.Kelas + a.Nama).localeCompare(b.Kelas + b.Nama)) }; } },
    { id: 'prestasi', grup: 'Kesiswaan', judul: 'Daftar prestasi siswa', ket: 'Semua prestasi pada tahun ajaran terpilih.', page: 'prestasi', filter: ['ta', 'semester'],
      build: () => ({ headers: ['Tanggal', 'Nama Siswa', 'Kelas', 'Jenis', 'Kegiatan', 'Tingkat', 'Hasil'],
        rows: prestasi.filter(p => p.tahunAjaran === f.ta && semOk(p.tanggal)).map(p => ({ Tanggal: p.tanggal, 'Nama Siswa': p.nama, Kelas: labelRombel(p.tingkat, p.rombel), Jenis: p.jenis, Kegiatan: p.kegiatan, Tingkat: p.tingkatLomba, Hasil: p.hasil })) }) },
    { id: 'pelanggaran', grup: 'Kesiswaan', judul: 'Rekap pelanggaran per siswa', ket: 'Jumlah kasus dan total poin per siswa.', page: 'pelanggaran', filter: ['ta', 'semester'],
      build: () => { const per = {}; pelanggaran.filter(p => p.tahunAjaran === f.ta && semOk(p.tanggal)).forEach(p => { const x = (per[p.nisn || p.nama] ||= { 'Nama Siswa': p.nama, Kelas: labelRombel(p.tingkat, p.rombel), Kasus: 0, 'Total Poin': 0, 'Belum Selesai': 0 }); x.Kasus++; x['Total Poin'] += p.poin; if (p.statusTL !== 'Selesai') x['Belum Selesai']++; });
        return { headers: ['Nama Siswa', 'Kelas', 'Kasus', 'Total Poin', 'Belum Selesai'], rows: Object.values(per).sort((a, b) => b['Total Poin'] - a['Total Poin']) }; } },
    { id: 'kinerja', grup: 'Kepegawaian', judul: 'Penilaian kinerja guru', ket: 'Semua penilaian pada tahun ajaran terpilih.', page: 'kinerja', filter: ['ta'],
      build: () => ({ headers: ['Tanggal', 'Guru', 'Semester', 'Skor Total', 'Predikat', 'Penilai'],
        rows: kinerja.filter(k => k.tahunAjaran === f.ta).map(k => ({ Tanggal: k.tanggal, Guru: k.guru, Semester: k.semester, 'Skor Total': k.total, Predikat: k.predikat, Penilai: k.penilai })) }) },
    { id: 'tunggakan', grup: 'Keuangan', judul: 'Rekap tunggakan per siswa', ket: 'Sisa tagihan belum terbayar per siswa, semua tahun ajaran.', page: 'tunggakan', filter: [],
      build: () => { const per = {}; allTagihan.forEach(t => { const sisa = t.nominal - tagihanTerbayar(t.refType, t.no, t.nisn); if (sisa <= 0) return; const s = siswa.find(x => x.nisn === t.nisn); const x = (per[t.nisn || t.namaSiswa] ||= { 'Nama Siswa': t.namaSiswa, NISN: t.nisn, Kelas: s ? labelRombel(s.kelasTingkat, s.rombel) : '', 'Jumlah Tagihan': 0, 'Total Tunggakan': 0 }); x['Jumlah Tagihan']++; x['Total Tunggakan'] += sisa; });
        return { headers: ['Nama Siswa', 'NISN', 'Kelas', 'Jumlah Tagihan', 'Total Tunggakan'], rows: Object.values(per).sort((a, b) => b['Total Tunggakan'] - a['Total Tunggakan']) }; } },
    { id: 'kas', grup: 'Keuangan', judul: 'Pemasukan & pengeluaran bulanan', ket: 'SPP, biaya lain, pemasukan lain, pengeluaran, dan saldo per bulan.', page: 'laporan-keuangan', filter: ['ta'],
      build: () => { const m = rekapPemasukanBulanan(f.ta, pembayaran, pemasukanLain); const k = rekapPengeluaranBulanan(f.ta, pengeluaran); let saldo = 0;
        return { headers: ['Bulan', 'SPP', 'Biaya Lain', 'Pemasukan Lain', 'Total Pemasukan', 'Pengeluaran', 'Selisih', 'Saldo Kumulatif'],
          rows: m.map((b, i) => { const kel = k[i]?.total || 0; saldo += b.total - kel; return { Bulan: b.label, SPP: b.spp, 'Biaya Lain': b.lain, 'Pemasukan Lain': b.lainnya, 'Total Pemasukan': b.total, Pengeluaran: kel, Selisih: b.total - kel, 'Saldo Kumulatif': saldo }; }) }; } },
    { id: 'aset', grup: 'Sarpras', judul: 'Daftar aset & kondisi', ket: 'Semua aset beserta jumlah per kondisi.', page: 'aset', filter: [],
      build: () => ({ headers: ['Kode', 'Nama Aset', 'Kategori', 'Lokasi', 'Jumlah', 'Baik', 'Rusak Ringan', 'Rusak Berat', 'Tahun Perolehan'],
        rows: aset.map(a => ({ Kode: a.kode, 'Nama Aset': a.nama, Kategori: a.kategori, Lokasi: a.lokasi, Jumlah: a.total, Baik: a.baik, 'Rusak Ringan': a.rusakRingan, 'Rusak Berat': a.rusakBerat, 'Tahun Perolehan': a.tahunPerolehan })) }) },
  ];
}

const LABEL_FILTER = { ta: 'tahun ajaran', semester: 'semester', rentang: 'rentang tanggal' };

export default function ExportLaporan() {
  const ctx = useAppData();
  const { canAccess } = useAuth();
  const { tahunAjaranOptions, taAktif, rombelList } = useAkademikOptions();
  const [ta, setTa] = useState('');
  const [semester, setSemester] = useState('Semua');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(sekarangWIB().tanggal);
  const [proses, setProses] = useState('');
  useEffect(() => { if (!ta && taAktif) setTa(taAktif); }, [taAktif, ta]);
  useEffect(() => { if (!dari && ctx.tahunAjaranAktif?.mulai) setDari(String(ctx.tahunAjaranAktif.mulai).slice(0, 10)); }, [ctx.tahunAjaranAktif, dari]);

  const f = { ta, semester, dari, sampai };
  const laporan = useMemo(() => daftarLaporan({ ...ctx, rombelList }, f).filter(l => canAccess(l.page)), [ctx, rombelList, ta, semester, dari, sampai, canAccess]); // eslint-disable-line react-hooks/exhaustive-deps
  const grup = [...new Set(laporan.map(l => l.grup))];

  async function unduh(l) {
    setProses(l.id);
    try {
      const { headers, rows } = l.build();
      if (!rows.length) { ctx.toast('Laporan ini kosong untuk filter yang dipilih.', 'error'); return; }
      const ket = l.filter.map(k => (k === 'ta' ? ta : k === 'semester' ? `Semester ${semester}` : `${dari || 'awal'} s.d. ${sampai}`)).join(', ');
      await exportToExcel(headers, rows, `${l.judul}${ket ? ' ' + ket : ''}`.replace(/[^\w-]+/g, '_'), `${l.judul}${ket ? ` (${ket})` : ''}`);
    } catch (e) { ctx.toast(e.message, 'error'); } finally { setProses(''); }
  }

  return (
    <Page pageId="export-laporan" title="Pusat Export Laporan" path="Laporan & Grafik / Pusat Export Laporan">
      <div className="card">
        <div className="card-head"><div><h3>Filter laporan</h3><p>Berlaku untuk semua laporan di bawah; tiap laporan hanya memakai filter yang relevan. Hanya laporan dari menu yang boleh Anda akses yang ditampilkan.</p></div></div>
        <div className="card-body">
          <div className="filter-bar" style={{ margin: 0 }}>
            <Field label="Tahun Ajaran"><Select value={ta} onChange={setTa} options={tahunAjaranOptions} /></Field>
            <Field label="Semester"><Select value={semester} onChange={setSemester} options={['Semua', ...SEMESTER_OPTIONS]} /></Field>
            <Field label="Dari tanggal"><input type="date" value={dari} onChange={e => setDari(e.target.value)} /></Field>
            <Field label="Sampai tanggal"><input type="date" value={sampai} onChange={e => setSampai(e.target.value)} /></Field>
          </div>
        </div>
      </div>
      {grup.map(g => (
        <div key={g} className="card">
          <div className="card-head"><div><h3>{g}</h3></div></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table>
              <tbody>
                {laporan.filter(l => l.grup === g).map(l => (
                  <tr key={l.id}>
                    <td style={{ width: '60%' }}><b>{l.judul}</b><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{l.ket}</div></td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{l.filter.length ? `Pakai ${l.filter.map(k => LABEL_FILTER[k]).join(', ')}` : 'Tanpa filter'}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-sm btn-excel" onClick={() => unduh(l)} disabled={!!proses}>{proses === l.id ? 'Menyiapkan…' : '📊 Excel'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </Page>
  );
}
