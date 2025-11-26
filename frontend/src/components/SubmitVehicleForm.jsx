import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import Swal from "sweetalert2";
import { ipfsClient } from "../ipfsClient";
import { contractAddress, contractABI } from "../config";
import "./SubmitVehicleForm.css";

import VehicleDetailModal from "./vehicle/VehicleDetailModal.jsx";
import VehicleForm from "./vehicle/VehicleForm.jsx";
import VehicleHistoryTable from "./vehicle/VehicleHistoryTable.jsx";

const StatusMap = {
  0: "CHỜ DUYỆT",
  1: "ĐÃ DUYỆT",
  2: "TỪ CHỐI",
};

const SubmitVehicleForm = ({ signer, account, provider, onSubmission }) => {
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

  const [cccdFront, setCccdFront] = useState(null);
  const [cccdBack, setCccdBack] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userVehicles, setUserVehicles] = useState([]);
  const [userVehicleIds, setUserVehicleIds] = useState([]); // Cache IDs của user
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const years = Array.from({ length: 46 }, (_, i) => 1980 + i);

  // FIX: Dùng ref để giữ contract + listener ổn định
  const contractRef = useRef(null);
  const listenersRef = useRef({ reviewed: null });

  const getReadProvider = () =>
    provider ||
    (signer
      ? signer.provider
      : window.ethereum
      ? new ethers.providers.Web3Provider(window.ethereum)
      : null);

  // Tạo contract một lần duy nhất
  const getContract = useCallback(() => {
    const readProvider = getReadProvider();
    if (!readProvider) return null;
    if (!contractRef.current) {
      contractRef.current = new ethers.Contract(
        contractAddress,
        contractABI,
        readProvider
      );
    }
    return contractRef.current;
  }, [provider, signer]);

  const fillSampleData = () => {
    setForm({
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
    setErrors({});
    alert("Đã điền thông tin mẫu! Bạn có thể chỉnh sửa các trường nếu cần.");
  };

  // FETCH USER VEHICLES – GIỮ NGUYÊN 100% CODE GỐC CỦA ANH
  const fetchUserVehicles = useCallback(async () => {
    const readProvider = getReadProvider();
    if (!readProvider || !account) return;
    setLoading(true);
    try {
      const contractCode = await readProvider.getCode(contractAddress);
      if (contractCode === "0x") {
        console.error("Contract chưa được deploy tại:", contractAddress);
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        readProvider
      );
      const allIds = await contract.getAllVehicleIds();
      const ids = allIds.map((id) => parseInt(id.toString()));

      const allVehicles = await Promise.all(
        ids.map((id) => contract.vehicles(id))
      );
      const userIds = ids.filter((id, index) => {
        const v = allVehicles[index];
        return v.walletAddress.toLowerCase() === account.toLowerCase();
      });
      setUserVehicleIds(userIds);
      console.log("User IDs:", userIds);

      const userData = userIds.map((id) => {
        const index = ids.indexOf(id);
        const v = allVehicles[index];
        return {
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
      });
      setUserVehicles(userData);
      console.log("Đã tải", userData.length, "xe của user (partial)");
    } catch (err) {
      console.error("Lỗi tải danh sách xe:", err);
    } finally {
      setLoading(false);
    }
  }, [provider, signer, account]);

  // UPDATE SINGLE – GIỮ NGUYÊN, CHỈ DÙNG contractRef
  const updateSingleUserVehicle = useCallback(
    async (vehicleId) => {
      const contract = getContract();
      if (!contract || !vehicleId) return;
      try {
        const v = await contract.vehicles(vehicleId);
        const updated = {
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
        setUserVehicles((prev) => {
          const exists = prev.some((u) => u.id === vehicleId);
          if (exists) {
            return prev.map((u) => (u.id === vehicleId ? updated : u));
          } else {
            return [...prev, updated].sort((a, b) => a.id - b.id);
          }
        });
        if (!userVehicleIds.includes(vehicleId)) {
          setUserVehicleIds((prev) => [...new Set([...prev, vehicleId])]);
        }
        console.log("Đã update user vehicle #", vehicleId);
      } catch (err) {
        console.error("Lỗi update user vehicle:", err);
      }
    },
    [getContract, userVehicleIds]
  );

  useEffect(() => {
    if ((provider || signer) && account) fetchUserVehicles();
  }, [provider, signer, account, fetchUserVehicles]);

  // REALTIME LISTENER – CHỈ SỬA ĐOẠN NÀY THÔI, KHÔNG XÓA GÌ CẢ!
  useEffect(() => {
    const contract = getContract();
    if (!contract || !account) return;

    const handleVehicleReviewed = async (
      vehicleId,
      newStatus,
      reviewer,
      rejectionReason
    ) => {
      const idNum = parseInt(vehicleId.toString());

      // Cập nhật data trước
      await updateSingleUserVehicle(idNum);

      // Nếu không phải xe của user → bỏ qua
      if (!userVehicleIds.includes(idNum)) return;

      const approved = parseInt(newStatus.toString()) === 1;
      Swal.fire({
        icon: approved ? "success" : "warning",
        title: approved ? "Hồ sơ đã được duyệt!" : "Hồ sơ bị từ chối",
        html: approved
          ? `<p>Hồ sơ xe #${idNum} đã được phê duyệt!</p>`
          : `<p>Hồ sơ xe #${idNum} đã bị từ chối</p>${
              rejectionReason
                ? `<p><strong>Lý do:</strong> ${rejectionReason}</p>`
                : ""
            }<p>Biển số đã được giải phóng, bạn có thể đăng ký lại</p>`,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    };

    // Cleanup listener cũ
    if (listenersRef.current.reviewed) {
      contract.off("VehicleReviewed", listenersRef.current.reviewed);
    }

    listenersRef.current.reviewed = handleVehicleReviewed;
    contract.on("VehicleReviewed", handleVehicleReviewed);

    return () => {
      if (contract && listenersRef.current.reviewed) {
        contract.off("VehicleReviewed", listenersRef.current.reviewed);
      }
    };
  }, [account, userVehicleIds, updateSingleUserVehicle, getContract]);

  // handleSubmit – GIỮ NGUYÊN 100%, CHỈ THÊM update realtime khi thành công
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const normalizedPlate = form.plateNumber.trim().toUpperCase();
      const contractRead = getContract();
      if (await contractRead.isLicensePlateUsed(normalizedPlate)) {
        alert("Biển số đã được đăng ký");
        setIsSubmitting(false);
        return;
      }

      const frontHash = await uploadToIPFS(cccdFront);
      const backHash = await uploadToIPFS(cccdBack);
      const invoiceHash = await uploadToIPFS(invoiceFile);
      const docCombined = `${frontHash},${backHash},${invoiceHash}`;

      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      const ownerStruct = {
        fullName: form.ownerName,
        cccd: form.cccd,
        addressInfo: form.addressInfo,
        phone: form.phone,
      };

      Swal.fire({
        title: "Đang gửi giao dịch...",
        html: "Vui lòng chờ giao dịch được xác nhận",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      console.log("Đang gửi giao dịch đăng ký xe...");
      const tx = await contract.registerVehicle(
        ownerStruct,
        form.vehicleBrand,
        form.model,
        form.color,
        normalizedPlate,
        parseInt(form.manufactureYear),
        docCombined,
        "",
        { value: ethers.utils.parseEther("0.01") }
      );

      console.log("Đang chờ transaction confirm...");
      const receipt = await tx.wait(0);

      console.log("Transaction confirmed:", receipt.transactionHash);

      let newVehicleId = null;
      try {
        const event = contract.interface.parseLog(receipt.logs[0]);
        if (event && event.name === "VehicleSubmitted") {
          newVehicleId = parseInt(event.args.vehicleId.toString());
          console.log("New Vehicle ID từ event:", newVehicleId);
        }
      } catch (parseErr) {
        console.error("Lỗi parse event:", parseErr);
      }

      // Thêm xe mới ngay lập tức (realtime)
      if (newVehicleId) {
        await updateSingleUserVehicle(newVehicleId);
        if (onSubmission) onSubmission(newVehicleId);
      }

      Swal.fire({
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
      setForm({
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
      setCccdFront(null);
      setCccdBack(null);
      setInvoiceFile(null);
      setErrors({});
    } catch (err) {
      console.error("Lỗi nộp hồ sơ:", err);
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
        let errorMsg = "Lỗi nộp hồ sơ";
        if (err.message && err.message.includes("insufficient funds")) {
          errorMsg = "Số dư không đủ để thanh toán phí 0.01 ETH";
        } else if (
          err.message &&
          err.message.includes("License plate already used")
        ) {
          errorMsg = "Biển số xe đã được đăng ký";
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // validate + uploadToIPFS – giữ nguyên 100%
  const validate = () => {
    const newErrors = {};
    if (!form.ownerName.trim() || form.ownerName.trim().split(" ").length < 2)
      newErrors.ownerName = "Họ tên phải có ít nhất 2 từ.";
    if (!form.cccd.match(/^\d{12}$/))
      newErrors.cccd = "CCCD phải có đúng 12 chữ số.";
    if (!form.addressInfo.trim())
      newErrors.addressInfo = "Địa chỉ không được trống.";
    if (!form.phone.match(/^\d{9,11}$/))
      newErrors.phone = "SĐT phải có 9–11 chữ số.";
    if (!form.plateNumber.match(/^\d{2}[A-Z]\d-\d{3,5}$/))
      newErrors.plateNumber = "Biển số không hợp lệ (VD: 19N1-86868).";
    if (!form.vehicleBrand.trim())
      newErrors.vehicleBrand = "Hãng xe không được trống.";
    if (!form.model.trim()) newErrors.model = "Model không được trống.";
    if (!form.color.trim()) newErrors.color = "Màu sắc không được trống.";
    if (!form.manufactureYear) newErrors.manufactureYear = "Chọn năm sản xuất.";
    if (!cccdFront || !cccdBack)
      newErrors.cccdFiles = "Cần tải lên ảnh CCCD mặt trước và mặt sau.";
    if (!invoiceFile) newErrors.invoiceFile = "Cần tải lên hóa đơn mua bán.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadToIPFS = async (file) => {
    if (!file) return "";
    const added = await ipfsClient.add(file);
    return added.path || added.cid?.toString();
  };

  return (
    <div className="container">
      <VehicleDetailModal
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
      />
      <VehicleForm
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
      <VehicleHistoryTable
        userVehicles={userVehicles}
        loading={loading}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
      />
    </div>
  );
};

export default SubmitVehicleForm;
