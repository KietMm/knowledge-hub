# Khung dạy học của giáo trình

Tài liệu này là **quy ước bắt buộc** khi viết hoặc sửa bài trong `content/`. Nó tồn tại vì
một lý do rất cụ thể: viết tới bài thứ 40 thì khung bắt đầu lỏng ra mà không ai nhận thấy,
và giáo trình quay về kiểu "định nghĩa → ví dụ → hết".

## Nguyên tắc gốc

> Understand → Connect → Recall → Practice

Không phải:

> Definition → Memorize → Move on

Thước đo duy nhất cho một bài viết xong:

> **"Nếu ngày mai người học quên cú pháp, họ có tự suy lại được từ mental model không?"**

Nếu câu trả lời là không, bài đó chưa đạt — bất kể nó dài và đúng đến đâu.

Mỗi khái niệm phải trả lời được tám câu: nó là gì, dùng làm gì, tại sao cần, hoạt động thế
nào, khi nào nên dùng, khi nào **không** nên dùng, liên tưởng được với cái gì, và **nếu
không dùng nó thì chuyện gì xảy ra**.

## Cấu trúc một bài

Bài học ở đây là văn bản tĩnh, không phải hội thoại — nên khung 12 mục của một tutor tương
tác được điều chỉnh lại: câu hỏi vẫn hỏi, nhưng "đợi người học trả lời" chuyển thành **không
đặt đáp án trong bài**, và "code from memory" nối sang hệ bài tập chấm được ở `/bt`.

| # | Mục | Bắt buộc | Ghi chú |
|---|---|---|---|
| 1 | `> **Sau bài này bạn sẽ:**` | ✅ | Một câu, nói kết quả người học đạt được |
| 2 | `## Ý tưởng chính` | ✅ | 1–3 câu. Vấn đề có thật trước, khái niệm sau |
| 3 | `## Mental model` | ✅ | Một liên tưởng đời thực, đơn giản tới mức nhớ được sau một lần đọc |
| 4 | `## Ví dụ nhỏ` | ✅ | Dữ liệu đủ nhỏ để giữ trọn trong đầu: `[10, 20, 30]`, không phải mảng 20 phần tử |
| 5 | `## Code chạy thế nào` | ⚠️ | Bắt buộc nếu logic có nhiều bước — trace từng bước, không chỉ nói kết quả |
| 6 | `## Cú pháp` | ⚠️ | Chỉ đặt SAU khi người học đã hiểu ý tưởng. Bài không dạy cú pháp thì bỏ |
| 7 | `## Tại sao cần nó` | ✅ | Gồm cả: không có nó thì phải làm gì, và tệ ở đâu |
| 8 | `## So sánh` | ⚠️ | Bắt buộc khi có khái niệm dễ lẫn (list vs dict, `[]` vs `{}`) |
| 9 | `## Dễ nhầm` | ✅ | Lỗi người mới thật sự mắc, kèm lý do vì sao nhầm |
| 10 | `## Mẹo nhớ` | ✅ | Một dòng rút gọn: `enumerate() = index + value` |
| 11 | `## Tự nhớ` | ✅ | 3–5 câu hỏi. **Không có đáp án trong bài** |
| 12 | `## Tự viết lại` | ✅ | Một bài nhỏ viết lại code không nhìn tài liệu |
| 13 | `## Thử sức` | ⚠️ | Áp dụng vào tình huống mới; nối sang `/bt` nếu có bài tập tương ứng |

Bài đã chuyển sang khung này khai `khung: v2` trong frontmatter. Có test kiểm mọi bài `v2`
đủ các mục bắt buộc — thiếu là test đỏ, không phải phát hiện bằng mắt.

## Mười lăm quy tắc viết

**1. Bản chất trước cú pháp.** Không mở đầu bằng `enumerate(nums)` rồi giải thích. Mở đầu
bằng: *"Khi duyệt một list, đôi khi ta cần biết cả phần tử lẫn vị trí của nó"* — rồi mới đưa
cú pháp.

