import { Code2, Database, Folder, Server, ShieldCheck, type LucideIcon } from 'lucide-react'

/**
 * Tên icon nằm trong dữ liệu (Category.icon) nên phải map qua bảng trắng:
 * import động theo chuỗi sẽ kéo toàn bộ bộ icon vào bundle.
 */
const ICONS: Record<string, LucideIcon> = {
  Code2,
  Database,
  ShieldCheck,
  Server,
}

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Folder
}
