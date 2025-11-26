import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import Swal from "sweetalert2";
import { ipfsClient } from "../ipfsClient";
import { contractAddress, contractABI } from "../config";
import "./SubmitVehicleForm.css";

import VehicleDetailModal from "./vehicle/VehicleDetailModal.jsx";
import VehicleForm from "./vehicle/VehicleForm.jsx";
import VehicleHistoryTable from "./vehicle/VehicleHistoryTable.jsx";

// StatusMap: Map status uint sang text VN
const StatusMap = {
  0: "CHỜ DUYỆT",
  1: "ĐÃ DUYỆT",
  2: "TỪ CHỐI",
};

const SubmitVehicleForm = ({ signer, account, provider, onSubmission }) => { // Component: Form submit hồ sơ xe cho user
  // State: Quản lý form, files, errors, history xe user, loading
  const [form, setForm] = useState({
    ownerName: "",
    cccd: "",
    addressInfo: "",
    phone: "",
    plateNumber: "",
    vehicleBrand: "",
    model: "",
    color: "",
    manufactureYear: "",
  });

  const [cccdFront, setCccdFront] = useState(null); // File CCCD mặt trước
  const [cccdBack, setCccdBack] = useState(null); // File CCCD mặt sau
  const [invoiceFile, setInvoiceFile] = useState(null); // File hóa đơn

  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái submit
  const [errors, setErrors] = useState({}); // Lỗi validate
  const [userVehicles, setUserVehicles] = useState([]); // Danh sách xe user
  const [userVehicleIds, setUserVehicleIds] = useState([]); // Cache IDs của user
  const [loading, setLoading] = useState(true); // Loading history
  const [selectedVehicle, setSelectedVehicle] = useState(null); // Vehicle chi tiết

  // years: Array năm sản xuất từ 1980 đến 2025
  const years = Array.from({ length: 46 }, (_, i) => 1980 + i);

  // FIX: Dùng ref để giữ contract + listener ổn định
  const contractRef = useRef(null); // Ref: Contract instance ổn định
  const listenersRef = useRef({ reviewed: null }); // Ref: Listeners để cleanup

  // getReadProvider: Fallback provider từ props hoặc signer/ethereum
  const getReadProvider = () =>
    provider ||
    (signer
      ? signer.provider
      : window.ethereum
      ? new ethers.providers.Web3Provider(window.ethereum)
      : null);

  // getContract: Tạo contract một lần, dùng ref để ổn định
  const getContract = useCallback(() => {
    const readProvider = getReadProvider(); // Lấy provider
    if (!readProvider) return null; // Nếu không có
    if (!contractRef.current) { // Nếu chưa tạo
      contractRef.current = new ethers.Contract( // Tạo contract
        contractAddress,
        contractABI,
        readProvider
      );
    }
    return contractRef.current; // Trả contract
  }, [provider, signer]);

  // fillSampleData: Điền dữ liệu mẫu vào form
  const fillSampleData = () => {
    setForm({ // Set form mẫu
      ownerName: "Nguyễn Văn A",
      cccd: "079201234567",
      addressInfo: "123 Đường ABC, Quận 1, TP.HCM",
      phone: "0321234567",
      plateNumber: "29A1-12345",
      vehicleBrand: "Honda",
      model: "Vision 2024",
      color: "Đỏ",
      manufactureYear: "2024",
    });
    setErrors({}); // Clear errors
    alert("Đã điền thông tin mẫu! Bạn có thể chỉnh sửa các trường nếu cần."); // Alert user
  };

  // fetchUserVehicles: Fetch history xe của user từ contract
  const fetchUserVehicles = useCallback(async () => {
    const readProvider = getReadProvider(); // Lấy provider
    if (!readProvider || !account) return; // Nếu thiếu
    setLoading(true); // Bắt đầu loading
    try {
      const contractCode = await readProvider.getCode(contractAddress); // Check deploy
      if (contractCode === "0x") { // Nếu chưa deploy
        console.error("Contract chưa được deploy tại:", contractAddress);
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract( // Tạo contract
        contractAddress,
        contractABI,
        readProvider
      );
      const allIds = await contract.getAllVehicleIds(); // Lấy tất IDs
      const ids = allIds.map((id) => parseInt(id.toString())); // Parse IDs

      const allVehicles = await Promise.all( // Parallel fetch all vehicles
        ids.map((id) => contract.vehicles(id))
      );
      const userIds = ids.filter((id, index) => { // Filter IDs của user
        const v = allVehicles[index];
        return v.walletAddress.toLowerCase() === account.toLowerCase();
      });
      setUserVehicleIds(userIds); // Set IDs user
      console.log("User IDs:", userIds); // Log IDs

      const userData = userIds.map((id) => { // Map data user vehicles
        const index = ids.indexOf(id);
        const v = allVehicles[index];
        return {
          id: parseInt(v.vehicleId.toString()), // ID
          brand: v.brand, // Hãng
          model: v.model, // Model
          color: v.color, // Màu
          manufactureYear: v.manufactureYear.toString(), // Năm
          licensePlate: v.licensePlate, // Biển số
          documentIpfsHash: v.documentIpfsHash, // IPFS
          status: StatusMap[parseInt(v.status.toString())] || "KHÔNG XÁC ĐỊNH", // Status
          walletAddress: v.walletAddress, // Wallet
          ownerName: v.ownerInfo?.fullName || "", // Tên
          cccd: v.ownerInfo?.cccd || "", // CCCD
          addressInfo: v.ownerInfo?.addressInfo || "", // Địa chỉ
          phone: v.ownerInfo?.phone || "", // SĐT
          rejectionReason: v.rejectionReason || "", // Lý do
        };
      });
      setUserVehicles(userData); // Set data
      console.log("Đã tải", userData.length, "xe của user (partial)"); // Log tải
    } catch (err) {
      console.error("Lỗi tải danh sách xe:", err); // Log error
    } finally {
      setLoading(false); // Kết thúc loading
    }
  }, [provider, signer, account]);

  // updateSingleUserVehicle: Update 1 xe user trong state
  const updateSingleUserVehicle = useCallback(
    async (vehicleId) => {
      const contract = getContract(); // Lấy contract
      if (!contract || !vehicleId) return; // Nếu thiếu
      try {
        const v = await contract.vehicles(vehicleId); // Fetch vehicle
        const updated = { // Map sang object
          id: parseInt(v.vehicleId.toString()),
          brand: v.brand,
          model: v.model,
          color: v.color,
          manufactureYear: v.manufactureYear.toString(),
          licensePlate: v.licensePlate,
          documentIpfsHash: v.documentIpfsHash,
          status: StatusMap[parseInt(v.status.toString())] || "KHÔNG XÁC ĐỊNH",
          walletAddress: v.walletAddress,
          ownerName: v.ownerInfo?.fullName || "",
          cccd: v.ownerInfo?.cccd || "",
          addressInfo: v.ownerInfo?.addressInfo || "",
          phone: v.ownerInfo?.phone || "",
          rejectionReason: v.rejectionReason || "",
        };
        setUserVehicles((prev) => { // Update state
          const exists = prev.some((u) => u.id === vehicleId); // Check tồn tại
          if (exists) { // Replace nếu có
            return prev.map((u) => (u.id === vehicleId ? updated : u));
          } else { // Append sort nếu mới
            return [...prev, updated].sort((a, b) => a.id - b.id);
          }
        });
        if (!userVehicleIds.includes(vehicleId)) { // Cache ID nếu mới
          setUserVehicleIds((prev) => [...new Set([...prev, vehicleId])]);
        }
        console.log("Đã update user vehicle #", vehicleId); // Log update
      } catch (err) {
        console.error("Lỗi update user vehicle:", err); // Log error
      }
    },
    [getContract, userVehicleIds]
  );

  // useEffect: Fetch history khi connect/account change
  useEffect(() => {
    if ((provider || signer) && account) fetchUserVehicles(); // Gọi fetch nếu ready
  }, [provider, signer, account, fetchUserVehicles]);

  // useEffect: Listener realtime reviewed
  useEffect(() => {
    const contract = getContract(); // Lấy contract
    if (!contract || !account) return; // Nếu thiếu

    const handleVehicleReviewed = async ( // Handler: Event reviewed
      vehicleId,
      newStatus,
      reviewer,
      rejectionReason
    ) => {
      const idNum = parseInt(vehicleId.toString()); // Parse ID

      // Cập nhật data trước
      await updateSingleUserVehicle(idNum); // Update UI

      // Nếu không phải xe của user → bỏ qua
      if (!userVehicleIds.includes(idNum)) return; // Skip nếu không phải

      const approved = parseInt(newStatus.toString()) === 1; // Check approve
      Swal.fire({ // Notify status
        icon: approved ? "success" : "warning",
        title: approved ? "Hồ sơ đã được duyệt!" : "Hồ sơ bị từ chối",
        html: approved // HTML chi tiết
          ? `<p>Hồ sơ xe #${idNum} đã được phê duyệt!</p>`
          : `<p>Hồ sơ xe #${idNum} đã bị từ chối</p>${
              rejectionReason
                ? `<p><strong>Lý do:</strong> ${rejectionReason}</p>`
                : ""
            }<p>Biển số đã được giải phóng, bạn có thể đăng ký lại</p>`,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });
    };

    // Cleanup listener cũ
    if (listenersRef.current.reviewed) { // Off cũ
      contract.off("VehicleReviewed", listenersRef.current.reviewed);
    }

    listenersRef.current.reviewed = handleVehicleReviewed; // Lưu handler mới
    contract.on("VehicleReviewed", handleVehicleReviewed); // On event

    return () => { // Cleanup unmount
      if (contract && listenersRef.current.reviewed) {
        contract.off("VehicleReviewed", listenersRef.current.reviewed);
      }
    };
  }, [account, userVehicleIds, updateSingleUserVehicle, getContract]);

  // handleSubmit: Submit form, validate, upload IPFS, tx register
  const handleSubmit = async (e) => {
    e.preventDefault(); // Ngăn default form
    if (!validate()) return; // Validate trước
    setIsSubmitting(true); // Bắt đầu submit
    try {
      const normalizedPlate = form.plateNumber.trim().toUpperCase(); // Normalize biển số
      const contractRead = getContract(); // Lấy contract read
      if (await contractRead.isLicensePlateUsed(normalizedPlate)) { // Check biển số dùng
        alert("Biển số đã được đăng ký");
        setIsSubmitting(false);
        return;
      }

      const frontHash = await uploadToIPFS(cccdFront); // Upload CCCD front
      const backHash = await uploadToIPFS(cccdBack); // Upload CCCD back
      const invoiceHash = await uploadToIPFS(invoiceFile); // Upload invoice
      const docCombined = `${frontHash},${backHash},${invoiceHash}`; // Combine hashes

      const contract = new ethers.Contract( // Tạo contract signer
        contractAddress,
        contractABI,
        signer
      );
      const ownerStruct = { // Struct owner info
        fullName: form.ownerName,
        cccd: form.cccd,
        addressInfo: form.addressInfo,
        phone: form.phone,
      };

      Swal.fire({ // Loading tx
        title: "Đang gửi giao dịch...",
        html: "Vui lòng chờ giao dịch được xác nhận",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      console.log("Đang gửi giao dịch đăng ký xe..."); // Log gửi
      const tx = await contract.registerVehicle( // Tx register
        ownerStruct,
        form.vehicleBrand,
        form.model,
        form.color,
        normalizedPlate,
        parseInt(form.manufactureYear),
        docCombined,
        "",
        { value: ethers.utils.parseEther("0.01") } // Phí 0.01 ETH
      );

      console.log("Đang chờ transaction confirm..."); // Log wait
      const receipt = await tx.wait(0); // Chờ confirm

      console.log("Transaction confirmed:", receipt.transactionHash); // Log confirm

      let newVehicleId = null; // ID mới từ event
      try {
        const event = contract.interface.parseLog(receipt.logs[0]); // Parse log
        if (event && event.name === "VehicleSubmitted") { // Nếu event submitted
          newVehicleId = parseInt(event.args.vehicleId.toString());
          console.log("New Vehicle ID từ event:", newVehicleId); // Log ID
        }
      } catch (parseErr) {
        console.error("Lỗi parse event:", parseErr); // Log parse error
      }

      // Thêm xe mới ngay lập tức (realtime)
      if (newVehicleId) { // Nếu có ID
        await updateSingleUserVehicle(newVehicleId); // Update history
        if (onSubmission) onSubmission(newVehicleId); // Callback parent
      }

      Swal.fire({ // Success notify
        icon: "success",
        title: "Đăng ký thành công!",
        html: `
          <p>Hồ sơ đã được gửi</p>
          <p>Đã thanh toán <strong>0.01 ETH</strong></p>
          <p>Chờ Admin phê duyệt</p>
          ${
            newVehicleId
              ? `<p>ID hồ sơ: <strong>#${newVehicleId}</strong></p>`
              : ""
          }
        `,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });

      // Reset form
      setForm({ // Clear form
        ownerName: "",
        cccd: "",
        addressInfo: "",
        phone: "",
        plateNumber: "",
        vehicleBrand: "",
        model: "",
        color: "",
        manufactureYear: "",
      });
      setCccdFront(null); // Clear files
      setCccdBack(null);
      setInvoiceFile(null);
      setErrors({}); // Clear errors
    } catch (err) {
      console.error("Lỗi nộp hồ sơ:", err); // Log error
      // ethers v5: user rejected tx: code === ACTION_REJECTED hoặc code === 4001
      if ( // Nếu user reject
        err.code === 4001 ||
        err.code === "ACTION_REJECTED" ||
        (err.message && err.message.toLowerCase().includes("user rejected"))
      ) {
        Swal.fire({ // Info reject
          icon: "info",
          title: "Bạn đã từ chối giao dịch",
          html: `<p>Giao dịch đã bị hủy bởi bạn.</p>`,
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
        });
      } else { // Error khác
        let errorMsg = "Lỗi nộp hồ sơ"; // Msg mặc định
        if (err.message && err.message.includes("insufficient funds")) { // Insufficient
          errorMsg = "Số dư không đủ để thanh toán phí 0.01 ETH";
        } else if ( // Plate used
          err.message &&
          err.message.includes("License plate already used")
        ) {
          errorMsg = "Biển số xe đã được đăng ký";
        } else if (err.message) { // Msg từ error
          errorMsg = err.message;
        }
        Swal.fire({ // Error alert
          icon: "error",
          title: "Lỗi!",
          text: errorMsg,
          confirmButtonText: "Đóng",
        });
      }
    } finally {
      setIsSubmitting(false); // Kết thúc submit
    }
  };

  // validate: Check form/files, set errors
  const validate = () => {
    const newErrors = {}; // Object errors mới
    if (!form.ownerName.trim() || form.ownerName.trim().split(" ").length < 2) // Tên ít nhất 2 từ
      newErrors.ownerName = "Họ tên phải có ít nhất 2 từ.";
    if (!form.cccd.match(/^\d{12}$/)) // CCCD 12 số
      newErrors.cccd = "CCCD phải có đúng 12 chữ số.";
    if (!form.addressInfo.trim()) // Địa chỉ không rỗng
      newErrors.addressInfo = "Địa chỉ không được trống.";
    if (!form.phone.match(/^\d{9,11}$/)) // SĐT 9-11 số
      newErrors.phone = "SĐT phải có 9–11 chữ số.";
    if (!form.plateNumber.match(/^\d{2}[A-Z]\d-\d{3,5}$/)) // Biển số format
      newErrors.plateNumber = "Biển số không hợp lệ (VD: 19N1-86868).";
    if (!form.vehicleBrand.trim()) // Hãng không rỗng
      newErrors.vehicleBrand = "Hãng xe không được trống.";
    if (!form.model.trim()) newErrors.model = "Model không được trống."; // Model không rỗng
    if (!form.color.trim()) newErrors.color = "Màu sắc không được trống."; // Màu không rỗng
    if (!form.manufactureYear) newErrors.manufactureYear = "Chọn năm sản xuất."; // Năm bắt buộc
    if (!cccdFront || !cccdBack) // Files CCCD
      newErrors.cccdFiles = "Cần tải lên ảnh CCCD mặt trước và mặt sau.";
    if (!invoiceFile) newErrors.invoiceFile = "Cần tải lên hóa đơn mua bán."; // File invoice
    setErrors(newErrors); // Set errors
    return Object.keys(newErrors).length === 0; // Trả true nếu ok
  };

  // uploadToIPFS: Upload file lên IPFS, trả hash
  const uploadToIPFS = async (file) => {
    if (!file) return ""; // Nếu không file
    const added = await ipfsClient.add(file); // Add file
    return added.path || added.cid?.toString(); // Trả path/CID
  };

  // Render: Container modal + form + history table
  return (
    <div className="container"> 
      <VehicleDetailModal // Modal chi tiết
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)} // Đóng modal
      />
      <VehicleForm // Form input
        form={form}
        setForm={setForm}
        cccdFront={cccdFront}
        setCccdFront={setCccdFront}
        cccdBack={cccdBack}
        setCccdBack={setCccdBack}
        invoiceFile={invoiceFile}
        setInvoiceFile={setInvoiceFile}
        errors={errors}
        setErrors={setErrors}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
        fillSampleData={fillSampleData}
        years={years}
      />
      <VehicleHistoryTable // Table history xe user
        userVehicles={userVehicles}
        loading={loading}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
      />
    </div>
  );
};

export default SubmitVehicleForm;