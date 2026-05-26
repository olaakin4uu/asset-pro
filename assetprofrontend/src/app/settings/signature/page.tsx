'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Trash2, Loader2, PenTool, RotateCcw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { extractErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ============================================================================
// SIGNATURE PAD COMPONENT
// ============================================================================

interface SignaturePadProps {
  onSave: (blob: Blob) => void;
  saving: boolean;
}

function SignaturePad({ onSave, saving }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1a1a2e');
  const [penWidth, setPenWidth] = useState(2);

  const colors = [
    { value: '#1a1a2e', label: 'Black' },
    { value: '#1e40af', label: 'Blue' },
    { value: '#166534', label: 'Green' },
    { value: '#dc2626', label: 'Red' },
  ];

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // Create a trimmed version: export at 2x for crisp signatures
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/png');
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Ink:</span>
          <div className="flex gap-1.5">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setPenColor(c.value)}
                title={c.label}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center',
                  penColor === c.value ? 'ring-2 ring-offset-2 scale-110' : 'border-transparent hover:border-muted-foreground/30'
                )}
                style={{ backgroundColor: c.value, borderColor: penColor === c.value ? c.value : undefined, ['--tw-ring-color' as string]: c.value }}
              >
                {penColor === c.value && <span className="text-white text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>
          <span className="text-xs font-medium" style={{ color: penColor }}>{colors.find(c => c.value === penColor)?.label}</span>
          <span className="text-xs text-muted-foreground font-medium ml-2">Width:</span>
          <select
            value={penWidth}
            onChange={(e) => setPenWidth(Number(e.target.value))}
            className="text-xs rounded border px-2 py-1"
          >
            <option value={1}>Fine</option>
            <option value={2}>Medium</option>
            <option value={3}>Bold</option>
          </select>
        </div>
        <button
          onClick={clearPad}
          disabled={!hasDrawn}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      {/* Canvas */}
      <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/20 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          style={{ height: 160 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground/40">Sign here</p>
          </div>
        )}
        {/* Baseline */}
        <div className="absolute bottom-8 left-8 right-8 border-b border-muted-foreground/15" />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!hasDrawn || saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
        Save Signature
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

type InputMode = 'upload' | 'draw';

export default function SignatureSettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
  });
  const loadError = fetchError ? extractErrorMessage(fetchError, 'Failed to load profile') : null;

  const [inputMode, setInputMode] = useState<InputMode>('draw');
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File | Blob, name?: string) => {
    const toUpload = file instanceof File ? file : new File([file], name || 'signature.png', { type: file.type });
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      await settingsApi.uploadSignature(toUpload);
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      setSuccess('Signature saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to save signature'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and SVG files are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrawSave = async (blob: Blob) => {
    await uploadFile(blob, 'signature.png');
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your signature?')) return;

    try {
      setRemoving(true);
      setError(null);
      setSuccess(null);
      await settingsApi.removeSignature();
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      setSuccess('Signature removed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to remove signature'));
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSignature = !!profile?.signaturePath;

  return (
    <div className="space-y-6">
      {(error || loadError) && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
          {error || loadError}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Current Signature */}
      {hasSignature && (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h3 className="font-semibold">Current Signature</h3>
          </div>
          <div className="p-6">
            <div className="border rounded-lg p-6 bg-white dark:bg-white flex items-center justify-center mb-4">
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/uploads/${profile?.signaturePath}`}
                alt="Your signature"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove Signature
            </button>
          </div>
        </div>
      )}

      {/* New / Replace Signature */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">{hasSignature ? 'Replace Signature' : 'Add Signature'}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Draw your signature directly or upload an image file
          </p>
        </div>

        <div className="p-6">
          {/* Mode Tabs */}
          <div className="inline-flex rounded-lg border p-1 gap-1 mb-6">
            <button
              onClick={() => setInputMode('draw')}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                inputMode === 'draw'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <PenTool className="h-4 w-4" />
              Draw
            </button>
            <button
              onClick={() => setInputMode('upload')}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                inputMode === 'upload'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
          </div>

          {/* Draw Mode */}
          {inputMode === 'draw' && (
            <SignaturePad onSave={handleDrawSave} saving={uploading} />
          )}

          {/* Upload Mode */}
          {inputMode === 'upload' && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a signature image
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Choose File
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                JPEG, PNG, or SVG. Max 2MB. Recommended: 400x100px with transparent background.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines */}
      <div className="rounded-xl border bg-muted/30 p-6">
        <h4 className="text-sm font-semibold mb-2">Signature Guidelines</h4>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>Use a clear, high-contrast signature for best results on documents</li>
          <li>Recommended image size: 400x100 pixels</li>
          <li>Your signature will appear on approval documents and official reports</li>
          <li>For drawn signatures, use a stylus or steady hand for best quality</li>
        </ul>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/svg+xml"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
