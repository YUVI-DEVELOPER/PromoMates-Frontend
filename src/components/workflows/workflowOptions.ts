export function normalizeWorkflowCode(value: string): string {
  return value
    .trimStart()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_");
}
