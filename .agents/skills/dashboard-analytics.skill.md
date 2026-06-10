# Skill: Dashboard Analytics
This skill defines metric calculations and aggregation queries for the reception dashboard.

---

## 1. Purpose
Provide the gym owner and administrators with actionable real-time insight into member activity, revenue numbers, and membership lifecycles.

## 2. Business Rules
1. **Metric Calculations**:
   - **Active Members**: Count of members with a membership status of `ACTIVE`.
   - **Expiring Memberships**: Count of memberships expiring in the next 7 days.
   - **Expired Memberships**: Count of memberships whose end date has passed, and who do not have a renewed active plan.
   - **Today's Accesses**: Total access logs recorded today with `access_granted = true`.
   - **Monthly Revenue**: Sum of payments within the current calendar month.
2. **Chart Aggregations**:
   - **Accesses per day**: Group check-ins by day for the last 30 days.
   - **Revenue per month**: Sum payments grouped by month for the current year.

## 3. Data Flow
1. Reception Dashboard page loads.
2. Frontend triggers requests to `/analytics/summary` and `/analytics/charts`.
3. NestJS service runs fast grouping queries on `members`, `memberships`, `payments`, and `access_logs`.
4. Resulting arrays are cached or returned directly to feed the charting engine.

## 4. UI Expectations
- Grid of clean metrics card widgets showing numeric totals and trends.
- Interactive charts (e.g. Line chart for daily traffic, Bar chart for monthly revenue, Pie chart for membership tiers).

## 5. Future Expansion
- Advanced predictive analytics calculating member churn risk based on recent check-in drop-offs.
