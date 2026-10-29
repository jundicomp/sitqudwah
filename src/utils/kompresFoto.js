// Kecilkan foto di browser sebelum diunggah (hemat kuota & cepat dimuat saat cetak).
// Sisi terpanjang maks `maks` px, JPEG kualitas 0.8. Hasil: data URL.
export function kompresFoto(file, maks = 1280, kualitas = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('File harus berupa gambar (JPG/PNG).')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Gambar tidak bisa dibuka.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maks || height > maks) {
          const s = maks / Math.max(width, height);
          width = Math.round(width * s); height = Math.round(height * s);
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL('image/jpeg', kualitas));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
