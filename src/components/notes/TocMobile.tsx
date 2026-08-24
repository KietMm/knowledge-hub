import type { TocEntry } from '@/lib/markdown'

/**
 * Mục lục cho màn hình dưới 1280px — nơi mục lục cột phải không có chỗ.
 *
 * Dùng `<details>` thay vì state React: nó là phần tử gập/mở sẵn có của HTML, hoạt động
 * không cần JS, và bàn phím lẫn trình đọc màn hình đều hiểu nó. Bài học ở đây dài 6-8
 * mục nên thiếu mục lục là phải cuộn mò — điều đáng kể nhất khi đọc trên điện thoại.
 *
 * Mặc định GẬP: mở sẵn thì mục lục 8 dòng đẩy phần mở đầu bài xuống dưới màn hình.
 */
export function TocMobile({ entries }: { entries: TocEntry[] }) {
  if (entries.length === 0) return null

  return (
    <details className="rounded-lg border bg-muted/30 xl:hidden">
      <summary className="cursor-pointer list-none rounded-lg px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex items-center justify-between gap-2">
          Mục lục
          <span className="font-mono text-[0.7rem] font-normal text-muted-foreground">
            {entries.length} mục
          </span>
        </span>
      </summary>
      <ul className="border-t px-2 py-2 text-sm">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={
                'block rounded py-2 pr-2 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring ' +
                (entry.depth === 3 ? 'pl-7' : 'pl-3')
              }
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
