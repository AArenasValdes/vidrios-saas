export const ADMIN_PORTAL_ROOT_ID = "admin-portal-root";

export function getAdminPortalElement() {
  if (typeof document === "undefined") {
    return null;
  }

  return document.getElementById(ADMIN_PORTAL_ROOT_ID);
}
