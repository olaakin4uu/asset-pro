export interface FacilityDocumentItem {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
  acceptMultiple?: boolean; // e.g. passport photos (2)
}

export const INDIVIDUAL_CHECKLIST: FacilityDocumentItem[] = [
  { key: 'application_letter',      label: 'Application Letter',                              required: true },
  { key: 'cv',                      label: 'Up-to-date CV',                                   required: true },
  { key: 'proforma_invoice',        label: 'Pro-forma Invoice',                               required: false, hint: 'If applicable' },
  { key: 'list_of_bankers',         label: 'List of Bankers',                                 required: true },
  { key: 'payslips',                label: '6 Months Pay Slips',                              required: true, acceptMultiple: true },
  { key: 'bank_statement',          label: '6 Months Bank Statement',                        required: true },
  { key: 'collateral_documents',    label: 'Security Documents / Collateral',                 required: false, hint: 'If required' },
  { key: 'referral_letter',         label: 'Referral Letter from Employer',                   required: false, hint: 'If applicable' },
  { key: 'bank_borrowings',         label: 'List and Details of Bank Borrowings & Indebtedness', required: true },
];

export const CORPORATE_CHECKLIST: FacilityDocumentItem[] = [
  { key: 'application_letter',      label: 'Application Letter',                              required: true },
  { key: 'memart',                  label: 'Memorandum & Articles of Association / Status Report', required: true },
  { key: 'certificate_of_inc',      label: 'Certificate of Incorporation (Certified True Copy)', required: true },
  { key: 'proforma_invoice',        label: 'Pro-forma Invoice',                               required: false, hint: 'If applicable' },
  { key: 'cac_7_2',                 label: 'CAC 7 & CAC 2 (Certified True Copy)',             required: true },
  { key: 'source_of_repayment',     label: 'Evidence of Source of Repayment',                required: true },
  { key: 'company_profile',         label: 'Company Profile',                                 required: true },
  { key: 'management_profile',      label: 'Management Profile',                              required: true },
  { key: 'audited_financials',      label: 'Last 3 Years Audited Financial Statements',      required: true, acceptMultiple: true },
  { key: 'cashflow_history',        label: '6 Months Company Historical Cashflow',            required: true },
  { key: 'collateral_documents',    label: 'Security / Collateral Documents',                 required: false, hint: 'If applicable' },
];
