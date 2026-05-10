export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const maximumFractionDigits = unitIndex === 0 ? 0 : 1;
  return `${size.toLocaleString(undefined, { maximumFractionDigits })} ${units[unitIndex]}`;
}
