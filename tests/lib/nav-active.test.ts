import { describe, expect, it } from 'vitest'
import { mucDangXem } from '@/lib/nav-active'

const BAI_HOC = { 'hai-con-tro': 'thuat-toan-va-luyen-tap', 'bang-bam': 'cau-truc-du-lieu' }

describe('mucDangXem', () => {
  it('trang chủ', () => {
    expect(mucDangXem('/')).toMatchObject({ chinh: 'trang-chu' })
  })

  it('kho bài tập và từng bài tập cùng sáng mục "Bài tập"', () => {
    // Đi từ danh sách vào một bài rồi quay ra, mục menu không được nhấp nháy.
    expect(mucDangXem('/bt').chinh).toBe('bai-tap')
    expect(mucDangXem('/bt/hai-tong').chinh).toBe('bai-tap')
  })

  it('trang mảng', () => {
    expect(mucDangXem('/c/nen-tang')).toMatchObject({ categorySlug: 'nen-tang', topicSlug: null })
  })

  it('trang công nghệ', () => {
    expect(mucDangXem('/t/docker')).toMatchObject({ topicSlug: 'docker', categorySlug: null })
  })

  it('ĐANG ĐỌC BÀI HỌC thì sáng công nghệ chứa nó', () => {
    // Đây là lỗi bản cũ: mọi trang /n/... đều không sáng mục nào.
    expect(mucDangXem('/n/hai-con-tro', BAI_HOC).topicSlug).toBe('thuat-toan-va-luyen-tap')
  })

  it('trang sửa bài sáng cùng mục với trang bài', () => {
    expect(mucDangXem('/n/hai-con-tro/edit', BAI_HOC).topicSlug).toBe('thuat-toan-va-luyen-tap')
  })

  it('trang tạo bài mới không sáng mục nào', () => {
    expect(mucDangXem('/n/new', BAI_HOC)).toEqual({ chinh: null, categorySlug: null, topicSlug: null })
  })

  it('bài học không có trong bảng tra thì không sáng gì, không vỡ', () => {
    // Bảng tra có thể cũ hơn dữ liệu (bài vừa thêm, tab mở từ trước).
    expect(mucDangXem('/n/bai-la', BAI_HOC).topicSlug).toBeNull()
    expect(mucDangXem('/n/bai-la').topicSlug).toBeNull()
  })

  it('đường dẫn lạ không sáng gì', () => {
    expect(mucDangXem('/khong-biet/gi-do').chinh).toBeNull()
    expect(mucDangXem('/api/export')).toEqual({ chinh: null, categorySlug: null, topicSlug: null })
  })

  it('không nhầm tiền tố: /btx không phải bài tập', () => {
    expect(mucDangXem('/btx/abc').chinh).toBeNull()
  })
})
