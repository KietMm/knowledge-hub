# Knowledge Hub

Sổ tay tra cứu kiến thức dev cá nhân, chạy local.

## Chạy

```bash
pnpm install
pnpm seed   # nạp dữ liệu mẫu nếu data/ còn rỗng
pnpm dev
```

Mở http://localhost:3000

## Lệnh

| Lệnh | Việc |
|---|---|
| `pnpm dev` | Chạy môi trường phát triển |
| `pnpm build && pnpm start` | Chạy bản production |
| `pnpm test` | Unit test tầng dữ liệu và các hàm thuần |
| `pnpm typecheck` | Kiểm tra kiểu |
| `pnpm seed` | Nạp dữ liệu mẫu (không ghi đè dữ liệu đã có) |

## Dữ liệu

Ba file JSON trong `data/`. Sao lưu: mở `/api/export`. Phục hồi: `POST /api/import` với chính file đó.

**Lưu ý:** app ghi trực tiếp vào filesystem nên **không chạy được trên Vercel**. Dùng local
hoặc VPS/Docker có volume ghi được. Muốn deploy công khai thì thay phần trong `src/lib/db/`
bằng SQLite — giao diện repository giữ nguyên nên `src/app/` và `src/components/` không phải sửa.

## Kiến trúc

- `src/lib/db/` — nơi **duy nhất** chạm tới dữ liệu. Không file nào trong `app/` hay `components/` được đọc file trực tiếp.
- `src/lib/actions/` — Server Actions, luôn trả `{ok:true|false}`, không throw ra UI.
- `src/lib/{slug,search,markdown}.ts` — hàm thuần, có unit test.

## Chưa có trong bản này

- **Lọc theo tag ở trang công nghệ** (`/t/[topic]`). Hiện trang chỉ liệt kê toàn bộ ghi
  chú của công nghệ đó, chưa lọc được theo tag.
- **Màu accent riêng cho từng mảng**. Mỗi mảng có màu (`sky`, `emerald`, `rose`, `amber`)
  nhưng giao diện hiện chưa dùng tới màu này — sidebar và trang mảng đang hiển thị đồng
  màu.
- **Thêm/sửa/xoá mảng hoặc công nghệ qua giao diện**. Chưa có form hay nút nào cho việc
  này. Cách duy nhất hiện tại là sửa tay hai file dưới đây:

  1. Mở `/api/export` và lưu lại file JSON tải về — đây là bản sao lưu, phòng khi sửa
     tay bị gõ sai.
  2. Sửa `data/categories.json` (thêm mảng mới) hoặc `data/topics.json` (thêm công nghệ
     mới), giữ đúng hình dạng của các bản ghi có sẵn trong file (đủ các trường như `id`,
     `name`, `slug`, `description`, `order`; riêng mảng còn có `icon` và `color`). `id`
     và `slug` phải là duy nhất trong file; `topics.json` cần `categoryId` trỏ đúng tới
     một mảng có thật.
  3. Lưu file, tải lại trang trong trình duyệt.

  Nếu sửa sai hình dạng, app sẽ báo lỗi rõ file nào và vì sao (xem `error.tsx`) thay vì
  âm thầm chạy sai — cứ đối chiếu lại bản sao lưu ở bước 1 nếu cần phục hồi qua
  `POST /api/import`.

## Bàn phím

| Phím | Việc |
|---|---|
| `⌘K` / `Ctrl K` | Mở/đóng bảng tìm nhanh (chọn ghi chú hoặc chạy hành động) |
| `⌘\` / `Ctrl \` | Gập/mở sidebar (desktop) |
| `⌘S` / `Ctrl S` | Lưu form ghi chú đang mở |
| `Esc` | Đóng dialog/bảng tìm nhanh đang mở |

## Rà soát thủ công còn treo

Những mục sau cần một trình duyệt thật để xác nhận — chưa (và không thể) kiểm bằng máy trong CI:

- `⌘K` mở/đóng bảng tìm nhanh, mũi tên lên/xuống di chuyển giữa kết quả, `Enter` điều hướng, `Esc` đóng.
- `⌘S` lưu form ghi chú; cảnh báo trình duyệt khi rời trang lúc form còn thay đổi chưa lưu.
- Submit form tạo/sửa ghi chú, toast báo kết quả, dialog xác nhận trước khi xoá.
- Nút "Chép" trên khối code (chép đúng nội dung vào clipboard, đổi nhãn tạm thời).
- `⌘\` gập/mở sidebar trên desktop, hamburger mở Sheet trên mobile.
