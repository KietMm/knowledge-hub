import { ThemeToggle } from './ThemeToggle'

export function Topbar({ search }: { search?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b pl-12 pr-6 lg:pl-6">
      <div className="flex-1">{search}</div>
      <ThemeToggle />
    </header>
  )
}
