import { seedIfEmpty } from '../src/lib/db/seed'

// IIFE thay vì top-level await: package.json không khai báo "type": "module" nên
// tsx biên dịch file .ts này sang CommonJS, không hỗ trợ top-level await.
void (async () => {
  const { seeded } = await seedIfEmpty()
  console.log(seeded ? 'Đã nạp dữ liệu mẫu vào data/' : 'Bỏ qua: data/ đã có dữ liệu')
})()
