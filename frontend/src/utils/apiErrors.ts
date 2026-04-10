/** Flatten DRF-style `{ field: ["msg"] }` or `{ detail: "..." }` into one string. */
export function parseApiFieldErrors(data: unknown): string {
  if (!data || typeof data !== "object")
    return "Đã xảy ra lỗi. Vui lòng thử lại.";
  const o = data as Record<string, unknown>;
  if (typeof o.detail === "string") return o.detail;
  if (Array.isArray(o.detail)) return o.detail.map(String).join(" ");
  const parts: string[] = [];
  for (const v of Object.values(o)) {
    if (Array.isArray(v)) parts.push(...v.map(String));
    else if (typeof v === "string") parts.push(v);
  }
  return parts.join(" ") || "Đã xảy ra lỗi. Vui lòng thử lại.";
}
