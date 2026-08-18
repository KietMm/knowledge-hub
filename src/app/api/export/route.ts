import { exportBundle } from '@/lib/db/backup'

/** Tải toàn bộ dữ liệu về một file JSON để sao lưu. */
export async function GET(): Promise<Response> {
  const bundle = await exportBundle()
  const date = bundle.exportedAt.slice(0, 10)

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="knowledge-hub-${date}.json"`,
    },
  })
}
