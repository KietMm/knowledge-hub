import { Badge } from '@/components/ui/badge'
import { nhanTag } from '@/lib/tag-label'

/**
 * Tag lưu dạng slug vì nó là khoá lọc trên URL, nhưng người đọc không đọc slug —
 * hiện nhãn tiếng Việt và giữ slug lại ở `title` cho ai cần đối chiếu với `content/`.
 */
export function TagBadge({ tag }: { tag: string }) {
  return (
    <Badge variant="secondary" title={tag}>
      {nhanTag(tag)}
    </Badge>
  )
}
