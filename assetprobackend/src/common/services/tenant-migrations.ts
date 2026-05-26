/**
 * Tenant Schema Migrations
 *
 * This file contains all schema migrations that must be applied to existing tenant schemas.
 * Each migration has a unique ID and an array of SQL statements.
 *
 * When adding new migrations:
 * 1. Add a new entry to MIGRATIONS with a unique ID and description
 * 2. Add the SQL statements (use IF NOT EXISTS / IF EXISTS for idempotency)
 * 3. Run the migration via the /admin/run-tenant-migrations endpoint or the CLI
 *
 * All migrations are idempotent — safe to run multiple times.
 */

export interface TenantMigration {
  id: string;
  description: string;
  sql: string[];
}

export const TENANT_MIGRATIONS: TenantMigration[] = [
  // ============================================================================
  // 2026-05-26: Payroll runs table for run-level approval governance
  // ============================================================================
  {
    id: '2026-05-26-003-payroll-runs-table',
    description: 'Create payroll_runs table and add payrollRunId FK to payrolls',
    sql: [
      `CREATE TABLE IF NOT EXISTS payroll_runs (
        id                  SERIAL PRIMARY KEY,
        "companyId"         INTEGER NOT NULL,
        "payrollCalendarId" INTEGER,
        "payrollPeriod"     TEXT NOT NULL,
        "periodStart"       DATE NOT NULL,
        "periodEnd"         DATE NOT NULL,
        "payDate"           DATE NOT NULL,
        "totalEmployees"    INTEGER NOT NULL DEFAULT 0,
        "totalGrossPay"     NUMERIC(15,2) NOT NULL DEFAULT 0,
        "totalNetPay"       NUMERIC(15,2) NOT NULL DEFAULT 0,
        "totalDeductions"   NUMERIC(15,2) NOT NULL DEFAULT 0,
        "totalEmployerCost" NUMERIC(15,2) NOT NULL DEFAULT 0,
        "totalPayeTax"      NUMERIC(15,2) NOT NULL DEFAULT 0,
        "totalPension"      NUMERIC(15,2) NOT NULL DEFAULT 0,
        status              TEXT NOT NULL DEFAULT 'DRAFT',
        "submittedById"     INTEGER,
        "submittedAt"       TIMESTAMP,
        "approvedById"      INTEGER,
        "approvedAt"        TIMESTAMP,
        "bankAccountId"     INTEGER,
        "paymentReference"  TEXT,
        "paymentDate"       DATE,
        "paidById"          INTEGER,
        "paidAt"            TIMESTAMP,
        "journalEntryId"    INTEGER,
        notes               TEXT,
        "deletedAt"         TIMESTAMP,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS "payroll_runs_companyId_payrollPeriod_idx" ON payroll_runs ("companyId", "payrollPeriod")`,
      `ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS "payrollRunId" INTEGER REFERENCES payroll_runs(id) ON DELETE SET NULL`,
    ],
  },
  // ============================================================================
  // 2026-05-26: Payroll approval flow — same 5-step chain as expense requests
  // ============================================================================
  {
    id: '2026-05-26-002-payroll-approval-flow',
    description: 'Seed payroll_runs approval flow — copies steps from expense_requests flow (tenant-configured chain)',
    sql: [
      `DO $$
       DECLARE
         v_company_id   INTEGER;
         v_flow_id      INTEGER;
         v_expense_flow INTEGER;
         v_step         RECORD;
         v_role         RECORD;
       BEGIN
         SELECT id INTO v_company_id FROM companies LIMIT 1;
         IF v_company_id IS NULL THEN RETURN; END IF;

         IF EXISTS (SELECT 1 FROM process_approval_flows WHERE "approvableType" = 'payroll_runs' AND "companyId" = v_company_id) THEN
           RETURN;
         END IF;

         INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
         VALUES (v_company_id, 'Payroll Approval', 'payroll_runs', 'hrpayroll.payrolls',
                 'Approval workflow for payroll runs — mirrors tenant expense request approval chain', true, NOW(), NOW())
         RETURNING id INTO v_flow_id;

         -- Try to copy steps from the tenant's expense_requests flow
         SELECT id INTO v_expense_flow
         FROM process_approval_flows
         WHERE "approvableType" = 'expense_requests' AND "companyId" = v_company_id AND "isActive" = true
         LIMIT 1;

         IF v_expense_flow IS NOT NULL THEN
           FOR v_step IN
             SELECT "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "stepType"
             FROM process_approval_flow_steps
             WHERE "processApprovalFlowId" = v_expense_flow
             ORDER BY "stepOrder"
           LOOP
             INSERT INTO process_approval_flow_steps
               ("processApprovalFlowId","companyId","roleId",name,"stepOrder",action,"isRequired","isActive","isLocked","isFinalStep","stepType","createdAt","updatedAt")
             VALUES (v_flow_id, v_company_id, v_step."roleId", v_step.name, v_step."stepOrder",
                     v_step.action, v_step."isRequired", v_step."isActive", v_step."isLocked", v_step."isFinalStep", v_step."stepType", NOW(), NOW())
             ON CONFLICT DO NOTHING;
           END LOOP;
         ELSE
           -- Fallback: seed default 5-step chain
           SELECT id INTO v_role FROM roles WHERE name = 'hod' AND "guardName" = 'web' LIMIT 1;
           INSERT INTO process_approval_flow_steps ("processApprovalFlowId","companyId","roleId",name,"stepOrder",action,"isRequired","isActive","isLocked","isFinalStep","stepType","createdAt","updatedAt")
           VALUES (v_flow_id, v_company_id, v_role.id, 'HOD Approval', 1, 'APPROVE', true, true, false, false, 'approve', NOW(), NOW()) ON CONFLICT DO NOTHING;

           SELECT id INTO v_role FROM roles WHERE name = 'audit' AND "guardName" = 'web' LIMIT 1;
           INSERT INTO process_approval_flow_steps ("processApprovalFlowId","companyId","roleId",name,"stepOrder",action,"isRequired","isActive","isLocked","isFinalStep","stepType","createdAt","updatedAt")
           VALUES (v_flow_id, v_company_id, v_role.id, 'Audit Review', 2, 'APPROVE', true, true, false, false, 'approve', NOW(), NOW()) ON CONFLICT DO NOTHING;

           SELECT id INTO v_role FROM roles WHERE name = 'accountant' AND "guardName" = 'web' LIMIT 1;
           INSERT INTO process_approval_flow_steps ("processApprovalFlowId","companyId","roleId",name,"stepOrder",action,"isRequired","isActive","isLocked","isFinalStep","stepType","createdAt","updatedAt")
           VALUES (v_flow_id, v_company_id, v_role.id, 'Account/Finance Coding', 3, 'APPROVE', true, true, true, false, 'accountant', NOW(), NOW()) ON CONFLICT DO NOTHING;

           SELECT id INTO v_role FROM roles WHERE name = 'management' AND "guardName" = 'web' LIMIT 1;
           INSERT INTO process_approval_flow_steps ("processApprovalFlowId","companyId","roleId",name,"stepOrder",action,"isRequired","isActive","isLocked","isFinalStep","stepType","createdAt","updatedAt")
           VALUES (v_flow_id, v_company_id, v_role.id, 'Management Approval', 4, 'APPROVE', true, true, false, false, 'approve', NOW(), NOW()) ON CONFLICT DO NOTHING;

           SELECT id INTO v_role FROM roles WHERE name = 'cashier' AND "guardName" = 'web' LIMIT 1;
           INSERT INTO process_approval_flow_steps ("processApprovalFlowId","companyId","roleId",name,"stepOrder",action,"isRequired","isActive","isLocked","isFinalStep","stepType","createdAt","updatedAt")
           VALUES (v_flow_id, v_company_id, v_role.id, 'Payment Processing', 5, 'APPROVE', true, true, true, true, 'payment', NOW(), NOW()) ON CONFLICT DO NOTHING;
         END IF;
       END $$`,
    ],
  },
  // ============================================================================
  // 2026-05-26: Employee Pay Adjustments — per-employee recurring/one-time amounts
  // ============================================================================
  {
    id: '2026-05-26-001-employee-pay-adjustments',
    description: 'Create employee_pay_adjustments table for per-employee recurring and one-time pay additions/deductions',
    sql: [
      `CREATE TABLE IF NOT EXISTS employee_pay_adjustments (
        id                SERIAL PRIMARY KEY,
        "companyId"       INTEGER NOT NULL,
        "employeeId"      INTEGER NOT NULL,
        "payElementId"    INTEGER,
        name              VARCHAR(150) NOT NULL,
        code              VARCHAR(50)  NOT NULL,
        type              VARCHAR(20)  NOT NULL DEFAULT 'EARNING',
        category          VARCHAR(50)  NOT NULL DEFAULT 'allowance',
        amount            NUMERIC(15,2) NOT NULL DEFAULT 0,
        "isRecurring"     BOOLEAN NOT NULL DEFAULT true,
        "effectiveFrom"   DATE NOT NULL,
        "effectiveTo"     DATE,
        taxable           BOOLEAN NOT NULL DEFAULT true,
        "affectsPension"  BOOLEAN NOT NULL DEFAULT false,
        note              TEXT,
        status            VARCHAR(20) NOT NULL DEFAULT 'active',
        "createdBy"       INTEGER,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "deletedAt"       TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_emp_pay_adj_employee ON employee_pay_adjustments ("employeeId", "companyId") WHERE "deletedAt" IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_emp_pay_adj_active   ON employee_pay_adjustments ("companyId", status, "effectiveFrom") WHERE "deletedAt" IS NULL`,
    ],
  },
  // ============================================================================
  // 2026-05-25: DMS Phase 4 — approval, OCR, retention columns
  // ============================================================================
  {
    id: '2026-05-25-002-dms-phase4-columns',
    description: 'Add extractedText, expiresAt, approvalStatusId to dms_documents for Phase 4 features',
    sql: [
      `ALTER TABLE dms_documents ADD COLUMN IF NOT EXISTS "extractedText" TEXT`,
      `ALTER TABLE dms_documents ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP`,
      `ALTER TABLE dms_documents ADD COLUMN IF NOT EXISTS "approvalStatusId" INTEGER`,
      `CREATE INDEX IF NOT EXISTS idx_dms_documents_expires_at ON dms_documents ("companyId", "expiresAt") WHERE "expiresAt" IS NOT NULL AND "deletedAt" IS NULL`,
    ],
  },
  // ============================================================================
  // 2026-05-19: Facility documents — application checklist uploads
  // ============================================================================
  {
    id: '2026-05-19-001-facility-documents',
    description: 'Create fm_facility_documents table for credit facility application document uploads',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_facility_documents (
        id             SERIAL PRIMARY KEY,
        "companyId"    INTEGER NOT NULL,
        "facilityId"   INTEGER NOT NULL REFERENCES fm_credit_facilities(id) ON DELETE CASCADE,
        "documentKey"  VARCHAR(100) NOT NULL,
        "documentLabel" VARCHAR(255) NOT NULL,
        "fileName"     VARCHAR(255) NOT NULL,
        "originalName" VARCHAR(255) NOT NULL,
        "filePath"     VARCHAR(500) NOT NULL,
        url            VARCHAR(500) NOT NULL,
        "mimeType"     VARCHAR(100) NOT NULL,
        size           INTEGER NOT NULL,
        "uploadedBy"   INTEGER,
        notes          TEXT,
        "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"    TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fm_facility_documents_facility ON fm_facility_documents ("companyId", "facilityId")`,
    ],
  },
  // ============================================================================
  // 2026-05-17: Wakala fee accrual — FK link + accrual tracking table
  // ============================================================================
  {
    id: '2026-05-17-001-wakala-fee-accruals',
    description: 'Add wakalaFeeTierId FK to fm_credit_facilities; create fm_wakala_fee_accruals table',
    sql: [
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "wakalaFeeTierId" INTEGER`,
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE table_name = 'fm_credit_facilities'
             AND constraint_name = 'fm_credit_facilities_wakalaFeeTierId_fkey'
         ) THEN
           ALTER TABLE fm_credit_facilities
             ADD CONSTRAINT "fm_credit_facilities_wakalaFeeTierId_fkey"
             FOREIGN KEY ("wakalaFeeTierId") REFERENCES fm_wakala_fee_tiers(id) ON DELETE SET NULL;
         END IF;
       END $$`,
      `CREATE TABLE IF NOT EXISTS fm_wakala_fee_accruals (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "facilityId" INTEGER NOT NULL,
        "feeTierId" INTEGER NOT NULL,
        "periodFrom" DATE NOT NULL,
        "periodTo" DATE NOT NULL,
        "periodDays" INTEGER NOT NULL,
        aum DECIMAL(20,2) NOT NULL,
        "feeMethod" VARCHAR(20) NOT NULL,
        "totalFee" DECIMAL(18,2) NOT NULL,
        "journalEntryId" INTEGER,
        "voidedAt" TIMESTAMPTZ,
        "voidedBy" INTEGER,
        "voidJournalId" INTEGER,
        notes TEXT,
        "createdBy" INTEGER,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS "fm_wakala_fee_accruals_companyId_facilityId" ON fm_wakala_fee_accruals("companyId","facilityId")`,
      `CREATE INDEX IF NOT EXISTS "fm_wakala_fee_accruals_companyId_feeTierId" ON fm_wakala_fee_accruals("companyId","feeTierId")`,
    ],
  },
  // ============================================================================
  // 2026-05-07: hatchery — new tables + operational fields
  // ============================================================================
  {
    id: '2026-05-07-004-hatchery-power-biosecurity-consumptions-vaccinations',
    description: 'Add power logs, biosecurity checks, batch consumptions, vaccination records tables; add operational fields to existing hatchery tables',
    sql: [
      // New columns on existing tables
      `ALTER TABLE hatchery_egg_batches ADD COLUMN IF NOT EXISTS "flockId" INTEGER`,
      `ALTER TABLE hatchery_egg_batches ADD COLUMN IF NOT EXISTS "rejectionReason" VARCHAR(255)`,
      `ALTER TABLE hatchery_incubation_runs ADD COLUMN IF NOT EXISTS "breedStrain" VARCHAR(100)`,
      `ALTER TABLE hatchery_incubation_runs ADD COLUMN IF NOT EXISTS "avgTemperature" DECIMAL(5,2)`,
      `ALTER TABLE hatchery_incubation_runs ADD COLUMN IF NOT EXISTS "avgHumidity" DECIMAL(5,2)`,
      `ALTER TABLE hatchery_incubation_runs ADD COLUMN IF NOT EXISTS "turningFrequency" INTEGER`,
      `ALTER TABLE hatchery_chick_batches ADD COLUMN IF NOT EXISTS "breedId" INTEGER`,
      `ALTER TABLE hatchery_chick_batches ADD COLUMN IF NOT EXISTS "breedStrain" VARCHAR(100)`,
      `ALTER TABLE hatchery_chick_batches ADD COLUMN IF NOT EXISTS "earlyMortality" INTEGER NOT NULL DEFAULT 0`,

      // New enums (idempotent via DO block)
      `DO $$ BEGIN
         CREATE TYPE "HatcheryBiosecurityCheckType" AS ENUM (
           'FUMIGATION','DISINFECTION','VISITOR_LOG','WASTE_DISPOSAL','DISEASE_INCIDENT','ROUTINE_INSPECTION'
         );
       EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN
         CREATE TYPE "HatcheryConsumptionType" AS ENUM (
           'VACCINE','DISINFECTANT','FUEL_DIESEL','FUEL_GAS','PACKAGING','MEDICATION','OTHER'
         );
       EXCEPTION WHEN duplicate_object THEN null; END $$`,

      // hatchery_power_logs
      `CREATE TABLE IF NOT EXISTS hatchery_power_logs (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         "runId" INTEGER,
         "logDate" DATE NOT NULL,
         "powerOutageStart" TIMESTAMP,
         "powerOutageEnd" TIMESTAMP,
         "outageDurationMins" INTEGER,
         "generatorStarted" BOOLEAN NOT NULL DEFAULT false,
         "generatorRunMins" INTEGER,
         "dieselUsedLitres" DECIMAL(8,2),
         impact VARCHAR(500),
         "loggedById" INTEGER,
         notes TEXT,
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
       )`,
      `CREATE INDEX IF NOT EXISTS "hatchery_power_logs_companyId_logDate" ON hatchery_power_logs("companyId","logDate")`,
      `CREATE INDEX IF NOT EXISTS "hatchery_power_logs_companyId_runId" ON hatchery_power_logs("companyId","runId")`,

      // hatchery_biosecurity_checks
      `CREATE TABLE IF NOT EXISTS hatchery_biosecurity_checks (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         "checkType" "HatcheryBiosecurityCheckType" NOT NULL,
         "checkDate" DATE NOT NULL,
         "checkedById" INTEGER,
         "checkedByName" VARCHAR(100),
         area VARCHAR(100),
         "chemicalUsed" VARCHAR(200),
         "dilutionRate" VARCHAR(100),
         passed BOOLEAN NOT NULL DEFAULT true,
         "failureReason" VARCHAR(500),
         "visitorName" VARCHAR(200),
         "visitorOrganisation" VARCHAR(200),
         "visitorPurpose" VARCHAR(200),
         "incidentDescription" TEXT,
         "actionTaken" TEXT,
         notes TEXT,
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
       )`,
      `CREATE INDEX IF NOT EXISTS "hatchery_biosecurity_checks_companyId_checkDate" ON hatchery_biosecurity_checks("companyId","checkDate")`,
      `CREATE INDEX IF NOT EXISTS "hatchery_biosecurity_checks_companyId_checkType" ON hatchery_biosecurity_checks("companyId","checkType")`,

      // hatchery_batch_consumptions
      `CREATE TABLE IF NOT EXISTS hatchery_batch_consumptions (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         "runId" INTEGER NOT NULL,
         "consumptionType" "HatcheryConsumptionType" NOT NULL,
         "inventoryItemId" INTEGER,
         "itemName" VARCHAR(200) NOT NULL,
         quantity DECIMAL(10,3) NOT NULL,
         "unitOfMeasure" VARCHAR(20),
         "unitCost" DECIMAL(18,2),
         "totalCost" DECIMAL(18,2),
         "isrRequestId" INTEGER,
         "consumptionDate" DATE NOT NULL,
         "recordedById" INTEGER,
         notes TEXT,
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
       )`,
      `CREATE INDEX IF NOT EXISTS "hatchery_batch_consumptions_companyId_runId" ON hatchery_batch_consumptions("companyId","runId")`,
      `CREATE INDEX IF NOT EXISTS "hatchery_batch_consumptions_companyId_date" ON hatchery_batch_consumptions("companyId","consumptionDate")`,

      // hatchery_vaccination_records
      `CREATE TABLE IF NOT EXISTS hatchery_vaccination_records (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         "chickBatchId" INTEGER NOT NULL,
         "vaccineName" VARCHAR(200) NOT NULL,
         "vaccineType" VARCHAR(100),
         manufacturer VARCHAR(200),
         "batchNumber" VARCHAR(100),
         "expiryDate" DATE,
         "vaccinationDate" DATE NOT NULL,
         "dosagePerChick" DECIMAL(8,4),
         "routeOfAdmin" VARCHAR(50),
         "chicksVaccinated" INTEGER,
         "administeredById" INTEGER,
         "administeredByName" VARCHAR(100),
         "inventoryItemId" INTEGER,
         notes TEXT,
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
       )`,
      `CREATE INDEX IF NOT EXISTS "hatchery_vaccination_records_companyId_chickBatchId" ON hatchery_vaccination_records("companyId","chickBatchId")`,
      `CREATE INDEX IF NOT EXISTS "hatchery_vaccination_records_companyId_date" ON hatchery_vaccination_records("companyId","vaccinationDate")`,
    ],
  },
  // ============================================================================
  // 2026-05-07: fm_investors display/name columns
  // ============================================================================
  {
    id: '2026-05-07-003-fm-investors-display-othername',
    description: 'Add displayName, otherNames, isActive, onboardingStatus columns to fm_investors (missing on tenants provisioned before these were added)',
    sql: [
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "displayName" VARCHAR(255)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "otherNames" VARCHAR(100)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "onboardingStatus" VARCHAR(30) DEFAULT 'APPROVED'`,
      `ALTER TABLE fm_investors ALTER COLUMN "idType" SET DEFAULT 'BVN'`,
      `ALTER TABLE fm_investors ALTER COLUMN "accreditationStatus" SET DEFAULT 'RETAIL'`,
      `ALTER TABLE fm_investors ALTER COLUMN "idNumber" DROP NOT NULL`,
      `ALTER TABLE fm_investors ALTER COLUMN "email" DROP NOT NULL`,
      `ALTER TABLE fm_investor_accounts ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) DEFAULT 'NGN'`,
      `ALTER TABLE fm_investor_accounts ADD COLUMN IF NOT EXISTS "unrealisedGain" DECIMAL(18,2) DEFAULT 0`,
      `ALTER TABLE fm_investor_accounts ADD COLUMN IF NOT EXISTS "realisedGain" DECIMAL(18,2) DEFAULT 0`,
      `ALTER TABLE fm_investor_accounts ADD COLUMN IF NOT EXISTS "createdBy" INTEGER`,
    ],
  },
  // ============================================================================
  // 2026-05-07: Credit Facility GL Config table
  // ============================================================================
  {
    id: '2026-05-07-002-investor-customer-number',
    description: 'Add customerNumber column to fm_investors — unique random 10-digit per tenant',
    sql: [
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "customerNumber" VARCHAR(10)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_fm_investors_customer_number
         ON fm_investors ("companyId", "customerNumber") WHERE "deletedAt" IS NULL`,
    ],
  },
  {
    id: '2026-05-16-001-gl-config-nullable-accounts',
    description: 'Allow debitAccountId/creditAccountId to be NULL in both GL config tables — bank leg is selected at posting time',
    sql: [
      `ALTER TABLE fm_credit_facility_gl_config ALTER COLUMN "debitAccountId" DROP NOT NULL`,
      `ALTER TABLE fm_credit_facility_gl_config ALTER COLUMN "creditAccountId" DROP NOT NULL`,
      `ALTER TABLE fm_transaction_gl_config ALTER COLUMN "debitAccountId" DROP NOT NULL`,
      `ALTER TABLE fm_transaction_gl_config ALTER COLUMN "creditAccountId" DROP NOT NULL`,
    ],
  },
  {
    id: '2026-05-07-001-credit-facility-gl-config',
    description: 'Add fm_credit_facility_gl_config table for per-fund/per-structure GL account mapping',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_credit_facility_gl_config (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "fundId" INTEGER,
        "facilityStructure" VARCHAR(20),
        "eventType" VARCHAR(30) NOT NULL,
        "debitAccountId" INTEGER,
        "creditAccountId" INTEGER,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        "createdBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cf_gl_config_company
         ON fm_credit_facility_gl_config ("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cf_gl_config_lookup
         ON fm_credit_facility_gl_config ("companyId", "eventType", "fundId", "facilityStructure")`,
    ],
  },

  // ============================================================================
  // 2026-04-10: Session changes — inspection, invoice, settings
  // ============================================================================
  {
    id: '2026-04-10-001-inspection-conditional-acceptance',
    description: 'Add conditional acceptance and deadline columns to purchase_inspections',
    sql: [
      `ALTER TABLE purchase_inspections ADD COLUMN IF NOT EXISTS "deadlineAt" TIMESTAMP`,
      `ALTER TABLE purchase_inspections ADD COLUMN IF NOT EXISTS "conditionalNotes" TEXT`,
      `ALTER TABLE purchase_inspections ADD COLUMN IF NOT EXISTS "conditionResolved" BOOLEAN DEFAULT false`,
      `ALTER TABLE purchase_inspections ADD COLUMN IF NOT EXISTS "conditionResolvedAt" TIMESTAMP`,
      `ALTER TABLE purchase_inspections ADD COLUMN IF NOT EXISTS "conditionResolvedBy" INTEGER`,
    ],
  },
  {
    id: '2026-04-10-002-invoice-three-way-match',
    description: 'Add varianceAmount and threeWayMatchResult columns to purchase_invoices',
    sql: [
      `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "varianceAmount" NUMERIC(15,2) DEFAULT 0`,
      `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "threeWayMatchResult" JSONB`,
    ],
  },
  {
    id: '2026-04-10-003-settings-inspection-deadline',
    description: 'Add inspectionDeadlineHours to purchase_settings',
    sql: [
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "inspectionDeadlineHours" INTEGER`,
    ],
  },
  {
    id: '2026-04-10-005-wht-deduction-point',
    description: 'Add whtDeductionPoint to payables settings',
    sql: [
      `ALTER TABLE pay_settings ADD COLUMN IF NOT EXISTS "whtDeductionPoint" VARCHAR(20) DEFAULT 'payment'`,
    ],
  },
  {
    id: '2026-04-10-006-invoice-wht-fields',
    description: 'Add WHT fields to purchase_invoices for per-invoice WHT tracking',
    sql: [
      `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "whtId" INTEGER`,
      `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "whtRate" NUMERIC(5,2) DEFAULT 0`,
      `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "whtApplicable" BOOLEAN DEFAULT false`,
    ],
  },
  {
    id: '2026-04-11-001-seed-foreign-currencies-and-accounts',
    description: 'Seed foreign currencies (USD, EUR, GBP, etc.) and create foreign currency bank/AR/AP accounts',
    sql: [
      // Seed foreign currencies if missing
      `INSERT INTO ifrs_currencies (code, name, symbol, "decimalPlaces", "entityId", "isActive", "createdAt", "updatedAt")
       SELECT v.code, v.name, v.symbol, v.decimals, (SELECT id FROM ifrs_entities LIMIT 1), true, NOW(), NOW()
       FROM (VALUES
         ('USD', 'United States Dollar', '$', 2),
         ('EUR', 'Euro', '€', 2),
         ('GBP', 'British Pound Sterling', '£', 2),
         ('GHS', 'Ghanaian Cedi', 'GH₵', 2),
         ('ZAR', 'South African Rand', 'R', 2),
         ('KES', 'Kenyan Shilling', 'KSh', 2),
         ('XOF', 'CFA Franc (BCEAO)', 'CFA', 0),
         ('CNY', 'Chinese Yuan', '¥', 2),
         ('INR', 'Indian Rupee', '₹', 2),
         ('AED', 'UAE Dirham', 'د.إ', 2),
         ('CAD', 'Canadian Dollar', 'C$', 2),
         ('AUD', 'Australian Dollar', 'A$', 2)
       ) AS v(code, name, symbol, decimals)
       WHERE NOT EXISTS (SELECT 1 FROM ifrs_currencies WHERE code = v.code AND "entityId" = (SELECT id FROM ifrs_entities LIMIT 1))`,

      // Create foreign currency bank accounts for major currencies
      `INSERT INTO ifrs_accounts ("entityId", "companyId", "categoryId", "currencyId", code, name, "accountType", "isPosting", "isActive", "createdAt", "updatedAt")
       SELECT
         (SELECT id FROM ifrs_entities LIMIT 1),
         (SELECT id FROM companies LIMIT 1),
         (SELECT id FROM ifrs_categories WHERE name = 'Bank' LIMIT 1),
         c.id,
         '1123-' || c.code,
         c.code || ' Bank Account',
         'asset',
         true, true, NOW(), NOW()
       FROM ifrs_currencies c
       WHERE c.code IN ('USD', 'EUR', 'GBP')
         AND NOT EXISTS (SELECT 1 FROM ifrs_accounts WHERE code = '1123-' || c.code AND "companyId" = (SELECT id FROM companies LIMIT 1))`,

      // Create foreign currency AR accounts
      `INSERT INTO ifrs_accounts ("entityId", "companyId", "categoryId", "currencyId", code, name, "accountType", "isPosting", "isActive", "createdAt", "updatedAt")
       SELECT
         (SELECT id FROM ifrs_entities LIMIT 1),
         (SELECT id FROM companies LIMIT 1),
         (SELECT id FROM ifrs_categories WHERE name = 'Receivable' LIMIT 1),
         c.id,
         '1131-' || c.code,
         c.code || ' Trade Receivables',
         'asset',
         true, true, NOW(), NOW()
       FROM ifrs_currencies c
       WHERE c.code IN ('USD', 'EUR', 'GBP')
         AND NOT EXISTS (SELECT 1 FROM ifrs_accounts WHERE code = '1131-' || c.code AND "companyId" = (SELECT id FROM companies LIMIT 1))`,

      // Create foreign currency AP accounts
      `INSERT INTO ifrs_accounts ("entityId", "companyId", "categoryId", "currencyId", code, name, "accountType", "isPosting", "isActive", "createdAt", "updatedAt")
       SELECT
         (SELECT id FROM ifrs_entities LIMIT 1),
         (SELECT id FROM companies LIMIT 1),
         (SELECT id FROM ifrs_categories WHERE name = 'Payable' LIMIT 1),
         c.id,
         '2111-' || c.code,
         c.code || ' Trade Payables',
         'liability',
         true, true, NOW(), NOW()
       FROM ifrs_currencies c
       WHERE c.code IN ('USD', 'EUR', 'GBP')
         AND NOT EXISTS (SELECT 1 FROM ifrs_accounts WHERE code = '2111-' || c.code AND "companyId" = (SELECT id FROM companies LIMIT 1))`,
    ],
  },
  {
    id: '2026-04-11-003-bank-transfer-charges-account',
    description: 'Add chargesAccountId to bank_transfers for creator-selected expense account',
    sql: [
      `ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS "chargesAccountId" INTEGER`,
    ],
  },
  {
    id: '2026-04-11-002-bank-transfer-forex-fields',
    description: 'Add transferType and forex fields to bank_transfers',
    sql: [
      `ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS "transferType" VARCHAR(20) DEFAULT 'local'`,
      `ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS "sourceCurrencyId" INTEGER`,
      `ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS "destinationCurrencyId" INTEGER`,
      `ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS "destinationAmount" NUMERIC(15,2)`,
      `ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS "bankCharges" NUMERIC(15,2) DEFAULT 0`,
      `ALTER TABLE bank_transfers ADD COLUMN IF NOT EXISTS "forexGainLoss" NUMERIC(15,2) DEFAULT 0`,
    ],
  },
  {
    id: '2026-04-10-004-updated-at-defaults',
    description: 'Ensure all updatedAt columns have DEFAULT CURRENT_TIMESTAMP for raw SQL inserts',
    sql: [
      // This is handled dynamically — see fixUpdatedAtDefaults()
    ],
  },
  {
    id: '2026-04-11-005-bank-transfer-processing-step',
    description: 'Add hardcoded "Transfer Processing" final step to bank_transfers approval flow',
    sql: [
      // Add the locked final step to the bank_transfers approval flow
      `INSERT INTO process_approval_flow_steps (
         "processApprovalFlowId", "companyId", "roleId", name, "stepOrder",
         action, "isRequired", "isActive", "isLocked", "isFinalStep",
         "createdAt", "updatedAt"
       )
       SELECT
         f.id,
         f."companyId",
         (SELECT id FROM roles WHERE name = 'accountant' LIMIT 1),
         'Transfer Processing',
         COALESCE((SELECT MAX("stepOrder") FROM process_approval_flow_steps WHERE "processApprovalFlowId" = f.id AND "deletedAt" IS NULL), 0) + 1,
         'APPROVE', true, true, true, true,
         NOW(), NOW()
       FROM process_approval_flows f
       WHERE f."approvableType" = 'bank_transfers'
         AND f."deletedAt" IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps s
           WHERE s."processApprovalFlowId" = f.id AND s."isFinalStep" = true AND s."deletedAt" IS NULL
         )`,
    ],
  },
  {
    id: '2026-04-11-009-supplier-payment-processing-step',
    description: 'Add hardcoded "Payment Processing" final step to supplier_payments approval flow',
    sql: [
      `INSERT INTO process_approval_flow_steps (
         "processApprovalFlowId", "companyId", "roleId", name, "stepOrder",
         action, "isRequired", "isActive", "isLocked", "isFinalStep",
         "approverType", "approvalMode",
         "createdAt", "updatedAt"
       )
       SELECT
         f.id,
         f."companyId",
         (SELECT id FROM roles WHERE name = 'cashier' LIMIT 1),
         'Payment Processing',
         COALESCE((SELECT MAX("stepOrder") FROM process_approval_flow_steps WHERE "processApprovalFlowId" = f.id AND "deletedAt" IS NULL), 0) + 1,
         'APPROVE', true, true, true, true,
         'role', 'any',
         NOW(), NOW()
       FROM process_approval_flows f
       WHERE f."approvableType" = 'supplier_payments'
         AND f."deletedAt" IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps s
           WHERE s."processApprovalFlowId" = f.id AND s."isFinalStep" = true AND s."deletedAt" IS NULL
         )`,
    ],
  },
  {
    id: '2026-04-12-008-tax-brackets-2026-law',
    description: 'Update tax brackets to Nigeria Tax Act 2026 (effective Jan 1, 2026). CRA abolished.',
    sql: [
      // Deactivate old brackets
      `UPDATE tax_brackets SET "isActive" = false WHERE "taxYear" < 2026`,
      // Insert new 2026 brackets
      `INSERT INTO tax_brackets ("companyId", "taxYear", "minAmount", "maxAmount", rate, label)
       SELECT c.id, 2026, v.min_amt, v.max_amt, v.rate, v.label
       FROM companies c
       CROSS JOIN (VALUES
         (0, 800000, 0, 'First ₦800,000 (Tax-Free)'),
         (800000, 3000000, 15, 'Next ₦2,200,000'),
         (3000000, 12000000, 18, 'Next ₦9,000,000'),
         (12000000, 25000000, 21, 'Next ₦13,000,000'),
         (25000000, 50000000, 23, 'Next ₦25,000,000'),
         (50000000, NULL, 25, 'Above ₦50,000,000')
       ) AS v(min_amt, max_amt, rate, label)
       WHERE NOT EXISTS (SELECT 1 FROM tax_brackets WHERE "companyId" = c.id AND "taxYear" = 2026)`,
    ],
  },
  {
    id: '2026-04-12-009-hr-settings-rent-relief',
    description: 'Add rent relief fields and default salary approach to hr_payroll_settings',
    sql: [
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "rentReliefRate" NUMERIC(5,2) DEFAULT 20`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "rentReliefMaxAmount" NUMERIC(15,2) DEFAULT 500000`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "defaultSalaryApproach" VARCHAR(20) DEFAULT 'STRUCTURED'`,
    ],
  },
  {
    id: '2026-04-12-007-mfg-allow-zero-cost',
    description: 'Add allowZeroCostMaterials to mfg_settings',
    sql: [
      `ALTER TABLE mfg_settings ADD COLUMN IF NOT EXISTS "allowZeroCostMaterials" BOOLEAN DEFAULT false`,
    ],
  },
  {
    id: '2026-04-12-006-leave-balances-table',
    description: 'Create leave_balances table for proper leave balance tracking per employee per type per year',
    sql: [
      `CREATE TABLE IF NOT EXISTS leave_balances (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "employeeId" INTEGER NOT NULL,
        "leaveTypeCode" VARCHAR(50) NOT NULL,
        "fiscalYear" INTEGER NOT NULL,
        "allocated" NUMERIC(5,1) NOT NULL DEFAULT 0,
        "used" NUMERIC(5,1) NOT NULL DEFAULT 0,
        "carriedForward" NUMERIC(5,1) NOT NULL DEFAULT 0,
        "adjusted" NUMERIC(5,1) NOT NULL DEFAULT 0,
        "balance" NUMERIC(5,1) GENERATED ALWAYS AS ("allocated" + "carriedForward" + "adjusted" - "used") STORED,
        "lastUpdated" TIMESTAMP DEFAULT NOW(),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE ("employeeId", "leaveTypeCode", "fiscalYear")
      )`,
      `CREATE INDEX IF NOT EXISTS idx_leave_balances_emp ON leave_balances ("employeeId", "fiscalYear")`,
    ],
  },
  {
    id: '2026-04-12-004-tax-brackets-table',
    description: 'Create tax_brackets table for configurable PAYE rates',
    sql: [
      `CREATE TABLE IF NOT EXISTS tax_brackets (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "taxYear" INTEGER NOT NULL DEFAULT 2025,
        "minAmount" NUMERIC(15,2) NOT NULL DEFAULT 0,
        "maxAmount" NUMERIC(15,2),
        rate NUMERIC(5,2) NOT NULL,
        label VARCHAR(100),
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Seed default Nigeria 2025 PAYE brackets
      `INSERT INTO tax_brackets ("companyId", "taxYear", "minAmount", "maxAmount", rate, label)
       SELECT c.id, 2025, v.min_amt, v.max_amt, v.rate, v.label
       FROM companies c
       CROSS JOIN (VALUES
         (0, 300000, 7, 'First ₦300,000'),
         (300000, 600000, 11, 'Next ₦300,000'),
         (600000, 1100000, 15, 'Next ₦500,000'),
         (1100000, 1600000, 19, 'Next ₦500,000'),
         (1600000, 3200000, 21, 'Next ₦1,600,000'),
         (3200000, NULL, 24, 'Above ₦3,200,000')
       ) AS v(min_amt, max_amt, rate, label)
       WHERE NOT EXISTS (SELECT 1 FROM tax_brackets WHERE "companyId" = c.id)`,
    ],
  },
  {
    id: '2026-04-12-005-public-holidays-table',
    description: 'Create public_holidays table for payroll working days calculation',
    sql: [
      `CREATE TABLE IF NOT EXISTS public_holidays (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        name VARCHAR(200) NOT NULL,
        "holidayDate" DATE NOT NULL,
        "isRecurring" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Seed Nigeria 2025 public holidays
      `INSERT INTO public_holidays ("companyId", name, "holidayDate", "isRecurring")
       SELECT c.id, v.name, v.hdate::date, v.recurring
       FROM companies c
       CROSS JOIN (VALUES
         ('New Year Day', '2025-01-01', true),
         ('Workers Day', '2025-05-01', true),
         ('Democracy Day', '2025-06-12', true),
         ('Independence Day', '2025-10-01', true),
         ('Christmas Day', '2025-12-25', true),
         ('Boxing Day', '2025-12-26', true),
         ('Eid-el-Fitr', '2025-03-31', false),
         ('Eid-el-Fitr Holiday', '2025-04-01', false),
         ('Eid-el-Kabir', '2025-06-07', false),
         ('Eid-el-Kabir Holiday', '2025-06-08', false),
         ('Eid-el-Maulud', '2025-09-05', false),
         ('Good Friday', '2025-04-18', false),
         ('Easter Monday', '2025-04-21', false)
       ) AS v(name, hdate, recurring)
       WHERE NOT EXISTS (SELECT 1 FROM public_holidays WHERE "companyId" = c.id)`,
    ],
  },
  {
    id: '2026-04-12-003-set-supplier-ap-account',
    description: 'Set accountsPayableId for all suppliers without one — uses first Payable category posting account',
    sql: [
      // Find the default AP account: first posting account in the "Payable" category
      `UPDATE suppliers SET "accountsPayableId" = (
         SELECT a.id FROM ifrs_accounts a
         JOIN ifrs_categories c ON c.id = a."categoryId"
         WHERE a."companyId" = suppliers."companyId"
           AND c.name IN ('Payable', 'Accounts Payable', 'Trade Payables')
           AND a."accountType" = 'liability'
           AND a."isPosting" = true AND a."isActive" = true AND a."deletedAt" IS NULL
         ORDER BY a.code LIMIT 1
       )
       WHERE "accountsPayableId" IS NULL
         AND "deletedAt" IS NULL`,
    ],
  },
  {
    id: '2026-04-12-002-import-grn-stock-movements',
    description: 'Create missing stock movements for import GRNs',
    sql: [
      `INSERT INTO inv_stock_movements ("companyId", "movementNumber", "movementType", "itemId", "toWarehouseId",
         quantity, "unitCost", "totalCost", reference, "referenceType", "referenceId", "movementDate", notes, status, "createdAt", "updatedAt")
       SELECT g."companyId",
              'STK-IM-FIX-' || gl.id,
              'Receipt',
              gl."itemId",
              g."warehouseId",
              gl."quantityReceived",
              COALESCE(gl."unitCost", 0),
              COALESCE(gl."lineTotal", gl."quantityReceived" * COALESCE(gl."unitCost", 0)),
              g."grnNumber",
              'grn',
              g.id,
              COALESCE(g."receivedDate", NOW()),
              'Import receipt — ' || COALESCE(o."orderNumber", 'Unknown'),
              'posted',
              NOW(), NOW()
       FROM goods_received_notes g
       JOIN grn_lines gl ON gl."goodsReceivedNoteId" = g.id
       LEFT JOIN im_import_orders o ON o.id = g."importOrderId"
       WHERE g."importOrderId" IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM inv_stock_movements sm
           WHERE sm."referenceType" = 'grn' AND sm."referenceId" = g.id AND sm."itemId" = gl."itemId"
         )`,
    ],
  },
  {
    id: '2026-04-12-001-grn-status-received',
    description: 'Update import GRNs from approved to received status',
    sql: [
      `UPDATE goods_received_notes SET status = 'received', "updatedAt" = NOW()
       WHERE "importOrderId" IS NOT NULL AND status = 'approved'`,
    ],
  },
  {
    id: '2026-04-11-024-fix-import-grn-lines',
    description: 'Insert missing GRN lines for import GRNs that have no lines (failed due to invalid column)',
    sql: [
      // For each import-linked GRN with no lines, insert lines from the import order
      `INSERT INTO grn_lines ("goodsReceivedNoteId", "itemId", "lineNumber", description, "quantityOrdered", "quantityReceived", "quantityAccepted", "unitCost", "lineTotal", "createdAt", "updatedAt")
       SELECT g.id, ol."itemId", ol."lineNumber", i.name,
              ol.quantity, ol.quantity, ol.quantity,
              COALESCE(lc."landedCostPerUnit", ol."unitPrice" * COALESCE(o."exchangeRate", 1)),
              ol.quantity * COALESCE(lc."landedCostPerUnit", ol."unitPrice" * COALESCE(o."exchangeRate", 1)),
              NOW(), NOW()
       FROM goods_received_notes g
       JOIN im_import_orders o ON o.id = g."importOrderId"
       JOIN im_import_order_lines ol ON ol."importOrderId" = o.id
       LEFT JOIN inv_items i ON i.id = ol."itemId"
       LEFT JOIN im_landed_costs lc ON lc."importOrderLineId" = ol.id
       WHERE g."importOrderId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM grn_lines gl WHERE gl."goodsReceivedNoteId" = g.id)`,
    ],
  },
  {
    id: '2026-04-11-023-cleanup-duplicate-import-inspections',
    description: 'Delete duplicate import inspections, keep only the latest per import order',
    sql: [
      `DELETE FROM purchase_inspection_lines WHERE "purchaseInspectionId" IN (
         SELECT id FROM purchase_inspections WHERE "importOrderId" IS NOT NULL
           AND id NOT IN (SELECT MAX(id) FROM purchase_inspections WHERE "importOrderId" IS NOT NULL GROUP BY "importOrderId")
       )`,
      `DELETE FROM purchase_inspections WHERE "importOrderId" IS NOT NULL
         AND id NOT IN (SELECT MAX(id) FROM purchase_inspections WHERE "importOrderId" IS NOT NULL GROUP BY "importOrderId")`,
    ],
  },
  {
    id: '2026-04-11-022-inspection-po-id-nullable',
    description: 'Make purchaseOrderId nullable on purchase_inspections for import order inspections',
    sql: [
      `ALTER TABLE purchase_inspections ALTER COLUMN "purchaseOrderId" DROP NOT NULL`,
    ],
  },
  {
    id: '2026-04-11-021-inspection-import-order-id',
    description: 'Add importOrderId to purchase_inspections for linking inspection to import orders',
    sql: [
      `ALTER TABLE purchase_inspections ADD COLUMN IF NOT EXISTS "importOrderId" INTEGER`,
    ],
  },
  {
    id: '2026-04-11-020-grn-import-order-id',
    description: 'Add importOrderId to goods_received_notes for linking GRN to import orders',
    sql: [
      `ALTER TABLE goods_received_notes ADD COLUMN IF NOT EXISTS "importOrderId" INTEGER`,
    ],
  },
  {
    id: '2026-04-11-019-reverse-wrong-clearing-gl-entries',
    description: 'Reverse and delete GL entries posted to wrong accounts for import clearance',
    sql: [
      // Reverse all import_clearance journal entries (they posted to wrong account)
      `UPDATE journal_entries SET status = 'reversed', "updatedAt" = NOW()
       WHERE "sourceType" = 'import_clearance' AND status = 'posted'`,
      // Delete their line items
      `DELETE FROM journal_entry_line_items WHERE "journalEntryId" IN (
         SELECT id FROM journal_entries WHERE "sourceType" = 'import_clearance' AND status = 'reversed'
       )`,
      // Delete the reversed entries
      `DELETE FROM journal_entries WHERE "sourceType" = 'import_clearance' AND status = 'reversed'`,
      // Clear journalEntryId from clearance records so they can re-post correctly
      `UPDATE im_customs_clearance SET "journalEntryId" = NULL WHERE "journalEntryId" IS NOT NULL`,
    ],
  },
  {
    id: '2026-04-11-018-delete-invalid-clearing-invoices',
    description: 'Hard delete all duplicate/invalid clearing agent invoices and their GL entries',
    sql: [
      // Reverse GL for ALL clearing invoices except the latest active one per import
      `UPDATE journal_entries SET status = 'reversed', "updatedAt" = NOW()
       WHERE id IN (
         SELECT "ifrsTransactionId" FROM purchase_invoices
         WHERE "invoiceNumber" LIKE 'CLR-%' AND "ifrsTransactionId" IS NOT NULL
           AND id NOT IN (
             SELECT MAX(id) FROM purchase_invoices
             WHERE "invoiceNumber" LIKE 'CLR-%' AND status NOT IN ('voided','cancelled') AND "deletedAt" IS NULL
             GROUP BY "supplierId", SUBSTRING(notes FROM 'IM-[0-9-]+')
           )
       ) AND status != 'reversed'`,
      // Delete journal entry lines for reversed clearing entries
      `DELETE FROM journal_entry_line_items WHERE "journalEntryId" IN (
         SELECT id FROM journal_entries WHERE status = 'reversed' AND "sourceType" = 'import_clearance'
       )`,
      // Delete the reversed journal entries
      `DELETE FROM journal_entries WHERE status = 'reversed' AND "sourceType" = 'import_clearance'`,
      // Delete all clearing invoices except the latest active one per import
      `DELETE FROM purchase_invoices
       WHERE "invoiceNumber" LIKE 'CLR-%'
         AND id NOT IN (
           SELECT MAX(id) FROM purchase_invoices
           WHERE "invoiceNumber" LIKE 'CLR-%' AND status NOT IN ('voided','cancelled') AND "deletedAt" IS NULL
           GROUP BY "supplierId", SUBSTRING(notes FROM 'IM-[0-9-]+')
         )`,
      // Also delete any voided clearing invoices (no need to keep them)
      `DELETE FROM purchase_invoices WHERE "invoiceNumber" LIKE 'CLR-%' AND status = 'voided'`,
    ],
  },
  {
    id: '2026-04-11-016-clearance-agent-supplier-id',
    description: 'Add clearingAgentSupplierId to im_customs_clearance for linking to supplier',
    sql: [
      `ALTER TABLE im_customs_clearance ADD COLUMN IF NOT EXISTS "clearingAgentSupplierId" INTEGER`,
    ],
  },
  {
    id: '2026-04-11-015-clearance-journal-entry-id',
    description: 'Add journalEntryId to im_customs_clearance for GL posting reference',
    sql: [
      `ALTER TABLE im_customs_clearance ADD COLUMN IF NOT EXISTS "journalEntryId" INTEGER`,
    ],
  },
  {
    id: '2026-04-11-014-clearance-cost-categories',
    description: 'Add 4 cost category columns to im_customs_clearance: duty, containerDeposit, portCharges, localExpenses',
    sql: [
      `ALTER TABLE im_customs_clearance ADD COLUMN IF NOT EXISTS "dutyAmount" NUMERIC(15,2) DEFAULT 0`,
      `ALTER TABLE im_customs_clearance ADD COLUMN IF NOT EXISTS "containerDeposit" NUMERIC(15,2) DEFAULT 0`,
      `ALTER TABLE im_customs_clearance ADD COLUMN IF NOT EXISTS "portCharges" NUMERIC(15,2) DEFAULT 0`,
      `ALTER TABLE im_customs_clearance ADD COLUMN IF NOT EXISTS "localExpenses" NUMERIC(15,2) DEFAULT 0`,
    ],
  },
  {
    id: '2026-04-11-013-grn-clearing-account',
    description: 'Create GRN Clearing GL account for import purchase invoices',
    sql: [
      `INSERT INTO ifrs_accounts ("entityId", "companyId", "categoryId", code, name, "accountType", "isPosting", "isActive", "createdAt", "updatedAt")
       SELECT
         (SELECT id FROM ifrs_entities LIMIT 1),
         (SELECT id FROM companies LIMIT 1),
         COALESCE(
           (SELECT id FROM ifrs_categories WHERE name = 'Current Assets' LIMIT 1),
           (SELECT id FROM ifrs_categories WHERE name = 'Inventory' LIMIT 1)
         ),
         'GRN-CLR',
         'GRN Clearing (Goods Received Not Invoiced)',
         'asset',
         true, true, NOW(), NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM ifrs_accounts WHERE LOWER(name) LIKE '%grn clear%' AND "companyId" = (SELECT id FROM companies LIMIT 1)
       )`,
    ],
  },
  {
    id: '2026-04-11-012-remove-seeded-4digit-coa',
    description: 'Remove default seeded 4-digit COA accounts that conflict with tenant-uploaded COA (keeps foreign currency and referenced accounts)',
    sql: [
      // Only delete pure 4-digit accounts (the seeded defaults)
      // Keep: foreign currency accounts (1123-USD etc.), any account used in journal entries,
      // any account referenced in settings, banks, customers, or suppliers
      `DELETE FROM ifrs_accounts
       WHERE code ~ '^[0-9]{4}$'
         AND id NOT IN (SELECT DISTINCT "accountId" FROM journal_entry_line_items WHERE "accountId" IS NOT NULL)
         AND id NOT IN (
           SELECT DISTINCT aid FROM (
             SELECT "defaultAccountsReceivableAccountId" AS aid FROM company_settings WHERE "defaultAccountsReceivableAccountId" IS NOT NULL
             UNION ALL SELECT "defaultSalesRevenueAccountId" FROM company_settings WHERE "defaultSalesRevenueAccountId" IS NOT NULL
             UNION ALL SELECT "defaultVatOutputAccountId" FROM company_settings WHERE "defaultVatOutputAccountId" IS NOT NULL
             UNION ALL SELECT "defaultCashAccountId" FROM company_settings WHERE "defaultCashAccountId" IS NOT NULL
             UNION ALL SELECT "defaultBankAccountId" FROM company_settings WHERE "defaultBankAccountId" IS NOT NULL
             UNION ALL SELECT "defaultCustomerDepositsAccountId" FROM company_settings WHERE "defaultCustomerDepositsAccountId" IS NOT NULL
             UNION ALL SELECT "defaultDiscountAllowedAccountId" FROM company_settings WHERE "defaultDiscountAllowedAccountId" IS NOT NULL
             UNION ALL SELECT "glAccountId" FROM banks WHERE "glAccountId" IS NOT NULL
             UNION ALL SELECT "accountsReceivableId" FROM customers WHERE "accountsReceivableId" IS NOT NULL
             UNION ALL SELECT "accountsPayableId" FROM suppliers WHERE "accountsPayableId" IS NOT NULL
           ) refs WHERE aid IS NOT NULL
         )`,
    ],
  },
  {
    id: '2026-04-11-011-rebuild-supplier-payment-flow-steps',
    description: 'Rebuild supplier_payments approval flow: Internal Audit, Accountant, GM, Management, Payment Processing',
    sql: [
      `DELETE FROM process_approval_flow_steps
       WHERE "processApprovalFlowId" IN (
         SELECT id FROM process_approval_flows WHERE "approvableType" = 'supplier_payments' AND "deletedAt" IS NULL
       )`,
      `INSERT INTO process_approval_flow_steps (
         "processApprovalFlowId", "companyId", "roleId", name, "stepOrder",
         action, "isRequired", "isActive", "isLocked", "isFinalStep",
         "approverType", "approvalMode",
         "createdAt", "updatedAt"
       )
       SELECT
         f.id, f."companyId",
         COALESCE(r.id, (SELECT id FROM roles WHERE name = 'accountant' LIMIT 1)),
         v.name, v.step_order,
         'APPROVE', true, true, v.is_locked, v.is_final,
         'role', 'any',
         NOW(), NOW()
       FROM process_approval_flows f
       CROSS JOIN (VALUES
         ('Internal Audit Check',    1, 'audit',      false, false),
         ('Accountant Review',       2, 'accountant', false, false),
         ('General Manager Approval',3, 'management', false, false),
         ('Management Approval',     4, 'management', false, false),
         ('Payment Processing',      5, 'cashier',    true,  true)
       ) AS v(name, step_order, role_name, is_locked, is_final)
       LEFT JOIN roles r ON r.name = v.role_name
       WHERE f."approvableType" = 'supplier_payments' AND f."deletedAt" IS NULL`,
    ],
  },
  {
    id: '2026-04-11-010-fix-missing-audit-step-bank-transfer',
    description: 'Add missing Internal Audit Check step to bank_transfers flow (audit role may have been missing)',
    sql: [
      // Add Internal Audit Check if missing (was skipped by 008 due to INNER JOIN with audit role)
      `INSERT INTO process_approval_flow_steps (
         "processApprovalFlowId", "companyId", "roleId", name, "stepOrder",
         action, "isRequired", "isActive", "isLocked", "isFinalStep",
         "approverType", "approvalMode",
         "createdAt", "updatedAt"
       )
       SELECT
         f.id, f."companyId",
         COALESCE(
           (SELECT id FROM roles WHERE name = 'audit' LIMIT 1),
           (SELECT id FROM roles WHERE name ILIKE '%audit%' LIMIT 1),
           (SELECT id FROM roles WHERE name = 'accountant' LIMIT 1)
         ),
         'Internal Audit Check', 1,
         'APPROVE', true, true, false, false,
         'role', 'any',
         NOW(), NOW()
       FROM process_approval_flows f
       WHERE f."approvableType" = 'bank_transfers' AND f."deletedAt" IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps s
           WHERE s."processApprovalFlowId" = f.id AND s.name = 'Internal Audit Check' AND s."deletedAt" IS NULL
         )`,
      // Fix step ordering: shift existing steps to make room for audit at position 1
      `UPDATE process_approval_flow_steps s
       SET "stepOrder" = s."stepOrder" + 1
       FROM process_approval_flows f
       WHERE s."processApprovalFlowId" = f.id
         AND f."approvableType" = 'bank_transfers' AND f."deletedAt" IS NULL
         AND s.name != 'Internal Audit Check'
         AND s."deletedAt" IS NULL
         AND EXISTS (
           SELECT 1 FROM process_approval_flow_steps s2
           WHERE s2."processApprovalFlowId" = f.id AND s2.name = 'Internal Audit Check' AND s2."stepOrder" = 1 AND s2."deletedAt" IS NULL
         )
         AND s."stepOrder" >= 1`,
      // Ensure Internal Audit Check is at position 1
      `UPDATE process_approval_flow_steps s
       SET "stepOrder" = 1
       FROM process_approval_flows f
       WHERE s."processApprovalFlowId" = f.id
         AND f."approvableType" = 'bank_transfers' AND f."deletedAt" IS NULL
         AND s.name = 'Internal Audit Check' AND s."deletedAt" IS NULL`,
    ],
  },
  {
    id: '2026-04-11-008-rebuild-bank-transfer-flow-steps',
    description: 'Rebuild bank_transfers approval flow with correct steps: Internal Audit, Accountant, GM, Management, Transfer Processing',
    sql: [
      // Delete all existing steps for bank_transfers flows
      `DELETE FROM process_approval_flow_steps
       WHERE "processApprovalFlowId" IN (
         SELECT id FROM process_approval_flows WHERE "approvableType" = 'bank_transfers' AND "deletedAt" IS NULL
       )`,
      // Re-insert the correct steps using LEFT JOIN so missing roles don't skip rows
      `INSERT INTO process_approval_flow_steps (
         "processApprovalFlowId", "companyId", "roleId", name, "stepOrder",
         action, "isRequired", "isActive", "isLocked", "isFinalStep",
         "approverType", "approvalMode",
         "createdAt", "updatedAt"
       )
       SELECT
         f.id, f."companyId",
         COALESCE(r.id, (SELECT id FROM roles WHERE name = 'accountant' LIMIT 1)),
         v.name, v.step_order,
         'APPROVE', true, true, v.is_locked, v.is_final,
         'role', 'any',
         NOW(), NOW()
       FROM process_approval_flows f
       CROSS JOIN (VALUES
         ('Internal Audit Check',    1, 'audit',      false, false),
         ('Accountant Review',       2, 'accountant', false, false),
         ('General Manager Approval',3, 'management', false, false),
         ('Management Approval',     4, 'management', false, false),
         ('Transfer Processing',     5, 'accountant', true,  true)
       ) AS v(name, step_order, role_name, is_locked, is_final)
       LEFT JOIN roles r ON r.name = v.role_name
       WHERE f."approvableType" = 'bank_transfers' AND f."deletedAt" IS NULL`,
    ],
  },
  {
    id: '2026-04-11-007-dedup-transfer-processing-steps',
    description: 'Remove duplicate Transfer Processing steps from bank_transfers approval flows',
    sql: [
      // Keep the first isFinalStep per flow, delete the rest
      `DELETE FROM process_approval_flow_steps
       WHERE id IN (
         SELECT s.id FROM process_approval_flow_steps s
         JOIN process_approval_flows f ON f.id = s."processApprovalFlowId"
         WHERE f."approvableType" = 'bank_transfers'
           AND s."isFinalStep" = true
           AND s."deletedAt" IS NULL
           AND s.id != (
             SELECT MIN(s2.id) FROM process_approval_flow_steps s2
             WHERE s2."processApprovalFlowId" = s."processApprovalFlowId"
               AND s2."isFinalStep" = true
               AND s2."deletedAt" IS NULL
           )
       )`,
    ],
  },
  {
    id: '2026-04-11-006-reset-premature-bank-transfer-approvals',
    description: 'Reset bank transfers that were prematurely approved (approval flow not complete or not initiated)',
    sql: [
      // Reset transfers that are 'approved' but have no GL posting (journalEntryId is null)
      // AND either have no approval tracking OR have incomplete approval steps
      `UPDATE bank_transfers bt
       SET status = 'draft', "approvedBy" = NULL, "approvedAt" = NULL, "approvalNotes" = NULL, "updatedAt" = NOW()
       WHERE bt.status = 'approved'
         AND bt."journalEntryId" IS NULL
         AND (
           -- No approval tracking at all
           NOT EXISTS (
             SELECT 1 FROM process_approval_statuses pas
             WHERE pas."approvableType" = 'bank_transfers' AND pas."approvableId" = bt.id
           )
           OR
           -- Approval tracking exists but status is not APPROVED
           EXISTS (
             SELECT 1 FROM process_approval_statuses pas
             WHERE pas."approvableType" = 'bank_transfers' AND pas."approvableId" = bt.id
               AND pas.status != 'APPROVED'
           )
         )`,
      // Also clean up any incomplete approval statuses for these transfers
      `DELETE FROM process_approval_statuses
       WHERE "approvableType" = 'bank_transfers'
         AND "approvableId" IN (
           SELECT id FROM bank_transfers WHERE status = 'draft'
         )
         AND status != 'APPROVED'`,
      `DELETE FROM process_approvals
       WHERE "approvableType" = 'bank_transfers'
         AND "approvableId" IN (
           SELECT id FROM bank_transfers WHERE status = 'draft'
         )`,
    ],
  },
  {
    id: '2026-04-11-004-fix-notification-urls',
    description: 'Fix old notification URLs from /core/approvals/{id} to entity-specific ?view= format',
    sql: [
      // Fix approval notifications pointing to /core/approvals/<number>
      `UPDATE notifications
       SET data = jsonb_set(
         data,
         '{url}',
         to_jsonb(
           CASE
             WHEN pas."approvableType" = 'expense_requests' THEN '/accounts/expense-requests?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'sales_orders' THEN '/sales/orders?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'sales_invoices' THEN '/sales/invoices?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'purchase_requisitions' THEN '/purchase/requisitions?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'purchase_orders' THEN '/purchase/orders?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'purchase_invoices' THEN '/purchase/invoices?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'customer_receipts' THEN '/receivables/receipts?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'StockMovement' THEN '/inventory/stock-movements?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'supplier_payments' THEN '/payables/payments?view=' || pas."approvableId"::text
             WHEN pas."approvableType" = 'bank_transfers' THEN '/accounts/bank-transfers?view=' || pas."approvableId"::text
             ELSE '/core/approvals?view=' || pas."approvableId"::text
           END
         )
       )
       FROM process_approval_statuses pas
       WHERE notifications.data->>'url' ~ '^/core/approvals/[0-9]+$'
         AND pas."approvableId" = (regexp_match(notifications.data->>'url', '/core/approvals/([0-9]+)'))[1]::int
         AND notifications.type IN ('approval', 'rejection')`,
    ],
  },

  // ============================================================================
  // 2026-04-12: Voluntary Pension Contribution (tax relief)
  // ============================================================================
  {
    id: '2026-04-12-012-fix-loan-status-case-v2',
    description: 'Fix lowercase LoanStatus enum values — convert column to text, fix values, convert back',
    sql: [
      // Step 1: Convert enum column to text so we can read/write any value
      `ALTER TABLE employee_loans ALTER COLUMN status TYPE TEXT`,
      // Step 2: Uppercase all status values
      `UPDATE employee_loans SET status = UPPER(status)`,
      // Step 3: Convert back to enum
      `ALTER TABLE employee_loans ALTER COLUMN status TYPE "LoanStatus" USING status::"LoanStatus"`,
    ],
  },

  {
    id: '2026-04-12-011-employee-loan-approval-flow',
    description: 'Seed Employee Loan Approval flow (HOD → HR → Finance) for existing tenants',
    sql: [
      `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
       SELECT c.id, 'Employee Loan Approval', 'employee_loans', 'hrpayroll.loans',
              'Configurable approval workflow for employee loans', true, NOW(), NOW()
       FROM companies c
       WHERE NOT EXISTS (
         SELECT 1 FROM process_approval_flows paf
         WHERE paf."companyId" = c.id AND paf."approvableType" = 'employee_loans'
       )`,
      // Step 1: HOD
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT paf.id, paf."companyId", r.id, 'HOD Approval', 1, 'APPROVE', true, true, false, false, NOW(), NOW()
       FROM process_approval_flows paf
       CROSS JOIN roles r
       WHERE paf."approvableType" = 'employee_loans' AND r.name = 'hod' AND r."guardName" = 'web'
       AND NOT EXISTS (
         SELECT 1 FROM process_approval_flow_steps s WHERE s."processApprovalFlowId" = paf.id AND s."stepOrder" = 1
       )`,
      // Step 2: HR/Management
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT paf.id, paf."companyId", r.id, 'HR Review', 2, 'APPROVE', true, true, false, false, NOW(), NOW()
       FROM process_approval_flows paf
       CROSS JOIN roles r
       WHERE paf."approvableType" = 'employee_loans' AND r.name = 'management' AND r."guardName" = 'web'
       AND NOT EXISTS (
         SELECT 1 FROM process_approval_flow_steps s WHERE s."processApprovalFlowId" = paf.id AND s."stepOrder" = 2
       )`,
      // Step 3: Finance (final)
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT paf.id, paf."companyId", r.id, 'Finance Approval', 3, 'APPROVE', true, true, false, true, NOW(), NOW()
       FROM process_approval_flows paf
       CROSS JOIN roles r
       WHERE paf."approvableType" = 'employee_loans' AND r.name = 'accountant' AND r."guardName" = 'web'
       AND NOT EXISTS (
         SELECT 1 FROM process_approval_flow_steps s WHERE s."processApprovalFlowId" = paf.id AND s."stepOrder" = 3
       )`,
    ],
  },

  {
    id: '2026-04-14-004-skip-supplier-quotation-setting',
    description: 'Add skipSupplierQuotation column to purchase_settings',
    sql: [
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "skipSupplierQuotation" BOOLEAN DEFAULT false`,
    ],
  },

  {
    id: '2026-04-14-003-bom-unique-constraint-exclude-deleted',
    description: 'Fix BOM unique constraint to exclude soft-deleted records',
    sql: [
      `ALTER TABLE mfg_boms DROP CONSTRAINT IF EXISTS "mfg_boms_companyId_code_key"`,
      `DROP INDEX IF EXISTS idx_mfg_boms_company_code_active`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_mfg_boms_company_code_active ON mfg_boms ("companyId", code) WHERE "deletedAt" IS NULL`,
    ],
  },

  {
    id: '2026-04-14-002-sales-settings-zero-cost-columns',
    description: 'Add allowZeroCost and blockBelowCostSelling columns to sales_settings',
    sql: [
      `ALTER TABLE sales_settings ADD COLUMN IF NOT EXISTS "allowZeroCost" BOOLEAN DEFAULT false`,
      `ALTER TABLE sales_settings ADD COLUMN IF NOT EXISTS "blockBelowCostSelling" BOOLEAN DEFAULT false`,
    ],
  },

  {
    id: '2026-04-14-001-stock-levels-unique-constraint',
    description: 'Add unique constraint on inv_stock_levels(itemId, warehouseId) for upsert support',
    sql: [
      // Remove duplicates first (keep the one with highest quantity)
      `DELETE FROM inv_stock_levels a USING inv_stock_levels b
       WHERE a.id < b.id AND a."itemId" = b."itemId" AND a."warehouseId" = b."warehouseId"`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_item_warehouse ON inv_stock_levels ("itemId", "warehouseId")`,
    ],
  },

  {
    id: '2026-04-13-001-customer-opening-balance',
    description: 'Add opening balance fields to customers table',
    sql: [
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS "openingBalance" DECIMAL(15,2) DEFAULT 0`,
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS "openingBalanceDate" DATE`,
    ],
  },

  {
    id: '2026-04-12-013-employee-deductions-table',
    description: 'Create employee_deductions table for ad-hoc deductions (penalties, adjustments, etc.)',
    sql: [
      `CREATE TABLE IF NOT EXISTS employee_deductions (
        id SERIAL PRIMARY KEY,
        "companyId" INT NOT NULL,
        "employeeId" INT NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        "deductionType" VARCHAR(20) DEFAULT 'one_time',
        frequency VARCHAR(20),
        "remainingCount" INT,
        "effectiveDate" DATE NOT NULL,
        "endDate" DATE,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        "isProcessed" BOOLEAN DEFAULT false,
        "processedInPayrollId" INT,
        "approvedBy" INT,
        notes TEXT,
        "createdBy" INT NOT NULL,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_emp_deductions_company ON employee_deductions ("companyId", "employeeId", status)`,
      `CREATE INDEX IF NOT EXISTS idx_emp_deductions_effective ON employee_deductions ("effectiveDate", status)`,
    ],
  },

  {
    id: '2026-04-12-010-default-payroll-components',
    description: 'Seed default payroll earning components (Basic, Transport, Housing, Other) with percentage rates for unstructured salary split',
    sql: [
      // Insert default earning components for each company that doesn't have any yet
      `INSERT INTO payroll_components (
        "companyId", name, code, description, type, category,
        "calculationMethod", "defaultRate", taxable,
        "affectsPensionCalculation", "affectsGratuityCalculation",
        "proRatable", "showOnPayslip", "displayOrder",
        frequency, "isActive", "isSystemComponent",
        "effectiveFrom", "createdBy", "createdAt", "updatedAt"
      )
      SELECT c.id, v.name, v.code, v.description, 'EARNINGS', v.category,
             'PERCENTAGE_OF_GROSS', v.rate, v.taxable,
             v.affects_pension, true,
             true, true, v.display_order,
             'monthly', true, true,
             CURRENT_DATE, 1, NOW(), NOW()
      FROM companies c
      CROSS JOIN (VALUES
        ('Basic Salary',        'BASIC',     'Basic salary component',          'basic',     40.00, true,  true,  1),
        ('Transport Allowance', 'TRANSPORT', 'Transport allowance component',   'allowance', 15.00, true,  true,  2),
        ('Housing Allowance',   'HOUSING',   'Housing allowance component',     'allowance', 15.00, true,  true,  3),
        ('Other Allowances',    'OTHER',     'Other allowances (remainder)',     'allowance', 30.00, true,  false, 4)
      ) AS v(name, code, description, category, rate, taxable, affects_pension, display_order)
      WHERE NOT EXISTS (
        SELECT 1 FROM payroll_components pc
        WHERE pc."companyId" = c.id AND pc.code = v.code AND pc."deletedAt" IS NULL
      )`,
    ],
  },

  {
    id: '2026-04-12-009-voluntary-pension-and-rent',
    description: 'Add voluntary pension contribution and annual rent paid fields to employees (tax reliefs)',
    sql: [
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS "voluntaryPensionContribution" DECIMAL(15,2) DEFAULT 0`,
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS "annualRentPaid" DECIMAL(15,2) DEFAULT 0`,
    ],
  },

  // ============================================================================
  // 2026-04-16: Customer Onboarding — investor documents, customer role
  // ============================================================================
  {
    id: '2026-04-16-001-fm-investor-documents',
    description: 'Create fm_investor_documents table for customer onboarding document management',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_investor_documents (
        id SERIAL PRIMARY KEY,
        "investorId" INTEGER NOT NULL REFERENCES fm_investors(id) ON DELETE CASCADE,
        "companyId" INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        "documentCode" VARCHAR(30) NOT NULL,
        "documentName" VARCHAR(255) NOT NULL,
        "documentType" VARCHAR(50) NOT NULL,
        "documentCategory" VARCHAR(50) DEFAULT 'KYC',
        description TEXT,
        "documentNumber" VARCHAR(100),
        "issueDate" DATE,
        "expiryDate" DATE,
        "issuingAuthority" VARCHAR(255),
        "fileName" VARCHAR(500) NOT NULL,
        "originalFileName" VARCHAR(500) NOT NULL,
        "filePath" VARCHAR(1000) NOT NULL,
        "fileExtension" VARCHAR(10) NOT NULL,
        "mimeType" VARCHAR(100) NOT NULL,
        "fileSize" BIGINT NOT NULL,
        status VARCHAR(30) DEFAULT 'uploaded',
        "isMandatory" BOOLEAN DEFAULT false,
        "isVerified" BOOLEAN DEFAULT false,
        "verifiedDate" DATE,
        "verifiedBy" INTEGER,
        "verificationNotes" TEXT,
        "hasExpiry" BOOLEAN DEFAULT false,
        version INTEGER DEFAULT 1,
        "isCurrentVersion" BOOLEAN DEFAULT true,
        "previousVersionId" INTEGER,
        "uploadedBy" INTEGER NOT NULL,
        "uploadedAt" TIMESTAMP DEFAULT NOW(),
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_docs_investor ON fm_investor_documents("investorId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_docs_company ON fm_investor_documents("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_docs_type ON fm_investor_documents("documentType")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_docs_status ON fm_investor_documents(status)`,
    ],
  },
  {
    id: '2026-04-16-002-fm-investor-customer-role',
    description: 'Add customerRole and kycRevalidationDate to fm_investors',
    sql: [
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "customerRole" VARCHAR(20)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "kycRevalidationDate" DATE`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investors_customer_role ON fm_investors("customerRole")`,
    ],
  },
  {
    id: '2026-04-16-004-fm-investor-portal-fields',
    description: 'Add portal access fields to fm_investors and investorId to users',
    sql: [
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN DEFAULT false`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "investorId" INTEGER UNIQUE`,
      `ALTER TYPE "UserType" ADD VALUE IF NOT EXISTS 'INVESTOR'`,
    ],
  },
  {
    id: '2026-04-16-005-fm-zakat-notification-models',
    description: 'Create Zakat config/calculation and notification template/log tables',
    sql: [
      // Zakat Config
      `CREATE TABLE IF NOT EXISTS fm_zakat_configs (
        id SERIAL PRIMARY KEY, "fundId" INTEGER NOT NULL UNIQUE, "companyId" INTEGER NOT NULL,
        "zakatMethod" VARCHAR(20) DEFAULT 'AAOIFI_HIJRI', "zakatRateOverride" DECIMAL(8,6),
        "autoDeductEnabled" BOOLEAN DEFAULT false, "charityName" VARCHAR(255), "charityAccountNo" VARCHAR(50),
        "isActive" BOOLEAN DEFAULT true, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Zakat Calculation
      `CREATE TABLE IF NOT EXISTS fm_zakat_calculations (
        id SERIAL PRIMARY KEY, "fundId" INTEGER NOT NULL, "investorAccountId" INTEGER,
        "companyId" INTEGER NOT NULL, "calculationDate" DATE NOT NULL,
        "zakatMethod" VARCHAR(20) NOT NULL, "zakatableAssets" DECIMAL(18,2) NOT NULL,
        "nonZakatableAssets" DECIMAL(18,2) NOT NULL, "totalAssets" DECIMAL(18,2) NOT NULL,
        "zakatRate" DECIMAL(8,6) NOT NULL, "zakatAmount" DECIMAL(18,2) NOT NULL,
        "investorUnits" DECIMAL(18,6), "totalUnits" DECIMAL(18,6), "hijriYear" VARCHAR(10),
        status VARCHAR(20) DEFAULT 'calculated', "paymentDate" DATE, "paymentReference" VARCHAR(100),
        "createdBy" INTEGER, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Notification Templates
      `CREATE TABLE IF NOT EXISTS fm_notification_templates (
        id SERIAL PRIMARY KEY, "companyId" INTEGER NOT NULL, "eventType" VARCHAR(50) NOT NULL,
        channel VARCHAR(20) NOT NULL, subject VARCHAR(255), "bodyTemplate" TEXT NOT NULL,
        "isActive" BOOLEAN DEFAULT true, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE ("companyId", "eventType", channel)
      )`,
      // Notification Logs
      `CREATE TABLE IF NOT EXISTS fm_notification_logs (
        id SERIAL PRIMARY KEY, "companyId" INTEGER NOT NULL, "templateId" INTEGER,
        "recipientId" INTEGER NOT NULL, "recipientType" VARCHAR(20) NOT NULL,
        "recipientContact" VARCHAR(255), channel VARCHAR(20) NOT NULL, "eventType" VARCHAR(50) NOT NULL,
        subject VARCHAR(255), body TEXT, status VARCHAR(20) DEFAULT 'sent',
        "sentAt" TIMESTAMP DEFAULT NOW(), "deliveredAt" TIMESTAMP, "readAt" TIMESTAMP,
        "errorMessage" TEXT, metadata JSONB, "createdAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Device Registration
      `CREATE TABLE IF NOT EXISTS fm_device_registrations (
        id SERIAL PRIMARY KEY, "investorId" INTEGER NOT NULL, "deviceToken" VARCHAR(500) NOT NULL,
        platform VARCHAR(20) NOT NULL, "deviceName" VARCHAR(100), "isActive" BOOLEAN DEFAULT true,
        "lastActiveAt" TIMESTAMP, "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_fm_zakat_calc_fund ON fm_zakat_calculations("fundId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_zakat_calc_company ON fm_zakat_calculations("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_notif_tmpl_company ON fm_notification_templates("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_notif_log_recipient ON fm_notification_logs("recipientId", "recipientType")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_device_investor ON fm_device_registrations("investorId")`,
    ],
  },
  {
    id: '2026-04-16-006-fm-fund-cooling-off-gating',
    description: 'Add cooling-off period and manual gating fields to fm_funds',
    sql: [
      `ALTER TABLE fm_funds ADD COLUMN IF NOT EXISTS "coolingOffPeriodHours" INTEGER`,
      `ALTER TABLE fm_funds ADD COLUMN IF NOT EXISTS "gatingActive" BOOLEAN DEFAULT false`,
      `ALTER TABLE fm_funds ADD COLUMN IF NOT EXISTS "gatingMessage" TEXT`,
    ],
  },
  {
    id: '2026-04-16-007-fm-risk-compliance-tables',
    description: 'Create credit scoring, IFRS 9 provisioning, and collateral tables',
    sql: [
      // Credit Scores
      `CREATE TABLE IF NOT EXISTS fm_credit_scores (
        id SERIAL PRIMARY KEY, "investorId" INTEGER NOT NULL, "companyId" INTEGER NOT NULL,
        "scoreDate" DATE NOT NULL, score INTEGER NOT NULL, "riskGrade" VARCHAR(5) NOT NULL,
        "repaymentHistoryScore" INTEGER DEFAULT 0, "facilityUtilizationScore" INTEGER DEFAULT 0,
        "tenureScore" INTEGER DEFAULT 0, "collateralScore" INTEGER DEFAULT 0,
        notes TEXT, "calculatedBy" INTEGER,
        "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // IFRS 9 Provisions
      `CREATE TABLE IF NOT EXISTS fm_provisions (
        id SERIAL PRIMARY KEY, "facilityId" INTEGER NOT NULL, "companyId" INTEGER NOT NULL,
        "provisionDate" DATE NOT NULL, stage INTEGER NOT NULL, "stageReason" VARCHAR(100),
        "daysPastDue" INTEGER DEFAULT 0, "probabilityOfDefault" DECIMAL(8,6) DEFAULT 0,
        "lossGivenDefault" DECIMAL(8,6) DEFAULT 0, "exposureAtDefault" DECIMAL(18,2) DEFAULT 0,
        "expectedCreditLoss" DECIMAL(18,2) DEFAULT 0,
        "provision12Month" DECIMAL(18,2) DEFAULT 0, "provisionLifetime" DECIMAL(18,2) DEFAULT 0,
        "journalEntryId" INTEGER, "createdBy" INTEGER,
        "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Collateral
      `CREATE TABLE IF NOT EXISTS fm_collaterals (
        id SERIAL PRIMARY KEY, "facilityId" INTEGER NOT NULL, "companyId" INTEGER NOT NULL,
        "collateralType" VARCHAR(30) NOT NULL, description TEXT, "estimatedValue" DECIMAL(18,2),
        "valuationDate" DATE, "valuationBy" VARCHAR(255), "insuranceExpiry" DATE,
        status VARCHAR(20) DEFAULT 'registered', "releasedDate" DATE, "releasedBy" INTEGER,
        "createdBy" INTEGER, "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Early settlement tracking on facilities
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "earlySettlementDate" DATE`,
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "earlySettlementRebate" DECIMAL(18,2)`,
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "restructuredFrom" INTEGER`,
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_fm_credit_scores_inv ON fm_credit_scores("investorId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_provisions_fac ON fm_provisions("facilityId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_collaterals_fac ON fm_collaterals("facilityId")`,
    ],
  },
  {
    id: '2026-04-16-003-fm-credit-facility-tables',
    description: 'Create credit facility tables for Sharia-compliant financing',
    sql: [
      // Credit Facility Types
      `CREATE TABLE IF NOT EXISTS fm_credit_facility_types (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(20) NOT NULL,
        description TEXT,
        "facilityStructure" VARCHAR(30) DEFAULT 'murabaha',
        "profitRate" DECIMAL(8,4) DEFAULT 0,
        "profitCalculation" VARCHAR(30) DEFAULT 'flat',
        "repaymentMethod" VARCHAR(30) DEFAULT 'emi',
        "repaymentFrequency" VARCHAR(20) DEFAULT 'monthly',
        "maxAmount" DECIMAL(18,2),
        "minAmount" DECIMAL(18,2),
        "maxTenureMonths" INTEGER DEFAULT 60,
        "minTenureMonths" INTEGER DEFAULT 1,
        "processingFee" DECIMAL(18,2) DEFAULT 0,
        "processingFeeType" VARCHAR(20) DEFAULT 'fixed',
        "managerProfitSharePct" DECIMAL(8,4) DEFAULT 30,
        "investorProfitSharePct" DECIMAL(8,4) DEFAULT 70,
        "requiresApproval" BOOLEAN DEFAULT true,
        "isShariaCompliant" BOOLEAN DEFAULT true,
        "isActive" BOOLEAN DEFAULT true,
        "createdBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE ("companyId", code)
      )`,
      // Credit Facilities
      `CREATE TABLE IF NOT EXISTS fm_credit_facilities (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        "facilityNumber" VARCHAR(30) NOT NULL UNIQUE,
        "facilityTypeId" INTEGER NOT NULL REFERENCES fm_credit_facility_types(id) ON DELETE RESTRICT,
        "investorId" INTEGER NOT NULL REFERENCES fm_investors(id) ON DELETE CASCADE,
        "fundId" INTEGER NOT NULL REFERENCES fm_funds(id) ON DELETE CASCADE,
        "applicationDate" DATE NOT NULL,
        "approvalDate" DATE,
        "disbursementDate" DATE,
        "maturityDate" DATE,
        purpose TEXT,
        "assetDescription" TEXT,
        "costPrice" DECIMAL(18,2) NOT NULL,
        "profitAmount" DECIMAL(18,2) NOT NULL,
        "totalFacilityAmount" DECIMAL(18,2) NOT NULL,
        "profitRate" DECIMAL(8,4) NOT NULL,
        "tenureMonths" INTEGER NOT NULL,
        "repaymentMethod" VARCHAR(30) DEFAULT 'emi',
        "repaymentFrequency" VARCHAR(20) DEFAULT 'monthly',
        "installmentAmount" DECIMAL(18,2) NOT NULL,
        "totalRepaid" DECIMAL(18,2) DEFAULT 0,
        "outstandingBalance" DECIMAL(18,2) NOT NULL,
        "managerProfitSharePct" DECIMAL(8,4) NOT NULL,
        "investorProfitSharePct" DECIMAL(8,4) NOT NULL,
        "managerProfitEarned" DECIMAL(18,2) DEFAULT 0,
        "investorProfitEarned" DECIMAL(18,2) DEFAULT 0,
        "processingFee" DECIMAL(18,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        "disbursementMethod" VARCHAR(20) DEFAULT 'bank',
        "disbursementReference" VARCHAR(100),
        "approvalNotes" TEXT,
        "rejectionReason" TEXT,
        "journalEntryId" INTEGER,
        "approvedBy" INTEGER,
        "approvedAt" TIMESTAMP,
        "rejectedBy" INTEGER,
        "rejectedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "cancelledAt" TIMESTAMP,
        "cancelledBy" INTEGER,
        "cancellationReason" TEXT,
        "createdBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Credit Schedule
      `CREATE TABLE IF NOT EXISTS fm_credit_schedules (
        id SERIAL PRIMARY KEY,
        "facilityId" INTEGER NOT NULL REFERENCES fm_credit_facilities(id) ON DELETE CASCADE,
        "installmentNumber" INTEGER NOT NULL,
        "dueDate" DATE NOT NULL,
        "principalPortion" DECIMAL(18,2) NOT NULL,
        "profitPortion" DECIMAL(18,2) NOT NULL,
        "totalAmount" DECIMAL(18,2) NOT NULL,
        "balanceAfter" DECIMAL(18,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'upcoming',
        "paidAmount" DECIMAL(18,2) DEFAULT 0,
        "paidDate" DATE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Credit Repayments
      `CREATE TABLE IF NOT EXISTS fm_credit_repayments (
        id SERIAL PRIMARY KEY,
        "facilityId" INTEGER NOT NULL REFERENCES fm_credit_facilities(id) ON DELETE CASCADE,
        "scheduleId" INTEGER,
        "repaymentDate" DATE NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        "principalPortion" DECIMAL(18,2) NOT NULL,
        "profitPortion" DECIMAL(18,2) NOT NULL,
        "balanceAfter" DECIMAL(18,2) NOT NULL,
        "paymentMethod" VARCHAR(20) DEFAULT 'bank',
        reference VARCHAR(100),
        "receiptNumber" VARCHAR(50),
        notes TEXT,
        "journalEntryId" INTEGER,
        "receivedBy" INTEGER,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Credit Profit Allocations
      `CREATE TABLE IF NOT EXISTS fm_credit_profit_allocations (
        id SERIAL PRIMARY KEY,
        "facilityId" INTEGER NOT NULL REFERENCES fm_credit_facilities(id) ON DELETE CASCADE,
        "companyId" INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        "periodStart" DATE NOT NULL,
        "periodEnd" DATE NOT NULL,
        "totalProfitCollected" DECIMAL(18,2) NOT NULL,
        "managerShare" DECIMAL(18,2) NOT NULL,
        "investorShare" DECIMAL(18,2) NOT NULL,
        "managerSharePct" DECIMAL(8,4) NOT NULL,
        "investorSharePct" DECIMAL(8,4) NOT NULL,
        "distributionId" INTEGER,
        "journalEntryId" INTEGER,
        status VARCHAR(20) DEFAULT 'calculated',
        "createdBy" INTEGER,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_fm_cft_company ON fm_credit_facility_types("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cf_company ON fm_credit_facilities("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cf_investor ON fm_credit_facilities("investorId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cf_fund ON fm_credit_facilities("fundId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cf_status ON fm_credit_facilities(status)`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cs_facility ON fm_credit_schedules("facilityId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cs_due ON fm_credit_schedules("dueDate")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cr_facility ON fm_credit_repayments("facilityId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_cpa_facility ON fm_credit_profit_allocations("facilityId")`,
    ],
  },
  {
    id: '2026-04-17-001-fm-investor-corporate-fields',
    description: 'Add corporate/institutional KYC fields to fm_investors (RC/BN, business type, incorporation date, industry, contact person, turnover)',
    sql: [
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "rcNumber" VARCHAR(50)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "businessType" VARCHAR(50)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "dateOfIncorporation" DATE`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "businessNature" VARCHAR(255)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "contactPersonName" VARCHAR(255)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "contactPersonPosition" VARCHAR(100)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "contactPersonEmail" VARCHAR(255)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "contactPersonPhone" VARCHAR(50)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "annualTurnover" DECIMAL(18,2)`,
    ],
  },
  {
    id: '2026-04-19-001-fm-aml-settings-and-auto-reinvest',
    description: 'Add fm_aml_settings (HIGH-risk subscription gate per tenant) + fm_funds.autoReinvest (BKMI auto-reinvest flag)',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_aml_settings (
        "companyId" INTEGER PRIMARY KEY,
        "highRiskBlockEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "highRiskThreshold" DECIMAL(18,2) NOT NULL DEFAULT 1000000,
        "requiresSeniorApproval" BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT,
        "updatedBy" INTEGER,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `ALTER TABLE fm_funds ADD COLUMN IF NOT EXISTS "autoReinvest" BOOLEAN NOT NULL DEFAULT FALSE`,
      // Backfill: BKMI is the auto-reinvest-until-18 product
      `UPDATE fm_funds SET "autoReinvest" = TRUE WHERE "fundCode" = 'BKMI'`,
    ],
  },
  {
    id: '2026-04-17-010-fm-subscriptions-redemptions-soft-delete',
    description: 'Add deletedAt column to fm_subscriptions and fm_redemptions — both services already query for soft delete but column was missing',
    sql: [
      `ALTER TABLE fm_subscriptions ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
      `ALTER TABLE fm_redemptions ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    ],
  },
  {
    id: '2026-04-17-009-fm-transaction-gl-config',
    description: 'Create fm_transaction_gl_config — tenant-defined GL account mapping per investment transaction type (with optional per-fund override)',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_transaction_gl_config (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "fundId" INTEGER,
        "transactionType" VARCHAR(20) NOT NULL,
        "debitAccountId" INTEGER,
        "creditAccountId" INTEGER,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT,
        "createdBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_fm_transaction_gl_config ON fm_transaction_gl_config("companyId", COALESCE("fundId", 0), "transactionType") WHERE "deletedAt" IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_fm_transaction_gl_config_company ON fm_transaction_gl_config("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_transaction_gl_config_fund ON fm_transaction_gl_config("fundId")`,
    ],
  },
  {
    id: '2026-04-17-008-fm-fee-gl-config',
    description: 'Create fm_fee_gl_config — tenant-defined GL account mapping per fee type (with optional per-fund override)',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_fee_gl_config (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "fundId" INTEGER,
        "feeType" VARCHAR(20) NOT NULL,
        "expenseAccountId" INTEGER NOT NULL,
        "liabilityAccountId" INTEGER NOT NULL,
        "cashAccountId" INTEGER NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT,
        "createdBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // Unique key on (companyId, fundId-or-0, feeType) so only one default + one override per fund per fee type
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_fm_fee_gl_config ON fm_fee_gl_config("companyId", COALESCE("fundId", 0), "feeType") WHERE "deletedAt" IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_fm_fee_gl_config_company ON fm_fee_gl_config("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_fee_gl_config_fund ON fm_fee_gl_config("fundId")`,
    ],
  },
  {
    id: '2026-04-17-007-fm-investor-guardian-and-fund-projected-rate',
    description: 'Add guardian fields to fm_investors (for minors / BKMI) + projectedRate / benchmarkFormula / profitSharingRatio to fm_funds',
    sql: [
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "guardianName" VARCHAR(255)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "guardianRelationship" VARCHAR(50)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "guardianPhone" VARCHAR(50)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "guardianEmail" VARCHAR(255)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "guardianIdType" VARCHAR(50)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "guardianIdNumber" VARCHAR(50)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "guardianBvn" VARCHAR(20)`,
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "guardianAddress" TEXT`,
      `ALTER TABLE fm_funds ADD COLUMN IF NOT EXISTS "projectedRate" DECIMAL(8,4)`,
      `ALTER TABLE fm_funds ADD COLUMN IF NOT EXISTS "benchmarkFormula" VARCHAR(500)`,
      `ALTER TABLE fm_funds ADD COLUMN IF NOT EXISTS "profitSharingRatio" VARCHAR(20)`,
    ],
  },
  {
    id: '2026-04-17-006-fm-investor-country-nationality-widen',
    description: 'Widen fm_investors.country and .nationality to VARCHAR(100) so forms can store full country names, not just ISO alpha-3 codes',
    sql: [
      `ALTER TABLE fm_investors ALTER COLUMN "country" TYPE VARCHAR(100)`,
      `ALTER TABLE fm_investors ALTER COLUMN "nationality" TYPE VARCHAR(100)`,
    ],
  },
  {
    id: '2026-04-17-005-fm-investor-document-types',
    description: 'Create fm_investor_document_types table — tenant-configurable document type list with required flag and investor-type applicability',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_investor_document_types (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        "isRequired" BOOLEAN NOT NULL DEFAULT TRUE,
        "applicableTypes" JSONB NOT NULL DEFAULT '["ALL"]'::jsonb,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "isSystem" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_fm_investor_document_types_company_code ON fm_investor_document_types("companyId", code) WHERE "deletedAt" IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_document_types_company ON fm_investor_document_types("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_document_types_active ON fm_investor_document_types("isActive")`,
    ],
  },
  {
    id: '2026-04-17-004-fm-investor-passport-photo',
    description: 'Add passportPhotoUrl column to fm_investors for direct photo upload on the create form',
    sql: [
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS "passportPhotoUrl" TEXT`,
    ],
  },
  {
    id: '2026-04-17-003-fm-compliance-rules-soft-delete',
    description: 'Add deletedAt column to fm_compliance_rules — schema was missing the column the service already queries for soft delete',
    sql: [
      `ALTER TABLE fm_compliance_rules ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    ],
  },
  {
    id: '2026-04-17-002-fm-investor-directors-and-ubos',
    description: 'Create fm_investor_directors and fm_investor_ubos tables for corporate KYC (directors list + beneficial owners)',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_investor_directors (
        id SERIAL PRIMARY KEY,
        "investorId" INTEGER NOT NULL REFERENCES fm_investors(id) ON DELETE CASCADE,
        "companyId" INTEGER NOT NULL,
        "fullName" VARCHAR(255) NOT NULL,
        position VARCHAR(100) NOT NULL,
        "idType" VARCHAR(50),
        "idNumber" VARCHAR(50),
        bvn VARCHAR(20),
        nationality VARCHAR(3),
        email VARCHAR(255),
        phone VARCHAR(50),
        "dateAppointed" DATE,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_directors_investor ON fm_investor_directors("investorId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_directors_company ON fm_investor_directors("companyId")`,
      `CREATE TABLE IF NOT EXISTS fm_investor_ubos (
        id SERIAL PRIMARY KEY,
        "investorId" INTEGER NOT NULL REFERENCES fm_investors(id) ON DELETE CASCADE,
        "companyId" INTEGER NOT NULL,
        "fullName" VARCHAR(255) NOT NULL,
        "ownershipPercent" DECIMAL(5,2) NOT NULL,
        "controlType" VARCHAR(30) NOT NULL,
        "idType" VARCHAR(50),
        "idNumber" VARCHAR(50),
        bvn VARCHAR(20),
        nationality VARCHAR(3),
        address TEXT,
        "isPEP" BOOLEAN NOT NULL DEFAULT FALSE,
        "pepDetails" TEXT,
        "createdBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_ubos_investor ON fm_investor_ubos("investorId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investor_ubos_company ON fm_investor_ubos("companyId")`,
    ],
  },
  {
    id: '2026-04-19-002-fm-investors-notes',
    description: 'Add notes column to fm_investors for Super Admin override audit trail',
    sql: [
      `ALTER TABLE fm_investors ADD COLUMN IF NOT EXISTS notes TEXT`,
    ],
  },
  {
    id: '2026-04-19-003-companies-tax-id',
    description: 'Add taxId column to companies (preserve Laravel migration data)',
    sql: [
      `ALTER TABLE companies ADD COLUMN IF NOT EXISTS "taxId" TEXT`,
    ],
  },
  {
    id: '2026-04-19-004-vat-cash-basis',
    description: 'Add cash-basis VAT support: sales_settings.vatBasis + vatOutputHoldingAccountId, sales_invoices.vatBasis',
    sql: [
      `ALTER TABLE sales_settings ADD COLUMN IF NOT EXISTS "vatBasis" TEXT NOT NULL DEFAULT 'accrual'`,
      `ALTER TABLE sales_settings ADD COLUMN IF NOT EXISTS "vatOutputHoldingAccountId" INTEGER`,
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "vatBasis" TEXT NOT NULL DEFAULT 'accrual'`,
    ],
  },
  {
    id: '2026-04-20-001-sales-invoices-approval-comment',
    description: 'Add approvalComment column to sales_invoices (referenced by postTransaction on approve)',
    sql: [
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "approvalComment" TEXT`,
    ],
  },
  {
    id: '2026-04-20-002-purchase-orders-created-by',
    description: 'Add createdBy column to purchase_orders for segregation-of-duties auto-approve gate',
    sql: [
      `ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS "createdBy" INTEGER`,
    ],
  },
  {
    id: '2026-04-21-006-livestock-markets-and-preorders',
    description: 'Hatchery source on flocks + market price tracker + livestock pre-orders',
    sql: [
      `ALTER TABLE lsk_flocks ADD COLUMN IF NOT EXISTS "hatcherySourceId" INTEGER`,
      `ALTER TABLE lsk_flocks ADD COLUMN IF NOT EXISTS "hatcheryBatchRef" VARCHAR(80)`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_flocks_company_hatchery ON lsk_flocks ("companyId","hatcherySourceId")`,
      `DO $$ BEGIN
        CREATE TYPE "LskMarketProductType" AS ENUM (
          'EGG_CRATE','LIVE_BROILER_KG','LIVE_LAYER_KG','POINT_OF_LAY_PULLET','DAY_OLD_CHICK','SPENT_HEN','OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN
        CREATE TYPE "LskPreorderStatus" AS ENUM ('BOOKED','FULFILLED','CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `CREATE TABLE IF NOT EXISTS lsk_market_prices (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "productType" "LskMarketProductType" NOT NULL,
        "productLabel" VARCHAR(120),
        price NUMERIC(15,2) NOT NULL,
        "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'NGN',
        "recordedDate" DATE NOT NULL,
        source VARCHAR(120),
        notes TEXT,
        "createdById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_market_prices_company_type_date ON lsk_market_prices ("companyId","productType","recordedDate")`,
      `CREATE TABLE IF NOT EXISTS lsk_preorders (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "customerId" INTEGER NOT NULL,
        "productType" "LskMarketProductType" NOT NULL,
        "productLabel" VARCHAR(120),
        quantity NUMERIC(15,2) NOT NULL,
        unit VARCHAR(30) NOT NULL DEFAULT 'crates',
        "unitPrice" NUMERIC(15,2),
        "totalAmount" NUMERIC(15,2),
        "expectedDeliveryDate" DATE NOT NULL,
        status "LskPreorderStatus" NOT NULL DEFAULT 'BOOKED',
        "fulfilledAt" TIMESTAMP,
        "depositAmount" NUMERIC(15,2),
        "salesOrderId" INTEGER,
        notes TEXT,
        "createdById" INTEGER,
        "updatedById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_preorders_company_status_date ON lsk_preorders ("companyId", status, "expectedDeliveryDate")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_preorders_company_customer ON lsk_preorders ("companyId", "customerId")`,
    ],
  },
  {
    id: '2026-04-21-005-vaccine-stock',
    description: 'Vaccine batch inventory with expiry dates for livestock vaccine stock tracking',
    sql: [
      `CREATE TABLE IF NOT EXISTS lsk_vaccine_stock (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "vaccineScheduleId" INTEGER,
        "vaccineName" VARCHAR(150) NOT NULL,
        "batchNumber" VARCHAR(80) NOT NULL,
        "expiryDate" DATE NOT NULL,
        "manufacturerName" VARCHAR(150),
        "supplierName" VARCHAR(150),
        "receivedDate" DATE,
        "storageLocation" VARCHAR(120),
        "initialDoses" INTEGER NOT NULL DEFAULT 0,
        "remainingDoses" INTEGER NOT NULL DEFAULT 0,
        "unitCost" NUMERIC(12,2),
        notes TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdById" INTEGER,
        "updatedById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_vaccine_stock_company_name ON lsk_vaccine_stock ("companyId","vaccineName")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_vaccine_stock_company_expiry ON lsk_vaccine_stock ("companyId","expiryDate")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_vaccine_stock_company_active ON lsk_vaccine_stock ("companyId","isActive")`,
    ],
  },
  {
    id: '2026-04-21-004-leakage-controls',
    description: 'Egg stock reconciliation + empty-bag ledger for anti-leakage audits',
    sql: [
      `CREATE TABLE IF NOT EXISTS lsk_egg_stock_reconciliations (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "reconciliationDate" DATE NOT NULL,
        "flockId" INTEGER,
        "openingStock" INTEGER NOT NULL DEFAULT 0,
        "collectedToday" INTEGER NOT NULL DEFAULT 0,
        "damagedToday" INTEGER NOT NULL DEFAULT 0,
        "soldToday" INTEGER NOT NULL DEFAULT 0,
        "adjustmentsToday" INTEGER NOT NULL DEFAULT 0,
        "expectedClosingStock" INTEGER NOT NULL DEFAULT 0,
        "actualClosingStock" INTEGER NOT NULL DEFAULT 0,
        variance INTEGER NOT NULL DEFAULT 0,
        "variancePercent" NUMERIC(6,2),
        "varianceNotes" TEXT,
        "createdById" INTEGER,
        "updatedById" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_egg_recon_company_date ON lsk_egg_stock_reconciliations ("companyId","reconciliationDate")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_egg_recon_company_flock_date ON lsk_egg_stock_reconciliations ("companyId","flockId","reconciliationDate")`,
      `CREATE TABLE IF NOT EXISTS lsk_empty_bag_logs (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "logDate" DATE NOT NULL,
        "feedTypeId" INTEGER,
        "expectedEmptyBags" INTEGER NOT NULL DEFAULT 0,
        "actualEmptyBags" INTEGER NOT NULL DEFAULT 0,
        variance INTEGER NOT NULL DEFAULT 0,
        "bagsSoldForReturn" INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        "createdById" INTEGER,
        "updatedById" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_empty_bag_company_date ON lsk_empty_bag_logs ("companyId","logDate")`,
    ],
  },
  {
    id: '2026-04-21-003-livestock-notifications',
    description: 'Notification recipients + delivery log so alerts can go out via SMS / WhatsApp / email',
    sql: [
      // Idempotent ensure of LskAlertSeverity — this migration can run before
      // 2026-04-21-001-livestock-alert-engine depending on array position, so
      // we create the type here too if missing. Matches the definition in the
      // alert-engine migration.
      `DO $$ BEGIN
        CREATE TYPE "LskAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN
        CREATE TYPE "LskNotificationChannel" AS ENUM ('SMS','WHATSAPP','EMAIL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN
        CREATE TYPE "LskNotificationStatus" AS ENUM ('QUEUED','SENT','FAILED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `CREATE TABLE IF NOT EXISTS lsk_notification_recipients (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        name VARCHAR(120) NOT NULL,
        channel "LskNotificationChannel" NOT NULL,
        destination VARCHAR(200) NOT NULL,
        "minSeverity" "LskAlertSeverity" NOT NULL DEFAULT 'WARNING',
        "ruleTypes" JSONB,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdById" INTEGER,
        "updatedById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_notif_recipients_company_active ON lsk_notification_recipients ("companyId","isActive")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_notif_recipients_company_channel ON lsk_notification_recipients ("companyId",channel)`,
      `CREATE TABLE IF NOT EXISTS lsk_notification_log (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "alertId" INTEGER NOT NULL,
        "recipientId" INTEGER NOT NULL,
        channel "LskNotificationChannel" NOT NULL,
        destination VARCHAR(200) NOT NULL,
        status "LskNotificationStatus" NOT NULL,
        "providerMessageId" VARCHAR(200),
        "errorMessage" TEXT,
        "sentAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_notif_log_company_alert ON lsk_notification_log ("companyId","alertId")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_notif_log_company_status ON lsk_notification_log ("companyId",status,"createdAt")`,
    ],
  },
  {
    id: '2026-04-21-002-vaccine-schedule-purpose',
    description: 'Add flockPurpose column to lsk_vaccine_schedules so broiler-only and layer-only templates can be seeded side-by-side',
    sql: [
      `ALTER TABLE lsk_vaccine_schedules ADD COLUMN IF NOT EXISTS "flockPurpose" "LskFlockPurpose"`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_vaccine_schedules_company_purpose ON lsk_vaccine_schedules ("companyId", "flockPurpose")`,
    ],
  },
  {
    id: '2026-04-21-001-livestock-alert-engine',
    description: 'Create livestock alert rule + alert tables for mortality / production rule engine',
    sql: [
      `DO $$ BEGIN
        CREATE TYPE "LskAlertRuleType" AS ENUM (
          'MORTALITY_DAILY_PCT',
          'MORTALITY_CUMULATIVE_PCT',
          'HDP_DROP_3D',
          'FCR_HIGH',
          'FEED_TO_EGG_HIGH',
          'VACCINATION_OVERDUE'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN
        CREATE TYPE "LskAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN
        CREATE TYPE "LskAlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `CREATE TABLE IF NOT EXISTS lsk_alert_rules (
        id           SERIAL PRIMARY KEY,
        "companyId"  INTEGER NOT NULL,
        "ruleType"   "LskAlertRuleType" NOT NULL,
        name         VARCHAR(120) NOT NULL,
        description  TEXT,
        threshold    DECIMAL(10,4) NOT NULL,
        severity     "LskAlertSeverity" NOT NULL DEFAULT 'WARNING',
        "isActive"   BOOLEAN NOT NULL DEFAULT true,
        "isSystem"   BOOLEAN NOT NULL DEFAULT false,
        "createdById" INTEGER,
        "updatedById" INTEGER,
        "deletedAt"  TIMESTAMP,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_alert_rules_company_active ON lsk_alert_rules ("companyId", "isActive")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_alert_rules_company_type   ON lsk_alert_rules ("companyId", "ruleType")`,
      `CREATE TABLE IF NOT EXISTS lsk_alerts (
        id                SERIAL PRIMARY KEY,
        "companyId"       INTEGER NOT NULL,
        "ruleId"          INTEGER NOT NULL,
        "ruleType"        "LskAlertRuleType" NOT NULL,
        "entityType"      VARCHAR(20) NOT NULL,
        "entityId"        INTEGER NOT NULL,
        severity          "LskAlertSeverity" NOT NULL,
        status            "LskAlertStatus" NOT NULL DEFAULT 'ACTIVE',
        metric            VARCHAR(40) NOT NULL,
        "observedValue"   DECIMAL(12,4) NOT NULL,
        "thresholdValue"  DECIMAL(12,4) NOT NULL,
        message           TEXT NOT NULL,
        "contextJson"     JSONB,
        "triggeredAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
        "acknowledgedAt"  TIMESTAMP,
        "acknowledgedById" INTEGER,
        "resolvedAt"      TIMESTAMP,
        "resolvedById"    INTEGER,
        "resolutionNotes" TEXT,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_alerts_company_status_time ON lsk_alerts ("companyId", status, "triggeredAt")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_alerts_company_entity      ON lsk_alerts ("companyId", "entityType", "entityId")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_alerts_company_rule        ON lsk_alerts ("companyId", "ruleId")`,
    ],
  },
  {
    id: '2026-04-21-001-flock-feeding-staff-signoff',
    description: 'Add fedBy / witness sign-off columns to lsk_flock_feeding_events for farm-floor accountability',
    sql: [
      `ALTER TABLE lsk_flock_feeding_events ADD COLUMN IF NOT EXISTS "fedById" INTEGER`,
      `ALTER TABLE lsk_flock_feeding_events ADD COLUMN IF NOT EXISTS "fedByName" VARCHAR(120)`,
      `ALTER TABLE lsk_flock_feeding_events ADD COLUMN IF NOT EXISTS "witnessedById" INTEGER`,
      `ALTER TABLE lsk_flock_feeding_events ADD COLUMN IF NOT EXISTS "witnessedAt" TIMESTAMP`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_flock_feeding_events_company_fedby ON lsk_flock_feeding_events ("companyId", "fedById")`,
    ],
  },
  {
    id: '2026-04-21-002-alert-rule-type-underweight-arrival',
    description: 'Add UNDERWEIGHT_ARRIVAL variant to LskAlertRuleType enum for intake-quality flagging',
    sql: [
      // ALTER TYPE ... ADD VALUE is non-idempotent in older Postgres, but
      // IF NOT EXISTS was added in 12. The salvage stack runs 14+, so this is safe.
      `ALTER TYPE "LskAlertRuleType" ADD VALUE IF NOT EXISTS 'UNDERWEIGHT_ARRIVAL'`,
    ],
  },
  {
    id: '2026-04-21-003-livestock-sale-links',
    description: 'Create lsk_sale_links pivot tying sales documents back to flocks / egg collections for livestock revenue reporting',
    sql: [
      `CREATE TABLE IF NOT EXISTS lsk_sale_links (
        id                  SERIAL PRIMARY KEY,
        "companyId"         INTEGER NOT NULL,
        "salesOrderId"      INTEGER,
        "salesOrderLineId"  INTEGER,
        "salesInvoiceId"    INTEGER,
        "salesInvoiceLineId" INTEGER,
        "preorderId"        INTEGER,
        "flockId"           INTEGER,
        "eggCollectionId"   INTEGER,
        "linkType"          VARCHAR(40) NOT NULL,
        quantity            DECIMAL(15,4) NOT NULL,
        unit                VARCHAR(30) NOT NULL DEFAULT 'birds',
        "avgLiveWeightKg"   DECIMAL(10,3),
        "eggGrade"          VARCHAR(10),
        notes               TEXT,
        "createdById"       INTEGER,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_sale_links_company_flock ON lsk_sale_links ("companyId", "flockId")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_sale_links_company_preorder ON lsk_sale_links ("companyId", "preorderId")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_sale_links_company_so ON lsk_sale_links ("companyId", "salesOrderId")`,
      `CREATE INDEX IF NOT EXISTS idx_lsk_sale_links_company_inv ON lsk_sale_links ("companyId", "salesInvoiceId")`,
    ],
  },
  {
    id: '2026-04-21-004-alert-rule-types-hdp1d-weight-deviation',
    description: 'Add HDP_DROP_1D and WEIGHT_DEVIATION variants to LskAlertRuleType enum',
    sql: [
      `ALTER TYPE "LskAlertRuleType" ADD VALUE IF NOT EXISTS 'HDP_DROP_1D'`,
      `ALTER TYPE "LskAlertRuleType" ADD VALUE IF NOT EXISTS 'WEIGHT_DEVIATION'`,
    ],
  },
  {
    id: '2026-04-21-005-process-approval-action-widen',
    description: 'Widen process_approvals.approvalAction from VARCHAR(12) to VARCHAR(64) — the super-admin override string ("Approved by Super Admin (override)") overflows the old limit and blocks approvals entirely',
    sql: [
      `ALTER TABLE process_approvals ALTER COLUMN "approvalAction" TYPE VARCHAR(64)`,
    ],
  },
  {
    id: '2026-04-21-006-sales-delivery-integrity',
    description: 'Sales delivery integrity: auto-invoice failure surface columns on sales_deliveries + one-invoice-per-delivery partial unique index on sales_invoices (tenants were seeing empty deliveries, silently-failed auto-invoices, and duplicate invoices per delivery)',
    sql: [
      `ALTER TABLE sales_deliveries ADD COLUMN IF NOT EXISTS "autoInvoiceError" TEXT`,
      `ALTER TABLE sales_deliveries ADD COLUMN IF NOT EXISTS "autoInvoiceAttemptedAt" TIMESTAMP`,
      // Partial unique index: NULL salesDeliveryId (invoice created directly,
      // not from a delivery) is still allowed any number of times. The rule
      // we enforce is "a given delivery cannot be invoiced twice".
      `CREATE UNIQUE INDEX IF NOT EXISTS sales_invoices_company_delivery_key
         ON sales_invoices ("companyId", "salesDeliveryId")
         WHERE "salesDeliveryId" IS NOT NULL AND "deletedAt" IS NULL`,
    ],
  },
  {
    id: '2026-04-21-007-purchase-require-requisition-approval-default-on',
    description: 'Purchase: flip requireRequisitionApproval from false to true on existing tenants. The old default was insecure — requisitions auto-approved on submit without any workflow. Tenants repeatedly reported "auto-approve still happens" because the default was silently bypassing the approval flow. Flipping to true here; any tenant that deliberately wants auto-approve can disable it from the settings UI.',
    sql: [
      `UPDATE purchase_settings
          SET "requireRequisitionApproval" = true,
              "updatedAt" = NOW()
        WHERE "requireRequisitionApproval" = false`,
    ],
  },
  {
    id: '2026-04-22-001-idempotency-keys',
    description: 'Offline-first: per-tenant idempotency cache. When a client-generated X-Client-Request-Id reaches the server a second time (flaky network, offline queue replay), the cached response is returned and the handler is bypassed. Prevents duplicate mortality logs, feed issues, etc. See docs/OFFLINE-FIRST-PLAN.md.',
    sql: [
      `CREATE TABLE IF NOT EXISTS _idempotency_keys (
        key           VARCHAR(100) PRIMARY KEY,
        "userId"      INTEGER,
        method        VARCHAR(10) NOT NULL,
        url           VARCHAR(500) NOT NULL,
        "statusCode"  INTEGER NOT NULL,
        "responseBody" JSONB,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_idempotency_keys_createdAt ON _idempotency_keys ("createdAt")`,
    ],
  },
  {
    id: '2026-04-22-002-alert-rule-type-brooding-cold-snap',
    description: 'Add BROODING_COLD_SNAP variant to LskAlertRuleType for Sprint 2A weather-triggered brooding alerts.',
    sql: [
      `ALTER TYPE "LskAlertRuleType" ADD VALUE IF NOT EXISTS 'BROODING_COLD_SNAP'`,
    ],
  },
  {
    id: '2026-04-22-004-buyer-marketplace',
    description: 'Create lsk_market_listings + lsk_market_quote_requests for Sprint 3B buyer marketplace.',
    sql: [
      `CREATE TABLE IF NOT EXISTS lsk_market_listings (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         "flockId" INTEGER,
         title VARCHAR(200) NOT NULL,
         category VARCHAR(30) NOT NULL,
         "unitOfSale" VARCHAR(30) NOT NULL,
         "quantityAvailable" INTEGER NOT NULL,
         "pricePerUnit" NUMERIC(15,2) NOT NULL,
         "minOrderQty" INTEGER NOT NULL DEFAULT 1,
         "readyByDate" DATE,
         "locationState" VARCHAR(100),
         "locationCity" VARCHAR(100),
         description TEXT,
         "coverPhotoPath" VARCHAR(512),
         "isPublished" BOOLEAN NOT NULL DEFAULT false,
         "publishedAt" TIMESTAMP,
         "unpublishedAt" TIMESTAMP,
         views INTEGER NOT NULL DEFAULT 0,
         "contactName" VARCHAR(150),
         "contactPhone" VARCHAR(50),
         "createdById" INTEGER,
         "deletedAt" TIMESTAMP,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS "lsk_market_listings_company_published_idx"
         ON lsk_market_listings ("companyId", "isPublished")`,
      `CREATE INDEX IF NOT EXISTS "lsk_market_listings_category_published_idx"
         ON lsk_market_listings (category, "isPublished")`,
      `CREATE TABLE IF NOT EXISTS lsk_market_quote_requests (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         "listingId" INTEGER NOT NULL REFERENCES lsk_market_listings(id) ON DELETE CASCADE,
         "buyerName" VARCHAR(150) NOT NULL,
         "buyerPhone" VARCHAR(50) NOT NULL,
         "buyerEmail" VARCHAR(150),
         "requestedQty" INTEGER NOT NULL,
         "deliveryLocation" VARCHAR(200),
         message TEXT,
         status VARCHAR(20) NOT NULL DEFAULT 'new',
         "respondedAt" TIMESTAMP,
         "respondedById" INTEGER,
         "convertedPreorderId" INTEGER,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS "lsk_market_quote_requests_company_status_idx"
         ON lsk_market_quote_requests ("companyId", status, "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "lsk_market_quote_requests_listing_idx"
         ON lsk_market_quote_requests ("listingId")`,
    ],
  },
  {
    id: '2026-04-22-003-flock-voice-notes',
    description: 'Create lsk_flock_voice_notes table for Sprint 3A voice note captures from farm managers.',
    sql: [
      `CREATE TABLE IF NOT EXISTS lsk_flock_voice_notes (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         "flockId" INTEGER NOT NULL,
         "uploadedById" INTEGER,
         "fileName" VARCHAR(255) NOT NULL,
         "filePath" VARCHAR(512) NOT NULL,
         "mimeType" VARCHAR(100) NOT NULL,
         "durationSec" INTEGER,
         "sizeBytes" INTEGER NOT NULL,
         category VARCHAR(30),
         transcript TEXT,
         "deletedAt" TIMESTAMP,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS "lsk_flock_voice_notes_company_flock_created_idx"
         ON lsk_flock_voice_notes ("companyId", "flockId", "createdAt")`,
    ],
  },
  {
    id: '2026-04-22-006-purchase-requisitions-approved-fields',
    description: 'Add approvedBy + approvedAt to purchase_requisitions — required by generic approval sync in ProcessApprovalService.',
    sql: [
      `ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS "approvedBy" INTEGER`,
      `ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP`,
    ],
  },
  {
    id: '2026-04-22-005-market-listing-photos',
    description: 'Create lsk_market_listing_photos table for Sprint 4 marketplace gallery.',
    sql: [
      `CREATE TABLE IF NOT EXISTS lsk_market_listing_photos (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         "listingId" INTEGER NOT NULL REFERENCES lsk_market_listings(id) ON DELETE CASCADE,
         "filePath" VARCHAR(512) NOT NULL,
         "mimeType" VARCHAR(100) NOT NULL,
         "sizeBytes" INTEGER NOT NULL,
         "sortOrder" INTEGER NOT NULL DEFAULT 0,
         "uploadedById" INTEGER,
         "deletedAt" TIMESTAMP,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS "lsk_market_listing_photos_company_listing_sort_idx"
         ON lsk_market_listing_photos ("companyId", "listingId", "sortOrder")`,
    ],
  },
  {
    id: '2026-04-23-001-expense-request-batch-columns',
    description: 'Add batchRef + isHistoricalLoad columns to expense_requests for batch imports and historical loads',
    sql: [
      `ALTER TABLE expense_requests ADD COLUMN IF NOT EXISTS "batchRef" TEXT`,
      `ALTER TABLE expense_requests ADD COLUMN IF NOT EXISTS "isHistoricalLoad" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS "expense_requests_batchRef_idx" ON expense_requests ("batchRef")`,
      `CREATE INDEX IF NOT EXISTS "expense_requests_isHistoricalLoad_idx" ON expense_requests ("isHistoricalLoad") WHERE "isHistoricalLoad" = true`,
    ],
  },
  {
    id: '2026-04-23-002-pay-payment-batch-columns',
    description: 'Add batchRef + isHistoricalLoad columns to pay_payments for batch imports and historical loads',
    sql: [
      `ALTER TABLE pay_payments ADD COLUMN IF NOT EXISTS "batchRef" TEXT`,
      `ALTER TABLE pay_payments ADD COLUMN IF NOT EXISTS "isHistoricalLoad" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS "pay_payments_batchRef_idx" ON pay_payments ("batchRef")`,
      `CREATE INDEX IF NOT EXISTS "pay_payments_isHistoricalLoad_idx" ON pay_payments ("isHistoricalLoad") WHERE "isHistoricalLoad" = true`,
    ],
  },
  {
    id: '2026-04-24-001-customer-receipts-batch-columns',
    description: 'Add batchRef + isHistoricalLoad columns to customer_receipts for sales batch imports',
    sql: [
      `ALTER TABLE customer_receipts ADD COLUMN IF NOT EXISTS "batchRef" TEXT`,
      `ALTER TABLE customer_receipts ADD COLUMN IF NOT EXISTS "isHistoricalLoad" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS "customer_receipts_batchRef_idx" ON customer_receipts ("batchRef")`,
      `CREATE INDEX IF NOT EXISTS "customer_receipts_isHistoricalLoad_idx" ON customer_receipts ("isHistoricalLoad") WHERE "isHistoricalLoad" = true`,
    ],
  },
  {
    id: '2026-04-24-002-sales-invoices-batch-columns',
    description: 'Add batchRef + isHistoricalLoad columns to sales_invoices for historical bundle imports',
    sql: [
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "batchRef" TEXT`,
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "isHistoricalLoad" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS "sales_invoices_batchRef_idx" ON sales_invoices ("batchRef")`,
      `CREATE INDEX IF NOT EXISTS "sales_invoices_isHistoricalLoad_idx" ON sales_invoices ("isHistoricalLoad") WHERE "isHistoricalLoad" = true`,
    ],
  },
  {
    id: '2026-04-24-003-purchase-invoices-batch-columns',
    description: 'Add batchRef + isHistoricalLoad columns to purchase_invoices for historical bundle imports (back-fills an earlier gap)',
    sql: [
      `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "batchRef" TEXT`,
      `ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS "isHistoricalLoad" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS "purchase_invoices_batchRef_idx" ON purchase_invoices ("batchRef")`,
      `CREATE INDEX IF NOT EXISTS "purchase_invoices_isHistoricalLoad_idx" ON purchase_invoices ("isHistoricalLoad") WHERE "isHistoricalLoad" = true`,
    ],
  },
  {
    id: '2026-04-24-004-expense-requests-permissions',
    description: 'Seed the 5 expense-requests permissions (view/create/edit/approve/delete) that the controller guards already require. Missing seed meant no role could tick them in Core → Roles, so only Super Admin could hit the endpoints.',
    sql: [
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view expense-requests', 'web', 'Accounts', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('create expense-requests', 'web', 'Accounts', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('edit expense-requests', 'web', 'Accounts', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('approve expense-requests', 'web', 'Accounts', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('delete expense-requests', 'web', 'Accounts', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
    ],
  },
  {
    id: '2026-04-24-005-users-locale-column',
    description: 'Add locale column to users (UI language pref: en/yo/ha/ig). Default en. Pilot on Livestock module.',
    sql: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en'`,
    ],
  },
  {
    id: '2026-04-25-001-vet-clients-customer-link',
    description:
      'Bridge VetClient to standard Customer (and AR/aging machinery). ' +
      'Adds customerId FK + index, then back-fills a Customer row for every existing ' +
      'unlinked vet_client and links them. Skips companies that have no posting-level ' +
      'Receivable account (rare; those rows get linked lazily on next vet client touch).',
    sql: [
      // 1. Add the FK column (nullable so existing rows pass before backfill)
      `ALTER TABLE vet_clients ADD COLUMN IF NOT EXISTS "customerId" INTEGER`,

      // 2. FK constraint — guarded so re-runs don't fail
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'vet_clients_customerId_fkey'
         ) THEN
           ALTER TABLE vet_clients
             ADD CONSTRAINT "vet_clients_customerId_fkey"
             FOREIGN KEY ("customerId") REFERENCES customers(id) ON DELETE SET NULL;
         END IF;
       END $$`,

      // 3. Index for join performance (vet client list → AR aging)
      `CREATE INDEX IF NOT EXISTS vet_clients_customerId_idx ON vet_clients("customerId")`,

      // 4. Backfill: create one Customer per unlinked vet_client and link them.
      //    Uses category-based AR resolution per ARCHITECTURE.md §14 (no hardcoded codes).
      //    Customer.code is VARCHAR(20) — truncate the synthesised 'VET' + clientCode if needed.
      //    Customer.email is NOT NULL — fall back to a deterministic placeholder when blank.
      `DO $$
       DECLARE
         vc_row   RECORD;
         ar_id    INTEGER;
         new_cust INTEGER;
       BEGIN
         FOR vc_row IN
           SELECT * FROM vet_clients
           WHERE "customerId" IS NULL AND "deletedAt" IS NULL
         LOOP
           SELECT a.id INTO ar_id
             FROM ifrs_accounts a
             JOIN ifrs_categories cat ON a."categoryId" = cat.id
            WHERE cat.name = 'Receivable'
              AND a."accountType" = 'asset'
              AND a."isPosting" = true
              AND a."companyId" = vc_row."companyId"
            LIMIT 1;

           IF ar_id IS NULL THEN
             CONTINUE;  -- backfill lazily later when an AR account is configured
           END IF;

           INSERT INTO customers (
             "companyId", "code", "name", "email", "phone", "address",
             "city", "state", "customerType", "isActive",
             "accountsReceivableId", "createdAt", "updatedAt"
           ) VALUES (
             vc_row."companyId",
             LEFT('VET' || vc_row."clientCode", 20),
             vc_row."firstName" || ' ' || vc_row."lastName",
             COALESCE(NULLIF(vc_row.email, ''), 'vet-' || vc_row."clientCode" || '@noemail.local'),
             vc_row.phone,
             vc_row.address,
             vc_row.city,
             vc_row.state,
             'individual',
             true,
             ar_id,
             NOW(), NOW()
           ) RETURNING id INTO new_cust;

           UPDATE vet_clients
              SET "customerId" = new_cust, "updatedAt" = NOW()
            WHERE id = vc_row.id;
         END LOOP;
       END $$`,
    ],
  },
  {
    id: '2026-04-25-002-vet-price-list-weight-rate',
    description:
      'Sprint 1.3: optional ₦/kg surcharge on vet price-list items so anesthesia ' +
      'and similar weight-driven services can scale with patient size. Null = flat (back-compat).',
    sql: [
      `ALTER TABLE vet_price_list_items
         ADD COLUMN IF NOT EXISTS "weightBasedRate" DECIMAL(12, 2)`,
    ],
  },
  {
    id: '2026-04-25-004-vet-clients-gps',
    description:
      'Sprint 2: GPS coordinates on vet_clients for ambulatory routing + zone billing accuracy.',
    sql: [
      `ALTER TABLE vet_clients ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7)`,
      `ALTER TABLE vet_clients ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7)`,
    ],
  },
  {
    id: '2026-04-25-005-vet-triage-symptom-tags',
    description:
      'Sprint 3: lightweight symptom tag chips on vet_triage_records (JSON array). Optional.',
    sql: [
      `ALTER TABLE vet_triage_records ADD COLUMN IF NOT EXISTS "symptomTags" JSONB`,
    ],
  },
  // ============================================================================
  // 2026-04-25: Sprint 2 Batch 3 — Messaging module
  // ============================================================================
  {
    id: '2026-04-25-006-messaging-settings',
    description:
      'Sprint 2 Batch 3: per-company messaging_settings table (Termii SMS/WhatsApp credentials) ' +
      'and providerMessageId on vet_reminders to track outbound delivery.',
    sql: [
      // messaging_settings table
      `CREATE TABLE IF NOT EXISTS messaging_settings (
         "companyId"          INTEGER     NOT NULL,
         provider             TEXT        NOT NULL DEFAULT 'termii',
         "apiKey"             TEXT        NOT NULL DEFAULT '',
         "senderId"           VARCHAR(20) NOT NULL DEFAULT 'SalvagePro',
         "whatsappFromNumber" VARCHAR(20),
         "isActive"           BOOLEAN     NOT NULL DEFAULT true,
         "createdAt"          TIMESTAMP   NOT NULL DEFAULT NOW(),
         "updatedAt"          TIMESTAMP   NOT NULL DEFAULT NOW(),
         CONSTRAINT messaging_settings_pkey PRIMARY KEY ("companyId")
       )`,
      // Track the provider's message id on each reminder row
      `ALTER TABLE vet_reminders ADD COLUMN IF NOT EXISTS "providerMessageId" VARCHAR(200)`,
    ],
  },
  {
    id: '2026-04-25-008-messaging-settings-owner-phone',
    description:
      'Sprint 2 Batch 5: ownerPhone column on messaging_settings — destination for the daily owner snapshot WhatsApp message.',
    sql: [
      `ALTER TABLE messaging_settings ADD COLUMN IF NOT EXISTS "ownerPhone" VARCHAR(20)`,
    ],
  },
  {
    id: '2026-04-25-003-vet-consumable-packs',
    description:
      'Sprint 1.3: per-tenant consumable packs (a bundle of inv_items applied to a ' +
      'procedure) so syringes/cotton/spirit always land on the bill instead of being ' +
      'given away free. Two tables — pack header and items — both idempotent on re-run.',
    sql: [
      `CREATE TABLE IF NOT EXISTS vet_consumable_packs (
         id          SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         code        TEXT NOT NULL,
         name        TEXT NOT NULL,
         description TEXT,
         "appliesTo" TEXT,
         "isActive"  BOOLEAN NOT NULL DEFAULT true,
         "deletedAt" TIMESTAMP,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS vet_consumable_packs_company_code_uq
         ON vet_consumable_packs("companyId", code)`,
      `CREATE INDEX IF NOT EXISTS vet_consumable_packs_company_active_idx
         ON vet_consumable_packs("companyId", "isActive")`,

      `CREATE TABLE IF NOT EXISTS vet_consumable_pack_items (
         id          SERIAL PRIMARY KEY,
         "packId"    INTEGER NOT NULL,
         "itemId"    INTEGER NOT NULL,
         quantity    DECIMAL(10, 2) NOT NULL DEFAULT 1,
         notes       TEXT,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS vet_consumable_pack_items_pack_item_uq
         ON vet_consumable_pack_items("packId", "itemId")`,
      `CREATE INDEX IF NOT EXISTS vet_consumable_pack_items_pack_idx
         ON vet_consumable_pack_items("packId")`,

      // FKs (guarded so re-runs don't fail)
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vet_consumable_pack_items_packId_fkey') THEN
           ALTER TABLE vet_consumable_pack_items
             ADD CONSTRAINT "vet_consumable_pack_items_packId_fkey"
             FOREIGN KEY ("packId") REFERENCES vet_consumable_packs(id) ON DELETE CASCADE;
         END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vet_consumable_pack_items_itemId_fkey') THEN
           ALTER TABLE vet_consumable_pack_items
             ADD CONSTRAINT "vet_consumable_pack_items_itemId_fkey"
             FOREIGN KEY ("itemId") REFERENCES inv_items(id);
         END IF;
       END $$`,
    ],
  },
  {
    id: '2026-04-25-007-vet-ambulatory-requests-fuel-cost',
    description: 'Sprint 2 Batch 4: fuelCost + tripDistanceKm columns on vet_ambulatory_requests for the ambulatory efficiency KPI report.',
    sql: [
      `ALTER TABLE vet_ambulatory_requests ADD COLUMN IF NOT EXISTS "fuelCost" NUMERIC(12,2)`,
      `ALTER TABLE vet_ambulatory_requests ADD COLUMN IF NOT EXISTS "tripDistanceKm" NUMERIC(8,2)`,
    ],
  },
  // ============================================================================
  // 2026-04-25 Sprint 2/3 Batch 8: field photos + lab notifications + feedback SMS
  // ============================================================================
  {
    id: '2026-04-25-009-vet-visit-photos',
    description: 'Sprint 2/3 Batch 8 (#10): create vet_visit_photos table for field photo uploads.',
    sql: [
      `CREATE TABLE IF NOT EXISTS vet_visit_photos (
         id              SERIAL PRIMARY KEY,
         "companyId"     INTEGER NOT NULL,
         "visitId"       INTEGER NOT NULL,
         "filePath"      TEXT NOT NULL,
         "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
         "mimeType"      VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
         "uploadedById"  INTEGER NOT NULL,
         caption         TEXT,
         "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS vet_visit_photos_company_visit_idx ON vet_visit_photos("companyId", "visitId")`,
    ],
  },
  {
    id: '2026-04-25-010-vet-reminders-source-status',
    description: 'Sprint 2/3 Batch 8 (#44): add sourceType, sourceId, status columns to vet_reminders (used by reminders service but missing from schema).',
    sql: [
      `ALTER TABLE vet_reminders ADD COLUMN IF NOT EXISTS "sourceType" VARCHAR(50)`,
      `ALTER TABLE vet_reminders ADD COLUMN IF NOT EXISTS "sourceId" INTEGER`,
      `ALTER TABLE vet_reminders ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending'`,
    ],
  },
  {
    id: '2026-04-25-012-hotel-sprint-1',
    description:
      'Hotel Management Sprint 1 — multi-property foundations: room types, rooms with status, ' +
      'reservations linked to standard customers (AR bridge), room status audit log. All branchId-scoped ' +
      'so a chain like Bar Magen Hotels (Lagos / Abuja / PH) shares one company / one Customer table / one ' +
      'chart of accounts but each property keeps its own room inventory.',
    sql: [
      // hotel_room_types
      `CREATE TABLE IF NOT EXISTS hotel_room_types (
         id              SERIAL PRIMARY KEY,
         "companyId"     INTEGER NOT NULL,
         "branchId"      INTEGER NOT NULL,
         code            VARCHAR(40) NOT NULL,
         name            TEXT NOT NULL,
         description     TEXT,
         "baseRate"      DECIMAL(12, 2) NOT NULL,
         "maxOccupancy"  INTEGER NOT NULL DEFAULT 2,
         "bedConfig"     TEXT,
         amenities       JSONB,
         photos          JSONB,
         "isActive"      BOOLEAN NOT NULL DEFAULT true,
         "deletedAt"     TIMESTAMP,
         "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS hotel_room_types_company_branch_code_uq
         ON hotel_room_types ("companyId", "branchId", code)`,
      `CREATE INDEX IF NOT EXISTS hotel_room_types_company_branch_active_idx
         ON hotel_room_types ("companyId", "branchId", "isActive")`,

      // hotel_rooms
      `CREATE TABLE IF NOT EXISTS hotel_rooms (
         id           SERIAL PRIMARY KEY,
         "companyId"  INTEGER NOT NULL,
         "branchId"   INTEGER NOT NULL,
         "roomTypeId" INTEGER NOT NULL,
         "roomNumber" VARCHAR(40) NOT NULL,
         floor        VARCHAR(40),
         view         VARCHAR(80),
         status       VARCHAR(30) NOT NULL DEFAULT 'vacant_clean',
         notes        TEXT,
         "isActive"   BOOLEAN NOT NULL DEFAULT true,
         "deletedAt"  TIMESTAMP,
         "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS hotel_rooms_company_branch_number_uq
         ON hotel_rooms ("companyId", "branchId", "roomNumber")`,
      `CREATE INDEX IF NOT EXISTS hotel_rooms_company_branch_status_idx
         ON hotel_rooms ("companyId", "branchId", status)`,
      `CREATE INDEX IF NOT EXISTS hotel_rooms_room_type_idx
         ON hotel_rooms ("roomTypeId")`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_rooms_roomTypeId_fkey') THEN
           ALTER TABLE hotel_rooms
             ADD CONSTRAINT "hotel_rooms_roomTypeId_fkey"
             FOREIGN KEY ("roomTypeId") REFERENCES hotel_room_types(id);
         END IF;
       END $$`,

      // hotel_room_status_log
      `CREATE TABLE IF NOT EXISTS hotel_room_status_log (
         id           SERIAL PRIMARY KEY,
         "roomId"     INTEGER NOT NULL,
         "fromStatus" VARCHAR(30),
         "toStatus"   VARCHAR(30) NOT NULL,
         "changedById" INTEGER,
         reason       TEXT,
         "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS hotel_room_status_log_room_idx
         ON hotel_room_status_log ("roomId", "createdAt")`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_room_status_log_roomId_fkey') THEN
           ALTER TABLE hotel_room_status_log
             ADD CONSTRAINT "hotel_room_status_log_roomId_fkey"
             FOREIGN KEY ("roomId") REFERENCES hotel_rooms(id) ON DELETE CASCADE;
         END IF;
       END $$`,

      // hotel_reservations
      `CREATE TABLE IF NOT EXISTS hotel_reservations (
         id                   SERIAL PRIMARY KEY,
         "companyId"          INTEGER NOT NULL,
         "branchId"           INTEGER NOT NULL,
         "customerId"         INTEGER NOT NULL,
         "reservationCode"    VARCHAR(40) NOT NULL,
         status               VARCHAR(30) NOT NULL DEFAULT 'pending',
         source               VARCHAR(30) NOT NULL DEFAULT 'direct',
         "arrivalDate"        DATE NOT NULL,
         "departureDate"      DATE NOT NULL,
         nights               INTEGER NOT NULL,
         adults               INTEGER NOT NULL DEFAULT 1,
         children             INTEGER NOT NULL DEFAULT 0,
         "roomTypeId"         INTEGER,
         "roomId"             INTEGER,
         "ratePerNight"       DECIMAL(12, 2) NOT NULL,
         subtotal             DECIMAL(15, 2) NOT NULL,
         "taxAmount"          DECIMAL(15, 2) NOT NULL DEFAULT 0,
         "totalAmount"        DECIMAL(15, 2) NOT NULL,
         "depositAmount"      DECIMAL(15, 2) NOT NULL DEFAULT 0,
         "paidAmount"         DECIMAL(15, 2) NOT NULL DEFAULT 0,
         "balanceAmount"      DECIMAL(15, 2) NOT NULL,
         "kycVerificationId"  INTEGER,
         "specialRequests"    TEXT,
         "internalNotes"      TEXT,
         "blacklistFlag"      BOOLEAN NOT NULL DEFAULT false,
         "flagReason"         TEXT,
         "checkedInAt"        TIMESTAMP,
         "checkedInById"      INTEGER,
         "checkedOutAt"       TIMESTAMP,
         "checkedOutById"     INTEGER,
         "cancelledAt"        TIMESTAMP,
         "cancelledById"      INTEGER,
         "cancellationReason" TEXT,
         "salesInvoiceId"     INTEGER,
         "createdById"        INTEGER,
         "deletedAt"          TIMESTAMP,
         "createdAt"          TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"          TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS hotel_reservations_company_code_uq
         ON hotel_reservations ("companyId", "reservationCode")`,
      `CREATE INDEX IF NOT EXISTS hotel_reservations_company_branch_status_idx
         ON hotel_reservations ("companyId", "branchId", status)`,
      `CREATE INDEX IF NOT EXISTS hotel_reservations_company_branch_arrival_idx
         ON hotel_reservations ("companyId", "branchId", "arrivalDate")`,
      `CREATE INDEX IF NOT EXISTS hotel_reservations_customer_idx
         ON hotel_reservations ("customerId")`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_reservations_customerId_fkey') THEN
           ALTER TABLE hotel_reservations
             ADD CONSTRAINT "hotel_reservations_customerId_fkey"
             FOREIGN KEY ("customerId") REFERENCES customers(id);
         END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_reservations_roomId_fkey') THEN
           ALTER TABLE hotel_reservations
             ADD CONSTRAINT "hotel_reservations_roomId_fkey"
             FOREIGN KEY ("roomId") REFERENCES hotel_rooms(id) ON DELETE SET NULL;
         END IF;
       END $$`,
    ],
  },
  {
    id: '2026-04-25-011-kyc-verifications',
    description:
      'Shared identity verification table — cached NIN/BVN/passport/license lookups so the ' +
      'same number is not re-billed across modules. Used by Vet, Hotel, Fund Management. ' +
      '12-month TTL; raw doc number never stored (sha256 hash + last-4 mask only).',
    sql: [
      `CREATE TABLE IF NOT EXISTS kyc_verifications (
         id                     SERIAL PRIMARY KEY,
         "companyId"            INTEGER     NOT NULL,
         "documentType"         VARCHAR(40) NOT NULL,
         "documentNumberHash"   VARCHAR(80) NOT NULL,
         "documentNumberMasked" VARCHAR(40) NOT NULL,
         provider               VARCHAR(40) NOT NULL,
         status                 VARCHAR(20) NOT NULL,
         "matchedFirstName"     TEXT,
         "matchedLastName"      TEXT,
         "matchedMiddleName"    TEXT,
         "matchedDateOfBirth"   DATE,
         "matchedGender"        VARCHAR(20),
         "matchedPhone"         VARCHAR(30),
         "matchedPhotoUrl"      TEXT,
         "rawResponse"          JSONB,
         "requestedById"        INTEGER,
         "entityType"           VARCHAR(50),
         "entityId"             INTEGER,
         "verifiedAt"           TIMESTAMP,
         "expiresAt"            TIMESTAMP,
         "errorMessage"         TEXT,
         "deletedAt"            TIMESTAMP,
         "createdAt"            TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"            TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS kyc_verifications_company_hash_idx
         ON kyc_verifications ("companyId", "documentNumberHash", provider)`,
      `CREATE INDEX IF NOT EXISTS kyc_verifications_company_entity_idx
         ON kyc_verifications ("companyId", "entityType", "entityId")`,
      `CREATE INDEX IF NOT EXISTS kyc_verifications_company_verifiedat_idx
         ON kyc_verifications ("companyId", "verifiedAt")`,
    ],
  },
  {
    id: '2026-04-25-013-hotel-sprint-2',
    description:
      'Hotel Management Sprint 2 — branch-level hospitality settings (state consumption tax rate, ' +
      'check-in/out windows, default caution amount), reservation snapshot of taxRate at booking, ' +
      'and separate caution-deposit ledger fields on hotel_reservations (held/refunded/release reason). ' +
      'Caution deposits are tracked separately from depositAmount because they are a refundable liability ' +
      'that should not flow into revenue or sales invoices.',
    sql: [
      // hotel_branch_settings — one row per branch, tenant-configurable
      `CREATE TABLE IF NOT EXISTS hotel_branch_settings (
         id                     SERIAL PRIMARY KEY,
         "companyId"            INTEGER NOT NULL,
         "branchId"             INTEGER NOT NULL,
         "consumptionTaxRate"   DECIMAL(6, 4) NOT NULL DEFAULT 0,
         "taxLabel"             VARCHAR(120) NOT NULL DEFAULT 'State Consumption Tax',
         "defaultCheckInTime"   VARCHAR(5) NOT NULL DEFAULT '14:00',
         "defaultCheckOutTime"  VARCHAR(5) NOT NULL DEFAULT '12:00',
         "defaultCautionAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
         "invoiceFooterNote"    TEXT,
         "createdAt"            TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"            TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS hotel_branch_settings_company_branch_uq
         ON hotel_branch_settings ("companyId", "branchId")`,

      // hotel_reservations — tax rate snapshot + caution deposit ledger
      `ALTER TABLE hotel_reservations
         ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(6, 4) NOT NULL DEFAULT 0`,
      `ALTER TABLE hotel_reservations
         ADD COLUMN IF NOT EXISTS "cautionDepositAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0`,
      `ALTER TABLE hotel_reservations
         ADD COLUMN IF NOT EXISTS "cautionRefundedAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0`,
      `ALTER TABLE hotel_reservations
         ADD COLUMN IF NOT EXISTS "cautionReleaseReason" TEXT`,
    ],
  },
  {
    id: '2026-04-25-014-hotel-sprint-3',
    description:
      'Hotel Management Sprint 3 — per-reservation payment ledger and nightly audit snapshots. ' +
      'Payments here are hotel-specific and bump reservation.paidAmount directly so receptionists ' +
      'can move fast at the front desk; a future sync can mirror them to customer_receipts. ' +
      'Night-audit runs daily at 02:00, marks no-shows for confirmed reservations whose arrival ' +
      'date has passed, and stores room-board + arrivals snapshot per branch.',
    sql: [
      // hotel_reservation_payments — front-desk payment ledger
      `CREATE TABLE IF NOT EXISTS hotel_reservation_payments (
         id                SERIAL PRIMARY KEY,
         "companyId"       INTEGER NOT NULL,
         "reservationId"   INTEGER NOT NULL,
         amount            DECIMAL(15, 2) NOT NULL,
         "paymentMethod"   VARCHAR(40) NOT NULL,
         "bankAccountId"   INTEGER,
         "referenceNumber" VARCHAR(120),
         description       TEXT,
         "paidAt"          TIMESTAMP NOT NULL DEFAULT NOW(),
         "voidedAt"        TIMESTAMP,
         "voidedById"      INTEGER,
         "voidReason"      TEXT,
         "createdById"     INTEGER,
         "deletedAt"       TIMESTAMP,
         "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS hotel_reservation_payments_company_reservation_idx
         ON hotel_reservation_payments ("companyId", "reservationId")`,
      `CREATE INDEX IF NOT EXISTS hotel_reservation_payments_company_paidat_idx
         ON hotel_reservation_payments ("companyId", "paidAt")`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_reservation_payments_reservationId_fkey') THEN
           ALTER TABLE hotel_reservation_payments
             ADD CONSTRAINT "hotel_reservation_payments_reservationId_fkey"
             FOREIGN KEY ("reservationId") REFERENCES hotel_reservations(id) ON DELETE CASCADE;
         END IF;
       END $$`,

      // hotel_night_audit_runs — daily snapshot per branch
      `CREATE TABLE IF NOT EXISTS hotel_night_audit_runs (
         id                  SERIAL PRIMARY KEY,
         "companyId"         INTEGER NOT NULL,
         "branchId"          INTEGER NOT NULL,
         "runDate"           DATE NOT NULL,
         "totalRooms"        INTEGER NOT NULL,
         "vacantRooms"       INTEGER NOT NULL DEFAULT 0,
         "occupiedRooms"     INTEGER NOT NULL DEFAULT 0,
         "reservedRooms"     INTEGER NOT NULL DEFAULT 0,
         "dirtyRooms"        INTEGER NOT NULL DEFAULT 0,
         "oooRooms"          INTEGER NOT NULL DEFAULT 0,
         "arrivalsExpected"  INTEGER NOT NULL DEFAULT 0,
         "arrivalsCompleted" INTEGER NOT NULL DEFAULT 0,
         "noShowsMarked"     INTEGER NOT NULL DEFAULT 0,
         "occupancyRate"     DECIMAL(5, 4) NOT NULL DEFAULT 0,
         revenue             DECIMAL(15, 2) NOT NULL DEFAULT 0,
         notes               TEXT,
         "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS hotel_night_audit_runs_company_branch_date_uq
         ON hotel_night_audit_runs ("companyId", "branchId", "runDate")`,
      `CREATE INDEX IF NOT EXISTS hotel_night_audit_runs_company_date_idx
         ON hotel_night_audit_runs ("companyId", "runDate")`,
    ],
  },
  {
    id: '2026-04-25-015-hotel-pos-session-bridge',
    description:
      'Front-desk shift management: link hotel reservation payments to the POS cash register session. ' +
      'Receptionists already have a complete shift system in POS (cash_register_sessions with opening/' +
      'closing/expected/variance + payment-method breakdown + getClosingSummary). Rather than build a ' +
      'parallel hotel_shifts table, hotel payments tag to the recording user\'s open POS session and the ' +
      'POS close summary aggregates them. Nullable: payments outside an open session (e.g. via API or ' +
      'before staff opens their drawer) still flow with posSessionId NULL.',
    sql: [
      `ALTER TABLE hotel_reservation_payments
         ADD COLUMN IF NOT EXISTS "posSessionId" INTEGER`,
      `CREATE INDEX IF NOT EXISTS hotel_reservation_payments_pos_session_idx
         ON hotel_reservation_payments ("posSessionId")`,
    ],
  },
  {
    id: '2026-04-26-001-fm-investor-halal-declaration',
    description:
      'Halal source-of-funds certification on fm_investors. Required for Islamic fund subscriptions ' +
      'and Mudarabah/Wakala contract signing. Existing investors default to false (not certified) ' +
      'and the UI prompts them to certify before any new subscription.',
    sql: [
      `ALTER TABLE fm_investors
         ADD COLUMN IF NOT EXISTS "sourceOfFundsHalalCertified" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE fm_investors
         ADD COLUMN IF NOT EXISTS "sourceOfFundsCertifiedAt" TIMESTAMP`,
    ],
  },
  {
    id: '2026-04-26-002-fm-charity-ngo-registry',
    description:
      'Charity / NGO registry for Zakat + purification destinations. Per-tenant. ' +
      'Bank details captured so disbursements can be paid directly. focusAreas array ' +
      'lets investors pick alignment (poverty, education, masjid, etc.). Only verified ' +
      'NGOs are pickable for live payouts.',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_charity_ngos (
         id                   SERIAL PRIMARY KEY,
         "companyId"          INTEGER NOT NULL,
         name                 VARCHAR(255) NOT NULL,
         "registrationNumber" VARCHAR(120),
         description          TEXT,
         "contactName"        VARCHAR(255),
         "contactEmail"       VARCHAR(255),
         "contactPhone"       VARCHAR(50),
         "websiteUrl"         VARCHAR(500),
         "bankName"           VARCHAR(255),
         "bankAccountNumber"  VARCHAR(30),
         "bankAccountName"    VARCHAR(255),
         "bankCode"           VARCHAR(10),
         "focusAreas"         TEXT[] NOT NULL DEFAULT '{}',
         "isVerified"         BOOLEAN NOT NULL DEFAULT false,
         "verifiedById"       INTEGER,
         "verifiedAt"         TIMESTAMP,
         "isActive"           BOOLEAN NOT NULL DEFAULT true,
         notes                TEXT,
         "createdById"        INTEGER,
         "deletedAt"          TIMESTAMP,
         "createdAt"          TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"          TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_charity_ngos_company_active_verified_idx
         ON fm_charity_ngos ("companyId", "isActive", "isVerified")`,
    ],
  },
  {
    id: '2026-04-26-003-fm-aqad-contracts',
    description:
      'Halal Aqad — Islamic-finance contract templates + e-signatures. ' +
      'fm_contract_templates: tenant-curated boilerplate per type (MUDARABAH/WAKALA/etc). ' +
      'fm_contract_signings: per-instance frozen snapshot + OTP-based e-signature, ' +
      'polymorphic to subscription / facility / sukuk issue.',
    sql: [
      // fm_contract_templates
      `CREATE TABLE IF NOT EXISTS fm_contract_templates (
         id            SERIAL PRIMARY KEY,
         "companyId"   INTEGER NOT NULL,
         type          VARCHAR(40) NOT NULL,
         name          VARCHAR(255) NOT NULL,
         version       INTEGER NOT NULL DEFAULT 1,
         "contentHtml" TEXT NOT NULL,
         placeholders  JSONB NOT NULL DEFAULT '[]'::jsonb,
         "isActive"    BOOLEAN NOT NULL DEFAULT true,
         "isDefault"   BOOLEAN NOT NULL DEFAULT false,
         "createdById" INTEGER,
         "deletedAt"   TIMESTAMP,
         "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_contract_templates_company_type_active_idx
         ON fm_contract_templates ("companyId", type, "isActive")`,

      // fm_contract_signings
      `CREATE TABLE IF NOT EXISTS fm_contract_signings (
         id                  SERIAL PRIMARY KEY,
         "companyId"         INTEGER NOT NULL,
         "templateId"        INTEGER NOT NULL,
         type                VARCHAR(40) NOT NULL,
         "investorId"        INTEGER NOT NULL,
         "subscriptionId"    INTEGER,
         "facilityId"        INTEGER,
         "sukukIssueId"      INTEGER,
         "renderedContent"   TEXT NOT NULL,
         status              VARCHAR(30) NOT NULL DEFAULT 'pending_signature',
         "signedAt"          TIMESTAMP,
         "signedByName"      VARCHAR(255),
         "signedByEmail"     VARCHAR(255),
         "signedByIpAddress" VARCHAR(64),
         "signedByUserAgent" TEXT,
         "otpHash"           VARCHAR(128),
         "otpSentAt"         TIMESTAMP,
         "otpExpiresAt"      TIMESTAMP,
         "otpVerifiedAt"     TIMESTAMP,
         "otpAttempts"       INTEGER NOT NULL DEFAULT 0,
         "cancelledAt"       TIMESTAMP,
         "cancelledById"     INTEGER,
         "cancellationReason" TEXT,
         "pdfPath"           VARCHAR(500),
         "createdById"       INTEGER,
         "deletedAt"         TIMESTAMP,
         "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_contract_signings_company_investor_idx
         ON fm_contract_signings ("companyId", "investorId")`,
      `CREATE INDEX IF NOT EXISTS fm_contract_signings_company_status_idx
         ON fm_contract_signings ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS fm_contract_signings_subscription_idx
         ON fm_contract_signings ("subscriptionId") WHERE "subscriptionId" IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS fm_contract_signings_facility_idx
         ON fm_contract_signings ("facilityId") WHERE "facilityId" IS NOT NULL`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fm_contract_signings_templateId_fkey') THEN
           ALTER TABLE fm_contract_signings
             ADD CONSTRAINT "fm_contract_signings_templateId_fkey"
             FOREIGN KEY ("templateId") REFERENCES fm_contract_templates(id);
         END IF;
       END $$`,
    ],
  },
  {
    id: '2026-04-26-004-fm-facility-assets',
    description:
      'Halal asset-backed financing — every credit facility must register the underlying asset, ' +
      'upload proof, and disburse to the supplier directly. Lifecycle: pending_proof -> ' +
      'proof_uploaded -> awaiting_payment -> paid_to_supplier -> delivered (with a reject branch).',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_facility_assets (
         id                          SERIAL PRIMARY KEY,
         "companyId"                 INTEGER NOT NULL,
         "facilityId"                INTEGER NOT NULL,
         "assetType"                 VARCHAR(40) NOT NULL,
         description                 TEXT NOT NULL,
         "costPrice"                 DECIMAL(15, 2) NOT NULL,
         "supplierName"              VARCHAR(255) NOT NULL,
         "supplierAccountName"       VARCHAR(255),
         "supplierAccountNumber"     VARCHAR(30),
         "supplierBankName"          VARCHAR(255),
         "supplierBankCode"          VARCHAR(10),
         "certificateOfOwnershipUrl" VARCHAR(500),
         "invoiceUrl"                VARCHAR(500),
         "additionalDocsUrls"        JSONB,
         status                      VARCHAR(40) NOT NULL DEFAULT 'pending_proof',
         "rejectedReason"            TEXT,
         "rejectedById"              INTEGER,
         "rejectedAt"                TIMESTAMP,
         "paidAt"                    TIMESTAMP,
         "paidByUserId"              INTEGER,
         "paidAmount"                DECIMAL(15, 2),
         "paidViaTransactionRef"     VARCHAR(120),
         "deliveryConfirmedAt"       TIMESTAMP,
         "deliveryConfirmedByUserId" INTEGER,
         "deliveryNotes"             TEXT,
         "createdById"               INTEGER,
         "deletedAt"                 TIMESTAMP,
         "createdAt"                 TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"                 TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_facility_assets_company_facility_idx
         ON fm_facility_assets ("companyId", "facilityId")`,
      `CREATE INDEX IF NOT EXISTS fm_facility_assets_company_status_idx
         ON fm_facility_assets ("companyId", status)`,
    ],
  },
  {
    id: '2026-04-26-005-shariah-board-role',
    description:
      "Backfill the 'shariah-board' role + read-only Fund Management permissions for existing " +
      "tenants. The role grants read access to investors, securities, credit facilities, facility " +
      "assets, contract signings, sharia screenings and compliance reports. Roles are tenant-wide " +
      "(not scoped per company), so a single role row + permission rows cover the schema. " +
      "All inserts use ON CONFLICT DO NOTHING so the migration is idempotent and safe for new " +
      "tenants that already have the role from the seeder.",
    sql: [
      // 1. Insert the read-only FM permissions (no-op if already seeded for new tenants)
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('access FundManagement module', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view fund-management', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view fm-investors', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view fm-securities', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view fm-credit-facilities', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view fm-facility-assets', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view fm-contract-signings', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view fm-sharia', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
      `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ('view fm-compliance-reports', 'web', 'FundManagement', NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,

      // 2. Insert the role row (tenant-wide, not per-company — see Role model)
      `INSERT INTO roles (name, "guardName", description, "createdAt", "updatedAt")
         VALUES (
           'shariah-board',
           'web',
           'Shari''ah Board — read-only access to Halal Fund Management compliance views',
           NOW(),
           NOW()
         )
         ON CONFLICT (name, "guardName") DO NOTHING`,

      // 3. Link the read-only permissions to the role.
      //    Using a set-based INSERT … SELECT … ON CONFLICT DO NOTHING so re-runs are safe.
      `INSERT INTO role_has_permissions ("roleId", "permissionId")
         SELECT r.id, p.id
           FROM roles r
           JOIN permissions p ON p."guardName" = 'web'
          WHERE r.name = 'shariah-board'
            AND r."guardName" = 'web'
            AND p.name IN (
              'access FundManagement module',
              'view fund-management',
              'view fm-investors',
              'view fm-securities',
              'view fm-credit-facilities',
              'view fm-facility-assets',
              'view fm-contract-signings',
              'view fm-sharia',
              'view fm-compliance-reports'
            )
         ON CONFLICT DO NOTHING`,
    ],
  },
  {
    id: '2026-04-26-006-fm-late-fees',
    description:
      'Halal late-payment-fee handling on credit facilities — fees route to charity ' +
      'instead of being recognised as the manager\'s income (riba avoidance). Adds the ' +
      'fm_credit_facility_late_fees lifecycle table and relaxes ' +
      'fm_purification_records.investorAccountId so non-investor (charity) entries can be inserted.',
    sql: [
      // Drop the NOT NULL on investorAccountId so late-fee → charity purification rows
      // can be inserted without an attributable investor account. Idempotent — DROP NOT NULL
      // is a no-op when the column is already nullable.
      `ALTER TABLE fm_purification_records ALTER COLUMN "investorAccountId" DROP NOT NULL`,

      // Late-fee table — separate from fm_credit_repayments to keep the existing
      // repayment flow untouched on tenants already running it in production.
      `CREATE TABLE IF NOT EXISTS fm_credit_facility_late_fees (
         id                     SERIAL PRIMARY KEY,
         "companyId"            INTEGER NOT NULL,
         "facilityId"           INTEGER NOT NULL,
         "repaymentId"          INTEGER,
         "feeAmount"            DECIMAL(18, 2) NOT NULL,
         reason                 TEXT,
         "recordedAt"           TIMESTAMP NOT NULL DEFAULT NOW(),
         "recordedById"         INTEGER,
         "charityNgoId"         INTEGER,
         "purificationRecordId" INTEGER,
         status                 VARCHAR(30) NOT NULL DEFAULT 'accrued',
         "settledAt"            TIMESTAMP,
         "settledById"          INTEGER,
         notes                  TEXT,
         "deletedAt"            TIMESTAMP,
         "createdAt"            TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"            TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_credit_facility_late_fees_company_status_idx
         ON fm_credit_facility_late_fees ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS fm_credit_facility_late_fees_company_facility_idx
         ON fm_credit_facility_late_fees ("companyId", "facilityId")`,
      `CREATE INDEX IF NOT EXISTS fm_credit_facility_late_fees_company_charity_idx
         ON fm_credit_facility_late_fees ("companyId", "charityNgoId")`,
    ],
  },
  {
    id: '2026-04-26-007-fm-zakat-charity-payout',
    description:
      'Zakat disbursement target — link each zakat calculation to a verified NGO from the registry. ' +
      'Closes the loop where the calculator computed amounts but had no destination on file.',
    sql: [
      `ALTER TABLE fm_zakat_calculations
         ADD COLUMN IF NOT EXISTS "charityNgoId" INTEGER`,
      `ALTER TABLE fm_zakat_calculations
         ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(40)`,
      `ALTER TABLE fm_zakat_calculations
         ADD COLUMN IF NOT EXISTS "paidByUserId" INTEGER`,
      `CREATE INDEX IF NOT EXISTS fm_zakat_calculations_charity_idx
         ON fm_zakat_calculations ("charityNgoId")`,
    ],
  },
  {
    id: '2026-04-26-008-fm-late-fee-bank-audit',
    description:
      'Capture the bank-transfer audit on late-fee charity settlement. Closes the loop where ' +
      'settle-to-charity recorded the destination NGO but had no field for the bank txn ref / ' +
      'method. Operators can now reconcile from the late-fee row to the bank statement entry.',
    sql: [
      `ALTER TABLE fm_credit_facility_late_fees
         ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(40)`,
      `ALTER TABLE fm_credit_facility_late_fees
         ADD COLUMN IF NOT EXISTS "paymentReference" VARCHAR(100)`,
    ],
  },
  {
    id: '2026-04-26-009-fm-wakala-fee-tiers',
    description:
      'Wakala fee schedule — tiered or flat agency-fee tables that the periodic fee accrual ' +
      'engine consults. Wakala is the Islamic agency contract; unlike Mudarabah it uses a fixed ' +
      'fee, typically banded by AUM. Adds fm_wakala_fee_tiers + fm_wakala_fee_brackets so ' +
      'managers can configure their fee schedule per company, optionally per fund.',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_wakala_fee_tiers (
         id                  SERIAL PRIMARY KEY,
         "companyId"         INTEGER NOT NULL,
         "fundId"            INTEGER,
         name                VARCHAR(120) NOT NULL,
         description         TEXT,
         "feeMethod"         VARCHAR(20) NOT NULL DEFAULT 'tiered',
         "flatFeeAmount"     DECIMAL(20, 2),
         "flatFeeFrequency"  VARCHAR(20),
         "effectiveFrom"     TIMESTAMPTZ NOT NULL,
         "effectiveTo"       TIMESTAMPTZ,
         "isActive"          BOOLEAN NOT NULL DEFAULT true,
         notes               TEXT,
         "createdById"       INTEGER,
         "deletedAt"         TIMESTAMP,
         "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_wakala_fee_tiers_company_active_idx
         ON fm_wakala_fee_tiers ("companyId", "isActive")`,
      `CREATE INDEX IF NOT EXISTS fm_wakala_fee_tiers_company_fund_idx
         ON fm_wakala_fee_tiers ("companyId", "fundId")`,
      `CREATE TABLE IF NOT EXISTS fm_wakala_fee_brackets (
         id           SERIAL PRIMARY KEY,
         "tierId"     INTEGER NOT NULL REFERENCES fm_wakala_fee_tiers(id) ON DELETE CASCADE,
         "lowerBound" DECIMAL(20, 2) NOT NULL,
         "upperBound" DECIMAL(20, 2),
         "annualRate" DECIMAL(8, 4) NOT NULL,
         "sortOrder"  INTEGER NOT NULL DEFAULT 0,
         "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_wakala_fee_brackets_tier_sort_idx
         ON fm_wakala_fee_brackets ("tierId", "sortOrder")`,
    ],
  },
  {
    id: '2026-04-26-010-fm-sukuk-lifecycle',
    description:
      'Sukuk lifecycle — coupon distribution and redemption tracking. Adds two tables: ' +
      'fm_sukuk_coupon_distributions records actual coupon (rental) payouts against scheduled ' +
      'rental rows; fm_sukuk_redemptions records full/early/partial redemption events for the ' +
      'underlying Sukuk instruments. These are separate from FmRedemption (investor unit ' +
      'liquidations from a fund).',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_sukuk_coupon_distributions (
         id                  SERIAL PRIMARY KEY,
         "companyId"         INTEGER NOT NULL,
         "fundId"            INTEGER NOT NULL,
         "securityId"        INTEGER NOT NULL,
         "rentalScheduleId"  INTEGER NOT NULL,
         "distributionDate"  TIMESTAMPTZ NOT NULL,
         "totalDistributed"  DECIMAL(20, 2) NOT NULL,
         "pricePerUnit"      DECIMAL(20, 6) NOT NULL,
         status              VARCHAR(20) NOT NULL DEFAULT 'calculated',
         "paidAt"            TIMESTAMPTZ,
         "paymentMethod"     VARCHAR(40),
         "paymentReference"  VARCHAR(100),
         notes               TEXT,
         "recordedById"      INTEGER,
         "paidById"          INTEGER,
         "deletedAt"         TIMESTAMP,
         "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_sukuk_coupon_distributions_company_idx
         ON fm_sukuk_coupon_distributions ("companyId", "fundId", "securityId")`,
      `CREATE INDEX IF NOT EXISTS fm_sukuk_coupon_distributions_schedule_idx
         ON fm_sukuk_coupon_distributions ("rentalScheduleId")`,
      `CREATE TABLE IF NOT EXISTS fm_sukuk_redemptions (
         id                  SERIAL PRIMARY KEY,
         "companyId"         INTEGER NOT NULL,
         "fundId"            INTEGER NOT NULL,
         "securityId"        INTEGER NOT NULL,
         "redemptionType"    VARCHAR(20) NOT NULL,
         "redemptionDate"    TIMESTAMPTZ NOT NULL,
         "unitsRedeemed"     DECIMAL(20, 6) NOT NULL,
         "faceValuePaid"     DECIMAL(20, 2) NOT NULL,
         "premiumOrDiscount" DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "totalProceeds"     DECIMAL(20, 2) NOT NULL,
         status              VARCHAR(20) NOT NULL DEFAULT 'pending',
         "settledAt"         TIMESTAMPTZ,
         "paymentMethod"     VARCHAR(40),
         "paymentReference"  VARCHAR(100),
         notes               TEXT,
         "recordedById"      INTEGER,
         "settledById"       INTEGER,
         "deletedAt"         TIMESTAMP,
         "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_sukuk_redemptions_company_idx
         ON fm_sukuk_redemptions ("companyId", "fundId", "securityId")`,
      `CREATE INDEX IF NOT EXISTS fm_sukuk_redemptions_date_idx
         ON fm_sukuk_redemptions ("redemptionDate")`,
    ],
  },
  {
    id: '2026-04-26-011-fm-structure-tables',
    description:
      'Islamic finance structures — dedicated tables for Murabaha pricing (cost-plus sale ' +
      'parameters per facility), Ijarah rental schedules (lease-to-own periodic rents), and ' +
      'Mudarabah distributions (profit-sharing declarations). These complement FmCreditFacility ' +
      'rather than replacing it — credit-facilities.service still owns the unified flow; these ' +
      'tables hold the structure-specific data each Sharia contract requires.',
    sql: [
      // -------------------- Murabaha pricing --------------------
      `CREATE TABLE IF NOT EXISTS fm_murabaha_pricing (
         id                SERIAL PRIMARY KEY,
         "companyId"       INTEGER NOT NULL,
         "facilityId"      INTEGER NOT NULL,
         "assetCost"       DECIMAL(20, 2) NOT NULL,
         "markupAmount"    DECIMAL(20, 2) NOT NULL,
         "totalSalePrice"  DECIMAL(20, 2) NOT NULL,
         "supplierName"    VARCHAR(200) NOT NULL,
         "supplierInvoice" VARCHAR(100),
         "costEvidenceUrl" VARCHAR(500),
         "pricingDate"     TIMESTAMPTZ NOT NULL,
         notes             TEXT,
         "createdById"     INTEGER,
         "deletedAt"       TIMESTAMP,
         "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS fm_murabaha_pricing_facility_uidx
         ON fm_murabaha_pricing ("facilityId")`,
      `CREATE INDEX IF NOT EXISTS fm_murabaha_pricing_company_idx
         ON fm_murabaha_pricing ("companyId")`,

      // -------------------- Ijarah rental schedules --------------------
      `CREATE TABLE IF NOT EXISTS fm_ijarah_rental_schedules (
         id                 SERIAL PRIMARY KEY,
         "companyId"        INTEGER NOT NULL,
         "facilityId"       INTEGER NOT NULL,
         "periodNumber"     INTEGER NOT NULL,
         "periodStart"      TIMESTAMPTZ NOT NULL,
         "periodEnd"        TIMESTAMPTZ NOT NULL,
         "dueDate"          TIMESTAMPTZ NOT NULL,
         "rentAmount"       DECIMAL(20, 2) NOT NULL,
         status             VARCHAR(20) NOT NULL DEFAULT 'scheduled',
         "paidAmount"       DECIMAL(20, 2),
         "paidAt"           TIMESTAMPTZ,
         "paymentReference" VARCHAR(100),
         notes              TEXT,
         "deletedAt"        TIMESTAMP,
         "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS fm_ijarah_rental_schedules_facility_period_uidx
         ON fm_ijarah_rental_schedules ("facilityId", "periodNumber")`,
      `CREATE INDEX IF NOT EXISTS fm_ijarah_rental_schedules_company_facility_idx
         ON fm_ijarah_rental_schedules ("companyId", "facilityId")`,
      `CREATE INDEX IF NOT EXISTS fm_ijarah_rental_schedules_due_status_idx
         ON fm_ijarah_rental_schedules ("dueDate", status)`,

      // -------------------- Mudarabah distributions --------------------
      `CREATE TABLE IF NOT EXISTS fm_mudarabah_distributions (
         id                 SERIAL PRIMARY KEY,
         "companyId"        INTEGER NOT NULL,
         "facilityId"       INTEGER NOT NULL,
         "periodStart"      TIMESTAMPTZ NOT NULL,
         "periodEnd"        TIMESTAMPTZ NOT NULL,
         "declarationDate"  TIMESTAMPTZ NOT NULL,
         "totalProfit"      DECIMAL(20, 2) NOT NULL,
         "managerSharePct"  DECIMAL(8, 4) NOT NULL,
         "managerShare"     DECIMAL(20, 2) NOT NULL,
         "investorShare"    DECIMAL(20, 2) NOT NULL,
         status             VARCHAR(20) NOT NULL DEFAULT 'declared',
         "paidAt"           TIMESTAMPTZ,
         "paymentReference" VARCHAR(100),
         "paymentMethod"    VARCHAR(40),
         notes              TEXT,
         "declaredById"     INTEGER,
         "paidById"         INTEGER,
         "deletedAt"        TIMESTAMP,
         "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fm_mudarabah_distributions_company_facility_idx
         ON fm_mudarabah_distributions ("companyId", "facilityId", "declarationDate")`,
    ],
  },
  {
    id: '2026-04-26-012-fnb-pos',
    description:
      'Food & Beverage POS — outlets, tables, menu (categories/items/modifiers), orders, ' +
      'order items + per-item modifier snapshots. Powers hotel restaurants/bars/room-service ' +
      'with table management, course tracking, kitchen tickets, and the room_charge bridge ' +
      'into hotel_reservation_payments. Distinct from the retail POS module.',
    sql: [
      // -------------------- Outlets --------------------
      `CREATE TABLE IF NOT EXISTS fnb_outlets (
         id                 SERIAL PRIMARY KEY,
         "companyId"        INTEGER NOT NULL,
         "branchId"         INTEGER NOT NULL,
         name               VARCHAR(120) NOT NULL,
         "outletType"       VARCHAR(30) NOT NULL,
         description        TEXT,
         "isActive"         BOOLEAN NOT NULL DEFAULT true,
         "vatRate"          DECIMAL(8, 4) NOT NULL DEFAULT 0.075,
         "serviceCharge"    DECIMAL(8, 4) NOT NULL DEFAULT 0.10,
         "defaultPrinterId" VARCHAR(100),
         "deletedAt"        TIMESTAMP,
         "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fnb_outlets_company_branch_active_idx
         ON fnb_outlets ("companyId", "branchId", "isActive")`,

      // -------------------- Tables --------------------
      `CREATE TABLE IF NOT EXISTS fnb_tables (
         id            SERIAL PRIMARY KEY,
         "companyId"   INTEGER NOT NULL,
         "outletId"    INTEGER NOT NULL,
         "tableNumber" VARCHAR(20) NOT NULL,
         capacity      INTEGER NOT NULL DEFAULT 2,
         status        VARCHAR(20) NOT NULL DEFAULT 'vacant',
         zone          VARCHAR(50),
         notes         TEXT,
         "deletedAt"   TIMESTAMP,
         "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS fnb_tables_outlet_number_uidx
         ON fnb_tables ("outletId", "tableNumber")`,
      `CREATE INDEX IF NOT EXISTS fnb_tables_company_outlet_status_idx
         ON fnb_tables ("companyId", "outletId", status)`,

      // -------------------- Menu Categories --------------------
      `CREATE TABLE IF NOT EXISTS fnb_menu_categories (
         id           SERIAL PRIMARY KEY,
         "companyId"  INTEGER NOT NULL,
         "outletId"   INTEGER,
         name         VARCHAR(120) NOT NULL,
         "sortOrder"  INTEGER NOT NULL DEFAULT 0,
         "isActive"   BOOLEAN NOT NULL DEFAULT true,
         "deletedAt"  TIMESTAMP,
         "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fnb_menu_categories_company_outlet_active_idx
         ON fnb_menu_categories ("companyId", "outletId", "isActive")`,

      // -------------------- Menu Items --------------------
      `CREATE TABLE IF NOT EXISTS fnb_menu_items (
         id                SERIAL PRIMARY KEY,
         "companyId"       INTEGER NOT NULL,
         "categoryId"      INTEGER NOT NULL,
         "inventoryItemId" INTEGER,
         name              VARCHAR(200) NOT NULL,
         description       TEXT,
         price             DECIMAL(20, 2) NOT NULL,
         "isAvailable"     BOOLEAN NOT NULL DEFAULT true,
         "preparationMins" INTEGER NOT NULL DEFAULT 15,
         "imageUrl"        VARCHAR(500),
         "isVegetarian"    BOOLEAN NOT NULL DEFAULT false,
         "isHalal"         BOOLEAN NOT NULL DEFAULT true,
         "spiceLevel"      INTEGER,
         "sortOrder"       INTEGER NOT NULL DEFAULT 0,
         "deletedAt"       TIMESTAMP,
         "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fnb_menu_items_company_category_avail_idx
         ON fnb_menu_items ("companyId", "categoryId", "isAvailable")`,

      // -------------------- Modifiers --------------------
      `CREATE TABLE IF NOT EXISTS fnb_modifiers (
         id            SERIAL PRIMARY KEY,
         "companyId"   INTEGER NOT NULL,
         "menuItemId"  INTEGER NOT NULL,
         name          VARCHAR(120) NOT NULL,
         "priceAdjust" DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "isRequired"  BOOLEAN NOT NULL DEFAULT false,
         "sortOrder"   INTEGER NOT NULL DEFAULT 0,
         "deletedAt"   TIMESTAMP,
         "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fnb_modifiers_company_menuitem_idx
         ON fnb_modifiers ("companyId", "menuItemId")`,

      // -------------------- Orders --------------------
      `CREATE TABLE IF NOT EXISTS fnb_orders (
         id                 SERIAL PRIMARY KEY,
         "companyId"        INTEGER NOT NULL,
         "outletId"         INTEGER NOT NULL,
         "tableId"          INTEGER,
         "reservationId"    INTEGER,
         "orderNumber"      VARCHAR(40) NOT NULL,
         "orderType"        VARCHAR(30) NOT NULL,
         status             VARCHAR(20) NOT NULL DEFAULT 'open',
         "guestCount"       INTEGER NOT NULL DEFAULT 1,
         subtotal           DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "serviceCharge"    DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "vatAmount"        DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "discountAmount"   DECIMAL(20, 2) NOT NULL DEFAULT 0,
         total              DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "settlementMethod" VARCHAR(40),
         "settledAt"        TIMESTAMPTZ,
         "settledById"      INTEGER,
         "posSessionId"     INTEGER,
         notes              TEXT,
         "serverId"         INTEGER,
         "openedAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
         "closedAt"         TIMESTAMPTZ,
         "deletedAt"        TIMESTAMP,
         "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS fnb_orders_company_ordernumber_uidx
         ON fnb_orders ("companyId", "orderNumber")`,
      `CREATE INDEX IF NOT EXISTS fnb_orders_company_outlet_status_idx
         ON fnb_orders ("companyId", "outletId", status)`,
      `CREATE INDEX IF NOT EXISTS fnb_orders_reservation_idx
         ON fnb_orders ("reservationId")`,

      // -------------------- Order Items --------------------
      `CREATE TABLE IF NOT EXISTS fnb_order_items (
         id                    SERIAL PRIMARY KEY,
         "orderId"             INTEGER NOT NULL,
         "menuItemId"          INTEGER NOT NULL,
         quantity              INTEGER NOT NULL DEFAULT 1,
         "unitPrice"           DECIMAL(20, 2) NOT NULL,
         "modifierAdjust"      DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "lineSubtotal"        DECIMAL(20, 2) NOT NULL,
         status                VARCHAR(20) NOT NULL DEFAULT 'pending',
         course                INTEGER NOT NULL DEFAULT 1,
         "specialInstructions" TEXT,
         "voidReason"          TEXT,
         "voidedById"          INTEGER,
         "voidedAt"            TIMESTAMPTZ,
         "sentToKitchenAt"     TIMESTAMPTZ,
         "servedAt"            TIMESTAMPTZ,
         "createdAt"           TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"           TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS fnb_order_items_order_status_idx
         ON fnb_order_items ("orderId", status)`,

      // -------------------- Order Item Modifier Snapshots --------------------
      `CREATE TABLE IF NOT EXISTS fnb_order_item_modifiers (
         id             SERIAL PRIMARY KEY,
         "orderItemId"  INTEGER NOT NULL,
         "modifierId"   INTEGER NOT NULL,
         "modifierName" VARCHAR(120) NOT NULL,
         "priceAdjust"  DECIMAL(20, 2) NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS fnb_order_item_modifiers_orderitem_idx
         ON fnb_order_item_modifiers ("orderItemId")`,
    ],
  },
  {
    id: '2026-04-26-013-banquets',
    description:
      'Banquets / Events module — function-room bookings, weddings, conferences, ' +
      'corporate events. Venues, event types, packages, bookings with catering + ' +
      'addons + payments. Distinct from sleeping-room reservations.',
    sql: [
      // -------------------- Venues --------------------
      `CREATE TABLE IF NOT EXISTS bq_venues (
         id               SERIAL PRIMARY KEY,
         "companyId"      INTEGER NOT NULL,
         "branchId"       INTEGER NOT NULL,
         name             VARCHAR(120) NOT NULL,
         description      TEXT,
         "capacityMin"    INTEGER NOT NULL DEFAULT 10,
         "capacityMax"    INTEGER NOT NULL DEFAULT 100,
         "squareMetres"   DECIMAL(10, 2),
         "hasStage"       BOOLEAN NOT NULL DEFAULT false,
         "hasAv"          BOOLEAN NOT NULL DEFAULT false,
         "hasParking"     BOOLEAN NOT NULL DEFAULT false,
         "baseHourlyRate" DECIMAL(20, 2) NOT NULL,
         "baseDailyRate"  DECIMAL(20, 2),
         "imageUrl"       VARCHAR(500),
         amenities        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
         "isActive"       BOOLEAN NOT NULL DEFAULT true,
         "deletedAt"      TIMESTAMP,
         "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS bq_venues_company_branch_active_idx
         ON bq_venues ("companyId", "branchId", "isActive")`,

      // -------------------- Event Types --------------------
      `CREATE TABLE IF NOT EXISTS bq_event_types (
         id                     SERIAL PRIMARY KEY,
         "companyId"            INTEGER NOT NULL,
         name                   VARCHAR(120) NOT NULL,
         description            TEXT,
         "defaultDurationHours" DECIMAL(8, 2) NOT NULL DEFAULT 4,
         "packageNotes"         TEXT,
         "isActive"             BOOLEAN NOT NULL DEFAULT true,
         "deletedAt"            TIMESTAMP,
         "createdAt"            TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"            TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS bq_event_types_company_active_idx
         ON bq_event_types ("companyId", "isActive")`,

      // -------------------- Packages --------------------
      `CREATE TABLE IF NOT EXISTS bq_packages (
         id               SERIAL PRIMARY KEY,
         "companyId"      INTEGER NOT NULL,
         name             VARCHAR(120) NOT NULL,
         description      TEXT,
         "perPersonPrice" DECIMAL(20, 2) NOT NULL,
         "flatPrice"      DECIMAL(20, 2) NOT NULL DEFAULT 0,
         inclusions       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
         "minGuests"      INTEGER NOT NULL DEFAULT 20,
         "isActive"       BOOLEAN NOT NULL DEFAULT true,
         "deletedAt"      TIMESTAMP,
         "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS bq_packages_company_active_idx
         ON bq_packages ("companyId", "isActive")`,

      // -------------------- Event Bookings --------------------
      `CREATE TABLE IF NOT EXISTS bq_event_bookings (
         id                  SERIAL PRIMARY KEY,
         "companyId"         INTEGER NOT NULL,
         "branchId"          INTEGER NOT NULL,
         "bookingNumber"     VARCHAR(40) NOT NULL,
         "eventTypeId"       INTEGER NOT NULL,
         "packageId"         INTEGER,
         "venueId"           INTEGER NOT NULL,
         "customerName"      VARCHAR(200) NOT NULL,
         "customerPhone"     VARCHAR(40),
         "customerEmail"     VARCHAR(120),
         "reservationId"     INTEGER,
         "eventTitle"        VARCHAR(200) NOT NULL,
         "eventDate"         TIMESTAMPTZ NOT NULL,
         "startTime"         VARCHAR(5) NOT NULL,
         "endTime"           VARCHAR(5) NOT NULL,
         "durationHours"     DECIMAL(8, 2) NOT NULL,
         "expectedGuests"    INTEGER NOT NULL,
         "actualGuests"      INTEGER,
         "setupRequirements" TEXT,
         "specialRequests"   TEXT,
         status              VARCHAR(20) NOT NULL DEFAULT 'inquiry',
         "venueRate"         DECIMAL(20, 2) NOT NULL,
         "cateringTotal"     DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "addonTotal"        DECIMAL(20, 2) NOT NULL DEFAULT 0,
         subtotal            DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "vatAmount"         DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "serviceCharge"     DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "discountAmount"    DECIMAL(20, 2) NOT NULL DEFAULT 0,
         total               DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "depositRequired"   DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "depositPaid"       DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "balanceDue"        DECIMAL(20, 2) NOT NULL DEFAULT 0,
         "inquiriedAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
         "quotedAt"          TIMESTAMP,
         "confirmedAt"       TIMESTAMP,
         "cancelledAt"       TIMESTAMP,
         "cancellationReason" TEXT,
         "completedAt"       TIMESTAMP,
         notes               TEXT,
         "bookedById"        INTEGER,
         "deletedAt"         TIMESTAMP,
         "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS bq_event_bookings_company_bookingnumber_uidx
         ON bq_event_bookings ("companyId", "bookingNumber")`,
      `CREATE INDEX IF NOT EXISTS bq_event_bookings_company_branch_status_idx
         ON bq_event_bookings ("companyId", "branchId", status)`,
      `CREATE INDEX IF NOT EXISTS bq_event_bookings_event_date_idx
         ON bq_event_bookings ("eventDate")`,
      `CREATE INDEX IF NOT EXISTS bq_event_bookings_venue_event_date_idx
         ON bq_event_bookings ("venueId", "eventDate")`,

      // -------------------- Catering line items --------------------
      `CREATE TABLE IF NOT EXISTS bq_event_catering (
         id          SERIAL PRIMARY KEY,
         "bookingId" INTEGER NOT NULL,
         "fnbItemId" INTEGER,
         name        VARCHAR(200) NOT NULL,
         quantity    INTEGER NOT NULL,
         "unitPrice" DECIMAL(20, 2) NOT NULL,
         "lineTotal" DECIMAL(20, 2) NOT NULL,
         category    VARCHAR(60),
         notes       TEXT,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS bq_event_catering_booking_idx
         ON bq_event_catering ("bookingId")`,

      // -------------------- Addon line items --------------------
      `CREATE TABLE IF NOT EXISTS bq_event_addons (
         id            SERIAL PRIMARY KEY,
         "bookingId"   INTEGER NOT NULL,
         name          VARCHAR(200) NOT NULL,
         quantity      INTEGER NOT NULL DEFAULT 1,
         "unitPrice"   DECIMAL(20, 2) NOT NULL,
         "lineTotal"   DECIMAL(20, 2) NOT NULL,
         "vendorName"  VARCHAR(200),
         "vendorPhone" VARCHAR(40),
         notes         TEXT,
         "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS bq_event_addons_booking_idx
         ON bq_event_addons ("bookingId")`,

      // -------------------- Payments --------------------
      `CREATE TABLE IF NOT EXISTS bq_event_payments (
         id                 SERIAL PRIMARY KEY,
         "companyId"        INTEGER NOT NULL,
         "bookingId"        INTEGER NOT NULL,
         "paymentDate"      TIMESTAMPTZ NOT NULL,
         amount             DECIMAL(20, 2) NOT NULL,
         "paymentMethod"    VARCHAR(40) NOT NULL,
         "paymentReference" VARCHAR(100),
         "paymentType"      VARCHAR(30) NOT NULL,
         notes              TEXT,
         "receivedById"     INTEGER,
         "deletedAt"        TIMESTAMP,
         "createdAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"        TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS bq_event_payments_company_booking_idx
         ON bq_event_payments ("companyId", "bookingId")`,
    ],
  },
  {
    id: '2026-04-26-014-loyalty',
    description:
      'Loyalty / Guest Profile module — unified guest tracking across hotel, F&B and ' +
      'banquets with points-based loyalty. Tiers, members, transactions, rewards, redemptions.',
    sql: [
      // -------------------- Tiers --------------------
      `CREATE TABLE IF NOT EXISTS loyalty_tiers (
         id                SERIAL PRIMARY KEY,
         "companyId"       INTEGER NOT NULL,
         name              VARCHAR(60) NOT NULL,
         "minPoints"       INTEGER NOT NULL,
         "pointsMultiplier" DECIMAL(8, 4) NOT NULL DEFAULT 1.0,
         benefits          TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
         "iconColor"       VARCHAR(20),
         "sortOrder"       INTEGER NOT NULL DEFAULT 0,
         "isActive"        BOOLEAN NOT NULL DEFAULT true,
         "deletedAt"       TIMESTAMP,
         "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS loyalty_tiers_company_minpoints_idx
         ON loyalty_tiers ("companyId", "minPoints")`,

      // -------------------- Members --------------------
      `CREATE TABLE IF NOT EXISTS loyalty_members (
         id                  SERIAL PRIMARY KEY,
         "companyId"         INTEGER NOT NULL,
         "membershipNumber"  VARCHAR(40) NOT NULL,
         "firstName"         VARCHAR(100) NOT NULL,
         "lastName"          VARCHAR(100) NOT NULL,
         email               VARCHAR(120),
         phone               VARCHAR(40),
         "dateOfBirth"       DATE,
         "preferredCurrency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
         "preferredRoomType" VARCHAR(50),
         "dietaryNotes"      TEXT,
         "marketingConsent"  BOOLEAN NOT NULL DEFAULT false,
         status              VARCHAR(20) NOT NULL DEFAULT 'active',
         "enrolledAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
         "lifetimePoints"    INTEGER NOT NULL DEFAULT 0,
         "currentPoints"     INTEGER NOT NULL DEFAULT 0,
         "currentTierId"     INTEGER,
         "totalStays"        INTEGER NOT NULL DEFAULT 0,
         "totalFnbOrders"    INTEGER NOT NULL DEFAULT 0,
         "totalBanquets"     INTEGER NOT NULL DEFAULT 0,
         "lastVisitAt"       TIMESTAMP,
         notes               TEXT,
         "deletedAt"         TIMESTAMP,
         "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
         CONSTRAINT loyalty_members_company_membership_unique
           UNIQUE ("companyId", "membershipNumber")
       )`,
      `CREATE INDEX IF NOT EXISTS loyalty_members_company_status_idx
         ON loyalty_members ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS loyalty_members_email_idx
         ON loyalty_members (email)`,
      `CREATE INDEX IF NOT EXISTS loyalty_members_phone_idx
         ON loyalty_members (phone)`,

      // -------------------- Transactions --------------------
      `CREATE TABLE IF NOT EXISTS loyalty_transactions (
         id                SERIAL PRIMARY KEY,
         "companyId"       INTEGER NOT NULL,
         "memberId"        INTEGER NOT NULL,
         "transactionType" VARCHAR(20) NOT NULL,
         source            VARCHAR(30) NOT NULL,
         "sourceId"        INTEGER,
         points            INTEGER NOT NULL,
         "cashEquivalent"  DECIMAL(20, 2),
         description       TEXT,
         "expiresAt"       TIMESTAMPTZ,
         "recordedById"    INTEGER,
         "recordedAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
         "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS loyalty_transactions_company_member_recorded_idx
         ON loyalty_transactions ("companyId", "memberId", "recordedAt")`,
      `CREATE INDEX IF NOT EXISTS loyalty_transactions_source_idx
         ON loyalty_transactions (source, "sourceId")`,

      // -------------------- Rewards --------------------
      `CREATE TABLE IF NOT EXISTS loyalty_rewards (
         id                   SERIAL PRIMARY KEY,
         "companyId"          INTEGER NOT NULL,
         name                 VARCHAR(120) NOT NULL,
         description          TEXT,
         "pointsCost"         INTEGER NOT NULL,
         "rewardType"         VARCHAR(30) NOT NULL,
         "cashValue"          DECIMAL(20, 2),
         "validityDays"       INTEGER NOT NULL DEFAULT 180,
         "isActive"           BOOLEAN NOT NULL DEFAULT true,
         "imageUrl"           VARCHAR(500),
         "termsAndConditions" TEXT,
         "deletedAt"          TIMESTAMP,
         "createdAt"          TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"          TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS loyalty_rewards_company_active_idx
         ON loyalty_rewards ("companyId", "isActive")`,

      // -------------------- Redemptions --------------------
      `CREATE TABLE IF NOT EXISTS loyalty_redemptions (
         id               SERIAL PRIMARY KEY,
         "companyId"      INTEGER NOT NULL,
         "memberId"       INTEGER NOT NULL,
         "rewardId"       INTEGER NOT NULL,
         "redemptionCode" VARCHAR(40) NOT NULL,
         "pointsSpent"    INTEGER NOT NULL,
         status           VARCHAR(20) NOT NULL DEFAULT 'issued',
         "issuedAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
         "expiresAt"      TIMESTAMPTZ NOT NULL,
         "usedAt"         TIMESTAMP,
         "usedAtSource"   VARCHAR(30),
         "usedAtSourceId" INTEGER,
         notes            TEXT,
         "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
         CONSTRAINT loyalty_redemptions_company_code_unique
           UNIQUE ("companyId", "redemptionCode")
       )`,
      `CREATE INDEX IF NOT EXISTS loyalty_redemptions_company_member_status_idx
         ON loyalty_redemptions ("companyId", "memberId", status)`,
    ],
  },
  {
    id: '2026-04-26-015-ota-channels',
    description:
      'OTA / Channel Manager framework — registry, room mapping, sync jobs and ' +
      'inbound reservations scaffolding for Booking.com, Expedia, Agoda, Airbnb, Hotels.com',
    sql: [
      // -------------------- Channels --------------------
      `CREATE TABLE IF NOT EXISTS ota_channels (
         id                       SERIAL PRIMARY KEY,
         "companyId"              INTEGER NOT NULL,
         "branchId"               INTEGER,
         "channelCode"            VARCHAR(40) NOT NULL,
         "displayName"            VARCHAR(120) NOT NULL,
         status                   VARCHAR(20) NOT NULL DEFAULT 'disconnected',
         "apiCredentialsRef"      VARCHAR(200),
         "hotelIdOnChannel"       VARCHAR(100),
         "syncRatesEnabled"       BOOLEAN NOT NULL DEFAULT true,
         "syncInventoryEnabled"   BOOLEAN NOT NULL DEFAULT true,
         "syncReservationsEnabled" BOOLEAN NOT NULL DEFAULT true,
         "lastSyncAt"             TIMESTAMP,
         "lastErrorAt"            TIMESTAMP,
         "lastErrorMessage"       TEXT,
         config                   JSONB,
         notes                    TEXT,
         "deletedAt"              TIMESTAMP,
         "createdAt"              TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"              TIMESTAMP NOT NULL DEFAULT NOW(),
         CONSTRAINT ota_channels_company_branch_code_unique
           UNIQUE ("companyId", "branchId", "channelCode")
       )`,
      `CREATE INDEX IF NOT EXISTS ota_channels_company_status_idx
         ON ota_channels ("companyId", status)`,

      // -------------------- Room mappings --------------------
      `CREATE TABLE IF NOT EXISTS ota_room_mappings (
         id                    SERIAL PRIMARY KEY,
         "companyId"           INTEGER NOT NULL,
         "channelId"           INTEGER NOT NULL,
         "hotelRoomTypeId"     INTEGER NOT NULL,
         "channelRoomTypeId"   VARCHAR(100) NOT NULL,
         "channelRoomTypeName" VARCHAR(200),
         "channelRatePlanIds"  TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
         "isActive"            BOOLEAN NOT NULL DEFAULT true,
         notes                 TEXT,
         "deletedAt"           TIMESTAMP,
         "createdAt"           TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"           TIMESTAMP NOT NULL DEFAULT NOW(),
         CONSTRAINT ota_room_mappings_channel_room_unique
           UNIQUE ("channelId", "hotelRoomTypeId")
       )`,
      `CREATE INDEX IF NOT EXISTS ota_room_mappings_company_channel_idx
         ON ota_room_mappings ("companyId", "channelId")`,

      // -------------------- Sync jobs --------------------
      `CREATE TABLE IF NOT EXISTS ota_sync_jobs (
         id              SERIAL PRIMARY KEY,
         "companyId"     INTEGER NOT NULL,
         "channelId"     INTEGER NOT NULL,
         "jobType"       VARCHAR(40) NOT NULL,
         status          VARCHAR(20) NOT NULL DEFAULT 'pending',
         payload         JSONB,
         result          JSONB,
         "errorMessage"  TEXT,
         "attemptCount"  INTEGER NOT NULL DEFAULT 0,
         "maxAttempts"   INTEGER NOT NULL DEFAULT 3,
         "scheduledFor"  TIMESTAMP NOT NULL DEFAULT NOW(),
         "startedAt"     TIMESTAMP,
         "finishedAt"    TIMESTAMP,
         "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS ota_sync_jobs_company_channel_status_idx
         ON ota_sync_jobs ("companyId", "channelId", status)`,
      `CREATE INDEX IF NOT EXISTS ota_sync_jobs_scheduled_status_idx
         ON ota_sync_jobs ("scheduledFor", status)`,

      // -------------------- Inbound reservations --------------------
      `CREATE TABLE IF NOT EXISTS ota_inbound_reservations (
         id                     SERIAL PRIMARY KEY,
         "companyId"            INTEGER NOT NULL,
         "channelId"            INTEGER NOT NULL,
         "channelReservationId" VARCHAR(100) NOT NULL,
         "rawPayload"           JSONB NOT NULL,
         "guestName"            VARCHAR(200) NOT NULL,
         "guestEmail"           VARCHAR(120),
         "guestPhone"           VARCHAR(40),
         "checkInDate"          DATE NOT NULL,
         "checkOutDate"         DATE NOT NULL,
         "channelRoomTypeId"    VARCHAR(100) NOT NULL,
         "totalAmount"          DECIMAL(20, 2) NOT NULL,
         currency               VARCHAR(10) NOT NULL DEFAULT 'NGN',
         status                 VARCHAR(20) NOT NULL DEFAULT 'received',
         "hotelReservationId"   INTEGER,
         "errorMessage"         TEXT,
         "receivedAt"           TIMESTAMP NOT NULL DEFAULT NOW(),
         "mappedAt"             TIMESTAMP,
         "createdAt"            TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"            TIMESTAMP NOT NULL DEFAULT NOW(),
         CONSTRAINT ota_inbound_reservations_channel_resv_unique
           UNIQUE ("channelId", "channelReservationId")
       )`,
      `CREATE INDEX IF NOT EXISTS ota_inbound_reservations_company_status_idx
         ON ota_inbound_reservations ("companyId", status)`,
    ],
  },

  // ============================================================================
  // 2026-04-26: Repair orphan beginning balances
  // ============================================================================
  // Historical bug: postBalance() wrapped JE creation in try/catch and
  // swallowed errors, so beginning balances marked status='posted' but with
  // no matching journal_entry. The trial balance never showed the inventory
  // increase. Fix in code; this repair generates the missing JE for any
  // legacy orphan, using the same item-override → category-mapping → 109%
  // fallback resolver. Idempotent: only acts on rows that need it.
  {
    id: '2026-04-26-016-repair-orphan-beginning-balances',
    description: 'Generate missing journal entries for posted beginning balances',
    sql: [
      // Ensure normalBalance column exists on older schemas (the column is
      // referenced in the auto-equity-account creation block below; some
      // tenant schemas predate it).
      `ALTER TABLE ifrs_accounts ADD COLUMN IF NOT EXISTS "normalBalance" VARCHAR(20) DEFAULT 'debit'`,
      `DO $$
       DECLARE
         v_balance RECORD;
         v_inv_acct INT;
         v_eq_acct INT;
         v_je_id INT;
         v_next_num INT;
         v_entry_number TEXT;
         v_item_ref TEXT;
         v_next_eq_code TEXT;
         v_repaired INT := 0;
         v_skipped INT := 0;
       BEGIN
         FOR v_balance IN
           SELECT bb.* FROM inv_item_beginning_balances bb
            WHERE bb.status = 'posted'
              AND bb."deletedAt" IS NULL
              AND bb."totalValue" > 0
              AND (
                bb."journalEntryId" IS NULL
                OR NOT EXISTS (
                  SELECT 1 FROM journal_entries je
                  WHERE je.id = bb."journalEntryId" AND je.status = 'posted'
                )
              )
         LOOP
           v_inv_acct := NULL;
           v_eq_acct := NULL;

           -- 1. Item-level override
           SELECT i."inventoryAccountId" INTO v_inv_acct
             FROM inv_items i
            WHERE i.id = v_balance."itemId" AND i."companyId" = v_balance."companyId";
           IF v_inv_acct IS NOT NULL THEN
             SELECT id INTO v_inv_acct FROM ifrs_accounts
              WHERE id = v_inv_acct AND "companyId" = v_balance."companyId"
                AND "isPosting" = true AND "isActive" = true AND "deletedAt" IS NULL;
           END IF;

           -- 2. Category mapping
           IF v_inv_acct IS NULL THEN
             SELECT (ic."glAccountMappings"->>'inventory_gl_account_id')::int INTO v_inv_acct
               FROM inv_items i
               JOIN inv_item_categories ic ON ic.id = i."categoryId"
              WHERE i.id = v_balance."itemId" AND i."companyId" = v_balance."companyId";
             IF v_inv_acct IS NOT NULL THEN
               SELECT id INTO v_inv_acct FROM ifrs_accounts
                WHERE id = v_inv_acct AND "companyId" = v_balance."companyId"
                  AND "isPosting" = true AND "isActive" = true AND "deletedAt" IS NULL;
             END IF;
           END IF;

           -- 3. 109% fallback
           IF v_inv_acct IS NULL THEN
             SELECT id INTO v_inv_acct FROM ifrs_accounts
              WHERE "companyId" = v_balance."companyId" AND code LIKE '109%'
                AND "isPosting" = true AND "isActive" = true AND "deletedAt" IS NULL
              ORDER BY code LIMIT 1;
           END IF;

           IF v_inv_acct IS NULL THEN
             RAISE NOTICE 'BB#% (item %): skipping repair — no inventory account; operator must create one', v_balance.id, v_balance."itemId";
             v_skipped := v_skipped + 1;
             CONTINUE;
           END IF;

           -- Find or create Opening Balances equity
           SELECT id INTO v_eq_acct FROM ifrs_accounts
            WHERE "companyId" = v_balance."companyId"
              AND "accountType" = 'equity' AND LOWER(name) LIKE '%opening%'
              AND "isPosting" = true AND "isActive" = true AND "deletedAt" IS NULL
            ORDER BY code LIMIT 1;

           IF v_eq_acct IS NULL THEN
             SELECT (COALESCE(MAX(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '')::int), 300000) + 1)::text
               INTO v_next_eq_code
               FROM ifrs_accounts
              WHERE "companyId" = v_balance."companyId" AND code LIKE '30%'
                AND "deletedAt" IS NULL;

             INSERT INTO ifrs_accounts (
               "companyId", code, name, "accountType",
               "isPosting", "isActive", "normalBalance", "createdAt", "updatedAt"
             ) VALUES (
               v_balance."companyId", v_next_eq_code, 'Opening Balances', 'equity',
               true, true, 'credit', NOW(), NOW()
             ) RETURNING id INTO v_eq_acct;
           END IF;

           SELECT COALESCE(MAX((regexp_match("entryNumber", '([0-9]+)$'))[1]::int), 0) + 1
             INTO v_next_num
             FROM journal_entries WHERE "companyId" = v_balance."companyId";
           v_entry_number := 'JE-' || EXTRACT(YEAR FROM NOW())::text || '-' || LPAD(v_next_num::text, 5, '0');

           SELECT i.code || ' - ' || i.name INTO v_item_ref
             FROM inv_items i WHERE i.id = v_balance."itemId";

           INSERT INTO journal_entries (
             "companyId", "entryNumber", "entryDate", reference, narration,
             "totalDebit", "totalCredit", status, "journalType",
             "sourceType", "sourceId", "postedAt", "createdAt", "updatedAt"
           ) VALUES (
             v_balance."companyId", v_entry_number,
             COALESCE(v_balance."balanceDate", NOW()),
             'OB-' || v_balance.id::text,
             'Opening Balance (repair) - ' || COALESCE(v_item_ref, 'Item #' || v_balance."itemId"::text),
             v_balance."totalValue", v_balance."totalValue", 'posted', 'general',
             'beginning_balance', v_balance.id, NOW(), NOW(), NOW()
           ) RETURNING id INTO v_je_id;

           INSERT INTO journal_entry_line_items ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
           VALUES (v_je_id, v_inv_acct, v_balance."totalValue", 0,
                   'Opening inventory (repair) - ' || COALESCE(v_item_ref, ''), NOW(), NOW());

           INSERT INTO journal_entry_line_items ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
           VALUES (v_je_id, v_eq_acct, 0, v_balance."totalValue",
                   'Opening balance equity (repair) - ' || COALESCE(v_item_ref, ''), NOW(), NOW());

           UPDATE inv_item_beginning_balances
              SET "journalEntryId" = v_je_id, "updatedAt" = NOW()
            WHERE id = v_balance.id;

           v_repaired := v_repaired + 1;
           RAISE NOTICE 'BB#% (item %): repaired, JE %', v_balance.id, v_balance."itemId", v_entry_number;
         END LOOP;

         IF v_repaired > 0 OR v_skipped > 0 THEN
           RAISE NOTICE 'Beginning-balance repair: % repaired, % skipped (no inventory account)', v_repaired, v_skipped;
         END IF;
       END $$`,
    ],
  },

  // ============================================================================
  // 2026-04-26: ISR universal approval flow
  // ============================================================================
  // Internal Stock Request approval was hardcoded to read inv_settings booleans.
  // Now uses the universal process_approval_flows registry like every other module.
  // Seeds the flow + 3 steps (HOD, Audit, Issue Stock) for each existing company,
  // and migrates any in-flight ISRs to have matching process_approval_statuses rows.
  // Idempotent — safe to re-run.
  {
    id: '2026-04-26-017-isr-universal-approval-flow',
    description: 'Seed Internal Stock Request universal approval flow + migrate in-flight ISRs',
    sql: [
      // 1. Insert flow per company (skip companies that already have one)
      `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "parallelApproval", "createdAt", "updatedAt")
       SELECT c.id, 'Internal Stock Request Approval', 'internal_stock_requests', 'inventory.stock-requests',
              'Configurable approval workflow for internal stock requests', true, false, NOW(), NOW()
       FROM companies c
       WHERE c."deletedAt" IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flows
           WHERE "companyId" = c.id AND "approvableType" = 'internal_stock_requests'
         )`,

      // 2. Insert steps for each newly seeded flow. Defensive: skip if role missing.
      // Step 1: HOD
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT f.id, f."companyId", r.id, 'HOD Approval', 1, 'APPROVE', true, true, false, false, NOW(), NOW()
       FROM process_approval_flows f
       JOIN roles r ON r.name = 'hod' AND r."guardName" = 'web'
       WHERE f."approvableType" = 'internal_stock_requests'
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps s
           WHERE s."processApprovalFlowId" = f.id AND s."stepOrder" = 1
         )`,

      // Step 2: Audit
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT f.id, f."companyId", r.id, 'Audit Review', 2, 'APPROVE', true, true, false, false, NOW(), NOW()
       FROM process_approval_flows f
       JOIN roles r ON r.name = 'audit' AND r."guardName" = 'web'
       WHERE f."approvableType" = 'internal_stock_requests'
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps s
           WHERE s."processApprovalFlowId" = f.id AND s."stepOrder" = 2
         )`,

      // Step 3 (terminal): Issue Stock — Inventory Manager preferred, fallback cashier.
      // First try Inventory Manager.
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT f.id, f."companyId", r.id, 'Issue Stock', 3, 'APPROVE', true, true, false, true, NOW(), NOW()
       FROM process_approval_flows f
       JOIN roles r ON r.name = 'Inventory Manager' AND r."guardName" = 'web'
       WHERE f."approvableType" = 'internal_stock_requests'
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps s
           WHERE s."processApprovalFlowId" = f.id AND s."stepOrder" = 3
         )`,

      // Fallback: cashier for any flow that didn't get the Inventory Manager step
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT f.id, f."companyId", r.id, 'Issue Stock', 3, 'APPROVE', true, true, false, true, NOW(), NOW()
       FROM process_approval_flows f
       JOIN roles r ON r.name = 'cashier' AND r."guardName" = 'web'
       WHERE f."approvableType" = 'internal_stock_requests'
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps s
           WHERE s."processApprovalFlowId" = f.id AND s."stepOrder" = 3
         )`,

      // 3. Migrate in-flight ISRs (PENDING_HOD_APPROVAL / PENDING_AUDIT_APPROVAL) that
      // don't yet have a matching process_approval_statuses row. We create the status
      // row + a single PENDING process_approvals row pointing at the matching step
      // (HOD or Audit) so the universal pending-approvals UI sees these in-flight ISRs.
      // Earlier already-completed steps are reflected with status='APPROVED' in the
      // status.steps JSON but no historical process_approvals row is fabricated
      // (we don't have approver/timestamp data for them on this side).
      `DO $$
       DECLARE
         v_isr RECORD;
         v_flow RECORD;
         v_status_id INT;
         v_steps_json JSONB;
         v_target_order INT;
         v_target_step RECORD;
         v_migrated INT := 0;
       BEGIN
         FOR v_isr IN
           SELECT r.id, r."companyId", r.status, r."requesterId"
             FROM inv_isr_requests r
            WHERE r.status IN ('pending_hod_approval', 'pending_audit_approval')
              AND r."deletedAt" IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM process_approval_statuses pas
                 WHERE pas."approvableType" = 'internal_stock_requests'
                   AND pas."approvableId" = r.id
              )
         LOOP
           SELECT id, "companyId" INTO v_flow
             FROM process_approval_flows
            WHERE "approvableType" = 'internal_stock_requests'
              AND "companyId" = v_isr."companyId"
              AND "isActive" = true
            ORDER BY "createdAt" DESC LIMIT 1;

           IF v_flow.id IS NULL THEN
             RAISE NOTICE 'ISR #% (company %): no flow seeded, skipping migration', v_isr.id, v_isr."companyId";
             CONTINUE;
           END IF;

           v_target_order := CASE v_isr.status
             WHEN 'pending_hod_approval' THEN 1
             WHEN 'pending_audit_approval' THEN 2
           END;

           SELECT id, name, "stepOrder" INTO v_target_step
             FROM process_approval_flow_steps
            WHERE "processApprovalFlowId" = v_flow.id
              AND "stepOrder" = v_target_order
            LIMIT 1;

           IF v_target_step.id IS NULL THEN
             RAISE NOTICE 'ISR #%: target step (order %) missing in flow %, skipping', v_isr.id, v_target_order, v_flow.id;
             CONTINUE;
           END IF;

           -- Build steps JSON reflecting current ISR state:
           -- - steps before target → APPROVED (no historical approver data)
           -- - target step → PENDING
           -- - steps after target → WAITING
           SELECT jsonb_agg(
                    jsonb_build_object(
                      'stepId', s.id,
                      'stepOrder', s."stepOrder",
                      'name', s.name,
                      'status', CASE
                        WHEN s."stepOrder" < v_target_order THEN 'APPROVED'
                        WHEN s."stepOrder" = v_target_order THEN 'PENDING'
                        ELSE 'WAITING'
                      END
                    ) ORDER BY s."stepOrder"
                  )
             INTO v_steps_json
             FROM process_approval_flow_steps s
            WHERE s."processApprovalFlowId" = v_flow.id;

           INSERT INTO process_approval_statuses
             ("approvableType", "approvableId", steps, status, "creatorId", "companyId", "createdAt", "updatedAt")
           VALUES
             ('internal_stock_requests', v_isr.id, v_steps_json, 'PENDING',
              v_isr."requesterId", v_isr."companyId", NOW(), NOW())
           RETURNING id INTO v_status_id;

           INSERT INTO process_approvals
             ("approvableType", "approvableId", "processApprovalFlowStepId", "approvalAction",
              "userId", "companyId", "createdAt", "updatedAt")
           VALUES
             ('internal_stock_requests', v_isr.id, v_target_step.id, 'Pending',
              v_isr."requesterId", v_isr."companyId", NOW(), NOW());

           v_migrated := v_migrated + 1;
         END LOOP;

         IF v_migrated > 0 THEN
           RAISE NOTICE 'ISR universal-approval migration: % in-flight ISRs registered', v_migrated;
         END IF;
       END $$`,
    ],
  },
  // ============================================================================
  // 2026-04-27: Veterinary settings — extended fields (form parity)
  // ============================================================================
  {
    id: '2026-04-27-018-vet-settings-extended-fields',
    description: 'Add extended fields to vet_settings (working hours, appointments, reminders, units, prefixes)',
    sql: [
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "workingHoursStart" VARCHAR(10)`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "workingHoursEnd" VARCHAR(10)`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "workingDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[]`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "appointmentDuration" INTEGER`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "appointmentSlotInterval" INTEGER`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "enableSmsReminders" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "enableOnlineBooking" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "defaultWeightUnit" VARCHAR(10) DEFAULT 'kg'`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "defaultTemperatureUnit" VARCHAR(20) DEFAULT 'celsius'`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "enableAutoCharging" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "enableDispensingIntegration" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "visitNumberPrefix" VARCHAR(20)`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "appointmentNumberPrefix" VARCHAR(20)`,
      `ALTER TABLE vet_settings ADD COLUMN IF NOT EXISTS "labOrderNumberPrefix" VARCHAR(20)`,
    ],
  },
  // ============================================================================
  // 2026-04-27: School Management — add 'ALL' to SmStudentCategory enum
  // Frontend fee-structures form defaults to ALL (wildcard) and the invoice
  // generator query compares against 'ALL' — but the enum only had DAY/BOARDER,
  // so generation crashed with `invalid input value for enum "SmStudentCategory": "ALL"`.
  // ============================================================================
  {
    id: '2026-04-27-019-sm-student-category-all',
    description: 'Add ALL value to SmStudentCategory enum so fee structures can apply to all categories',
    sql: [
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_enum e
           JOIN pg_type t ON t.oid = e.enumtypid
           WHERE t.typname = 'SmStudentCategory' AND e.enumlabel = 'ALL'
         ) THEN
           ALTER TYPE "SmStudentCategory" ADD VALUE 'ALL';
         END IF;
       END $$`,
    ],
  },
  // ============================================================================
  // 2026-04-28: BOM versioning — fix uniqueness to allow multiple versions per code
  // The previous unique index ("companyId", code) WHERE "deletedAt" IS NULL was
  // correct before versioning existed but blocks createVersion() from inserting
  // v2 of an existing code. Replace with a partial index keyed on isCurrentVersion,
  // which matches the real invariant: "only one current version per code".
  // ============================================================================
  // ============================================================================
  // 2026-04-28: Payroll GL accounts — enables automatic journal posting on
  // payroll approval. Currently approve() only flips status; with these
  // columns set, PayrollPostingService can DR salary expense + employer
  // contribs and CR each statutory liability + net payable.
  // ============================================================================
  {
    id: '2026-04-28-002-payroll-gl-accounts',
    description: 'Add 11 GL account columns to hr_payroll_settings for automatic payroll journal posting on approval',
    sql: [
      // DR side (expense)
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "salaryExpenseAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "pensionExpenseAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "nhisExpenseAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "otherStatutoryExpenseAccountId" INTEGER`,
      // CR side (liability / payable)
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "netSalaryPayableAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "payeLiabilityAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "pensionLiabilityAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "nhfLiabilityAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "nhisLiabilityAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "otherStatutoryLiabilityAccountId" INTEGER`,
      `ALTER TABLE hr_payroll_settings ADD COLUMN IF NOT EXISTS "otherDeductionsPayableAccountId" INTEGER`,
    ],
  },
  {
    id: '2026-04-28-001-bom-versioning-uniqueness',
    description: 'Drop legacy (companyId, code) uniqueness on mfg_boms; replace with partial index on current version only, so createVersion can insert v2+',
    sql: [
      // Drop any leftover Prisma-generated unique constraint (in case prisma db push re-added it)
      `ALTER TABLE mfg_boms DROP CONSTRAINT IF EXISTS "mfg_boms_companyId_code_key"`,
      // Drop the overly-restrictive partial index from 2026-04-14-003
      `DROP INDEX IF EXISTS idx_mfg_boms_company_code_active`,
      // Normalize: if any (company, code) already has multiple isCurrentVersion=true
      // rows (legacy data from before createVersion's flip-old-versions logic was
      // introduced), keep only the highest-version row as current. Otherwise the
      // partial unique index below would fail to create.
      `WITH ranked AS (
         SELECT id,
                ROW_NUMBER() OVER (PARTITION BY "companyId", code ORDER BY version DESC, id DESC) AS rn
         FROM mfg_boms
         WHERE "deletedAt" IS NULL AND "isCurrentVersion" = true
       )
       UPDATE mfg_boms SET "isCurrentVersion" = false
       WHERE id IN (SELECT id FROM ranked WHERE rn > 1)`,
      // Enforce the real invariant: at most one current version per (company, code)
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_mfg_boms_company_code_current
         ON mfg_boms ("companyId", code)
         WHERE "isCurrentVersion" = true AND "deletedAt" IS NULL`,
      // Keep a non-unique lookup index for query performance (Prisma also declares this)
      `CREATE INDEX IF NOT EXISTS idx_mfg_boms_company_code ON mfg_boms ("companyId", code)`,
    ],
  },
  // ============================================================================
  // 2026-04-28: Fleet Management — drivers table
  // The DriversService queries `drivers` directly via raw SQL, but the table
  // was never declared in schema.tenant.prisma so prisma db push doesn't
  // create it. /fleet-management/drivers crashes on every tenant with
  // `relation "drivers" does not exist`.
  // ============================================================================
  {
    id: '2026-04-28-003-fleet-drivers-table',
    description: 'Create drivers table for fleet-management module (fixes "relation drivers does not exist")',
    sql: [
      `CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        name VARCHAR(200) NOT NULL,
        "employeeId" VARCHAR(50),
        "licenseNumber" VARCHAR(100) NOT NULL,
        "licenseType" VARCHAR(20) NOT NULL,
        "licenseExpiry" DATE NOT NULL,
        "contactNumber" VARCHAR(50),
        email VARCHAR(200),
        address VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        "dateOfBirth" DATE,
        "hireDate" DATE,
        "terminationDate" DATE,
        "emergencyContactName" VARCHAR(200),
        "emergencyContactPhone" VARCHAR(50),
        notes TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdBy" INTEGER,
        "updatedBy" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // Enforce one-license-per-company on non-deleted rows (matches the service's existence check)
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_company_license_active
         ON drivers ("companyId", "licenseNumber")
         WHERE "deletedAt" IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_drivers_company_status ON drivers ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS idx_drivers_company_deleted ON drivers ("companyId", "deletedAt")`,
    ],
  },
  // ============================================================================
  // 2026-04-28: Fleet vehicles — add fuelCapacity and ownershipType columns
  // The DTO has accepted these fields for a while but the columns were never
  // declared in schema.tenant.prisma, so prisma db push never created them.
  // Vehicle creation crashed with "column fuelCapacity of relation vehicles
  // does not exist" on the first user that filled in fuel-capacity, and would
  // have crashed identically on ownershipType once that field was wired up.
  // ============================================================================
  {
    id: '2026-04-28-004-vehicles-fuel-and-ownership',
    description: 'Add fuelCapacity and ownershipType columns to vehicles (DTO had them, DB did not)',
    sql: [
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "fuelCapacity" NUMERIC(10,2)`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "ownershipType" VARCHAR(20)`,
    ],
  },
  // ============================================================================
  // 2026-04-28: Vehicle current-odometer column normalization
  // App code (DTO, service, frontend, all read/write paths) uses
  // `currentOdometer`. Prisma schema had it as `currentMileage` — a column
  // that never matched the codebase. Service INSERTs blew up with
  // `column "currentOdometer" of relation "vehicles" does not exist`.
  // Reconcile: rename old column where it exists; create new where neither
  // does. Idempotent — safe to re-run.
  // ============================================================================
  // ============================================================================
  // 2026-04-28: Vehicle status enum reconciliation
  // The DTO/service/frontend all use ACTIVE/INACTIVE/IN_MAINTENANCE/SOLD/
  // SCRAPPED. The Prisma enum was AVAILABLE/IN_USE/MAINTENANCE/RESERVED/
  // DISPOSED. Vehicle creation crashed with `invalid input value for enum
  // "VehicleStatus": "ACTIVE"`. Add the new enum values, then remap any
  // legacy rows. Old values are left in the type (Postgres can't easily
  // drop enum values) but no app code references them.
  // ============================================================================
  // ============================================================================
  // 2026-04-28: Trips table — reconcile column names to match the DTO/service
  // The DTO/service/frontend reference `description, startOdometer, endOdometer,
  // cargo, completionNotes, distance` while the Prisma schema had `notes (kept),
  // startMileage, endMileage, cargoDescription, cargoWeight, distanceTraveled,
  // customerFeedback (kept)`. Trip creation crashed at the first missing column.
  // Rename existing columns where present; add new ones where absent. Idempotent.
  // ============================================================================
  // ============================================================================
  // 2026-04-28: IFRS Chart of Accounts backfill
  // Some tenants (e.g. littleme, bvcpartners) were provisioned with no
  // chart-of-accounts seed, leaving every CoA-driven feature broken.
  // This migration is idempotent: per company, if no ifrs_accounts rows
  // exist, seed the canonical 33 categories + 41 accounts. Tenants that
  // already have a CoA are skipped — companies that intentionally
  // overwrite the default keep their data.
  // The same data is seeded by tenant-database.service.ts on new tenant
  // provisioning; this migration backfills existing tenants.
  // ============================================================================
  {
    id: '2026-04-28-010-ifrs-chart-of-accounts-backfill',
    description: 'Backfill IFRS chart of accounts for any company missing it (idempotent — skips companies that already have accounts)',
    sql: [
      `DO $$
       DECLARE
         v_company       RECORD;
         v_entity_id     INTEGER;
         v_currency_id   INTEGER;
         v_account_count INTEGER;
       BEGIN
         FOR v_company IN
           SELECT id FROM companies WHERE "deletedAt" IS NULL
         LOOP
           SELECT COUNT(*) INTO v_account_count
           FROM ifrs_accounts
           WHERE "companyId" = v_company.id;

           IF v_account_count > 0 THEN
             CONTINUE; -- Company already has its own CoA — leave it alone.
           END IF;

           SELECT id INTO v_entity_id FROM ifrs_entities ORDER BY id LIMIT 1;
           SELECT id INTO v_currency_id FROM ifrs_currencies WHERE code = 'NGN' LIMIT 1;

           IF v_entity_id IS NULL OR v_currency_id IS NULL THEN
             RAISE NOTICE 'Skipping company %: no IFRS entity or NGN currency seeded', v_company.id;
             CONTINUE;
           END IF;

           -- Insert any missing categories (no unique constraint, so use NOT EXISTS)
           INSERT INTO ifrs_categories ("entityId", name, "categoryType", "createdAt", "updatedAt")
           SELECT v_entity_id, x.name, x.ctype, NOW(), NOW()
           FROM (VALUES
             ('Current Assets',          'current_asset'),
             ('Non-Current Assets',      'non_current_asset'),
             ('Bank',                    'bank'),
             ('Cash',                    'current_asset'),
             ('Receivable',              'receivable'),
             ('Inventory',               'inventory'),
             ('Fixed Assets',            'non_current_asset'),
             ('Prepayment',              'current_asset'),
             ('Contra Asset',            'contra_asset'),
             ('Current Liabilities',     'current_liability'),
             ('Non-Current Liabilities', 'non_current_liability'),
             ('Payable',                 'payable'),
             ('Credit Card',             'current_liability'),
             ('Long Term Liability',     'non_current_liability'),
             ('VAT Payable',             'payable'),
             ('WHT Payable',             'payable'),
             ('Control',                 'control'),
             ('Equity',                  'equity'),
             ('Retained Earnings',       'equity'),
             ('Share Capital',           'equity'),
             ('Income',                  'operating_revenue'),
             ('Sales',                   'operating_revenue'),
             ('Service Revenue',         'operating_revenue'),
             ('Other Income',            'non_operating_revenue'),
             ('Discount Received',       'non_operating_revenue'),
             ('Expenses',                'operating_expense'),
             ('Direct Costs',            'direct_expense'),
             ('Cost of Goods Sold',      'direct_expense'),
             ('Operating Expenses',      'operating_expense'),
             ('Depreciation',            'overhead_expense'),
             ('Administrative Expenses', 'operating_expense'),
             ('Other Expenses',          'other_expense'),
             ('Reconciliation',          'reconciliation')
           ) AS x(name, ctype)
           WHERE NOT EXISTS (
             SELECT 1 FROM ifrs_categories
             WHERE "entityId" = v_entity_id AND name = x.name
           );

           -- Insert accounts. unique(companyId, code) + unique(entityId, code)
           -- guarantee idempotency via ON CONFLICT.
           INSERT INTO ifrs_accounts (
             "entityId", "companyId", "categoryId", "currencyId",
             code, name, "accountType", "isPosting", "isActive",
             "createdAt", "updatedAt"
           )
           SELECT v_entity_id, v_company.id, c.id, v_currency_id,
                  a.code, a.acct_name, a.acct_type, a.is_posting, true,
                  NOW(), NOW()
           FROM (VALUES
             ('1000', 'Assets',                       'asset',     'Current Assets',         false),
             ('1100', 'Current Assets',               'asset',     'Current Assets',         false),
             ('1110', 'Cash on Hand',                 'asset',     'Cash',                   true),
             ('1111', 'Petty Cash',                   'asset',     'Cash',                   true),
             ('1120', 'Bank Accounts',                'asset',     'Bank',                   false),
             ('1121', 'Main Operating Account',       'asset',     'Bank',                   true),
             ('1122', 'Payroll Account',              'asset',     'Bank',                   true),
             ('1130', 'Accounts Receivable',          'asset',     'Receivable',             false),
             ('1131', 'Trade Receivables',            'asset',     'Receivable',             true),
             ('1132', 'Staff Advances',               'asset',     'Receivable',             true),
             ('1140', 'Inventory',                    'asset',     'Inventory',              false),
             ('1141', 'Raw Materials',                'asset',     'Inventory',              true),
             ('1142', 'Work in Progress',             'asset',     'Inventory',              true),
             ('1143', 'Finished Goods',               'asset',     'Inventory',              true),
             ('1160', 'VAT Recoverable',              'asset',     'Current Assets',         true),
             ('1200', 'Non-Current Assets',           'asset',     'Non-Current Assets',     false),
             ('1210', 'Property, Plant & Equipment', 'asset',     'Fixed Assets',           false),
             ('1211', 'Land',                         'asset',     'Fixed Assets',           true),
             ('1212', 'Buildings',                    'asset',     'Fixed Assets',           true),
             ('1213', 'Motor Vehicles',               'asset',     'Fixed Assets',           true),
             ('1220', 'Accumulated Depreciation',     'asset',     'Fixed Assets',           false),
             ('2000', 'Liabilities',                  'liability', 'Current Liabilities',    false),
             ('2100', 'Current Liabilities',          'liability', 'Current Liabilities',    false),
             ('2110', 'Accounts Payable',             'liability', 'Payable',                false),
             ('2111', 'Trade Payables',               'liability', 'Payable',                true),
             ('2121', 'VAT Payable',                  'liability', 'VAT Payable',            true),
             ('2122', 'WHT Payable',                  'liability', 'WHT Payable',            true),
             ('2131', 'Salaries Payable',             'liability', 'Current Liabilities',    true),
             ('2140', 'Customer Deposits',            'liability', 'Current Liabilities',    true),
             ('3000', 'Equity',                       'equity',    'Equity',                 false),
             ('3100', 'Share Capital',                'equity',    'Share Capital',          false),
             ('3110', 'Ordinary Share Capital',       'equity',    'Share Capital',          true),
             ('3200', 'Retained Earnings',            'equity',    'Retained Earnings',      false),
             ('3210', 'Current Year Earnings',        'equity',    'Retained Earnings',      true),
             ('4000', 'Revenue',                      'revenue',   'Income',                 false),
             ('4100', 'Sales Revenue',                'revenue',   'Sales',                  false),
             ('4110', 'Product Sales',                'revenue',   'Sales',                  true),
             ('4120', 'Service Sales',                'revenue',   'Service Revenue',        true),
             ('5000', 'Cost of Sales',                'expense',   'Cost of Goods Sold',     false),
             ('5100', 'Direct Materials',             'expense',   'Cost of Goods Sold',     true),
             ('6000', 'Operating Expenses',           'expense',   'Operating Expenses',     false),
             ('6110', 'Salaries & Wages',             'expense',   'Operating Expenses',     true),
             ('6210', 'Rent Expense',                 'expense',   'Administrative Expenses',true),
             ('6220', 'Utilities',                    'expense',   'Administrative Expenses',true),
             ('6280', 'Bank Charges',                 'expense',   'Administrative Expenses',true),
             ('6430', 'Depreciation - Vehicles',      'expense',   'Depreciation',           true)
           ) AS a(code, acct_name, acct_type, cat_name, is_posting)
           JOIN ifrs_categories c
             ON c."entityId" = v_entity_id AND c.name = a.cat_name
           -- ifrs_accounts has TWO unique constraints: (companyId, code) and
           -- (entityId, code). Multi-company tenants share the same entity,
           -- so a code may already exist on the entity from a sibling company.
           -- Use bare ON CONFLICT DO NOTHING to catch either constraint.
           ON CONFLICT DO NOTHING;

           RAISE NOTICE 'Backfilled IFRS chart of accounts for company %', v_company.id;
         END LOOP;
       END $$`,
    ],
  },
  // ============================================================================
  // 2026-04-28: Nigerian Pension Fund Administrators (PFAs) — lookup + seed
  // Adds pension_fund_administrators table, seeds 19 currently-licensed PFAs
  // per existing company, and adds pensionAdministratorId FK on employees.
  // List is editable per-tenant (isSeeded=true marks the canonical entries).
  // ============================================================================
  {
    id: '2026-04-28-009-pension-fund-administrators',
    description: 'Add pension_fund_administrators table seeded with Nigerian PFAs + pensionAdministratorId on employees',
    sql: [
      `CREATE TABLE IF NOT EXISTS pension_fund_administrators (
        id              SERIAL PRIMARY KEY,
        "companyId"     INTEGER NOT NULL,
        name            VARCHAR(200) NOT NULL,
        code            VARCHAR(20),
        "licenseNumber" VARCHAR(50),
        address         VARCHAR(500),
        phone           VARCHAR(50),
        email           VARCHAR(200),
        website         VARCHAR(200),
        notes           TEXT,
        "isActive"      BOOLEAN NOT NULL DEFAULT true,
        "isSeeded"      BOOLEAN NOT NULL DEFAULT false,
        "createdBy"     INTEGER,
        "updatedBy"     INTEGER,
        "deletedAt"     TIMESTAMP,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_pfa_company_name ON pension_fund_administrators ("companyId", name) WHERE "deletedAt" IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_pfa_company_active ON pension_fund_administrators ("companyId", "isActive")`,
      // Add the FK column on employees (idempotent)
      `ALTER TABLE employees ADD COLUMN IF NOT EXISTS "pensionAdministratorId" INTEGER`,
      // Seed the 19 currently-licensed Nigerian PFAs (as of 2024) for every
      // company in this tenant. INSERT … ON CONFLICT DO NOTHING via the
      // partial unique index covers re-runs safely.
      `INSERT INTO pension_fund_administrators ("companyId", name, code, "isActive", "isSeeded", "createdAt", "updatedAt")
       SELECT c.id, x.name, x.code, true, true, NOW(), NOW()
       FROM companies c
       CROSS JOIN (VALUES
         ('Access Pensions Limited',                    'PFA-001'),
         ('ARM Pension Managers (PFA) Limited',         'PFA-002'),
         ('AXA Mansard Pensions Limited',               'PFA-003'),
         ('CardinalStone Pensions Limited',             'PFA-004'),
         ('Crusader Sterling Pensions Limited',         'PFA-005'),
         ('FCMB Pensions Limited',                      'PFA-006'),
         ('Fidelity Pension Managers',                  'PFA-007'),
         ('Guaranty Trust Pension Managers Limited',    'PFA-008'),
         ('Leadway Pensure PFA Limited',                'PFA-009'),
         ('NLPC Pension Fund Administrators Limited',   'PFA-010'),
         ('Norrenberger Pensions Limited',              'PFA-011'),
         ('NPF Pensions Limited',                       'PFA-012'),
         ('PAL Pensions Limited',                       'PFA-013'),
         ('Premium Pension Limited',                    'PFA-014'),
         ('Radix Pension Managers Limited',             'PFA-015'),
         ('Stanbic IBTC Pension Managers Limited',      'PFA-016'),
         ('Tangerine APT Pensions Limited',             'PFA-017'),
         ('Trustfund Pensions Limited',                 'PFA-018'),
         ('Veritas Glanvills Pensions Limited',         'PFA-019')
       ) AS x(name, code)
       WHERE c."deletedAt" IS NULL
       ON CONFLICT DO NOTHING`,
    ],
  },
  // ============================================================================
  // 2026-04-28: Internal cost tracking — Phase 1A
  // - trips.driverAllowance and trips.miscExpenses for per-trip direct costs
  // - vehicle_cost_entries table for vehicle-level costs not tied to a trip
  //   (insurance, licensing, depreciation, tracker subs, periodic maintenance)
  // Both feed the new fleet cost reports — internal use only, not pricing.
  // ============================================================================
  {
    id: '2026-04-28-008-fleet-internal-cost-tracking',
    description: 'Add trip cost columns + vehicle_cost_entries table for internal cost reporting',
    sql: [
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS "driverAllowance" NUMERIC(12,2)`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS "miscExpenses" NUMERIC(12,2)`,
      // VehicleCostType enum
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VehicleCostType') THEN
           CREATE TYPE "VehicleCostType" AS ENUM (
             'MAINTENANCE','INSURANCE','LICENSING','ROADWORTHINESS','DEPRECIATION',
             'TRACKER_SUBSCRIPTION','TYRE','OVERHAUL','PERMIT','OTHER'
           );
         END IF;
       END $$`,
      // VehicleCostEntrySource enum
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VehicleCostEntrySource') THEN
           CREATE TYPE "VehicleCostEntrySource" AS ENUM (
             'MANUAL','JOURNAL_ENTRY','MAINTENANCE_RECORD','DEPRECIATION_POSTING'
           );
         END IF;
       END $$`,
      `CREATE TABLE IF NOT EXISTS vehicle_cost_entries (
         id           SERIAL PRIMARY KEY,
         "companyId"  INTEGER NOT NULL,
         "vehicleId"  INTEGER NOT NULL,
         "costType"   "VehicleCostType" NOT NULL,
         amount       NUMERIC(15,2) NOT NULL,
         "costDate"   DATE NOT NULL,
         "periodStart" DATE,
         "periodEnd"   DATE,
         source       "VehicleCostEntrySource" NOT NULL DEFAULT 'MANUAL',
         "sourceId"   INTEGER,
         reference    VARCHAR(100),
         notes        TEXT,
         "createdBy"  INTEGER,
         "updatedBy"  INTEGER,
         "deletedAt"  TIMESTAMP,
         "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `CREATE INDEX IF NOT EXISTS idx_vehicle_cost_entries_vehicle ON vehicle_cost_entries ("companyId", "vehicleId")`,
      `CREATE INDEX IF NOT EXISTS idx_vehicle_cost_entries_type ON vehicle_cost_entries ("companyId", "costType")`,
      `CREATE INDEX IF NOT EXISTS idx_vehicle_cost_entries_date ON vehicle_cost_entries ("companyId", "costDate")`,
      `CREATE INDEX IF NOT EXISTS idx_vehicle_cost_entries_deleted ON vehicle_cost_entries ("companyId", "deletedAt")`,
    ],
  },
  {
    id: '2026-04-28-007-trips-column-reconciliation',
    description: 'Rename trips columns (startMileage→startOdometer etc.) and add description/completionNotes',
    sql: [
      // Rename startMileage → startOdometer if old exists and new doesn't
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='startMileage' AND table_schema=current_schema())
            AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='startOdometer' AND table_schema=current_schema()) THEN
           ALTER TABLE trips RENAME COLUMN "startMileage" TO "startOdometer";
         END IF;
       END $$`,
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='endMileage' AND table_schema=current_schema())
            AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='endOdometer' AND table_schema=current_schema()) THEN
           ALTER TABLE trips RENAME COLUMN "endMileage" TO "endOdometer";
         END IF;
       END $$`,
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='cargoDescription' AND table_schema=current_schema())
            AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='cargo' AND table_schema=current_schema()) THEN
           ALTER TABLE trips RENAME COLUMN "cargoDescription" TO "cargo";
         END IF;
       END $$`,
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='distanceTraveled' AND table_schema=current_schema())
            AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='distance' AND table_schema=current_schema()) THEN
           ALTER TABLE trips RENAME COLUMN "distanceTraveled" TO "distance";
         END IF;
       END $$`,
      // Add columns that have no old name (description, completionNotes) and the
      // post-rename columns where neither old nor new ever existed.
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS "completionNotes" TEXT`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS "startOdometer" NUMERIC(12,2)`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS "endOdometer" NUMERIC(12,2)`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS cargo TEXT`,
      `ALTER TABLE trips ADD COLUMN IF NOT EXISTS distance NUMERIC(12,2)`,
    ],
  },
  {
    id: '2026-04-28-006-vehicle-status-enum-reconciliation',
    description: 'Add new VehicleStatus enum values used by app code; remap legacy rows',
    sql: [
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='VehicleStatus' AND e.enumlabel='ACTIVE') THEN
           ALTER TYPE "VehicleStatus" ADD VALUE 'ACTIVE';
         END IF;
       END $$`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='VehicleStatus' AND e.enumlabel='INACTIVE') THEN
           ALTER TYPE "VehicleStatus" ADD VALUE 'INACTIVE';
         END IF;
       END $$`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='VehicleStatus' AND e.enumlabel='IN_MAINTENANCE') THEN
           ALTER TYPE "VehicleStatus" ADD VALUE 'IN_MAINTENANCE';
         END IF;
       END $$`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='VehicleStatus' AND e.enumlabel='SOLD') THEN
           ALTER TYPE "VehicleStatus" ADD VALUE 'SOLD';
         END IF;
       END $$`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='VehicleStatus' AND e.enumlabel='SCRAPPED') THEN
           ALTER TYPE "VehicleStatus" ADD VALUE 'SCRAPPED';
         END IF;
       END $$`,
      // Remap existing rows: AVAILABLE/IN_USE/RESERVED → ACTIVE; MAINTENANCE → IN_MAINTENANCE; DISPOSED → SCRAPPED
      `UPDATE vehicles SET status = 'ACTIVE'         WHERE status::text IN ('AVAILABLE', 'IN_USE', 'RESERVED')`,
      `UPDATE vehicles SET status = 'IN_MAINTENANCE' WHERE status::text = 'MAINTENANCE'`,
      `UPDATE vehicles SET status = 'SCRAPPED'       WHERE status::text = 'DISPOSED'`,
      // Update default to the new canonical value
      `ALTER TABLE vehicles ALTER COLUMN status SET DEFAULT 'ACTIVE'`,
    ],
  },
  {
    id: '2026-04-28-005-vehicles-current-odometer-rename',
    description: 'Rename vehicles.currentMileage → currentOdometer (or create new); idempotent',
    sql: [
      `DO $$
       BEGIN
         IF EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'vehicles' AND column_name = 'currentMileage'
             AND table_schema = current_schema()
         ) AND NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'vehicles' AND column_name = 'currentOdometer'
             AND table_schema = current_schema()
         ) THEN
           ALTER TABLE vehicles RENAME COLUMN "currentMileage" TO "currentOdometer";
         ELSIF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'vehicles' AND column_name = 'currentOdometer'
             AND table_schema = current_schema()
         ) THEN
           ALTER TABLE vehicles ADD COLUMN "currentOdometer" NUMERIC(12,2) NOT NULL DEFAULT 0;
         END IF;
         -- If both somehow coexist, leave them alone — manual decision needed.
       END $$`,
    ],
  },
  // ============================================================================
  // 2026-04-28: lsk_vaccine_schedules — add missing updatedById column
  // The service SELECT/UPDATE references v."updatedById" but the column
  // was never declared in schema.tenant.prisma. /livestock/vaccine-schedules
  // crashed with `column v.updatedById does not exist`.
  // ============================================================================
  {
    id: '2026-04-28-012-lsk-vaccine-schedules-updated-by',
    description: 'Add updatedById to lsk_vaccine_schedules (service expected it; Prisma never had it)',
    sql: [
      `ALTER TABLE lsk_vaccine_schedules ADD COLUMN IF NOT EXISTS "updatedById" INTEGER`,
    ],
  },
  // ============================================================================
  // 2026-04-28: LskFlockStatus enum — add FINISHING + DEPLETED
  // The DTO/service/frontend reference these values but the Postgres enum
  // never had them. /poultry/flocks crashed with `invalid input value for
  // enum "LskFlockStatus": "FINISHING"` for any insert/update touching
  // those statuses. Each ADD VALUE wrapped in pg_enum guard for idempotency.
  // ============================================================================
  {
    id: '2026-04-28-011-lsk-flock-status-finishing-depleted',
    description: 'Add FINISHING and DEPLETED values to LskFlockStatus enum',
    sql: [
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='LskFlockStatus' AND e.enumlabel='FINISHING') THEN
           ALTER TYPE "LskFlockStatus" ADD VALUE 'FINISHING';
         END IF;
       END $$`,
      `DO $$
       BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='LskFlockStatus' AND e.enumlabel='DEPLETED') THEN
           ALTER TYPE "LskFlockStatus" ADD VALUE 'DEPLETED';
         END IF;
       END $$`,
    ],
  },
  // ============================================================================
  // 2026-04-29: PayElement consolidation
  // Consolidate payroll_components (formula-driven) and payroll_items
  // (grade-level-driven) into a single pay_elements table with a mode flag.
  // Old tables stay live for one release (services become read-through shims).
  // Adds:
  //   - PayMode enum (GRADE_BASED | FORMULA_BASED | LUMP_SUM)
  //   - PayElementType enum (EARNING | DEDUCTION | BENEFIT)
  //   - pay_elements table (superset of both old tables)
  //   - hr_payroll_settings.defaultPayMode (org-level default)
  //   - employees.payMode (per-employee override; null = inherit from settings)
  // Backfill copies every non-deleted row from payroll_components and
  // payroll_items into pay_elements with legacyTable/legacyId markers so
  // we can re-sync if needed and so the new CRUD page can show provenance.
  // ============================================================================
  {
    id: '2026-04-29-001-pay-element-consolidation',
    description: 'Add PayMode/PayElementType enums, pay_elements table, employees.payMode, hr_payroll_settings.defaultPayMode; backfill from payroll_components + payroll_items',
    sql: [
      // ── 1) Enums ──
      // The "IF NOT EXISTS" check MUST scope by current_schema(): pg_type is
      // global, so a bare WHERE typname = 'PayMode' returns true the moment
      // ANY tenant has created the type, then later tenants skip CREATE TYPE
      // and the subsequent CREATE TABLE fails because the type isn't visible
      // via their search_path.
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_type t
           JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE t.typname = 'PayMode' AND n.nspname = current_schema()
         ) THEN
           CREATE TYPE "PayMode" AS ENUM ('GRADE_BASED', 'FORMULA_BASED', 'LUMP_SUM');
         END IF;
       END $$`,
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_type t
           JOIN pg_namespace n ON n.oid = t.typnamespace
           WHERE t.typname = 'PayElementType' AND n.nspname = current_schema()
         ) THEN
           CREATE TYPE "PayElementType" AS ENUM ('EARNING', 'DEDUCTION', 'BENEFIT');
         END IF;
       END $$`,

      // ── 2) pay_elements table ──
      `CREATE TABLE IF NOT EXISTS pay_elements (
         id                          SERIAL PRIMARY KEY,
         "companyId"                 INTEGER NOT NULL,
         "branchId"                  INTEGER,
         name                        VARCHAR(150) NOT NULL,
         code                        VARCHAR(30)  NOT NULL,
         "shortName"                 VARCHAR(50),
         description                 TEXT,
         type                        "PayElementType" NOT NULL DEFAULT 'EARNING',
         mode                        "PayMode"        NOT NULL DEFAULT 'FORMULA_BASED',
         category                    TEXT NOT NULL DEFAULT 'allowance',
         "calculationType"           TEXT NOT NULL DEFAULT 'fixed',
         "baseOn"                    VARCHAR(20),
         "defaultRate"               NUMERIC(8,4),
         "defaultAmount"             NUMERIC(15,2),
         "defaultPercentage"         NUMERIC(8,4),
         "minimumAmount"             NUMERIC(15,2),
         "maximumAmount"             NUMERIC(15,2),
         "calculationFormula"        TEXT,
         "formulaParameters"         JSONB,
         "isStatutory"               BOOLEAN NOT NULL DEFAULT false,
         "statutoryAgency"           VARCHAR(50),
         "employerRate"              NUMERIC(8,4),
         "employeeRate"              NUMERIC(8,4),
         taxable                     BOOLEAN NOT NULL DEFAULT true,
         "affectsPensionCalculation" BOOLEAN NOT NULL DEFAULT true,
         "affectsGratuityCalculation"BOOLEAN NOT NULL DEFAULT true,
         "proRatable"                BOOLEAN NOT NULL DEFAULT true,
         "showOnPayslip"             BOOLEAN NOT NULL DEFAULT true,
         "displayOrder"              INTEGER NOT NULL DEFAULT 0,
         frequency                   TEXT NOT NULL DEFAULT 'monthly',
         "effectiveFrom"             DATE NOT NULL,
         "effectiveTo"               DATE,
         "isActive"                  BOOLEAN NOT NULL DEFAULT true,
         "isSystemElement"           BOOLEAN NOT NULL DEFAULT false,
         "legacyTable"               VARCHAR(30),
         "legacyId"                  INTEGER,
         "createdBy"                 INTEGER NOT NULL,
         "approvedBy"                INTEGER,
         "approvedAt"                TIMESTAMP,
         "deletedAt"                 TIMESTAMP,
         "createdAt"                 TIMESTAMP NOT NULL DEFAULT now(),
         "updatedAt"                 TIMESTAMP NOT NULL DEFAULT now(),
         CONSTRAINT pay_elements_company_branch_code_key UNIQUE ("companyId", "branchId", code),
         CONSTRAINT pay_elements_company_branch_name_key UNIQUE ("companyId", "branchId", name),
         CONSTRAINT pay_elements_company_fkey FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE
       )`,
      `CREATE INDEX IF NOT EXISTS pay_elements_company_mode_active_idx
         ON pay_elements ("companyId", mode, "isActive")`,
      `CREATE INDEX IF NOT EXISTS pay_elements_category_type_idx
         ON pay_elements (category, type)`,
      `CREATE INDEX IF NOT EXISTS pay_elements_legacy_idx
         ON pay_elements ("legacyTable", "legacyId")`,

      // ── 3) employees.payMode (per-employee override) ──
      `ALTER TABLE employees
         ADD COLUMN IF NOT EXISTS "payMode" "PayMode"`,

      // ── 4) hr_payroll_settings.defaultPayMode (org-level default) ──
      `ALTER TABLE hr_payroll_settings
         ADD COLUMN IF NOT EXISTS "defaultPayMode" "PayMode" DEFAULT 'FORMULA_BASED'`,

      // ── 5) Backfill from payroll_components ──
      // Each component becomes a FORMULA_BASED PayElement.
      // Component types: EARNINGS → EARNING, DEDUCTIONS → DEDUCTION
      // We dedupe with NOT EXISTS on (legacyTable, legacyId) so the migration
      // is safe to re-run after manual rows have been added to pay_elements.
      `INSERT INTO pay_elements (
         "companyId", "branchId", name, code, "shortName", description,
         type, mode, category, "calculationType",
         "defaultRate", "defaultAmount", "minimumAmount", "maximumAmount",
         "calculationFormula", "formulaParameters",
         "isStatutory", "statutoryAgency", "employerRate", "employeeRate",
         taxable, "affectsPensionCalculation", "affectsGratuityCalculation",
         "proRatable", "showOnPayslip", "displayOrder", frequency,
         "effectiveFrom", "effectiveTo", "isActive", "isSystemElement",
         "legacyTable", "legacyId",
         "createdBy", "approvedBy", "approvedAt", "deletedAt",
         "createdAt", "updatedAt"
       )
       SELECT
         pc."companyId",
         pc."branchId",
         pc.name,
         pc.code,
         pc."shortName",
         pc.description,
         CASE pc.type::text
           WHEN 'DEDUCTIONS' THEN 'DEDUCTION'::"PayElementType"
           ELSE 'EARNING'::"PayElementType"
         END,
         'FORMULA_BASED'::"PayMode",
         pc.category,
         CASE pc."calculationMethod"::text
           WHEN 'FIXED_AMOUNT'          THEN 'fixed'
           WHEN 'PERCENTAGE_OF_BASIC'   THEN 'percentage_of_basic'
           WHEN 'PERCENTAGE_OF_GROSS'   THEN 'percentage_of_gross'
           WHEN 'FORMULA'               THEN 'formula'
           WHEN 'MANUAL'                THEN 'manual'
           ELSE 'fixed'
         END,
         pc."defaultRate",
         pc."defaultAmount",
         pc."minimumAmount",
         pc."maximumAmount",
         pc."calculationFormula",
         pc."formulaParameters",
         pc."isStatutory",
         pc."statutoryAgency",
         pc."employerRate",
         pc."employeeRate",
         pc.taxable,
         pc."affectsPensionCalculation",
         pc."affectsGratuityCalculation",
         pc."proRatable",
         pc."showOnPayslip",
         pc."displayOrder",
         pc.frequency,
         pc."effectiveFrom",
         pc."effectiveTo",
         pc."isActive",
         pc."isSystemComponent",
         'payroll_components',
         pc.id,
         pc."createdBy",
         pc."approvedBy",
         pc."approvedAt",
         pc."deletedAt",
         pc."createdAt",
         pc."updatedAt"
       FROM payroll_components pc
       WHERE NOT EXISTS (
         SELECT 1 FROM pay_elements pe
         WHERE pe."legacyTable" = 'payroll_components' AND pe."legacyId" = pc.id
       )
       AND NOT EXISTS (
         -- Avoid colliding with any manually-created PayElement that happens
         -- to share the same (company, branch, code). Manual rows win.
         SELECT 1 FROM pay_elements pe2
         WHERE pe2."companyId" = pc."companyId"
           AND COALESCE(pe2."branchId", -1) = COALESCE(pc."branchId", -1)
           AND pe2.code = pc.code
       )`,

      // ── 6) Backfill from payroll_items ──
      // Each item becomes a GRADE_BASED PayElement.
      // isDeduction → DEDUCTION, otherwise EARNING (BENEFIT not used here —
      // payroll_items has no benefit flag; admin can re-tag in the new UI).
      `INSERT INTO pay_elements (
         "companyId", "branchId", name, code, description,
         type, mode, category, "calculationType",
         "baseOn", "defaultPercentage", "defaultAmount",
         taxable, "affectsPensionCalculation",
         "showOnPayslip", "displayOrder",
         "effectiveFrom", "effectiveTo", "isActive",
         "legacyTable", "legacyId",
         "createdBy", "approvedBy", "approvedAt", "deletedAt",
         "createdAt", "updatedAt"
       )
       SELECT
         pi."companyId",
         pi."branchId",
         pi.name,
         pi.code,
         pi.description,
         CASE WHEN pi."isDeduction" THEN 'DEDUCTION'::"PayElementType"
              ELSE 'EARNING'::"PayElementType"
         END,
         'GRADE_BASED'::"PayMode",
         pi.category,
         pi."calculationType",
         pi."baseOn",
         pi."defaultPercentage",
         pi."defaultAmount",
         pi."isTaxable",
         pi."isPensionable",
         pi."showOnPayslip",
         pi."displayOrder",
         pi."effectiveFrom",
         pi."effectiveTo",
         pi."isActive",
         'payroll_items',
         pi.id,
         pi."createdBy",
         pi."approvedBy",
         pi."approvedAt",
         pi."deletedAt",
         pi."createdAt",
         pi."updatedAt"
       FROM payroll_items pi
       WHERE NOT EXISTS (
         SELECT 1 FROM pay_elements pe
         WHERE pe."legacyTable" = 'payroll_items' AND pe."legacyId" = pi.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM pay_elements pe2
         WHERE pe2."companyId" = pi."companyId"
           AND COALESCE(pe2."branchId", -1) = COALESCE(pi."branchId", -1)
           AND pe2.code = pi.code
       )`,
    ],
  },
  // ============================================================================
  // 2026-04-30: PayElement Phase 2 — switch dependent FKs to pay_elements
  // Adds payElementId nullable FK on:
  //   - salary_structure_components (was → payroll_components)
  //   - grade_level_payroll_item   (was → payroll_items)
  // and backfills it from the legacyTable/legacyId markers that the Phase 1
  // migration left on every pay_elements row.
  //
  // The old payrollComponentId / payrollItemId columns stay in place — the
  // calculation engine reads payElementId first and falls back to those
  // for any row created before the backfill ran.
  // ============================================================================
  {
    id: '2026-04-30-001-pay-element-phase2-fks',
    description: 'Add payElementId FK to salary_structure_components + grade_level_payroll_item; backfill from legacy markers',
    sql: [
      // ── salary_structure_components ──
      `ALTER TABLE salary_structure_components
         ADD COLUMN IF NOT EXISTS "payElementId" INTEGER`,
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint
            WHERE conname = 'salary_structure_components_pay_element_fkey'
              AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
         ) THEN
           ALTER TABLE salary_structure_components
             ADD CONSTRAINT salary_structure_components_pay_element_fkey
             FOREIGN KEY ("payElementId") REFERENCES pay_elements(id) ON DELETE SET NULL;
         END IF;
       END $$`,
      `CREATE INDEX IF NOT EXISTS salary_structure_components_pay_element_idx
         ON salary_structure_components ("payElementId")`,
      // Backfill: for each row, find the matching pay_elements row whose
      // legacyTable/legacyId pair points back to its payrollComponentId.
      `UPDATE salary_structure_components ssc
          SET "payElementId" = pe.id
         FROM pay_elements pe
        WHERE ssc."payElementId" IS NULL
          AND pe."legacyTable" = 'payroll_components'
          AND pe."legacyId" = ssc."payrollComponentId"
          AND pe."deletedAt" IS NULL`,

      // ── grade_level_payroll_item ──
      `ALTER TABLE grade_level_payroll_item
         ADD COLUMN IF NOT EXISTS "payElementId" INTEGER`,
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint
            WHERE conname = 'grade_level_payroll_item_pay_element_fkey'
              AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())
         ) THEN
           ALTER TABLE grade_level_payroll_item
             ADD CONSTRAINT grade_level_payroll_item_pay_element_fkey
             FOREIGN KEY ("payElementId") REFERENCES pay_elements(id) ON DELETE SET NULL;
         END IF;
       END $$`,
      `CREATE INDEX IF NOT EXISTS grade_level_payroll_item_pay_element_idx
         ON grade_level_payroll_item ("payElementId")`,
      `UPDATE grade_level_payroll_item glpi
          SET "payElementId" = pe.id
         FROM pay_elements pe
        WHERE glpi."payElementId" IS NULL
          AND pe."legacyTable" = 'payroll_items'
          AND pe."legacyId" = glpi."payrollItemId"
          AND pe."deletedAt" IS NULL`,
    ],
  },
  // ============================================================================
  // 2026-05-02: Backfill audit movement rows for existing posted Beginning
  // Balances. Pairs with the new postBalance/unpost paths that write a
  // 'Beginning_Balance' row to inv_stock_movements so the stock card / ledger
  // shows BB activity as a discrete event. Without this backfill, only NEW
  // BBs would appear in the stock card after deploy — historical ones would
  // continue to be invisible (only showing as the opening-balance summation).
  //
  // Idempotent: skips any BB that already has a movement row referencing it.
  // ============================================================================
  {
    id: '2026-05-02-017-bb-audit-movement-rows',
    description: 'Backfill inv_stock_movements rows for posted beginning balances so they appear on the stock card',
    sql: [
      `INSERT INTO inv_stock_movements (
         "companyId",
         "branchId",
         "movementNumber",
         "movementType",
         "itemId",
         "toWarehouseId",
         quantity,
         "unitCost",
         "totalCost",
         "movementDate",
         notes,
         "referenceType",
         "referenceId",
         "journalEntryId",
         status,
         "approvedAt",
         "approvedById",
         "createdBy",
         "createdAt",
         "updatedAt"
       )
       SELECT
         bb."companyId",
         bb."branchId",
         'BB-' || bb.id,
         'Beginning_Balance',
         bb."itemId",
         bb."warehouseId",
         bb."openingQuantity",
         COALESCE(bb."unitCost", 0),
         COALESCE(bb."totalValue", bb."openingQuantity" * COALESCE(bb."unitCost", 0)),
         bb."balanceDate",
         'Opening balance for item #' || bb."itemId",
         'inv_item_beginning_balance',
         bb.id,
         bb."journalEntryId",
         'posted',
         bb."postedAt",
         bb."approvedById",
         bb."userId",
         NOW(),
         NOW()
       FROM inv_item_beginning_balances bb
       WHERE bb.status = 'posted'
         AND bb."deletedAt" IS NULL
         AND bb."warehouseId" IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM inv_stock_movements sm
            WHERE sm."referenceType" = 'inv_item_beginning_balance'
              AND sm."referenceId" = bb.id
         )`,
    ],
  },
  // ============================================================================
  // 2026-05-02: Backfill warehouseId on posted Beginning Balances that were
  // saved with NULL warehouse, then re-run the audit movement-row backfill
  // for the now-populated rows. Migration 017 skipped null-warehouse BBs
  // because inv_stock_movements.toWarehouseId is NOT NULL — that left them
  // invisible on the stock card. Source the warehouse from the matching
  // inv_stock_levels row (the warehouse where the stock physically landed)
  // and fall back to the company's primary warehouse if no stock_level row
  // exists. Idempotent: only touches BBs where warehouseId IS NULL.
  // ============================================================================
  {
    id: '2026-05-02-018-bb-warehouse-backfill',
    description: 'Backfill warehouseId on null-warehouse posted BBs and re-emit audit movement rows',
    sql: [
      // 1. Pick the warehouse with the largest stock_levels qty for each (companyId, itemId) pair
      `UPDATE inv_item_beginning_balances bb
          SET "warehouseId" = sl."warehouseId",
              "updatedAt" = NOW()
         FROM (
           SELECT DISTINCT ON ("companyId", "itemId")
                  "companyId", "itemId", "warehouseId"
             FROM inv_stock_levels
            WHERE "warehouseId" IS NOT NULL
            ORDER BY "companyId", "itemId", quantity DESC NULLS LAST, "warehouseId"
         ) sl
        WHERE bb.status = 'posted'
          AND bb."deletedAt" IS NULL
          AND bb."warehouseId" IS NULL
          AND bb."companyId" = sl."companyId"
          AND bb."itemId" = sl."itemId"`,

      // 2. Fallback: any BB still null → first active warehouse for the company
      `UPDATE inv_item_beginning_balances bb
          SET "warehouseId" = w.id,
              "updatedAt" = NOW()
         FROM (
           SELECT DISTINCT ON ("companyId") "companyId", id
             FROM inv_warehouses
            WHERE "deletedAt" IS NULL
            ORDER BY "companyId", id
         ) w
        WHERE bb.status = 'posted'
          AND bb."deletedAt" IS NULL
          AND bb."warehouseId" IS NULL
          AND bb."companyId" = w."companyId"`,

      // 3. Re-run the movement-row backfill from migration 017 — now those
      //    just-fixed BBs satisfy the warehouseId IS NOT NULL guard.
      `INSERT INTO inv_stock_movements (
         "companyId", "branchId", "movementNumber", "movementType",
         "itemId", "toWarehouseId", quantity, "unitCost", "totalCost",
         "movementDate", notes, "referenceType", "referenceId",
         "journalEntryId", status, "approvedAt", "approvedById",
         "createdBy", "createdAt", "updatedAt"
       )
       SELECT
         bb."companyId", bb."branchId", 'BB-' || bb.id, 'Beginning_Balance',
         bb."itemId", bb."warehouseId", bb."openingQuantity",
         COALESCE(bb."unitCost", 0),
         COALESCE(bb."totalValue", bb."openingQuantity" * COALESCE(bb."unitCost", 0)),
         bb."balanceDate", 'Opening balance for item #' || bb."itemId",
         'inv_item_beginning_balance', bb.id, bb."journalEntryId",
         'posted', bb."postedAt", bb."approvedById", bb."userId",
         NOW(), NOW()
       FROM inv_item_beginning_balances bb
       WHERE bb.status = 'posted'
         AND bb."deletedAt" IS NULL
         AND bb."warehouseId" IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM inv_stock_movements sm
            WHERE sm."referenceType" = 'inv_item_beginning_balance'
              AND sm."referenceId" = bb.id
         )`,
    ],
  },
  // ============================================================================
  // 2026-05-02: Booking form simplification.
  //
  // Vehicle is now assigned at trip-start, not at booking — so vehicleId
  // becomes nullable. Add Swift-style service-detail columns the create form
  // surfaces (pickup location, chauffeur Y/N, airline, airline location,
  // payment type, office location, branch). All idempotent.
  // ============================================================================
  {
    id: '2026-05-02-019-vehicle-bookings-service-details',
    description: 'Make vehicle_bookings.vehicleId nullable and add service-detail columns (pickupLocation, useChauffeur, airline, airlineLocation, paymentType, officeLocation, branchId)',
    sql: [
      `ALTER TABLE vehicle_bookings ALTER COLUMN "vehicleId" DROP NOT NULL`,
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "branchId" INTEGER`,
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "pickupLocation" TEXT`,
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "useChauffeur" BOOLEAN`,
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "airline" TEXT`,
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "airlineLocation" TEXT`,
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "paymentType" TEXT`,
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "officeLocation" TEXT`,
    ],
  },
  // ============================================================================
  // 2026-05-02: Vehicle Booking approval flow.
  //
  // Adds the `fleet_manager` role and a single-step "Fleet Manager Approval"
  // process flow for `vehicle_bookings`. Replaces the bespoke approve/reject
  // endpoints with the configurable flow used by every other module.
  //
  // The flow has one step today; tenants can add more via the UI later. The
  // domain service auto-skips the approval entirely when the requester also
  // holds fleet_manager (so a Fleet Manager booking their own car doesn't
  // bounce into a queue waiting for themselves).
  //
  // Idempotent: role + flow + step inserts all guarded.
  // ============================================================================
  // ============================================================================
  // 2026-05-02: Add vehicleServiceType column to vehicle_bookings.
  //
  // Stores the *kind* of vehicle the requester needs (Truck, Van, Car, etc.)
  // captured on the booking form. The actual vehicle assignment still happens
  // at trip-start and lives in vehicleId — this column lets the fleet desk
  // pre-filter the candidate vehicles by what the user asked for.
  // ============================================================================
  {
    id: '2026-05-02-021-vehicle-bookings-service-type',
    description: 'Add vehicleServiceType column to vehicle_bookings (the requested type captured at booking time)',
    sql: [
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "vehicleServiceType" TEXT`,
    ],
  },
  // ============================================================================
  // 2026-05-02: Add customerId FK to vehicle_bookings.
  // Lets staff book vehicles on behalf of a Customer (phone-in requests etc).
  // Distinct from requestedBy (the staff user). FK uses ON DELETE SET NULL so
  // deleting a customer doesn't cascade-wipe their booking history.
  // ============================================================================
  // ============================================================================
  // 2026-05-02: Fleet pricing + tax + proforma slice.
  //
  // Adds:
  //   - fleet_vehicle_service_types table (replaces localStorage-based catalog)
  //     with default rates per type
  //   - per-vehicle default rate columns
  //   - per-booking pricing snapshot (chargeModel, agreedRate, agreedAmount,
  //     vehicleServiceTypeId)
  //   - vehicle_booking_taxes junction (multi-line tax selection)
  //   - per-trip billing actuals (actualDuration, actualDistance, billedAmount)
  //   - sales_invoices.vehicleBookingId (link proforma/final back to booking)
  //
  // Also seeds the 8 system service types (TRUCK, VAN, CAR, MOTORCYCLE, BUS,
  // TRAILER, HEAVY_EQUIPMENT, OTHER) for every existing company so the form
  // has the same defaults as the localStorage version did.
  //
  // All idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).
  // ============================================================================
  {
    id: '2026-05-02-023-fleet-pricing-tax-proforma',
    description: 'Fleet pricing + multi-tax + proforma link: service types table, vehicle rates, booking pricing snapshot, tax lines, trip actuals, invoice link',
    sql: [
      // 1. Vehicle/Service Types catalog
      `CREATE TABLE IF NOT EXISTS fleet_vehicle_service_types (
         id SERIAL PRIMARY KEY,
         "companyId" INTEGER NOT NULL,
         code TEXT NOT NULL,
         name TEXT NOT NULL,
         description TEXT,
         "isSystem" BOOLEAN NOT NULL DEFAULT false,
         "isActive" BOOLEAN NOT NULL DEFAULT true,
         "defaultFlatRate" NUMERIC(15,2),
         "defaultHourlyRate" NUMERIC(15,2),
         "defaultDailyRate" NUMERIC(15,2),
         "defaultKmRate" NUMERIC(15,2),
         "defaultChargeModel" TEXT,
         "createdBy" INTEGER,
         "deletedAt" TIMESTAMP,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         CONSTRAINT fleet_vehicle_service_types_company_code_key UNIQUE ("companyId", code)
       )`,
      `CREATE INDEX IF NOT EXISTS fleet_vehicle_service_types_active_idx
         ON fleet_vehicle_service_types ("companyId", "isActive")`,

      // 2. Seed 8 system types for every active company
      `INSERT INTO fleet_vehicle_service_types ("companyId", code, name, description, "isSystem", "createdAt", "updatedAt")
         SELECT c.id, t.code, t.name, t.description, true, NOW(), NOW()
           FROM companies c
           CROSS JOIN (VALUES
             ('TRUCK',           'Truck',           'Heavy-duty trucks for cargo and freight transport'),
             ('VAN',             'Van',             'Commercial vans for delivery and transport'),
             ('CAR',             'Car',             'Standard passenger vehicles for staff transport'),
             ('MOTORCYCLE',      'Motorcycle',      'Two-wheeled vehicles for quick dispatch and deliveries'),
             ('BUS',             'Bus',             'Passenger buses for group or staff transportation'),
             ('TRAILER',         'Trailer',         'Towed cargo trailers for extended transport capacity'),
             ('HEAVY_EQUIPMENT', 'Heavy Equipment', 'Construction and industrial heavy machinery'),
             ('OTHER',           'Other',           'Other vehicle types not covered by standard categories')
           ) AS t(code, name, description)
          WHERE c."deletedAt" IS NULL
          ON CONFLICT ("companyId", code) DO NOTHING`,

      // 3. Vehicle default rate columns
      `ALTER TABLE vehicles
         ADD COLUMN IF NOT EXISTS "defaultFlatRate"   NUMERIC(15,2),
         ADD COLUMN IF NOT EXISTS "defaultHourlyRate" NUMERIC(15,2),
         ADD COLUMN IF NOT EXISTS "defaultDailyRate"  NUMERIC(15,2),
         ADD COLUMN IF NOT EXISTS "defaultKmRate"     NUMERIC(15,2),
         ADD COLUMN IF NOT EXISTS "defaultChargeModel" TEXT`,

      // 4. Booking pricing snapshot + service-type FK
      `ALTER TABLE vehicle_bookings
         ADD COLUMN IF NOT EXISTS "vehicleServiceTypeId" INTEGER,
         ADD COLUMN IF NOT EXISTS "chargeModel"  TEXT,
         ADD COLUMN IF NOT EXISTS "agreedRate"   NUMERIC(15,2),
         ADD COLUMN IF NOT EXISTS "agreedAmount" NUMERIC(15,2)`,
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'vehicle_bookings_serviceTypeId_fkey'
              AND table_name = 'vehicle_bookings'
         ) THEN
           ALTER TABLE vehicle_bookings
             ADD CONSTRAINT "vehicle_bookings_serviceTypeId_fkey"
             FOREIGN KEY ("vehicleServiceTypeId")
             REFERENCES fleet_vehicle_service_types(id) ON DELETE SET NULL;
         END IF;
       END $$`,
      `CREATE INDEX IF NOT EXISTS vehicle_bookings_servicetype_idx
         ON vehicle_bookings ("vehicleServiceTypeId")`,

      // 5. Backfill vehicleServiceTypeId from existing string column
      `UPDATE vehicle_bookings b
          SET "vehicleServiceTypeId" = t.id
         FROM fleet_vehicle_service_types t
        WHERE b."vehicleServiceType" IS NOT NULL
          AND b."vehicleServiceTypeId" IS NULL
          AND t."companyId" = b."companyId"
          AND t.code = b."vehicleServiceType"`,

      // 6. Tax lines junction
      `CREATE TABLE IF NOT EXISTS vehicle_booking_taxes (
         id SERIAL PRIMARY KEY,
         "bookingId" INTEGER NOT NULL,
         "taxType" TEXT NOT NULL,
         "taxId" INTEGER,
         name TEXT NOT NULL,
         rate NUMERIC(7,4) NOT NULL,
         amount NUMERIC(15,2) NOT NULL,
         "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
         CONSTRAINT vehicle_booking_taxes_booking_fkey
           FOREIGN KEY ("bookingId") REFERENCES vehicle_bookings(id) ON DELETE CASCADE
       )`,
      `CREATE INDEX IF NOT EXISTS vehicle_booking_taxes_booking_idx
         ON vehicle_booking_taxes ("bookingId")`,

      // 7. Trip billing actuals
      `ALTER TABLE trips
         ADD COLUMN IF NOT EXISTS "actualDuration" INTEGER,
         ADD COLUMN IF NOT EXISTS "actualDistance" NUMERIC(10,2),
         ADD COLUMN IF NOT EXISTS "billedAmount"   NUMERIC(15,2)`,

      // 8. Sales invoice → booking link
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "vehicleBookingId" INTEGER`,
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'sales_invoices_vehicleBookingId_fkey'
              AND table_name = 'sales_invoices'
         ) THEN
           ALTER TABLE sales_invoices
             ADD CONSTRAINT "sales_invoices_vehicleBookingId_fkey"
             FOREIGN KEY ("vehicleBookingId")
             REFERENCES vehicle_bookings(id) ON DELETE SET NULL;
         END IF;
       END $$`,
      `CREATE INDEX IF NOT EXISTS sales_invoices_vehicleBookingId_idx
         ON sales_invoices ("vehicleBookingId")`,
    ],
  },
  {
    id: '2026-05-02-022-vehicle-bookings-customer-fk',
    description: 'Add customerId FK column to vehicle_bookings (staff-on-behalf-of customer bookings)',
    sql: [
      `ALTER TABLE vehicle_bookings ADD COLUMN IF NOT EXISTS "customerId" INTEGER`,
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'vehicle_bookings_customerId_fkey'
              AND table_name = 'vehicle_bookings'
         ) THEN
           ALTER TABLE vehicle_bookings
             ADD CONSTRAINT "vehicle_bookings_customerId_fkey"
             FOREIGN KEY ("customerId") REFERENCES customers(id) ON DELETE SET NULL;
         END IF;
       END $$`,
      `CREATE INDEX IF NOT EXISTS "vehicle_bookings_customerId_idx" ON vehicle_bookings ("customerId")`,
    ],
  },
  {
    id: '2026-05-02-020-vehicle-booking-approval-flow',
    description: 'Add fleet_manager role and single-step Vehicle Booking approval flow to existing tenants',
    sql: [
      // 1. Create the fleet_manager role if missing.
      `INSERT INTO roles (name, "guardName", description, "createdAt", "updatedAt")
        VALUES ('fleet_manager', 'web', 'Fleet Manager — approves vehicle bookings, assigns vehicles', NOW(), NOW())
        ON CONFLICT (name, "guardName") DO NOTHING`,

      // 2. For every company in this tenant, create the approval flow if absent.
      `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
        SELECT c.id, 'Vehicle Booking Approval', 'vehicle_bookings', 'fleet-management.bookings', 'Configurable approval workflow for vehicle bookings', true, NOW(), NOW()
          FROM companies c
         WHERE c."deletedAt" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM process_approval_flows f
              WHERE f."companyId" = c.id
                AND f."approvableType" = 'vehicle_bookings'
           )`,

      // 3. For every newly-created flow, insert the single Fleet Manager step.
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isFinalStep", "stepType", "createdAt", "updatedAt")
        SELECT f.id, f."companyId", r.id, 'Fleet Manager Approval', 1, 'APPROVE', true, true, true, 'approve', NOW(), NOW()
          FROM process_approval_flows f
          JOIN roles r ON r.name = 'fleet_manager' AND r."guardName" = 'web'
         WHERE f."approvableType" = 'vehicle_bookings'
           AND NOT EXISTS (
             SELECT 1 FROM process_approval_flow_steps s
              WHERE s."processApprovalFlowId" = f.id
           )`,
    ],
  },
  {
    id: '2026-05-02-024-expense-request-fleet-linking',
    description: 'Add fleet linking columns (tripId, vehicleId, fleetCostType) to expense_requests',
    sql: [
      `ALTER TABLE expense_requests ADD COLUMN IF NOT EXISTS "tripId" INT`,
      `ALTER TABLE expense_requests ADD COLUMN IF NOT EXISTS "vehicleId" INT`,
      `ALTER TABLE expense_requests ADD COLUMN IF NOT EXISTS "fleetCostType" VARCHAR(50)`,
    ],
  },
  {
    id: '2026-05-11-026-expense-request-attachments',
    description: 'Create expense_request_attachments table for document uploads',
    sql: [
      `CREATE TABLE IF NOT EXISTS expense_request_attachments (
        id SERIAL PRIMARY KEY,
        "expenseRequestId" INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        "originalName" TEXT NOT NULL,
        path TEXT NOT NULL,
        url TEXT NOT NULL,
        "mimeType" TEXT,
        size INTEGER,
        "uploadedBy" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS "expense_request_attachments_expenseRequestId_idx" ON expense_request_attachments ("expenseRequestId")`,
    ],
  },
  {
    id: '2026-05-03-025-payroll-run-approval-flow',
    description: 'Seed Payroll Run Approval flow (HOD → Management) for existing tenants that lack it',
    sql: [
      // Create the flow for each company that doesn't have one yet
      `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
        SELECT c.id, 'Payroll Run Approval', 'payroll_runs', 'hrpayroll.payroll-runs',
               'Two-step payroll approval: HOD then Management', true, NOW(), NOW()
          FROM companies c
         WHERE c."deletedAt" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM process_approval_flows f
              WHERE f."companyId" = c.id
                AND f."approvableType" = 'payroll_runs'
           )`,

      // HOD step (order 1)
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isFinalStep", "stepType", "createdAt", "updatedAt")
        SELECT f.id, f."companyId", r.id, 'HOD Approval', 1, 'APPROVE', true, true, false, 'approve', NOW(), NOW()
          FROM process_approval_flows f
          JOIN roles r ON r.name = 'hod' AND r."guardName" = 'web'
         WHERE f."approvableType" = 'payroll_runs'
           AND NOT EXISTS (
             SELECT 1 FROM process_approval_flow_steps s
              WHERE s."processApprovalFlowId" = f.id AND s."stepOrder" = 1
           )`,

      // Management step (order 2, final)
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isFinalStep", "stepType", "createdAt", "updatedAt")
        SELECT f.id, f."companyId", r.id, 'Management Approval', 2, 'APPROVE', true, true, true, 'approve', NOW(), NOW()
          FROM process_approval_flows f
          JOIN roles r ON r.name = 'management' AND r."guardName" = 'web'
         WHERE f."approvableType" = 'payroll_runs'
           AND NOT EXISTS (
             SELECT 1 FROM process_approval_flow_steps s
              WHERE s."processApprovalFlowId" = f.id AND s."stepOrder" = 2
           )`,
    ],
  },
  {
    id: '2026-05-03-026-fleet-gl-tax-configs',
    description: 'Fleet GL integration: revenueGlAccountId on service types, glAccountId on booking taxes, new fleet_tax_configs table',
    sql: [
      // 1. Revenue GL account on fleet vehicle service types
      `ALTER TABLE fleet_vehicle_service_types ADD COLUMN IF NOT EXISTS "revenueGlAccountId" INT`,

      // 2. GL account snapshot on booking tax lines
      `ALTER TABLE vehicle_booking_taxes ADD COLUMN IF NOT EXISTS "glAccountId" INT`,

      // 3. Central fleet tax configs table
      `CREATE TABLE IF NOT EXISTS fleet_tax_configs (
        id            SERIAL PRIMARY KEY,
        "companyId"   INT NOT NULL,
        name          VARCHAR(200) NOT NULL,
        "taxType"     VARCHAR(50) NOT NULL DEFAULT 'CUSTOM',
        rate          DECIMAL(7,4) NOT NULL DEFAULT 0,
        "glAccountId" INT,
        "isDefault"   BOOLEAN NOT NULL DEFAULT false,
        "isActive"    BOOLEAN NOT NULL DEFAULT true,
        description   TEXT,
        "createdBy"   INT,
        "deletedAt"   TIMESTAMP,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fleet_tax_configs_company ON fleet_tax_configs ("companyId", "isActive")`,
    ],
  },
  {
    id: '2026-05-04-028-user-invite-tokens',
    description: 'Add invite token columns to users table for email invite flow',
    sql: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "inviteToken" VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP`,
    ],
  },
  {
    id: '2026-05-03-027-seed-fleet-vehicle-service-types',
    description: 'Seed 8 system fleet vehicle service types for tenants that have none (provisioned before fleet seeding was added)',
    sql: [
      // Only insert if this company has zero fleet service types (avoids duplicates for tenants that already have them)
      `INSERT INTO fleet_vehicle_service_types (name, code, "isSystem", "isActive", "companyId", "createdAt", "updatedAt")
       SELECT v.name, v.code, true, true, c.id, NOW(), NOW()
       FROM companies c
       CROSS JOIN (VALUES
         ('Truck',           'TRUCK'),
         ('Van',             'VAN'),
         ('Car',             'CAR'),
         ('Motorcycle',      'MOTORCYCLE'),
         ('Bus',             'BUS'),
         ('Trailer',         'TRAILER'),
         ('Heavy Equipment', 'HEAVY_EQUIPMENT'),
         ('Other',           'OTHER')
       ) AS v(name, code)
       WHERE NOT EXISTS (
         SELECT 1 FROM fleet_vehicle_service_types fvst
         WHERE fvst."companyId" = c.id
       )`,
    ],
  },
  {
    id: '2026-05-04-029-credit-note-rejection-reason',
    description: 'Add rejectionReason column to credit_notes for approval flow rejection tracking',
    sql: [
      `ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT`,
    ],
  },
  {
    id: '2026-05-04-030-credit-note-approval-flow-seed',
    description: 'Seed Credit Note Approval flow (Accountant Review → Management Approval) for all companies',
    sql: [
      // Insert flow for each company that doesn't have it yet
      `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
       SELECT c.id, 'Credit Note Approval', 'credit_notes', 'receivables.credit-notes',
              'Configurable approval workflow for credit notes', true, NOW(), NOW()
       FROM companies c
       WHERE NOT EXISTS (
         SELECT 1 FROM process_approval_flows paf
         WHERE paf."companyId" = c.id AND paf."approvableType" = 'credit_notes'
       )`,
      // Insert Accountant Review step (order 1)
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT paf.id, paf."companyId", r.id, 'Accountant Review', 1, 'APPROVE', true, true, false, false, NOW(), NOW()
       FROM process_approval_flows paf
       JOIN roles r ON r.name = 'accountant' AND r."guardName" = 'web'
       WHERE paf."approvableType" = 'credit_notes'
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps pafs
           WHERE pafs."processApprovalFlowId" = paf.id AND pafs."stepOrder" = 1
         )`,
      // Insert Management Approval step (order 2, final)
      `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
       SELECT paf.id, paf."companyId", r.id, 'Management Approval', 2, 'APPROVE', true, true, false, true, NOW(), NOW()
       FROM process_approval_flows paf
       JOIN roles r ON r.name = 'management' AND r."guardName" = 'web'
       WHERE paf."approvableType" = 'credit_notes'
         AND NOT EXISTS (
           SELECT 1 FROM process_approval_flow_steps pafs
           WHERE pafs."processApprovalFlowId" = paf.id AND pafs."stepOrder" = 2
         )`,
    ],
  },
  {
    id: '2026-05-04-032-purchase-settings-approval-threshold-columns',
    description: 'Ensure approval threshold columns exist in purchase_settings (may be missing on tenants provisioned before Feb 2026)',
    sql: [
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "requirePoApproval" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "poApprovalThreshold" DECIMAL(15,2)`,
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "requireRfqApproval" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "rfqApprovalThreshold" DECIMAL(15,2)`,
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "requireInvoiceApproval" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "invoiceApprovalThreshold" DECIMAL(15,2)`,
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "requireServiceOrderApproval" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "serviceOrderApprovalThreshold" DECIMAL(15,2)`,
      `ALTER TABLE purchase_settings ADD COLUMN IF NOT EXISTS "requisitionApprovalThreshold" DECIMAL(15,2)`,
    ],
  },
  {
    id: '2026-05-04-031-approval-flow-step-approver-type',
    description: 'Add approverType column to process_approval_flow_steps (missing for tenants provisioned before Feb 2026)',
    sql: [
      `ALTER TABLE process_approval_flow_steps ADD COLUMN IF NOT EXISTS "approverType" TEXT NOT NULL DEFAULT 'role'`,
      `UPDATE process_approval_flow_steps SET "approverType" = 'employee' WHERE employees IS NOT NULL AND employees::text NOT IN ('null', '[]', '{}') AND "approverType" = 'role'`,
    ],
  },
  {
    id: '2026-05-05-033-sync-allow-negative-stock-to-inv-settings',
    description: 'Sync sales_settings.allowNegativeStock → inv_settings so the stock validation utility sees the user-configured value',
    sql: [
      `UPDATE inv_settings i
       SET "allowNegativeStock" = true,
           "negativeStockPolicy" = 'allow',
           "updatedAt" = NOW()
       FROM sales_settings s
       WHERE i."companyId" = s."companyId"
         AND s."allowNegativeStock" = true
         AND (i."allowNegativeStock" = false OR i."allowNegativeStock" IS NULL)`,
    ],
  },
  {
    id: '2026-05-05-034-credit-notes-direct-gl-columns',
    description: 'Add postToGL and glAccountId to credit_notes for non-inventory direct GL credit notes',
    sql: [
      `ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "postToGL" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS "glAccountId" INTEGER`,
    ],
  },
  {
    id: '2026-05-05-035-vat-input-account-id',
    description: 'Add inputAccountId to ifrs_vats for per-rate VAT Recoverable (input VAT) GL account',
    sql: [
      `ALTER TABLE ifrs_vats ADD COLUMN IF NOT EXISTS "inputAccountId" INTEGER`,
    ],
  },
  {
    id: '2026-05-07-036-hatchery-module',
    description: 'Create all hatchery module tables: machines, egg batches, incubation runs, candling, hatch results, chick batches',
    sql: [
      `DO $$ BEGIN CREATE TYPE "HatcheryMachineType" AS ENUM ('SETTER','HATCHER','COMBO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "HatcheryMachineStatus" AS ENUM ('ACTIVE','MAINTENANCE','DECOMMISSIONED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "HatcheryEggSourceType" AS ENUM ('IMPORT','LOCAL_PURCHASE','BREEDER_FARM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "HatcheryEggBatchStatus" AS ENUM ('QUARANTINE','AVAILABLE','IN_INCUBATION','EXHAUSTED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "HatcheryRunStatus" AS ENUM ('PENDING','SETTING','CANDLING','HATCHING','COMPLETE','FAILED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "HatcheryChickType" AS ENUM ('BROILER_DOC','LAYER_DOC','BROILER_PULLET','LAYER_PULLET','BREEDER_DOC','TURKEY_DOC','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "HatcheryChickGrade" AS ENUM ('FIRST','SECOND','CULL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "HatcheryChickBatchStatus" AS ENUM ('HOLDING','PARTIALLY_SOLD','FULLY_SOLD','CULLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `CREATE TABLE IF NOT EXISTS hatchery_machines (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "machineCode" VARCHAR(30) NOT NULL,
        name VARCHAR(120) NOT NULL,
        "machineType" "HatcheryMachineType" NOT NULL,
        capacity INTEGER NOT NULL,
        brand VARCHAR(80),
        model VARCHAR(80),
        "serialNumber" VARCHAR(80),
        "siteId" INTEGER,
        status "HatcheryMachineStatus" NOT NULL DEFAULT 'ACTIVE',
        notes TEXT,
        "createdById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_hatchery_machines UNIQUE ("companyId","machineCode")
      )`,
      `CREATE TABLE IF NOT EXISTS hatchery_egg_batches (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "batchCode" VARCHAR(40) NOT NULL,
        "sourceType" "HatcheryEggSourceType" NOT NULL,
        "sourceDocumentId" INTEGER,
        "sourceDocumentType" VARCHAR(40),
        "flockEggCollectionId" INTEGER,
        "supplierId" INTEGER,
        "breedId" INTEGER,
        "eggType" VARCHAR(30) NOT NULL DEFAULT 'BROILER',
        "quantityReceived" INTEGER NOT NULL,
        "quantitySettable" INTEGER,
        "quantityRejected" INTEGER NOT NULL DEFAULT 0,
        "unitCost" DECIMAL(15,4),
        "totalCost" DECIMAL(15,2),
        currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
        "receivedDate" DATE NOT NULL,
        "expiryDate" DATE,
        status "HatcheryEggBatchStatus" NOT NULL DEFAULT 'QUARANTINE',
        notes TEXT,
        "createdById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_hatchery_egg_batches UNIQUE ("companyId","batchCode")
      )`,
      `CREATE TABLE IF NOT EXISTS hatchery_incubation_runs (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "runCode" VARCHAR(40) NOT NULL,
        "setterId" INTEGER,
        "hatcherId" INTEGER,
        "setDate" DATE NOT NULL,
        "expectedCandleDate" DATE,
        "transferDate" DATE,
        "expectedHatchDate" DATE,
        "actualHatchDate" DATE,
        "totalEggsSet" INTEGER NOT NULL DEFAULT 0,
        status "HatcheryRunStatus" NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        "createdById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_hatchery_runs UNIQUE ("companyId","runCode")
      )`,
      `CREATE TABLE IF NOT EXISTS hatchery_run_egg_batches (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "incubationRunId" INTEGER NOT NULL,
        "eggBatchId" INTEGER NOT NULL,
        "quantitySet" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_run_egg_batch UNIQUE ("incubationRunId","eggBatchId")
      )`,
      `CREATE TABLE IF NOT EXISTS hatchery_candling_results (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "incubationRunId" INTEGER NOT NULL,
        "candlingDate" DATE NOT NULL,
        "candlingDay" INTEGER NOT NULL,
        fertile INTEGER NOT NULL DEFAULT 0,
        infertile INTEGER NOT NULL DEFAULT 0,
        "deadInShell" INTEGER NOT NULL DEFAULT 0,
        cracked INTEGER NOT NULL DEFAULT 0,
        "totalInspected" INTEGER NOT NULL DEFAULT 0,
        "fertilityRate" DECIMAL(5,2),
        "conductedById" INTEGER,
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_candling_run_date UNIQUE ("incubationRunId","candlingDate")
      )`,
      `CREATE TABLE IF NOT EXISTS hatchery_hatch_results (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "incubationRunId" INTEGER NOT NULL UNIQUE,
        "hatchDate" DATE NOT NULL,
        "eggsSet" INTEGER NOT NULL,
        "eggsTransferred" INTEGER,
        "chicksHatched" INTEGER NOT NULL DEFAULT 0,
        "deadInShell" INTEGER NOT NULL DEFAULT 0,
        unhatched INTEGER NOT NULL DEFAULT 0,
        cripples INTEGER NOT NULL DEFAULT 0,
        "hatchRate" DECIMAL(5,2),
        hatchability DECIMAL(5,2),
        "fertilityRate" DECIMAL(5,2),
        notes TEXT,
        "recordedById" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS hatchery_chick_batches (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "batchCode" VARCHAR(40) NOT NULL,
        "incubationRunId" INTEGER NOT NULL,
        "hatchResultId" INTEGER,
        "chickType" "HatcheryChickType" NOT NULL DEFAULT 'BROILER_DOC',
        "chickGrade" "HatcheryChickGrade" NOT NULL DEFAULT 'FIRST',
        "chicksCount" INTEGER NOT NULL,
        "chicksAvailable" INTEGER NOT NULL,
        "vaccinationDone" BOOLEAN NOT NULL DEFAULT false,
        "vaccinationDate" DATE,
        "vaccinationNotes" VARCHAR(255),
        "inventoryItemId" INTEGER,
        "warehouseId" INTEGER,
        "postedToInventory" BOOLEAN NOT NULL DEFAULT false,
        "postedAt" TIMESTAMP,
        status "HatcheryChickBatchStatus" NOT NULL DEFAULT 'HOLDING',
        notes TEXT,
        "createdById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_hatchery_chick_batches UNIQUE ("companyId","batchCode")
      )`,
      `CREATE INDEX IF NOT EXISTS idx_hatchery_egg_batches_company_status ON hatchery_egg_batches ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS idx_hatchery_runs_company_status ON hatchery_incubation_runs ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS idx_hatchery_chick_batches_company_status ON hatchery_chick_batches ("companyId", status)`,
    ],
  },
  {
    id: '2026-05-07-005-real-estate-phase1',
    description: 'Real Estate module Phase 1: properties, units, amenities, leases, lease charges, security deposits',
    sql: [
      // Enums
      `DO $$ BEGIN CREATE TYPE "RePropertyType" AS ENUM ('RESIDENTIAL','COMMERCIAL','MIXED','INDUSTRIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "RePropertyStatus" AS ENUM ('ACTIVE','INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReUnitType" AS ENUM ('APARTMENT','STUDIO','DUPLEX','OFFICE','SHOP','WAREHOUSE','LAND','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReUnitStatus" AS ENUM ('VACANT','OCCUPIED','UNDER_MAINTENANCE','RESERVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReLeaseType" AS ENUM ('FIXED_TERM','PERIODIC','SUBLEASE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReTenancyFrequency" AS ENUM ('WEEKLY','MONTHLY','QUARTERLY','YEARLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReLeaseStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','ACTIVE','EXPIRED','TERMINATED','RENEWED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReLeaseChargeType" AS ENUM ('RENT','SERVICE_CHARGE','GROUND_RENT','PARKING','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReLeaseChargeFrequency" AS ENUM ('MONTHLY','QUARTERLY','YEARLY','ONE_OFF'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReDepositStatus" AS ENUM ('HELD','RELEASED','FORFEITED','PARTIALLY_FORFEITED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE "ReNigerianState" AS ENUM ('LAGOS','FCT','RIVERS','KANO','OGUN','OYO','KWARA','ANAMBRA','ENUGU','DELTA','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      // Tables
      `CREATE TABLE IF NOT EXISTS re_properties (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(200) NOT NULL,
        "propertyType" "RePropertyType" NOT NULL DEFAULT 'RESIDENTIAL',
        address VARCHAR(500),
        city VARCHAR(100),
        state "ReNigerianState" NOT NULL DEFAULT 'LAGOS',
        lga VARCHAR(100),
        "landRegistryRef" VARCHAR(100),
        "coONumber" VARCHAR(100),
        "rightOfOccupancyRef" VARCHAR(100),
        "totalUnits" INTEGER NOT NULL DEFAULT 0,
        "landAreaSqm" DECIMAL(12,2),
        "glRevenueAccountId" INTEGER,
        "glDepositLiabilityAccountId" INTEGER,
        "glMaintenanceExpenseAccountId" INTEGER,
        "managerId" INTEGER,
        status "RePropertyStatus" NOT NULL DEFAULT 'ACTIVE',
        notes TEXT,
        "deletedAt" TIMESTAMP,
        "createdById" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_re_properties UNIQUE ("companyId", code)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_re_properties_company_status ON re_properties ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS idx_re_properties_company_type ON re_properties ("companyId", "propertyType")`,
      `CREATE TABLE IF NOT EXISTS re_units (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "propertyId" INTEGER NOT NULL,
        "unitNumber" VARCHAR(30) NOT NULL,
        floor VARCHAR(20),
        "unitType" "ReUnitType" NOT NULL DEFAULT 'APARTMENT',
        "areaSqm" DECIMAL(10,2),
        "bedroomCount" INTEGER,
        "bathroomCount" INTEGER,
        furnished BOOLEAN NOT NULL DEFAULT false,
        "marketRent" DECIMAL(15,2),
        currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
        status "ReUnitStatus" NOT NULL DEFAULT 'VACANT',
        "glRevenueAccountId" INTEGER,
        notes TEXT,
        "deletedAt" TIMESTAMP,
        "createdById" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_re_units UNIQUE ("companyId", "propertyId", "unitNumber")
      )`,
      `CREATE INDEX IF NOT EXISTS idx_re_units_company_property ON re_units ("companyId", "propertyId")`,
      `CREATE INDEX IF NOT EXISTS idx_re_units_company_status ON re_units ("companyId", status)`,
      `CREATE TABLE IF NOT EXISTS re_amenities (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        CONSTRAINT uq_re_amenities UNIQUE ("companyId", name)
      )`,
      `CREATE TABLE IF NOT EXISTS re_unit_amenities (
        "unitId" INTEGER NOT NULL,
        "amenityId" INTEGER NOT NULL,
        PRIMARY KEY ("unitId", "amenityId")
      )`,
      `CREATE TABLE IF NOT EXISTS re_leases (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "leaseCode" VARCHAR(30) NOT NULL,
        "unitId" INTEGER NOT NULL,
        "customerId" INTEGER NOT NULL,
        "leaseType" "ReLeaseType" NOT NULL DEFAULT 'FIXED_TERM',
        "tenancyFrequency" "ReTenancyFrequency" NOT NULL DEFAULT 'YEARLY',
        "startDate" DATE NOT NULL,
        "endDate" DATE,
        "noticePeriodDays" INTEGER NOT NULL DEFAULT 180,
        "rentAmount" DECIMAL(15,2) NOT NULL,
        "rentCurrency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
        "rentCurrencyRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
        "rentDueDayOfMonth" INTEGER NOT NULL DEFAULT 1,
        "advanceMonthsCollected" INTEGER NOT NULL DEFAULT 0,
        "advanceAmountCollected" DECIMAL(15,2),
        "serviceCharge" DECIMAL(15,2),
        "serviceChargeCurrency" VARCHAR(3),
        "stampDutyAmount" DECIMAL(15,2),
        "stampDutyPaid" BOOLEAN NOT NULL DEFAULT false,
        "nigerianState" "ReNigerianState" NOT NULL DEFAULT 'LAGOS',
        status "ReLeaseStatus" NOT NULL DEFAULT 'DRAFT',
        "terminationDate" DATE,
        "terminationReason" VARCHAR(500),
        "terminationNoticedAt" TIMESTAMP,
        "renewedFromLeaseId" INTEGER,
        notes TEXT,
        "createdById" INTEGER,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_re_leases UNIQUE ("companyId", "leaseCode")
      )`,
      `CREATE INDEX IF NOT EXISTS idx_re_leases_company_unit ON re_leases ("companyId", "unitId")`,
      `CREATE INDEX IF NOT EXISTS idx_re_leases_company_customer ON re_leases ("companyId", "customerId")`,
      `CREATE INDEX IF NOT EXISTS idx_re_leases_company_status ON re_leases ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS idx_re_leases_company_enddate ON re_leases ("companyId", "endDate")`,
      `CREATE TABLE IF NOT EXISTS re_lease_charges (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "leaseId" INTEGER NOT NULL,
        "chargeType" "ReLeaseChargeType" NOT NULL DEFAULT 'RENT',
        description VARCHAR(200) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
        "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
        frequency "ReLeaseChargeFrequency" NOT NULL DEFAULT 'MONTHLY',
        "startDate" DATE NOT NULL,
        "endDate" DATE,
        "glRevenueAccountId" INTEGER,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_re_lease_charges_lease ON re_lease_charges ("companyId", "leaseId")`,
      `CREATE INDEX IF NOT EXISTS idx_re_lease_charges_active ON re_lease_charges ("companyId", "isActive")`,
      `CREATE TABLE IF NOT EXISTS re_security_deposits (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "leaseId" INTEGER NOT NULL,
        "customerId" INTEGER NOT NULL,
        "depositAmount" DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
        "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
        "receivedDate" DATE NOT NULL,
        "interestRate" DECIMAL(5,2),
        "interestAccruedToDate" DECIMAL(15,2),
        status "ReDepositStatus" NOT NULL DEFAULT 'HELD',
        "releaseDate" DATE,
        "releaseAmount" DECIMAL(15,2),
        "forfeitureAmount" DECIMAL(15,2),
        "forfeitureReason" VARCHAR(500),
        "returnDueDate" DATE,
        "glLiabilityAccountId" INTEGER,
        "receiptReference" VARCHAR(100),
        notes TEXT,
        "createdById" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_re_security_deposits_lease ON re_security_deposits ("companyId", "leaseId")`,
      `CREATE INDEX IF NOT EXISTS idx_re_security_deposits_status ON re_security_deposits ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS idx_re_security_deposits_returndue ON re_security_deposits ("companyId", "returnDueDate")`,
    ],
  },
  // ============================================================================
  // 2026-05-09: customers — add salesAreaId
  // ============================================================================
  {
    id: '2026-05-09-001-customer-sales-area',
    description: 'Add salesAreaId foreign key to customers table',
    sql: [
      `ALTER TABLE customers ADD COLUMN IF NOT EXISTS "salesAreaId" INTEGER REFERENCES sales_areas(id) ON DELETE SET NULL`,
    ],
  },
  // ============================================================================
  // 2026-05-09: sales_invoices — add transportation charges field
  // ============================================================================
  {
    id: '2026-05-09-002-sales-invoice-transportation',
    description: 'Add transportation charges field to sales_invoices',
    sql: [
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "transportation" DECIMAL(15,2) NOT NULL DEFAULT 0`,
    ],
  },

  // ============================================================================
  // 2026-05-10: expense requests — nullable requesterId + free-text requesterName
  // ============================================================================
  {
    id: '2026-05-10-001-expense-requests-requester-name',
    description: 'Make requesterId nullable on expense_requests and add requesterName text column',
    sql: [
      `ALTER TABLE expense_requests ALTER COLUMN "requesterId" DROP NOT NULL`,
      `ALTER TABLE expense_requests ADD COLUMN IF NOT EXISTS "requesterName" VARCHAR(255)`,
    ],
  },

  // ============================================================================
  // 2026-05-10: user access — multi-company / multi-branch junction tables
  // ============================================================================
  {
    id: '2026-05-10-002-user-company-branch-access',
    description: 'Add user_company_access and user_branch_access junction tables for multi-company/branch access control',
    sql: [
      `CREATE TABLE IF NOT EXISTS user_company_access (
        "userId"    INTEGER NOT NULL,
        "companyId" INTEGER NOT NULL,
        PRIMARY KEY ("userId", "companyId"),
        FOREIGN KEY ("userId")    REFERENCES users(id)     ON DELETE CASCADE,
        FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS user_branch_access (
        "userId"   INTEGER NOT NULL,
        "branchId" INTEGER NOT NULL,
        PRIMARY KEY ("userId", "branchId"),
        FOREIGN KEY ("userId")   REFERENCES users(id)    ON DELETE CASCADE,
        FOREIGN KEY ("branchId") REFERENCES branches(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_company_access_user ON user_company_access ("userId")`,
      `CREATE INDEX IF NOT EXISTS idx_user_branch_access_user  ON user_branch_access  ("userId")`,
    ],
  },

  // ============================================================================
  // 2026-05-10: fund management — isHistorical flag for pre-go-live data freeze
  // ============================================================================
  {
    id: '2026-05-10-003-fm-historical-flags',
    description: 'Add isHistorical flag to fm_subscriptions and fm_credit_facilities to mark pre-go-live records that should be excluded from calculation engines',
    sql: [
      `ALTER TABLE fm_subscriptions ADD COLUMN IF NOT EXISTS "isHistorical" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "isHistorical" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS idx_fm_subscriptions_is_historical ON fm_subscriptions ("isHistorical") WHERE "isHistorical" = true`,
      `CREATE INDEX IF NOT EXISTS idx_fm_credit_facilities_is_historical ON fm_credit_facilities ("isHistorical") WHERE "isHistorical" = true`,
    ],
  },

  // ============================================================================
  // 2026-05-10: commissions — bank account payout tracking
  // ============================================================================
  {
    id: '2026-05-10-004-commission-bank-payout',
    description: 'Add bankAccountId, bankAccountName, paymentReference, and settlementCreditNoteId to commission_calculations for tracking sales rep bank payouts and customer credit note settlements',
    sql: [
      `ALTER TABLE commission_calculations ADD COLUMN IF NOT EXISTS "bankAccountId" INTEGER`,
      `ALTER TABLE commission_calculations ADD COLUMN IF NOT EXISTS "bankAccountName" VARCHAR(255)`,
      `ALTER TABLE commission_calculations ADD COLUMN IF NOT EXISTS "paymentReference" VARCHAR(255)`,
      `ALTER TABLE commission_calculations ADD COLUMN IF NOT EXISTS "settlementCreditNoteId" INTEGER`,
      `CREATE INDEX IF NOT EXISTS idx_commission_calc_settlement_cn ON commission_calculations ("settlementCreditNoteId") WHERE "settlementCreditNoteId" IS NOT NULL`,
    ],
  },
  {
    id: '2026-05-11-005-seed-fm-fund-products',
    description: "Seed D'Namaz Capital fund products (MIA, BKMI, D-REIN, EMP, CMP, DHFIF) and credit facility types for existing tenants provisioned before seedFundProducts was added",
    sql: [
      // Insert fund products — uses first company in tenant, ON CONFLICT skips if already present
      `INSERT INTO fm_funds ("fundCode", name, "shortName", description, "fundType", "baseCurrency", "isShariaCompliant", "navFrequency", "regulatoryType", "minimumSubscription", "lockUpPeriodDays", "redemptionNoticeDays", "projectedRate", "profitSharingRatio", "autoReinvest", status, "inceptionDate", "companyId", "createdAt", "updatedAt")
       SELECT 'DHFIF', E'D\\'Namaz Halal Fixed Income Fund', 'DHFIF', 'A SEC-registered mutual fund that provides investors with long-term income generation, stable cash distribution, and capital preservation through FGN Sukuks, shariah-compliant income contracts, and fixed-term investments.', 'OPEN_ENDED'::"FmFundType", 'NGN', true, 'MONTHLY'::"FmNavFrequency", 'SEC', 10000.00, 90, 5, NULL, NULL, false, 'ACTIVE', '2024-01-01'::date, id, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("fundCode") DO NOTHING`,
      `INSERT INTO fm_funds ("fundCode", name, "shortName", description, "fundType", "baseCurrency", "isShariaCompliant", "navFrequency", "regulatoryType", "minimumSubscription", "lockUpPeriodDays", "redemptionNoticeDays", "projectedRate", "profitSharingRatio", "autoReinvest", status, "inceptionDate", "companyId", "createdAt", "updatedAt")
       SELECT 'MIA', 'Mudarabah Investment Account', 'MIA', 'A discretionary Mudarabah investment account that achieves long-term capital appreciation and income generation through a well-diversified portfolio of equity, sukuk, commodity, real estate, facilities, and shariah-compliant money market instruments.', 'OPEN_ENDED'::"FmFundType", 'NGN', true, 'MONTHLY'::"FmNavFrequency", 'SEC', 1000000.00, 180, 5, 16.00, '55:45', false, 'ACTIVE', '2024-01-01'::date, id, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("fundCode") DO NOTHING`,
      `INSERT INTO fm_funds ("fundCode", name, "shortName", description, "fundType", "baseCurrency", "isShariaCompliant", "navFrequency", "regulatoryType", "minimumSubscription", "lockUpPeriodDays", "redemptionNoticeDays", "projectedRate", "profitSharingRatio", "autoReinvest", status, "inceptionDate", "companyId", "createdAt", "updatedAt")
       SELECT 'BKMI', 'Barakah Kids Mudarabah Investment Account', 'BKMI', 'A long-horizon Mudarabah account designed for children from age 2 and above, managed until the beneficiary turns 18. Profits are reinvested automatically.', 'OPEN_ENDED'::"FmFundType", 'NGN', true, 'MONTHLY'::"FmNavFrequency", 'SEC', 1000000.00, 365, 5, 16.00, '55:45', true, 'ACTIVE', '2024-01-01'::date, id, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("fundCode") DO NOTHING`,
      `INSERT INTO fm_funds ("fundCode", name, "shortName", description, "fundType", "baseCurrency", "isShariaCompliant", "navFrequency", "regulatoryType", "minimumSubscription", "lockUpPeriodDays", "redemptionNoticeDays", "projectedRate", "profitSharingRatio", "autoReinvest", status, "inceptionDate", "companyId", "createdAt", "updatedAt")
       SELECT 'EMP', 'Equity Mudarabah Portfolio', 'EMP', 'A discretionary equity-focused Mudarabah portfolio investing in shariah-compliant shares on the NGX and other exchanges, Mudarabah/Musharakah facilities to SMEs, fast-moving commodity goods, healthcare, and technology.', 'OPEN_ENDED'::"FmFundType", 'NGN', true, 'MONTHLY'::"FmNavFrequency", 'SEC', 1000000.00, 180, 5, NULL, '55:45', false, 'ACTIVE', '2024-01-01'::date, id, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("fundCode") DO NOTHING`,
      `INSERT INTO fm_funds ("fundCode", name, "shortName", description, "fundType", "baseCurrency", "isShariaCompliant", "navFrequency", "regulatoryType", "minimumSubscription", "lockUpPeriodDays", "redemptionNoticeDays", "projectedRate", "profitSharingRatio", "autoReinvest", status, "inceptionDate", "companyId", "createdAt", "updatedAt")
       SELECT 'D-REIN', E'D\\'Namaz Real Estate Mudarabah Investment', 'D-REIN', 'A real estate investment portfolio targeting rental income and capital appreciation through acquisition and development of shariah-compliant residential, commercial, and industrial properties.', 'OPEN_ENDED'::"FmFundType", 'NGN', true, 'MONTHLY'::"FmNavFrequency", 'SEC', 50000000.00, 365, 5, 20.00, '55:45', false, 'ACTIVE', '2024-01-01'::date, id, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("fundCode") DO NOTHING`,
      `INSERT INTO fm_funds ("fundCode", name, "shortName", description, "fundType", "baseCurrency", "isShariaCompliant", "navFrequency", "regulatoryType", "minimumSubscription", "lockUpPeriodDays", "redemptionNoticeDays", "projectedRate", "profitSharingRatio", "autoReinvest", status, "inceptionDate", "companyId", "createdAt", "updatedAt")
       SELECT 'CMP', 'Commodity Mudarabah Portfolio', 'CMP', 'A commodity trading portfolio that buys and sells shariah-compliant tangible cash crops (cocoa, oil palm, groundnut, cotton, sesame seeds, rice), gold, oil and gas, and other qualified shariah-compliant minerals.', 'OPEN_ENDED'::"FmFundType", 'NGN', true, 'MONTHLY'::"FmNavFrequency", 'SEC', 1000000.00, 180, 5, 16.00, '55:45', false, 'ACTIVE', '2024-01-01'::date, id, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("fundCode") DO NOTHING`,
      // Insert credit facility types — ON CONFLICT on (companyId, code)
      `INSERT INTO fm_credit_facility_types ("companyId", code, name, description, "facilityStructure", "profitRate", "profitCalculation", "repaymentMethod", "repaymentFrequency", "minAmount", "maxAmount", "minTenureMonths", "maxTenureMonths", "processingFee", "processingFeeType", "managerProfitSharePct", "investorProfitSharePct", "requiresApproval", "isShariaCompliant", "isActive", "createdAt", "updatedAt")
       SELECT id, 'MRB-STD', 'Standard Murabaha Facility', 'Cost-plus trade finance for goods, equipment, and working capital.', 'murabaha', 16.00, 'flat', 'emi', 'monthly', 500000, 50000000, 3, 24, 0, 'fixed', 55, 45, true, true, true, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("companyId", code) DO NOTHING`,
      `INSERT INTO fm_credit_facility_types ("companyId", code, name, description, "facilityStructure", "profitRate", "profitCalculation", "repaymentMethod", "repaymentFrequency", "minAmount", "maxAmount", "minTenureMonths", "maxTenureMonths", "processingFee", "processingFeeType", "managerProfitSharePct", "investorProfitSharePct", "requiresApproval", "isShariaCompliant", "isActive", "createdAt", "updatedAt")
       SELECT id, 'MDB-STD', 'Standard Mudarabah Investment Facility', 'Capital provision to SMEs and businesses where the fund provides 100% capital and the investee provides expertise.', 'mudarabah', 16.00, 'flat', 'bullet', 'quarterly', 1000000, 100000000, 6, 36, 0, 'fixed', 55, 45, true, true, true, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("companyId", code) DO NOTHING`,
      `INSERT INTO fm_credit_facility_types ("companyId", code, name, description, "facilityStructure", "profitRate", "profitCalculation", "repaymentMethod", "repaymentFrequency", "minAmount", "maxAmount", "minTenureMonths", "maxTenureMonths", "processingFee", "processingFeeType", "managerProfitSharePct", "investorProfitSharePct", "requiresApproval", "isShariaCompliant", "isActive", "createdAt", "updatedAt")
       SELECT id, 'MSH-STD', 'Standard Musharakah Partnership Facility', 'Joint venture partnership where both the fund and investee contribute capital and share profits and losses proportionally.', 'musharakah', 16.00, 'flat', 'emi', 'quarterly', 2000000, 200000000, 6, 36, 0, 'fixed', 55, 45, true, true, true, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("companyId", code) DO NOTHING`,
      `INSERT INTO fm_credit_facility_types ("companyId", code, name, description, "facilityStructure", "profitRate", "profitCalculation", "repaymentMethod", "repaymentFrequency", "minAmount", "maxAmount", "minTenureMonths", "maxTenureMonths", "processingFee", "processingFeeType", "managerProfitSharePct", "investorProfitSharePct", "requiresApproval", "isShariaCompliant", "isActive", "createdAt", "updatedAt")
       SELECT id, 'IJR-STD', 'Standard Ijarah Lease Facility', 'Asset-backed lease financing. The fund purchases and owns the asset; the investee pays rent for its use.', 'ijarah', 16.00, 'flat', 'emi', 'monthly', 1000000, 100000000, 12, 60, 0, 'fixed', 55, 45, true, true, true, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("companyId", code) DO NOTHING`,
      `INSERT INTO fm_credit_facility_types ("companyId", code, name, description, "facilityStructure", "profitRate", "profitCalculation", "repaymentMethod", "repaymentFrequency", "minAmount", "maxAmount", "minTenureMonths", "maxTenureMonths", "processingFee", "processingFeeType", "managerProfitSharePct", "investorProfitSharePct", "requiresApproval", "isShariaCompliant", "isActive", "createdAt", "updatedAt")
       SELECT id, 'REIN-MSH', 'Real Estate Musharakah Facility', 'Diminishing Musharakah for real estate acquisition and development.', 'musharakah', 20.00, 'declining_balance', 'emi', 'monthly', 10000000, 500000000, 12, 60, 0, 'fixed', 55, 45, true, true, true, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("companyId", code) DO NOTHING`,
      `INSERT INTO fm_credit_facility_types ("companyId", code, name, description, "facilityStructure", "profitRate", "profitCalculation", "repaymentMethod", "repaymentFrequency", "minAmount", "maxAmount", "minTenureMonths", "maxTenureMonths", "processingFee", "processingFeeType", "managerProfitSharePct", "investorProfitSharePct", "requiresApproval", "isShariaCompliant", "isActive", "createdAt", "updatedAt")
       SELECT id, 'CMP-MRB', 'Commodity Murabaha Trade Finance', 'Short-term commodity trade finance for seasonal commodity traders and agribusinesses.', 'murabaha', 16.00, 'flat', 'bullet', 'lump_sum', 500000, 50000000, 1, 12, 0, 'fixed', 55, 45, true, true, true, NOW(), NOW()
       FROM companies ORDER BY id LIMIT 1
       ON CONFLICT ("companyId", code) DO NOTHING`,
    ],
  },

  // ============================================================================
  // 2026-05-12: FM redemptions — isHistorical + isHistoricalLoad flags
  // fm_subscriptions.isHistorical was added in 2026-05-10-003; this migration
  // adds the missing isHistoricalLoad column to fm_subscriptions and both flags
  // to fm_redemptions so historical imports are fully excluded from NAV.
  // ============================================================================
  {
    id: '2026-05-12-001-fm-redemptions-historical-flags',
    description: 'Add isHistoricalLoad to fm_subscriptions and both isHistoricalLoad + isHistorical to fm_redemptions, completing the isHistorical guard for all FM import tables',
    sql: [
      `ALTER TABLE fm_subscriptions ADD COLUMN IF NOT EXISTS "isHistoricalLoad" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS idx_fm_subscriptions_is_historical_load ON fm_subscriptions ("isHistoricalLoad") WHERE "isHistoricalLoad" = true`,
      `ALTER TABLE fm_redemptions ADD COLUMN IF NOT EXISTS "isHistoricalLoad" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE fm_redemptions ADD COLUMN IF NOT EXISTS "isHistorical" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS idx_fm_redemptions_is_historical ON fm_redemptions ("isHistorical") WHERE "isHistorical" = true`,
      `CREATE INDEX IF NOT EXISTS idx_fm_redemptions_is_historical_load ON fm_redemptions ("isHistoricalLoad") WHERE "isHistoricalLoad" = true`,
    ],
  },
  {
    id: '2026-05-12-002-sales-invoices-posted-at',
    description: 'Add postedAt column to sales_invoices — stamped by autoApproveAndPostGL; used by loading-orders pipeline/timeline queries',
    sql: [
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "postedAt" TIMESTAMP`,
    ],
  },
  {
    id: '2026-05-12-003-loading-inspection-officers-acted-at',
    description: 'Add actedAt column to loading_inspection_officers — records when an officer acted on an inspection step; used by timeline query',
    sql: [
      `ALTER TABLE loading_inspection_officers ADD COLUMN IF NOT EXISTS "actedAt" TIMESTAMP`,
    ],
  },
  {
    id: '2026-05-16-001-fm-investee-ledger',
    description: 'Create fm_investee_ledger table — stores historical debit/credit lines per investee (imported from Excel, covering pre-2026 data)',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_investee_ledger (
        id SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL,
        "investorId" INTEGER,
        "customerCode" VARCHAR(30) NOT NULL,
        "customerName" VARCHAR(255) NOT NULL,
        "transDate" DATE NOT NULL,
        "transNo" VARCHAR(100),
        "transType" VARCHAR(20),
        "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "runningBalance" DECIMAL(18,2),
        "createdBy" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investee_ledger_company ON fm_investee_ledger ("companyId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investee_ledger_code ON fm_investee_ledger ("companyId", "customerCode")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_investee_ledger_investor ON fm_investee_ledger ("investorId")`,
    ],
  },
  {
    id: '2026-05-16-002-fm-deferred-profit',
    description: 'Create fm_deferred_profit table — tracks deferred profit balance per credit facility (booked at disbursement or opening-balance cutover; reduced as profit is recognized on each repayment)',
    sql: [
      `CREATE TABLE IF NOT EXISTS fm_deferred_profit (
        id SERIAL PRIMARY KEY,
        "facilityId" INTEGER NOT NULL UNIQUE,
        "companyId" INTEGER NOT NULL,
        "effectiveDate" DATE NOT NULL,
        "totalDeferredProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "recognizedProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "remainingDeferred" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "glJournalEntryId" INTEGER,
        "setupBy" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fm_deferred_profit_facility ON fm_deferred_profit ("facilityId")`,
      `CREATE INDEX IF NOT EXISTS idx_fm_deferred_profit_company ON fm_deferred_profit ("companyId")`,
    ],
  },
  {
    id: '2026-05-16-003-fm-distributions-projected-rate',
    description: 'Add projected profit and variance columns to fm_distributions — tracks projected vs actual return per distribution period',
    sql: [
      `ALTER TABLE fm_distributions ADD COLUMN IF NOT EXISTS "projectedProfit" DECIMAL(18,2)`,
      `ALTER TABLE fm_distributions ADD COLUMN IF NOT EXISTS "varianceAmount" DECIMAL(18,2)`,
      `ALTER TABLE fm_distributions ADD COLUMN IF NOT EXISTS "variancePct" DECIMAL(8,4)`,
      `ALTER TABLE fm_distributions ADD COLUMN IF NOT EXISTS "periodDays" INTEGER`,
      `ALTER TABLE fm_distributions ADD COLUMN IF NOT EXISTS "fundProjectedRate" DECIMAL(8,4)`,
      `ALTER TABLE fm_distributions ADD COLUMN IF NOT EXISTS "fundAumAtDeclaration" DECIMAL(18,2)`,
    ],
  },
  {
    id: '2026-05-17-002-proforma-convert-to-order',
    description: 'Add proformaInvoiceId to sales_orders and convertedOrderId/validUntil to sales_invoices',
    sql: [
      `ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS "proformaInvoiceId" INTEGER`,
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "convertedOrderId" INTEGER`,
      `ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS "validUntil" DATE`,
    ],
  },
  {
    id: '2026-05-18-001-misc-receipts-table',
    description: 'Create misc_receipts table for bank-to-GL miscellaneous receipts',
    sql: [
      `CREATE TABLE IF NOT EXISTS misc_receipts (
        id               SERIAL PRIMARY KEY,
        "companyId"      INTEGER NOT NULL,
        "receiptNumber"  VARCHAR(50) NOT NULL,
        "bankId"         INTEGER NOT NULL,
        "glAccountId"    INTEGER NOT NULL,
        amount           DECIMAL(15,2) NOT NULL,
        "receiptDate"    DATE NOT NULL,
        description      TEXT NOT NULL,
        reference        VARCHAR(200),
        status           VARCHAR(20) NOT NULL DEFAULT 'draft',
        "journalEntryId" INTEGER,
        "postedBy"       INTEGER,
        "postedAt"       TIMESTAMP,
        "createdById"    INTEGER,
        "deletedAt"      TIMESTAMP,
        "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS misc_receipts_number_company ON misc_receipts ("companyId", "receiptNumber")`,
      `CREATE INDEX IF NOT EXISTS misc_receipts_company_status ON misc_receipts ("companyId", status)`,
      `CREATE INDEX IF NOT EXISTS misc_receipts_date ON misc_receipts ("receiptDate")`,
    ],
  },
  {
    id: '2026-05-20-001-murabaha-supplier',
    description: 'Add AAOIFI FAS 2 compliance columns to fm_credit_facilities (supplier FK to existing suppliers table)',
    sql: [
      // supplierId references the existing purchase.suppliers table — no new table needed
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "supplierId" INT`,
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "supplierName" VARCHAR(255)`,
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "supplierInvoiceRef" VARCHAR(100)`,
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "supplierDeliveryDate" DATE`,
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "ownershipTransferredAt" TIMESTAMP`,
      `ALTER TABLE fm_credit_facilities ADD COLUMN IF NOT EXISTS "saleJournalEntryId" INT`,
    ],
  },
  {
    id: '2026-05-24-001-payroll-statutory-columns',
    description: 'Add employee statutory deduction columns to payrolls table (payeTax, employeePensionContribution, nhfEmployee, nhisEmployee)',
    sql: [
      `ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS "payeTax" DECIMAL(15,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS "employeePensionContribution" DECIMAL(15,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS "nhfEmployee" DECIMAL(15,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS "nhisEmployee" DECIMAL(15,2) NOT NULL DEFAULT 0`,
      // Rename if migration was previously run without quotes (created lowercase columns)
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payrolls' AND column_name='payetax') THEN ALTER TABLE payrolls RENAME COLUMN payetax TO "payeTax"; END IF; END $$`,
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payrolls' AND column_name='employeepensioncontribution') THEN ALTER TABLE payrolls RENAME COLUMN employeepensioncontribution TO "employeePensionContribution"; END IF; END $$`,
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payrolls' AND column_name='nhfemployee') THEN ALTER TABLE payrolls RENAME COLUMN nhfemployee TO "nhfEmployee"; END IF; END $$`,
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payrolls' AND column_name='nhisemployee') THEN ALTER TABLE payrolls RENAME COLUMN nhisemployee TO "nhisEmployee"; END IF; END $$`,
    ],
  },
  {
    id: '2026-05-24-002-payroll-status-pending',
    description: 'Add PENDING value to PayrollStatus enum for submitted-for-approval state',
    sql: [
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'PayrollStatus' AND e.enumlabel = 'PENDING') THEN ALTER TYPE "PayrollStatus" ADD VALUE 'PENDING' AFTER 'REVIEWED'; END IF; END $$`,
    ],
  },
  {
    id: '2026-05-24-003-supplier-opening-balance',
    description: 'Add openingBalance and openingBalanceDate columns to suppliers table',
    sql: [
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "openingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS "openingBalanceDate" DATE`,
    ],
  },
  {
    id: '2026-05-25-001-dms-document-management',
    description: 'Create Document Management System tables: categories, documents, permissions, activities, shares',
    sql: [
      // DmsDocumentStatus enum
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DmsDocumentStatus') THEN CREATE TYPE "DmsDocumentStatus" AS ENUM ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','EXPIRED','SUPERSEDED'); END IF; END $$`,

      // Document categories (create first — documents FK to categories)
      `CREATE TABLE IF NOT EXISTS dms_document_categories (
        id SERIAL PRIMARY KEY,
        "companyId" INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        "parentId" INT REFERENCES dms_document_categories(id) ON DELETE SET NULL,
        color VARCHAR(20),
        icon VARCHAR(50),
        "retentionDays" INT,
        "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INT NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS dms_cat_company_slug ON dms_document_categories ("companyId", slug)`,
      `CREATE INDEX IF NOT EXISTS dms_cat_company_parent ON dms_document_categories ("companyId", "parentId")`,

      // Core documents table
      `CREATE TABLE IF NOT EXISTS dms_documents (
        id SERIAL PRIMARY KEY,
        "companyId" INT NOT NULL,
        "documentCode" VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        "categoryId" INT REFERENCES dms_document_categories(id) ON DELETE SET NULL,
        tags JSONB,
        "fileName" VARCHAR(500) NOT NULL,
        "storedFileName" VARCHAR(500) NOT NULL,
        "filePath" VARCHAR(1000) NOT NULL,
        "mimeType" VARCHAR(200) NOT NULL,
        "fileSize" INT NOT NULL DEFAULT 0,
        "fileHash" VARCHAR(64) NOT NULL,
        "sourceModule" VARCHAR(100),
        "sourceEntity" VARCHAR(200),
        "sourceEntityId" INT,
        "versionNumber" INT NOT NULL DEFAULT 1,
        "parentDocumentId" INT REFERENCES dms_documents(id) ON DELETE SET NULL,
        "isLatestVersion" BOOLEAN NOT NULL DEFAULT true,
        "retentionPolicy" VARCHAR(50),
        "retainUntil" TIMESTAMP,
        status "DmsDocumentStatus" NOT NULL DEFAULT 'DRAFT',
        "isConfidential" BOOLEAN NOT NULL DEFAULT false,
        "isArchived" BOOLEAN NOT NULL DEFAULT false,
        "archivedAt" TIMESTAMP,
        "createdBy" INT NOT NULL,
        "updatedBy" INT,
        "deletedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS dms_docs_company_code ON dms_documents ("companyId", "documentCode")`,
      `CREATE INDEX IF NOT EXISTS dms_docs_company_cat ON dms_documents ("companyId", "categoryId")`,
      `CREATE INDEX IF NOT EXISTS dms_docs_source ON dms_documents ("companyId", "sourceModule", "sourceEntityId")`,
      `CREATE INDEX IF NOT EXISTS dms_docs_hash ON dms_documents ("companyId", "fileHash")`,
      `CREATE INDEX IF NOT EXISTS dms_docs_latest ON dms_documents ("companyId", "isLatestVersion")`,
      `CREATE INDEX IF NOT EXISTS dms_docs_status ON dms_documents ("companyId", "isArchived", status)`,

      // Document permissions (ACL)
      `CREATE TABLE IF NOT EXISTS dms_document_permissions (
        id SERIAL PRIMARY KEY,
        "documentId" INT NOT NULL REFERENCES dms_documents(id) ON DELETE CASCADE,
        "principalType" VARCHAR(20) NOT NULL,
        "principalId" INT NOT NULL,
        "canView" BOOLEAN NOT NULL DEFAULT true,
        "canDownload" BOOLEAN NOT NULL DEFAULT false,
        "canEdit" BOOLEAN NOT NULL DEFAULT false,
        "canDelete" BOOLEAN NOT NULL DEFAULT false,
        "canShare" BOOLEAN NOT NULL DEFAULT false,
        "grantedBy" INT NOT NULL,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS dms_perms_doc ON dms_document_permissions ("documentId")`,
      `CREATE INDEX IF NOT EXISTS dms_perms_principal ON dms_document_permissions ("principalType", "principalId")`,

      // Activity / audit trail
      `CREATE TABLE IF NOT EXISTS dms_document_activities (
        id SERIAL PRIMARY KEY,
        "documentId" INT NOT NULL REFERENCES dms_documents(id) ON DELETE CASCADE,
        "userId" INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        details JSONB,
        "ipAddress" VARCHAR(45),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS dms_act_doc ON dms_document_activities ("documentId")`,
      `CREATE INDEX IF NOT EXISTS dms_act_user ON dms_document_activities ("userId")`,
      `CREATE INDEX IF NOT EXISTS dms_act_created ON dms_document_activities ("createdAt")`,

      // Shareable links
      `CREATE TABLE IF NOT EXISTS dms_document_shares (
        id SERIAL PRIMARY KEY,
        "documentId" INT NOT NULL REFERENCES dms_documents(id) ON DELETE CASCADE,
        "shareToken" VARCHAR(100) NOT NULL UNIQUE,
        "sharedBy" INT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "downloadCount" INT NOT NULL DEFAULT 0,
        "maxDownloads" INT,
        "requiresPin" BOOLEAN NOT NULL DEFAULT false,
        "pinHash" VARCHAR(100),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS dms_shares_doc ON dms_document_shares ("documentId")`,
    ],
  },
  {
    id: '2026-05-26-001-sales-inspection-officers-by-branch',
    description: 'Create sales_inspection_officers table for branch-scoped inspection officer assignments',
    sql: [
      `CREATE TABLE IF NOT EXISTS sales_inspection_officers (
        id SERIAL PRIMARY KEY,
        "companyId" INT NOT NULL,
        "employeeId" INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        "branchIds" JSONB,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS sio_company ON sales_inspection_officers ("companyId")`,
      `CREATE INDEX IF NOT EXISTS sio_employee ON sales_inspection_officers ("employeeId")`,
    ],
  },
];
