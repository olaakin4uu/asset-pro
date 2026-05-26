import { api } from '../api';

export type IdDocumentType =
  | 'NIN'
  | 'BVN'
  | 'PASSPORT'
  | 'DRIVERS_LICENSE'
  | 'VOTERS_CARD';

export interface VerificationRecord {
  id: number;
  companyId: number;
  documentType: string;
  documentNumberMasked: string;
  provider: string;
  status: 'verified' | 'failed' | 'pending';
  matchedFirstName: string | null;
  matchedLastName: string | null;
  matchedMiddleName: string | null;
  matchedDateOfBirth: string | null;
  matchedGender: string | null;
  matchedPhone: string | null;
  matchedPhotoUrl: string | null;
  rawResponse: unknown;
  entityType: string | null;
  entityId: number | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyRequestDto {
  documentType: IdDocumentType;
  documentNumber: string;
  entityType?: string;
  entityId?: number;
  forceRefresh?: boolean;
}

export const identityVerificationApi = {
  verify: async (data: VerifyRequestDto): Promise<VerificationRecord> => {
    const response = await api.post('/identity-verification/verify', data);
    return response.data;
  },

  listForEntity: async (
    entityType: string,
    entityId: number,
  ): Promise<{ data: VerificationRecord[]; total: number }> => {
    const response = await api.get(
      `/identity-verification/entity/${entityType}/${entityId}`,
    );
    return response.data;
  },

  list: async (params?: {
    status?: string;
    documentType?: string;
    skip?: number;
    take?: number;
  }): Promise<{ data: VerificationRecord[]; total: number }> => {
    const response = await api.get('/identity-verification', { params });
    return response.data;
  },
};
