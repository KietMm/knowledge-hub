---
title: Unicode, encoding và chuỗi ký tự
slug: unicode-va-encoding
summary: Vì sao chuỗi tiếng Việt đếm ra sai độ dài, emoji làm vỡ hàm cắt chuỗi, và mojibake từ đâu ra.
level: co-ban
tags: [nen-tang, unicode, encoding, chuoi, computer-science]
khung: v2
---

> **Sau bài này bạn sẽ:** phân biệt được ký tự với byte, và biết vì sao `.length` nói dối với emoji và tiếng Việt.

## Ý tưởng chính

**Unicode** là bảng danh mục: mỗi ký tự trên đời có một số thứ tự, gọi là code point. Chữ `A` là U+0041, chữ `ế` là U+1EBF, 🐢 là U+1F422.

**Encoding** là cách **ghi số đó xuống thành byte**. UTF-8 là một cách; UTF-16 là cách khác.

Lẫn hai khái niệm này là nguồn của gần như mọi bug liên quan tới chuỗi.

## Mental model

Hãy nghĩ tới **số điện thoại và cách đọc nó ra**.

> Số điện thoại là **một dãy số cố định** — đó là Unicode code point.
>
> Nhưng bạn **đọc** nó ra được nhiều kiểu: từng chữ số một, hay gom thành cặp, hay gom ba số một. Đó là encoding.
>
> Nếu người nghe gom theo kiểu khác kiểu bạn đọc, họ ghi lại được một số **khác hoàn toàn** — mà vẫn trông như một số điện thoại hợp lệ.

Đó chính xác là **mojibake**: cùng một dãy byte, đọc bằng bảng mã khác, ra chữ khác. Không có lỗi nào được báo, chỉ là chữ vô nghĩa.

## Ví dụ nhỏ

```js
'A'.length        // 1  — 1 byte trong UTF-8
'ế'.length        // 1  — nhưng 3 byte
'🐢'.length       // 2  ← JS đếm theo đơn vị UTF-16, không theo ký tự
[...'🐢'].length  // 1  ← đúng
```

## Code chạy thế nào

**UTF-8 dùng số byte thay đổi — đó là điểm mấu chốt:**

```text
Code point          Số byte   Chứa gì
U+0000 … U+007F        1      ASCII: a-z, 0-9, dấu câu
U+0080 … U+07FF        2      chữ có dấu châu Âu, Ả Rập
U+0800 … U+FFFF        3      TIẾNG VIỆT có dấu, chữ Hán, chữ Nhật
U+10000 … U+10FFFF     4      emoji, ký tự hiếm

⇒ "Xin chào"  = 8 ký tự, 10 byte  (à = 3 byte)
⇒ "Hello"     = 5 ký tự, 5 byte
```

Hệ quả rất thực tế:

```sql
-- ❌ Người dùng nhập "Nguyễn Văn Ánh" (14 ký tự) → 20 byte
-- Cột VARCHAR(20) TÍNH THEO BYTE ở một số hệ ⇒ bị cắt cụt
-- Postgres tính theo KÝ TỰ, MySQL tuỳ charset ⇒ phải biết hệ mình dùng gì
```

**Ba đơn vị đếm khác nhau — và `.length` chọn cái sai:**

```text
BYTE        đơn vị lưu trữ         → dùng khi tính dung lượng, giới hạn cột
CODE POINT  một mục trong Unicode  → dùng khi lặp qua "ký tự"
GRAPHEME    thứ NGƯỜI DÙNG thấy là một ký tự

Ví dụ 👨‍👩‍👧 (gia đình):
  1 grapheme
  5 code point (3 người + 2 ký tự nối vô hình)
  18 byte trong UTF-8

⇒ 'gia đình'.length trong JS trả về 11 — không phải 1, cũng không phải 5.
```

```js
// Cắt chuỗi bằng slice ⇒ VỠ emoji thành hai nửa vô nghĩa
'🐢🐢'.slice(0, 1)            // '\ud83d' — nửa ký tự, hiện ra dấu hỏi

// Đúng: tách theo grapheme
const seg = new Intl.Segmenter('vi', { granularity: 'grapheme' })
[...seg.segment('👨‍👩‍👧 xin chào')].length    // đếm đúng thứ người dùng thấy
```

## Cú pháp

**Chuẩn hoá — hai chuỗi trông giống hệt nhau nhưng không bằng nhau:**

```js
const a = 'ế'              // U+1EBF — một code point
const b = 'ế'              // U+0065 U+0302 U+0301 — e + hai dấu ghép
a === b                     // false  ← trông y hệt trên màn hình
a.normalize('NFC') === b.normalize('NFC')   // true
```

```text
Đây là bug thật, không phải chuyện lý thuyết:
  macOS lưu tên file ở dạng NFD (tách dấu)
  Linux/Windows thường NFC (gộp)
  ⇒ Cùng một tên file, so sánh ra khác nhau.
  ⇒ Người dùng gõ tên trên iPhone, tìm kiếm trên web không ra.

Quy tắc: CHUẨN HOÁ VỀ NFC ở biên — ngay khi nhận dữ liệu vào.
```

**Mojibake — nhận diện và sửa:**

```text
"Xin chào"  đọc đúng UTF-8
"Xin chÃ o" ← byte UTF-8 bị đọc như Latin-1
"Xin ch??o" ← đã mất dữ liệu, KHÔNG khôi phục được

Nguyên nhân: một mắt xích trong chuỗi không khai UTF-8.
Kiểm cả sáu chỗ:
  □ <meta charset="utf-8"> trong HTML
  □ Content-Type: application/json; charset=utf-8
  □ Charset của cột và của kết nối CSDL (MySQL: utf8mb4, KHÔNG phải utf8)
  □ Encoding của file mã nguồn
  □ Locale của tiến trình
  □ Encoding khi đọc/ghi file
```

