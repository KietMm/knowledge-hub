import type { Category, Note, Topic } from './schema'

/**
 * Nội dung khởi tạo. Đây vừa là dữ liệu để app có cái đọc ngay, vừa là mẫu văn phong
 * cho các ghi chú viết sau: tiếng Việt, có code chạy được, giải thích "vì sao" chứ
 * không chỉ "cái gì".
 */

const NOW = '2026-08-17T00:00:00.000Z'

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-dev',
    name: 'Dev',
    slug: 'dev',
    description: 'Ngôn ngữ và framework để viết ứng dụng.',
    icon: 'Code2',
    color: 'sky',
    order: 1,
  },
  {
    id: 'cat-database',
    name: 'Database',
    slug: 'database',
    description: 'Lưu trữ, truy vấn và tối ưu dữ liệu.',
    icon: 'Database',
    color: 'emerald',
    order: 2,
  },
  {
    id: 'cat-security',
    name: 'Security',
    slug: 'security',
    description: 'Các lỗ hổng thường gặp và cách phòng tránh.',
    icon: 'ShieldCheck',
    color: 'rose',
    order: 3,
  },
  {
    id: 'cat-devops',
    name: 'DevOps',
    slug: 'devops',
    description: 'Đóng gói, triển khai và tự động hoá.',
    icon: 'Server',
    color: 'amber',
    order: 4,
  },
]

export const SEED_TOPICS: Topic[] = [
  {
    id: 'topic-typescript',
    categoryId: 'cat-dev',
    name: 'JavaScript / TypeScript',
    slug: 'javascript-typescript',
    description: 'Nền tảng của cả frontend lẫn Node.js.',
    order: 1,
  },
  {
    id: 'topic-python',
    categoryId: 'cat-dev',
    name: 'Python',
    slug: 'python',
    description: 'Script, xử lý dữ liệu, và backend.',
    order: 2,
  },
  {
    id: 'topic-nextjs',
    categoryId: 'cat-dev',
    name: 'Next.js',
    slug: 'nextjs',
    description: 'React framework với App Router và Server Components.',
    order: 3,
  },
  {
    id: 'topic-sql',
    categoryId: 'cat-database',
    name: 'SQL cơ bản',
    slug: 'sql-co-ban',
    description: 'Truy vấn nền tảng dùng được ở mọi hệ quản trị.',
    order: 1,
  },
  {
    id: 'topic-postgresql',
    categoryId: 'cat-database',
    name: 'PostgreSQL',
    slug: 'postgresql',
    description: 'Index, kế hoạch thực thi và các tính năng riêng của Postgres.',
    order: 2,
  },
  {
    id: 'topic-owasp',
    categoryId: 'cat-security',
    name: 'OWASP Top 10',
    slug: 'owasp-top-10',
    description: 'Mười nhóm lỗ hổng phổ biến nhất của ứng dụng web.',
    order: 1,
  },
  {
    id: 'topic-docker',
    categoryId: 'cat-devops',
    name: 'Docker',
    slug: 'docker',
    description: 'Đóng gói ứng dụng thành image chạy được ở mọi nơi.',
    order: 1,
  },
  {
    id: 'topic-cicd',
    categoryId: 'cat-devops',
    name: 'CI/CD (GitHub Actions)',
    slug: 'ci-cd-github-actions',
    description: 'Tự động kiểm thử và triển khai mỗi lần push.',
    order: 2,
  },
]

