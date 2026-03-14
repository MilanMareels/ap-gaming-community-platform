'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { Camera, Keyboard, Loader2, QrCode, X } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { ReservationVerificationResult } from './ReservationVerificationResult';
import type { VerifiedReservation, VerificationStatus } from './types';

type ScanMode = 'scanner' | 'camera';

interface ReservationQrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

const SCAN_DEBOUNCE_MS = 200;

function extractCuid(scannedValue: string): string {
  const raw = scannedValue.trim();
  if (!raw) return '';

  // Accept plain CUID or URL that ends with the CUID.
  try {
    const parsedUrl = new URL(raw);
    const node = parsedUrl.searchParams.get('reservation') ?? '';
    if (node) return node.trim();

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1].trim();
    }
  } catch {
    // Ignore URL parse errors and treat as plain value.
  }

  return raw;
}

export default function ReservationQrScannerModal({
  open,
  onClose,
  onVerified,
}: ReservationQrScannerModalProps) {
  const [mode, setMode] = useState<ScanMode>('scanner');
  const [manualValue, setManualValue] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [reservation, setReservation] = useState<VerifiedReservation | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSupport, setCameraSupport] = useState(true);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectInFlightRef = useRef(false);
  const submitTimeoutRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);

  const tabs = useMemo(
    () => [
      {
        id: 'scanner',
        label: 'Scan met handscanner',
        icon: <Keyboard size={14} />,
      },
      { id: 'camera', label: 'Scan met camera', icon: <Camera size={14} /> },
    ],
    [],
  );

  const resetResult = useCallback(() => {
    setStatus('idle');
    setReservation(null);
    setErrorMessage('');
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraReady(false);
  }, []);

  const verifyCuid = useCallback(async (rawValue: string) => {
    const cuid = extractCuid(rawValue);
    if (!cuid) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(
        `/api/reservations/verify/${encodeURIComponent(cuid)}`,
        {
          method: 'GET',
          credentials: 'include',
        },
      );

      if (response.status === 404) {
        setReservation(null);
        setStatus('not-found');
        return;
      }

      if (!response.ok) {
        throw new Error('Kon de reservatie niet valideren.');
      }

      const payload = (await response.json()) as VerifiedReservation;
      setReservation(payload);
      setStatus('found');
      onVerified?.();
    } catch (error) {
      setReservation(null);
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Onbekende fout tijdens valideren.',
      );
    }
  }, [onVerified]);

  const detectWithBarcodeDetector = useCallback(async () => {
    if (!videoRef.current || !open || mode !== 'camera') return false;

    const BarcodeDetectorCtor = window.BarcodeDetector as
      | (new (options?: { formats?: string[] }) => {
          detect: (
            image: ImageBitmapSource,
          ) => Promise<Array<{ rawValue?: string }>>;
        })
      | undefined;

    if (!BarcodeDetectorCtor) {
      return false;
    }

    const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });

    const loop = async () => {
      if (!videoRef.current || detectInFlightRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          void loop();
        });
        return;
      }

      detectInFlightRef.current = true;
      try {
        const results = await detector.detect(videoRef.current);
        const rawValue = results[0]?.rawValue?.trim();

        if (rawValue) {
          await verifyCuid(rawValue);
          stopCamera();
          detectInFlightRef.current = false;
          return;
        }
      } catch {
        // Ignore frame detection errors and continue scanning.
      }

      detectInFlightRef.current = false;
      rafRef.current = requestAnimationFrame(() => {
        void loop();
      });
    };

    rafRef.current = requestAnimationFrame(() => {
      void loop();
    });

    return true;
  }, [mode, open, stopCamera, verifyCuid]);

  const detectWithZXing = useCallback(async () => {
    if (!videoRef.current || !open || mode !== 'camera') return false;

    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          const text = result?.getText()?.trim();
          if (!text) return;

          void (async () => {
            await verifyCuid(text);
            stopCamera();
          })();
        },
      );

      zxingControlsRef.current = controls;
      return true;
    } catch {
      return false;
    }
  }, [mode, open, stopCamera, verifyCuid]);

  const startCamera = useCallback(async () => {
    if (!open || mode !== 'camera') return;

    resetResult();
    setCameraSupport(true);
    setCameraError('');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraSupport(false);
        setCameraError(
          'Deze browser ondersteunt geen camera API (getUserMedia).',
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);

      const usedNative = await detectWithBarcodeDetector();
      if (usedNative) return;

      const usedFallback = await detectWithZXing();
      if (usedFallback) return;

      setCameraSupport(false);
      setCameraError(
        'QR detectie wordt niet ondersteund in deze browser. Gebruik handscanner of een recente Chrome/Edge.',
      );
      stopCamera();
    } catch (error) {
      setCameraSupport(false);

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setCameraError(
          'Camera toegang geweigerd. Geef permissie in je browserinstellingen.',
        );
      } else if (
        error instanceof DOMException &&
        error.name === 'NotFoundError'
      ) {
        setCameraError('Geen camera gevonden op dit toestel.');
      } else {
        setCameraError(
          'Camera kon niet gestart worden. Controleer HTTPS/permissies.',
        );
      }

      stopCamera();
    }
  }, [
    detectWithBarcodeDetector,
    detectWithZXing,
    mode,
    open,
    resetResult,
    stopCamera,
  ]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      if (submitTimeoutRef.current !== null) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
      setManualValue('');
      resetResult();
      setMode('scanner');
      return;
    }

    if (mode === 'camera') {
      void startCamera();
    }

    if (mode === 'scanner') {
      stopCamera();
    }
  }, [mode, open, resetResult, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (submitTimeoutRef.current !== null) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, [stopCamera]);

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'>
      <div className='w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl'>
        <div className='flex items-center justify-between border-b border-slate-800 p-4'>
          <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
            <QrCode size={18} className='text-red-500' /> QR Verificatie
          </h2>
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            aria-label='Sluiten'
          >
            <X size={16} />
          </Button>
        </div>

        <div className='p-4 md:p-6'>
          <Tabs
            tabs={tabs}
            activeTab={mode}
            onChange={(tabId) => setMode(tabId as ScanMode)}
          />

          {mode === 'scanner' && (
            <div className='space-y-3'>
              <label className='block text-sm text-slate-300'>
                Scan de QR code met handscanner of plak handmatig de code.
              </label>
              <input
                autoFocus
                value={manualValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setManualValue(value);

                  if (submitTimeoutRef.current !== null) {
                    clearTimeout(submitTimeoutRef.current);
                  }

                  submitTimeoutRef.current = window.setTimeout(() => {
                    void verifyCuid(value);
                  }, SCAN_DEBOUNCE_MS);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void verifyCuid(manualValue);
                  }
                }}
                className='w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-red-500'
                placeholder='Scanwaarde of CUID'
              />
              <div className='flex gap-2'>
                <Button
                  variant='primary'
                  size='sm'
                  onClick={() => void verifyCuid(manualValue)}
                  disabled={!manualValue.trim() || status === 'loading'}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 size={14} className='animate-spin' /> Controleren
                    </>
                  ) : (
                    'Controleer code'
                  )}
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => {
                    setManualValue('');
                    resetResult();
                  }}
                >
                  Leegmaken
                </Button>
              </div>
            </div>
          )}

          {mode === 'camera' && (
            <div>
              {status !== 'found' && (
                <div className='relative overflow-hidden rounded-xl border border-slate-700 bg-black'>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className='h-64 w-full object-cover md:h-80'
                  />
                  {!cameraReady && (
                    <div className='absolute inset-0 flex items-center justify-center bg-slate-900/70 text-sm text-slate-300'>
                      Camera opstarten...
                    </div>
                  )}
                </div>
              )}

              {!cameraSupport && (
                <p className='mt-3 rounded-xl border border-amber-700/50 bg-amber-950/20 p-3 text-sm text-amber-100'>
                  {cameraError ||
                    'Camera-QR detectie is niet beschikbaar op dit toestel of browser. Gebruik de handscanner tab.'}
                </p>
              )}

              <div className='mt-3 flex gap-2'>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={() => void startCamera()}
                >
                  Opnieuw proberen
                </Button>
              </div>
            </div>
          )}

          <ReservationVerificationResult
            status={status}
            reservation={reservation}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (
        image: ImageBitmapSource,
      ) => Promise<Array<{ rawValue?: string }>>;
    };
  }
}
