---
title: Môi trường ảo và quản lý gói
slug: moi-truong-ao-va-quan-ly-goi
summary: Vì sao mỗi dự án cần môi trường riêng, và cách ghim phiên bản để máy khác chạy y hệt.
level: trung-cap
tags: [python, moi-truong, pip, venv]
khung: v2
---

> **Sau bài này bạn sẽ:** hiểu vì sao "chạy trên máy tôi mà không chạy trên máy anh" xảy ra, và ghim được phiên bản để nó không xảy ra nữa.

## Ý tưởng chính

Python cài thư viện **vào một chỗ dùng chung cho cả máy**. Nên hai dự án cần hai phiên bản khác nhau của cùng một thư viện thì **không thể cùng tồn tại**.

Môi trường ảo giải quyết đúng điều đó: mỗi dự án một thư mục thư viện riêng, độc lập hoàn toàn.

## Mental model

Hãy nghĩ tới **tủ đồ nghề**.

> Không có môi trường ảo: cả nhà dùng **một tủ đồ chung**. Bạn cần cờ lê 10, anh hàng xóm đổi nó thành cờ lê 12 — và việc của bạn hỏng, dù bạn không đụng vào gì cả.
>
> Có môi trường ảo: **mỗi dự án một tủ riêng**. Bạn mở tủ của dự án nào thì dùng đúng bộ đồ của dự án đó.

Và **file ghim phiên bản** là **bản kê khai tủ đồ**: nó cho phép người khác dựng lại đúng cái tủ của bạn, đến từng cái cờ lê.

## Ví dụ nhỏ

```bash
python -m venv .venv                 # tạo tủ riêng cho dự án này

source .venv/bin/activate            # macOS/Linux — "mở tủ này ra dùng"
.venv\Scripts\activate               # Windows

pip install requests
deactivate                           # đóng tủ
```

Dấu hiệu đã kích hoạt: dấu nhắc lệnh có tiền tố `(.venv)`.

## Code chạy thế nào

Vì sao "chạy trên máy tôi" hỏng trên máy khác:

```text
Máy bạn (tháng 1):
  pip install requests          → cài requests 2.31.0
  code chạy ngon

Máy đồng nghiệp (tháng 6):
  pip install requests          → cài requests 2.35.0  ← phiên bản MỚI NHẤT lúc đó
  thư viện đã đổi một hành vi nhỏ
  ⇒ code hỏng, và không ai hiểu vì sao
```

`requirements.txt` chặn đúng chỗ đó:

```text
requests==2.31.0        ← ghim CHÍNH XÁC
```

Nhưng nó chưa đủ, vì `requests` còn kéo theo `urllib3`, `certifi`, `idna`… và **những cái đó chưa được ghim**:

```bash
pip freeze > requirements.txt        # ✅ ghim CẢ phụ thuộc của phụ thuộc
```

## Cú pháp

```bash
pip install requests                 # cài
pip install -r requirements.txt      # cài theo danh sách
pip freeze > requirements.txt        # xuất TOÀN BỘ, kèm phụ thuộc gián tiếp
pip list --outdated                  # xem gói nào có bản mới
```

Cách hiện đại — `pyproject.toml`, một file cho cả cấu hình lẫn phụ thuộc:

```toml
[project]
name = "duan"
requires-python = ">=3.11"
dependencies = ["requests>=2.31,<3", "pydantic>=2"]

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[tool.ruff]
line-length = 100
```

```bash
pip install -e ".[dev]"              # cài dự án ở chế độ sửa được + nhóm dev
```

`uv` — nhanh hơn `pip` hàng chục lần, dùng chung định dạng:

```bash
uv venv && uv pip install -r requirements.txt
uv lock                              # sinh uv.lock — ghim chính xác, tái lập được
uv sync                              # dựng lại môi trường ĐÚNG như lock
```

## Tại sao cần nó

Vì hai file phục vụ hai mục đích khác nhau, và nhầm chúng là nguồn của nhiều rắc rối:

| File | Nói gì | Ai đọc |
|---|---|---|
| `pyproject.toml` | *"tôi cần requests từ 2.31 trở lên"* | Người phát triển, khi cài mới |
| `requirements.txt` / `uv.lock` | *"lần build này dùng đúng 2.31.0 và 47 gói kèm theo"* | Máy chủ, CI, Docker |

