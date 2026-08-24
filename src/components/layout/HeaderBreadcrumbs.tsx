'use client'

import { usePathname } from 'next/navigation'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'

/**
 * Bản đồ tối thiểu để suy ra đường dẫn từ URL. Chỉ chứa nhãn và quan hệ cha-con —
 * không có nội dung bài học.
 */
export type CrumbIndex = {
  categories: Record<string, string>
  topics: Record<string, { name: string; categorySlug: string }>
  notes: Record<string, { title: string; topicSlug: string }>
}

/**
 * Breadcrumb sống trong Topbar sticky nên nó KHÔNG cuộn mất khi đọc giữa bài dài.
 *
 * Vì sao suy từ pathname thay vì để từng trang truyền vào: root layout không nhận được
 * dữ liệu của page trong App Router. Bản đồ ở đây rất nhỏ (nhãn + quan hệ cha-con), và
 * đổi lại breadcrumb chỉ được khai báo một lần cho cả app thay vì lặp ở từng trang —
 * thêm route mới không thể quên mất đường dẫn.
 */
export function HeaderBreadcrumbs({ index }: { index: CrumbIndex }) {
  const pathname = usePathname()
  const items = duongDan(pathname, index)

  // Trang chủ: đứng ngay gốc rồi, một breadcrumb chỉ có "Trang chủ" là nhiễu.
  if (items.length === 0) return null

  return <Breadcrumbs items={items} />
}

function duongDan(pathname: string, index: CrumbIndex): Crumb[] {
  const [, loai, slug] = pathname.split('/')
  if (slug === undefined || slug === '') return []

  const goc: Crumb = { label: 'Trang chủ', href: '/' }

  if (loai === 'c') {
    const name = index.categories[slug]
    return name === undefined ? [] : [goc, { label: name }]
  }

  if (loai === 't') {
    const topic = index.topics[slug]
    if (topic === undefined) return []
    return [...toiTopic(goc, topic, index), { label: topic.name }]
  }

  if (loai === 'n') {
    // /n/new và /n/<slug>/edit: nhãn cuối nói rõ đang làm gì, không phải tiêu đề bài.
    if (slug === 'new') return [goc, { label: 'Bài học mới' }]

    const note = index.notes[slug]
    if (note === undefined) return []
    const topic = index.topics[note.topicSlug]
    const truoc: Crumb[] =
      topic === undefined
        ? [goc]
        : [...toiTopic(goc, topic, index), { label: topic.name, href: `/t/${note.topicSlug}` }]

    const dangSua = pathname.endsWith('/edit')
    return dangSua
      ? [...truoc, { label: note.title, href: `/n/${slug}` }, { label: 'Đang sửa' }]
      : [...truoc, { label: note.title }]
  }

  return []
}

/** Trang chủ → mảng chứa công nghệ đó (bỏ qua nếu slug mảng không tra được). */
function toiTopic(goc: Crumb, topic: { categorySlug: string }, index: CrumbIndex): Crumb[] {
  const categoryName = index.categories[topic.categorySlug]
  return categoryName === undefined
    ? [goc]
    : [goc, { label: categoryName, href: `/c/${topic.categorySlug}` }]
}
