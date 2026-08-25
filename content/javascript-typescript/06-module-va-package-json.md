---
title: Module, import/export và package.json
slug: module-va-package-json
summary: ESM và CommonJS khác nhau ở đâu, vì sao hay gặp lỗi ERR_REQUIRE_ESM, và mỗi trường trong package.json để làm gì.
level: trung-cap
tags: [javascript, module, nodejs, package-json]
khung: v2
---

> **Sau bài này bạn sẽ:** đọc được thông báo lỗi module và biết ngay nó đến từ đâu, thay vì thử đổi cấu hình cho tới khi hết đỏ.

## Ý tưởng chính

JavaScript có **hai hệ module cùng tồn tại**, ra đời cách nhau mười năm, và chúng không hoàn toàn tương thích:

```text
CommonJS (CJS)  →  require() / module.exports   — cũ, của Node.js
ESM             →  import / export              — chuẩn chính thức, của cả trình duyệt lẫn Node
```

Gần như mọi lỗi module bạn gặp đều là **một bên cố dùng bên kia**. Biết được điều đó thì bạn đọc lỗi ra ngay thay vì đoán mò.

## Mental model

Hãy nghĩ tới hai cách nhận hàng.

> **CommonJS là gọi ship khi cần.** Chạy tới dòng `require('x')` thì mới đi lấy, và **lấy xong ngay tại chỗ** — đồng bộ. Vì lấy lúc chạy nên bạn có thể `require` theo điều kiện: `if (a) require('b')`.
>
> **ESM là khai báo trước tất cả hàng sẽ nhận.** Mọi `import` phải nằm ở đầu file và được xử lý **trước khi code chạy dòng nào**. Đổi lại, công cụ đọc được toàn bộ danh sách hàng mà không cần chạy chương trình — nên nó **cắt được phần thừa** (tree-shaking).

Điểm mấu chốt: ESM **tĩnh** (biết trước khi chạy), CJS **động** (biết lúc chạy). Từ đó suy ra được mọi khác biệt còn lại.

## Ví dụ nhỏ

```js
// CommonJS
const { doc } = require('./file')
module.exports = { ghi }

// ESM
import { doc } from './file.js'      // ← chú ý phần mở rộng .js
export { ghi }
```

## Code chạy thế nào

Vì sao ESM **không** cho `require` một module ESM và vì sao lỗi hay xảy ra:

```text
CJS gọi ESM:
  require('esm-package')
    → require phải trả về NGAY (đồng bộ)
    → nhưng ESM có thể có top-level await ⇒ cần thời gian
    → ❌ ERR_REQUIRE_ESM

ESM gọi CJS:
  import x from 'cjs-package'
    → ✅ được, Node bọc lại giúp
    → nhưng chỉ lấy được default; named import có thể hỏng
      vì Node phải ĐOÁN các tên xuất ra từ code CJS
```

Nói cách khác: **ESM gọi CJS thường ổn; CJS gọi ESM thì không.** Nhớ một chiều đó là đủ để chẩn đoán phần lớn lỗi.

Node quyết định file là hệ nào theo thứ tự:

```text
đuôi .mjs               → ESM, luôn luôn
đuôi .cjs               → CJS, luôn luôn
đuôi .js                → nhìn "type" trong package.json gần nhất
    "type": "module"    → ESM
    không có / "commonjs" → CJS
```

## Cú pháp

```js
// Named export — nhiều thứ trong một file
export function doc() {}
export const HANG_SO = 1
import { doc, HANG_SO } from './file.js'

// Default export — một thứ chính
export default class Kho {}
import Kho from './kho.js'          // tên gì cũng được

// Import động — chạy tới mới tải, dùng để chia nhỏ bundle
const { nang } = await import('./mo-dun-nang.js')
```

Các trường quan trọng trong `package.json`:

```jsonc
{
  "name": "app",
  "type": "module",            // quyết định .js là ESM hay CJS
  "main": "./dist/index.js",   // điểm vào (CJS cũ)
  "exports": {                 // điểm vào hiện đại — CHẶN import vào file nội bộ
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" }
  },
  "scripts": { "dev": "next dev" },
  "dependencies": {},          // cần khi CHẠY
  "devDependencies": {},       // chỉ cần khi phát triển và build
  "peerDependencies": {}       // thư viện yêu cầu app cài sẵn (react…)
}
```

