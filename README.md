# AI Smart Lighting Web - Hệ Thống Quản Lý Đèn Chiếu Sáng Thông Minh ESP32

Ứng dụng web full-stack thế hệ mới quản lý và giám sát thời gian thực hệ thống đèn chiếu sáng thông minh ESP32 AI Smart Lighting, hỗ trợ điều khiển chế độ (AUTO, MANUAL, AI), điều chỉnh độ sáng PWM, giám sát cảm biến LDR, PIR, nhiệt độ, độ ẩm và mô hình học máy On-device AI.

---

## 1. Tính Năng Chính

- **Kiến trúc Full-Stack tách biệt**:
  - **Backend**: Node.js, Express, TypeScript, MQTT Client TCP (`broker.emqx.io:1883`), WebSocket Server (`ws`), Lưu trữ thiết bị bền vững.
  - **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, hoàn toàn bằng tiếng Việt, hỗ trợ giao diện Sáng / Tối (Light / Dark mode).
  - Frontend **không** kết nối trực tiếp MQTT; mọi giao tiếp và xác thực đều đi qua Backend an toàn.
- **Quy trình ghép nối bằng mã 6 số (Pairing)**:
  - Giữ nút MODE trên ESP32 trong 3 giây để lấy mã 6 chữ số ngẫu nhiên trên màn hình OLED.
  - Nhập mã trên giao diện web, backend xác thực với ESP32 qua topic `ai-smart-lighting/pair/<code>` và gửi ACK `web` trong 15 giây.
  - Màn hình OLED của ESP32 hiển thị `WEB: DA KET NOI`.
- **Giám sát trạng thái 5 mức chuẩn xác**:
  1. *Chưa kết nối máy chủ*: Mất kết nối WebSocket tới backend Node.js.
  2. *Đang kết nối broker MQTT*: Backend đang thiết lập kết nối TCP tới broker.
  3. *Đã kết nối broker, đang chờ ESP32*: Đã sẵn sàng nhưng chưa nhận gói tin từ ESP32.
  4. *ESP32 trực tuyến*: ESP32 gửi availability `online` và telemetry mới trong vòng 10 giây.
  5. *Mất dữ liệu từ ESP32*: Quá 10 giây không có telemetry mới (tự động khóa bảng điều khiển).
  6. *ESP32 ngoại tuyến*: Nhận tín hiệu Last Will LWT `offline`.
- **Điều khiển chiếu sáng thông minh**:
  - Chuyển chế độ: `AUTO` (Tự động theo LDR & PIR), `MANUAL` (Thủ công), `AI` (Học máy trên chip).
  - Thanh trượt điều chỉnh độ sáng (0% - 100%) quy đổi chính xác sang giá trị PWM (0 - 255):
    - `0%` -> `0 PWM` (Tắt)
    - `25%` -> `64 PWM` (Dịu)
    - `50%` -> `128 PWM` (Vừa)
    - `75%` -> `191 PWM` (Sáng)
    - `100%` -> `255 PWM` (Tối đa)
  - Hiển thị tỷ lệ đèn bàn tự động (~70% đèn trần theo thiết kế firmware).
  - Nút khôi phục dữ liệu huấn luyện AI mặc định với hộp thoại xác nhận.
- **Biểu đồ thời gian thực**:
  - Theo dõi diễn biến độ tối môi trường (LDR) và độ sáng đèn trần.
  - Theo dõi nhiệt độ (°C) và độ ẩm (%).
  - Giới hạn tối đa 40 điểm đo gần nhất để không gây rò rỉ bộ nhớ.
- **Quản lý thiết bị**:
  - Lưu trữ danh sách thiết bị đã ghép vào `./data/devices.json`.
  - Tự động kết nối lại khi backend khởi động lại mà không cần nhập lại mã.
  - Hỗ trợ nút "Quên thiết bị" kèm xác nhận an toàn.

---

## 2. Cấu Trúc Dự Án (Monorepo)

```text
smart-lighting-web/
├── frontend/                     # Ứng dụng giao diện người dùng React
│   ├── src/
│   │   ├── components/           # Navbar, MetricsGrid, LightingControlCard, Charts, Modals
│   │   ├── pages/
│   │   ├── hooks/                # useWebSocket
│   │   ├── services/             # REST API client
│   │   ├── types/
│   │   ├── utils/                # Bộ chuyển đổi đơn vị và định dạng
│   │   ├── App.tsx               # Component ứng dụng chính
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/                      # Máy chủ backend Node.js
│   ├── src/
│   │   ├── controllers/          # DeviceController (xử lý ghép nối, lệnh, thiết bị)
│   │   ├── routes/               # Express API routes (/api/*)
│   │   ├── services/
│   │   ├── mqtt/                 # MqttManager (quản lý kết nối TCP, subscribe, publish)
│   │   ├── websocket/            # WebSocketManager (truyền realtime cho frontend)
│   │   ├── database/             # DeviceStorage (lưu trữ file devices.json)
│   │   ├── types/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── shared/                       # Định nghĩa TypeScript dùng chung
│   ├── types/                    # Device, TelemetryData, ControlMode, WebSocketMessage
│   └── utils/                    # Bộ quy đổi percentToPwm, parseTelemetry, validatePairingCode
├── tests/                        # Bộ kiểm thử đơn vị tự động (Vitest)
│   ├── utils.test.ts
│   └── api.test.ts
├── data/                         # Thư mục lưu trữ database thiết bị (devices.json)
├── .env.example                  # File cấu hình mẫu
├── server.ts                     # Full-stack server entry point (Express + WebSocket + Vite)
├── package.json                  # Root scripts và quản lý dự án
└── README.md
```

