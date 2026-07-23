# 10 — Platform & Identity (PLT)

**Context code:** PLT
**Status:** Active.

---

## 1. Purpose

Tenancy, authentication, authorization, **generation quotas**, audit, and shared configuration.

---

## 2. Aggregates

| Aggregate | Responsibility |
|-----------|----------------|
| Organization | Tenant root; plan, quota settings |
| User | Identity |
| Membership | User ↔ Organization role (`admin`, `member`) |
| Quota | Per-org spend/count limits per period (video seconds, image count, USD) |
| AuditEvent | Append-only security/compliance log |

---

## 3. Invariants

| ID | Statement |
|----|-----------|
| INV-PLT-001 | Every tenant-owned row is scoped to exactly one `organization_id`; enforced by RLS. |
| INV-PLT-002 | Audit events are append-only. |
| INV-PLT-003 | Quota consumption is recorded transactionally with generation enqueue (pairs with INV-GEN-004). |

## 4. Business rules

| ID | Statement |
|----|-----------|
| BR-PLT-001 | A user may belong to multiple organizations with independent roles. |
| BR-PLT-002 | New orgs get default quotas from config (e.g. `quota.default.usd_per_month`); admins may lower, plan changes raise. |
| BR-PLT-003 | Personal use = an auto-created single-member organization at signup (no separate "personal" model). |

---

## 5. Commands / events

`CreateOrganization`, `InviteUser`, `AcceptInvite`, `SetQuota` → `plt.OrganizationCreated`, `plt.UserInvited`, `plt.MemberJoined`, `plt.QuotaChanged`, `plt.QuotaExceeded`.

## 6. Auth (decision)

MVP: hosted auth via Auth.js with email magic-link + Google OAuth, session cookie (server-rendered app — no SPA bearer juggling). Recorded as **ADR-005** in `82-tech-stack.md`. Supersedes template OQ-008.

## 7. API surface

`07-api-contracts.md` — auth, org, members, quota read.
