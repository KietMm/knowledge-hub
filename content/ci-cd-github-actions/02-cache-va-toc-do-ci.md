---
title: Cache và tốc độ CI
slug: cache-va-toc-do-ci
summary: CI chậm là CI không ai chờ — cache đúng cách, chạy song song, và chỉ chạy phần cần chạy.
level: trung-cap
tags: [ci-cd, cache, hieu-nang]
khung: v2
---

> **Sau bài này bạn sẽ:** thiết kế được khoá cache đúng, và biết ba cách rút ngắn CI theo thứ tự hiệu quả.

## Ý tưởng chính

CI chậm không chỉ tốn tiền máy. Nó **đổi hành vi của cả đội**: người ta gộp nhiều thay đổi vào một PR, bỏ qua kết quả, hoặc merge trước khi CI xong.

Nên tốc độ CI là vấn đề về quy trình làm việc, không phải vấn đề tối ưu kỹ thuật.

## Mental model

Hãy nghĩ tới **chuẩn bị nguyên liệu trước khi nấu**.

> Mỗi lần nấu mà phải đi chợ lại từ đầu — mua hành, mua tỏi, mua gia vị — thì 40 phút chuẩn bị cho 10 phút nấu.
>
> **Cache** là cái tủ đựng nguyên liệu khô: lần sau mở tủ ra là có.
>
> Nhưng cái tủ chỉ đúng khi bạn **dán nhãn theo đúng thứ bên trong**. Dán nhãn sai — "hành" mà bên trong là tỏi — thì tệ hơn không có tủ, vì bạn sẽ nấu nhầm mà không biết.

Khoá cache chính là cái nhãn đó. Toàn bộ phần khó của cache nằm ở chỗ chọn nhãn.

## Ví dụ nhỏ

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'          # ← cách nhanh nhất, tự lo khoá cache
- run: pnpm install --frozen-lockfile
```

## Code chạy thế nào

**Khoá cache: quy tắc quyết định đúng hay sai:**

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

```text
key         phải chứa HASH của thứ quyết định nội dung cache.
            Lockfile đổi ⇒ hash đổi ⇒ khoá mới ⇒ cache mới.
            Lockfile không đổi ⇒ dùng lại. Chính xác.

restore-keys  khớp theo TIỀN TỐ khi không có khoá chính xác.
            Lockfile vừa đổi ⇒ lấy cache gần đúng của lần trước
            ⇒ chỉ tải phần chênh lệch, không tải lại từ đầu.

runner.os   bắt buộc — cache của Linux không dùng được trên Windows.
```

**Hai cách đặt khoá sai, và hậu quả:**

```text
❌ key: pnpm-cache
   Cố định ⇒ KHÔNG BAO GIỜ cập nhật.
   Thêm phụ thuộc mới ⇒ vẫn dùng cache cũ ⇒ CI hỏng theo cách khó hiểu.

❌ key: ${{ github.sha }}
   Đổi mỗi commit ⇒ KHÔNG BAO GIỜ trúng.
   Có cache mà như không, còn tốn thêm thời gian ghi.
```

Cache trên GitHub Actions là **bất biến**: đã ghi với một khoá thì không ghi đè được. Đó là lý do khoá cố định nguy hiểm — nó đóng băng vĩnh viễn.

**Cache cái gì và không cache cái gì:**

```text
✅ NÊN: kho tải phụ thuộc — ~/.pnpm-store, ~/.m2, ~/.cargo,
        ~/.cache/pip, cache của trình build (turbo, nx, next)

❌ KHÔNG: node_modules trực tiếp
   → chứa binary phụ thuộc nền tảng và symlink
   → cache kho tải rồi cài lại nhanh và ĐÚNG hơn
```

## Cú pháp

**Ba cách rút ngắn CI, theo thứ tự hiệu quả:**

```text
① CHỈ CHẠY PHẦN CẦN CHẠY          ← hiệu quả nhất, thường bị bỏ qua
   on:
     pull_request:
       paths: ['src/**', 'package.json']
   ⇒ Sửa README không kích hoạt cả suite.

② SONG SONG HOÁ
   - Tách job: lint | test | typecheck chạy cùng lúc
   - Chia test: matrix shard 1/4, 2/4, ... ⇒ 20 phút → 5 phút

③ CACHE
   - Kho phụ thuộc, cache của trình build
```

Thứ tự này quan trọng: người ta thường bắt đầu từ ③ vì nó rõ ràng nhất, trong khi ① thường cho mức giảm lớn nhất với ít công nhất.

**Chia test thành shard:**

```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: pnpm test --shard=${{ matrix.shard }}/4
```

Điều kiện để cách này hiệu quả: test phải **độc lập với nhau**. Test dùng chung một CSDL hoặc phụ thuộc thứ tự sẽ hỏng ngay khi chia — và đó thực ra là một lỗi đã tồn tại sẵn, chỉ nay mới lộ ra.

**Đo trước khi tối ưu:**

```text
Mở tab Actions → chọn một lần chạy → xem thời gian từng job và từng step.

