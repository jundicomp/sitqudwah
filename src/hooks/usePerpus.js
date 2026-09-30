import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';
import { bacaPengaturanPerpus, daftarAnggota } from '../db/perpusFields';

export default function usePerpus() {
  const { pengaturanPerpusRows, siswa, guru, buku } = useAppData();
  const aturan = useMemo(() => bacaPengaturanPerpus(pengaturanPerpusRows), [pengaturanPerpusRows]);
  const anggota = useMemo(() => daftarAnggota(siswa, guru), [siswa, guru]);
  const anggotaByKode = useMemo(() => Object.fromEntries(anggota.map(a => [a.kode, a])), [anggota]);
  const bukuByKode = useMemo(() => Object.fromEntries(buku.map(b => [b.kode.toUpperCase(), b])), [buku]);
  return { aturan, anggota, anggotaByKode, bukuByKode };
}
