import { useEffect, useRef, useState } from 'react';
import { emergencyService } from '../../services/other.service';
import QRCode from 'react-qr-code';
import { QrCode, RefreshCw, Download, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const MyQRCode = () => {
  const [qrInfo,   setQrInfo]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [regen,    setRegen]    = useState(false);
  const [copied,   setCopied]   = useState(false);
  const qrRef = useRef(null);

  const load = () => {
    setLoading(true);
    emergencyService.getMyQRInfo()
      .then(r => setQrInfo(r.data.data))
      .catch(() => toast.error('Failed to load QR info.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Download QR as PNG using canvas ──────────────────────
  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData   = new XMLSerializer().serializeToString(svg);
    const canvas    = document.createElement('canvas');
    const size      = 400;
    canvas.width    = size;
    canvas.height   = size;
    const ctx       = canvas.getContext('2d');
    const img       = new Image();
    const svgBlob   = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url       = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const link    = document.createElement('a');
      link.download = `medivault-qr-${qrInfo?.qrId?.slice(0,8) || 'code'}.png`;
      link.href     = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR code downloaded!');
    };
    img.src = url;
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(qrInfo?.emergencyUrl || '');
    setCopied(true);
    toast.success('Emergency URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    if (!window.confirm('Regenerate the QR image? Your QR ID and URL will NOT change.')) return;
    setRegen(true);
    try {
      await emergencyService.regenerateQR();
      load();
      toast.success('QR code image regenerated.');
    } catch { toast.error('Failed to regenerate.'); }
    finally { setRegen(false); }
  };

  if (loading) return (
    <div className="page-container">
      <div className="card p-10 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"/>
      </div>
    </div>
  );

  return (
    <div className="page-container animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">My Emergency QR Code</h1>
        <p className="text-slate-400 text-sm mt-1">First responders scan this to access your critical medical data instantly.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* QR display */}
        <div className="card p-8 flex flex-col items-center gap-5">
          {qrInfo ? (
            <>
              {/* QR rendered via react-qr-code (downloadable) */}
              <div ref={qrRef}
                className="bg-white p-5 rounded-xl border-2 border-slate-200 shadow-inner">
                <QRCode
                  value={qrInfo.emergencyUrl}
                  size={220}
                  level="H"
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                />
              </div>

              {/* QR ID */}
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">QR ID</p>
                <p className="font-mono text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg break-all">
                  {qrInfo.qrId}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 w-full">
                <button onClick={downloadQR}
                  className="btn-primary btn flex-1 gap-1.5 btn-sm">
                  <Download size={14}/>Download PNG
                </button>
                <button onClick={copyUrl}
                  className="btn-secondary btn flex-1 gap-1.5 btn-sm">
                  {copied ? <><Check size={14}/>Copied!</> : <><Copy size={14}/>Copy URL</>}
                </button>
              </div>

              <button onClick={regenerate} disabled={regen}
                className="btn-ghost btn w-full btn-sm gap-1.5 text-slate-400">
                <RefreshCw size={14} className={regen ? 'animate-spin' : ''}/>
                Regenerate image
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <QrCode size={48} className="text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400">QR code not found.</p>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-semibold text-slate-900 mb-3">How it works</h3>
            <div className="space-y-3">
              {[
                ['🚑', 'First responder scans your QR code',  'No login or app required — works with any camera.'],
                ['👁️', 'Public view shows critical data',     'Blood group, allergies, emergency contacts instantly.'],
                ['🩺', 'Doctors get full access',             'Verified doctors see your complete medical history.'],
                ['🏥', 'Hospitals get essential data',        'Blood group, allergies, medications — emergency only.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex gap-3">
                  <span className="text-xl leading-none mt-0.5">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Important</p>
            <p className="text-xs text-amber-700">
              Your QR ID is <strong>permanent</strong> and never changes.
              Keep your medical info up to date so emergency data is always accurate.
            </p>
          </div>

          {qrInfo && (
            <div className="card p-4">
              <p className="text-xs text-slate-400 mb-1.5">Emergency URL</p>
              <p className="text-xs font-mono text-slate-600 break-all leading-relaxed">
                {qrInfo.emergencyUrl}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyQRCode;
