import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { contractAddress, contractABI } from "./config";
import SubmitVehicleForm from "./components/SubmitVehicleForm";
import AdminVehicleTable from "./components/AdminVehicleTable"; // Import mới
import VehicleDetailModal from "./components/vehicle/VehicleDetailModal"; // Import modal chung
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
  const [selectedVehicle, setSelectedVehicle] = useState(null); // State modal cho admin

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

      // Kiểm tra network
      const network = await newProvider.getNetwork();
      console.log("🌐 Network:", network);

      if (network.chainId !== 31337) {
        alert(
          "⚠️ Vui lòng chuyển sang Hardhat Local Network (Chain ID: 31337)"
        );
        return;
      }

      // Kiểm tra contract tồn tại
      const contractCode = await newProvider.getCode(contractAddress);
      if (contractCode === "0x") {
        alert(
          "❌ Contract chưa được deploy! Vui lòng chạy: npx hardhat run scripts/deploy.js --network localhost"
        );
        return;
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        newProvider
      );

      try {
        const adminAddress = await contract.adminAddress();
        setIsAdmin(newAccount.toLowerCase() === adminAddress.toLowerCase());

        console.log("✅ Ví đã kết nối:", newAccount);
        console.log("👑 Admin:", adminAddress);
        console.log("📝 Contract:", contractAddress);
      } catch (contractError) {
        console.error("❌ Lỗi gọi contract:", contractError);
        alert(
          "❌ Không thể kết nối với Smart Contract. Kiểm tra address và ABI!"
        );
        return;
      }
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
      // Kiểm tra contract tồn tại
      const contractCode = await provider.getCode(contractAddress);
      if (contractCode === "0x") {
        console.error("❌ Contract chưa được deploy tại:", contractAddress);
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );

      const ids = await contract.getAllVehicleIds();
      console.log("🆔 Vehicle IDs:", ids);

      const details = await Promise.all(
        ids.map(async (id) => {
          const v = await contract.vehicles(id);
          return {
            id: parseInt(v.vehicleId.toString()),
            ownerName: v.ownerInfo.fullName,
            cccd: v.ownerInfo.cccd, // ← Đổi từ citizenId thành cccd            addressInfo: v.ownerInfo.addressInfo, // Thêm cho modal
            phone: v.ownerInfo.phone, // Thêm cho modal
            licensePlate: v.licensePlate,
            brand: v.brand,
            model: v.model,
            color: v.color,
            manufactureYear: parseInt(v.manufactureYear.toString()), // Đổi tên cho khớp modal
            documentIpfsHash: v.documentIpfsHash, // Đổi tên cho khớp modal (split thành 3)
            status: StatusMap[parseInt(v.status.toString())],
            walletAddress: v.walletAddress, // Thêm nếu cần
            reviewer: v.reviewer,
          };
        })
      );
      setVehicles(details);
      console.log("✅ Đã tải", details.length, "phương tiện");
    } catch (err) {
      console.error("❌ Lỗi tải danh sách phương tiện:", err);
      if (err.message.includes("CALL_EXCEPTION")) {
        console.log("🔍 Kiểm tra: Contract address, Network, ABI");
      }
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

  // 👑 Giao diện Admin (giống user: modal + bảng gọn)
  return (
    <div className="admin-container">
      <VehicleDetailModal
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
      />
      <h1>Quản Lý Hồ Sơ Phương Tiện</h1>
      <p>
        Admin: <strong>{account}</strong>
      </p>
      <AdminVehicleTable
        vehicles={vehicles}
        loading={loading}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
        reviewVehicle={reviewVehicle}
      />
    </div>
  );
}

export default App;
