# Thư mục Video Loop (~10 giây) dành cho các Dự án Portfolio

Thư mục này dùng để chứa các đoạn video teaser ngắn (khoảng 8 – 12 giây, khuyến nghị 10 giây) chạy lặp (`loop`) tự động cho từng thẻ dự án ở phần **Dự án tiêu biểu** (`#du-an`).

---

### 1. Cách gắn video vào dự án:
Mở file `src/data/portfolioData.ts` và thêm thuộc tính `videoUrl` vào dự án tương ứng:

```ts
{
  id: 'dem-khong-ngu',
  title: 'Đêm Không Ngủ',
  // Thêm đường dẫn video (đặt file video vào thư mục public/videos/):
  videoUrl: '/videos/dem-khong-ngu.mp4',
  ...
}
```

---

### 2. Thông số video tối ưu khuyến nghị (Dành cho Editor / Colorist):
- **Thời lượng:** 8 – 12 giây (cắt những cú máy đẹp nhất, nhịp điệu ấn tượng).
- **Định dạng:** MP4 (H.264) hoặc WebM (VP9).
- **Độ phân giải:** 1080p (1920x1080) hoặc 720p (1280x720).
- **Khung hình:** 24 fps (chuẩn điện ảnh) hoặc 30 fps.
- **Âm thanh:** Khuyên bạn **bỏ track audio khi render** (Export Video Only) để file siêu nhẹ (chỉ khoảng 2MB – 5MB), giúp web tải nhanh như chớp.
- **Fallback tự động:** Nếu video đang nạp hoặc chưa có, hệ thống sẽ tự động hiển thị ảnh bìa `coverImage` và chuỗi khung hình cinematic crossfade mượt mà.
