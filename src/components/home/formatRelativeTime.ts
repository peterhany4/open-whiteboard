/**
 * Formats an ISO date string into an authentic relative time label
 * e.g., "Just now", "5m ago", "2h ago", "Yesterday", "Oct 12"
 */
export function formatRelativeTime(isoDateString: string): string {
  if (!isoDateString) return 'Just now';
  const date = new Date(isoDateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffSec) || diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() === date.getFullYear() ? undefined : 'numeric',
  });
}
