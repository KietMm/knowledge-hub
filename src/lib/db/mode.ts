/**
 * Chế độ chỉ đọc.
 *
 * App này ghi trực tiếp vào `data/*.json`, mà filesystem của môi trường serverless
 * (Vercel, Cloud Run, Lambda) **chỉ đọc** — và kể cả ghi được thì mỗi instance có một
 * bản riêng, biến mất sau vài phút. Nên ở những môi trường đó app chạy như một bản
 * giáo trình **tĩnh**: đọc từ dữ liệu đã biên dịch sẵn trong bundle, và mọi thao tác
 * ghi bị từ chối bằng một lỗi nói rõ lý do thay vì `EROFS` khó hiểu.
 *
 * Vì sao đọc từ bundle chứ không đọc `data/`: `readCollection()` dùng đường dẫn động
 * (`process.cwd() + '/data'`) nên Next không truy vết được để đóng gói các file đó vào
 * hàm serverless — lúc chạy chúng đơn giản là không tồn tại. `seed-data.json` thì được
 * `import` tĩnh nên chắc chắn có trong bundle.
 */

export class ReadOnlyError extends Error {
  constructor(hanhDong = 'Thay đổi dữ liệu') {
    super(
      `${hanhDong} không khả dụng ở bản triển khai công khai (chỉ đọc). ` +
        'Chạy app ở máy cá nhân để thêm hoặc sửa bài học.',
    )
    this.name = 'ReadOnlyError'
  }
}

/**
 * `KH_READONLY` đặt tay thắng mọi suy luận (để test được cả hai chiều ở local).
 * Không đặt thì tự bật khi phát hiện đang chạy trên Vercel.
 */
export function laReadOnly(): boolean {
  const co = process.env.KH_READONLY
  if (co === '1' || co === 'true') return true
  if (co === '0' || co === 'false') return false
  return process.env.VERCEL === '1'
}
