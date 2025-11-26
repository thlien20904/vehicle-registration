# Vehicle Registration Blockchain - Frontend

## Nhiệm vụ của frontend

Frontend sử dụng React (Vite) để xây dựng giao diện người dùng, kết nối với smart contract trên blockchain, cập nhật trạng thái realtime, phân quyền admin/user, hiển thị popup thông báo và quản lý luồng đăng ký xe.

### Các file chính và chức năng

- **src/App.jsx**: File gốc quản lý route, khởi tạo kết nối contract, lắng nghe event realtime, phân quyền admin/user, hiển thị popup thông báo.
- **src/config.js**: Lưu địa chỉ contract, cấu hình kết nối blockchain (địa chỉ, network, v.v.).
- **src/abis/VehicleRegistration.json**: ABI contract, dùng để frontend gọi hàm và lắng nghe event từ smart contract.
- **src/ipfsClient.js**: Kết nối IPFS để upload/lấy file giấy tờ xe, ảnh xe.
- **src/components/SubmitVehicleForm.jsx**: Form cho user đăng ký xe, upload giấy tờ, gửi transaction lên contract.
- **src/components/AdminVehicleTable.jsx**: Bảng cho admin xem danh sách xe chờ duyệt, thực hiện duyệt/từ chối, nhập lý do từ chối.
- **src/components/vehicle/VehicleDetailModal.jsx**: Popup hiển thị chi tiết xe, trạng thái, lý do từ chối.
- **src/components/vehicle/VehicleHistoryTable.jsx**: Hiển thị lịch sử xe của user, trạng thái duyệt/từ chối, lý do.
- **src/assets/**: Chứa các file ảnh, icon, tài nguyên tĩnh cho giao diện.

### Liên kết giữa các file

- `App.jsx` sử dụng `config.js` và `abis/VehicleRegistration.json` để kết nối contract.
- `SubmitVehicleForm.jsx` gọi hàm đăng ký xe trên contract, upload file qua `ipfsClient.js`.
- `AdminVehicleTable.jsx` gọi hàm duyệt/từ chối xe trên contract, nhận event realtime từ `App.jsx`.
- Các component con như `VehicleDetailModal.jsx`, `VehicleHistoryTable.jsx` nhận dữ liệu từ contract và hiển thị cho user/admin.

### Quy trình hoạt động frontend

1. Kết nối contract qua ethers.js (dùng config.js và ABI).
2. User nhập thông tin xe, upload giấy tờ, gửi transaction lên contract.
3. Admin xem danh sách xe chờ duyệt, duyệt/từ chối, nhập lý do nếu từ chối.
4. Frontend lắng nghe event từ contract, cập nhật UI realtime, hiển thị popup thông báo cho user/admin.
5. Lưu trữ file giấy tờ, ảnh xe trên IPFS, lấy link lưu vào contract.

---

Frontend là nơi giao tiếp với người dùng, kết nối blockchain, cập nhật trạng thái realtime, đảm bảo trải nghiệm minh bạch, bảo mật và tiện lợi!














## 1. Bài toán đặt ra

- Xây dựng hệ thống đăng ký xe sử dụng blockchain để đảm bảo minh bạch, bảo mật, realtime, phân quyền rõ ràng giữa admin và user.
- Yêu cầu: 
  - User đăng ký xe, chỉ user mất phí.
  - Admin duyệt/từ chối xe, phải nhập lý do khi từ chối, admin không mất phí.
  - Cập nhật trạng thái realtime cho cả admin và user.
  - Lưu trữ giấy tờ xe trên IPFS.

---

## 2. Quy trình hoạt động từ backend đến frontend

### Backend (Smart Contract - Solidity)

1. **Triển khai contract**: 
   - Tài khoản đầu tiên là admin, deploy contract lên blockchain.
2. **User đăng ký xe**: 
   - Gửi thông tin xe, giấy tờ lên contract (giấy tờ lưu IPFS, link lưu trên blockchain).
   - Contract phát event `VehicleSubmitted`.
3. **Admin duyệt/từ chối xe**: 
   - Admin gọi hàm duyệt/từ chối, nếu từ chối phải nhập lý do.
   - Contract phát event `VehicleReviewed` (có trạng thái và lý do).

### Frontend (React + ethers.js)

1. **Kết nối contract**: 
   - Frontend lấy địa chỉ contract, ABI để kết nối blockchain.
2. **Phân quyền**: 
   - Xác định user/admin qua địa chỉ ví, hiển thị chức năng phù hợp.
3. **User đăng ký xe**: 
   - Gửi transaction lên contract, upload giấy tờ lên IPFS.
   - Nhận thông báo khi xe được duyệt/từ chối (realtime qua event).
4. **Admin duyệt/từ chối xe**: 
   - Xem danh sách xe chờ duyệt, nhập lý do nếu từ chối.
   - Gửi transaction lên contract, cập nhật trạng thái realtime.
5. **Realtime cập nhật**: 
   - Frontend lắng nghe event từ contract, cập nhật UI và popup thông báo cho user/admin.

---

## 3. Tóm tắt luồng dữ liệu

- User nhập thông tin → Gửi lên contract → Contract lưu thông tin, phát event → Frontend lắng nghe event, cập nhật UI realtime.
- Admin duyệt/từ chối → Gửi lên contract → Contract cập nhật trạng thái, phát event → Frontend lắng nghe event, cập nhật UI và popup cho user.




##
IPFS chỉ dùng để lưu file giấy tờ xe (PDF/JPG) và ảnh xe thực tế (file lớn, không phù hợp lưu trên blockchain).
Các thông tin như tên, số điện thoại, địa chỉ, biển số, năm sản xuất... sẽ được lưu trong các biến và struct của smart contract (ví dụ: struct OwnerInfo, Vehicle).
Khi user đăng ký xe:

File giấy tờ, ảnh xe: upload lên IPFS, lấy link IPFS lưu vào contract.
Thông tin cá nhân, thông tin xe: gửi trực tiếp vào contract, lưu trên blockchain.
Như vậy, blockchain lưu toàn bộ thông tin xe và chủ xe (trừ file lớn thì lưu IPFS, chỉ lưu link trên blockchain).

## Khi chạy lại dự án (khởi động lại node blockchain local bằng Hardhat), toàn bộ dữ liệu trên blockchain local sẽ bị reset về trạng thái ban đầu, giống như một mạng blockchain mới.
Điều này là do mạng local của Hardhat chỉ lưu dữ liệu tạm thời trong bộ nhớ RAM, không lưu trữ lâu dài như mạng thật (testnet/mainnet).
Vì vậy, mỗi lần khởi động lại node, các thông tin xe, chủ xe, trạng thái... đều bị xóa, chỉ còn lại contract vừa deploy và dữ liệu mới phát sinh sau khi chạy lại.

## Blockchain đảm bảo tính bất biến: mọi thông tin đã ghi sẽ luôn được lưu lại, không thể thay đổi hoặc xóa.