'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createNoteAction, updateNoteAction } from '@/lib/actions/note.actions'
import { NoteFormSchema, isNoteFormField, type NoteFormValues } from '@/lib/actions/note-form.schema'
import type { Note, NoteLevel, Topic } from '@/lib/db/schema'
import { getLevelLabel, NOTE_LEVELS } from '@/lib/level'
import { slugify } from '@/lib/slug'
import { nhanTag } from '@/lib/tag-label'

export function NoteForm({
  topics,
  note,
  defaultTopicId,
}: {
  topics: Topic[]
  note?: Note
  defaultTopicId?: string
}) {
  const router = useRouter()
  const [tagDraft, setTagDraft] = useState('')

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(NoteFormSchema),
    defaultValues: {
      topicId: note?.topicId ?? defaultTopicId ?? '',
      title: note?.title ?? '',
      slug: note?.slug ?? '',
      summary: note?.summary ?? '',
      content: note?.content ?? '',
      tags: note?.tags ?? [],
      level: note?.level ?? 'co-ban',
    },
  })

  const { formState, handleSubmit, register, setValue, watch } = form
  const values = watch()

  // Slug tự sinh khi tạo mới; khi sửa thì giữ nguyên để không làm chết link cũ.
  useEffect(() => {
    if (note === undefined) setValue('slug', slugify(values.title))
  }, [note, setValue, values.title])

  // Cảnh báo khi rời trang lúc còn thay đổi chưa lưu.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (formState.isDirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [formState.isDirty])

  const onSubmit = handleSubmit(async (data) => {
    const result = note === undefined
      ? await createNoteAction(data)
      : await updateNoteAction(note.id, data)

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        const message = messages?.[0]
        if (message !== undefined && isNoteFormField(field)) {
          form.setError(field, { message })
        }
      }
      toast.error(result.error)
      return
    }

    toast.success(note === undefined ? 'Đã tạo bài học' : 'Đã lưu thay đổi')
    router.push(`/n/${result.data.slug}`)
  })

  function addTag() {
    const tag = tagDraft.trim()
    if (tag === '' || values.tags.includes(tag)) return
    setValue('tags', [...values.tags, tag], { shouldDirty: true })
    setTagDraft('')
  }

  function onTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
  }

  // ⌘S để lưu.
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        void onSubmit()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onSubmit])

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="topicId">Công nghệ</Label>
        <Select
          value={values.topicId}
          onValueChange={(v) => {
            if (v !== null) setValue('topicId', v, { shouldDirty: true })
          }}
        >
          <SelectTrigger id="topicId">
            {/* base-ui SelectValue chỉ hiện được text của item khi popup đã mở (item mount qua
                Portal); lúc đóng nó mặc định hiện value thô (vd "topic-docker"). Truyền children
                dạng hàm để tự map id -> tên công nghệ, luôn hiển thị đúng bất kể popup đóng/mở. */}
            <SelectValue placeholder="Chọn công nghệ">
              {(value: string | null) =>
                topics.find((topic) => topic.id === value)?.name ?? 'Chọn công nghệ'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.id}>
                {topic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={formState.errors.topicId?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="level">Cấp độ</Label>
        <Select
          value={values.level}
          onValueChange={(v) => {
            // base-ui trả về string | null; chỉ nhận giá trị nằm trong enum cấp độ.
            if (v !== null && isNoteLevel(v)) setValue('level', v, { shouldDirty: true })
          }}
        >
          <SelectTrigger id="level">
            <SelectValue>
              {(value: string | null) =>
                value !== null && isNoteLevel(value) ? getLevelLabel(value) : 'Chọn cấp độ'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {NOTE_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {getLevelLabel(level)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Dùng để sắp bài vào lộ trình học của công nghệ.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Tiêu đề</Label>
        <Input id="title" {...register('title')} />
        <FieldError message={formState.errors.title?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug (đường dẫn)</Label>
        <Input id="slug" {...register('slug')} />
        <p className="text-xs text-muted-foreground">
          Đổi slug sẽ làm hỏng các link cũ tới bài học này.
        </p>
        <FieldError message={formState.errors.slug?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary">Tóm tắt</Label>
        <Input id="summary" {...register('summary')} />
        <FieldError message={formState.errors.summary?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tag-input">Thẻ</Label>
        <div className="flex flex-wrap gap-1">
          {values.tags.map((tag) => (
            <Badge key={tag} variant="secondary" title={tag} className="gap-0.5 pr-0.5">
              {nhanTag(tag)}
              {/* Vùng bấm 28px quanh icon 12px: nút 12×12 gần như không bấm được bằng
                  ngón tay. `-my-1` giữ chiều cao badge không phình ra. */}
              <button
                type="button"
                aria-label={`Bỏ thẻ ${nhanTag(tag)}`}
                onClick={() => setValue('tags', values.tags.filter((t) => t !== tag), { shouldDirty: true })}
                className="-my-1 inline-flex h-7 w-7 items-center justify-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          id="tag-input"
          value={tagDraft}
          placeholder="Gõ tag rồi nhấn Enter"
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={onTagKeyDown}
        />
      </div>

      <Tabs defaultValue="viet">
        <TabsList>
          <TabsTrigger value="viet">Viết</TabsTrigger>
          <TabsTrigger value="xem-truoc">Xem trước</TabsTrigger>
        </TabsList>
        <TabsContent value="viet">
          <Textarea id="content" rows={20} className="font-mono text-sm" {...register('content')} />
        </TabsContent>
        <TabsContent value="xem-truoc">
          {/* Xem trước dùng react-markdown ở client: cần render tức thì, không cần highlight. */}
          <div className="prose prose-neutral min-h-[20rem] max-w-none rounded-md border p-4 dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{values.content}</ReactMarkdown>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Đang lưu...' : 'Lưu'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Huỷ
        </Button>
      </div>
    </form>
  )
}

/** Thu hẹp string (giá trị base-ui trả về) về NoteLevel mà không phải ép kiểu. */
function isNoteLevel(value: string): value is NoteLevel {
  return (NOTE_LEVELS as readonly string[]).includes(value)
}

function FieldError({ message }: { message?: string }) {
  if (message === undefined) return null
  return <p className="text-sm text-destructive">{message}</p>
}
