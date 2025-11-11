import React from "react";

const AdminVehicleTable = ({
  vehicles,
  loading,
  selectedVehicle,
  setSelectedVehicle,
  reviewVehicle,
}) => {
  return (
    <div className="admin-container">
      <h2 className="admin-title">📜 Danh sách hồ sơ ({vehicles.length})</h2>
      {loading ? (
        <p className="loading-text">Đang tải...</p>
      ) : vehicles.length === 0 ? (
        <p className="loading-text">Chưa có hồ sơ nào</p>
      ) : (
        <div className="table-container">
          <table className="license-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Chủ xe</th>
                <th>CCCD</th>
                <th>Biển số</th>
                <th>Xe</th>
                <th>Năm</th>
                <th>Trạng thái</th>
                <th>Chi tiết</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td>{v.ownerName}</td>
                  <td>{v.citizenId}</td>
                  <td>{v.licensePlate}</td>
                  <td>
                    {v.brand} {v.model}
                  </td>
                  <td>{v.year}</td>
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
                  <td>
                    {v.status === "CHỜ DUYỆT" ? (
                      <>
                        <button
                          className="btn-approve"
                          onClick={() => reviewVehicle(v.id, true)}
                        >
                          Duyệt
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => reviewVehicle(v.id, false)}
                        >
                          Từ chối
                        </button>
                      </>
                    ) : (
                      <small>
                        Đã xử lý
                      </small>
                    )}
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

export default AdminVehicleTable;