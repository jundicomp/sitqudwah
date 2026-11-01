import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const BUILD_TIME = new Date().toISOString()
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// v1.58.0: tulis dist/version.json -- dibaca aplikasi yg sedang terbuka di browser user
// utk tahu ada versi baru (lihat src/components/layout/PenjagaSistem.jsx).
// "updateWajib": true di package.json = versi lama dilarang menyimpan sampai dimuat ulang.
const tulisVersi = () => ({
  name: 'tulis-version-json',
  apply: 'build',
  closeBundle() {
    writeFileSync(resolve('dist', 'version.json'), JSON.stringify({ versi: pkg.version, build: BUILD_TIME, wajib: !!pkg.updateWajib }))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tulisVersi()],
  // Repo GitHub bernama "sitqudwah" -> dipublikasikan di jundicomp.github.io/sitqudwah/
  // (bukan di root domain), jadi semua path aset harus diawali /sitqudwah/.
  // KALAU NAMA REPO DIGANTI, ubah juga baris ini, kalau tidak halaman tampil kosong.
  base: '/sitqudwah/',
  define: {
    // Waktu SUNGGUHAN saat "npm run build" dijalankan -- ditanam permanen ke
    // bundle hasil build. Dipakai di footer sidebar supaya gampang cek "apakah
    // versi yang tayang ini benar-benar hasil build terbaru" tanpa nebak-nebak.
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
})
