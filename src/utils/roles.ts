function formatRoleText(roleText: string): string {
  return roleText
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


export function getRoleLabel(roleText: string): string {
  return formatRoleText(roleText);
}
