/**
 * Format seconds into a human-readable duration string.
 * Examples: "2h 14m", "43m", "0m"
 */
export function formatDuration(totalSeconds: number): string {
	if (totalSeconds <= 0) return '0m';
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h`;
	return `${minutes}m`;
}

/**
 * Format a Date into a locale-friendly string.
 * Example: "13 May 2026, 10:42 AM"
 */
export function formatDateTime(date: Date | string | number | null): string {
	if (!date) return '—';
	const d = new Date(date);
	if (isNaN(d.getTime())) return '—';

	return d.toLocaleDateString('en-IN', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
}
