// Olah gambar tanda tangan (v1.70.0): perkecil, buang latar putih (jadi transparan),
// potong ruang kosong di tepi, simpan PNG. Hasil dijaga < ~45 rb karakter agar muat
// di 1 sel Google Sheets.
const BATAS = 45000;

function muat(file) {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => gagal(new Error('Gambar tidak bisa dibaca.')); im.src = r.result; };
    r.onerror = () => gagal(new Error('File tidak bisa dibaca.'));
    r.readAsDataURL(file);
  });
}

export async function olahTtd(file, { buangPutih = true } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('File harus berupa gambar (JPG/PNG).');
  const im = await muat(file);
  // 1) gambar asli (maks 1200 px) -> buang latar putih -> cari batas coretan
  const s0 = Math.min(1, 1200 / Math.max(im.width, im.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(im.width * s0)); c.height = Math.max(1, Math.round(im.height * s0));
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0, c.width, c.height);
  const data = x.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
  for (let i = 0; i < p.length; i += 4) {
    const terang = (p[i] + p[i + 1] + p[i + 2]) / 3;
    if (buangPutih && terang > 205) p[i + 3] = 0;
    else if (buangPutih && terang > 150) p[i + 3] = Math.round(p[i + 3] * (205 - terang) / 55); // tepi halus
    if (p[i + 3] > 40) {
      const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
      if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
  }
  x.putImageData(data, 0, 0);
  if (maxX < 0) throw new Error('Tanda tangan tidak terlihat di gambar. Pakai foto/scan dengan coretan yang jelas.');
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(c.width - 1, maxX + pad); maxY = Math.min(c.height - 1, maxY + pad);
  const w = maxX - minX + 1, h = maxY - minY + 1;
  // 2) perkecil bertahap sampai ukurannya muat
  for (const lebar of [600, 480, 380, 300, 240]) {
    const s = Math.min(1, lebar / w);
    const o = document.createElement('canvas');
    o.width = Math.max(1, Math.round(w * s)); o.height = Math.max(1, Math.round(h * s));
    o.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, o.width, o.height);
    const url = o.toDataURL('image/png');
    if (url.length <= BATAS) return url;
  }
  throw new Error('Gambar tanda tangan terlalu rumit/besar. Coba foto ulang dengan latar putih polos.');
}
