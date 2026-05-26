# Financial Reports Implementation

## Overview

This document describes the Financial Reports functionality implemented for the Accounts module. The implementation provides IFRS-compliant financial reporting capabilities for SalvagePro ERP.

## Features Implemented

### 1. Trial Balance
- **Endpoint**: `GET /accounts/reports/trial-balance`
- **Description**: Shows all accounts with their debit and credit balances as of a specific date
- **Query Parameters**:
  - `asOfDate` (optional): Date for the report (default: today)
  - `fiscalYearId` (optional): Filter by fiscal year
  - `includeZeroBalances` (optional): Include accounts with zero balances
  - `format` (optional): Export format (json, pdf, excel, csv)

**Response Structure**:
```json
{
  "companyId": 1,
  "companyName": "Example Company Ltd",
  "asOfDate": "2026-12-31",
  "fiscalYearId": 1,
  "fiscalYearName": "FY 2026",
  "items": [
    {
      "accountId": 1,
      "accountCode": "1000",
      "accountName": "Cash",
      "accountType": "asset",
      "categoryName": "Current Assets",
      "debit": 50000.00,
      "credit": 0.00
    }
  ],
  "totals": {
    "debit": 150000.00,
    "credit": 150000.00
  },
  "isBalanced": true,
  "generatedAt": "2026-02-07T10:30:00Z"
}
```

### 2. Balance Sheet
- **Endpoint**: `GET /accounts/reports/balance-sheet`
- **Description**: IFRS-compliant balance sheet showing assets, liabilities, and equity
- **Query Parameters**:
  - `asOfDate` (optional): Date for the report (default: today)
  - `fiscalYearId` (optional): Filter by fiscal year
  - `comparePrevious` (optional): Compare with previous period
  - `format` (optional): Export format

**Structure** (IFRS Format):
```
ASSETS
  Current Assets
    - Cash and Cash Equivalents (100x, 101x)
    - Accounts Receivable (110x, 111x)
    - Inventory (120x-129x)
  Non-Current Assets
    - Property, Plant & Equipment (13xx, 14xx)
    - Intangible Assets (15xx)
  TOTAL ASSETS

LIABILITIES
  Current Liabilities (20xx, 21xx)
    - Accounts Payable
    - Short-term Debt
  Non-Current Liabilities (22xx, 23xx)
    - Long-term Debt
  TOTAL LIABILITIES

EQUITY
  - Share Capital
  - Retained Earnings
  - Current Year Profit/Loss
  TOTAL EQUITY

TOTAL LIABILITIES + EQUITY (must equal TOTAL ASSETS)
```

**Response**:
```json
{
  "companyId": 1,
  "companyName": "Example Company Ltd",
  "asOfDate": "2026-12-31",
  "assets": {
    "currentAssets": {
      "name": "Current Assets",
      "items": [...],
      "total": 500000.00
    },
    "nonCurrentAssets": {
      "name": "Non-Current Assets",
      "items": [...],
      "total": 1500000.00
    },
    "totalAssets": 2000000.00
  },
  "liabilities": {
    "currentLiabilities": { ... },
    "nonCurrentLiabilities": { ... },
    "totalLiabilities": 800000.00
  },
  "equity": {
    "shareCapital": { ... },
    "retainedEarnings": 100000.00,
    "currentYearProfit": 1100000.00,
    "totalEquity": 1200000.00
  },
  "totalLiabilitiesAndEquity": 2000000.00,
  "isBalanced": true,
  "variance": 0.00
}
```

### 3. Income Statement (P&L)
- **Endpoint**: `GET /accounts/reports/income-statement`
- **Description**: Profit & Loss statement showing revenue, expenses, and profit
- **Query Parameters**:
  - `startDate` (optional): Period start date
  - `endDate` (optional): Period end date
  - `fiscalYearId` (optional): Filter by fiscal year
  - `comparePrevious` (optional): Compare with previous period
  - `format` (optional): Export format

