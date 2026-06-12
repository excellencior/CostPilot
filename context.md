# CostPilot AI Context & Architecture Reference

This file serves as the active context and design log for AI coding assistants working on the CostPilot project. It captures the modifications, architecture patterns, and conventions of the simplified "Easy Version" codebase.

---

## 1. Core Paradigm: Simplified "Easy Version"
CostPilot has been streamlined into an "easy-mode" offline-first financial tracker. The following features were removed or modified to improve usability and styling:
1. **Default Currency (BDT)**: Enforced globally via [financial.ts](file:///home/apurboturjo/My/projects/cost-pilot/src/entities/financial.ts). The currency selection card in Settings was removed.
2. **Removed Analytics**: The Analytics tab is fully removed from navigation, and its route configuration was deleted.
3. **Removed Category System**: Custom categorization is disabled. Transactions are dynamically saved under fallback category IDs (`default-expense` / `default-income`) to preserve schema compatibility. All UI references to category badges, icons, and filters are removed.
4. **Scroll-to-Hide Header**: The top header collapses upward (`translateY(-150%)`, `opacity: 0`) when scrolling down, and animates back smoothly when scrolling up.
5. **Mobile Navigation Pill**: The bottom navigation is a compact, floating pill (`w-[280px]`) centered horizontally.

---

## 2. Monthly Database Partitioning
To prevent performance degradation on existing devices, transactions are partitioned by month in local storage:
- **Key Pattern**: `costpilot_local_db_YYYY-MM` (e.g. `costpilot_local_db_2026-06`).
- **Migration**: On app startup, `LocalRepository` scans for legacy global `expenses` keys, parses them safely, groups them by month, writes them to partitioned monthly keys, and deletes the legacy key.
- **Database Hardening**: `getRawData()` in `local-repository.ts` guarantees returning a valid object (never `null`). All iteration loops filter out non-object rows defensively.

---

## 3. Monthly Rolling Backups (Disk-Based Archiving)
- Backups are partitioned by month and saved daily in directory paths such as `March-26` or `June-26` in the user's storage.
- At `23:59:00` on the last day of each month, the app commits a final backup for that month.
- Users can click **Archive (Free Space)** on any previous month card in the History page to purge that month's local storage key and free up device space. The app will then dynamically load that month's details from the backup file on disk.

---

## 4. Key Formatting & Date Helpers
- **Amount Formatting**: Use `formatAmount(value)` from [financial.ts](file:///home/apurboturjo/My/projects/cost-pilot/src/entities/financial.ts). Do **not** use native `.toLocaleString()` as it triggers crash loops in certain WebView environments.
- **Date Formatting**: Use `formatDate(dateStr, lang)` from `financial.ts`.
- **DatePicker**: Located at [DatePicker.tsx](file:///home/apurboturjo/My/projects/cost-pilot/src/shared/ui/DatePicker.tsx). It uses static lookup arrays for months and incorporates a callback ref to auto-center the active year/month items in scrollable lists.

---

## 5. Important Bug Fixes & Gotchas
- **Translation Shadowing**: The localization helper hook uses `t` (i.e. `const { t } = useLanguage()`). Do **not** name any map iteration parameter `t` (e.g. `transactions.map(t => ...)`). This shadows the translation function and throws a fatal runtime `TypeError` when `t(...)` is called inside the loop. Always use `tx` or `tItem`.
- **Search Results JSX**: The search results view in [History.tsx](file:///home/apurboturjo/My/projects/cost-pilot/src/features/history/History.tsx) is rendered cleanly via `isFiltering` using a custom grid mapping.
- **Archive Button Position**: The **Archive (Free Space)** button in the detailed monthly history view is positioned to the right of the **Net Savings** layout container.
