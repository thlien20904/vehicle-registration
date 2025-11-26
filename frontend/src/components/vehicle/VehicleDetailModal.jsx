import React from "react";

const StatusMap = {
  0: "CHỜ DUYỆT",
  1: "ĐÃ DUYỆT",
  2: "TỪ CHỐI",
};

const VehicleDetailModal = ({ vehicle, onClose }) => {
  if (!vehicle) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} className="close-btn">
          &times;
        </button>
        <h3 className="modal-title">Chi tiết hồ sơ #{vehicle.id}</h3>

        <div className="modal-section">
          <h4>👤 Thông tin chủ sở hữu</h4>
          <p>
            <strong>Họ tên:</strong> {vehicle.ownerName}
          </p>
          <p>
            <strong>CCCD:</strong> {vehicle.cccd}
          </p>
          <p>
            <strong>Địa chỉ:</strong> {vehicle.addressInfo}
          </p>
          <p>
            <strong>SĐT:</strong> {vehicle.phone}
          </p>
        </div>

        <div className="modal-divider" />

        <div className="modal-section">
          <h4>🚗 Thông tin phương tiện</h4>
          <p>
            <strong>Biển số:</strong> {vehicle.licensePlate}
          </p>
          <p>
            <strong>Hãng xe:</strong> {vehicle.brand}
          </p>
          <p>
            <strong>Dòng xe:</strong> {vehicle.model}
          </p>
          <p>
            <strong>Màu sắc:</strong> {vehicle.color}
          </p>
          <p>
            <strong>Năm sản xuất:</strong> {vehicle.manufactureYear}
          </p>
          <p>
            <strong>Trạng thái:</strong>{" "}
            <span
              className={`status-label ${
                vehicle.status === "ĐÃ DUYỆT"
                  ? "approved"
                  : vehicle.status === "TỪ CHỐI"
                  ? "rejected"
                  : "pending"
              }`}
            >
              {vehicle.status}
            </span>
          </p>
          {vehicle.status === "TỪ CHỐI" && vehicle.rejectionReason && (
            <p>
              <strong>Lý do từ chối:</strong>{" "}
              <span style={{ color: "#d32f2f" }}>
                {vehicle.rejectionReason}
              </span>
            </p>
          )}
        </div>

        <div className="modal-divider" />

        <div className="modal-section">
          <h4>📎 Tài liệu đính kèm</h4>
          {vehicle.documentIpfsHash ? (
            (() => {
              const [front, back, invoice] =
                vehicle.documentIpfsHash.split(",");
              return (
                <div className="document-list">
                  {front && (
                    <a
                      href={`https://ipfs.io/ipfs/${front}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ipfs-link"
                    >
                      🪪 CCCD Mặt trước
                    </a>
                  )}
                  {back && (
                    <a
                      href={`https://ipfs.io/ipfs/${back}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ipfs-link"
                    >
                      🪪 CCCD Mặt sau
                    </a>
                  )}
                  {invoice && (
                    <a
                      href={`https://ipfs.io/ipfs/${invoice}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ipfs-link"
                    >
                      📄 Hóa đơn mua bán
                    </a>
                  )}
                </div>
              );
            })()
          ) : (
            <p>Không có tài liệu</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailModal;