Câu hỏi đúng: "Bước NÀO chiếm nhiều thời gian nhất?"
Không phải:   "Có cache chưa?"
```

Rất thường xuyên, thủ phạm không phải bước cài phụ thuộc mà là một bước ai đó thêm vào sáu tháng trước và không ai để ý.

## Tại sao cần nó

Vì thời gian CI quyết định **nhịp làm việc**:

```text
CI 2 phút   → chờ ngay tại chỗ, sửa, đẩy lại. Vòng lặp chặt.
CI 20 phút  → chuyển sang việc khác, quay lại sau, mất ngữ cảnh.
              PR to hơn (gộp cho đỡ chờ) ⇒ review khó hơn ⇒ lỗi nhiều hơn.
CI 60 phút  → merge trước khi CI xong. CI thành trang trí.
```

Mốc đáng nhắm là **dưới 10 phút cho PR**. Job nặng hơn (E2E đầy đủ, quét bảo mật sâu) đẩy sang chạy trên `main` hoặc theo lịch đêm.

**Một chi tiết về cache trên PR:** cache tạo trong một nhánh **không** dùng được từ nhánh khác, nhưng cache tạo trên nhánh mặc định thì **mọi nhánh đều đọc được**. Nên hãy đảm bảo workflow của bạn cũng chạy trên `main` — nếu không, mọi PR đều bắt đầu với cache rỗng.

**Hạn mức:** GitHub cho 10 GB cache mỗi repo và tự xoá cái cũ nhất khi đầy. Cache quá nhiều thứ ⇒ những cache quan trọng bị đẩy ra.

## So sánh

| Cách | Công sức | Mức giảm điển hình |
|---|---|---|
| `paths:` lọc theo file đổi | thấp | rất lớn (bỏ hẳn lần chạy) |
| Tách job song song | thấp | 40–60% thời gian chờ |
| Cache phụ thuộc | thấp | 1–3 phút mỗi lần |
| Chia test thành shard | vừa | tuyến tính theo số shard |
| `cancel-in-progress` | rất thấp | bỏ lần chạy thừa |

## Dễ nhầm

**1. Khoá cache cố định.** Cache không bao giờ cập nhật; và không ghi đè được.

**2. Khoá chứa `github.sha`.** Không bao giờ trúng.

**3. Cache thẳng `node_modules`.** Binary lệch nền tảng.

**4. Quên `runner.os` trong khoá.** Cache lẫn giữa các hệ điều hành.

**5. Không có `restore-keys`.** Đổi một dòng lockfile là mất trắng cache.

**6. Chia shard khi test chưa độc lập.** Hỏng ngẫu nhiên.

**7. Tối ưu mà chưa đo.** Sửa nhầm chỗ.

**8. Chạy E2E đầy đủ trên mọi PR.** Đẩy sang `main` hoặc chạy theo lịch.

**9. Cache mọi thứ.** Vượt hạn mức, đẩy cache quan trọng ra.

**10. Workflow không chạy trên nhánh mặc định.** Mọi PR bắt đầu với cache rỗng.

## Mẹo nhớ

> **Khoá cache = hash của thứ quyết định nội dung. Cố định là hỏng, `sha` là vô dụng.**
>
> **Thứ tự tối ưu: đừng chạy > chạy song song > cache.**
>
> **Đo trước. Thủ phạm thường không phải bước bạn nghĩ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Khoá cache nên chứa gì, và vì sao?
2. `restore-keys` dùng để làm gì?
3. Vì sao không cache thẳng `node_modules`?
4. Ba cách rút ngắn CI, theo thứ tự hiệu quả?
5. Điều kiện để chia test thành shard hoạt động được?

## Tự viết lại

CI hiện tại: một job chạy install → lint → typecheck → test → build, mất 15 phút. Không nhìn lại, viết lại nó để:

```text
① lint, typecheck, test chạy song song
② cache phụ thuộc đúng cách
③ test chia làm 3 shard
④ không chạy khi chỉ sửa file .md
```

Tự kiểm: khoá cache của bạn có `runner.os` và hash lockfile không?

## Thử sức

CI của đội mất 25 phút. Nhìn log: `pnpm install` mất 4 phút, test mất 15 phút, build mất 5 phút.

Ba câu để trả lời: bạn tấn công cái nào **trước** và vì sao; mục tiêu thực tế sau khi tối ưu là bao nhiêu; và bạn giữ tốc độ đó **không tụt lại** bằng cách nào khi dự án lớn dần. Câu khó nhất: nếu 15 phút test đó chủ yếu là chờ CSDL và mạng chứ không phải CPU, việc chia shard giúp được bao nhiêu — và cách khác là gì?
