import { useEffect, useRef, useState } from 'react';

// v1.61.3 -- Kamera HP/tablet/laptop sbg scanner kartu.
// Dulu hanya jalan kalau browser punya BarcodeDetector (Chrome Android), jadi di Chrome
// laptop tombolnya hilang. Juga kamera ikut restart tiap halaman render ulang (fungsi
// onKode berganti), sehingga tidak sempat membaca kartu. Sekarang:
//  - mesin: BarcodeDetector bawaan bila mendukung Code128, selain itu pustaka ZXing (JS murni)
//  - onKode disimpan di ref -> kamera tidak restart
//  - pilih kamera (depan/belakang), bunyi "bip" + bingkai hijau saat terbaca
const FORMAT_NATIVE = ['code_128', 'qr_code'];

function bip() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    const ctx = bip.ctx || (bip.ctx = new Ctx());
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 1200; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.12);
  } catch { /* abaikan */ }
}

function pesanError(e) {
  const n = e?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Izin kamera ditolak. Klik ikon gembok/kamera di kolom alamat browser → Kamera → Izinkan, lalu coba lagi.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Kamera tidak ditemukan di perangkat ini.';
  if (n === 'NotReadableError') return 'Kamera sedang dipakai aplikasi lain (mis. Zoom/WhatsApp). Tutup dulu aplikasinya, lalu coba lagi.';
  return 'Kamera tidak bisa dibuka: ' + (e?.message || n || 'kesalahan tidak dikenal');
}

async function pakaiNative() {
  if (!('BarcodeDetector' in window)) return false;
  try {
    const f = await window.BarcodeDetector.getSupportedFormats();
    return f.includes('code_128');
  } catch { return false; }
}

export default function KameraScanner({ onKode }) {
  const videoRef = useRef(null);
  const onKodeRef = useRef(onKode);
  useEffect(() => { onKodeRef.current = onKode; }, [onKode]);
  const [aktif, setAktif] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [kamera, setKamera] = useState([]); // daftar videoinput
  const [deviceId, setDeviceId] = useState('');
  const [kilat, setKilat] = useState('');
  const bisa = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!aktif) return undefined;
    let batal = false; let stream = null; let timer = null; let controls = null;
    const terakhir = { kode: '', waktu: 0 };
    const terbaca = (kode) => {
      const k = String(kode || '').trim();
      // Kartu yg sama masih di depan kamera -> abaikan 10 dtk, supaya pesan "tercatat" tidak langsung
      // tertimpa "sudah tercatat".
      if (!k || (k === terakhir.kode && Date.now() - terakhir.waktu < 10000)) return;
      terakhir.kode = k; terakhir.waktu = Date.now();
      bip(); setKilat(k); setTimeout(() => setKilat(''), 1200);
      onKodeRef.current?.(k);
    };
    const video = { width: { ideal: 1280 }, height: { ideal: 720 }, ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }) };

    (async () => {
      setError(''); setStatus('Membuka kamera…');
      try {
        if (await pakaiNative()) {
          stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
          if (batal) { stream.getTracks().forEach(t => t.stop()); return; }
          const el = videoRef.current; el.srcObject = stream; await el.play();
          const detector = new window.BarcodeDetector({ formats: FORMAT_NATIVE });
          timer = setInterval(async () => {
            if (el.readyState < 2) return;
            try { const h = await detector.detect(el); if (h[0]?.rawValue) terbaca(h[0].rawValue); } catch { /* frame belum siap */ }
          }, 250);
        } else {
          const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
          if (batal) return;
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
          hints.set(DecodeHintType.TRY_HARDER, true);
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 600 });
          controls = await reader.decodeFromConstraints({ video, audio: false }, videoRef.current, (hasil) => { if (hasil) terbaca(hasil.getText()); });
          if (batal) { controls.stop(); return; }
        }
        setStatus('Arahkan barcode kartu ke kotak kamera, jarak ±15–25 cm.');
        // Daftar kamera baru lengkap (ada labelnya) setelah izin diberikan.
        try {
          const d = (await navigator.mediaDevices.enumerateDevices()).filter(x => x.kind === 'videoinput');
          if (!batal) setKamera(d);
        } catch { /* abaikan */ }
      } catch (e) {
        if (!batal) { setError(pesanError(e)); setStatus(''); setAktif(false); }
      }
    })();
    return () => {
      batal = true; clearInterval(timer);
      try { controls?.stop(); } catch { /* abaikan */ }
      stream?.getTracks().forEach(t => t.stop());
      const el = videoRef.current; if (el?.srcObject) { el.srcObject.getTracks?.().forEach(t => t.stop()); el.srcObject = null; }
    };
  }, [aktif, deviceId]);

  if (!bisa) {
    return <p style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>📷 Scan pakai kamera tidak tersedia di browser ini (butuh Chrome/Edge/Safari terbaru dan alamat https).</p>;
  }
  return (
    <div className="kamera-scan">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className={`btn btn-sm ${aktif ? '' : 'btn-primary'}`} onClick={() => { bip.ctx?.resume?.(); setAktif(a => !a); }}>
          {aktif ? '■ Matikan kamera' : '📷 Scan pakai kamera'}
        </button>
        {aktif && kamera.length > 1 && (
          <select value={deviceId} onChange={e => setDeviceId(e.target.value)} aria-label="Pilih kamera" style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}>
            <option value="">Kamera belakang (otomatis)</option>
            {kamera.map((k, i) => <option key={k.deviceId || i} value={k.deviceId}>{k.label || `Kamera ${i + 1}`}</option>)}
          </select>
        )}
      </div>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}
      {aktif && (
        <div className={`scan-video-wrap ${kilat ? 'ok' : ''}`}>
          <video ref={videoRef} className="scan-video" muted playsInline autoPlay />
          <div className="scan-bidik" aria-hidden="true" />
          {kilat && <div className="scan-kilat">✓ {kilat}</div>}
        </div>
      )}
      {aktif && status && <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 0' }}>{status}</p>}
    </div>
  );
}
