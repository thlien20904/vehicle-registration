import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { contractAddress, contractABI } from "./config";
import SubmitVehicleForm from "./components/SubmitVehicleForm";
import "./App.css";

const StatusMap = {
  0: "CHỜ DUYỆT",
  1: "ĐÃ DUYỆT",
  2: "TỪ CHỐI",
};

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🌐 Kết nối ví Metamask
  const connectWallet = useCallback(async () => {
    try {
      const web3Modal = new Web3Modal({ cacheProvider: true });
      const connection = await web3Modal.connect();
      const newProvider = new ethers.providers.Web3Provider(connection);
      const newSigner = newProvider.getSigner();
      const newAccount = await newSigner.getAddress();

      setProvider(newProvider);
      setSigner(newSigner);
      setAccount(newAccount);

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        newProvider
      );
      const adminAddress = await contract.adminAddress();
      setIsAdmin(newAccount.toLowerCase() === adminAddress.toLowerCase());

      console.log("✅ Ví đã kết nối:", newAccount);
      console.log("👑 Admin:", adminAddress);
    } catch (err) {
      console.error("❌ Lỗi kết nối ví:", err);
      alert("Không thể kết nối ví. Kiểm tra Metamask.");
    }
  }, []);

  // 📄 Lấy danh sách phương tiện
  const fetchVehicles = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );
      const ids = await contract.getAllVehicleIds();
      const details = await Promise.all(
        ids.map(async (id) => {
          const v = await contract.vehicles(id);
          return {
            id: parseInt(v.vehicleId.toString()),
            ownerName: v.ownerInfo.fullName,
            citizenId: v.ownerInfo.cccd,
            address: v.ownerInfo.addressInfo,
            phone: v.ownerInfo.phone,
            licensePlate: v.licensePlate,
            brand: v.brand,
            model: v.model,
            color: v.color,
            year: parseInt(v.manufactureYear.toString()),
            ipfsHash: v.documentIpfsHash,
            status: StatusMap[parseInt(v.status.toString())],
            owner: v.walletAddress,
            reviewer: v.reviewer,
          };
        })
      );
      setVehicles(details);
    } catch (err) {
      console.error("❌ Lỗi tải danh sách phương tiện:", err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  // ✅ Admin duyệt / từ chối hồ sơ
  const reviewVehicle = async (vehicleId, isApproved) => {
    if (!signer || !isAdmin) return;
    const newStatus = isApproved ? 1 : 2;
    try {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      const tx = await contract.reviewVehicle(vehicleId, newStatus);
      await tx.wait();
      alert(
        `✅ Hồ sơ xe #${vehicleId} đã được ${isApproved ? "DUYỆT" : "TỪ CHỐI"}`
      );
      await fetchVehicles();
    } catch (err) {
      console.error("❌ Lỗi duyệt hồ sơ:", err);
      alert("Giao dịch thất bại. Kiểm tra quyền Admin hoặc mạng.");
    }
  };

  useEffect(() => {
    connectWallet();
  }, [connectWallet]);
  useEffect(() => {
    if (provider) fetchVehicles();
  }, [provider, fetchVehicles]);

  // 🚀 Nếu chưa kết nối ví
  if (!account) {
    return (
      <div className="container connect-section">
        <h1 className="main-title">Hệ Thống Đăng Ký Phương Tiện</h1>
        <button className="connect-btn" onClick={connectWallet}>
          Kết nối Metamask
        </button>
      </div>
    );
  }

  // 🧍 Giao diện người dùng
  if (!isAdmin) {
    return (
      <div className="container user-section">
        <h1>Cổng Đăng Ký Phương Tiện</h1>
        <p>
          Tài khoản: <strong>{account}</strong> (Người dùng)
        </p>
        <SubmitVehicleForm
          signer={signer}
          account={account}
          onSubmission={fetchVehicles}
          provider={provider}
        />
      </div>
    );
  }

  // 👑 Giao diện Admin
  return (
    <div className="admin-container">
      <h1>Quản Lý Hồ Sơ Phương Tiện</h1>
      <p>
        Admin: <strong>{account}</strong>
      </p>
      <h2>Danh Sách Hồ Sơ ({vehicles.length})</h2>
      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <table className="license-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Chủ xe</th>
              <th>CCCD</th>
              <th>Biển số</th>
              <th>Xe</th>
              <th>Màu</th>
              <th>Năm</th>
              <th>Trạng thái</th>
              <th>Tài liệu</th>
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
                <td>{v.color}</td>
                <td>{v.year}</td>
                <td
                  style={{
                    color:
                      v.status === "ĐÃ DUYỆT"
                        ? "green"
                        : v.status === "TỪ CHỐI"
                        ? "red"
                        : "orange",
                    fontWeight: "bold",
                  }}
                >
                  {v.status}
                </td>
                <td>
                  <a
                    href={`https://ipfs.io/ipfs/${v.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Xem
                  </a>
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
                      {v.reviewer !== ethers.constants.AddressZero
                        ? v.reviewer.substring(0, 8) + "..."
                        : "N/A"}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
