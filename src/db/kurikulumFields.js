// =====================================================================
// CAPAIAN & TUJUAN PEMBELAJARAN (v1.52.0)
// CP  = dari pemerintah, per mapel per FASE per elemen (sama utk semua sekolah).
// TP  = dipecah sekolah/guru dari CP, per mapel per TINGKAT per SEMESTER, berurutan
//       (urutan sepanjang tahun = ATP). Tiap TP punya "ID TP" permanen supaya nanti
//       modul ajar & nilai per TP tetap nyambung walau teks/urutannya diubah.
// =====================================================================

const s = (v) => String(v ?? '').trim();

// Fase Kurikulum Merdeka dari tingkat kelas.
export function faseDariTingkat(t) {
  const n = Number(String(t).match(/\d+/)?.[0]);
  if (!n) return '';
  if (n <= 2) return 'A';
  if (n <= 4) return 'B';
  if (n <= 6) return 'C';
  if (n <= 9) return 'D';
  if (n === 10) return 'E';
  return 'F';
}
export const KELAS_FASE = { A: 'kelas 1–2', B: 'kelas 3–4', C: 'kelas 5–6', D: 'kelas 7–9', E: 'kelas 10', F: 'kelas 11–12' };

export function normalizeSheetCp(r, i) {
  return { id: 'CP-' + (r['No'] ?? i), no: r['No'], mapel: s(r['Mata Pelajaran']), fase: s(r['Fase']), elemen: s(r['Elemen']), capaian: s(r['Capaian Pembelajaran']) };
}
export function normalizeSheetTp(r, i) {
  const jp = r['Alokasi JP'];
  return {
    id: s(r['ID TP']) || 'TPX-' + (r['No'] ?? i), idTp: s(r['ID TP']), no: r['No'],
    mapel: s(r['Mata Pelajaran']), fase: s(r['Fase']), tingkat: s(r['Tingkat']), semester: s(r['Semester']) || 'Ganjil',
    urutan: Number(r['Urutan']) || 0, kode: s(r['Kode']), elemen: s(r['Elemen']), tujuan: s(r['Tujuan Pembelajaran']),
    jp: jp === '' || jp === null || jp === undefined ? '' : Number(jp),
    aktif: !/^(tidak|false|0|nonaktif)$/i.test(s(r['Aktif'])),
  };
}

const ACAK = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function buatIdTp(sudahAda = new Set()) {
  for (;;) {
    let x = 'TP-';
    for (let i = 0; i < 6; i++) x += ACAK[Math.floor(Math.random() * ACAK.length)];
    if (!sudahAda.has(x)) { sudahAda.add(x); return x; }
  }
}
// Kode tampilan: <tingkat>.<1=Ganjil|2=Genap>.<urut 2 digit>, mis. "1.1.03".
export const kodeTp = (tingkat, semester, urut) => `${tingkat}.${semester === 'Genap' ? 2 : 1}.${String(urut).padStart(2, '0')}`;

// TP satu mapel+tingkat+semester, berurutan.
export function tpUntuk(tpRows, mapel, tingkat, semester) {
  return tpRows.filter(t => t.mapel === mapel && t.tingkat === String(tingkat) && t.semester === semester && t.aktif).sort((a, b) => a.urutan - b.urutan);
}
