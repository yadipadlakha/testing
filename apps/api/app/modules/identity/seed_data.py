"""The starter permission set and default system-role → permission mapping.

Shared between the Alembic data migration (which writes it once, versioned)
and tests (which need the same codes to assert against). This is the single
source of truth for what "Sales", "Operations", etc. can do out of the box —
see docs/PRODUCT_REQUIREMENTS.md §2 and docs/DATABASE_DESIGN.md §11.
"""

from __future__ import annotations

PERMISSIONS: list[tuple[str, str]] = [
    ("identity.user:manage", "Create, update, deactivate users"),
    ("identity.role:manage", "Assign roles and manage role/permission mappings"),
    ("identity.audit_log:read", "View the audit log"),
    ("crm.lead:read", "View leads and interactions"),
    ("crm.lead:write", "Create/update leads and log interactions"),
    ("crm.account:read", "View accounts and contacts"),
    ("crm.account:write", "Create/update accounts and contacts"),
    ("sales.quotation:read", "View quotations and itineraries"),
    ("sales.quotation:write", "Create/update quotations and itineraries"),
    ("sales.quotation:approve", "Approve/accept a quotation"),
    ("sales.booking:read", "View bookings"),
    ("sales.booking:write", "Create/update bookings"),
    ("finance.invoice:read", "View invoices and payments"),
    ("finance.invoice:write", "Create/update invoices and record payments"),
    ("reporting.dashboard:read", "View dashboards and reports"),
]

# System-wide roles (organization_id = NULL), one per Phase-1 department.
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "Admin": [code for code, _ in PERMISSIONS],  # full access
    "Sales": [
        "crm.lead:read",
        "crm.lead:write",
        "crm.account:read",
        "crm.account:write",
        "sales.quotation:read",
        "sales.quotation:write",
        "sales.booking:read",
        "reporting.dashboard:read",
    ],
    "Operations": [
        "crm.lead:read",
        "crm.account:read",
        "sales.quotation:read",
        "sales.booking:read",
        "sales.booking:write",
        "reporting.dashboard:read",
    ],
    "Finance": [
        "crm.account:read",
        "sales.booking:read",
        "finance.invoice:read",
        "finance.invoice:write",
        "reporting.dashboard:read",
    ],
    "Management": [
        "crm.lead:read",
        "crm.account:read",
        "sales.quotation:read",
        "sales.quotation:approve",
        "sales.booking:read",
        "finance.invoice:read",
        "identity.audit_log:read",
        "reporting.dashboard:read",
    ],
}
