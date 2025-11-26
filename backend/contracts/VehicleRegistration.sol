// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VehicleRegistration {
    enum VehicleStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    struct OwnerInfo {
        string fullName;
        string cccd;
        string addressInfo;
        string phone;
    }

    struct Vehicle {
        uint256 vehicleId;
        string brand;
        string model;
        string color;
        string licensePlate;
        uint16 manufactureYear;
        string documentIpfsHash; // file đăng ký xe PDF hoặc JPG
        string vehicleImageIpfsHash; // ảnh xe thực tế
        VehicleStatus status;
        address payable walletAddress;
        OwnerInfo ownerInfo;
        address reviewer;
        uint256 fee;
        uint256 createdAt;
        string rejectionReason; // Lý do từ chối
    }

    mapping(uint256 => Vehicle) public vehicles;
    mapping(string => bool) private usedLicensePlates;

    uint256 public nextVehicleId = 1;
    address public adminAddress;
    uint256 public constant MIN_REGISTRATION_FEE = 0.01 ether;

    event VehicleSubmitted(uint256 indexed vehicleId, address indexed owner, uint256 fee);
    event VehicleReviewed(uint256 indexed vehicleId, VehicleStatus newStatus, address indexed reviewer, string rejectionReason);

    constructor(address _adminAddress) {
        adminAddress = _adminAddress;
    }

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "Only admin can perform this action");
        _;
    }

    // ==========================
    // 🧾 Đăng ký phương tiện mới
    // ==========================
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

        usedLicensePlates[_licensePlate] = true;
        
        // Chuyển phí ngay cho Admin khi đăng ký
        payable(adminAddress).transfer(msg.value);
        
        emit VehicleSubmitted(id, msg.sender, msg.value);
    }

    // 👩‍⚖️ Duyệt hồ sơ
    function reviewVehicle(uint256 _vehicleId, VehicleStatus _newStatus, string memory _rejectionReason) external onlyAdmin {
        require(_vehicleId > 0 && _vehicleId < nextVehicleId, "Invalid Vehicle ID");
        require(
            _newStatus == VehicleStatus.APPROVED || _newStatus == VehicleStatus.REJECTED,
            "Invalid status"
        );

        Vehicle storage v = vehicles[_vehicleId];
        require(v.status == VehicleStatus.PENDING, "Vehicle already reviewed");

        v.status = _newStatus;
        v.reviewer = msg.sender;

        // Nếu từ chối: lưu lý do và giải phóng biển số
        if (_newStatus == VehicleStatus.REJECTED) {
            v.rejectionReason = _rejectionReason;
            usedLicensePlates[v.licensePlate] = false;
        }

        emit VehicleReviewed(_vehicleId, _newStatus, msg.sender, _rejectionReason);
    }

    // 🔍 Kiểm tra biển số
    function isLicensePlateUsed(string memory _plate) public view returns (bool) {
        return usedLicensePlates[_plate];
    }

    // 📋 Lấy danh sách ID
    function getAllVehicleIds() public view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](nextVehicleId - 1);
        for (uint256 i = 1; i < nextVehicleId; i++) {
            ids[i - 1] = i;
        }
        return ids;
    }
}
