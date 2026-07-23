# 10 — Platform & Identity (PLT)

**Context code:** PLT  
**Status:** Template — expand invariants, commands, and events during Prompt 0A.

---

## 1. Purpose

Tenancy, authentication, authorization, audit, notifications, and shared configuration for the video product.

---

## 2. Aggregates (placeholder)

| Aggregate | Responsibility |
|-----------|----------------|
| Organization | Tenant root |
| User | Identity |
| Membership | User ↔ Organization role |
| AuditEvent | Security and compliance log |

---

## 3. Invariants (seed — assign INV-PLT-NNN)

| ID | Statement |
|----|-----------|
| INV-PLT-001 | Every tenant-owned row is scoped to exactly one `organization_id`. |
| INV-PLT-002 | Audit events are append-only. |

---

## 4. Business rules (seed)

| ID | Statement |
|----|-----------|
| BR-PLT-001 | A user may belong to multiple organizations with independent roles. |

---

## 5. Commands / events / policies

«Document CreateOrganization, InviteUser, commands and plt.* events when specified.»

---

## 6. Integration

All contexts depend on PLT for principal and tenant resolution.

---

## 7. API surface

See `07-api-contracts.md` — auth, org, members (TBD).

---

## 8. Open questions

OQ-008 (auth model).
