import { importBundle } from '@/lib/db/backup'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request): Promise<Response> {
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
