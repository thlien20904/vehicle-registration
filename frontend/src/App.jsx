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
  // Lưu các ID hồ sơ đã hiện popup cho user trong localStorage để tránh hiện lại khi reload
  const getPopupIds = () => {
    try {
      return JSON.parse(localStorage.getItem("shownPopupVehicleIds") || "[]");
    } catch {
      return [];
    }
  };
  const addPopupId = (id) => {
    const ids = getPopupIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem("shownPopupVehicleIds", JSON.stringify(ids));
    }
  };
  const [provider, setProvider] = useState(null); // Provider: Kết nối blockchain
  const [signer, setSigner] = useState(null); // Signer: Ký giao dịch
  const [account, setAccount] = useState(""); // Account: Địa chỉ ví user
  const [isAdmin, setIsAdmin] = useState(false); // isAdmin: Kiểm tra quyền admin
  const [vehicles, setVehicles] = useState([]); // vehicles: Danh sách hồ sơ xe (sorted theo ID)
  const [allVehicleIds, setAllVehicleIds] = useState([]); // allVehicleIds: Cache tất cả ID hồ sơ
  const [loading, setLoading] = useState(false); // loading: Trạng thái tải data
  const [selectedVehicle, setSelectedVehicle] = useState(null); // selectedVehicle: Hồ sơ đang xem chi tiết

  // FIX: Ref cho contract listener (tránh re-create, clean đúng)
  const contractRef = useRef(null); // contractRef: Instance contract ổn định
  const listenersRef = useRef({ submitted: null, reviewed: null }); // listenersRef: Lưu handlers để cleanup

  // connectWallet: Kết nối Metamask, check network/contract, set admin
  const connectWallet = useCallback(async () => {
    try {
      const web3Modal = new Web3Modal({ cacheProvider: true }); // web3Modal: Tool kết nối ví
      const connection = await web3Modal.connect(); // Kết nối ví
      const newProvider = new ethers.providers.Web3Provider(connection); // Tạo provider từ connection
      const newSigner = newProvider.getSigner(); // Tạo signer để ký tx
      const newAccount = await newSigner.getAddress(); // Lấy địa chỉ account

      setProvider(newProvider); // Cập nhật provider
      setSigner(newSigner); // Cập nhật signer
      setAccount(newAccount); // Cập nhật account

      const network = await newProvider.getNetwork(); // Lấy network hiện tại
      console.log("Network:", network); // Log network để debug

      if (network.chainId !== 31337) {
        // Check chain ID: Phải Hardhat local
        alert("Vui lòng chuyển sang Hardhat Local Network (Chain ID: 31337)");
        return;
      }

      const contractCode = await newProvider.getCode(contractAddress); // Check contract deploy
      if (contractCode === "0x") {
        // Nếu chưa deploy
        alert(
          "Contract chưa được deploy! Vui lòng chạy: npx hardhat run scripts/deploy.js --network localhost"
        );
        return;
      }

      // Cleanup listener cũ trước khi tạo contract mới
      if (contractRef.current) {
        // Nếu contract cũ tồn tại
        if (listenersRef.current.submitted)
          // Off event submitted cũ
          contractRef.current.off(
            "VehicleSubmitted",
            listenersRef.current.submitted
          );
        if (listenersRef.current.reviewed)
          // Off event reviewed cũ
          contractRef.current.off(
            "VehicleReviewed",
            listenersRef.current.reviewed
          );
      }
      contractRef.current = new ethers.Contract( // Tạo contract instance mới
        contractAddress,
        contractABI,
        newProvider
      );
      const adminAddress = await contractRef.current.adminAddress(); // Lấy admin từ contract
      setIsAdmin(newAccount.toLowerCase() === adminAddress.toLowerCase()); // Set quyền admin

      console.log("Ví đã kết nối:", newAccount); // Log account
      console.log("Admin:", adminAddress); // Log admin address
      console.log("Contract:", contractAddress); // Log contract address
    } catch (err) {
      console.error("Lỗi kết nối ví:", err); // Log error
      alert("Không thể kết nối ví. Kiểm tra Metamask."); // Alert user
    }
  }, []);

  // useEffect: Reset data/listeners khi account change
  useEffect(() => {
    if (account) {
      // Nếu account mới
      console.log("Reset data cho account mới:", account); // Log reset
      setVehicles([]); // Clear vehicles
      setAllVehicleIds([]); // Clear IDs
      if (contractRef.current) {
        // Nếu contract tồn tại
        if (listenersRef.current.submitted)
          // Off submitted cũ
          contractRef.current.off(
            "VehicleSubmitted",
            listenersRef.current.submitted
          );
        if (listenersRef.current.reviewed)
          // Off reviewed cũ
          contractRef.current.off(
            "VehicleReviewed",
            listenersRef.current.reviewed
          );
        listenersRef.current = { submitted: null, reviewed: null }; // Reset listeners
      }
    }
  }, [account]);

  // fetchAllVehicleIds: Lấy unique IDs từ contract
  const fetchAllVehicleIds = useCallback(async (prov) => {
    if (!prov) return; // Nếu không có provider
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, prov); // Tạo contract
      const ids = await contract.getAllVehicleIds(); // Gọi hàm lấy IDs
      const uniqueIds = [...new Set(ids.map((id) => parseInt(id.toString())))]; // Parse và unique IDs
      setAllVehicleIds(uniqueIds); // Cập nhật state IDs
      console.log("Đã cache", uniqueIds.length, "unique IDs:", uniqueIds); // Log cache
    } catch (err) {
      console.error("Lỗi fetch IDs:", err); // Log error
    }
  }, []);

  // fetchSingleVehicle: Lấy chi tiết 1 vehicle, map sang object JS
  const fetchSingleVehicle = useCallback(async (prov, vehicleId) => {
    if (!prov || !vehicleId) return null; // Nếu thiếu param
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, prov); // Tạo contract
      const v = await contract.vehicles(vehicleId); // Gọi hàm lấy vehicle struct
      return {
        // Map struct sang object JS
        id: parseInt(v.vehicleId.toString()), // Parse ID
        ownerName: v.ownerInfo.fullName, // Tên chủ xe
        cccd: v.ownerInfo.cccd, // CCCD
        addressInfo: v.ownerInfo.addressInfo, // Địa chỉ
        phone: v.ownerInfo.phone, // SĐT
        licensePlate: v.licensePlate, // Biển số
        brand: v.brand, // Hãng xe
        model: v.model, // Model
        color: v.color, // Màu
        manufactureYear: parseInt(v.manufactureYear.toString()), // Năm sản xuất
        documentIpfsHash: v.documentIpfsHash, // IPFS docs
        status: StatusMap[parseInt(v.status.toString())], // Map status
        walletAddress: v.walletAddress, // Wallet chủ
        reviewer: v.reviewer, // Người duyệt
        rejectionReason: v.rejectionReason || "", // Lý do từ chối
      };
    } catch (err) {
      console.error("Lỗi fetch vehicle:", err); // Log error
      return null;
    }
  }, []);

  // fetchVehicles: Fetch partial (chỉ IDs mới), append/sort vehicles
  const fetchVehicles = useCallback(async () => {
    if (!provider || allVehicleIds.length === 0) return;
    setLoading(true);
    try {
      const currentIds = new Set(vehicles.map((v) => v.id));
      let newIds; // Thêm: Biến để assign newIds
      if (vehicles.length === 0) {
        // Fix: Full fetch nếu state rỗng (reload/lần đầu)
        newIds = allVehicleIds; // Lấy tất IDs
      } else {
        const allKnownIds = new Set([
          ...allVehicleIds,
          ...Array.from(currentIds),
        ]);
        newIds = allVehicleIds.filter((id) => !allKnownIds.has(id)); // Partial nếu có data cũ
      }

      if (newIds.length === 0) {
        setLoading(false);
        return;
      }

      const newDetails = await Promise.all(
        newIds.map((id) => fetchSingleVehicle(provider, id))
      ).then((results) => results.filter(Boolean));

      if (newDetails.length > 0) {
        setVehicles((prev) => {
          // Fix lặp: Unique newDetails by ID (nếu contract lặp fetch)
          const uniqueNewDetails = newDetails.filter(
            (nd, idx) => newDetails.findIndex((d) => d.id === nd.id) === idx
          );
          let updated = [...prev, ...uniqueNewDetails].sort(
            (a, b) => a.id - b.id
          );
          // Fix mạnh: Unique toàn bộ updated (tránh lặp từ realtime/prev)
          const uniqueUpdated = updated.filter(
            (veh, idx) => updated.findIndex((v) => v.id === veh.id) === idx
          );
          console.log(
            "Đã thêm",
            uniqueNewDetails.length, // Log unique new
            "mới - Total unique IDs:",
            uniqueUpdated.map((v) => v.id) // Log full unique
          );
          return uniqueUpdated;
        });
      }
    } catch (err) {
      console.error("Lỗi tải danh sách:", err);
    } finally {
      setLoading(false);
    }
  }, [provider, allVehicleIds, fetchSingleVehicle]); // Bỏ vehicles khỏi dep để tránh re-run khi setVehicles (fix loop/duplicate)

  // useEffect: Fetch vehicles sau IDs
  useEffect(() => {
    if (provider && allVehicleIds.length > 0) fetchVehicles();
  }, [provider, allVehicleIds, fetchVehicles]); // Bỏ vehicles khỏi dep để tránh re-trigger khi vehicles change

  // updateSingleVehicle: Update 1 vehicle trong state, replace/append sorted
  const updateSingleVehicle = useCallback(
    async (vehicleId) => {
      if (!provider || !vehicleId) return; // Nếu thiếu param
      const updated = await fetchSingleVehicle(provider, vehicleId); // Fetch mới
      if (updated) {
        // Nếu thành công
        setVehicles((prev) => {
          // Tìm và update
          const index = prev.findIndex((v) => v.id === vehicleId);
          if (index > -1) {
            // Replace nếu tồn tại
            const newList = [...prev];
            newList[index] = updated;
            return newList;
          } else {
            // Append/sort nếu mới
            return [...prev, updated].sort((a, b) => a.id - b.id);
          }
        });
        console.log("Update vehicle #", vehicleId); // Log update
      }
    },
    [provider, fetchSingleVehicle]
  );

  // reviewVehicle: Admin review (approve/reject), input lý do nếu reject, tx + update UI
  const reviewVehicle = async (vehicleId, isApproved) => {
    if (!signer || !isAdmin) return; // Chỉ admin và có signer

    let rejectionReason = ""; // Lý do từ chối
    if (!isApproved) {
      // Nếu reject
      const { value: reason } = await Swal.fire({
        // Swal input lý do
        title: "Nhập lý do từ chối",
        input: "text",
        inputPlaceholder: "Nhập lý do...",
        showCancelButton: true,
        confirmButtonText: "Gửi",
        cancelButtonText: "Hủy",
        inputValidator: (value) =>
          !value ? "Lý do không được để trống!" : null, // Validate không rỗng
      });
      if (!reason) {
        // Nếu hủy input
        Swal.fire({
          // Alert hủy
          icon: "info",
          title: "Hủy giao dịch",
          text: "Bạn đã hủy giao dịch từ chối",
        });
        return;
      }
      rejectionReason = reason; // Lưu lý do
    }

    const newStatus = isApproved ? 1 : 2; // Set status: 1 approve, 2 reject

    Swal.fire({
      // Loading tx
      title: `${isApproved ? "Đang duyệt" : "Đang từ chối"} hồ sơ...`,
      html: "Vui lòng chờ xác nhận",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const contract = new ethers.Contract( // Tạo contract với signer
        contractAddress,
        contractABI,
        signer
      );
      const tx = await contract.reviewVehicle(
        // Gửi tx review
        vehicleId,
        newStatus,
        rejectionReason || ""
      );
      const receipt = await tx.wait(0); // Chờ confirm

      console.log("Confirmed:", receipt.transactionHash); // Log tx hash
      await updateSingleVehicle(vehicleId); // Update UI

      Swal.fire({
        // Success notify
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
      console.error("Lỗi review:", err); // Log error
      await updateSingleVehicle(vehicleId); // Update UI dù error
      // ethers v5: user rejected tx: code === ACTION_REJECTED hoặc code === 4001
      if (
        // Nếu user reject tx
        err.code === 4001 ||
        err.code === "ACTION_REJECTED" ||
        (err.message && err.message.toLowerCase().includes("user rejected"))
      ) {
        Swal.fire({
          // Info reject
          icon: "info",
          title: "Bạn đã từ chối giao dịch",
          html: `<p>Giao dịch đã bị hủy bởi bạn.</p>`,
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
        });
      } else {
        // Error khác
        let errorMsg = "Giao dịch thất bại"; // Msg mặc định
        if (err.message && err.message.includes("insufficient funds")) {
          // Insufficient funds
          errorMsg = "Số dư không đủ";
        } else if (err.message) {
          // Msg từ error
          errorMsg = err.message;
        }
        Swal.fire({
          // Error alert
          icon: "error",
          title: "Lỗi!",
          text: errorMsg,
          confirmButtonText: "Đóng",
        });
      }
    }
  };

  useEffect(() => {
    // useEffect: Tự động connect khi mount
    connectWallet();
  }, [connectWallet]);

  useEffect(() => {
    // useEffect: Fetch IDs sau connect
    if (provider) fetchAllVehicleIds(provider);
  }, [provider, fetchAllVehicleIds]);

  useEffect(() => {
    // useEffect: Fetch vehicles sau IDs
    if (provider && allVehicleIds.length > 0) fetchVehicles();
  }, [provider, allVehicleIds, fetchVehicles]);

  // – REALTIME 2 CHIỀU SIÊU MƯỢT
  useEffect(() => {
    // useEffect: Setup listeners realtime (submitted/reviewed)
    if (!contractRef.current || !account) return; // Nếu thiếu contract/account

    const handleVehicleSubmitted = async (vehicleId, owner, fee) => {
      // Handler: Event submitted từ contract
      const idNum = parseInt(vehicleId.toString()); // Parse ID

      // Cập nhật ID ngay lập tức
      setAllVehicleIds((prev) => [...new Set([...prev, idNum])]); // Cache ID mới

      // Admin: thêm xe mới ngay (optimistic)
      if (isAdmin) {
        // Nếu admin
        const newVehicle = await fetchSingleVehicle(provider, idNum); // Fetch details
        if (newVehicle) {
          // Nếu có data
          setVehicles((prev) => {
            // Thêm vào list (không duplicate, sort)
            if (prev.some((v) => v.id === idNum)) return prev;
            return [...prev, newVehicle].sort((a, b) => a.id - b.id);
          });
          Swal.fire({
            // Notify admin hồ sơ mới
            icon: "success",
            title: "Hồ sơ mới!",
            text: `Xe #${idNum} vừa được đăng ký`,
            timer: 2500,
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

      // Chỉ hiện popup cho user, không hiện cho admin
      if (!isAdmin) {
        const vehicle =
          vehicles.find((v) => v.id === idNum) ||
          (await fetchSingleVehicle(provider, idNum));
        // Kiểm tra nếu đã hiện popup cho ID này trong localStorage thì không hiện lại
        const shownIds = getPopupIds();
        if (
          vehicle?.walletAddress.toLowerCase() === account.toLowerCase() &&
          !shownIds.includes(idNum)
        ) {
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
            timer: 2500,
            showConfirmButton: true,
          });
          addPopupId(idNum); // Đánh dấu đã hiện popup cho ID này
        }
      }
      // Admin: không hiện popup khi nhận event VehicleReviewed
    };

    // Cleanup cũ
    if (listenersRef.current.submitted) {
      // Off submitted cũ
      contractRef.current.off(
        "VehicleSubmitted",
        listenersRef.current.submitted
      );
    }
    if (listenersRef.current.reviewed) {
      // Off reviewed cũ
      contractRef.current.off("VehicleReviewed", listenersRef.current.reviewed);
    }

    // Gắn listener mới
    listenersRef.current.submitted = handleVehicleSubmitted; // Lưu handler submitted
    listenersRef.current.reviewed = handleVehicleReviewed; // Lưu handler reviewed

    contractRef.current.on("VehicleSubmitted", handleVehicleSubmitted); // On event submitted
    contractRef.current.on("VehicleReviewed", handleVehicleReviewed); // On event reviewed

    return () => {
      // Cleanup khi unmount/re-setup
      if (contractRef.current) {
        contractRef.current.off("VehicleSubmitted", handleVehicleSubmitted);
        contractRef.current.off("VehicleReviewed", handleVehicleReviewed);
      }
    };
  }, [
    account, // Re-setup nếu account change
    isAdmin, // Re-setup nếu admin change
    provider, // Re-setup nếu provider change
    fetchSingleVehicle, // Re-setup nếu fetch change
    updateSingleVehicle, // Re-setup nếu update change
    vehicles, // Re-setup nếu vehicles change
  ]);

  // Render: Conditional UI (connect/user/admin), pass props
  if (!account) {
    // Chưa connect: Hiển thị button connect
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
    // User mode: Hiển thị form submit
    return (
      <div className="container user-section">
        <h1>Cổng Đăng Ký Phương Tiện</h1>
        <p>
          Tài khoản: <strong>{account}</strong> (Người dùng)
        </p>
        <SubmitVehicleForm // Component form, pass props
          signer={signer}
          account={account}
          provider={provider}
          onSubmission={async (newVehicleId) => {
            // Callback sau submit: Cache ID + refetch
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
    // Admin mode: Hiển thị table + modal
    <div className="admin-container">
      <VehicleDetailModal // Modal chi tiết vehicle
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)} // Đóng modal
      />
      <h1>Quản Lý Hồ Sơ Phương Tiện</h1>
      <p>
        Admin: <strong>{account}</strong>
      </p>
      {vehicles.length === 0 ? ( // Không data: Message rỗng
        <div
          className="no-data"
          style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}
        >
          Chưa có hồ sơ nào để duyệt
        </div>
      ) : loading ? ( // Loading: Spinner
        <div
          className="loading"
          style={{ textAlign: "center", padding: "20px" }}
        >
          Đang tải...
        </div>
      ) : (
        // Có data: Render table
        <AdminVehicleTable // Component table, pass props
          vehicles={vehicles}
          loading={loading}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          reviewVehicle={reviewVehicle} // Pass hàm review
        />
      )}
    </div>
  );
}

export default App;
