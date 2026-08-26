---
title: Viết script bash an toàn
slug: viet-script-bash
summary: Bốn dòng đầu mọi script nên có, cách xử lý biến và lỗi, và khi nào nên chuyển sang ngôn ngữ khác.
level: trung-cap
tags: [linux, bash, script]
khung: v2
---

> **Sau bài này bạn sẽ:** viết được script không âm thầm chạy tiếp sau khi hỏng, và biết lúc nào nên bỏ bash.

## Ý tưởng chính

Mặc định của bash là **chạy tiếp dù có lỗi**. Lệnh thứ ba thất bại? Lệnh thứ tư vẫn chạy. Biến gõ sai tên? Bash coi nó là chuỗi rỗng.

Hai mặc định đó hợp lý cho gõ tay ở terminal, và **nguy hiểm** cho script. Bài này chủ yếu là về cách tắt chúng đi.

## Mental model

Hãy nghĩ tới **công thức nấu ăn có người phụ bếp máy móc**.

> Công thức: "① đun nước ② luộc mì ③ chắt nước ④ trộn sốt".
>
> Bước ② thất bại vì hết mì. Người phụ bếp **vẫn làm bước ③ và ④** — chắt cái nồi rỗng, rồi trộn sốt vào không khí. Cuối cùng dọn ra và báo "xong".
>
> `set -e` là câu dặn: **"bước nào hỏng thì dừng lại và gọi tôi."**

Và mệnh đề `rm -rf "$THU_MUC/"` với `$THU_MUC` gõ sai tên chính là "chắt cái nồi rỗng" — chỉ khác là nó xoá `/`.

## Ví dụ nhỏ

```bash
#!/usr/bin/env bash
set -euo pipefail

THU_MUC="${1:?Thiếu tham số: thư mục cần sao lưu}"
echo "Sao lưu $THU_MUC"
```

## Code chạy thế nào

**Bốn dòng đầu, từng cái chặn một loại tai nạn:**

```text
#!/usr/bin/env bash    tìm bash trong PATH, không cứng ở /bin/bash
                       (trên macOS /bin/bash là bản 3.2 rất cũ)

set -e     Lệnh nào trả về khác 0 ⇒ DỪNG NGAY.
           Không có nó: script hỏng ở giữa vẫn báo "thành công".

set -u     Dùng biến CHƯA ĐẶT ⇒ dừng.
           Không có nó: `rm -rf "$THUMUC/"` với biến gõ sai
           trở thành `rm -rf "/"`.

set -o pipefail
           Trong `a | b`, mã lỗi mặc định là của b.
           `curl url | tar -x` — curl chết mà tar chạy được
           ⇒ script tưởng thành công. pipefail sửa điều đó.
```

Ba dòng này viết gọn: `set -euo pipefail`.

**Vì sao dấu ngoặc kép quanh biến không phải chuyện thẩm mỹ:**

```bash
file="bao cao.txt"

rm $file      # → rm bao cao.txt   ⇒ xoá HAI file: "bao" và "cao.txt"
rm "$file"    # → rm "bao cao.txt" ⇒ đúng
```

Bash **tách chuỗi theo dấu cách** trước khi chạy lệnh. Dấu ngoặc kép tắt việc tách đó. Quy tắc không có ngoại lệ đáng nhớ: **luôn bọc `"$..."`**.

## Cú pháp

```bash
# Tham số bắt buộc — dừng ngay với thông báo rõ ràng
DAU_VAO="${1:?Cần đường dẫn đầu vào}"

# Giá trị mặc định
CONG="${PORT:-3000}"

# Điều kiện: dùng [[ ]] chứ không [ ]
if [[ -f "$file" ]]; then      # -f file tồn tại, -d thư mục, -z chuỗi rỗng
  echo "có"
elif [[ "$a" == "b" ]]; then
  echo "bằng"
fi

# Lặp qua file — nhớ dấu ngoặc kép ở "$f"
for f in *.log; do
  echo "$f"
done

# Hàm, và bắt đầu ra của lệnh
function dem_dong() {
  local duong_dan="$1"        # local: không rò biến ra ngoài
  wc -l < "$duong_dan"
}
so=$(dem_dong "/var/log/app.log")
```

`[[ ]]` an toàn hơn `[ ]`: nó không tách chuỗi, xử lý biến rỗng đúng, và hỗ trợ `&&`/`||` bên trong.

**Dọn dẹp dù thoát kiểu gì:**

```bash
TAM="$(mktemp -d)"
trap 'rm -rf "$TAM"' EXIT     # chạy khi script kết thúc, kể cả khi lỗi
```

`trap ... EXIT` là cách bash làm việc của `finally`. Không có nó, `set -e` sẽ để lại rác mỗi lần script chết giữa chừng.

## Tại sao cần nó

Vì script không có `set -e` **báo thành công khi đã hỏng** — và đó là kiểu lỗi tốn nhiều thời gian nhất để phát hiện.