## Tại sao cần nó

Vì ba trường dưới đây quyết định những thứ rất thực tế:

**`type`** — sai một chữ ở đây là hàng loạt lỗi `Cannot use import statement outside a module`.

**`exports`** — nó **khoá** những đường vào không được khai. Khi người dùng thư viện `import 'lib/dist/internal/util'`, họ tạo ra phụ thuộc vào chi tiết nội bộ mà bạn sẽ đổi. `exports` chặn việc đó ngay từ đầu.

**`dependencies` vs `devDependencies`** — đặt sai chỗ thì hoặc image production phình gấp ba (nhét cả bộ test vào), hoặc app chết lúc chạy vì thiếu thư viện.

## So sánh

| | CommonJS | ESM |
|---|---|---|
| Cú pháp | `require` / `module.exports` | `import` / `export` |
| Thời điểm | Lúc chạy, đồng bộ | Phân tích trước khi chạy |
| Đặt trong `if` | ✅ được | ❌ (phải dùng `import()` động) |
| Cắt code thừa (tree-shaking) | ❌ | ✅ |
| Top-level await | ❌ | ✅ |
| Trình duyệt | Cần đóng gói | ✅ chạy thẳng |

Với dự án mới: **dùng ESM**. Với thư viện phát hành: xuất cả hai qua `exports` nếu người dùng của bạn còn ở CJS.

## Dễ nhầm

**1. Quên `.js` trong ESM.**

```js
import { doc } from './file'      // ❌ ERR_MODULE_NOT_FOUND trong Node ESM
import { doc } from './file.js'   // ✅
```

Trình duyệt và Node ESM **không tự đoán** phần mở rộng — bundler thì có, nên lỗi này hay chỉ lộ ra khi chạy thật.

**2. Trộn hai hệ trong một file.**

```js
import x from 'a'
module.exports = x   // ❌ không dùng chung được
```

**3. Lạm dụng default export.** Mỗi chỗ import đặt một tên khác nhau ⇒ tìm kiếm toàn dự án không ra, đổi tên tự động không chạy. **Ưu tiên named export**; để dành default cho thứ thật sự là "một thứ chính" của file.

**4. Tưởng import là miễn phí.**

```js
import './phan-tich.js'   // ❌ không lấy gì cả, nhưng code trong file VẪN CHẠY
```

Module chạy **một lần** khi được nạp lần đầu, và mọi tác dụng phụ trong đó xảy ra ngay lúc đó. Đây là nguồn của loại bug "chỉ xảy ra khi import theo thứ tự này".

**5. Đặt thư viện chỉ dùng lúc build vào `dependencies`.** Kiểm tra nhanh: *"thiếu nó thì app đang chạy có chết không?"* Không chết ⇒ `devDependencies`.

## Mẹo nhớ

> **CJS gọi ship khi cần (động). ESM khai báo trước tất cả (tĩnh).**
>
> **ESM gọi CJS thường ổn. CJS gọi ESM thì không.**
>
> **`type` quyết định `.js` là hệ nào.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Khác biệt gốc rễ giữa ESM và CJS là gì — và mọi khác biệt khác suy ra từ đó thế nào?
2. Vì sao `require()` một package ESM lại lỗi?
3. Node dựa vào đâu để biết một file `.js` là ESM hay CJS?
4. Vì sao ESM cắt được code thừa còn CJS thì không?
5. Trường `exports` bảo vệ điều gì cho tác giả thư viện?

## Tự viết lại

Không nhìn lại phần trên, chẩn đoán từng lỗi và nêu **cách sửa**:

```text
a) Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported
b) SyntaxError: Cannot use import statement outside a module
c) Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/utils'
```

Tự kiểm: với mỗi lỗi, bạn nhìn vào **file nào** đầu tiên?

## Thử sức

Bạn viết một thư viện và muốn nó dùng được ở cả dự án ESM lẫn CJS.

Ba câu để tự lần ra: `exports` của bạn khai thế nào? Nếu thư viện có **top-level await**, bản CJS còn xuất được không? Và nếu người dùng `import { helper } from 'lib/internal'` — bạn có muốn điều đó xảy ra không, và chặn bằng cách nào?