**Thư viện** thì khai khoảng rộng (`>=2.31,<3`) để không xung đột với dự án dùng nó. **Ứng dụng** thì ghim chính xác, vì bạn muốn production giống hệt máy dev.

Ghim cả phiên bản Python nữa — đây là chỗ hay bị bỏ sót:

```text
.python-version    →  3.12.1        (pyenv, uv đọc file này)
pyproject.toml     →  requires-python = ">=3.11"
Dockerfile         →  FROM python:3.12.1-slim
```

Ba chỗ phải khớp nhau. Không khớp thì CI chạy Python 3.11, máy bạn 3.12, và một cú pháp mới sẽ nổ ở đúng nơi bạn không nhìn.

Bộ công cụ chất lượng nên có trong mọi dự án:

```bash
ruff check . --fix          # lint + sửa tự động, thay cho flake8/isort/black
ruff format .               # định dạng
mypy .                      # kiểm kiểu — xem [[type-hint-trong-python]]
pytest                      # test
```

## So sánh

| Công cụ | Dùng khi |
|---|---|
| `venv` + `pip` | Có sẵn, không cài gì thêm — đủ cho hầu hết dự án |
| `uv` | Muốn nhanh và có lock file chuẩn — lựa chọn tốt cho dự án mới |
| Poetry | Thích quản lý phụ thuộc kiểu khai báo, cần publish thư viện |
| Conda | Có phụ thuộc nhị phân nặng (khoa học dữ liệu, CUDA) |

Với dự án web hoặc script thường: `venv` + `pip` là đủ, và `uv` nếu bạn muốn nhanh.

## Dễ nhầm

**1. Không dùng môi trường ảo.** Rồi một ngày hai dự án cần hai phiên bản Django khác nhau, và bạn phải chọn một.

**2. Commit thư mục `.venv`.** Nó nặng hàng trăm MB và **chỉ chạy được trên đúng hệ điều hành đó**. Thêm vào `.gitignore`.

**3. Ghim khoảng quá rộng cho ứng dụng.** `requests>=2.31` nghĩa là hôm nay bạn được 2.31, sáu tháng sau CI được 2.40, và không ai chủ động quyết định điều đó.

**4. Không ghim phụ thuộc gián tiếp.** `pip install requests` ghim `requests` nhưng không ghim `urllib3` — và `urllib3` cũng có thể phá hỏng bạn. Dùng `pip freeze` hoặc lock file.

**5. Quên kích hoạt môi trường.** `pip install` cài vào Python toàn cục, rồi bạn tự hỏi vì sao `import` không thấy. Kiểm bằng `which python`.

**6. Trộn `pip` và `conda` trong một môi trường.** Hai bộ quản lý cùng ghi vào một chỗ, và không cái nào biết cái kia đã làm gì.

## Mẹo nhớ

> **Mỗi dự án một tủ đồ riêng.**
>
> **Thư viện khai khoảng rộng; ứng dụng ghim chính xác.**
>
> **Ghim cả phiên bản Python, ở cả ba chỗ.**

## Tự nhớ

Không nhìn lên, trả lời bằng lời của bạn:

1. Vấn đề gì xảy ra khi không dùng môi trường ảo?
2. `pyproject.toml` và `requirements.txt` khác nhau về **mục đích** thế nào?
3. Vì sao ghim `requests==2.31.0` vẫn chưa đủ để tái lập môi trường?
4. Vì sao thư viện nên khai khoảng rộng còn ứng dụng thì ghim chặt?
5. Ba chỗ cần khai phiên bản Python cho khớp nhau?

## Tự viết lại

Không nhìn lại phần trên, viết các lệnh để dựng một dự án mới từ đầu: tạo môi trường, cài `requests` và `pytest` (pytest chỉ cho dev), ghim phiên bản, và ghi `.gitignore`.

Tự kiểm: đồng nghiệp clone repo của bạn về, họ chạy **đúng mấy lệnh** là có môi trường y hệt bạn?

## Thử sức

CI của bạn chạy đúng sáu tháng rồi đột nhiên đỏ, dù **không ai đổi dòng code nào**.

Nêu **ba** nguyên nhân có thể, xếp theo khả năng xảy ra. Rồi trả lời: thay đổi **nào** trong cách quản lý phụ thuộc sẽ khiến chuyện này không tái diễn — và nó đánh đổi cái gì?
