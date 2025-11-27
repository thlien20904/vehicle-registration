
🧑‍💼 User → Smart Contract

Nhập thông tin & upload file

Gửi giao dịch registerVehicle + phí

Contract validate

Lưu thông tin xe & đánh dấu biển số

Chuyển phí cho admin

Phát event VehicleSubmitted

👩‍⚖️ Admin → Smart Contract

Lấy danh sách hồ sơ

Xem chi tiết

Duyệt hoặc từ chối hồ sơ

Contract cập nhật trạng thái

Giải phóng biển số nếu bị từ chối

Phát event VehicleReviewed

## 📊 QUY TRÌNH HOẠT ĐỘNG CHI TIẾT

### A. LUỒNG ĐĂNG KÝ XE (USER)

1. User kết nối ví MetaMask  
   ↓  
2. Hệ thống kiểm tra network (Chain ID 31337)  
   ↓  
3. User nhập thông tin xe và chủ xe  
   ↓  
4. User upload file giấy tờ xe (PDF/JPG) và ảnh xe  
   ↓  
5. Frontend upload file lên IPFS  
   ├─ Upload giấy tờ xe → Hash1  
   └─ Upload ảnh xe → Hash2  
   ↓  
6. Frontend lấy 2 Hash IPFS: "Hash1", "Hash2"  
   ↓  
7. Frontend gọi hàm `registerVehicle` trên Smart Contract  
   ├─ Gửi thông tin xe  
   ├─ Gửi thông tin chủ xe  
   ├─ Gửi Hash IPFS giấy tờ và ảnh xe  
   └─ Gửi phí: 0.01 ETH  
   ↓  
8. Smart Contract kiểm tra dữ liệu:  
   ├─ Kiểm tra tên, CCCD, địa chỉ, SĐT  
   ├─ Kiểm tra thông tin xe  
   ├─ Kiểm tra biển số chưa được sử dụng  
   └─ Kiểm tra phí >= 0.01 ETH  
   ↓  
9. Smart Contract lưu hồ sơ:  
   ├─ Tạo ID mới  
   ├─ Lưu thông tin vào mapping `vehicles`  
   ├─ Đánh dấu biển số đã dùng  
   ├─ Set trạng thái = PENDING  
   └─ Emit event `VehicleSubmitted`  
   ↓  
10. Transaction hoàn thành  
    ↓  
11. Frontend lắng nghe event realtime  
    └─ Cập nhật bảng lịch sử, hiển thị trạng thái "CHỜ DUYỆT"  

---

### B. LUỒNG DUYỆT HỒ SƠ (ADMIN)

1. Admin kết nối ví MetaMask  
   ↓  
2. Hệ thống kiểm tra địa chỉ ví:  
   ├─ Gọi `contract.adminAddress()`  
   └─ So sánh với địa chỉ ví hiện tại  
   ↓  
3. Nếu là Admin:  
   └─ Hiển thị giao diện quản trị  
   ↓  
4. Frontend lấy danh sách hồ sơ:  
   ├─ Gọi `contract.getAllVehicleIds()`  
   ├─ Lặp qua từng ID  
   └─ Gọi `contract.vehicles(id)` để lấy chi tiết  
   ↓  
5. Hiển thị bảng danh sách hồ sơ  
   ↓  
6. Admin click "👁️ Xem" → Modal hiển thị:  
   ├─ Thông tin chủ xe  
   ├─ Thông tin xe  
   └─ Link xem tài liệu trên IPFS  
   ↓  
7. Admin click "Duyệt" hoặc "Từ chối" (nếu từ chối phải nhập lý do)  
   ↓  
8. Frontend gọi `contract.reviewVehicle(vehicleId, status, rejectionReason)`  
   ├─ status = 1 (APPROVED) nếu Duyệt  
   └─ status = 2 (REJECTED) nếu Từ chối  
   ↓  
9. Smart Contract kiểm tra:  
   ├─ `msg.sender` phải là `adminAddress`  
   ├─ `vehicleId` hợp lệ  
   ├─ Trạng thái hiện tại phải là PENDING  
   └─ Status mới phải là APPROVED hoặc REJECTED  
   ↓  