**Structure**:
```
REVENUE (credits to revenue accounts)
  - Sales Revenue
  - Service Revenue
  - Other Income
TOTAL REVENUE

COST OF SALES (50xx-59xx)
  - Cost of Goods Sold
GROSS PROFIT

OPERATING EXPENSES (60xx-69xx)
  - Administrative Expenses
  - Selling Expenses
OPERATING PROFIT (EBIT)

OTHER INCOME/EXPENSES (70xx-89xx)
  - Interest Income
  - Interest Expense
PROFIT BEFORE TAX (PBT)

INCOME TAX EXPENSE
NET PROFIT (PAT)
```

**Response**:
```json
{
  "companyId": 1,
  "companyName": "Example Company Ltd",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "revenue": {
    "name": "Revenue",
    "items": [...],
    "total": 1000000.00
  },
  "costOfSales": { "total": 400000.00 },
  "grossProfit": 600000.00,
  "grossProfitMargin": 60.00,
  "operatingExpenses": { "total": 300000.00 },
  "operatingProfit": 300000.00,
  "operatingProfitMargin": 30.00,
  "otherIncome": { "total": 10000.00 },
  "otherExpenses": { "total": 10000.00 },
  "profitBeforeTax": 300000.00,
  "taxExpense": 0.00,
  "netProfit": 300000.00,
  "netProfitMargin": 30.00
}
```

### 4. Cash Flow Statement
- **Endpoint**: `GET /accounts/reports/cash-flow`
- **Description**: Cash flow from operating, investing, and financing activities
- **Query Parameters**:
  - `startDate` (optional): Period start date
  - `endDate` (optional): Period end date
  - `fiscalYearId` (optional): Filter by fiscal year
  - `format` (optional): Export format

**Structure**:
```
OPERATING ACTIVITIES
  Net Profit
  Adjustments:
    + Depreciation
    + Amortization
  Changes in Working Capital:
    - Increase in Receivables
    + Increase in Payables
  Net Cash from Operations

INVESTING ACTIVITIES
  - Purchase of Fixed Assets
  + Sale of Fixed Assets
  Net Cash from Investing

FINANCING ACTIVITIES
  + New Loans
  - Loan Repayments
  + Share Capital Issued
  - Dividends Paid
  Net Cash from Financing

NET INCREASE IN CASH
Opening Cash Balance
Closing Cash Balance
```

**Note**: The current implementation provides the framework. Full working capital analysis requires additional logic to compare balance sheet changes.

### 5. Account Statement (Ledger)
- **Endpoint**: `GET /accounts/reports/account-statement/:accountId`
- **Description**: Detailed ledger for a specific account
- **Query Parameters**:
  - `startDate` (optional): Period start date
  - `endDate` (optional): Period end date
  - `format` (optional): Export format

**Response**:
```json
{
  "companyId": 1,
  "companyName": "Example Company Ltd",
  "accountId": 1,
  "accountCode": "1000",
  "accountName": "Cash",
  "accountType": "asset",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "openingBalance": 10000.00,
  "entries": [
    {
      "date": "2026-01-15",
      "entryNumber": "JE-001",
      "reference": "INV-001",
      "narration": "Payment received from customer",
      "debit": 5000.00,
      "credit": null,
      "balance": 15000.00
    }
  ],
  "closingBalance": 50000.00,
  "totalDebit": 100000.00,
  "totalCredit": 60000.00
}
```

### 6. Financial Summary (Dashboard)
- **Endpoint**: `GET /accounts/reports/financial-summary`
- **Description**: Quick financial overview for dashboard
- **Returns**: Key metrics from balance sheet and income statement

