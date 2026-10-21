export const PERMISSIONS = [
  "product.view", "product.create", "product.update", "price.update", "stock.update",
  "order.view", "order.status", "customer.view", "report.view", "report.finance",
  "user.manage", "settings.update",
] as const;
export type Perm = (typeof PERMISSIONS)[number];

export const ROLE_PERMS: Record<string, readonly Perm[]> = {
  OWNER: PERMISSIONS,
  GENERAL_MANAGER: PERMISSIONS.filter((p) => p !== "user.manage"),
  CATALOG_MANAGER: ["product.view", "product.create", "product.update", "price.update", "stock.update"],
  ORDERS_MANAGER: ["order.view", "order.status", "product.view"],
  SUPPORT: ["order.view", "customer.view", "product.view"],
  REPORTS: ["report.view", "report.finance", "order.view"],
};

