export function formatPace(paceSeconds: number | null | undefined): string | null {
  if (paceSeconds == null || !isFinite(paceSeconds) || paceSeconds < 0) {
    return null;
  }

  const totalSeconds = Math.round(paceSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}