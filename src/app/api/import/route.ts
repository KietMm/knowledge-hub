import { importBundle } from '@/lib/db/backup'
import { laReadOnly } from '@/lib/db/mode'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request): Promise<Response> {
  // Route Handler không có bảo vệ CSRF như Server Actions: một trang bất kỳ có thể gửi
  // "simple request" (không preflight) tới đây. Hai chặn dưới đây thu hẹp bề mặt đó:
  //  - Content-Type sai 'application/json' chặn được kiểu request text/plain đơn giản
  //    mà form/fetch từ trang khác có thể gửi mà không cần preflight.
  //  - Origin khác host chặn được request từ site khác; công cụ dòng lệnh (curl) thường
  //    KHÔNG gửi Origin nên phải cho qua trường hợp thiếu Origin, chỉ chặn khi Origin
  //    có mặt và khác host hiện tại.
  // Chặn sớm nhất có thể: không parse body của một request chắc chắn bị từ chối.
  if (laReadOnly()) {
    return Response.json(
      { ok: false, error: 'Bản triển khai này chỉ đọc — không nhập được dữ liệu.' },
      { status: 405 },
    )
  }

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return Response.json(
      { ok: false, error: 'Content-Type phải là application/json' },
      { status: 400 },
    )
  }

  const origin = request.headers.get('origin')
  if (origin !== null && origin !== new URL(request.url).origin) {
    return Response.json({ ok: false, error: 'Yêu cầu bị từ chối do khác nguồn (origin)' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Body không phải JSON hợp lệ' }, { status: 400 })
  }

  try {
    const { counts } = await importBundle(raw)
    revalidatePath('/', 'layout')
    return Response.json({ ok: true, counts })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Import thất bại' },
      { status: 400 },
    )
  }
}
