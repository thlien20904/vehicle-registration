import React from "react";

const VehicleHistoryTable = ({
  userVehicles,
  loading,
  selectedVehicle,
  setSelectedVehicle,
}) => {
  return (
    <div className="history-section">
      <h2 className="history-title">📜 Lịch sử hồ sơ của bạn</h2>
      {loading ? (
        <p className="loading-text">Đang tải...</p>
      ) : userVehicles.length === 0 ? (
        <p className="loading-text">Chưa có hồ sơ nào</p>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Biển số</th>
                <th>Xe</th>
                <th>Năm</th>
                <th>Trạng thái</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {userVehicles.map((v) => (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td>{v.licensePlate}</td>
                  <td>
                    {v.brand} {v.model}
                  </td>
                  <td>{v.manufactureYear}</td>
                  <td
                    className={`status-cell status-${v.status
                      .toLowerCase()
                      .replace(/\s/g, "")}`}
                  >
                    <span className="status-badge">{v.status}</span>
                  </td>
                  <td>
                    <button
                      className="detail-btn"
                      onClick={() => setSelectedVehicle(v)}
                    >
                      👁️ Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VehicleHistoryTable;
