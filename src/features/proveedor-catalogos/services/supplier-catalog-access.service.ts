/** Customers with an active organization can read the shared supplier catalog. */
export function canReadSupplierCatalog(organizationId: string | number | null | undefined) {
  return organizationId != null && String(organizationId).trim().length > 0;
}

/** Company purchase data can be maintained by the administrator or workshop technician. */
export function canManageSupplierCatalog(role: string | null | undefined) {
  return role === "admin" || role === "tecnico";
}

