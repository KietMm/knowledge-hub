---
title: Viết script bash an toàn
slug: viet-script-bash
summary: Bốn dòng đầu mọi script nên có, cách xử lý biến và lỗi, và khi nào nên chuyển sang ngôn ngữ khác.
level: trung-cap
tags: [linux, bash, script]
---

> **Sau bài này bạn sẽ:** viết script không âm thầm chạy tiếp khi có lỗi, và biết vì sao phải bọc mọi biến trong dấu nháy kép.

## Bốn dòng mở đầu

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

| Cờ | Tác dụng |
|---|---|
| `-e` | Dừng ngay khi một lệnh trả về mã lỗi |
| `-u` | Báo lỗi khi dùng biến chưa được đặt |
| `-o pipefail` | Đường ống lỗi nếu **bất kỳ** khâu nào lỗi |
| `IFS=$'\n\t'` | Không tách chuỗi theo dấu cách — tên file có khoảng trắng không vỡ |

Không có `set -e`, script gặp lỗi ở bước 3 vẫn chạy tiếp tới bước 10 — và bước 10 có thể là `rm -rf`.

Không có `pipefail`, `sai_lenh | tee log` vẫn được coi là thành công vì `tee` chạy tốt.

`#!/usr/bin/env bash` thay vì `#!/bin/bash`: tìm bash trong PATH, chạy được cả trên macOS nơi bash mới nằm chỗ khác.

## Luôn bọc biến trong nháy kép

```bash
FILE="bao cao.txt"

rm $FILE       # SAI: thành `rm bao` và `rm cao.txt`
rm "$FILE"     # ĐÚNG

# Thư mục có thể rỗng -> "$DIR"/ thành "/" -> thảm hoạ
[[ -n "$DIR" ]] || { echo "DIR chưa đặt"; exit 1; }
rm -rf "${DIR:?DIR chưa đặt}/cache"
```

Cú pháp `${DIR:?thông báo}` dừng script kèm thông báo nếu biến rỗng — chốt an toàn đáng dùng cho mọi lệnh phá huỷ.

## Biến và giá trị mặc định

```bash
TEN="${1:-mac-dinh}"              # tham số 1, hoặc giá trị mặc định
MOI_TRUONG="${MOI_TRUONG:-dev}"   # biến môi trường, hoặc mặc định
BAT_BUOC="${API_KEY:?Thiếu API_KEY}"   # bắt buộc phải có

readonly THU_MUC="/opt/ung-dung"  # hằng số
local tam                          # biến cục bộ trong hàm — luôn dùng
```

## Điều kiện và vòng lặp

```bash
if [[ -f "$FILE" ]]; then echo "file tồn tại"; fi
if [[ -d "$DIR" ]]; then echo "thư mục tồn tại"; fi
if [[ -z "$BIEN" ]]; then echo "rỗng"; fi
if [[ "$A" == "$B" ]]; then echo "bằng nhau"; fi
if [[ "$SO" -gt 10 ]]; then echo "lớn hơn 10"; fi

for f in *.log; do
  [[ -e "$f" ]] || continue        # glob không khớp gì thì f là chuỗi "*.log"
  gzip "$f"
done

while IFS= read -r dong; do
  echo "Dòng: $dong"
done < "$FILE"                     # đọc file an toàn, giữ nguyên khoảng trắng
```

Dùng `[[ ]]` thay vì `[ ]`: nó an toàn hơn với biến rỗng và hỗ trợ nhiều toán tử hơn.

## Hàm, mã thoát, dọn dẹp

```bash
log()  { echo "[$(date +'%F %T')] $*" >&2; }        # log ra stderr
loi()  { log "LỖI: $*"; exit 1; }

kiem_tra_lenh() {
  command -v "$1" >/dev/null 2>&1 || loi "Thiếu lệnh: $1"
}

# trap: chạy dọn dẹp dù script kết thúc kiểu gì
TMP="$(mktemp -d)"
don_dep() { rm -rf "$TMP"; }
trap don_dep EXIT

kiem_tra_lenh jq
kiem_tra_lenh curl
```

`trap ... EXIT` là thứ khiến script đáng tin: file tạm được xoá kể cả khi script lỗi giữa chừng hay bị Ctrl-C.

Log ra `stderr` (`>&2`) để `stdout` chỉ chứa kết quả thật — nhờ vậy script vẫn ghép vào đường ống được.

## Script sao lưu hoàn chỉnh

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly THU_MUC_LUU="${THU_MUC_LUU:-/var/backups}"
readonly GIU_NGAY=7
readonly DB_URL="${DATABASE_URL:?Thiếu DATABASE_URL}"

log() { echo "[$(date +'%F %T')] $*" >&2; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ten="sao-luu-$(date +%Y%m%d-%H%M%S).sql.gz"

log "Bắt đầu sao lưu"
pg_dump "$DB_URL" | gzip > "$TMP/$ten"

# Kiểm tra file không rỗng trước khi coi là thành công
[[ -s "$TMP/$ten" ]] || { log "LỖI: file sao lưu rỗng"; exit 1; }

mkdir -p "$THU_MUC_LUU"
mv "$TMP/$ten" "$THU_MUC_LUU/$ten"

log "Xoá bản cũ hơn $GIU_NGAY ngày"
find "$THU_MUC_LUU" -name "sao-luu-*.sql.gz" -mtime "+$GIU_NGAY" -delete

log "Xong: $THU_MUC_LUU/$ten ($(du -h "$THU_MUC_LUU/$ten" | cut -f1))"
```

Chú ý bước kiểm tra file rỗng: `pg_dump` lỗi vẫn tạo ra file, và một thư mục đầy file 0 byte là loại "sao lưu" tệ nhất — nó tạo cảm giác an toàn giả.

## Kiểm tra script

```bash
shellcheck script.sh          # bắt phần lớn lỗi bash phổ biến
bash -n script.sh             # kiểm tra cú pháp, không chạy
bash -x script.sh             # in từng lệnh khi chạy — để gỡ lỗi
```

`shellcheck` nên chạy trong CI. Nó bắt được gần hết những lỗi nêu trong bài này.

## Khi nào nên bỏ bash

Bash phù hợp cho: ghép lệnh, tự động hoá thao tác file, script CI ngắn.

Chuyển sang Python/Node khi: cần xử lý JSON phức tạp, cần cấu trúc dữ liệu, cần xử lý lỗi tinh vi, hoặc script vượt **150 dòng**. Bash không có kiểu dữ liệu, xử lý lỗi thô sơ, và rất khó test.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| Không có `set -euo pipefail` | Lỗi bị bỏ qua, chạy tiếp | Thêm vào mọi script |
| `$BIEN` không nháy kép | Vỡ với khoảng trắng | Luôn `"$BIEN"` |
| `rm -rf "$DIR/"` | `DIR` rỗng là xoá từ gốc | `${DIR:?}` |
| Không có `trap` dọn dẹp | File tạm tích tụ | `trap ... EXIT` |
| Script bash 500 dòng | Không bảo trì nổi | Chuyển sang Python |

## Ghi nhớ

- `set -euo pipefail` là bắt buộc, không phải tuỳ chọn.
- Mọi biến đều bọc trong nháy kép.
- `trap ... EXIT` để dọn dẹp trong mọi trường hợp.
- Trên 150 dòng thì đổi ngôn ngữ.

## Tự kiểm tra

1. `set -e` và `pipefail` mỗi cái bắt loại lỗi nào?
2. Vì sao `rm $FILE` nguy hiểm khi tên file có khoảng trắng?
3. Script sao lưu cần kiểm tra gì trước khi báo thành công?
