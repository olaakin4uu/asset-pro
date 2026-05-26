import { api } from '../api';

export type ComplianceUrgency = 'expired' | '1day' | '7days' | '14days' | '30days';

export interface ComplianceExpiryItem {
  id: number;
  category: string;
  reference: string;
  /** YYYY-MM-DD */
  expiryDate: string;
  /** Negative = already expired. */
  daysUntil: number;
  urgency: ComplianceUrgency;
  /** Frontend route to the entity's detail page. */
  url: string;
}

export interface ComplianceCategoryGroup {
  key: string;
  label: string;
  module: 'fleet' | 'hr' | 'fm';
  items: ComplianceExpiryItem[];
}

export interface ComplianceOverview {
  summary: Record<ComplianceUrgency, number>;
  categories: ComplianceCategoryGroup[];
  generatedAt: string;
}

export const complianceApi = {
  getOverview: async (): Promise<ComplianceOverview> => {
    const response = await api.get('/compliance/expiring');
    return response.data;
  },
};
