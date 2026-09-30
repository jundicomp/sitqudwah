import { useMemo, useState } from 'react';
import { BULAN_ID, parseTanggalFleksibel } from '../../db/helpers';
import { cariTarifSppUntukKelas } from '../../db/tarifFields';
import { nominalSppSaatTerbit } from '../../db/beasiswaFields';
import { bulkAddTagihanSppToSheet, addLogEntry } from '../../services/googleSheets';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import ProgressModal from '../../components/common/ProgressModal';

const UKURAN_KELOMPOK = 15; // dikirim bertahap per 15 siswa -- supaya progress bar benar-benar mewakili kemajuan asli

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

export default function PenerbitanSppTab() {
  const { tahunAjaranAktif, tarif, siswa, tagihanSpp, tagihanSppLoading, tagihanSppLoaded, refreshTagihanSpp, toast, beasiswaSiswa, beasiswaKategori } = useAppData();
  const { currentUser } = useAuth();
  const [issuing, setIssuing] = useState(null); // index bulan yg sedang diproses
  const [progress, setProgress] = useState(null); // { current, total, label } | null

  // HANYA siswa berstatus Aktif yang ditagih -- siswa Lulus/Pindah/Berhenti dikecualikan.
  const siswaAktif = useMemo(() => siswa.filter(s => (s.status || 'Aktif') === 'Aktif'), [siswa]);

  // Semua tingkat kelas yang genuinely ada siswa AKTIF-nya saat ini.
  const tingkatDipakai = useMemo(
    () => Array.from(new Set(siswaAktif.map(s => s.kelasTingkat).filter(Boolean))).sort(),
    [siswaAktif]
  );

  // Cek cakupan tarif: tiap tingkat kelas HARUS punya tarif SPP yang berlaku
  // (spesifik utk tingkat itu, atau fallback 'Semua Kelas') sebelum bisa menerbitkan.
  const cakupanTarif = useMemo(() => {
    return tingkatDipakai.map(tk => ({
      tingkat: tk,
      tarif: tahunAjaranAktif ? cariTarifSppUntukKelas(tarif, tahunAjaranAktif.label, tk) : null,
    }));
  }, [tingkatDipakai, tarif, tahunAjaranAktif]);
  const tingkatBelumAdaTarif = cakupanTarif.filter(c => !c.tarif).map(c => c.tingkat);
  const semuaTingkatPunyaTarif = tingkatDipakai.length > 0 && tingkatBelumAdaTarif.length === 0;

  const tagihanTahunIni = useMemo(
    () => tagihanSpp.filter(t => t.tahunAjaran === tahunAjaranAktif?.label),
    [tagihanSpp, tahunAjaranAktif]
  );

  const jadwal = useMemo(() => {
    if (!tahunAjaranAktif) return [];
    const startYear = parseInt(tahunAjaranAktif.label.split('/')[0]);
    const now = new Date();
    const totalSiswaAktif = siswaAktif.length;
    const list = [];
    for (let m = 0; m < 12; m++) {
      const monthIdx = (6 + m) % 12; // mulai Juli (index 6)
      const calYear = monthIdx >= 6 ? startYear : startYear + 1;
      const bulanTagihan = tagihanTahunIni.filter(t => t.bulan === BULAN_ID[monthIdx] && Number(t.tahunKalender) === calYear);

      // Dicek PER SISWA -- bukan cuma "ada/tidak ada tagihan sama sekali" utk bulan
      // ini. Sebelumnya begitu 1 baris tagihan bulan itu ada (mis. siswa baru pindah,
      // atau siswa yg bayar SPP di muka), seluruh bulan langsung dicap "Sudah Terbit"
      // dan tombol Terbitkan-nya HILANG -- padahal ratusan siswa lain blm ditagih sama
      // sekali (ini yg bikin banyak siswa nyangkut di "Perlu Tindak Lanjut"). Sekarang
      // dihitung siapa aja yg BELUM py tagihan bulan ini, dan HANYA mereka yg diproses
      // saat tombol Terbitkan diklik -- yg sudah py (via penerbitan normal ATAU lewat
      // bayar di muka) otomatis dilewati, tidak dobel.
      const nisnSudahTertagih = new Set(bulanTagihan.map(t => t.nisn));
      const siswaBelumTertagih = siswaAktif.filter(s => !nisnSudahTertagih.has(s.nisn));
      const jumlahBelum = siswaBelumTertagih.length;
      const jumlahSudah = totalSiswaAktif - jumlahBelum;
      const sudahTerbitSemua = totalSiswaAktif > 0 && jumlahBelum === 0;

      const startOfMonth = new Date(calYear, monthIdx, 1);
      const sudahWaktunya = startOfMonth <= now;
      let status = 'Belum Waktunya';
      if (sudahTerbitSemua) status = 'Sudah Terbit';
      else if (jumlahSudah > 0) status = 'Terbit Sebagian';
      else if (sudahWaktunya) status = 'Terlambat Terbit';

      list.push({
        monthIdx, calYear, status, jumlahSudah, jumlahBelum, siswaBelumTertagih,
        bisaDiterbitkan: jumlahBelum > 0 && sudahWaktunya && semuaTingkatPunyaTarif,
      });
    }
    return list;
  }, [tahunAjaranAktif, tagihanTahunIni, siswaAktif, semuaTingkatPunyaTarif]);

  // Hitung nominal SETELAH potongan beasiswa -- dihitung SEKALI SAAT PENERBITAN, jadi
  // nominal final tersimpan apa adanya di tagihan (bukan dihitung ulang tiap tampil) --
  // konsisten dgn prinsip "fakta historis pada momen transaksi" yg dipakai di modul
  // lain. Logikanya di db/beasiswaFields.js (nominalSppSaatTerbit) -- dipakai BERSAMA
  // dgn Bayar SPP Sekaligus, supaya potongan dihitung SAMA PERSIS di mana pun tagihan
  // SPP baru itu diterbitkan.
  function nominalSetelahBeasiswa(nisn, nominalPenuh, tanggalMulaiBulanTagihan) {
    return nominalSppSaatTerbit(nisn, nominalPenuh, tanggalMulaiBulanTagihan, beasiswaSiswa, beasiswaKategori, parseTanggalFleksibel);
  }

  async function terbitkan(item) {
    if (!semuaTingkatPunyaTarif) { toast('Ada kelas yang belum punya Tarif SPP. Lengkapi dulu di tab Tarif.', 'error'); return; }
    // HANYA siswa yg BELUM py tagihan bulan ini yg diproses -- siswa yg sudah (dari
    // penerbitan sebelumnya, atau dari bayar SPP di muka) dilewati begitu saja,
    // supaya tidak dobel tertagih.
    const daftarSiswa = item.siswaBelumTertagih;
    if (daftarSiswa.length === 0) { toast('Semua siswa aktif sudah punya tagihan bulan ini.', 'error'); return; }
    setIssuing(item.monthIdx);
    const total = daftarSiswa.length;
    setProgress({ current: 0, total, label: `Menerbitkan SPP ${BULAN_ID[item.monthIdx]} ${item.calYear} (${total} siswa)` });
    try {
      let totalTerbit = 0;
      let jumlahDapatBeasiswa = 0;
      for (let i = 0; i < daftarSiswa.length; i += UKURAN_KELOMPOK) {
        const kelompok = daftarSiswa.slice(i, i + UKURAN_KELOMPOK);
        const rows = kelompok.map(s => {
          const tarifSiswa = cariTarifSppUntukKelas(tarif, tahunAjaranAktif.label, s.kelasTingkat);
          const nominalPenuh = tarifSiswa ? tarifSiswa.nominal : 0;
          const tanggalAwalBulanTagihan = new Date(item.calYear, item.monthIdx, 1).getTime();
          const { nominal, potongan } = nominalSetelahBeasiswa(s.nisn, nominalPenuh, tanggalAwalBulanTagihan);
          if (potongan) jumlahDapatBeasiswa++;
          return {
            NISN: s.nisn,
            'Nama Siswa': s.nama,
            'Tahun Ajaran': tahunAjaranAktif.label,
            Bulan: BULAN_ID[item.monthIdx],
            'Tahun Kalender': item.calYear,
            Nominal: nominal,
            'Jatuh Tempo': `10/${item.monthIdx + 1}/${item.calYear}`,
            Keterangan: potongan ? `Potongan Beasiswa: ${potongan.nama} (${formatRupiah(potongan.potonganSpp)})` : '',
            // Disalin dari Tarif SPP -- lihat catatan lengkap di tarifFields.js/tagihanHelpers.js.
            // Default 'Ya' (terkunci) kalau tarifSiswa entah kenapa tidak ketemu (harusnya
            // tidak pernah terjadi krn penerbitan diblok kalau ada kelas tanpa tarif).
            'Nominal Tetap': tarifSiswa && tarifSiswa.nominalTetap === false ? 'Tidak' : 'Ya',
          };
        });
        const result = await bulkAddTagihanSppToSheet(rows);
        totalTerbit += result.count;
        setProgress({ current: Math.min(i + kelompok.length, total), total, label: `Menerbitkan SPP ${BULAN_ID[item.monthIdx]} ${item.calYear}` });
      }
      await addLogEntry({
        username: currentUser.username,
        namaUser: currentUser.nama,
        aksi: 'Terbitkan Tagihan',
        modul: 'Tagihan & Biaya',
        detail: `Menerbitkan tagihan SPP ${BULAN_ID[item.monthIdx]} ${item.calYear} untuk ${totalTerbit} siswa (nominal menyesuaikan tarif per kelas${jumlahDapatBeasiswa > 0 ? `, ${jumlahDapatBeasiswa} siswa dapat potongan beasiswa` : ''})`,
      });
      toast(`Tagihan SPP ${BULAN_ID[item.monthIdx]} ${item.calYear} berhasil diterbitkan untuk ${totalTerbit} siswa${jumlahDapatBeasiswa > 0 ? ` (${jumlahDapatBeasiswa} dengan potongan beasiswa)` : ''}.`);
      // PENTING: WAJIB ditunggu (await) sebelum tombol aktif lagi -- sama persis dgn
      // bug yg ditemukan di Penerbitan Lain (lihat catatan di file itu): tanpa await,
      // tombol bisa diklik lagi saat data lokal masih basi, menerbitkan dobel.
      await refreshTagihanSpp();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setIssuing(null);
      setProgress(null);
    }
  }

  const STATUS_BADGE = {
    'Sudah Terbit': 'badge-green',
    'Terbit Sebagian': 'badge-gold',
    'Terlambat Terbit': 'badge-red',
    'Belum Waktunya': 'badge-muted',
  };

  if (!tahunAjaranAktif) {
    return <div className="card"><div className="card-body" style={{ fontSize: 13, color: 'var(--muted)' }}>Belum ada Tahun Ajaran Aktif. Atur dulu lewat menu Profil Sekolah &amp; Tahun Ajaran.</div></div>;
  }

  return (
    <>
      {tingkatDipakai.length > 0 && (
        <div className="card">
          <div className="card-head"><div><h3>Cakupan Tarif SPP per Kelas — {tahunAjaranAktif.label}</h3><p>Tiap kelas yang punya siswa harus punya tarif SPP (spesifik kelas itu, atau tarif "Semua Kelas") sebelum bisa menerbitkan.</p></div></div>
          <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {cakupanTarif.map(c => (
              <div key={c.tingkat} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, background: c.tarif ? 'var(--green-soft)' : 'var(--red-soft)', color: c.tarif ? 'var(--green-dark)' : 'var(--red)' }}>
                Kelas {c.tingkat}: {c.tarif ? `${formatRupiah(c.tarif.nominal)}${c.tarif.kelasTingkat === 'Semua Kelas' ? ' (umum)' : ' (khusus)'}` : '✕ Belum ada tarif'}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div><h3>🗓️ Jadwal Penerbitan SPP — {tahunAjaranAktif.label}</h3><p>Setiap bulan diterbitkan lewat aksi eksplisit — bukan otomatis — supaya tidak salah tagih siswa yang berhenti/pindah.</p></div>
          <button className="btn btn-sm" onClick={refreshTagihanSpp} disabled={tagihanSppLoading}>{tagihanSppLoading ? 'Memuat...' : '↻ Muat Ulang'}</button>
        </div>
        <div className="card-body">
          {tingkatBelumAdaTarif.length > 0 && (
            <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 14 }}>
              ⚠️ Kelas {tingkatBelumAdaTarif.join(', ')} belum punya Tarif SPP untuk tahun ajaran ini — tambahkan dulu di tab Tarif sebelum menerbitkan.
            </p>
          )}
          {tagihanSppLoaded && (
            <div className="table-scroll">
              <table>
                <thead><tr><th>No</th><th>Bulan</th><th>Status</th><th>Sudah Terbit</th><th>Belum Terbit</th><th>Aksi</th></tr></thead>
                <tbody>
                  {jadwal.map((item, idx) => {
                    const belumWaktunya = item.status === 'Belum Waktunya';
                    return (
                      <tr key={item.monthIdx}>
                        <td>{idx + 1}</td>
                        <td>{BULAN_ID[item.monthIdx]} {item.calYear}</td>
                        <td><span className={`badge ${STATUS_BADGE[item.status]}`}>{item.status}</span></td>
                        <td>{belumWaktunya ? '-' : item.jumlahSudah}</td>
                        <td>{belumWaktunya ? '-' : item.jumlahBelum}</td>
                        <td>
                          {item.jumlahBelum > 0 && !belumWaktunya && (
                            <button className="btn btn-sm btn-primary" onClick={() => terbitkan(item)} disabled={issuing === item.monthIdx || !semuaTingkatPunyaTarif}>
                              {issuing === item.monthIdx ? 'Menerbitkan...' : (
                                <>Terbitkan <span style={{ background: 'rgba(255,255,255,.25)', padding: '1px 8px', borderRadius: 999, marginLeft: 4, fontSize: 11.5 }}>{item.jumlahBelum}</span></>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {progress && <ProgressModal title={progress.label} current={progress.current} total={progress.total} />}
    </>
  );
}
