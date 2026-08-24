import rehypeShiki from '@shikijs/rehype'
import GithubSlugger from 'github-slugger'
import { toString as mdastToString } from 'mdast-util-to-string'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { remarkWikiLink } from '@/lib/wiki-link'
import type { Root as MdastRoot } from 'mdast'

/**
 * Render markdown ở phía server. Highlight bằng shiki tại đây nghĩa là client
 * không phải tải bộ highlighter (~1MB) — trang chi tiết ghi chú gần như không có JS.
 */

export type TocEntry = { id: string; text: string; depth: 2 | 3 }
export type RenderedMarkdown = { html: string; toc: TocEntry[] }

/**
 * Transformer của shiki: shiki dựng lại thẻ <pre> nên nhãn ngôn ngữ phải gắn
 * ở đây (không gắn được từ trước bằng rehype plugin).
 */
const langLabel = {
  name: 'kh:lang-label',
  pre(this: { options: { lang: string } }, node: { properties: Record<string, unknown> }) {
    node.properties['data-lang'] = this.options.lang
  },
}

/**
 * Processor được dựng theo từng lần render vì bảng tiêu đề (cho `[[slug]]`) là tham số.
 * unified() rẻ; phần đắt là bộ highlighter của shiki và nó được @shikijs/rehype tự nhớ
 * lại giữa các lần gọi, nên không dựng lại engine mỗi lần.
 */
function buildProcessor(titles: Map<string, string>) {
  return unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikiLink, titles)
  .use(remarkRehype)
  .use(rehypeSlug) // gắn id cho heading, dùng cùng thuật toán với GithubSlugger dưới đây
  .use(rehypeShiki, {
    // vitesse thay cho github: bộ github bão hoà cao và mang sẵn nền riêng (#fff / #24292e)
    // gần khít nền trang. vitesse dịu hơn nên chữ code không tranh chú ý với văn xuôi, và
    // hoạt động tốt trên nền do app tự đặt (xem --code trong globals.css).
    themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
    defaultColor: false, // xuất cả hai màu dạng CSS variable, chọn theo theme bằng CSS
    transformers: [langLabel],
  })
  .use(rehypeStringify)
}

/**
 * TOC được trích từ mdast bằng chính GithubSlugger mà rehype-slug dùng,
 * nên id trong mục lục luôn khớp id trong HTML.
 */
function extractToc(tree: MdastRoot): TocEntry[] {
  const slugger = new GithubSlugger()
  const toc: TocEntry[] = []
  visit(tree, 'heading', (node) => {
    const text = mdastToString(node)
    // Mọi heading đều phải qua slugger để bộ đếm trùng lặp khớp với rehype-slug.
    const id = slugger.slug(text)
    if (node.depth === 2 || node.depth === 3) {
      toc.push({ id, text, depth: node.depth })
    }
  })
  return toc
}

/**
 * `titles` là bảng slug → tiêu đề để render `[[slug]]` thành link. Bỏ trống thì
 * `[[slug]]` giữ nguyên nguyên văn — hàm vẫn thuần và test được không cần dữ liệu thật.
 */
export async function renderMarkdown(
  markdown: string,
  titles: Map<string, string> = new Map(),
): Promise<RenderedMarkdown> {
  const processor = buildProcessor(titles)
  const tree = processor.parse(markdown)
  // TOC trích TRƯỚC khi chạy plugin: heading không chứa [[...]] nên kết quả không đổi,
  // và extractToc chỉ cần cây mdast thô.
  const toc = extractToc(tree)
  const file = await processor.run(tree).then((hast) => processor.stringify(hast))
  return { html: String(file), toc }
}
