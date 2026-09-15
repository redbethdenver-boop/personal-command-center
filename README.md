# Personal Command Center iPhone v12.3 — Grocery Save Fix

Fixes Add/Edit in Groceries. The grocery form intentionally has no Details field, but the shared save routine was still requiring that field, causing the Add button to fail. The shared save routine now safely handles forms without Details.

All dashboard and prior features are unchanged.
