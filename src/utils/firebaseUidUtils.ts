/**
 * Utility to validate Firebase Auth UIDs.
 * Ensures recipients are valid alphanumeric user IDs rather than display names or emails.
 */
export function isValidFirebaseUid(candidate: any): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (trimmed.length < 5) return false;
  if (trimmed.includes('@') || trimmed.includes(' ') || trimmed.includes('/')) return false;
  const lower = trimmed.toLowerCase();
  if (['unassigned', 'system', 'admin', 'notaris', 'null', 'undefined', 'anonymous', 'someone', 'user'].includes(lower)) {
    return false;
  }
  return true;
}
