---
title: Module, import/export và package.json
slug: module-va-package-json
summary: ESM và CommonJS khác nhau ở đâu, vì sao hay gặp lỗi ERR_REQUIRE_ESM, và mỗi trường trong package.json để làm gì.
level: trung-cap
tags: [javascript, module, nodejs, package-json]
---

> **Sau bài này bạn sẽ:** đọc hiểu lỗi `Cannot use import statement outside a module`, và biết đặt dependency vào `dependencies` hay `devDependencies`.

## Hai hệ module cùng tồn tại

| | CommonJS (CJS) | ES Modules (ESM) |
|---|---|---|
| Nhập | `const x = require('x')` | `import x from 'x'` |
| Xuất | `module.exports = x` | `export default x` |
| Nạp | Đồng bộ, lúc chạy | Tĩnh, phân tích trước khi chạy |
| Top-level `await` | Không | Có |
| Mặc định trong Node | Có (khi không khai báo) | Khi `"type": "module"` hoặc đuôi `.mjs` |

ESM phân tích tĩnh được nghĩa là bundler biết trước bạn dùng gì — đó là cơ sở của **tree-shaking** (loại bỏ code không dùng khỏi bundle).

```js
// ESM
import { readFile } from 'node:fs/promises'
export function doc() {}
export default class {}

// CommonJS
const { readFile } = require('node:fs/promises')
module.exports = { doc }
```

### Vì sao hay lỗi

`ERR_REQUIRE_ESM` xuất hiện khi code CJS `require()` một package chỉ xuất ESM. Cách xử lý, theo thứ tự nên thử:

1. Chuyển dự án sang ESM: thêm `"type": "module"` vào `package.json`.
2. Dùng `await import('ten-package')` — import động chạy được từ CJS.
3. Hạ xuống phiên bản còn hỗ trợ CJS (giải pháp tạm).

Trong ESM, import file cục bộ **phải ghi đủ đuôi**: `import './utils.js'`, không phải `'./utils'`. TypeScript với `moduleResolution: "bundler"` thì không cần, vì bundler tự xử lý.

## Named export hay default export

```js
// Named — nên dùng mặc định
export function tinhThue() {}
import { tinhThue } from './thue.js'
```

Named export tốt hơn vì: đổi tên là trình soạn thảo sửa được tự động, gõ sai tên thì lỗi ngay lúc build, và tên gọi thống nhất ở mọi nơi import. Default export mỗi chỗ import một tên khác nhau, rất khó tìm kiếm.

Chỉ dùng default khi framework bắt buộc — ví dụ mỗi file `page.tsx` của Next.js.

## Import động và side effect

```js
// Chỉ tải khi thật sự cần — giảm bundle ban đầu
const { default: Chart } = await import('./Chart.js')

// Import chỉ để chạy side effect (đăng ký polyfill, CSS)
import './globals.css'
```

## package.json, từng trường một

```json
{
  "name": "knowledge-hub",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "next dev" },
  "dependencies": { "next": "15.5.23" },
  "devDependencies": { "typescript": "^5" }
}
```

- `private: true` — chặn `npm publish` nhầm. Luôn bật cho app.
- `type` — `"module"` thì `.js` được hiểu là ESM.
- `dependencies` — thứ cần lúc **chạy**.
- `devDependencies` — chỉ cần lúc **phát triển/build**: TypeScript, ESLint, vitest. Đặt sai chỗ làm image production phình to.

### Ký hiệu phiên bản

Semantic versioning là `MAJOR.MINOR.PATCH`:

| Ký hiệu | Nghĩa | Nhận bản mới nào |
|---|---|---|
| `^1.2.3` | Cùng MAJOR | 1.9.9 — có |
| `~1.2.3` | Cùng MINOR | 1.2.9 — có, 1.3.0 — không |
| `1.2.3` | Cố định | Không |

`^` an toàn **nếu** thư viện tôn trọng semver — thực tế thì không phải lúc nào cũng vậy. Đó là lý do phải commit lockfile (`pnpm-lock.yaml`, `package-lock.json`): lockfile mới là thứ quyết định phiên bản thật sự được cài. Trên CI luôn dùng `pnpm install --frozen-lockfile` để cài đúng lockfile, không tự nâng cấp.

## Lỗi hay gặp

| Lỗi | Nguyên nhân | Sửa thế nào |
|---|---|---|
| `Cannot use import statement outside a module` | File chạy như CJS | Thêm `"type": "module"` hoặc đổi đuôi `.mjs` |
| `ERR_REQUIRE_ESM` | CJS require package ESM-only | Chuyển sang ESM hoặc `await import()` |
| `ERR_MODULE_NOT_FOUND` với ESM | Thiếu đuôi `.js` khi import | Ghi đủ đuôi file |
| Image production nặng bất thường | devDependency nằm nhầm chỗ | Rà lại hai danh sách |
| CI cài phiên bản khác máy dev | Không dùng lockfile | `--frozen-lockfile` |

## Ghi nhớ

- ESM là mặc định cho code mới; CJS chỉ còn để tương thích ngược.
- Ưu tiên named export; default chỉ khi framework yêu cầu.
- `dependencies` = lúc chạy, `devDependencies` = lúc build.
- Lockfile mới là nguồn sự thật về phiên bản, không phải `^` trong package.json.

## Tự kiểm tra

1. Vì sao ESM tree-shake được còn CJS thì không?
2. Dự án CJS cần dùng một package ESM-only. Ba cách xử lý là gì, chọn cái nào?
3. `vitest` nên nằm ở `dependencies` hay `devDependencies`? Vì sao?
