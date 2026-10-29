// Per-view document metadata. The static copy in index.html is what crawlers that don't run
// JavaScript see; this keeps title, description and robots in step with the view for those that do.
export interface PageMeta {
  title: string;
  description: string;
  indexable: boolean;
}

export const DESCRIPTION =
  'FlowBoard is a simple Kanban board for small teams. Plan work in Backlog, In Progress, In Review and Done columns with drag and drop, priorities and due dates.';

export const PAGE_META = {
  signedOut: {
    title: 'Sign in to FlowBoard – Kanban board for small teams',
    description: DESCRIPTION,
    indexable: true,
  },
  // The board is private and only exists after sign-in, so it should never appear in search.
  signedIn: {
    title: 'Team Board – FlowBoard',
    description: 'Your FlowBoard team board.',
    indexable: false,
  },
} satisfies Record<string, PageMeta>;

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export function applyPageMeta({ title, description, indexable }: PageMeta) {
  document.title = title;
  setMeta('description', description);
  setMeta('robots', indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow');
}
