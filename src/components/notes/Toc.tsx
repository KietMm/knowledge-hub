import type { TocEntry } from '@/lib/markdown'

export function Toc({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null

  return (
    <nav aria-label="Mục lục" className="sticky top-20 hidden w-56 shrink-0 lg:block">
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mục lục</p>
      <ul className="space-y-1 text-sm">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.depth === 3 ? 'pl-3' : undefined}>
            <a href={`#${entry.id}`} className="text-muted-foreground hover:text-foreground">
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
