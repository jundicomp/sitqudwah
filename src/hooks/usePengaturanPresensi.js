import { useMemo } from 'react';
import { useAppData } from '../context/AppContext';
import { bacaPengaturan } from '../db/presensiBarcodeFields';

export default function usePengaturanPresensi() {
  const { pengaturanPresensiRows } = useAppData();
  return useMemo(() => bacaPengaturan(pengaturanPresensiRows || []), [pengaturanPresensiRows]);
}