```bash
# ❌ Kịch bản có thật
cd /opt/app          # thư mục không tồn tại → lỗi, nhưng script chạy tiếp
rm -rf ./build       # xoá build ở THƯ MỤC HIỆN TẠI, không phải /opt/app
npm run build

# ✅
set -euo pipefail
cd /opt/app          # thất bại ⇒ dừng ngay tại đây
```

**Kiểm tra script bằng shellcheck** — nó bắt gần hết các lỗi ở bài này:

```bash
shellcheck backup.sh
```

Đưa nó vào CI thì mọi script trong repo được kiểm mỗi lần push ([[cau-truc-mot-workflow]]).

**Khi nào bỏ bash:** bash tốt cho việc **nối các lệnh có sẵn lại với nhau**. Chuyển sang Python/Go khi bắt đầu cần:

```text
□ Phân tích JSON hoặc XML          □ Xử lý lỗi có phân nhánh
□ Cấu trúc dữ liệu (mảng lồng, map) □ Số học ngoài phép cộng đơn giản
□ Gọi HTTP có retry và phân tích phản hồi
□ Script đã vượt ~100 dòng
```

Dấu hiệu rõ nhất: bạn đang dùng `sed`/`awk` để cắt JSON. Dừng lại — viết bằng Python ([[xu-ly-loi-va-doc-ghi-file]]).

## So sánh

| | Không `set -euo pipefail` | Có |
|---|---|---|
| Lệnh giữa chừng hỏng | chạy tiếp, báo OK | dừng, báo lỗi |
| Biến gõ sai tên | thành chuỗi rỗng | dừng ngay |
| `a \| b`, a hỏng | coi như thành công | báo lỗi |
| Gỡ lỗi | tìm ở lệnh cuối | dừng đúng chỗ hỏng |

## Dễ nhầm

**1. Quên `set -euo pipefail`.** Script báo thành công khi đã hỏng.

**2. Không bọc biến trong `"..."`.** Đường dẫn có dấu cách gây hậu quả không lường được.

**3. Dùng `[ ]` thay `[[ ]]`.** Vỡ với biến rỗng hoặc có dấu cách.

**4. Tin rằng `set -e` bắt mọi lỗi.** Nó **không** kích hoạt trong `if`, trong `&&`/`||`, và ở lệnh không phải cuối trong pipe (đó là việc của `pipefail`).

**5. `cd` mà không kiểm tra kết quả.** Lệnh xoá tiếp theo chạy ở nhầm chỗ.

**6. Không dọn file tạm.** Dùng `trap ... EXIT`.

**7. Phân tích JSON bằng `grep`/`sed`.** Dùng `jq`, hoặc đổi ngôn ngữ.

**8. Script bash 500 dòng.** Đáng lẽ đã phải chuyển ngôn ngữ từ 400 dòng trước.

**9. Ghi secret vào script.** Nó vào git, vào lịch sử shell, vào log của CI ([[quan-ly-secret-va-cau-hinh]]).

## Mẹo nhớ

> **`set -euo pipefail` — bốn ký tự đổi bash từ "chạy tiếp dù hỏng" thành "dừng khi hỏng".**
>
> **Luôn bọc biến: `"$x"`. Bash tách chuỗi theo dấu cách.**
>
> **Cần phân tích JSON hoặc quá 100 dòng ⇒ đổi ngôn ngữ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. `-e`, `-u`, `pipefail` — mỗi cái chặn loại tai nạn nào?
2. Vì sao `rm $file` khác `rm "$file"`, và hậu quả cụ thể?
3. Nêu hai trường hợp `set -e` **không** dừng script.
4. `trap ... EXIT` dùng để làm gì?
5. Ba dấu hiệu cho biết đã đến lúc bỏ bash?

## Tự viết lại

Không nhìn lại, viết script sao lưu thư mục thành file `.tar.gz` có gắn ngày, giữ 7 bản gần nhất, xoá các bản cũ hơn:

```text
① dòng đầu và dòng set
② nhận tham số bắt buộc, báo lỗi rõ nếu thiếu
③ nén vào thư mục tạm, dọn thư mục tạm dù thoát kiểu gì
④ xoá bản cũ
```

Tự kiểm: nếu tham số đầu vào là thư mục **không tồn tại**, script của bạn dừng ở bước nào — trước hay sau khi xoá bản cũ?

## Thử sức

Script triển khai chạy trên CI, báo **"Deploy thành công"**, nhưng website vẫn là phiên bản cũ. Script không có `set -e`.

Ba câu để trả lời: chuyện gì đã xảy ra; bạn thêm gì để lần sau nó **thất bại to và rõ**; và bạn kiểm tra bằng cách nào rằng lần triển khai này **thực sự** đã đưa mã mới lên. Câu khó nhất: nếu chỉ thêm `set -e` mà script vẫn báo thành công, chỗ nào trong script có thể đang nuốt mã lỗi?