10. Smart Contract xử lý:  
    ├─ Cập nhật trạng thái hồ sơ  
    ├─ Lưu địa chỉ ví của reviewer  
    ├─ Nếu REJECTED:  
    │   ├─ Lưu lý do từ chối  
    │   └─ Giải phóng biển số xe  
    └─ Nếu APPROVED:  
        └─ Không cần chuyển phí, admin đã nhận phí khi user đăng ký  
   ↓  
11. Transaction hoàn thành  
    ↓  
12. Frontend lắng nghe event realtime  
    └─ Cập nhật danh sách, hồ sơ hiển thị trạng thái mới và popup thông báo cho user

---

**Lưu ý:**  
- Toàn bộ cập nhật trạng thái đều realtime qua event từ smart contract.
- Admin không mất phí, user chỉ mất phí khi đăng ký, không hoàn phí khi bị từ chối.
- Lý do từ chối được lưu và hiển thị cho user.  
- File giấy tờ, ảnh xe lưu IPFS, thông tin cá nhân và xe lưu trên blockchain.




##

Dưới đây là một số câu hỏi giảng viên có thể hỏi về dự án của bạn, kèm theo câu trả lời mẫu:

---

### 1. Tại sao lại dùng blockchain cho bài toán đăng ký xe?
**Trả lời:**  
Blockchain giúp lưu trữ dữ liệu minh bạch, không thể sửa/xóa, đảm bảo an toàn và chống gian lận. Mọi thao tác đều được ghi lại, ai cũng có thể kiểm tra lịch sử giao dịch.

---

### 2. Vì sao chỉ user mất phí, admin không mất phí?
**Trả lời:**  
User là người khởi tạo giao dịch đăng ký xe nên phải trả phí mạng (gas fee). Admin chỉ duyệt/từ chối hồ sơ, không tạo giao dịch mới nên không mất phí.

---

### 3. Nếu bị từ chối đăng ký xe, user có được hoàn phí không?
**Trả lời:**  
Không. Phí đã trả là phí mạng blockchain, không thể hoàn lại. Admin chỉ giải phóng biển số để user có thể đăng ký lại.

---

### 4. Thông tin nào lưu trên blockchain, thông tin nào lưu trên IPFS?
**Trả lời:**  
Thông tin xe, chủ xe, trạng thái, lý do từ chối... lưu trực tiếp trên blockchain. File giấy tờ xe, ảnh xe (dung lượng lớn) lưu trên IPFS, chỉ lưu hash IPFS trên blockchain.

---

### 5. Nếu khởi động lại node local, dữ liệu có bị mất không?
**Trả lời:**  
Có. Mạng local Hardhat chỉ lưu dữ liệu tạm thời, khi khởi động lại sẽ mất hết. Nếu muốn lưu lâu dài, phải deploy lên testnet hoặc mainnet.

---

### 6. Có thể sửa hoặc xóa dữ liệu đã lưu trên blockchain không?
**Trả lời:**  
Không thể sửa/xóa. Blockchain đảm bảo tính bất biến, chỉ có thể cập nhật trạng thái mới hoặc thêm dữ liệu mới.

---

### 7. Làm sao để frontend cập nhật trạng thái realtime?
**Trả lời:**  
Frontend lắng nghe event từ smart contract qua ethers.js. Khi có event mới (duyệt/từ chối), giao diện sẽ tự động cập nhật và hiển thị popup thông báo.

---

### 8. Nếu nhiều user đăng ký cùng một biển số thì sao?
**Trả lời:**  
Smart contract kiểm tra biển số đã dùng chưa. Nếu đã dùng, giao dịch sẽ bị từ chối, user phải chọn biển số khác.

---

### 9. Quy trình phân quyền giữa admin và user như thế nào?
**Trả lời:**  
Admin được xác định qua địa chỉ ví khi deploy contract. Chỉ admin mới gọi được hàm duyệt/từ chối, user chỉ được đăng ký xe.

---

### 10. Nếu muốn mở rộng hệ thống cho nhiều admin thì làm thế nào?
**Trả lời:**  
Có thể sửa smart contract để lưu danh sách nhiều địa chỉ admin, kiểm tra quyền khi gọi hàm duyệt/từ chối.

---

Bạn có thể bổ sung hoặc chỉnh sửa các câu trả lời này cho phù hợp với phần trình bày của mình!