---

## 3. Giao Thức MQTT ESP32 Đang Sử Dụng

### Broker mặc định:
- **TCP Host**: `broker.emqx.io`
- **TCP Port**: `1883`
- **URI kết nối Backend**: `mqtt://broker.emqx.io:1883`

### Topics:
| Topic | Hướng | Mô tả |
| :--- | :--- | :--- |
| `ai-smart-lighting/pair/<code>` | ESP32 -> Web | ESP32 phát gói tin ghép nối mỗi 2s khi kích hoạt mode ghép nối (kèm mã 6 số) |
| `ai-smart-lighting/pair/<code>/ack` | Web -> ESP32 | Web phản hồi gói tin `web` (QoS 1) để xác nhận |
| `ai-smart-lighting/<deviceId>/availability` | ESP32 -> Web | `online` (retained) hoặc `offline` (Last Will retain) |
| `ai-smart-lighting/<deviceId>/telemetry` | ESP32 -> Web | Dữ liệu cảm biến định kỳ dạng JSON |
| `ai-smart-lighting/<deviceId>/cmd/mode` | Web -> ESP32 | Gửi lệnh chế độ: `AUTO`, `MANUAL`, `AI` |
| `ai-smart-lighting/<deviceId>/cmd/brightness` | Web -> ESP32 | Gửi độ sáng PWM: `0` - `255` |
| `ai-smart-lighting/<deviceId>/cmd/ai/reset` | Web -> ESP32 | Gửi chuỗi: `RESET` |

---

## 4. Hướng Dẫn Cài Đặt và Chạy (Windows & Linux/macOS)

### Yêu cầu:
- Node.js version 18 trở lên.
- Trình quản lý gói `npm`.

### Bước 1: Cài đặt dependencies
Mở Terminal hoặc PowerShell tại thư mục gốc của dự án:
```bash
npm install
```

### Bước 2: Cấu hình biến môi trường
Tạo file `.env` từ file mẫu:
```bash
# Trên Windows PowerShell:
Copy-Item .env.example .env

# Hoặc trên Linux/macOS:
cp .env.example .env
```

### Bước 3: Chạy ứng dụng trong môi trường phát triển (Development)
Lệnh này sẽ khởi động đồng thời cả Backend Express, WebSocket và Vite Dev Server trên cùng cổng 3000:
```bash
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

### Bước 4: Chạy kiểm thử tự động (Unit Tests)
Dự án được tích hợp bộ test kiểm tra:
1. Xác thực mã ghép nối 6 chữ số.
2. Phân tích cú pháp và kiểm tra kiểu dữ liệu Telemetry từ ESP32.
3. Quy đổi phần trăm (0-100%) sang giá trị PWM (0-255).
4. Tính toán thời gian quá hạn Telemetry (10 giây) và 5 trạng thái kết nối.
5. Kiểm tra API gửi lệnh chế độ và độ sáng.

Chạy test bằng lệnh:
```bash
npm test
```

### Bước 5: Build và chạy bản thương mại (Production)
```bash
# Biên dịch giao diện frontend sang thư mục dist/
npm run build

# Khởi chạy server production
npm run start
```

---

## 5. Quy Trình Ghép Nối Thiết Bị ESP32

1. Bật nguồn bo mạch ESP32 và đảm bảo ESP32 đã kết nối vào mạng Wi-Fi.
2. Giữ nút **MODE** trên ESP32 trong 3 giây. Màn hình OLED sẽ chuyển sang giao diện ghép nối và hiển thị mã 6 số (ví dụ: `481923`).
3. Trên trang web, nhập mã 6 số vào ô nhập mã và bấm **Ghép thiết bị**.
4. Backend sẽ kết nối tới topic `ai-smart-lighting/pair/481923`, chờ gói tin phát từ ESP32 trong tối đa 15 giây, gửi ACK xác nhận `web`.
5. Màn hình OLED trên ESP32 sẽ cập nhật: `WEB: DA KET NOI`.
6. Web tự động lưu thiết bị vào hệ thống và chuyển ngay sang Dashboard điều khiển thời gian thực!