### 7. Key Financial Metrics & Ratios
- **Endpoint**: `GET /accounts/reports/key-metrics`
- **Description**: Calculate financial ratios and metrics
- **Returns**:
  - **Liquidity Ratios**:
    - Current Ratio = Current Assets / Current Liabilities
    - Quick Ratio = (Current Assets - Inventory) / Current Liabilities
    - Cash Ratio = Cash / Current Liabilities
  - **Profitability Ratios**:
    - Gross Profit Margin = (Gross Profit / Revenue) × 100
    - Operating Profit Margin = (Operating Profit / Revenue) × 100
    - Net Profit Margin = (Net Profit / Revenue) × 100
    - Return on Assets (ROA) = (Net Profit / Total Assets) × 100
    - Return on Equity (ROE) = (Net Profit / Total Equity) × 100
  - **Leverage Ratios**:
    - Debt to Equity = Total Liabilities / Total Equity
    - Debt to Assets = Total Liabilities / Total Assets

## Implementation Details

### Database Models Used

1. **IfrsAccount** - Chart of accounts
   - Fields: `id`, `code`, `name`, `accountType`, `companyId`, `categoryId`
   - Account Types: asset, liability, equity, revenue, expense

2. **JournalEntry** - Journal entries
   - Fields: `id`, `companyId`, `entryNumber`, `entryDate`, `status`, `fiscalYearId`
   - Status: draft, pending, posted, reversed

3. **JournalEntryLine** - Journal entry line items
   - Fields: `id`, `journalEntryId`, `accountId`, `debit`, `credit`, `narration`

4. **FiscalYear** - Fiscal year periods
   - Fields: `id`, `companyId`, `name`, `startDate`, `endDate`, `status`

### Calculation Logic

1. **Account Balances**:
   - Query `JournalEntryLine` grouped by `accountId`
   - Sum debits and credits from posted journal entries only
   - Net balance calculation depends on account type:
     - Assets: Debit - Credit
     - Liabilities/Equity/Revenue: Credit - Debit
     - Expenses: Debit - Credit

2. **Period Filtering**:
   - Filter by `JournalEntry.entryDate` between start and end dates
   - Optionally filter by `fiscalYearId`
   - Only include entries with `status = 'posted'`

3. **Balance Sheet**:
   - Assets = Sum of all asset account balances
   - Liabilities = Sum of all liability account balances
   - Equity = Sum of equity accounts + Retained Earnings + Current Year Profit
   - Current Year Profit = Revenue - Expenses (from Income Statement)
   - Validation: Assets = Liabilities + Equity

4. **Income Statement**:
   - Revenue = Sum of credits to revenue accounts
   - Expenses = Sum of debits to expense accounts
   - Categorization by account code:
     - Cost of Sales: 50xx-59xx
     - Operating Expenses: 60xx-69xx
     - Other Expenses: 70xx-89xx

5. **Cash Flow**:
   - Starting point: Net Profit from Income Statement
   - Adjustments for non-cash items (depreciation, etc.)
   - Working capital changes (receivables, payables, inventory)
   - Investing activities (fixed asset purchases/sales)
   - Financing activities (loans, equity, dividends)

## Account Code Structure

The implementation assumes the following account code structure:

### Assets (1xxx)
- 100x, 101x: Cash and Bank Accounts
- 110x, 111x: Accounts Receivable
- 120x-129x: Inventory
- 13xx, 14xx: Property, Plant & Equipment
- 15xx: Intangible Assets

### Liabilities (2xxx)
- 20xx, 21xx: Current Liabilities (Accounts Payable, Short-term Debt)
- 22xx, 23xx: Non-Current Liabilities (Long-term Debt)

### Equity (3xxx)
- 30xx: Share Capital
- 31xx: Retained Earnings
- 32xx: Reserves

### Revenue (4xxx)
- 40xx: Sales Revenue
- 41xx: Service Revenue
- 42xx: Other Revenue

### Expenses (5xxx-9xxx)
- 50xx-59xx: Cost of Sales
- 60xx-69xx: Operating Expenses
- 70xx-79xx: Other Income
- 80xx-89xx: Other Expenses
- 90xx: Tax Expense

## IFRS Compliance

The financial reports follow IFRS standards:

