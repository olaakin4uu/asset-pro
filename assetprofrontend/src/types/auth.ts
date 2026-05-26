export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  tenantId?: string;
  tenantName?: string;
  employeeId?: number;
  companyId?: number;
  branchId?: number;
}

// Permission action types
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage';

// Helper to build permission string
// Format matches DB: "view employees", "create users", "approve leaves" (action + entity, space-separated)
export function buildPermission(action: PermissionAction, _module: string, entity?: string): string {
  return entity ? `${action} ${entity}` : `${action} ${_module}`;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  registrationId: string;
  statusUrl: string;
}

export interface RegistrationStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  stepMessage?: string;
  errorMessage?: string;
  redirectUrl?: string;
  completedAt?: string;
}

export interface SubdomainCheckResponse {
  available: boolean;
  suggestion?: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  billingCycle: string;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
}
