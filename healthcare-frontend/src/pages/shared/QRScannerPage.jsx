import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { QrCode, Camera, Keyboard, ArrowRight, Upload, Play, Square, X, Loader, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

const QRScannerPage = () => {
  const navigate              = useNavigate();
  const { user }              = useAuth();
  const [mode, setMode]       = useState('camera');   // camera | manual
  const [status, setStatus]   = useState('idle');     // idle | starting | scanning | success
  const [cameraError, setCameraError] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [fileProcessing, setFileProcessing] = useState(false);
  const scannerRef  = useRef(null);
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // ── Extract UUID ─────────────────────────────────────────
  const extractId = (raw) => {
    const clean = (raw || '').trim();
    const match = clean.match(/\/emergency\/([a-zA-Z0-9\-]{36})/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9\-]{36}$/.test(clean)) return clean;
    return null;
  };

  const goToEmergency = (id) => {
    setStatus('success');
    setTimeout(() => navigateRef.current('/emergency/' + id), 600);
  };

  // ── Stop scanner ─────────────────────────────────────────
  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (_) {}
      try { scannerRef.current.clear();      } catch (_) {}
      scannerRef.current = null;
    }
    // Remove any html5-qrcode injected child elements to prevent ghost UI
    const div = document.getElementById('qr-video-div');
    if (div) div.innerHTML = '';
    setStatus('idle');
  };

  // ── Start camera ─────────────────────────────────────────
  const startCamera = async () => {
    if (scannerRef.current) return; // already running
    setCameraError('');
    setStatus('starting');

    // Small delay so div is mounted
    await new Promise(r => setTimeout(r, 350));

    const div = document.getElementById('qr-video-div');
    if (!div) { setCameraError('Container not found, please refresh.'); setStatus('idle'); return; }
    div.innerHTML = ''; // clear any stale content

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-video-div');
      scannerRef.current = scanner;
      setStatus('scanning');

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: 230, height: 230 },
          disableFlip: false,
          // Suppress the default html5-qrcode header/footer UI
          verbose: false,
        },
        async (decodedText) => {
          if (!scannerRef.current) return;
          const s = scannerRef.current;
          scannerRef.current = null;
          const id = extractId(decodedText);
          if (!id) { toast.error('Unrecognised QR format. Try manual entry.'); scannerRef.current = s; return; }
          try { await s.stop(); } catch (_) {}
          try { s.clear();      } catch (_) {}
          goToEmergency(id);
        },
        () => {}
      );

      // ── Hide html5-qrcode's own UI chrome (header, select, etc.)
      setTimeout(() => {
        const header = div.querySelector('#qr-video-div__header_message');
        if (header) header.style.display = 'none';
        // Remove the scan type select bar if present
        div.querySelectorAll('select, #html5-qrcode-button-camera-permission, #html5-qrcode-button-camera-stop, #html5-qrcode-anchor-scan-type-change').forEach(el => { el.style.display = 'none'; });
        // Style the video to fill the container
        const video = div.querySelector('video');
        if (video) { video.style.width = '100%'; video.style.height = '100%'; video.style.objectFit = 'cover'; }
      }, 800);

    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(
        err?.message?.toLowerCase().includes('permission')
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Could not start camera: ' + (err?.message || 'unknown error')
      );
      setStatus('idle');
    }
  };

  // ── Upload QR image file ──────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be selected again
    setFileProcessing(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const tempId = 'qr-file-scanner-' + Date.now();
      const tempDiv = document.createElement('div');
      tempDiv.id = tempId;
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
      const scanner = new Html5Qrcode(tempId);
      try {
        const result = await scanner.scanFile(file, false);
        const id = extractId(result);
        if (!id) { toast.error('No valid patient QR found in this image.'); }
        else { goToEmergency(id); }
      } catch (_) {
        toast.error('Could not read a QR code from this image. Try a clearer photo.');
      } finally {
        try { scanner.clear(); } catch (_) {}
        document.body.removeChild(tempDiv);
      }
    } catch (err) {
      toast.error('File scan failed: ' + (err?.message || 'unknown error'));
    } finally {
      setFileProcessing(false);
    }
  };

  // ── Tab switching ─────────────────────────────────────────
  const switchToCamera = async () => {
    await stopScanner();
    setMode('camera');
    setCameraError('');
  };

  const switchToManual = async () => {
    await stopScanner();
    setMode('manual');
  };

  // Cleanup on unmount
  useEffect(() => () => { stopScanner(); }, []);

  // ── Manual submit ─────────────────────────────────────────
  const handleManualSubmit = () => {
    const id = extractId(qrInput);
    if (!id) { toast.error('Enter a valid emergency URL or UUID.'); return; }
    navigate('/emergency/' + id);
  };

  const isScanning = status === 'scanning';

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
            <QrCode size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-slate-900">QR Scanner</span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              user.role === 'doctor'   ? 'bg-blue-100 text-blue-700' :
              user.role === 'hospital' ? 'bg-violet-100 text-violet-700' :
              'bg-slate-100 text-slate-600'}`}>
              {user.role === 'doctor' ? 'Dr. ' : ''}{user.firstName}
            </span>
          )}
          {user ? (
            <Link to={'/' + user.role + '/dashboard'}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-4 py-2 rounded-xl transition-colors">
              ← Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-primary btn btn-sm">Sign in</Link>
          )}
        </div>
      </header>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
        <button onClick={switchToCamera}
          className={'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ' +
            (mode === 'camera'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-400 hover:text-slate-600')}>
          <Camera size={16} />Camera Scan
        </button>
        <button onClick={switchToManual}
          className={'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ' +
            (mode === 'manual'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-slate-400 hover:text-slate-600')}>
          <Keyboard size={16} />Manual / Upload
        </button>
      </div>

      {/* ── Camera mode ────────────────────────────────────── */}
      {mode === 'camera' && (
        <div className="flex-1 flex flex-col bg-slate-50">

          {/* Scanner box */}
          <div className="flex-1 flex flex-col items-center justify-start px-4 pt-5 pb-4">

            {/* Scanner container */}
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-slate-200 bg-black"
              style={{ aspectRatio: '1 / 1.1' }}>

              {/* html5-qrcode mounts here */}
              <div id="qr-video-div" className="absolute inset-0 w-full h-full" />

              {/* Starting overlay */}
              {status === 'starting' && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3 z-20">
                  <Loader size={36} className="text-primary-400 animate-spin" />
                  <p className="text-slate-300 text-sm font-medium">Starting camera…</p>
                </div>
              )}

              {/* Success overlay */}
              {status === 'success' && (
                <div className="absolute inset-0 bg-emerald-900 flex flex-col items-center justify-center gap-4 z-20">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-4xl font-bold">✓</span>
                  </div>
                  <p className="text-white text-xl font-bold">QR Scanned!</p>
                  <p className="text-emerald-300 text-sm">Loading patient data…</p>
                </div>
              )}

              {/* Error overlay */}
              {cameraError && status === 'idle' && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4 px-6 z-20">
                  <div className="w-14 h-14 bg-red-900/60 rounded-full flex items-center justify-center">
                    <X size={24} className="text-red-400" />
                  </div>
                  <p className="text-slate-300 text-sm text-center leading-relaxed">{cameraError}</p>
                  <button onClick={startCamera}
                    className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-colors">
                    Try Again
                  </button>
                </div>
              )}

              {/* Idle overlay - camera not started */}
              {status === 'idle' && !cameraError && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-4 z-20">
                  <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center">
                    <Camera size={30} className="text-slate-400" />
                  </div>
                  <p className="text-slate-400 text-sm text-center">Camera is stopped</p>
                </div>
              )}

              {/* Scan frame — only shown while actively scanning */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="relative" style={{ width: 200, height: 200 }}>
                    {/* Corners */}
                    {[
                      { top:0, left:0,   borderTop:'3px solid', borderLeft:'3px solid',   borderRadius:'6px 0 0 0' },
                      { top:0, right:0,  borderTop:'3px solid', borderRight:'3px solid',  borderRadius:'0 6px 0 0' },
                      { bottom:0, left:0,  borderBottom:'3px solid', borderLeft:'3px solid',  borderRadius:'0 0 0 6px' },
                      { bottom:0, right:0, borderBottom:'3px solid', borderRight:'3px solid', borderRadius:'0 0 6px 0' },
                    ].map((s, i) => (
                      <div key={i} style={{ position:'absolute', width:40, height:40, borderColor:'#6366f1', ...s }} />
                    ))}
                    {/* Animated scan line */}
                    <div style={{
                      position:'absolute', left:0, right:0, height:2,
                      background:'linear-gradient(90deg, transparent, #6366f1, transparent)',
                      animation:'scanline 2s ease-in-out infinite',
                    }}/>
                  </div>
                </div>
              )}
            </div>

            {/* Hint text */}
            <p className="text-slate-500 text-sm text-center mt-3">
              {status === 'scanning' ? 'Align the QR code within the frame' :
               status === 'starting' ? 'Requesting camera access…' :
               status === 'success'  ? 'Opening patient records…' :
               'Press Start Scan to open camera'}
            </p>

            {/* ── Controls ─────────────────────────────────── */}
            <div className="flex gap-3 mt-4 w-full max-w-sm">
              {!isScanning && status !== 'success' && (
                <button onClick={startCamera} disabled={status === 'starting'}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
                  {status === 'starting'
                    ? <><Loader size={18} className="animate-spin" />Starting…</>
                    : <><Play size={18} />Start Scan</>}
                </button>
              )}
              {isScanning && (
                <button onClick={stopScanner}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors">
                  <Square size={16} />Stop Scan
                </button>
              )}
            </div>

            {/* ── Upload QR image ───────────────────────────── */}
            <div className="w-full max-w-sm mt-3">
              <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-300 hover:border-primary-400 hover:bg-primary-50 text-slate-500 hover:text-primary-600 font-medium py-3 rounded-xl transition-all cursor-pointer text-sm">
                {fileProcessing
                  ? <><Loader size={16} className="animate-spin" />Reading QR from image…</>
                  : <><ImagePlus size={16} />Upload QR Code Image</>}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={fileProcessing} />
              </label>
              <p className="text-xs text-slate-400 text-center mt-1.5">
                Upload a screenshot or photo of the patient's QR code
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual / Upload mode ────────────────────────────── */}
      {mode === 'manual' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 py-10 bg-slate-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode size={28} className="text-primary-600" />
            </div>
            <p className="font-display font-bold text-slate-900 text-xl">Enter or Upload QR</p>
            <p className="text-slate-400 text-sm mt-1">Paste the URL, UUID, or upload a QR image</p>
          </div>

          <div className="w-full max-w-sm space-y-3">
            {/* Paste input */}
            <div className="flex gap-2">
              <input
                className="flex-1 input"
                placeholder="Paste emergency URL or UUID…"
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                autoFocus
              />
              <button onClick={handleManualSubmit}
                className="btn-primary btn flex-shrink-0 px-4">
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex-1 h-px bg-slate-200" />or<div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* File upload */}
            <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-slate-300 hover:border-primary-400 hover:bg-primary-50 text-slate-500 hover:text-primary-600 font-medium py-4 rounded-xl transition-all cursor-pointer">
              {fileProcessing
                ? <><Loader size={18} className="animate-spin text-primary-500" />Reading QR from image…</>
                : <><Upload size={18} />Upload QR Code Image</>}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={fileProcessing} />
            </label>
            <p className="text-xs text-slate-400 text-center">
              Upload a screenshot or photo of the patient's QR code
            </p>
          </div>
        </div>
      )}

      {/* Scan line animation */}
      <style>{`
        @keyframes scanline {
          0%   { top: 0; }
          50%  { top: calc(100% - 2px); }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};

export default QRScannerPage;
