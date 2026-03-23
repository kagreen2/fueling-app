/**
 * Returns today's date in YYYY-MM-DD format using the user's local timezone.
 * This avoids the UTC timezone bug where e.g. 11pm CST = next day in UTC.
 */
export function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