MySQL có một cái bẫy riêng: charset tên là `utf8` **chỉ chứa được 3 byte**, nên emoji không lưu được. Phải dùng `utf8mb4`.

## Tại sao cần nó

Vì bốn bug phổ biến đều xuất phát từ đây:

```text
① Đếm ký tự sai ⇒ giới hạn "tối đa 100 ký tự" chặn nhầm người dùng tiếng Việt
② Cắt chuỗi vỡ emoji ⇒ hiện dấu hỏi ở cuối đoạn tóm tắt
③ Tìm kiếm không ra ⇒ dữ liệu NFD, truy vấn NFC
④ Mojibake ⇒ toàn bộ dữ liệu tiếng Việt thành ký tự lạ
```

**Sáu quy tắc gói gọn:**

```text
① UTF-8 ở MỌI NƠI. Không có ngoại lệ đáng cân nhắc.
② Chuẩn hoá NFC ngay khi nhận dữ liệu vào.
③ Giới hạn độ dài thì nói rõ đơn vị: byte hay ký tự.
④ Cắt chuỗi bằng Intl.Segmenter, không bằng slice.
⑤ So sánh chuỗi không phân biệt hoa thường: dùng localeCompare
   hoặc toLocaleLowerCase — 'İ' của tiếng Thổ không hạ về 'i'.
⑥ MySQL: utf8mb4, không phải utf8.
```

**Sắp xếp cũng phụ thuộc ngôn ngữ:**

```js
['ă', 'a', 'b'].sort()                          // theo code point: a, b, ă  ✗
['ă', 'a', 'b'].sort((x, y) => x.localeCompare(y, 'vi'))   // a, ă, b  ✓
```

Sắp xếp mặc định dùng thứ tự code point, và thứ tự đó **không phải** thứ tự bảng chữ cái của bất kỳ ngôn ngữ nào.

## So sánh

| | Byte | Code point | Grapheme |
|---|---|---|---|
| Là gì | đơn vị lưu | mục trong Unicode | ký tự người dùng thấy |
| `'🐢'` | 4 | 1 | 1 |
| `'👨‍👩‍👧'` | 18 | 5 | 1 |
| Dùng khi | dung lượng, cột CSDL | xử lý ký tự | đếm, cắt cho người đọc |

## Dễ nhầm

**1. Dùng `.length` để đếm ký tự.** Sai với emoji và ký tự ghép.

**2. `slice` để cắt chuỗi có emoji.** Vỡ thành nửa ký tự.

**3. Quên chuẩn hoá NFC.** Chuỗi giống hệt nhau mà không bằng nhau.

**4. MySQL charset `utf8`.** Chỉ 3 byte — emoji không lưu được.

**5. Giới hạn độ dài không nói rõ đơn vị.** Người dùng tiếng Việt bị chặn sớm.

**6. `sort()` mặc định cho chuỗi tiếng Việt.** Thứ tự code point, không phải thứ tự bảng chữ cái.

**7. Quên khai charset ở một mắt xích.** Mojibake.

**8. Nghĩ mojibake luôn sửa được.** Nếu đã ghi bằng ký tự thay thế thì dữ liệu mất hẳn.

**9. Dùng `toLowerCase` cho dữ liệu đa ngôn ngữ.** Tiếng Thổ có ngoại lệ.

## Mẹo nhớ

> **Unicode là DANH MỤC. Encoding là CÁCH GHI XUỐNG BYTE. Đừng lẫn.**
>
> **UTF-8 khắp nơi + chuẩn hoá NFC ở biên.**
>
> **`.length` đếm đơn vị UTF-16, không đếm ký tự. Dùng `Intl.Segmenter`.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Unicode khác encoding thế nào?
2. Chữ tiếng Việt có dấu chiếm mấy byte trong UTF-8? Emoji?
3. Ba đơn vị đếm, mỗi cái dùng khi nào?
4. Chuẩn hoá NFC giải quyết vấn đề gì? Cho một tình huống thật.
5. Mojibake sinh ra thế nào, kiểm ở những mắt xích nào?

## Tự viết lại

Không nhìn lại, viết:

```text
① Hàm cắt chuỗi tóm tắt còn tối đa 100 ký tự, không vỡ emoji
② Hàm chuẩn hoá dữ liệu người dùng nhập trước khi lưu
③ Hàm so sánh hai tên có thể ở dạng NFC hoặc NFD
④ Sắp xếp danh sách tên tiếng Việt cho đúng
```

Tự kiểm: hàm ① của bạn xử lý thế nào khi ký tự thứ 100 nằm giữa một emoji gia đình?

## Thử sức

Sau khi chuyển dữ liệu sang hệ mới, toàn bộ tên tiếng Việt hiện thành `Nguyá»…n VÄƒn An`.

Ba câu để trả lời: chuyện gì đã xảy ra, ở tầng nào; bạn xác định **mắt xích nào** sai bằng cách nào; và dữ liệu có khôi phục được không, phụ thuộc vào điều gì. Câu khó nhất: nếu một phần dữ liệu đã hiện dấu `?` thay vì ký tự lạ, vì sao phần đó **khác hẳn** về khả năng cứu — và điều đó đổi kế hoạch của bạn ra sao?
