import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import Swal from "sweetalert2";
import { contractAddress, contractABI } from "./config";
import SubmitVehicleForm from "./components/SubmitVehicleForm";
import AdminVehicleTable from "./components/AdminVehicleTable";
import VehicleDetailModal from "./components/vehicle/VehicleDetailModal";
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
  const [vehicles, setVehicles] = useState([]); // Giữ sorted
  const [allVehicleIds, setAllVehicleIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // FIX: Ref cho contract listener (tránh re-create, clean đúng)
  const contractRef = useRef(null);
  const listenersRef = useRef({ submitted: null, reviewed: null });

  // Kết nối ví Metamask – giữ nguyên 100%
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

      const network = await newProvider.getNetwork();
      console.log("Network:", network);

      if (network.chainId !== 31337) {
        alert("Vui lòng chuyển sang Hardhat Local Network (Chain ID: 31337)");
        return;
      }

      const contractCode = await newProvider.getCode(contractAddress);
      if (contractCode === "0x") {
        alert(
          "Contract chưa được deploy! Vui lòng chạy: npx hardhat run scripts/deploy.js --network localhost"
        );
        return;
      }

      // Cleanup listener cũ trước khi tạo contract mới
      if (contractRef.current) {
        if (listenersRef.current.submitted)
          contractRef.current.off(
            "VehicleSubmitted",
            listenersRef.current.submitted
          );
        if (listenersRef.current.reviewed)
          contractRef.current.off(
            "VehicleReviewed",
            listenersRef.current.reviewed
          );
      }
      contractRef.current = new ethers.Contract(
        contractAddress,
        contractABI,
        newProvider
      );
      const adminAddress = await contractRef.current.adminAddress();
      setIsAdmin(newAccount.toLowerCase() === adminAddress.toLowerCase());

      console.log("Ví đã kết nối:", newAccount);
      console.log("Admin:", adminAddress);
      console.log("Contract:", contractAddress);
    } catch (err) {
      console.error("Lỗi kết nối ví:", err);
      alert("Không thể kết nối ví. Kiểm tra Metamask.");
    }
  }, []);

  // Reset data + clean listener khi account thay – giữ nguyên
  useEffect(() => {
    if (account) {
      console.log("Reset data cho account mới:", account);
      setVehicles([]);
      setAllVehicleIds([]);
      if (contractRef.current) {
        if (listenersRef.current.submitted)
          contractRef.current.off(
            "VehicleSubmitted",
            listenersRef.current.submitted
          );
        if (listenersRef.current.reviewed)
          contractRef.current.off(
            "VehicleReviewed",
            listenersRef.current.reviewed
          );
        listenersRef.current = { submitted: null, reviewed: null };
      }
    }
  }, [account]);

  // Fetch IDs unique – giữ nguyên
  const fetchAllVehicleIds = useCallback(async (prov) => {
    if (!prov) return;
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, prov);
      const ids = await contract.getAllVehicleIds();
      const uniqueIds = [...new Set(ids.map((id) => parseInt(id.toString())))];
      setAllVehicleIds(uniqueIds);
      console.log("Đã cache", uniqueIds.length, "unique IDs:", uniqueIds);
    } catch (err) {
      console.error("Lỗi fetch IDs:", err);
    }
  }, []);

  // Fetch 1 vehicle – giữ nguyên
  const fetchSingleVehicle = useCallback(async (prov, vehicleId) => {
    if (!prov || !vehicleId) return null;
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, prov);
      const v = await contract.vehicles(vehicleId);
      return {
        id: parseInt(v.vehicleId.toString()),
        ownerName: v.ownerInfo.fullName,
        cccd: v.ownerInfo.cccd,
        addressInfo: v.ownerInfo.addressInfo,
        phone: v.ownerInfo.phone,
        licensePlate: v.licensePlate,
        brand: v.brand,
        model: v.model,
        color: v.color,
        manufactureYear: parseInt(v.manufactureYear.toString()),
        documentIpfsHash: v.documentIpfsHash,
        status: StatusMap[parseInt(v.status.toString())],
        walletAddress: v.walletAddress,
        reviewer: v.reviewer,
        rejectionReason: v.rejectionReason || "",
      };
    } catch (err) {
      console.error("Lỗi fetch vehicle:", err);
      return null;
    }
  }, []);

  // Fetch vehicles partial – giữ nguyên
  const fetchVehicles = useCallback(async () => {
    if (!provider || allVehicleIds.length === 0) return;
    setLoading(true);
    try {
      const currentIds = new Set(vehicles.map((v) => v.id));
      const allKnownIds = new Set([
        ...allVehicleIds,
        ...Array.from(currentIds),
      ]);
      const newIds = allVehicleIds.filter((id) => !allKnownIds.has(id));

      if (newIds.length === 0) {
        setLoading(false);
        return;
      }

      const newDetails = await Promise.all(
        newIds.map((id) => fetchSingleVehicle(provider, id))
      ).then((results) => results.filter(Boolean));

      if (newDetails.length > 0) {
        setVehicles((prev) => {
          const updated = [...prev, ...newDetails].sort((a, b) => a.id - b.id);
          console.log(
            "Đã thêm",
            newDetails.length,
            "mới - Total IDs:",
            updated.map((v) => v.id)
          );
          return updated;
        });
      }
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
    } finally {
      setLoading(false);
    }
  }, [provider, allVehicleIds, vehicles, fetchSingleVehicle]);

  // Update 1 vehicle – giữ nguyên
  const updateSingleVehicle = useCallback(
    async (vehicleId) => {
      if (!provider || !vehicleId) return;
      const updated = await fetchSingleVehicle(provider, vehicleId);
      if (updated) {
        setVehicles((prev) => {
          const index = prev.findIndex((v) => v.id === vehicleId);
          if (index > -1) {
            const newList = [...prev];
            newList[index] = updated;
            return newList;
          } else {
            return [...prev, updated].sort((a, b) => a.id - b.id);
          }
        });
        console.log("Update vehicle #", vehicleId);
      }
    },
    [provider, fetchSingleVehicle]
  );

  // Review vehicle – giữ nguyên 100%
  const reviewVehicle = async (vehicleId, isApproved) => {
    if (!signer || !isAdmin) return;

    let rejectionReason = "";
    if (!isApproved) {
      const { value: reason } = await Swal.fire({
        title: "Nhập lý do từ chối",
        input: "text",
        inputPlaceholder: "Nhập lý do...",
        showCancelButton: true,
        confirmButtonText: "Gửi",
        cancelButtonText: "Hủy",
        inputValidator: (value) =>
          !value ? "Lý do không được để trống!" : null,
      });
      if (!reason) {
        Swal.fire({
          icon: "info",
          title: "Hủy giao dịch",
          text: "Bạn đã hủy giao dịch từ chối",
        });
        return;
      }
      rejectionReason = reason;
    }

    const newStatus = isApproved ? 1 : 2;

    Swal.fire({
      title: `${isApproved ? "Đang duyệt" : "Đang từ chối"} hồ sơ...`,
      html: "Vui lòng chờ xác nhận",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      const tx = await contract.reviewVehicle(
        vehicleId,
        newStatus,
        rejectionReason || ""
      );
      const receipt = await tx.wait(0);

      console.log("Confirmed:", receipt.transactionHash);
      await updateSingleVehicle(vehicleId);

      Swal.fire({
        icon: "success",
        title: isApproved ? "Đã duyệt hồ sơ" : "Đã từ chối hồ sơ",
        html: `<p><strong>Hồ sơ xe #${vehicleId}</strong></p>${
          isApproved
            ? "<p>Đã được phê duyệt</p>"
            : `<p>Đã bị từ chối<br/>Lý do: ${rejectionReason}</p>`
        }`,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error("Lỗi review:", err);
      await updateSingleVehicle(vehicleId);
      // ethers v5: user rejected tx: code === ACTION_REJECTED hoặc code === 4001
      if (
        err.code === 4001 ||
        err.code === "ACTION_REJECTED" ||
        (err.message && err.message.toLowerCase().includes("user rejected"))
      ) {
        Swal.fire({
          icon: "info",
          title: "Bạn đã từ chối giao dịch",
          html: `<p>Giao dịch đã bị hủy bởi bạn.</p>`,
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
        });
      } else {
        let errorMsg = "Giao dịch thất bại";
        if (err.message && err.message.includes("insufficient funds")) {
          errorMsg = "Số dư không đủ";
        } else if (err.message) {
          errorMsg = err.message;
        }
        Swal.fire({
          icon: "error",
          title: "Lỗi!",
          text: errorMsg,
          confirmButtonText: "Đóng",
        });
      }
    }
  };

  useEffect(() => {
    connectWallet();
  }, [connectWallet]);

  useEffect(() => {
    if (provider) fetchAllVehicleIds(provider);
  }, [provider, fetchAllVehicleIds]);

  useEffect(() => {
    if (provider && allVehicleIds.length > 0) fetchVehicles();
  }, [provider, allVehicleIds, fetchVehicles]);

  // CHỈ SỬA ĐOẠN NÀY THÔI – REALTIME 2 CHIỀU SIÊU MƯỢT
  useEffect(() => {
    if (!contractRef.current || !account) return;

    const handleVehicleSubmitted = async (vehicleId, owner, fee) => {
      const idNum = parseInt(vehicleId.toString());

      // Cập nhật ID ngay lập tức
      setAllVehicleIds((prev) => [...new Set([...prev, idNum])]);

      // Admin: thêm xe mới ngay (optimistic)
      if (isAdmin) {
        const newVehicle = await fetchSingleVehicle(provider, idNum);
        if (newVehicle) {
          setVehicles((prev) => {
            if (prev.some((v) => v.id === idNum)) return prev;
            return [...prev, newVehicle].sort((a, b) => a.id - b.id);
          });
          Swal.fire({
            icon: "success",
            title: "Hồ sơ mới!",
            text: `Xe #${idNum} vừa được đăng ký`,
            timer: 2000,
            showConfirmButton: false,
          });
        }
      }
    };

    const handleVehicleReviewed = async (
      vehicleId,
      status,
      reviewer,
      rejectionReason
    ) => {
      const idNum = parseInt(vehicleId.toString());
      await updateSingleVehicle(idNum);

      // USER: nhận thông báo nếu là xe của mình
      if (!isAdmin) {
        const vehicle =
          vehicles.find((v) => v.id === idNum) ||
          (await fetchSingleVehicle(provider, idNum));
        if (vehicle?.walletAddress.toLowerCase() === account.toLowerCase()) {
          const approved = parseInt(status.toString()) === 1;
          Swal.fire({
            icon: approved ? "success" : "warning",
            title: approved ? "ĐÃ ĐƯỢC DUYỆT!" : "BỊ TỪ CHỐI!",
            html: `<strong>Hồ sơ #${idNum}</strong><br/>${
              !approved
                ? `<small><strong>Lý do:</strong> ${
                    rejectionReason || "Không có"
                  }</small>`
                : ""
            }`,
            timer: 5000,
            showConfirmButton: true,
          });
        }
      }
    };

    // Cleanup cũ
    if (listenersRef.current.submitted) {
      contractRef.current.off(
        "VehicleSubmitted",
        listenersRef.current.submitted
      );
    }
    if (listenersRef.current.reviewed) {
      contractRef.current.off("VehicleReviewed", listenersRef.current.reviewed);
    }

    // Gắn listener mới
    listenersRef.current.submitted = handleVehicleSubmitted;
    listenersRef.current.reviewed = handleVehicleReviewed;

    contractRef.current.on("VehicleSubmitted", handleVehicleSubmitted);
    contractRef.current.on("VehicleReviewed", handleVehicleReviewed);

    return () => {
      if (contractRef.current) {
        contractRef.current.off("VehicleSubmitted", handleVehicleSubmitted);
        contractRef.current.off("VehicleReviewed", handleVehicleReviewed);
      }
    };
  }, [
    account,
    isAdmin,
    provider,
    fetchSingleVehicle,
    updateSingleVehicle,
    vehicles,
  ]);

  // Render – giữ nguyên 100%
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
          provider={provider}
          onSubmission={async (newVehicleId) => {
            if (newVehicleId && !allVehicleIds.includes(newVehicleId)) {
              setAllVehicleIds((prev) => [...new Set([...prev, newVehicleId])]);
              console.log("User submit: Đã cache ID #", newVehicleId);
              fetchVehicles();
            }
          }}
        />
      </div>
    );
  }

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
      {vehicles.length === 0 ? (
        <div
          className="no-data"
          style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}
        >
          Chưa có hồ sơ nào để duyệt
        </div>
      ) : loading ? (
        <div
          className="loading"
          style={{ textAlign: "center", padding: "20px" }}
        >
          Đang tải...
        </div>
      ) : (
        <AdminVehicleTable
          vehicles={vehicles}
          loading={loading}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          reviewVehicle={reviewVehicle}
        />
      )}
    </div>
  );
}

export default App;
