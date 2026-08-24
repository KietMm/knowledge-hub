/** Không tìm thấy bản ghi theo id/slug. */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`Không tìm thấy ${what}`)
    this.name = 'NotFoundError'
  }
}

/** Thao tác bị từ chối vì vi phạm ràng buộc (ví dụ xoá mục còn dữ liệu con). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