1. **IAS 1** - Presentation of Financial Statements
   - Balance Sheet structure (Assets, Liabilities, Equity)
   - Income Statement structure (Revenue, Expenses, Profit)

2. **IAS 7** - Statement of Cash Flows
   - Operating, Investing, Financing activities
   - Direct or indirect method

3. **Account Classification**:
   - Current vs Non-Current distinction
   - Proper categorization of assets and liabilities

## Export Formats

The `format` query parameter supports:
- `json` (default): JSON response
- `pdf`: PDF export (to be implemented)
- `excel`: Excel export (to be implemented)
- `csv`: CSV export (to be implemented)

## Error Handling

- **404 Not Found**: Company or account not found
- **400 Bad Request**: Invalid query parameters
- **500 Internal Server Error**: Database or calculation errors

All errors are logged using NestJS Logger.

## Performance Considerations

1. **Database Queries**:
   - Uses raw SQL queries for complex aggregations
   - Indexes on `accountId`, `entryDate`, `status`, `fiscalYearId`
   - Only queries posted journal entries

2. **Caching** (recommended for future):
   - Cache balance sheet/income statement for recent periods
   - Invalidate cache when new journal entries are posted

3. **Pagination**:
   - Account Statement supports pagination for large ledgers
   - Default limit: 50 entries per page

## Testing

Recommended test cases:

1. **Trial Balance**:
   - Verify debits equal credits
   - Test with zero balances included/excluded
   - Test fiscal year filtering

2. **Balance Sheet**:
   - Verify Assets = Liabilities + Equity
   - Test current/non-current classification
   - Test with profit/loss

3. **Income Statement**:
   - Verify revenue - expenses = profit
   - Test margin calculations
   - Test period filtering

4. **Cash Flow**:
   - Verify net cash flow matches cash balance change
   - Test activity classification

5. **Account Statement**:
   - Verify running balance calculations
   - Test pagination

## Future Enhancements

1. **Comparative Reports**: Add previous period comparison
2. **Drill-down**: Click on any line item to see detailed transactions
3. **Export Formats**: Implement PDF, Excel, CSV exports
4. **Customization**: Allow custom account code mappings
5. **Consolidation**: Multi-company consolidation
6. **Budgets**: Compare actuals vs budgets
7. **Forecasting**: Project future cash flows
8. **Analytics**: Trend analysis, variance analysis
9. **Audit Trail**: Track who viewed/exported reports
10. **Scheduled Reports**: Email reports on schedule

## Files Created

1. `services/financial-reports.service.ts` - Main report generation service
2. `dto/financial-reports.dto.ts` - DTOs for queries and responses
3. `controllers/financial-reports.controller.ts` - REST API endpoints

## Files Updated

1. `services/index.ts` - Export new service
2. `controllers/index.ts` - Export new controller
3. `dto/index.ts` - Export new DTOs
4. `accounts.module.ts` - Register service and controller

## Usage Example

```typescript
// Get balance sheet
const balanceSheet = await financialReportsService.getBalanceSheet(
  companyId,
  { asOfDate: '2026-12-31', fiscalYearId: 1 }
);

// Get income statement
const incomeStatement = await financialReportsService.getIncomeStatement(
  companyId,
  { startDate: '2026-01-01', endDate: '2026-12-31' }
);

// Get trial balance
const trialBalance = await financialReportsService.getTrialBalance(
  companyId,
  { asOfDate: '2026-12-31', includeZeroBalances: false }
);

// Get account statement
const ledger = await financialReportsService.getAccountStatement(
  companyId,
  accountId,
  { startDate: '2026-01-01', endDate: '2026-12-31' }
);
```

## Authorization

All endpoints require:
- JWT authentication
- Company context (companyId from JWT)
- Feature access: `accounts` module, `reports` feature

## API Documentation

Full API documentation is available via Swagger at `/api/docs` when the server is running.

Navigate to: `http://localhost:3000/api/docs#/Financial%20Reports`
