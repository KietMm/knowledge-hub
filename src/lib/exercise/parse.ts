/**
 * Bộ đọc file bài tập trong `content/bai-tap/`.
 *
 * Vì sao bộ test nằm trong thân bài chứ không nằm ở frontmatter: bộ đọc frontmatter của
 * dự án (`src/lib/frontmatter.ts`) chỉ nhận giá trị vô hướng và mảng chuỗi một dòng — có
 * chủ đích, để không phải kéo cả bộ phân tích YAML vào. Một ca test là object lồng nhau,
 * nên nó phải ở dạng khác: một khối ```json test trong thân bài. Đổi lại còn dễ đọc hơn,
 * vì ca test nằm ngay cạnh đề bài thay vì bị nén vào một dòng metadata.
 *
 * Cấu trúc một file:
 *
 *   ---frontmatter---
 *   Đề bài (markdown)
 *   ```js starter   / ```py starter    <- code khởi đầu, tách khỏi đề bài
 *   ```json test                       <- bộ test, tách khỏi đề bài
 *   ## Lời giải                        <- mọi thứ từ đây trở đi là phần lời giải
 */

import type { CaTest } from '../db/schema'

export class BaiTapError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BaiTapError'
  }
}

export const NGON_NGU = ['js', 'py'] as const
export type NgonNgu = (typeof NGON_NGU)[number]

/**
 * Một ca test: gọi hàm với `vao` làm danh sách đối số, kết quả phải bằng `ra`.
 *
 * Kiểu lấy từ schema (`import type` nên không kéo zod vào worker) để cả pipeline build,
 * bộ chấm và giao diện dùng CHUNG một kiểu — hai định nghĩa song song là chỗ chắc chắn
 * sẽ lệch nhau. Lưu ý `ra` là tuỳ chọn ở mức kiểu vì zod 3 coi mọi khoá kiểu `unknown`
 * là tuỳ chọn; `docBoTest()` bên dưới mới là chỗ bắt buộc nó phải có.
 */
export type { CaTest }

export type BaiTapDaTach = {
  deBai: string
  starter: Record<NgonNgu, string>
  boTest: CaTest[]
  loiGiai: string
}

const HEADING_LOI_GIAI = /^##\s+Lời giải\s*$/

type Khoi = { lang: string; nhan: string; code: string; tuDong: number; denDong: number }

/**
 * Quét khối code theo DÒNG chứ không bằng regex trên cả chuỗi: dấu ``` xuất hiện bên
 * trong một khối code (rất hay gặp khi bài học nói về markdown) sẽ làm regex cắt nhầm,
 * còn máy trạng thái theo dòng thì chỉ đổi trạng thái ở dòng bắt đầu bằng ```.
 */
function quetKhoi(lines: string[]): Khoi[] {
  const khoi: Khoi[] = []
  let dangMo: { lang: string; nhan: string; tuDong: number; noiDung: string[] } | null = null

  lines.forEach((line, i) => {
    if (!line.startsWith('```')) {
      dangMo?.noiDung.push(line)
      return
    }
    if (dangMo === null) {
      const [lang = '', nhan = ''] = line.slice(3).trim().split(/\s+/)
      dangMo = { lang, nhan, tuDong: i, noiDung: [] }
      return
    }
    khoi.push({
      lang: dangMo.lang,
      nhan: dangMo.nhan,
      code: dangMo.noiDung.join('\n').trim(),
      tuDong: dangMo.tuDong,
      denDong: i,
    })
    dangMo = null
  })

  if (dangMo !== null) throw new BaiTapError('Có khối code mở bằng ``` nhưng không đóng lại')
  return khoi
}

function docBoTest(raw: string): CaTest[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (loi) {
    throw new BaiTapError(`Khối \`json test\` không phải JSON hợp lệ: ${(loi as Error).message}`)
  }
  if (!Array.isArray(parsed)) throw new BaiTapError('Khối `json test` phải là một mảng các ca test')
  if (parsed.length === 0) throw new BaiTapError('Bộ test rỗng — bài tập không chấm được')

  return parsed.map((ca, i) => {
    if (typeof ca !== 'object' || ca === null) throw new BaiTapError(`Ca test #${i + 1} không phải object`)
    const { vao, ra, mo_ta, an } = ca as Record<string, unknown>
    // `vao` là danh sách ĐỐI SỐ, không phải một giá trị: hàm hai tham số cần [nums, target].
    // Bắt buộc là mảng để không phải đoán ý ở chỗ hàm một tham số nhận sẵn một mảng.
    if (!Array.isArray(vao)) {
      throw new BaiTapError(`Ca test #${i + 1} thiếu "vao" hoặc "vao" không phải mảng đối số`)
    }
    if (!('ra' in (ca as object))) throw new BaiTapError(`Ca test #${i + 1} thiếu "ra"`)
    return {
      vao,
      ra,
      ...(typeof mo_ta === 'string' ? { mo_ta } : {}),
      ...(an === true ? { an: true } : {}),
    }
  })
}

export function tachBaiTap(body: string): BaiTapDaTach {
  const lines = body.replace(/\r\n/g, '\n').split('\n')

  // Cắt phần lời giải trước khi quét khối, để khối code trong lời giải không bị lấy
  // nhầm làm starter và để nó giữ nguyên dạng markdown.
  const moLoiGiai = lines.findIndex((l) => HEADING_LOI_GIAI.test(l))
  const dongDe = moLoiGiai === -1 ? lines : lines.slice(0, moLoiGiai)
  const loiGiai = moLoiGiai === -1 ? '' : lines.slice(moLoiGiai + 1).join('\n').trim()

  const khoi = quetKhoi(dongDe)
  const starter: Record<string, string> = {}
  let rawTest: string | null = null
  const dongBiLay = new Set<number>()

  for (const k of khoi) {
    const laStarter = k.nhan === 'starter'
    const laTest = k.nhan === 'test'
    if (!laStarter && !laTest) continue
    if (laStarter) starter[k.lang] = k.code
    if (laTest) rawTest = k.code
    for (let i = k.tuDong; i <= k.denDong; i += 1) dongBiLay.add(i)
  }

  if (starter.js === undefined) {
    throw new BaiTapError('Thiếu khối ```js starter — người học cần một điểm bắt đầu')
  }
  if (rawTest === null) {
    throw new BaiTapError('Thiếu khối ```json test — không có bộ test thì không chấm được bài')
  }

  const deBai = dongDe.filter((_, i) => !dongBiLay.has(i)).join('\n').trim()
  if (deBai === '') throw new BaiTapError('Bài tập không có đề bài')

  return {
    deBai,
    // Chưa có starter Python thì để rỗng: mảnh 2 mới thêm Python, và một file thiếu nó
    // không nên làm hỏng cả bản build.
    starter: { js: starter.js, py: starter.py ?? '' },
    boTest: docBoTest(rawTest),
    loiGiai,
  }
}

/**
 * Tên hàm phía Python, suy ra từ tên hàm JavaScript: `haiTong` -> `hai_tong`.
 *
 * Vì sao suy ra chứ không bắt khai hai lần: hai tên luôn là cùng một cái tên viết theo
 * hai quy ước, nên khai tay là mở đường cho chúng lệch nhau. File nào cần tên khác quy
 * ước thì khai `ham_py` trong frontmatter để ghi đè.
 */
export function tenHamPython(hamJs: string): string {
  return hamJs
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}