export const SEED_NOTES: Note[] = [
  {
    id: 'note-async-await',
    topicId: 'topic-typescript',
    title: 'async/await và event loop',
    slug: 'async-await-va-event-loop',
    summary: 'Vì sao code bất đồng bộ không chặn luồng chính, và async/await thực chất là gì.',
    content: `JavaScript chỉ có **một luồng** thực thi. Mọi thao tác chờ (đọc file, gọi API) đều phải giao cho môi trường bên ngoài rồi nhận kết quả qua hàng đợi callback — nếu không, giao diện sẽ đứng.

## Event loop trong một câu

Stack chạy hết code đồng bộ, sau đó event loop lấy việc từ hàng đợi ra chạy. Microtask (promise) được ưu tiên hơn macrotask (setTimeout):

\`\`\`ts
console.log('1')
setTimeout(() => console.log('2 - macrotask'), 0)
Promise.resolve().then(() => console.log('3 - microtask'))
console.log('4')
// Thứ tự in ra: 1, 4, 3 - microtask, 2 - macrotask
\`\`\`

## async/await là promise viết cho dễ đọc

\`await\` tạm dừng **hàm hiện tại**, không tạm dừng chương trình. Hàm \`async\` luôn trả về Promise:

\`\`\`ts
async function layNguoiDung(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`)
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`)
  return res.json() as Promise<User>
}
\`\`\`

## Lỗi hay gặp: await tuần tự việc chạy song song được

\`\`\`ts
// Chậm: 2 lượt chờ nối tiếp nhau
const a = await layNguoiDung('1')
const b = await layNguoiDung('2')

// Nhanh: cùng khởi động, chờ một lần
const [a2, b2] = await Promise.all([layNguoiDung('1'), layNguoiDung('2')])
\`\`\`

## Ghi nhớ

- \`await\` chỉ dừng hàm chứa nó.
- Việc độc lập nhau thì gộp bằng \`Promise.all\`.
- Microtask luôn chạy trước macrotask.`,
    tags: ['javascript', 'bat-dong-bo', 'event-loop'],
    starred: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-type-vs-interface',
    topicId: 'topic-typescript',
    title: 'Type và Interface khác nhau ở đâu',
    slug: 'type-va-interface-khac-nhau-o-dau',
    summary: 'Khi nào nên dùng type alias, khi nào nên dùng interface, và vì sao đừng tranh cãi quá nhiều.',
    content: `Cả hai đều mô tả hình dạng của dữ liệu. Khác biệt thật sự chỉ nằm ở vài điểm.

## Interface gộp được, type thì không

\`\`\`ts
interface User { id: string }
interface User { email: string }
// User giờ có cả id lẫn email (declaration merging)

type Product = { id: string }
// type Product = { price: number }  // Lỗi: định nghĩa trùng tên
\`\`\`

Tính chất này hữu ích khi mở rộng type của thư viện ngoài, nhưng trong code của mình thì thường là bất ngờ không mong muốn.

## Type làm được những thứ interface không làm được

\`\`\`ts
type Id = string | number                    // union
type Keys = keyof User                       // toán tử trên type
type Nullable<T> = T | null                  // generic alias
type Point = [number, number]                // tuple
\`\`\`

## Quy ước dùng trong dự án này

- Mô tả object công khai, có khả năng được mở rộng: \`interface\`.
- Mọi thứ còn lại (union, tuple, type suy ra từ zod): \`type\`.

\`\`\`ts
type Note = z.infer<typeof NoteSchema> // suy ra từ schema, không viết tay
\`\`\`

## Ghi nhớ

Chọn một quy ước rồi giữ nhất quán quan trọng hơn việc chọn cái nào.`,
    tags: ['typescript', 'type-system'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-server-vs-client-component',
    topicId: 'topic-nextjs',
    title: 'Server Component và Client Component',
    slug: 'server-component-va-client-component',
    summary: 'Mặc định mọi component trong App Router chạy ở server; chỉ đánh dấu "use client" khi thật sự cần.',
    content: `Trong App Router, component **mặc định chạy ở server**: nó không được gửi xuống trình duyệt, nên không tốn JavaScript phía client và được phép đọc dữ liệu trực tiếp.

## Server Component

\`\`\`tsx
// Không có "use client" -> chạy ở server
import * as notesRepo from '@/lib/db/notes.repo'

export default async function NotesPage() {
  const notes = await notesRepo.listAll() // đọc dữ liệu ngay trong component
  return <ul>{notes.map((n) => <li key={n.id}>{n.title}</li>)}</ul>
}
\`\`\`

## Client Component

Chỉ cần khi có **trạng thái**, **hiệu ứng**, hoặc **sự kiện của trình duyệt**:

\`\`\`tsx
'use client'
import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { void navigator.clipboard.writeText(text); setCopied(true) }}>
      {copied ? 'Đã chép' : 'Chép'}
    </button>
  )
}
\`\`\`

## Quy tắc thực dụng

Đẩy \`"use client"\` xuống càng sâu càng tốt. Một component client kéo theo toàn bộ cây con của nó xuống client, nên đặt nó ở lá thay vì ở layout.

## Ghi nhớ

- Mặc định: server.
- \`"use client"\` khi cần \`useState\`/\`useEffect\`/\`onClick\`.
- Server Component **được** render Client Component; chiều ngược lại chỉ qua \`children\`.`,
    tags: ['nextjs', 'react', 'server-component'],
    starred: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
]
