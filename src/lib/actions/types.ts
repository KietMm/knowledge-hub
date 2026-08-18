/**
 * Server Action không bao giờ throw ra UI: mọi lỗi đều là dữ liệu trả về, để form
 * hiển thị được lỗi theo từng field và toast hiện được thông báo.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
