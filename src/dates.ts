// Due dates are stored as YYYY-MM-DD strings; parse them as local dates so they
// don't shift a day in timezones behind UTC.
function parseLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function formatDue(iso: string): string {
  const date = parseLocal(iso);
  if (!date) return iso;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function isOverdue(iso: string, done: boolean, now: Date = new Date()): boolean {
  const due = parseLocal(iso);
  if (!due || done) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today;
}
