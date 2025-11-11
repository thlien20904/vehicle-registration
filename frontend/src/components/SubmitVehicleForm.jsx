import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
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

const SubmitVehicleForm = ({ signer, account, provider }) => {
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

  // Ảnh CCCD
  const [cccdFront, setCccdFront] = useState(null);
  const [cccdBack, setCccdBack] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [userVehicles, setUserVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const years = Array.from({ length: 46 }, (_, i) => 1980 + i);

  const getReadProvider = () =>
    provider ||
    (signer
      ? signer.provider
      : window.ethereum
      ? new ethers.providers.Web3Provider(window.ethereum)
      : null);

  // ===== Lấy danh sách xe =====
  const fetchUserVehicles = useCallback(async () => {
    const readProvider = getReadProvider();
    if (!readProvider || !account) return;
    setLoading(true);
    try {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        readProvider
      );
      const idsBN = await contract.getAllVehicleIds();
      const ids = idsBN.map((id) => parseInt(id.toString()));
      const details = await Promise.all(ids.map((id) => contract.vehicles(id)));
      const userData = details
        .filter((v) => v.walletAddress.toLowerCase() === account.toLowerCase())
        .map((v) => ({
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
        }));
      setUserVehicles(userData);
    } catch (err) {
      console.error("❌ Lỗi tải danh sách xe:", err);
    } finally {
      setLoading(false);
    }
  }, [provider, signer, account]);

  useEffect(() => {
    if ((provider || signer) && account) fetchUserVehicles();
  }, [provider, signer, account, fetchUserVehicles]);

  // ===== Validate =====
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

  // ===== Nộp hồ sơ =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const normalizedPlate = form.plateNumber.trim().toUpperCase();
      const contractRead = new ethers.Contract(
        contractAddress,
        contractABI,
        getReadProvider()
      );
      if (await contractRead.isLicensePlateUsed(normalizedPlate)) {
        alert("⚠️ Biển số đã được đăng ký");
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
      await tx.wait();

      alert("🎉 Nộp hồ sơ thành công!");
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
      fetchUserVehicles();
    } catch (err) {
      console.error("❌ Lỗi nộp hồ sơ:", err);
      alert("Lỗi nộp hồ sơ. Kiểm tra Metamask hoặc IPFS.");
    } finally {
      setIsSubmitting(false);
    }
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
