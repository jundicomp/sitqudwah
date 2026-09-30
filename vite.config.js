import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Repo GitHub bernama "sitqudwah" -> dipublikasikan di jundicomp.github.io/sitqudwah/
  // (bukan di root domain), jadi semua path aset harus diawali /sitqudwah/.
  // KALAU NAMA REPO DIGANTI, ubah juga baris ini, kalau tidak halaman tampil kosong.
  base: '/sitqudwah/',
  define: {
    // Waktu SUNGGUHAN saat "npm run build" dijalankan -- ditanam permanen ke
    // bundle hasil build. Dipakai di footer sidebar supaya gampang cek "apakah
    // versi yang tayang ini benar-benar hasil build terbaru" tanpa nebak-nebak.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
