import { ifNotIn, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'

/**
 * Gợi ý method sau dấu chấm cho ô soạn bài tập.
 *
 * **Giới hạn phải nói rõ:** CodeMirror không có bộ suy luận kiểu, nên khi bạn gõ `nums.`
 * nó không biết `nums` là mảng hay chuỗi. Danh sách dưới đây là **biên soạn tay** theo
 * những kiểu mà bài tập thuật toán thật sự dùng tới — nhờ vậy người học tra được tên hàm
 * đã quên, nhưng đổi lại có thể thấy method không áp dụng được cho biến đang gõ.
 *
 * Vì sao vẫn đáng làm: giải pháp "đúng kiểu" là chạy TypeScript trong trình duyệt (~7MB)
 * cho một ô soạn 30 dòng — sai tỉ lệ hoàn toàn. Và người mới quên `slice` hay `splice`
 * thường xuyên hơn nhiều so với việc gõ nhầm kiểu.
 *
 * Gợi ý từ khoá, snippet (`for`, `function`…) và biến cục bộ KHÔNG nằm ở đây: hai gói
 * @codemirror/lang-* đã tự đăng ký sẵn, chỉ cần bật `autocompletion()` là có.
 */

/** `nhom` hiện ở cột phải của mỗi dòng gợi ý — cho biết method này thuộc kiểu nào. */
function m(label: string, nhom: string, info?: string): Completion {
  return { label, type: 'method', detail: nhom, ...(info === undefined ? {} : { info }) }
}

export const THANH_VIEN_JS: Completion[] = [
  // Mảng — nhóm dùng nhiều nhất trong bài thuật toán, để đầu để xếp hạng cao hơn.
  m('length', 'mảng/chuỗi', 'Số phần tử. Là thuộc tính, không phải hàm — không có ()'),
  m('push', 'mảng', 'Thêm vào cuối, trả về độ dài mới'),
  m('pop', 'mảng', 'Lấy ra phần tử cuối'),
  m('shift', 'mảng', 'Lấy ra phần tử đầu — O(n), tránh dùng làm hàng đợi'),
  m('unshift', 'mảng', 'Thêm vào đầu — O(n)'),
  m('slice', 'mảng/chuỗi', 'Cắt ra bản sao [batDau, ketThuc). Không sửa bản gốc'),
  m('splice', 'mảng', 'Xoá/chèn tại chỗ. CÓ sửa bản gốc'),
  m('indexOf', 'mảng/chuỗi', 'Vị trí đầu tiên, -1 nếu không có'),
  m('lastIndexOf', 'mảng/chuỗi'),
  m('includes', 'mảng/chuỗi', 'Có chứa không — trả về boolean'),
  m('find', 'mảng', 'Phần tử đầu tiên thoả điều kiện'),
  m('findIndex', 'mảng'),
  m('filter', 'mảng', 'Mảng mới gồm các phần tử thoả điều kiện'),
  m('map', 'mảng', 'Mảng mới, mỗi phần tử qua một phép biến đổi'),
  m('reduce', 'mảng', 'Gộp cả mảng về một giá trị'),
  m('forEach', 'mảng', 'Duyệt — không trả về gì'),
  m('some', 'mảng', 'Có ít nhất một phần tử thoả không'),
  m('every', 'mảng', 'Mọi phần tử đều thoả không'),
  m('sort', 'mảng', 'Sắp xếp TẠI CHỖ. Số phải truyền (a,b)=>a-b, mặc định so theo chuỗi'),
  m('reverse', 'mảng', 'Đảo ngược tại chỗ'),
  m('join', 'mảng', 'Nối thành chuỗi'),
  m('concat', 'mảng/chuỗi'),
  m('flat', 'mảng'),
  m('fill', 'mảng', 'new Array(n).fill(0)'),

  // Chuỗi
  m('split', 'chuỗi', 'Tách thành mảng'),
  m('charAt', 'chuỗi'),
  m('charCodeAt', 'chuỗi', 'Mã ký tự — hữu ích cho bài đếm chữ cái'),
  m('toLowerCase', 'chuỗi'),
  m('toUpperCase', 'chuỗi'),
  m('trim', 'chuỗi'),
  m('startsWith', 'chuỗi'),
  m('endsWith', 'chuỗi'),
  m('repeat', 'chuỗi'),
  m('padStart', 'chuỗi'),
  m('replace', 'chuỗi'),
  m('replaceAll', 'chuỗi'),

  // Map / Set — hai cấu trúc trung tâm của bài bảng băm
  m('get', 'Map', 'Lấy giá trị theo khoá, undefined nếu chưa có'),
  m('set', 'Map', 'Ghi giá trị theo khoá'),
  m('has', 'Map/Set', 'Có khoá này chưa — đây là phép tra cứu O(1)'),
  m('delete', 'Map/Set'),
  m('add', 'Set', 'Thêm vào tập, tự bỏ trùng'),
  m('clear', 'Map/Set'),
  m('keys', 'Map/Set'),
  m('values', 'Map/Set'),
  m('entries', 'Map'),
  m('size', 'Map/Set', 'Số phần tử. Là thuộc tính, không phải hàm'),

  // Number
  m('toString', 'chung'),
  m('toFixed', 'số'),
]

export const THANH_VIEN_PY: Completion[] = [
  m('append', 'list', 'Thêm vào cuối'),
  m('pop', 'list/dict', 'Lấy ra phần tử cuối; pop(0) là O(n)'),
  m('insert', 'list'),
  m('remove', 'list', 'Xoá phần tử đầu tiên có giá trị đó'),
  m('extend', 'list'),
  m('index', 'list/str', 'Vị trí đầu tiên — ném ValueError nếu không có'),
  m('count', 'list/str'),
  m('sort', 'list', 'Sắp xếp TẠI CHỖ. Dùng sorted() nếu cần bản sao'),
  m('reverse', 'list'),
  m('copy', 'list/dict'),

  m('get', 'dict', 'Lấy theo khoá, trả None (hoặc mặc định) nếu chưa có'),
  m('keys', 'dict'),
  m('values', 'dict'),
  m('items', 'dict', 'Duyệt cả khoá lẫn giá trị: for k, v in d.items()'),
  m('setdefault', 'dict'),
  m('update', 'dict/set'),

  m('add', 'set', 'Thêm vào tập'),
  m('discard', 'set', 'Xoá, không lỗi nếu không có'),

  m('split', 'str', 'Tách thành list'),
  m('join', 'str', "Nối list thành chuỗi: ''.join(ds)"),
  m('strip', 'str'),
  m('lower', 'str'),
  m('upper', 'str'),
  m('startswith', 'str'),
  m('endswith', 'str'),
  m('replace', 'str'),
  m('find', 'str', 'Vị trí đầu tiên, -1 nếu không có'),
  m('isdigit', 'str'),
  m('isalpha', 'str'),
]

/** Ký tự đứng ngay trước con trỏ là `.` (kèm phần chữ đã gõ dở). */
const SAU_DAU_CHAM = /\.\w*$/

function nguon(danhSach: Completion[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const truoc = context.matchBefore(SAU_DAU_CHAM)
    if (truoc === null) return null
    // Chỉ có mỗi dấu chấm và người dùng chưa gõ gì: vẫn gợi ý, nhưng đừng bung ra khi
    // họ chỉ đang gõ số thập phân (`1.`) — phần chữ trước dấu chấm phải là định danh.
    const dauCham = truoc.from
    const kyTuTruoc = context.state.sliceDoc(Math.max(0, dauCham - 1), dauCham)
    if (!/[\w)\]'"`]/.test(kyTuTruoc) || /\d/.test(kyTuTruoc)) return null

    return {
      // +1 để bỏ qua chính dấu chấm — nếu không, chọn xong sẽ ra `nums..push`.
      from: dauCham + 1,
      options: danhSach,
      validFor: /^\w*$/,
    }
  }
}

/** Không gợi ý bên trong chuỗi hay chú thích — ở đó `.` chỉ là dấu câu. */
export const goiYThanhVienJs = ifNotIn(
  ['String', 'TemplateString', 'LineComment', 'BlockComment'],
  nguon(THANH_VIEN_JS),
)

export const goiYThanhVienPy = ifNotIn(
  ['String', 'FormatString', 'Comment'],
  nguon(THANH_VIEN_PY),
)
