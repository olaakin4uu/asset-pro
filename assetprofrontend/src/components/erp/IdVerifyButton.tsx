'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from 'lucide-react';
import {
  identityVerificationApi,
  type IdDocumentType,
  type VerificationRecord,
} from '@/lib/api/identity-verification';
import { extractErrorMessage } from '@/lib/utils';

const ID_TYPE_TO_DOC: Record<string, IdDocumentType | undefined> = {
  national_id: 'NIN',
  nin: 'NIN',
  bvn: 'BVN',
  drivers_license: 'DRIVERS_LICENSE',
  passport: 'PASSPORT',
  voters_card: 'VOTERS_CARD',
  voter_card: 'VOTERS_CARD', // Fund-management spelling
};

interface IdVerifyButtonProps {
  /** ID kind selected on the parent form (e.g. 'national_id', 'passport') */
  idType: string;
  /** Raw ID number entered by the user */
  idNumber: string;
  /** Polymorphic anchor for the verification record (e.g. 'vet_client', 'investor', 'hotel_reservation') */
  entityType?: string;
  /** Anchor record id — omit on create flows; verification gets persisted unattached and can be linked later */
  entityId?: number;
  /** Called when a verification succeeds. Use to capture the kycVerificationId for parent form submission. */
  onVerified?: (record: VerificationRecord) => void;
  /** Compact rendering — useful in dense tables */
  compact?: boolean;
}

export function IdVerifyButton({
  idType,
  idNumber,
  entityType,
  entityId,
  onVerified,
  compact,
}: IdVerifyButtonProps) {
  const queryClient = useQueryClient();
  const [latest, setLatest] = useState<VerificationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docType = ID_TYPE_TO_DOC[idType?.toLowerCase()];

  // Fetch any existing verification record already linked to this entity.
  const { data: existing } = useQuery({
    queryKey: ['id-verification-existing', entityType, entityId],
    queryFn: () => identityVerificationApi.listForEntity(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
  });

  // Adopt the most recent verified record as the active state.
  useEffect(() => {
    if (existing?.data?.length) {
      const latestVerified =
        existing.data.find((r) => r.status === 'verified') ?? existing.data[0];
      setLatest(latestVerified);
      if (latestVerified.status === 'verified' && onVerified) {
        onVerified(latestVerified);
      }
    }
  }, [existing, onVerified]);

  const verify = useMutation({
    mutationFn: () =>
      identityVerificationApi.verify({
        documentType: docType!,
        documentNumber: idNumber,
        entityType,
        entityId,
      }),
    onSuccess: (record) => {
      setLatest(record);
      setError(null);
      if (record.status === 'verified' && onVerified) {
        onVerified(record);
      }
      if (entityType && entityId) {
        queryClient.invalidateQueries({
          queryKey: ['id-verification-existing', entityType, entityId],
        });
      }
    },
    onError: (err) => {
      setError(extractErrorMessage(err, 'Verification failed'));
    },
  });

  const canVerify = !!docType && !!idNumber?.trim();

  // Render the status badge if we have one.
  let statusBadge: React.ReactNode = null;
  if (latest) {
    if (latest.status === 'verified') {
      const matched = [latest.matchedFirstName, latest.matchedLastName]
        .filter(Boolean)
        .join(' ');
      statusBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="h-3 w-3" />
          {compact ? 'Verified' : `Verified${matched ? ` — ${matched}` : ''} (${latest.documentNumberMasked})`}
        </span>
      );
    } else if (latest.status === 'failed') {
      statusBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <ShieldX className="h-3 w-3" />
          Failed{latest.errorMessage ? ` — ${latest.errorMessage}` : ''}
        </span>
      );
    } else {
      statusBadge = (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
          <ShieldAlert className="h-3 w-3" /> {latest.status}
        </span>
      );
    }
  }

  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-2'}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            verify.mutate();
          }}
          disabled={!canVerify || verify.isPending}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            !docType
              ? 'Pick a supported ID type (NIN, BVN, Passport, Driver\'s License, Voter\'s Card)'
              : !idNumber
              ? 'Enter the ID number first'
              : 'Verify against the configured provider'
          }
        >
          {verify.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ShieldCheck className="h-3 w-3" />
          )}
          Verify {docType ?? 'ID'}
        </button>
        {statusBadge}
      </div>
      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}
      {!docType && idType && (
        <div className="text-xs text-muted-foreground">
          ID type &quot;{idType}&quot; isn&apos;t auto-verifiable yet.
        </div>
      )}
    </div>
  );
}
