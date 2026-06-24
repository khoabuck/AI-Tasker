# Git Cheat Sheet - SWP392 Team

## 1. Kiểm tra branch hiện tại

```bash
git branch
```

Ví dụ:

```text
  be/khoa
  develop
* fe/minh
  main
```

Dấu `*` cho biết branch hiện tại đang làm việc là:

```text
fe/minh
```

---

## 2. Xem toàn bộ branch local và remote

```bash
git branch -a
```

Ví dụ:

```text
  be/khoa
  fe/minh
  develop
  main

  remotes/origin/be/khoa
  remotes/origin/be/phat
  remotes/origin/be/tung
  remotes/origin/fe/minh
  remotes/origin/develop
  remotes/origin/main
```

---

## 3. Tải thông tin mới nhất từ GitHub

```bash
git fetch origin
```

Lệnh này:

* Không thay đổi code hiện tại
* Chỉ tải thông tin commit mới từ GitHub

Nên chạy trước khi pull hoặc đổi branch.

---

## 4. Chuyển sang branch khác

Ví dụ đang ở:

```text
fe/minh
```

Muốn chuyển sang:

```text
be/khoa
```

Chạy:

```bash
git checkout be/khoa
```

hoặc:

```bash
git switch be/khoa
```

---

## 5. Tạo branch local từ branch trên GitHub

Ví dụ branch chưa tồn tại local:

```text
origin/be/phat
```

Tạo branch local:

```bash
git checkout -b be/phat origin/be/phat
```

Hoặc:

```bash
git switch -c be/phat origin/be/phat
```

---

## 6. Đồng bộ code mới nhất của branch hiện tại

Ví dụ đang ở:

```text
be/khoa
```

Thực hiện:

```bash
git fetch origin
git pull origin be/khoa
```

Ý nghĩa:

* fetch: tải thông tin mới
* pull: tải code mới về máy

---

## 7. Đồng bộ branch local giống 100% GitHub

⚠️ Xóa toàn bộ thay đổi chưa commit.

Ví dụ:

```bash
git fetch origin
git reset --hard origin/be/khoa
```

Kết quả:

```text
HEAD is now at xxxxxxx
```

Code local sẽ giống hệt GitHub.

---

## 8. Kiểm tra file đang thay đổi

```bash
git status
```

Ví dụ:

```text
On branch be/khoa

Changes not staged for commit:
  modified: Program.cs
```

---

## 9. Lưu thay đổi lên GitHub

### Bước 1: Add

```bash
git add .
```

### Bước 2: Commit

```bash
git commit -m "Update login API"
```

### Bước 3: Push

```bash
git push origin be/khoa
```

---

## 10. Xem lịch sử commit

```bash
git log --oneline
```

Ví dụ:

```text
510bf05 Add backend from be/phat
2b96bfd Update login
471db8b Fix API
```

---

## 11. Hủy thay đổi chưa commit

Hủy một file:

```bash
git restore Program.cs
```

Hủy toàn bộ:

```bash
git restore .
```

---

## 12. Hủy commit chưa push

```bash
git reset --soft HEAD~1
```

Giữ code nhưng xóa commit.

---

## 13. Xử lý khi pull bị conflict

Kiểm tra:

```bash
git status
```

Nếu thấy:

```text
You have unmerged paths
```

Hủy merge:

```bash
git merge --abort
```

Sau đó đồng bộ lại:

```bash
git fetch origin
git reset --hard origin/be/khoa
```

---

## 14. Quy trình làm việc hằng ngày

### Buổi sáng

```bash
git checkout be/khoa
git fetch origin
git pull origin be/khoa
```

### Trong quá trình code

```bash
git status
```

### Sau khi hoàn thành

```bash
git add .
git commit -m "Implement profile feature"
git push origin be/khoa
```

---

## 15. Các lệnh thường dùng nhất

### Kiểm tra branch

```bash
git branch
```

### Xem trạng thái

```bash
git status
```

### Chuyển branch

```bash
git checkout be/khoa
```

### Đồng bộ code

```bash
git pull origin be/khoa
```

### Đẩy code

```bash
git push origin be/khoa
```

### Đồng bộ tuyệt đối với GitHub

```bash
git fetch origin
git reset --hard origin/be/khoa
```

### Xem lịch sử commit

```bash
git log --oneline
```
