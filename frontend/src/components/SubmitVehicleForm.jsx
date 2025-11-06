import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { ipfsClient } from "../ipfsClient";
import { contractAddress, contractABI } from "../config";
import "./SubmitVehicleForm.css";

const StatusMap = {
  0: "CHỜ DUYỆT",
  1: "ĐÃ DUYỆT",
  2: "TỪ CHỐI",
};

// ================== Modal xem chi tiết ==================
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

// ================== Component chính ==================
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

      <div className="form-section">
        <h2 className="main-title">🚗 Đăng ký phương tiện</h2>
        <form className="vehicle-form" onSubmit={handleSubmit}>
          <h4>Thông tin chủ sở hữu</h4>
          {["ownerName", "cccd", "addressInfo", "phone"].map((key) => (
            <div key={key} className="form-group">
              <input
                placeholder={
                  key === "ownerName"
                    ? "Họ và tên (VD: Nguyễn Văn A)"
                    : key === "cccd"
                    ? "CCCD"
                    : key === "addressInfo"
                    ? "Địa chỉ"
                    : "Số điện thoại"
                }
                value={form[key]}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm({ ...form, [key]: value });

                  // Xóa lỗi nếu người dùng nhập lại đúng
                  let msg = "";
                  if (
                    key === "ownerName" &&
                    (!value.trim() || value.trim().split(" ").length < 2)
                  )
                    msg = "Họ tên phải có ít nhất 2 từ.";
                  else if (key === "cccd" && !/^\d{12}$/.test(value))
                    msg = "CCCD phải có đúng 12 chữ số.";
                  else if (key === "addressInfo" && !value.trim())
                    msg = "Địa chỉ không được trống.";
                  else if (key === "phone" && !/^\d{9,11}$/.test(value))
                    msg = "SĐT phải có 9–11 chữ số.";

                  setErrors((prev) => ({ ...prev, [key]: msg }));
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  let msg = "";
                  if (
                    key === "ownerName" &&
                    (!value.trim() || value.trim().split(" ").length < 2)
                  )
                    msg = "Họ tên phải có ít nhất 2 từ.";
                  else if (key === "cccd" && !/^\d{12}$/.test(value))
                    msg = "CCCD phải có đúng 12 chữ số.";
                  else if (key === "addressInfo" && !value.trim())
                    msg = "Địa chỉ không được trống.";
                  else if (key === "phone" && !/^\d{9,11}$/.test(value))
                    msg = "SĐT phải có 9–11 chữ số.";

                  setErrors((prev) => ({ ...prev, [key]: msg }));
                }}
              />
              {errors[key] && <p className="error">{errors[key]}</p>}
            </div>
          ))}

          <h4>Thông tin phương tiện</h4>
          {["plateNumber", "vehicleBrand", "model", "color"].map((key) => (
            <div key={key} className="form-group">
              <input
                placeholder={
                  key === "plateNumber"
                    ? "Biển số (VD: 19N1-86868)"
                    : key === "vehicleBrand"
                    ? "Hãng xe"
                    : key === "model"
                    ? "Model"
                    : "Màu sắc"
                }
                value={form[key]}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm({ ...form, [key]: value });

                  // Xóa lỗi khi người dùng sửa đúng
                  let msg = "";
                  if (
                    key === "plateNumber" &&
                    !/^\d{2}[A-Z]\d-\d{3,5}$/.test(value)
                  )
                    msg = "Biển số không hợp lệ (VD: 19N1-86868).";
                  else if (key === "vehicleBrand" && !value.trim())
                    msg = "Hãng xe không được trống.";
                  else if (key === "model" && !value.trim())
                    msg = "Model không được trống.";
                  else if (key === "color" && !value.trim())
                    msg = "Màu sắc không được trống.";

                  setErrors((prev) => ({ ...prev, [key]: msg }));
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  let msg = "";
                  if (
                    key === "plateNumber" &&
                    !/^\d{2}[A-Z]\d-\d{3,5}$/.test(value)
                  )
                    msg = "Biển số không hợp lệ (VD: 19N1-86868).";
                  else if (key === "vehicleBrand" && !value.trim())
                    msg = "Hãng xe không được trống.";
                  else if (key === "model" && !value.trim())
                    msg = "Model không được trống.";
                  else if (key === "color" && !value.trim())
                    msg = "Màu sắc không được trống.";

                  setErrors((prev) => ({ ...prev, [key]: msg }));
                }}
              />
              {errors[key] && <p className="error">{errors[key]}</p>}
            </div>
          ))}

          <div className="form-group">
            <select
              value={form.manufactureYear}
              onChange={(e) =>
                setForm({ ...form, manufactureYear: e.target.value })
              }
            >
              <option value="">-- Chọn năm sản xuất --</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {errors.manufactureYear && (
              <p className="error">{errors.manufactureYear}</p>
            )}
          </div>

          <h4>Tài liệu</h4>
          <div className="cccd-upload">
            {[
              {
                label: "Mặt trước CCCD",
                state: cccdFront,
                setState: setCccdFront,
              },
              { label: "Mặt sau CCCD", state: cccdBack, setState: setCccdBack },
            ].map((side, i) => (
              <div key={i} className="upload-box">
                {side.state ? (
                  <div className="preview-wrapper">
                    <img
                      src={URL.createObjectURL(side.state)}
                      alt={side.label}
                      className="preview-img"
                    />
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => side.setState(null)}
                    >
                      ❌
                    </button>
                  </div>
                ) : (
                  <label className="upload-label">
                    <span className="plus">+</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => side.setState(e.target.files[0])}
                    />
                    <p>{side.label}</p>
                  </label>
                )}
              </div>
            ))}
          </div>
          {errors.cccdFiles && <p className="error">{errors.cccdFiles}</p>}

          <div className="form-group">
            <label>📄 Hóa đơn mua bán</label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setInvoiceFile(e.target.files[0])}
            />
            {errors.invoiceFile && (
              <p className="error">{errors.invoiceFile}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang gửi..." : "📩 Nộp hồ sơ"}
          </button>
        </form>
      </div>

      <div className="admin-container">
        <h2 className="admin-title">📜 Lịch sử hồ sơ của bạn</h2>
        {loading ? (
          <p className="loading-text">Đang tải...</p>
        ) : userVehicles.length === 0 ? (
          <p className="loading-text">Chưa có hồ sơ nào</p>
        ) : (
          <div className="table-container">
            <table className="license-table">
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
    </div>
  );
};

export default SubmitVehicleForm;
