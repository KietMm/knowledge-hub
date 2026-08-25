/**
 * Mục nào trong menu trái đang "sáng", suy từ đường dẫn hiện tại.
 *
 * Tách khỏi component vì đây là phần dễ sai nhất và là phần duy nhất test được không cần
 * trình duyệt: mỗi hình dạng route một ca test. Bản trước để logic này nằm rải trong JSX
 * dưới dạng `pathname === '/t/' + slug`, và hệ quả là **đang đọc một bài học thì không mục
 * nào sáng cả** — mất dấu vị trí ở đúng nơi người đọc ở lâu nhất.
 *
 * Bài học không mang sẵn thông tin công nghệ trong URL (`/n/<slug>` chứ không phải
 * `/t/<topic>/n/<slug>`), nên phải tra bảng. Đây là lý do component cần `baiHocThuocCongNghe`.
 */

export type MucChinh = 'trang-chu' | 'bai-tap'

export type MucDangXem = {
  /** Mục ở khối điều hướng chính, hoặc null nếu đang ở trong giáo trình. */
  chinh: MucChinh | null
  categorySlug: string | null
  topicSlug: string | null
}

const KHONG_CO: MucDangXem = { chinh: null, categorySlug: null, topicSlug: null }

export function mucDangXem(
  pathname: string,
  baiHocThuocCongNghe: Record<string, string> = {},
): MucDangXem {
  if (pathname === '/') return { ...KHONG_CO, chinh: 'trang-chu' }

  const [, loai, slug] = pathname.split('/')

  // Kho bài tập và từng bài tập đều thuộc về mục "Bài tập" — người học đi từ danh sách
  // vào một bài rồi quay ra, mục menu không được nhấp nháy giữa hai trạng thái.
  if (loai === 'bt') return { ...KHONG_CO, chinh: 'bai-tap' }

  if (slug === undefined || slug === '') return KHONG_CO

  if (loai === 'c') return { ...KHONG_CO, categorySlug: slug }
  if (loai === 't') return { ...KHONG_CO, topicSlug: slug }

  if (loai === 'n') {
    // `/n/new` là trang tạo bài, chưa thuộc công nghệ nào.
    if (slug === 'new') return KHONG_CO
    // `/n/<slug>/edit` sáng cùng mục với `/n/<slug>`: vẫn đang ở trong bài đó.
    const topicSlug = baiHocThuocCongNghe[slug]
    return topicSlug === undefined || topicSlug === '' ? KHONG_CO : { ...KHONG_CO, topicSlug }
  }

  return KHONG_CO
}
