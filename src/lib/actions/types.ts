/**
 * Server Action không bao giờ throw ra UI: mọi lỗi đều là dữ liệu trả về, để form
 * hiển thị được lỗi theo từng field và toast hiện được thông báo.
 *
 * fieldErrors dùng `string[] | undefined` (không phải `string[]`) vì đây đúng là
 * hình dạng zod trả về từ `ZodError.flatten().fieldErrors` (mỗi field là optional) —
 * khai đúng hình dạng thật để không phải ép kiểu (`as`) ở nơi gọi.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }
