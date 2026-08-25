import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '@/lib/db/seed-data'
import { tenHamPython } from '@/lib/exercise/parse'

describe('tenHamPython', () => {
  it('đổi camelCase sang snake_case', () => {
    expect(tenHamPython('haiTong')).toBe('hai_tong')
    expect(tenHamPython('doDaiKhongLap')).toBe('do_dai_khong_lap')
    expect(tenHamPython('ngoacCanDoi')).toBe('ngoac_can_doi')
  })

  it('tên một từ giữ nguyên', () => {
    expect(tenHamPython('sap')).toBe('sap')
  })

  it('cụm viết hoa liền nhau tách đúng chỗ', () => {
    expect(tenHamPython('doiJSONSangMang')).toBe('doi_json_sang_mang')
  })

  it('starter Python của mọi bài tập đều định nghĩa đúng tên hàm bộ chấm gọi', () => {
    // Tên hàm suy ra tự động, nên đây là chỗ duy nhất phát hiện được một file viết
    // tên hàm Python khác quy ước — người học sẽ nhận "không tìm thấy hàm" mà không
    // hiểu vì sao.
    for (const bt of SEED_EXERCISES) {
      if (bt.starter.py === '') continue
      expect(bt.starter.py, `Bài ${bt.slug}`).toContain(`def ${bt.hamPy}(`)
    }
  })
})
