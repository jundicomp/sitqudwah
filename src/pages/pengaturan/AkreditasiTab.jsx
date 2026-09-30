import { useCallback, useMemo } from 'react';
import GenericStoredTable from '../../components/sheetCrud/GenericStoredTable';
import GenericManualForm from '../../components/sheetCrud/GenericManualForm';
import { AkademikBelumTersambung } from '../../components/akademik/shared';
import { useAppData } from '../../context/AppContext';
import { PERINGKAT_AKREDITASI } from '../../db/komunikasiFields';
import { akreditasiApi } from '../../services/googleSheets';
import { formatTanggalAngka } from '../../db/helpers';
import { sekarangWIB } from '../../db/presensiBarcodeFields';

const FIELDS = [
  { key: 'Tahun', label: 'Tahun Akreditasi', type: 'number', required: true },
  { key: 'Peringkat', label: 'Peringkat', type: 'select', options: PERINGKAT_AKREDITASI, required: true },
  { key: 'Nilai', label: 'Nilai Akreditasi', type: 'number' },
  { key: 'Nomor SK', label: 'Nomor SK', type: 'text', required: true },
  { key: 'Tanggal SK', label: 'Tanggal SK', type: 'date' },
  { key: 'Berlaku Sampai', label: 'Berlaku Sampai', type: 'date', required: true },
  { key: 'Lembaga', label: 'Lembaga', type: 'text', placeholder: 'mis. BAN-PDM' },
  { key: 'Keterangan', label: 'Keterangan', type: 'text' },
];

export default function AkreditasiTab() {
  const { akreditasi, refreshAkreditasi } = useAppData();
  const hariIni = sekarangWIB().tanggal;
  const terbaru = useMemo(() => [...akreditasi].sort((a, b) => b.tahun.localeCompare(a.tahun))[0], [akreditasi]);
  const sisaHari = terbaru?.berlaku ? Math.round((new Date(terbaru.berlaku) - new Date(hariIni)) / 864e5) : null;
  const emptyRow = useCallback(() => ({ Tahun: hariIni.slice(0, 4), Peringkat: '', Nilai: '', 'Nomor SK': '', 'Tanggal SK': '', 'Berlaku Sampai': '', Lembaga: 'BAN-PDM', Keterangan: '' }), [hariIni]);
  const addFn = useCallback(async (f) => { await akreditasiApi.add(f); await refreshAkreditasi(); }, [refreshAkreditasi]);

  return (
    <>
      <AkademikBelumTersambung />
      {terbaru && (
        <div className="card" style={{ borderLeft: `5px solid ${sisaHari !== null && sisaHari < 365 ? 'var(--red)' : 'var(--green)'}` }}>
          <div className="card-body" style={{ fontSize: 14 }}>
            Akreditasi terakhir: <b>{terbaru.peringkat}</b>{terbaru.nilai && ` (nilai ${terbaru.nilai})`} tahun {terbaru.tahun}, SK {terbaru.sk}.{' '}
            {terbaru.berlaku && (sisaHari < 0 ? <b style={{ color: 'var(--red)' }}>Sudah kedaluwarsa sejak {formatTanggalAngka(terbaru.berlaku)} — segera ajukan reakreditasi.</b>
              : sisaHari < 365 ? <b style={{ color: 'var(--red)' }}>Berakhir {formatTanggalAngka(terbaru.berlaku)} ({sisaHari} hari lagi) — mulai siapkan reakreditasi.</b>
              : <>Berlaku sampai {formatTanggalAngka(terbaru.berlaku)}.</>)}
          </div>
        </div>
      )}
      <GenericStoredTable title="Riwayat akreditasi" subtitle="Dari yang terbaru. Peringatan muncul setahun sebelum masa berlaku habis."
        headers={['No', 'Tahun', 'Peringkat', 'Nilai', 'Nomor SK', 'Tanggal SK', 'Berlaku Sampai', 'Lembaga']} fields={FIELDS}
        fetchFn={akreditasiApi.fetch} updateFn={akreditasiApi.update} deleteFn={akreditasiApi.remove}
        moduleLabel="Riwayat Akreditasi" labelKey="Nomor SK" target="akademik" onChanged={refreshAkreditasi}
        searchFn={(r, t) => `${r.Tahun} ${r.Peringkat} ${r['Nomor SK']}`.toLowerCase().includes(t)} />
      <GenericManualForm fields={FIELDS} emptyRow={emptyRow} addFn={addFn} target="akademik" title="Tambah riwayat akreditasi" />
    </>
  );
}
