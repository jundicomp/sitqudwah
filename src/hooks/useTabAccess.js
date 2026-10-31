import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Hook bersama dipakai SEMUA halaman bertab -- filter tab mana yg boleh dilihat role
// yg sedang login (lewat canAccess(pageId, tabId)), dan otomatis pindah ke tab pertama
// yg BOLEH diakses kalau tab default/tersimpan ternyata tidak diizinkan utk role itu.
// urutanTabId: array ID tab sesuai urutan tampil -- dipakai cari fallback pertama yg
// diizinkan kalau tab yg lagi aktif ternyata tidak boleh.
export default function useTabAccess(pageId, urutanTabId) {
  const { canAccess } = useAuth();
  // v1.50.0: tab bisa dibuka langsung lewat link, mis. #/rapor-sd?tab=arsip (dipakai Peta Halaman).
  const { search } = useLocation();
  const tabDariUrl = new URLSearchParams(search).get('tab');
  const [tab, setTab] = useState(urutanTabId.includes(tabDariUrl) ? tabDariUrl : urutanTabId[0]);
  useEffect(() => { if (tabDariUrl && urutanTabId.includes(tabDariUrl)) setTab(tabDariUrl); }, [tabDariUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  function bolehTab(tabId) { return canAccess(pageId, tabId); }

  useEffect(() => {
    if (!bolehTab(tab)) {
      const fallback = urutanTabId.find(t => bolehTab(t));
      if (fallback && fallback !== tab) setTab(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ...urutanTabId.map(t => bolehTab(t))]);

  return { tab, setTab, bolehTab };
}
