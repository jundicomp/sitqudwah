// Ekspor laporan sbg file .docx SUNGGUHAN (bisa dibuka & diedit di Word/LibreOffice/
// Google Docs) -- BEDA dari Export PDF yg sifatnya cetak/gambar statis, tidak bisa
// diedit isinya. Pakai library "docx" (gratis, open-source, sudah diverifikasi bisa
// dibuka python-docx sbg pembaca independen). Di-lazy-load (dynamic import) supaya
// TIDAK menambah ukuran bundle awal -- baru diunduh browser saat tombol benar-benar diklik.
//
// `bagian` adalah array section laporan, masing-masing:
//   { judul, catatan?, headers?, rows?, kosongMessage?, ringkasanTeks? }
export async function exportLaporanKeWord({ judul, subjudul, bagian, filename }) {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType, AlignmentType } = await import('docx');

  function headerCell(text) {
    return new TableCell({
      shading: { fill: '123D22' },
      children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: true, color: 'FFFFFF' })] })],
    });
  }
  function dataCell(text) {
    return new TableCell({ children: [new Paragraph(String(text ?? ''))] });
  }
  function buatTabel(headers, rows) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: headers.map(headerCell) }),
        ...rows.map(r => new TableRow({ children: r.map(dataCell) })),
      ],
    });
  }

  const children = [
    new Paragraph({ text: judul, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: subjudul, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: '' }),
  ];

  bagian.forEach(b => {
    children.push(new Paragraph({ text: b.judul, heading: HeadingLevel.HEADING_2 }));
    if (b.catatan) children.push(new Paragraph({ children: [new TextRun({ text: b.catatan, italics: true })] }));
    if (b.headers && b.rows && b.rows.length > 0) {
      children.push(buatTabel(b.headers, b.rows));
    } else if (b.headers) {
      children.push(new Paragraph({ text: b.kosongMessage || 'Tidak ada data.' }));
    }
    if (b.ringkasanTeks) children.push(new Paragraph({ text: b.ringkasanTeks }));
    children.push(new Paragraph({ text: '' }));
  });

  const doc = new Document({
    sections: [{
      // Ukuran A4 dlm twips (satuan docx, 1 mm = ~56.7 twips) + margin wajar.
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 800, bottom: 800, left: 900, right: 900 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
