---
title: Resource, prompt và tool
slug: resource-prompt-va-tool
summary: Ba loại thứ một server phơi ra — khác nhau ở AI quyết định dùng, và chọn sai loại làm gì hỏng.
level: trung-cap
tags: [ai, mcp, thiet-ke, kien-truc]
khung: v2
---

> **Sau bài này bạn sẽ:** chọn đúng giữa tool, resource và prompt, và biết chọn sai gây hậu quả gì.

## Ý tưởng chính

Ba loại thứ MCP server phơi ra khác nhau ở **ai quyết định dùng nó**:

**Tool** — mô hình quyết định. **Resource** — host hoặc người dùng chọn. **Prompt** — người dùng chọn.

Chọn sai loại không làm hệ thống sập. Nó làm mô hình gọi thứ không nên gọi, hoặc người dùng không tìm được thứ họ cần.

## Mental model

Hãy nghĩ tới **ba loại thứ trong một văn phòng**.

> **Tủ hồ sơ có nhãn** — nhân viên tự lấy khi cần. Bạn không quyết định họ lấy cái nào. Đó là **tool**.
>
> **Tài liệu trên bàn họp** — người chủ trì đặt lên trước buổi họp. Nó ở đó vì có người **chọn** đưa nó vào. Đó là **resource**.
>
> **Mẫu biên bản in sẵn** — người ghi biên bản chọn dùng mẫu nào cho loại họp nào. Đó là **prompt**.

Ba thứ đều là "thông tin trong phòng họp", nhưng **ai đặt nó vào phòng** khác nhau — và điều đó quyết định hành vi của hệ thống.

## Ví dụ nhỏ

```text
TOOL      "tim_kiem_tai_lieu(tuKhoa)"   → mô hình gọi khi thấy cần
RESOURCE  "docs://chinh-sach/doi-tra"   → người dùng gắn vào ngữ cảnh
PROMPT    "phan-tich-khieu-nai"         → người dùng chọn từ menu
```

## Code chạy thế nào

**Tool — mô hình quyết định:**

```text
Dùng khi: cần HÀNH ĐỘNG, hoặc cần dữ liệu mà mô hình phải
          quyết định lấy khi nào và lấy gì.

Đặc điểm: mô tả của MỌI tool nằm trong ngữ cảnh ở MỌI lời gọi.
  ⇒ Nhiều tool ⇒ tốn token và mô hình chọn sai nhiều hơn.
  ⇒ Đây là lý do đừng biến mọi thứ thành tool.
```

**Resource — người dùng hoặc host chọn:**

```text
Dùng khi: dữ liệu người dùng BIẾT mình cần, và có địa chỉ rõ ràng.
          Tài liệu, file, bản ghi cụ thể.

Đặc điểm: server chỉ phơi DANH SÁCH và cách đọc.
  Người dùng (hoặc host) chọn resource nào đưa vào ngữ cảnh.
  ⇒ KHÔNG chiếm token khi không được chọn.
  ⇒ Và người dùng biết chính xác cái gì đang trong ngữ cảnh.
```

```text
Khác biệt then chốt so với tool:
  Cùng một tài liệu chính sách:
    Làm TOOL     ⇒ mô hình có thể gọi nhiều lần, lấy sai đoạn,
                   hoặc không gọi khi cần
    Làm RESOURCE ⇒ người dùng gắn vào khi họ biết cần nó,
                   và nó chắc chắn nằm trong ngữ cảnh
```

**Prompt — người dùng chọn:**

```text
Dùng khi: có một VIỆC lặp lại, cần một prompt được viết kỹ.
          "phân tích khiếu nại", "viết tài liệu cho hàm này",
          "rà soát mã theo checklist của đội"

Đặc điểm: nó là một MẪU có tham số, đóng gói sẵn.
  ⇒ Người dùng không phải tự viết prompt tốt mỗi lần.
  ⇒ Và đội chuẩn hoá được cách làm một việc.
```

