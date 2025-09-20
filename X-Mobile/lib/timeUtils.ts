export function formatRelativeTime(date: string | number | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return diffSecs <= 1 ? 'just now' : `${diffSecs} sec ago`;
  }
  if (diffMins < 60) {
    return `${diffMins} min ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour ago`;
  }
  if (diffDays < 30) {
    return `${diffDays} day ago`;
  }
  if (diffMonths < 12) {
    return `${diffMonths} months ago`;
  }
  return `${diffYears} years ago`;
}