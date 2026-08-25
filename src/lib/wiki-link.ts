import { visit } from 'unist-util-visit'
import type { Parent, PhrasingContent, Root, Text } from 'mdast'

/**
 * Liên kết chéo giữa các bài: `[[slug-bai-khac]]` trong markdown thành một link thật,
 * nhãn là **tiêu đề** của bài đích chứ không phải slug.
 *
 * Đích có thể là bài học (`/n/...`) hoặc bài tập (`/bt/...`) — nên bảng tra mang theo cả
 * url chứ không tự ghép tiền tố. Người viết nội dung chỉ cần nhớ slug, không cần nhớ nó
 * thuộc loại nào; nếu về sau một bài tập được chuyển thành bài học thì mọi chỗ trích dẫn
 * nó vẫn đúng.
 *
 * Vì sao viết `[[slug]]` thay vì `[Tiêu đề](/n/slug)` ngay trong file: tiêu đề bài có thể
 * được sửa, và lúc đó mọi chỗ trích dẫn nó sẽ nói tiêu đề cũ. Ghi slug thì nhãn luôn lấy
 * từ nguồn duy nhất là bản ghi bài đích.
 *
 * Slug không tra được thì giữ nguyên nguyên văn `[[slug]]` — thà để lộ ra rõ ràng còn hơn
 * sinh một link 404 âm thầm. `scripts/build-content.ts` cũng chặn trường hợp này lúc build.
 */

const WIKI_LINK = /\[\[([a-z0-9-]+)\]\]/g

/** slug -> nơi nó trỏ tới. */
export type DichLink = { tieuDe: string; url: string }

export function remarkWikiLink(dich: Map<string, DichLink>) {
  return function transform(tree: Root): void {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (parent === undefined || index === undefined) return
      // Bỏ qua text nằm trong chính một link: `[[a]]` bên trong [..](..) sẽ thành link lồng nhau.
      if (parent.type === 'link' || parent.type === 'linkReference') return
      if (!node.value.includes('[[')) return

      const parts = tachLink(node.value, dich)
      if (parts === null) return
      ;(parent as Parent).children.splice(index, 1, ...parts)
      // Trả về vị trí kế tiếp sau các node vừa chèn, để visit không quét lại chúng.
      return index + parts.length
    })
  }
}

/** null = không có link nào tra được, giữ nguyên node cũ. */
function tachLink(value: string, dich: Map<string, DichLink>): PhrasingContent[] | null {
  const out: PhrasingContent[] = []
  let cuoi = 0
  let coLink = false

  for (const match of value.matchAll(WIKI_LINK)) {
    const slug = match[1]
    const bai = slug === undefined ? undefined : dich.get(slug)
    if (bai === undefined) continue // slug lạ: để nguyên văn trong text

    const batDau = match.index
    if (batDau > cuoi) out.push({ type: 'text', value: value.slice(cuoi, batDau) })
    out.push({
      type: 'link',
      url: bai.url,
      children: [{ type: 'text', value: bai.tieuDe }],
      data: { hProperties: { className: ['wiki-link'] } },
    })
    cuoi = batDau + match[0].length
    coLink = true
  }

  if (!coLink) return null
  if (cuoi < value.length) out.push({ type: 'text', value: value.slice(cuoi) })
  return out
}