```text
Prompt là loại bị dùng ít nhất và có giá trị bất ngờ:
nó là cách đóng gói KINH NGHIỆM của đội thành thứ dùng lại được
([[prompt-nhu-mot-dac-ta]]).
```

## Cú pháp

**Chọn loại nào — ba câu hỏi:**

```text
① Đây là HÀNH ĐỘNG hay DỮ LIỆU?
   Hành động ⇒ tool.

② Nếu là dữ liệu: NGƯỜI DÙNG biết mình cần cái nào không?
   Biết   ⇒ resource (họ chọn)
   Không  ⇒ tool tìm kiếm (mô hình tìm)

③ Đây là một VIỆC lặp lại có cách làm chuẩn?
   ⇒ prompt
```

```text
Câu ② là câu quyết định nhiều nhất:
  "Cho tôi xem chính sách đổi trả"      → người dùng biết → resource
  "Chính sách nào áp dụng cho ca này?"  → không biết      → tool tìm kiếm
```

**Ba lỗi chọn loại và hậu quả:**

```text
① BIẾN MỌI THỨ THÀNH TOOL
   ⇒ 30 tool, mô tả chiếm token ở mọi lời gọi
   ⇒ Mô hình chọn sai nhiều hơn
   ⇒ Người dùng không kiểm soát được cái gì vào ngữ cảnh

② DÙNG RESOURCE CHO THỨ CẦN TÌM KIẾM
   ⇒ Người dùng phải tự biết địa chỉ tài liệu
   ⇒ Với 5.000 tài liệu, không ai duyệt danh sách được
   ⇒ Cần tool tìm kiếm, hoặc RAG ([[rag-la-gi-va-khi-nao-dung]])

③ KHÔNG DÙNG PROMPT
   ⇒ Mỗi người tự viết prompt cho cùng một việc
   ⇒ Chất lượng không đều, và kinh nghiệm không được chia sẻ
```

**Resource có thể động, không chỉ là file tĩnh:**

```text
docs://chinh-sach/doi-tra           tài liệu tĩnh
db://don-hang/ABC123                một bản ghi
report://doanh-thu/2026-08          báo cáo sinh ra khi đọc

⇒ Resource là một ĐỊA CHỈ, nội dung có thể tính lúc đọc.
⇒ Nhưng nhớ: resource được đọc khi NGƯỜI DÙNG chọn, nên đừng
  làm nó tốn kém — không ai muốn chờ 20 giây khi gắn một
  resource vào.
```

**Kết hợp cả ba — một ví dụ hoàn chỉnh:**

```text
Server hỗ trợ khách hàng:
  TOOL      tim_kiem_chinh_sach(tuKhoa)   ← mô hình tự tìm khi cần
            tra_don_hang(maDon)
            tao_ticket(...)
  RESOURCE  ticket://<id>                  ← người dùng gắn ticket
            khach-hang://<id>              đang xử lý vào ngữ cảnh
  PROMPT    phan-tich-khieu-nai(ticketId)  ← quy trình chuẩn của đội
            soan-thu-xin-loi(ticketId)

⇒ Người dùng: chọn prompt "phân tích khiếu nại", gắn resource
  ticket cụ thể. Mô hình tự gọi tool khi cần thêm thông tin.
```

Ví dụ này cho thấy ba loại **bổ sung nhau**, không thay thế nhau — và một server tốt thường dùng cả ba.

## Tại sao cần nó

Vì chọn loại quyết định **ai kiểm soát ngữ cảnh**:

```text
Toàn tool  ⇒ MÔ HÌNH kiểm soát ngữ cảnh
  Linh hoạt, nhưng bạn không biết trước nó sẽ lấy gì.
  Và nó có thể lấy sai, lấy thiếu, hoặc lấy quá nhiều.

Có resource ⇒ NGƯỜI DÙNG kiểm soát một phần
  Họ biết chính xác cái gì đang trong ngữ cảnh.
  ⇒ Đáng tin hơn, và dễ gỡ lỗi hơn.

Có prompt   ⇒ ĐỘI kiểm soát cách làm
  Quy trình được đóng gói, không phụ thuộc từng người.
```

