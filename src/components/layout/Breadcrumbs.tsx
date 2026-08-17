import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Đường dẫn" className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
          {item.href === undefined ? (
            <span className="text-foreground">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
