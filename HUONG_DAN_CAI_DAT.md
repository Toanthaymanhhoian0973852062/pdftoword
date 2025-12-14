# HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY ỨNG DỤNG DOCULATEX TRÊN MÁY TÍNH

Tài liệu này hướng dẫn bạn cách chạy ứng dụng này như một phần mềm độc lập (Desktop App) thay vì chạy trên trình duyệt web.

## BƯỚC 1: Cài đặt môi trường (Node.js)

1. Tải và cài đặt **Node.js** (phiên bản LTS) từ trang chủ: [https://nodejs.org/](https://nodejs.org/)
2. Sau khi cài xong, mở **Terminal** (trên Mac) hoặc **Command Prompt / PowerShell** (trên Windows) và gõ lệnh sau để kiểm tra:
   ```bash
   node -v
   npm -v
   ```
   Nếu hiện ra số phiên bản là đã cài thành công.

## BƯỚC 2: Cài đặt thư viện cho dự án

1. Tại thư mục chứa code của dự án này, mở Terminal.
2. Chạy lệnh sau để tải các thư viện cần thiết:
   ```bash
   npm install
   ```
   *(Chờ một lúc để máy tải về các gói tin)*.

## BƯỚC 3: Cấu hình API Key

Để ứng dụng hoạt động, bạn cần có API Key của Gemini.
1. Tạo một file tên là `.env.local` ở thư mục gốc dự án (nếu chưa có).
2. Mở file đó và dán nội dung sau vào:
   ```
   GEMINI_API_KEY=Điền_Mã_API_Của_Bạn_Vào_Đây
   ```
   *(Thay thế `Điền_Mã_API_...` bằng mã thật bạn lấy từ Google AI Studio)*.

## BƯỚC 4: Chạy ứng dụng

Có 2 cách để chạy:

### Cách 1: Chạy chế độ dùng thử (Development)
Chế độ này dùng để vừa code vừa test, cửa sổ ứng dụng sẽ hiện ra ngay lập tức.
```bash
npm run app
```

### Cách 2: Đóng gói thành file cài đặt (.exe / .dmg)
Nếu bạn muốn tạo ra file `.exe` để gửi cho người khác hoặc cài đặt vĩnh viễn.

1. Chạy lệnh build:
   ```bash
   npm run dist
   ```
2. Sau khi chạy xong, vào thư mục `release/`. Bạn sẽ thấy file cài đặt ứng dụng tại đó (ví dụ: `DocuLatex Setup 1.0.0.exe`).

---

## XỬ LÝ LỖI THƯỜNG GẶP

1. **Lỗi màn hình trắng:**
   - Đảm bảo bạn đã chạy lệnh `npm install` thành công.
   - Kiểm tra xem file `.env.local` đã có API Key chưa.

2. **Lỗi không mở được ứng dụng sau khi build:**
   - Hãy thử chạy `npm run build` trước để đảm bảo code web không bị lỗi, sau đó mới chạy `npm run dist`.