**Và một điều về bảo mật:**

```text
Resource và tool có mô hình quyền khác nhau:
  RESOURCE: người dùng chọn ⇒ dễ kiểm quyền theo người dùng
  TOOL:     mô hình gọi     ⇒ tham số do mô hình điền
                              ⇒ phải kiểm quyền trong hàm
                                ([[xac-thuc-va-gioi-han-cong-cu]])

⇒ Với dữ liệu nhạy cảm, resource thường an toàn hơn: hành động
  "đưa cái này vào ngữ cảnh" là một quyết định có ý thức của
  người dùng, không phải một suy luận của mô hình.
```

## So sánh

| | Tool | Resource | Prompt |
|---|---|---|---|
| Ai quyết định dùng | **mô hình** | người dùng / host | người dùng |
| Chiếm token khi không dùng | ✅ (mô tả) | ❌ | ❌ |
| Dùng cho | hành động, tìm kiếm | dữ liệu đã biết địa chỉ | việc lặp lại |
| Kiểm quyền | trong hàm | theo người dùng | — |
| Người dùng biết cái gì trong ngữ cảnh | ❌ | ✅ | ✅ |

## Dễ nhầm

**1. Biến mọi thứ thành tool.** Token và chọn sai.

**2. Dùng resource cho thứ cần tìm kiếm.** Người dùng phải biết địa chỉ.

**3. Không dùng prompt.** Kinh nghiệm không được chia sẻ.

**4. Resource tốn kém khi đọc.** Người dùng phải chờ.

**5. Không phân biệt "người dùng biết mình cần gì" hay không.**

**6. Quên rằng mô tả tool chiếm token ở mọi lời gọi.**

**7. Kiểm quyền cho tool theo cách của resource.** Tham số do mô hình điền.

**8. Đưa dữ liệu nhạy cảm qua tool khi resource an toàn hơn.**

**9. Prompt không có tham số.** Kém hữu dụng.

**10. Nghĩ ba loại thay thế nhau.** Chúng bổ sung nhau.

## Mẹo nhớ

> **Tool: MÔ HÌNH quyết định. Resource: NGƯỜI DÙNG chọn. Prompt: NGƯỜI DÙNG chọn cách làm.**
>
> **Câu hỏi quyết định: người dùng CÓ BIẾT mình cần cái nào không?**
>
> **Mô tả tool chiếm token ở MỌI lời gọi. Resource thì không.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Ba loại khác nhau ở điểm cốt lõi nào?
2. Ba câu hỏi để chọn loại?
3. Ba lỗi chọn loại và hậu quả?
4. Vì sao resource thường an toàn hơn tool cho dữ liệu nhạy cảm?
5. Vì sao prompt là loại bị dùng ít nhất mà có giá trị?

## Tự viết lại

Không nhìn lại, thiết kế server MCP cho một đội phát triển:

```text
① ba tool
② hai resource
③ hai prompt
④ với mỗi cái, giải thích vì sao chọn loại đó
```

Tự kiểm: có thứ nào bạn đã đặt làm tool mà đáng lẽ nên là resource không — và ngược lại?

## Thử sức

Server MCP của đội có 24 tool, trong đó 9 tool chỉ để đọc một loại tài liệu cụ thể (`doc_chinh_sach`, `doc_huong_dan`, `doc_bieu_mau`...). Mô hình thường chọn sai giữa chúng.

Ba câu để trả lời: bạn thiết kế lại thế nào; số tool giảm còn bao nhiêu và vì sao; và bạn xác nhận cải thiện bằng cách nào. Câu khó nhất: nếu chuyển 9 tool đó thành resource, người dùng phải tự chọn tài liệu — điều đó tốt hơn hay tệ hơn, và câu trả lời phụ thuộc vào gì?