**2. Ví dụ cực nhỏ.** `nums = [10, 20, 30]`. Người học phải nhìn thấy toàn bộ dữ liệu trong
đầu; ví dụ lớn làm họ mất năng lượng vào việc theo dõi dữ liệu thay vì hiểu ý tưởng.

**3. Trace từng bước.** Logic nhiều bước thì mô phỏng thực thi, đừng chỉ nói kết quả:

```text
i = 0 · x = 2 · bù = 9 - 2 = 7 · 7 chưa có → lưu 2 → chỉ số 0
i = 1 · x = 7 · bù = 9 - 7 = 2 · 2 đã có   → trả về [0, 1]
```

**4. Mental model cho mọi khái niệm quan trọng.** Dictionary = tủ hồ sơ: đưa key vào, lấy
value ra, không phải lục từng ngăn.

**5. Nối với thứ người học đã biết.** `list[index]` và `dict[key]` — giống ở `[]`, khác ở
chỗ một cái dùng vị trí, một cái dùng khoá.

**6. Chỉ rõ chỗ dễ nhầm.** `{}` tạo dict, `d[x]` truy cập dict. Hai khái niệm giống nhau thì
bắt buộc phải chỉ ra khác nhau ở đâu.

**7. Không bắt học thuộc.** Dạy cú pháp theo pattern để người học tự dựng lại được:
`enumerate → (index, value)`.

**8. Câu hỏi tự nhớ, không kèm đáp án.** Đáp án nằm trong bài thì mắt tự trượt xuống đọc, và
việc "tự lấy thông tin ra" — thứ tạo ra trí nhớ — không xảy ra.

**9. Bài viết lại code không nhìn tài liệu.** Có bài tập chấm được ở `/bt` thì nối sang đó.

**10. Nhắc lại giãn cách.** Khái niệm quan trọng phải quay lại ở bài sau dưới dạng **một câu
hỏi ngắn**, không phải lặp lại cả bài.

**11. Bốn cấp độ.** Nhận biết → Hiểu → Áp dụng → Suy luận. Câu hỏi trong `## Tự nhớ` nên
phủ ít nhất hai cấp, và cấp cao nhất thường là *"khi nào KHÔNG cần dùng nó?"*.

**12. Giải thích cái sai.** Ở mục `## Dễ nhầm`, không dừng ở "cái này sai" — nói rõ người
học đang nhầm A với B **vì sao**, rồi đưa cách phân biệt.

**13. Ép nhớ lại, đừng bảo đọc lại.** Không viết "xem lại phần trên"; viết "không nhìn lên,
thử giải thích…".

**14. Với code, tách bốn tầng.** Cú pháp / Ý nghĩa / Thực thi / Dùng khi nào. Ví dụ
`da_gap[x] = i`: cú pháp là `dict[key] = value`; ý nghĩa là lưu value theo key; thực thi là
`da_gap[7] = 1` làm dict thành `7 → 1`; dùng khi cần ánh xạ khoá tới giá trị.

**15. Nhiều loại ngoặc hoặc cú pháp giống nhau thì lập bảng.** `[]` list · `{}` dict/set ·
`()` gọi hàm/tuple — kèm ví dụ nhỏ cho từng loại.

## Điều quan trọng nhất

**Ngắn, rõ, cụ thể.** Không viết dài để tăng độ chi tiết. Một bài đúng khung mà lê thê thì
vẫn hỏng: người học bỏ giữa chừng và không tới được phần `## Tự nhớ` — nơi việc học thật sự
diễn ra.

## Chưa làm: trạng thái học của người dùng

Khung gốc còn một phần **LEARNING STATE**: ghi lại concept nào đã nắm, concept nào còn yếu,
điểm recall, rồi tự đưa concept yếu quay lại ở bài sau. Phần đó **chưa làm** và không thuộc
việc viết nội dung — nó cần lưu trạng thái theo từng người học, mà bản triển khai công khai
đang chạy chế độ chỉ đọc (xem `src/lib/db/mode.ts`), nên chỗ duy nhất lưu được là
`localStorage`. Ghi lại ở đây để không ai tưởng nó đã có.
