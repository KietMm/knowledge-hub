import { NextResponse } from 'next/server'
import { buildSearchIndex } from '@/lib/db/search-index'
import { searchNotes } from '@/lib/search'

/**
 * Tìm kiếm cho ⌘K, chạy ở máy chủ.
 *
 * Vì sao không giữ chỉ mục ở client như trước: chỉ mục mang theo TOÀN BỘ nội dung bài học
 * để tìm được cả trong thân bài, và nó được truyền xuống qua props của layout — nghĩa là
 * mọi trang, kể cả trang không ai bấm ⌘K, đều tải kèm cả giáo trình. Ở quy mô ban đầu
 * (vài chục bài) điều đó không đáng kể; với 157 bài thì mỗi trang nặng vài megabyte.
 *
 * Xếp hạng vẫn do `searchNotes` quyết định — cùng một hàm thuần đã có test, chỉ đổi chỗ
 * chạy. Kết quả trả về bị cắt bớt `content`/`tags`: giao diện không dùng tới, và không có
 * lý do gì để đẩy chúng qua mạng.
 */

const TOI_DA = 20

export async function GET(request: Request): Promise<NextResponse> {
  const query = new URL(request.url).searchParams.get('q') ?? ''
  if (query.trim() === '') return NextResponse.json({ results: [] })

  const index = await buildSearchIndex()
  const results = searchNotes(index, query)
    .slice(0, TOI_DA)
    .map(({ item }) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      topicName: item.topicName,
      href: item.href,
    }))

  return NextResponse.json({ results })
}
