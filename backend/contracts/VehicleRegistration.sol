// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Hợp đồng quản lý đăng ký xe trên blockchain, phân quyền admin và user, lưu trạng thái, phát event realtime
contract VehicleRegistration {
    // Enum trạng thái xe: chờ duyệt, đã duyệt, bị từ chối
    enum VehicleStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    // Thông tin chủ sở hữu xe
    struct OwnerInfo {
        string fullName;
        string cccd;
        string addressInfo;
        string phone;
    }

    // Thông tin chi tiết về xe
    struct Vehicle {
        uint256 vehicleId; // ID xe
        string brand; // Hãng xe
        string model; // Dòng xe
        string color; // Màu xe
        string licensePlate; // Biển số xe
        uint16 manufactureYear; // Năm sản xuất
        string documentIpfsHash; // file đăng ký xe PDF hoặc JPG (lưu trên IPFS)
        string vehicleImageIpfsHash; // ảnh xe thực tế (lưu trên IPFS)
        VehicleStatus status; // Trạng thái xe
        address payable walletAddress; // Địa chỉ ví chủ xe
        OwnerInfo ownerInfo; // Thông tin chủ xe
        address reviewer; // Địa chỉ admin duyệt
        uint256 fee; // Phí đăng ký
        uint256 createdAt; // Thời điểm đăng ký
        string rejectionReason; // Lý do từ chối (nếu có)
    }

    mapping(uint256 => Vehicle) public vehicles;//truy cập thông tin xe theo ID
    mapping(string => bool) private usedLicensePlates;//đánh dấu biển số đã dùng để tránh trùng lặp

    uint256 public nextVehicleId = 1;
    address public adminAddress;
    uint256 public constant MIN_REGISTRATION_FEE = 0.01 ether;

    event VehicleSubmitted(uint256 indexed vehicleId, address indexed owner, uint256 fee); //realtime update UI.
    event VehicleReviewed(uint256 indexed vehicleId, VehicleStatus newStatus, address indexed reviewer, string rejectionReason);

    constructor(address _adminAddress) {
        adminAddress = _adminAddress; // Khởi tạo địa chỉ admin khi deploy contract
    }

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "Only admin can perform this action"); // Chỉ admin mới gọi được hàm có modifier này
        _;
    }

    // ==========================
    // 🧾 Đăng ký phương tiện mới
    // ==========================
    // Hàm cho user đăng ký xe mới, chỉ user gọi, phải trả phí
    function registerVehicle(
        OwnerInfo memory _ownerInfo,
        string memory _brand,
        string memory _model,
        string memory _color,
        string memory _licensePlate,
        uint16 _manufactureYear,
        string memory _documentIpfsHash,
        string memory _vehicleImageIpfsHash
    ) external payable {
        // ✅ Validate chủ sở hữu
        require(bytes(_ownerInfo.fullName).length > 0, "Full name required");
        require(bytes(_ownerInfo.cccd).length > 0, "CCCD required");
        require(bytes(_ownerInfo.addressInfo).length > 0, "Address required");
        require(bytes(_ownerInfo.phone).length >= 9, "Invalid phone number");

        // ✅ Validate xe
        require(bytes(_brand).length > 0, "Brand required");
        require(bytes(_model).length > 0, "Model required");
        require(bytes(_color).length > 0, "Color required");
        require(bytes(_licensePlate).length > 0, "License plate required");
        require(_manufactureYear >= 1980 && _manufactureYear <= 2025, "Invalid manufacture year");
        require(bytes(_documentIpfsHash).length > 0, "Document IPFS required");

        // ✅ Validate biển số & phí
        require(!usedLicensePlates[_licensePlate], "License plate already used");
        require(msg.value >= MIN_REGISTRATION_FEE, "Fee too low (>= 0.01 ETH)");

        uint256 id = nextVehicleId++;
        vehicles[id] = Vehicle({
            vehicleId: id,
            brand: _brand,
            model: _model,
            color: _color,
            licensePlate: _licensePlate,
            manufactureYear: _manufactureYear,
            documentIpfsHash: _documentIpfsHash,
            vehicleImageIpfsHash: _vehicleImageIpfsHash,
            status: VehicleStatus.PENDING,
            walletAddress: payable(msg.sender),
            ownerInfo: _ownerInfo,
            reviewer: address(0),
            fee: msg.value,
            createdAt: block.timestamp,
            rejectionReason: ""
        });
// Đánh dấu biển số đã dùng
        usedLicensePlates[_licensePlate] = true;
        
        // Chuyển phí ngay cho Admin khi đăng ký
        payable(adminAddress).transfer(msg.value); // Chuyển phí đăng ký cho admin
        
        emit VehicleSubmitted(id, msg.sender, msg.value); // Phát event khi đăng ký thành công
    }

    // 👩‍⚖️ Duyệt hồ sơ
    // Hàm cho admin duyệt hoặc từ chối xe, chỉ admin gọi được
    function reviewVehicle(uint256 _vehicleId, VehicleStatus _newStatus, string memory _rejectionReason) external onlyAdmin {
        require(_vehicleId > 0 && _vehicleId < nextVehicleId, "Invalid Vehicle ID"); // Kiểm tra ID hợp lệ
        require(
            _newStatus == VehicleStatus.APPROVED || _newStatus == VehicleStatus.REJECTED,
            "Invalid status"
        ); // Chỉ cho phép duyệt hoặc từ chối

        Vehicle storage v = vehicles[_vehicleId];
        require(v.status == VehicleStatus.PENDING, "Vehicle already reviewed"); // Chỉ duyệt xe chưa được xử lý

        v.status = _newStatus; // Cập nhật trạng thái xe
        v.reviewer = msg.sender; // Lưu địa chỉ admin duyệt

        // Nếu từ chối: lưu lý do và giải phóng biển số
        if (_newStatus == VehicleStatus.REJECTED) {
            v.rejectionReason = _rejectionReason; // Lưu lý do từ chối
            usedLicensePlates[v.licensePlate] = false; // Giải phóng biển số để user khác có thể đăng ký lại
        }

        emit VehicleReviewed(_vehicleId, _newStatus, msg.sender, _rejectionReason); // Phát event khi duyệt/từ chối
    }

    // 🔍 Kiểm tra biển số
    // Hàm kiểm tra biển số đã được đăng ký chưa
    function isLicensePlateUsed(string memory _plate) public view returns (bool) {
        return usedLicensePlates[_plate];
    }

    // 📋 Lấy danh sách ID
    // Hàm lấy toàn bộ danh sách ID xe đã đăng ký
    function getAllVehicleIds() public view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](nextVehicleId - 1);
        for (uint256 i = 1; i < nextVehicleId; i++) {
            ids[i - 1] = i;
        }
        return ids;
    }
}
