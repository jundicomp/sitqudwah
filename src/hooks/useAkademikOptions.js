import { useCallback, useMemo } from 'react';
import { useAppData } from '../context/AppContext';
import { daftarRombel, daftarNamaGuru, labelRombel, labelSiswa } from '../db/akademikFields';

/**
 * Pilihan dropdown bersama modul Akademik & Kesiswaan + konversi kolom VIRTUAL.
 *
 * Form generik (GenericManualForm/GenericEditModal) cuma kenal field string datar,
 * sementara Sheet menyimpan kelas sbg 2 kolom (Tingkat + Rombel) dan siswa sbg
 * 2 kolom (NISN + Nama Siswa) plus snapshot Tingkat/Rombel saat kejadian. Jadi:
 *   - "Kelas"  (virtual) <-> Tingkat + Rombel
 *   - "Siswa"  (virtual) -> NISN + Nama Siswa + Tingkat + Rombel
 * Konversi dilakukan di sini, sebelum kirim & sesudah baca.
 */
export default function useAkademikOptions() {
  const { tahunAjaran, tahunAjaranAktif, kelas, siswa, guru } = useAppData();

  const tahunAjaranOptions = useMemo(
    () => [...new Set(tahunAjaran.map(t => t.label).filter(Boolean))].sort().reverse(),
    [tahunAjaran],
  );
  const taAktif = tahunAjaranAktif?.label || tahunAjaranOptions[0] || '';

  const rombelList = useMemo(() => daftarRombel(kelas), [kelas]);
  const rombelLabels = useMemo(() => rombelList.map(r => r.label), [rombelList]);
  const rombelByLabel = useMemo(() => Object.fromEntries(rombelList.map(r => [r.label, r])), [rombelList]);

  const siswaAktif = useMemo(
    () => siswa.filter(x => x.status === 'Aktif').sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [siswa],
  );
  const siswaOptions = useMemo(() => siswaAktif.map(labelSiswa), [siswaAktif]);
  const siswaByLabel = useMemo(() => Object.fromEntries(siswaAktif.map(x => [labelSiswa(x), x])), [siswaAktif]);

  const guruOptions = useMemo(() => daftarNamaGuru(guru), [guru]);

  const withKelasVirtual = useCallback(
    (row) => ({ ...row, Kelas: labelRombel(row['Tingkat'], row['Rombel']) }),
    [],
  );
  const fromKelasVirtual = useCallback((form) => {
    const { Kelas, ...rest } = form;
    const r = rombelByLabel[Kelas];
    return r ? { ...rest, Tingkat: r.tingkat, Rombel: r.rombel } : rest;
  }, [rombelByLabel]);

  const fromSiswaVirtual = useCallback((form) => {
    const { Siswa, ...rest } = form;
    const sw = siswaByLabel[Siswa];
    if (!sw) throw new Error('Siswa tidak ditemukan di daftar siswa aktif. Pilih ulang dari daftar.');
    return { ...rest, NISN: sw.nisn, 'Nama Siswa': sw.nama, Tingkat: sw.kelasTingkat, Rombel: sw.rombel };
  }, [siswaByLabel]);

  return {
    tahunAjaranOptions, taAktif, tahunAjaranList: tahunAjaran,
    rombelList, rombelLabels, rombelByLabel,
    siswaAktif, siswaOptions, siswaByLabel,
    guruOptions,
    withKelasVirtual, fromKelasVirtual, fromSiswaVirtual,
  };
}
