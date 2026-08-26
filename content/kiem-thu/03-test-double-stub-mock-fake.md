---
title: Test double — stub, mock và fake
slug: test-double-stub-mock-fake
summary: Ba loại vật thay thế, khi nào dùng loại nào, và vì sao mock nhiều là dấu hiệu thiết kế có vấn đề.
level: trung-cap
tags: [testing, mock, stub, thiet-ke]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng loại vật thay thế cho từng tình huống, và nhận ra khi bộ test đang **báo động về thiết kế** chứ không phải về code.

## Ý tưởng chính

Test cần chạy **nhanh, ổn định, độc lập**. Nhưng code thật hay chạm vào những thứ chậm và bất định: cơ sở dữ liệu, API bên ngoài, đồng hồ, số ngẫu nhiên.

Vật thay thế (test double) là bản giả của những thứ đó. Có ba loại, và chúng phục vụ **ba mục đích khác nhau** — dùng lẫn là nguồn của rất nhiều test khó bảo trì.

## Mental model

Hãy nghĩ tới **quay phim**.

> **Stub là diễn viên đóng thế đọc thoại có sẵn.** Bạn cần cảnh có người báo tin, nên thuê người đọc đúng câu đó. Bạn không quan tâm anh ta diễn thế nào — chỉ cần câu thoại.
>
> **Mock là camera giấu trong phòng.** Bạn không quan tâm nội dung phòng đó, bạn muốn biết **có ai bước vào không, mấy lần, lúc nào**.
>
> **Fake là mô hình dựng thu nhỏ.** Không phải toà nhà thật, nhưng nó **hoạt động thật** — cửa mở ra vào được, đèn bật tắt được.

Ba mục đích: **cung cấp dữ liệu**, **kiểm tra tương tác**, **thay thế hoạt động được**.

## Ví dụ nhỏ

```ts
// STUB — chỉ cần nó trả về dữ liệu
const khoGia = { layGia: () => 100_000 }

// MOCK — cần kiểm nó CÓ ĐƯỢC GỌI không
const boGuiMail = { gui: vi.fn() }
await dangKy('a@x.com', boGuiMail)
expect(boGuiMail.gui).toHaveBeenCalledWith('a@x.com', 'chao-mung')

// FAKE — bản cài đặt thật nhưng đơn giản
class KhoTrongBoNho {
  private ds = new Map()
  async luu(u) { this.ds.set(u.id, u) }
  async tim(id) { return this.ds.get(id) ?? null }
}
```

## Code chạy thế nào

Khác biệt giữa ba loại nằm ở **cái bạn khẳng định trong `expect`**:

```text
STUB  →  expect kiểm KẾT QUẢ của hàm đang test
         "giá 100k thì tổng phải là 110k"
         (stub chỉ để cung cấp con số 100k)

MOCK  →  expect kiểm CHÍNH VẬT THAY THẾ
         "hàm gui() phải được gọi đúng một lần với địa chỉ này"

FAKE  →  expect kiểm KẾT QUẢ, và fake giữ trạng thái thật
         "lưu xong thì tìm lại phải thấy"
```

Từ đó ra quy tắc chọn:

```text
Cần dữ liệu để chạy tiếp        →  STUB
Cần chứng minh một hành động ĐÃ XẢY RA  →  MOCK
Cần thứ có trạng thái, dùng ở nhiều test →  FAKE
```

Mock chỉ đúng khi **bản thân việc gọi là kết quả cần kiểm**: gửi email, ghi log kiểm toán, gọi API thanh toán. Còn nếu bạn mock chỉ để hàm chạy được, đó là stub — và đừng `expect` lên nó.

## Cú pháp

**Tiêm phụ thuộc thắng mock module** — điểm quan trọng nhất của bài:

```ts
// ❌ Mock module — dính chặt vào đường dẫn file
vi.mock('../lib/mail', () => ({ gui: vi.fn() }))
// Đổi tên file, đổi chỗ đặt, đổi cách export → test vỡ, dù code chạy tốt
```

```ts
// ✅ Tiêm vào qua tham số
async function dangKy(email: string, boGuiMail: BoGuiMail) {
  await boGuiMail.gui(email, 'chao-mung')
}

await dangKy('a@x.com', { gui: vi.fn() })     // không cần công cụ mock nào
```

Cách thứ hai không chỉ dễ test hơn — nó **buộc bạn thiết kế tốt hơn**, vì hàm phải nói rõ nó phụ thuộc vào cái gì. Đây chính là chữ D trong SOLID ([[solid-giai-thich-bang-code-that]]).

**Đồng hồ và số ngẫu nhiên** — hai nguồn bất định phổ biến nhất:

```ts
// ❌ Không test được: kết quả đổi theo thời điểm chạy
function laHetHan(han: Date) { return han < new Date() }

// ✅ Thời gian thành đầu vào
function laHetHan(han: Date, bayGio: Date) { return han < bayGio }
```

```ts
// Hoặc đóng băng đồng hồ
vi.useFakeTimers()
vi.setSystemTime(new Date('2026-01-01'))
// ...
vi.useRealTimers()
```

Cùng cách với `Math.random()`, `crypto.randomUUID()`: **biến thứ bất định thành tham số**. Nguyên tắc chung ở [[ham-dau-vao-dau-ra-va-tac-dung-phu]].

