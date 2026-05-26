import { publicAxios } from '../api';

export interface PublicModuleSummary {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  isIncluded: boolean;
  isAddon: boolean;
  addonPrice: number | null;
}

export interface PublicPlan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  modules: PublicModuleSummary[];
  limits: {
    maxUsers: number;
    maxCompanies: number;
    maxBranches: number;
    maxStorageGb: number;
  };
  trialDays: number;
  isPopular: boolean;
  isEnterprise: boolean;
  badgeText: string | null;
}

export const publicApi = {
  getPlans: (): Promise<PublicPlan[]> =>
    publicAxios.get<PublicPlan[]>('/public/plans').then((r) => r.data),
};
