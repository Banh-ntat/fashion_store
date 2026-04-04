/** Role từ backend Profile — khách hàng không vào được /admin */
const STAFF_ROLES = [
  'admin',
  'product_manager',
  'order_manager',
  'customer_support',
] as const;

export function isStaffRole(role: string | null | undefined): boolean {
  return role != null && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}
