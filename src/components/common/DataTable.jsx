import { useMemo, useState } from 'react';

/**
 * DataTable generik — padanan React dari createTableController() di app vanilla.
 *
 * columns: [{ key, label, sortable?, accessor?(row), render?(row, index) }]
 * data: array baris mentah
 * searchFn: (row, termLowerCase) => boolean
 * pageSize: default 10 -- kalau pageSizeOptions TIDAK diisi, ini ukuran halaman TETAP
 *   (perilaku lama, semua pemanggil existing tidak berubah).
 * pageSizeOptions: opsional, array pilihan (mis. [10, 20, 50, 100, 'Semua']) -- kalau
 *   diisi, tampil dropdown "Tampilkan" di atas tabel; nilai 'Semua' menampilkan
 *   SELURUH baris (tanpa paginasi). pageSize dipakai sbg nilai AWAL dropdown ini.
 * footer: opsional, (filteredRows) => <tr>...</tr> -- baris ringkasan/total yg
 *   ditaruh di <tfoot>, dihitung dari SELURUH baris yg lolos pencarian+sort (BUKAN
 *   cuma baris di halaman yg sedang tampil), jadi totalnya tetap benar walau lagi
 *   di halaman 2/3/dst.
 * emptyMessage: teks saat data kosong
 */
export default function DataTable({ columns, data, searchFn, pageSize = 10, pageSizeOptions = null, footer = null, emptyMessage = 'Tidak ada data.', defaultSortKey = null, defaultSortDir = 'asc', rowKey, forceShowAll = false }) {
  const [term, setTerm] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [page, setPage] = useState(1);
  const [pageSizeSel, setPageSizeSel] = useState(pageSize);

  const filtered = useMemo(() => {
    let rows = data;
    if (term.trim() && searchFn) {
      const t = term.trim().toLowerCase();
      rows = rows.filter(r => searchFn(r, t));
    }
    if (sortKey) {
      const col = columns.find(c => c.key === sortKey);
      const accessor = col?.accessor || (r => r[sortKey]);
      rows = [...rows].sort((a, b) => {
        const av = accessor(a); const bv = accessor(b);
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [data, term, sortKey, sortDir, columns, searchFn]);

  // Kalau dropdown "Tampilkan" pilih 'Semua', perlakukan spt forceShowAll (lewati paginasi).
  const tampilkanSemua = forceShowAll || pageSizeSel === 'Semua';
  const pageSizeAktif = typeof pageSizeSel === 'number' ? pageSizeSel : pageSize;
  const totalPages = tampilkanSemua ? 1 : Math.max(1, Math.ceil(filtered.length / pageSizeAktif));
  const pageSafe = Math.min(page, totalPages);
  // Mode cetak (forceShowAll) ATAU dropdown "Semua": lewati paginasi sepenuhnya --
  // supaya PDF/print/tampilan "Semua" memuat SEMUA baris, bukan cuma 1 halaman.
  const pageRows = tampilkanSemua ? filtered : filtered.slice((pageSafe - 1) * pageSizeAktif, pageSafe * pageSizeAktif);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function handleGantiPageSize(v) {
    setPageSizeSel(v === 'Semua' ? 'Semua' : Number(v));
    setPage(1);
  }

  return (
    <div>
      {(searchFn || pageSizeOptions) && (
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {searchFn ? (
            <div className="search-box" style={{ flex: 1, minWidth: 180 }}>
              <input
                type="text"
                placeholder="Cari..."
                value={term}
                onChange={(e) => { setTerm(e.target.value); setPage(1); }}
              />
            </div>
          ) : <div />}
          {pageSizeOptions && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              Tampilkan
              <select value={String(pageSizeSel)} onChange={e => handleGantiPageSize(e.target.value)} style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5 }}>
                {pageSizeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>No</th>
              {columns.map(col => (
                <th key={col.key} className={col.headerClassName} onClick={col.sortable ? () => handleSort(col.key) : undefined} style={col.sortable ? { cursor: 'pointer' } : undefined}>
                  {col.label} {col.sortable && (sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td className="empty-cell" colSpan={columns.length + 1}>{emptyMessage}</td></tr>
            )}
            {pageRows.map((row, idx) => (
              <tr key={rowKey ? rowKey(row) : idx}>
                <td>{(pageSafe - 1) * pageSizeAktif + idx + 1}</td>
                {columns.map(col => (
                  <td key={col.key}>{col.render ? col.render(row, (pageSafe - 1) * pageSizeAktif + idx) : (col.accessor ? col.accessor(row) : row[col.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && filtered.length > 0 && (
            <tfoot>{footer(filtered)}</tfoot>
          )}
        </table>
      </div>
      {totalPages > 1 && !tampilkanSemua && (
        <div className="pagination no-print">
          <button disabled={pageSafe <= 1} onClick={() => setPage(p => p - 1)}>‹ Sebelumnya</button>
          <span style={{ alignSelf: 'center', fontSize: 12.5, color: 'var(--muted)' }}>Halaman {pageSafe} / {totalPages}</span>
          <button disabled={pageSafe >= totalPages} onClick={() => setPage(p => p + 1)}>Berikutnya ›</button>
        </div>
      )}
    </div>
  );
}
