'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle, XCircle, Scan } from 'lucide-react';

function ScanContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const { getSocket } = useSocket();
  const { isAuthenticated } = useAuthStore();
  const scannerRef = useRef(null);
  const [lastScan, setLastScan] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | success | error
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      setConnected(socket.connected);
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('scan:acknowledged', ({ barcode }) => {
        setLastScan(barcode);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      });
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 150 },
      aspectRatio: 1.0,
    });

    scanner.render(
      (decodedText) => {
        const socket = getSocket();
        if (socket && sessionId) {
          socket.emit('scan:barcode', {
            sessionId,
            barcode: decodedText,
            userId: null,
          });
          setLastScan(decodedText);
          setStatus('success');
        }
      },
      (err) => { /* ignore scan errors */ }
    );

    scannerRef.current = scanner;
    return () => scanner.clear().catch(() => {});
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center text-white">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold">No session ID</h1>
          <p className="text-gray-400 text-sm mt-2">
            Open this page from the POS system by clicking "Mobile Scanner"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Scan className="text-primary-400" size={20} />
          <h1 className="text-white font-bold text-lg">Mobile Scanner</h1>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          {connected ? 'Connected' : 'Connecting...'}
        </div>
      </div>

      {/* Session info */}
      <div className="bg-gray-800 rounded-xl p-3 mb-4 text-center">
        <p className="text-gray-400 text-xs">POS Session</p>
        <p className="text-white font-mono text-sm mt-1">{sessionId.slice(0, 16)}...</p>
      </div>

      {/* Scanner */}
      <div className="bg-white rounded-2xl overflow-hidden mb-4">
        <div id="qr-reader" className="w-full" />
      </div>

      {/* Last scan result */}
      {lastScan && (
        <div className={`flex items-center gap-3 p-4 rounded-xl ${status === 'success' ? 'bg-green-900' : 'bg-gray-800'}`}>
          <CheckCircle className={`${status === 'success' ? 'text-green-400' : 'text-gray-400'}`} size={20} />
          <div>
            <p className="text-white text-sm font-medium">Last scanned</p>
            <p className="text-gray-300 font-mono text-xs mt-0.5">{lastScan}</p>
          </div>
        </div>
      )}

      <p className="text-gray-500 text-xs text-center mt-auto pt-4">
        Point your camera at a barcode to scan and add to the POS cart
      </p>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading scanner...</div>}>
      <ScanContent />
    </Suspense>
  );
}
