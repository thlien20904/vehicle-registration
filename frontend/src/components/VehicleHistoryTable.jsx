// Add rejection reason display in user history
const VehicleDetailModal = ({ vehicle, onClose }) => {
  if (!vehicle) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Chi tiết hồ sơ xe #{vehicle.id}</h2>
        <p>
          <strong>Biển số:</strong> {vehicle.licensePlate}
        </p>
        <p>
          <strong>Hãng xe:</strong> {vehicle.brand}
        </p>
        <p>
          <strong>Model:</strong> {vehicle.model}
        </p>
        <p>
          <strong>Màu sắc:</strong> {vehicle.color}
        </p>
        <p>
          <strong>Năm sản xuất:</strong> {vehicle.manufactureYear}
        </p>
        <p>
          <strong>Trạng thái:</strong> {vehicle.status}
        </p>
        {vehicle.status === "TỪ CHỐI" && (
          <p>
            <strong>Lý do từ chối:</strong>{" "}
            {vehicle.rejectionReason || "Không có lý do"}
          </p>
        )}
        <button onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
};
