import { ThemeToggle } from './ThemeToggle'

export function Topbar({ search }: { search?: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-6">
      <div className="flex-1">{search}</div>
      <ThemeToggle />
    </header>
  )
}
