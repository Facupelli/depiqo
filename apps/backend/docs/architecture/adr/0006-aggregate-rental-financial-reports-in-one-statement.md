# Aggregate rental financial reports in one statement

The rental financial report validates accepted facts and computes its totals and owner breakdowns in one PostgreSQL statement so they share a snapshot. `GROUPING SETS` produces the annual total and calendar-month buckets from the same rows using PostgreSQL `numeric`; the application does not rebuild annual totals using JavaScript floating-point arithmetic. The result uses period index 0 for the annual total and 1 through 12 for the months.
