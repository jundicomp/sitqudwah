// Ubah elemen DOM (kartu) jadi gambar JPG, lalu coba share langsung (mis. ke WhatsApp
// lewat share-sheet HP) -- kalau browser/perangkat tidak mendukung Web Share API
// dgn file, otomatis fallback jadi unduh gambar biasa (tetap bisa dikirim manual).
// html2canvas di-lazy-load (dynamic import) supaya tidak menambah ukuran bundle awal.
export async function shareCardAsImage(elementRef, filename) {
  if (!elementRef.current) return;
  const { default: html2canvas } = await import('html2canvas');
  const el = elementRef.current;
  // PENTING: html2canvas mengkloning halaman ke iframe tersembunyi utk merender ulang.
  // Kalau iframe itu dikasih tahu window SEMPIT (mis. cuma selebar kartunya sendiri),
  // perhitungan ulang CSS Grid (.spp-kartu-grid) di dalam kloningan itu jadi BEDA dari
  // aslinya (media query 2-kolom bisa "collapse" jadi susunan lain) -- inilah yg
  // ditemukan lewat pengujian (gambar keluar cuma 80px lebar, byte). Perbaikannya:
  // kasih windowWidth/windowHeight sesuai ukuran HALAMAN SUNGGUHAN (bukan kartu),
  // supaya konteks layout kloningannya identik dgn halaman asli.
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
  });

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `${filename}.jpg`, { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch {
        // Pengguna batal share, atau gagal -- lanjut ke unduh biasa di bawah.
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.92);
}
