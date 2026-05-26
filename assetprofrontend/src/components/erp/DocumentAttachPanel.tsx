'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Paperclip, Upload, File, FileText, Image, Download,
  Trash2, ChevronDown, ChevronUp, X, AlertCircle, Lock,
} from 'lucide-react';
import { documentsApi, DmsDocument } from '@/lib/api/documents';
import { extractErrorMessage } from '@/lib/utils';
import { confirmDialog } from 'primereact/confirmdialog';

interface DocumentAttachPanelProps {
  sourceModule: string;
  sourceEntity: string;
  sourceEntityId: number;
  label?: string;
  allowUpload?: boolean;
  compact?: boolean;
  allowedMimeTypes?: string[];
  maxFiles?: number;
}

function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image size={14} className="text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText size={14} className="text-red-500" />;
  return <File size={14} className="text-gray-400" />;
}

/**
 * Reusable embeddable panel for attaching/viewing documents on any entity.
 *
 * Usage:
 *   <DocumentAttachPanel
 *     sourceModule="sales"
 *     sourceEntity="sales_invoices"
 *     sourceEntityId={invoice.id}
 *     label="Invoice Documents"
 *     allowUpload
 *   />
 */
export function DocumentAttachPanel({
  sourceModule,
  sourceEntity,
  sourceEntityId,
  label = 'Documents',
  allowUpload = true,
  compact = false,
  allowedMimeTypes,
  maxFiles = 20,
}: DocumentAttachPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const queryKey = ['dms-entity-docs', sourceModule, sourceEntity, sourceEntityId];

  const { data: docs = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => documentsApi.getEntityDocuments(sourceModule, sourceEntity, sourceEntityId),
    enabled: !!sourceEntityId,
  });

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (docs.length + files.length > maxFiles) {
        setUploadError(`Maximum ${maxFiles} documents allowed`);
        return;
      }

      setUploading(true);
      setUploadError(null);

      try {
        for (const file of Array.from(files)) {
          await documentsApi.upload(file, {
            title: file.name.replace(/\.[^.]+$/, ''),
            sourceModule,
            sourceEntity,
            sourceEntityId,
          });
        }
        queryClient.invalidateQueries({ queryKey });
      } catch (err) {
        setUploadError(extractErrorMessage(err, 'Upload failed'));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [docs.length, maxFiles, queryClient, queryKey, sourceModule, sourceEntity, sourceEntityId],
  );

  const handleDelete = useCallback(
    (doc: DmsDocument) => {
      confirmDialog({
        message: `Remove "${doc.title}" from this record?`,
        header: 'Remove Document',
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        accept: async () => {
          try {
            await documentsApi.delete(doc.id);
            queryClient.invalidateQueries({ queryKey });
          } catch (err) {
            setUploadError(extractErrorMessage(err, 'Failed to remove document'));
          }
        },
      });
    },
    [queryClient, queryKey],
  );

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Paperclip size={14} />
          {label}
          {docs.length > 0 && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {docs.length}
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {!collapsed && (
        <div className="border-t">
          {uploadError && (
            <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={12} />
              {uploadError}
              <button onClick={() => setUploadError(null)} className="ml-auto"><X size={12} /></button>
            </div>
          )}

          {/* Document list */}
          {isLoading ? (
            <div className="px-4 py-4 text-sm text-muted-foreground text-center">Loading…</div>
          ) : docs.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-muted-foreground">
              No documents attached
            </div>
          ) : (
            <div className={`divide-y ${compact ? '' : 'px-0'}`}>
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors group">
                  {mimeIcon(doc.mimeType)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1">
                      {doc.title}
                      {doc.isConfidential && <Lock size={10} className="text-amber-500" />}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{fileSizeLabel(doc.fileSize)}</span>
                      <span>·</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={documentsApi.getDownloadUrl(doc.id)}
                      download={doc.fileName}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Download"
                    >
                      <Download size={13} />
                    </a>
                    {allowUpload && (
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {allowUpload && (
            <div className="px-4 py-3 border-t bg-muted/10">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-muted-foreground/40 border-t-muted-foreground" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={13} />
                    Attach file
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={allowedMimeTypes?.join(',')}
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentAttachPanel;
