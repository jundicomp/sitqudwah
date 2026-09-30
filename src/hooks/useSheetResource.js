import { useCallback, useEffect, useState } from 'react';
import { isConfigured } from '../services/googleSheets';

/**
 * Hook generik: ambil satu "resource" dari Google Sheets, dengan state loading/error,
 * dan fungsi refresh yang bisa dipanggil ulang kapan saja (mis. setelah tambah/edit/hapus).
 * target: 'master' (default) | 'keuangan' -- menentukan koneksi mana yg dicek/dipakai.
 *
 * options.deferInitialFetch: kalau true, hook TIDAK auto-fetch sendiri saat mount --
 * dipakai saat parent (AppContext) sudah punya cara lain memuat data awal SEKALIGUS
 * utk BANYAK resource dalam 1 request gabungan (lihat fetchAllFromSheet), supaya
 * browser tidak menembak 1 request terpisah PER resource saat login/buka app.
 * Begitu data awal sudah didapat, parent panggil setFromBatch(rows) utk mengisinya --
 * refresh() (dipanggil manual stlh tambah/edit/hapus) TETAP jalan spt biasa (1 sheet).
 */
export default function useSheetResource(fetchFn, normalizeFn, target = 'master', options = {}) {
  const { deferInitialFetch = false } = options;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(!deferInitialFetch);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!isConfigured(target)) {
      setData([]);
      setLoaded(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchFn();
      setData(normalizeFn ? rows.map(normalizeFn) : rows);
      setLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dipanggil oleh AppContext begitu hasil batch (fetchAllFromSheet) sudah datang --
  // langsung isi data TANPA request jaringan terpisah lagi utk resource ini.
  const setFromBatch = useCallback((rows) => {
    setData(normalizeFn ? rows.map(normalizeFn) : rows);
    setLoaded(true);
    setLoading(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!deferInitialFetch) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  return { data, loading, error, loaded, refresh, setFromBatch, setError };
}
