import ExcelJS from 'exceljs';

const HIJAU_HEADER = 'FF123D22'; // sama dgn --green-dark tema aplikasi
const BORDER_TIPIS = { style: 'thin', color: { argb: 'FFAAAAAA' } };
const BORDER_SEMUA_SISI = { top: BORDER_TIPIS, bottom: BORDER_TIPIS, left: BORDER_TIPIS, right: BORDER_TIPIS };

// Ekspor array baris (objek dgn key = nama header) ke file .xlsx yg RAPI: ada judul,
// header berlatar hijau tua tulisan putih tebal, border di semua sel, lebar kolom
// otomatis menyesuaikan konten. Pakai library "exceljs" (bukan "xlsx"/SheetJS) --
// versi gratis SheetJS TERBUKTI tidak menyimpan style sel sama sekali (sudah diuji),
// exceljs genuinely open-source dan mendukung ini.
// title: string (1 baris judul, spt sebelumnya) ATAU array string (multi-baris,
// mis. ['MI Ikhlasiyah', 'Laporan Pembayaran', 'Tanggal: 15-09-2026']) -- baris
// pertama ditulis besar/tebal (judul utama), baris berikutnya lebih kecil (subjudul).
// footer: opsional, objek { [namaHeader]: nilai } utk 1 baris ringkasan/total yg
// ditambahkan PALING BAWAH stlh semua baris data (mis. { Nominal: 'Rp 1.000.000' }
// -- kolom lain yg tidak disebut dibiarkan kosong), ditulis tebal dgn latar beda
// supaya jelas ini baris total, bukan data transaksi biasa.
export async function exportToExcel(headers, rows, filename, title, footer) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');

  // Kolom "No" (nomor urut 1,2,3,...) ditambahkan OTOMATIS di sini -- di paling depan --
  // supaya SEMUA pemanggil export dapat kolom ini tanpa perlu diubah satu-satu.
  // Sengaja nomor urut BARU (1..N sesuai urutan tampil di file ini), BUKAN kolom "No"
  // mentah dari Google Sheets -- karena itu bisa berlubang/tidak berurutan kalau
  // pernah ada baris dihapus, dan akan membingungkan dibaca di Excel.
  const sudahAdaNomor = headers[0] === 'No';
  const headersFinal = sudahAdaNomor ? headers : ['No', ...headers];

  const titleLines = title ? (Array.isArray(title) ? title : [title]) : [];
  titleLines.forEach((line, i) => {
    const baris = i + 1;
    ws.mergeCells(baris, 1, baris, headersFinal.length);
    const titleCell = ws.getCell(baris, 1);
    titleCell.value = line;
    titleCell.font = i === 0
      ? { bold: true, size: 14, color: { argb: HIJAU_HEADER } }
      : { bold: false, size: 11, color: { argb: 'FF5B6B61' } }; // --muted
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(baris).height = i === 0 ? 26 : 18;
  });
  if (titleLines.length > 0) {
    ws.addRow([]); // baris kosong pemisah antara judul & tabel
  }

  const headerRow = ws.addRow(headersFinal);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HIJAU_HEADER } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = BORDER_SEMUA_SISI;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow.height = 22;

  rows.forEach((r, idx) => {
    const dataValues = headers.map(h => r[h] ?? '');
    const values = sudahAdaNomor ? dataValues : [idx + 1, ...dataValues];
    const row = ws.addRow(values);
    row.eachCell(cell => {
      cell.border = BORDER_SEMUA_SISI;
      cell.alignment = { vertical: 'middle' };
    });
    // Zebra tipis spy konsisten dgn tampilan tabel di aplikasi (baris genap sedikit beda warna)
    if (idx % 2 === 1) {
      row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBF6DE' } }; });
    }
  });

  if (footer) {
    const footerValues = headersFinal.map(h => (h === 'No' && !sudahAdaNomor ? '' : (footer[h] ?? '')));
    const footerRowObj = ws.addRow(footerValues);
    footerRowObj.eachCell(cell => {
      cell.border = BORDER_SEMUA_SISI;
      cell.font = { bold: true, color: { argb: HIJAU_HEADER } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF3EC' } }; // --green-soft
      cell.alignment = { vertical: 'middle' };
    });
  }

  headersFinal.forEach((h, i) => {
    if (h === 'No' && !sudahAdaNomor) { ws.getColumn(i + 1).width = 8; return; }
    const kontenTerpanjang = rows.reduce((max, r) => Math.max(max, String(r[h] ?? '').length), h.length);
    ws.getColumn(i + 1).width = Math.min(Math.max(kontenTerpanjang + 3, 10), 45);
  });

  ws.views = [{ state: 'frozen', ySplit: titleLines.length > 0 ? titleLines.length + 2 : 1 }]; // baris header tetap terlihat saat scroll

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Cetak SATU elemen (dicari lewat id) secara terisolasi -- sidebar/topbar/kartu lain
// otomatis disembunyikan saat proses cetak, tanpa perlu bikin halaman/tab baru.
// Pola: tempel class "printing-mode" di <body> + "print-target" di elemen tujuan,
// browser native print (Ctrl+P / window.print) cuma akan menampilkan elemen itu --
// dari situ pengguna bisa pilih "Simpan sebagai PDF" di dialog cetaknya.
export function printElementById(elementId) {
  const el = document.getElementById(elementId);
  if (!el) { console.warn('printElementById: elemen tidak ditemukan:', elementId); return; }

  document.body.classList.add('printing-mode');
  el.classList.add('print-target');

  function cleanup() {
    document.body.classList.remove('printing-mode');
    el.classList.remove('print-target');
    window.removeEventListener('afterprint', cleanup);
  }
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Jaring pengaman -- sebagian browser lama tidak selalu memicu 'afterprint'.
  setTimeout(cleanup, 4000);
}
