import { useMemo, useState } from 'react';
import { bulkAddToSheet, addLogEntry, fetchTagihanLainFromSheet, updateTagihanLainInSheet, deleteTagihanLainFromSheet } from '../../services/googleSheets';
import { formatRupiah, todayWIB, parseTanggalFleksibel } from '../../db/helpers';
import { TAGIHAN_LAIN_HEADERS, TAGIHAN_LAIN_EDIT_FIELDS } from '../../db/tagihanHelpers';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import ProgressModal from '../../components/common/ProgressModal';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';

const UKURAN_KELOMPOK = 15;
const TIPE_BISA_TERBITKAN = ['Sekali Masuk', 'Per Tahun'];

export default function PenerbitanLainTab() {
  const { tahunAjaranAktif, tarif, siswa, tagihanLain, tagihanLainLoading, tagihanLainLoaded, refreshTagihanLain, toast, beasiswaSiswa, beasiswaKategori } = useAppData();
  const { currentUser } = useAuth();
  const [issuing, setIssuing] = useState(null);
  const [progress, setProgress] = useState(null);

  const siswaAktif = useMemo(() => siswa.filter(s => (s.status || 'Aktif') === 'Aktif'), [siswa]);

  const tarifTahunIni = useMemo(
    () => tarif.filter(t => t.tahunAjaran === tahunAjaranAktif?.label && TIPE_BISA_TERBITKAN.includes(t.tipe)),
    [tarif, tahunAjaranAktif]
  );

  const tagihanTahunIni = useMemo(
    () => tagihanLain.filter(t => t.tahunAjaran === tahunAjaranAktif?.label),
    [tagihanLain, tahunAjaranAktif]
  );

  const daftarTarif = useMemo(() => {
    return tarifTahunIni.map(t => {
      const targetSiswa = siswaAktif.filter(s => t.kelasTingkat === 'Semua Kelas' || s.kelasTingkat === t.kelasTingkat);
      const sudahTertagih = new Set(tagihanTahunIni.filter(x => x.label === t.jenis).map(x => x.nisn));
      const belumTertagih = targetSiswa.filter(s => !sudahTertagih.has(s.nisn));
      return { tarif: t, targetSiswa, jumlahSudah: sudahTertagih.size, jumlahBelum: belumTertagih.length, belumTertagih };
    });
  }, [tarifTahunIni, siswaAktif, tagihanTahunIni]);

  function nominalSetelahBeasiswa(nisn, nominalPenuh) {
    const b = beasiswaSiswa.find(x => x.nisn === nisn);
    if (!b) return { nominal: nominalPenuh, potongan: null };
    // Sama seperti SPP: potongan cuma berlaku kalau tagihan ini diterbitkan (hari ini)
    // PADA ATAU SETELAH Tanggal Mulai beasiswanya.
    const mulai = parseTanggalFleksibel(b.tanggalMulai);
    if (mulai && Date.now() < mulai.getTime()) return { nominal: nominalPenuh, potongan: null };
    const kategori = beasiswaKategori.find(k => k.nama === b.kategoriBeasiswa);
    if (!kategori || !kategori.potonganBiayaLain) return { nominal: nominalPenuh, potongan: null };
    const nominal = Math.max(0, nominalPenuh - kategori.potonganBiayaLain);
    return { nominal, potongan: kategori };
  }

  async function terbitkan(item) {
    if (item.belumTertagih.length === 0) return;
    setIssuing(item.tarif.id);
    const total = item.belumTertagih.length;
    setProgress({ current: 0, total, label: `Menerbitkan "${item.tarif.jenis}"` });
    try {
      let totalTerbit = 0;
      let jumlahDapatBeasiswa = 0;
      for (let i = 0; i < item.belumTertagih.length; i += UKURAN_KELOMPOK) {
        const kelompok = item.belumTertagih.slice(i, i + UKURAN_KELOMPOK);
        const rows = kelompok.map(s => {
          const { nominal, potongan } = nominalSetelahBeasiswa(s.nisn, item.tarif.nominal);
          if (potongan) jumlahDapatBeasiswa++;
          return {
            NISN: s.nisn,
            'Nama Siswa': s.nama,
            'Tahun Ajaran': tahunAjaranAktif.label,
            Nama: item.tarif.jenis,
            Wajib: item.tarif.wajib,
            Nominal: nominal,
            'Jatuh Tempo': todayWIB(),
            Keterangan: potongan ? `Potongan Beasiswa: ${potongan.nama} (${formatRupiah(potongan.potonganBiayaLain)})` : '',
            Cicilan: item.tarif.cicilan || '',
            // Disalin dari Tarif -- lihat catatan lengkap di tarifFields.js/tagihanHelpers.js.
            'Nominal Tetap': item.tarif.nominalTetap ? 'Ya' : 'Tidak',
          };
        });
        const result = await bulkAddToSheet('tagihanLain', rows, 'keuangan');
        totalTerbit += result.count;
        setProgress({ current: Math.min(i + kelompok.length, total), total, label: `Menerbitkan "${item.tarif.jenis}"` });
      }
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Terbitkan Tagihan',
        modul: 'Tagihan & Biaya',
        detail: `Menerbitkan tagihan "${item.tarif.jenis}" untuk ${totalTerbit} siswa${jumlahDapatBeasiswa > 0 ? `, ${jumlahDapatBeasiswa} siswa dapat potongan beasiswa` : ''}`,
      });
      toast(`Tagihan "${item.tarif.jenis}" berhasil diterbitkan untuk ${totalTerbit} siswa${jumlahDapatBeasiswa > 0 ? ` (${jumlahDapatBeasiswa} dengan potongan beasiswa)` : ''}.`);
      // PENTING: WAJIB ditunggu (await) sebelum tombol aktif lagi -- BUG NYATA yg
      // ditemukan (76 baris "uang perpisahan" dobel utk 1 siswa): sebelumnya refresh
      // ini TIDAK ditunggu, jadi tombol "Terbitkan" langsung bisa diklik lagi SAAT
      // data lokal (daftar siswa yg "belum tertagih") masih basi -- kalau admin klik
      // lagi krn Apps Script terasa lambat, siswa yg BARU SAJA ditagih masih dianggap
      // "belum tertagih" dan diterbitkan LAGI, berulang-ulang.
      await refreshTagihanLain();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setIssuing(null);
      setProgress(null);
    }
  }

  if (!tahunAjaranAktif) {
    return <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran Aktif.</div></div>;
  }

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div><h3>Penerbitan Tagihan Lain — {tahunAjaranAktif.label}</h3><p>Uang Pangkal, Seragam, dan biaya "Sekali Masuk"/"Per Tahun" lainnya. Tarif bertipe "Opsional" tidak muncul di sini.</p></div>
          <button className="btn btn-sm" onClick={refreshTagihanLain} disabled={tagihanLainLoading}>Muat Ulang</button>
        </div>
        <div className="card-body">
          {tarifTahunIni.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Belum ada Tarif bertipe "Sekali Masuk" atau "Per Tahun" untuk tahun ajaran ini. Tambahkan dulu di tab Tarif.
            </p>
          )}
          {tarifTahunIni.length > 0 && !tagihanLainLoaded && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Memuat data...</p>
          )}
          {tagihanLainLoaded && daftarTarif.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Jenis Biaya</th><th>Berlaku Untuk</th><th>Nominal</th><th>Sudah Tertagih</th><th>Belum Tertagih</th><th>Aksi</th></tr></thead>
                <tbody>
                  {daftarTarif.map(item => (
                    <tr key={item.tarif.id}>
                      <td>{item.tarif.jenis}</td>
                      <td>{item.tarif.kelasTingkat === 'Semua Kelas' ? 'Semua Kelas' : `Kelas ${item.tarif.kelasTingkat}`}</td>
                      <td>{formatRupiah(item.tarif.nominal)}</td>
                      <td>{item.jumlahSudah} siswa</td>
                      <td>{item.jumlahBelum} siswa</td>
                      <td>
                        {item.jumlahBelum > 0 ? (
                          <button className="btn btn-sm btn-primary" onClick={() => terbitkan(item)} disabled={issuing === item.tarif.id}>
                            {issuing === item.tarif.id ? 'Menerbitkan...' : `Terbitkan ke ${item.jumlahBelum} Siswa`}
                          </button>
                        ) : (
                          <span className="badge badge-green">Semua Sudah Tertagih</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {progress && <ProgressModal title={progress.label} current={progress.current} total={progress.total} />}

      {/* Sejak v1.31.19: tabel di atas cuma ringkasan per Tarif (sudah/belum tertagih)
          -- tidak bisa membetulkan tagihan yg SUDAH terbit ke siswa tertentu (mis.
          salah nominal, atau nilai Cicilan yg diubah di Tarif tidak ikut menyalin ke
          tagihan yg sudah terlanjur terbit sebelumnya). Tabel ini melengkapi itu --
          daftar tagihan INDIVIDUAL per siswa, bisa diedit/dihapus satu-satu. */}
      <div style={{ marginTop: 18 }}>
        <GenericStoredTable
          title="Daftar Tagihan Lain (Semua Siswa)"
          subtitle="Tagihan individual yang sudah terbit -- betulkan di sini kalau ada yang salah (mis. nominal atau nilai cicilan), tanpa perlu menerbitkan ulang."
          headers={TAGIHAN_LAIN_HEADERS}
          fields={TAGIHAN_LAIN_EDIT_FIELDS}
          fetchFn={fetchTagihanLainFromSheet}
          updateFn={updateTagihanLainInSheet}
          deleteFn={deleteTagihanLainFromSheet}
          moduleLabel="Tagihan Lain"
          labelKey="Nama"
          // PENTING: NISN dari Sheet MENTAH (belum lewat normalizeSheetTagihanLain di sini --
          // GenericStoredTable pakai raw row) sering balik sbg NUMBER (bukan text), bukan
          // string -- kalau langsung `(r['NISN'] || '').toLowerCase()`, pas NISN-nya angka,
          // `.toLowerCase()` dipanggil di atas NUMBER dan CRASH (blank putih, krn app ini
          // tidak punya error boundary). String(...) dulu SEBELUM `.toLowerCase()` utk semua
          // field spy aman apa pun tipe aslinya di Sheet.
          searchFn={(r, t) => String(r['NISN'] ?? '').toLowerCase().includes(t) || String(r['Nama Siswa'] ?? '').toLowerCase().includes(t) || String(r['Nama'] ?? '').toLowerCase().includes(t) || String(r['Tahun Ajaran'] ?? '').toLowerCase().includes(t)}
          onChanged={refreshTagihanLain}
          target="keuangan"
        />
      </div>
    </>
  );
}