## Tại sao cần nó

Vì **mock nhiều là mùi thiết kế**, và đây là thông tin quý mà bộ test cho bạn miễn phí:

```ts
// ❌ Test này đang kêu cứu
it('xử lý đơn hàng', async () => {
  vi.mock('../db')
  vi.mock('../mail')
  vi.mock('../thanh-toan')
  vi.mock('../kho')
  vi.mock('../log')
  // 40 dòng dựng mock... rồi mới tới phần test thật
})
```

Nó nói: **hàm `xuLyDon` đang phụ thuộc năm thứ**. Vấn đề không nằm ở test — nằm ở hàm.

Cách chữa là tách phần **quyết định** khỏi phần **thực hiện**:

```ts
// Hàm thuần: chứa toàn bộ nghiệp vụ khó, test không cần mock nào
function quyetDinhXuLyDon(don: Don, tonKho: number): HanhDong[] {
  if (tonKho < don.soLuong) return [{ loai: 'tu_choi', ly_do: 'het_hang' }]
  return [{ loai: 'tru_kho' }, { loai: 'thu_tien' }, { loai: 'gui_mail' }]
}

// Vỏ mỏng: chỉ thực hiện, gần như không có logic để sai
async function xuLyDon(id, dv) {
  const hanhDong = quyetDinhXuLyDon(await dv.layDon(id), await dv.layTonKho(id))
  for (const h of hanhDong) await dv.thucHien(h)
}
```

Giờ 90% logic nằm trong hàm thuần — test nó bằng dữ liệu thật, không mock gì cả. Vỏ ngoài đơn giản tới mức một integration test là đủ.

## So sánh

| | Stub | Mock | Fake |
|---|---|---|---|
| Mục đích | Cung cấp dữ liệu | Kiểm tương tác | Bản cài đặt đơn giản |
| `expect` đặt ở đâu | Kết quả hàm | Chính vật thay thế | Kết quả hàm |
| Có trạng thái | Không | Không | ✅ |
| Vỡ khi refactor | Ít | **Nhiều** | Ít |
| Dùng khi | Hầu hết trường hợp | Việc gọi **là** kết quả | Kho dữ liệu, cache, hàng đợi |

Fake bị đánh giá thấp: một `KhoTrongBoNho` viết 20 dòng dùng được cho **hàng trăm test**, chạy nhanh như mock nhưng không vỡ khi bạn đổi cách gọi.

## Dễ nhầm

**1. Mock mọi thứ.** Test trở thành bản chép lại code — và nó xanh cả khi code sai, vì bạn chỉ đang kiểm chính giả định của mình.

**2. `expect` lên stub.** Nếu bạn kiểm rằng stub được gọi, nó không còn là stub — và bạn vừa gắn test vào chi tiết cài đặt.

**3. Mock module theo đường dẫn.** Đổi cấu trúc thư mục là vỡ hàng loạt test dù code chạy tốt.

**4. Mock thư viện bên thứ ba sâu bên trong.** Bạn đang khẳng định về **cách bạn nghĩ** thư viện hoạt động. Nó nâng cấp, hành vi đổi, test vẫn xanh — và production vỡ.

**5. Không đặt lại mock giữa các test.** Mock nhớ số lần gọi từ test trước ⇒ test chập chờn theo thứ tự chạy. Dùng `beforeEach(() => vi.clearAllMocks())`.

**6. Dùng mock để né việc thiết kế.** Xem phần trên: 5 mock trong một test là tín hiệu, không phải bất tiện.

## Mẹo nhớ

> **Stub đọc thoại · Mock là camera · Fake là mô hình dựng thu nhỏ.**
>
> **Tiêm phụ thuộc thắng mock module.**
>
> **Cần 5 mock cho một test ⇒ sửa THIẾT KẾ, đừng sửa test.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba loại vật thay thế và mục đích của từng loại?
2. Phân biệt chúng bằng cách nhìn vào đâu trong test?
3. Vì sao tiêm phụ thuộc tốt hơn `vi.mock` theo đường dẫn?
4. Vì sao mock nhiều là mùi thiết kế, và cách chữa gốc rễ là gì?
5. Làm sao test được hàm phụ thuộc `new Date()`?

## Tự viết lại

Không nhìn lại phần trên, viết test cho hàm này **không dùng công cụ mock nào**:

```ts
async function nhacHetHan(dv: { layDonSapHetHan(): Promise<Don[]>; gui(email: string, noiDung: string): Promise<void> }) {
  const ds = await dv.layDonSapHetHan()
  for (const d of ds) await dv.gui(d.email, `Đơn ${d.id} sắp hết hạn`)
}
```

Tự kiểm: bạn dùng loại vật thay thế nào cho `layDonSapHetHan`, loại nào cho `gui`, và vì sao **khác nhau**?

## Thử sức

Một test có 60 dòng dựng mock và 5 dòng test thật. Nó đã xanh 8 tháng. Rồi một hôm production hỏng ở đúng hàm đó, mà test vẫn xanh.

Giải thích **vì sao test không bắt được**. Rồi trả lời câu quan trọng hơn: bạn sửa test, hay sửa hàm — và làm sao để loại bug này không lọt lần nữa?
