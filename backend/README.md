# Vehicle Registration Blockchain - Backend

## Nhiệm vụ của backend

Backend sử dụng Solidity để xây dựng smart contract quản lý đăng ký xe trên blockchain. Toàn bộ logic nghiệp vụ, phân quyền, lưu trữ dữ liệu, phát event realtime đều nằm ở backend.

### Solidity là gì và vai trò trong hệ thống

- Solidity là ngôn ngữ lập trình để viết smart contract chạy trên blockchain Ethereum.
- Trong hệ thống này, Solidity kiểm soát mọi quy trình đăng ký xe, phân quyền admin/user, quản lý dữ liệu xe, chủ xe, trạng thái, lý do từ chối, xử lý phí giao dịch và phát event realtime cho frontend.

### Nhiệm vụ các file chính ở backend

- **contracts/VehicleRegistration.sol**: Smart contract chính, chứa toàn bộ logic đăng ký xe, duyệt/từ chối, phân quyền, phát event, quản lý dữ liệu xe và chủ xe.
- **scripts/deploy.js**: Script dùng để deploy contract lên blockchain. Tài khoản đầu tiên sẽ là admin của hệ thống.
- **hardhat.config.js**: File cấu hình cho Hardhat, chọn phiên bản Solidity, cấu hình mạng blockchain, plugin, đường dẫn source/build/test...
- **test/**: Chứa các file test cho contract, giúp kiểm tra logic hoạt động đúng.
- **artifacts/**: Chứa kết quả biên dịch contract (ABI, bytecode...) để frontend sử dụng kết nối blockchain.

### Quy trình hoạt động backend

1. Viết smart contract bằng Solidity (VehicleRegistration.sol).
2. Cấu hình Hardhat (hardhat.config.js).
3. Deploy contract lên blockchain bằng script (scripts/deploy.js).
4. Test contract với các file trong test/.
5. Lấy ABI và địa chỉ contract từ artifacts/ để frontend kết nối.

---

Bạn chỉ cần hiểu: Backend là nơi xây dựng và kiểm soát toàn bộ logic nghiệp vụ đăng ký xe, đảm bảo minh bạch, bảo mật, tự động hóa trên blockchain!
