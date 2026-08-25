'use client'

import { FilePlus2, MoonStar, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
/** Kết quả đã rút gọn từ /api/search — vừa đủ cho phần hiển thị. */
type KetQua = { id: string; title: string; summary: string; topicName: string; href: string }

export function SearchPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KetQua[]>([])
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Xoá truy vấn cũ ở MỌI đường đóng dialog (Esc, click ra ngoài, chọn hành động,
  // điều hướng...), không chỉ đường điều hướng — nếu không, lần mở ⌘K sau vẫn còn
  // truy vấn của lần trước.
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  /**
   * Gọi /api/search sau khi người dùng ngừng gõ 120ms.
   *
   * AbortController là bắt buộc chứ không phải tối ưu: gõ nhanh sinh ra nhiều lượt gọi
   * chồng nhau, và nếu lượt cũ về sau lượt mới thì danh sách hiện kết quả của truy vấn
   * đã cũ — lỗi rất khó tái hiện vì nó phụ thuộc độ trễ mạng.
   */
  useEffect(() => {
    if (query.trim() === '') {
      setResults([])
      return
    }
    const bo = new AbortController()
    const hen = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: bo.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data: { results: KetQua[] }) => setResults(data.results))
        .catch(() => {
          // Bị huỷ (gõ tiếp) hoặc mạng lỗi: giữ nguyên kết quả đang hiện, đừng nháy về rỗng.
        })
    }, 120)

    return () => {
      clearTimeout(hen)
      bo.abort()
    }
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, KetQua[]>()
    for (const kq of results) {
      const key = kq.topicName === '' ? 'Khác' : kq.topicName
      map.set(key, [...(map.get(key) ?? []), kq])
    }
    return [...map.entries()]
  }, [results])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Chip gọn, không phải ô nhập rộng: bấm vào cũng mở đúng dialog mà ⌘K mở, nên một
          ô trông-như-input chỉ hứa hẹn sai rằng gõ được ngay tại chỗ. Trên mobile rút về
          đúng icon để nhường chỗ cho breadcrumb. */}
      <Button
        variant="outline"
        size="sm"
        aria-label="Tìm bài học"
        className="h-9 shrink-0 gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Tìm bài học</span>
        <kbd className="hidden rounded border px-1.5 font-mono text-[0.7rem] sm:inline">⌘K</kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Tìm kiếm"
        description="Tìm bài học theo tiêu đề, tag, tóm tắt, nội dung, hoặc chạy nhanh một hành động."
      >
        {/*
          command.tsx của repo này KHÔNG tự bọc <Command> bên trong <CommandDialog>
          (khác với bản shadcn mặc định) — nếu thiếu, CommandInput/CommandList sẽ
          thiếu context của cmdk. Nên phải bọc thủ công ở đây.
          shouldFilter={false}: lọc và xếp hạng đã làm ở searchNotes rồi, để cmdk
          tự lọc lần nữa sẽ phá thứ tự xếp hạng theo spec.
        */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm theo tiêu đề, tag, nội dung..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {/*
              KHÔNG dùng <CommandEmpty>: điều kiện hiện của nó dựa vào bộ đếm nội
              bộ của cmdk (filtered.count), và khi shouldFilter={false} bộ đếm đó
              tính theo số item đang MOUNT (kể cả 2 mục "Hành động" luôn hiện diện),
              không bao giờ về 0 — nên CommandEmpty sẽ không bao giờ hiện. Tự tính
              trạng thái rỗng từ query/results.length của searchNotes thay vào đó.
            */}
            {grouped.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {query === '' ? 'Gõ để bắt đầu tìm.' : 'Không tìm thấy bài học hay bài tập nào.'}
              </div>
            )}

            {grouped.map(([topicName, group]) => (
              <CommandGroup key={topicName} heading={topicName}>
                {group.map((item) => (
                  <CommandItem key={item.id} value={item.id} onSelect={() => go(item.href)}>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{item.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{item.summary}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            <CommandGroup heading="Hành động">
              <CommandItem value="tao-ghi-chu" onSelect={() => go('/n/new')}>
                <FilePlus2 className="mr-2 h-4 w-4" />
                Tạo bài học mới
              </CommandItem>
              <CommandItem
                value="doi-theme"
                onSelect={() => {
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                  setOpen(false)
                }}
              >
                <MoonStar className="mr-2 h-4 w-4" />
                Đổi giao diện sáng/tối
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
