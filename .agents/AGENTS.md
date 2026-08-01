# KSJI Commandery Member App — Agent & Developer Guidelines

## Business Rules & Data Integrity Principles

### Deceased & Inactive Member Archival Policy
1. **Never Delete Deceased Members**:
   Deceased members must be permanently retained in the database (`status = 'Deceased'` or `is_deceased = true`) for historical, honor roll, biographical, and archival purposes (e.g., Master Record, Service Bio, Final Roll reports, Commandery history).
2. **Exclusion from Billing & Automated Communications**:
   All financial billing/invoicing, annual dues assessment, rate calculations, delinquency tracking, welfare inactive subscriber metrics, and automated reminders MUST explicitly filter out members with status `Deceased`, `Dismissed`, or `Transfer-Out`.
   - **Query Pattern**: `.not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')` and filter out `is_deceased === true`.
   - **Reasoning**: Deceased members must remain archived, but sending annual dues bills or including them in active/inactive financial and welfare subscriber lists is insensitive and incorrect.
