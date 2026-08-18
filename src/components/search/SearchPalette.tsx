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
import { searchNotes, type SearchItem, type SearchResult } from '@/lib/search'

export function SearchPalette({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
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

  // Xếp hạng do lib/search.ts quyết định; cmdk chỉ lo phần hiển thị và bàn phím.
  const results = useMemo(() => searchNotes(items, query), [items, query])

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>()
    for (const result of results) {
      const key = result.item.topicName === '' ? 'Khác' : result.item.topicName
      map.set(key, [...(map.get(key) ?? []), result])
    }
    return [...map.entries()]
  }, [results])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-sm justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Tìm ghi chú...
        <kbd className="ml-auto rounded border px-1.5 text-xs">⌘K</kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Tìm kiếm"
        description="Tìm ghi chú theo tiêu đề, tag, tóm tắt, nội dung, hoặc chạy nhanh một hành động."
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
                {query === '' ? 'Gõ để bắt đầu tìm.' : 'Không tìm thấy ghi chú nào.'}
              </div>
            )}

            {grouped.map(([topicName, group]) => (
              <CommandGroup key={topicName} heading={topicName}>
                {group.map(({ item }) => (
                  <CommandItem key={item.id} value={item.id} onSelect={() => go(`/n/${item.slug}`)}>
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
                Tạo ghi chú mới
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
