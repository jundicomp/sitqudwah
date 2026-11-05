// =====================================================================
// LINGKUP NILAI per guru (v1.66.0)
// Admin & Kepala Sekolah: semua kelas & mapel.
// Guru lain (akun terhubung ke Data Guru):
//   - kelas yg dia pegang sebagai WALI KELAS -> semua mapel di kelas itu
//   - pasangan kelas+mapel yg dia ajar menurut JADWAL PELAJARAN
//   - nilai yg dulu dia input sendiri (kolom Guru = namanya) tetap terlihat
// =====================================================================
import { bolehLihatSemuaKelas } from './akses';

const s = (v) => String(v ?? '').trim();

export function buatLingkupNilai({ user, jadwal = [], rombelList = [], nilai = [] }) {
  const semua = bolehLihatSemuaKelas(user);
  const guru = s(user?.guru);
  const kunciRombel = (tingkat, rombel) => `${s(tingkat)}|${s(rombel)}`;
  const wali = new Set(rombelList.filter(r => guru && s(r.wali) === guru).map(r => kunciRombel(r.tingkat, r.rombel)));
  // pasangan[ta] = Set("tingkat|rombel|mapel"); '*' = gabungan semua tahun ajaran
  const pasangan = { '*': new Set() };
  const tambah = (ta, tingkat, rombel, mapel) => {
    const k = `${s(tingkat)}|${s(rombel)}|${s(mapel)}`;
    (pasangan[ta] ||= new Set()).add(k); pasangan['*'].add(k);
  };
  if (guru) {
    jadwal.filter(j => s(j.guru) === guru && j.mapel && j.tingkat).forEach(j => tambah(s(j.tahunAjaran), j.tingkat, j.rombel, j.mapel));
    nilai.filter(n => s(n.guru) === guru && n.mapel).forEach(n => tambah(s(n.tahunAjaran), n.tingkat, n.rombel, n.mapel));
  }
  const set = (ta) => (ta && pasangan[ta]) || (ta ? new Set() : pasangan['*']);
  const adaPasangan = (ta, tingkat, rombel, mapel) => {
    const st = set(ta);
    return st.has(`${s(tingkat)}|${s(rombel)}|${s(mapel)}`) || st.has(`${s(tingkat)}||${s(mapel)}`); // jadwal tanpa rombel = semua rombel tingkat itu
  };

  return {
    semua,
    guru,
    tanpaGuru: !semua && !guru,
    adalahWali: (r) => !!r && wali.has(kunciRombel(r.tingkat, r.rombel)),
    // Boleh membuka kelas ini? (ta kosong = tahun ajaran mana pun)
    bolehRombel(r, ta = '') {
      if (semua) return true;
      if (!r || !guru) return false;
      if (wali.has(kunciRombel(r.tingkat, r.rombel))) return true;
      const awal = `${s(r.tingkat)}|${s(r.rombel)}|`, awal2 = `${s(r.tingkat)}||`;
      for (const k of set(ta)) if (k.startsWith(awal) || k.startsWith(awal2)) return true;
      return false;
    },
    // Daftar mapel yg boleh dilihat di kelas ini; null = semua mapel.
    mapelBoleh(r, ta = '') {
      if (semua || (r && wali.has(kunciRombel(r.tingkat, r.rombel)))) return null;
      if (!r || !guru) return new Set();
      const hasil = new Set();
      for (const k of set(ta)) {
        const [t, rb, m] = k.split('|');
        if (t === s(r.tingkat) && (rb === s(r.rombel) || rb === '')) hasil.add(m);
      }
      return hasil;
    },
    // Satu baris nilai boleh dilihat?
    bolehNilai(n) {
      if (semua) return true;
      if (!guru) return false;
      if (s(n.guru) === guru) return true;
      if (wali.has(kunciRombel(n.tingkat, n.rombel))) return true;
      return adaPasangan('', n.tingkat, n.rombel, n.mapel);
    },
  };
}
