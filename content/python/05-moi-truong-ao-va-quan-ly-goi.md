---
title: Môi trường ảo và quản lý gói
slug: moi-truong-ao-va-quan-ly-goi
summary: Vì sao mỗi dự án cần môi trường riêng, và cách ghim phiên bản để máy khác chạy y hệt.
level: trung-cap
tags: [python, moi-truong, pip, venv]
---

> **Sau bài này bạn sẽ:** không bao giờ gặp cảnh "trên máy tôi chạy được", và biết vì sao `pip install` toàn cục là thói quen xấu.

## Vấn đề

Dự án A cần `django==3.2`, dự án B cần `django==5.0`. Cài toàn cục thì chỉ một trong hai chạy được. Tệ hơn, `sudo pip install` có thể ghi đè gói mà chính hệ điều hành đang dùng và làm hỏng công cụ hệ thống.

Môi trường ảo là một thư mục chứa bản Python và bộ gói riêng cho từng dự án.

## venv — có sẵn, đủ dùng

```bash
python -m venv .venv              # tạo

source .venv/bin/activate         # kích hoạt (macOS/Linux)
.venv\Scripts\activate            # Windows

pip install requests
pip list
deactivate                        # thoát
```

Dấu hiệu đã kích hoạt: dấu nhắc lệnh có tiền tố `(.venv)`. Luôn thêm `.venv/` vào `.gitignore` — nó là thứ dựng lại được, không phải mã nguồn.

## Ghim phiên bản

```bash
pip freeze > requirements.txt     # ghi lại chính xác những gì đang cài
pip install -r requirements.txt   # dựng lại ở máy khác
```

Vấn đề của `pip freeze`: nó trộn lẫn thư viện bạn **chọn** với các phụ thuộc **kéo theo**. Sáu tháng sau không ai biết dòng nào là cần thiết.

Cách tốt hơn — hai file:

```
requirements.in       # thứ bạn thật sự cần:  requests, fastapi
requirements.txt      # sinh tự động, ghim đầy đủ cả cây phụ thuộc
```

```bash
pip install pip-tools
pip-compile requirements.in     # sinh requirements.txt có ghim và ghi rõ vì sao
pip-sync requirements.txt       # cài đúng, gỡ thừa
```

## `pyproject.toml` — cách hiện đại

```toml
[project]
name = "du-an"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["requests>=2.31", "pydantic>=2.5"]

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]
```

```bash
pip install -e ".[dev]"    # cài dự án ở chế độ sửa được, kèm nhóm dev
```

Một file thay cho `setup.py` + `requirements.txt` + `setup.cfg`. Đây là chuẩn hiện tại.

## uv — nhanh hơn nhiều

`uv` là trình quản lý gói viết bằng Rust, tương thích pip và nhanh hơn hàng chục lần:

```bash
uv venv                    # tạo môi trường
uv pip install -r requirements.txt
uv add requests            # thêm gói và cập nhật pyproject.toml + lockfile
uv run python chinh.py     # tự đảm bảo môi trường đúng trước khi chạy
```

`uv.lock` ghim toàn bộ cây phụ thuộc kèm hash — tương đương lockfile của npm/pnpm, thứ Python thiếu suốt nhiều năm.

## Ghim phiên bản Python

Gói không phải thứ duy nhất khác nhau giữa các máy. Ghi rõ phiên bản Python:

```
# .python-version
3.12
```

`pyenv`, `uv`, và nhiều công cụ CI đọc file này.

## Công cụ chất lượng code

```bash
pip install ruff mypy pytest

ruff check .        # lint, thay được flake8 + isort + nhiều plugin
ruff format .       # định dạng, tương thích black
mypy .              # kiểm tra kiểu tĩnh
pytest              # chạy test
```

`ruff` nhanh tới mức chạy được ở mỗi lần lưu file.

## Lỗi hay gặp

| Lỗi | Hậu quả | Sửa thế nào |
|---|---|---|
| `sudo pip install` | Hỏng gói hệ thống | Luôn dùng môi trường ảo |
| Commit `.venv/` | Repo phình hàng trăm MB | Thêm vào `.gitignore` |
| Không ghim phiên bản | CI cài bản mới, vỡ bất ngờ | `pip-compile` hoặc `uv.lock` |
| `pip freeze` làm nguồn sự thật | Không phân biệt được gói trực tiếp | Dùng `requirements.in` |
| Quên kích hoạt venv | Cài nhầm vào Python hệ thống | Kiểm tra `(.venv)` ở dấu nhắc |

## Ghi nhớ

- Một môi trường ảo cho mỗi dự án, không có ngoại lệ.
- Tách "gói tôi cần" khỏi "cây phụ thuộc đầy đủ".
- `pyproject.toml` là chuẩn hiện tại; `uv` là công cụ nhanh nhất.
- Ghim cả phiên bản Python, không chỉ phiên bản gói.

## Tự kiểm tra

1. Vì sao `pip freeze > requirements.txt` không đủ tốt về lâu dài?
2. Đồng nghiệp chạy code của bạn bị lỗi import. Kiểm tra những gì, theo thứ tự nào?
3. `pip install -e .` khác `pip install .` ở chỗ nào?
