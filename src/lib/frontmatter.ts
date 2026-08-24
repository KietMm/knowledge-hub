/**
 * Bài học được viết bằng file markdown trong `content/`, phần đầu file là khối
 * frontmatter chứa metadata (tiêu đề, slug, cấp độ, tags). Đây là bộ đọc khối đó.
 *
 * Tự viết thay vì thêm gray-matter/js-yaml: chỉ cần đúng bốn dạng giá trị (chuỗi,
 * số, boolean, mảng chuỗi một dòng) và tránh kéo cả bộ phân tích YAML vào dự án cho
 * một việc chạy lúc build. Đổi lại, cú pháp bị giới hạn có chủ đích — YAML nhiều
 * dòng, object lồng nhau sẽ bị từ chối bằng lỗi rõ ràng thay vì hiểu sai âm thầm.
 */

export type FrontmatterValue = string | number | boolean | string[]
export type Frontmatter = Record<string, FrontmatterValue>
export type ParsedFile = { data: Frontmatter; body: string }

const FENCE = '---'

export class FrontmatterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FrontmatterError'
  }
}

/** Bỏ cặp nháy bao ngoài nếu có — `title: "Có: dấu hai chấm"`. */
function unquote(raw: string): string {
  if (raw.length >= 2) {
    const first = raw[0]
    const last = raw[raw.length - 1]
    if ((first === '"' || first === "'") && first === last) return raw.slice(1, -1)
  }
  return raw
}

function parseValue(raw: string): FrontmatterValue {
  const value = raw.trim()
  if (value === 'true') return true
  if (value === 'false') return false
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim()
    if (inner === '') return []
    return inner.split(',').map((item) => unquote(item.trim()))
  }
  // Số chỉ nhận dạng nguyên/thập phân đơn giản; "01" giữ nguyên là chuỗi vì đó
  // thường là tiền tố thứ tự chứ không phải số.
  if (/^-?\d+(\.\d+)?$/.test(value) && !/^0\d/.test(value)) return Number(value)
  return unquote(value)
}

/**
 * Tách frontmatter khỏi thân bài. File không mở đầu bằng `---` được coi là hợp lệ
 * và trả về data rỗng — không phải mọi file markdown đều bắt buộc có metadata.
 */
export function parseFrontmatter(source: string): ParsedFile {
  // Chuẩn hoá xuống dòng trước: file soạn trên Windows có \r sẽ dính vào giá trị
  // cuối dòng và làm slug/level sai một cách rất khó thấy.
  const text = source.replace(/\r\n/g, '\n').replace(/^﻿/, '')
  const lines = text.split('\n')

  if (lines[0]?.trim() !== FENCE) return { data: {}, body: text.trim() }

  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE)
  if (closing === -1) {
    throw new FrontmatterError('Khối frontmatter mở bằng --- nhưng không có --- đóng lại')
  }

  const data: Frontmatter = {}
  for (let i = 1; i < closing; i += 1) {
    const line = lines[i] ?? ''
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue

    const separator = line.indexOf(':')
    if (separator === -1) {
      throw new FrontmatterError(`Dòng frontmatter không có dấu hai chấm: "${line.trim()}"`)
    }
    const key = line.slice(0, separator).trim()
    if (key === '') throw new FrontmatterError(`Dòng frontmatter thiếu tên trường: "${line.trim()}"`)
    data[key] = parseValue(line.slice(separator + 1))
  }

  return { data, body: lines.slice(closing + 1).join('\n').trim() }
}
