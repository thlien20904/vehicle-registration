import React from "react";

const VehicleForm = ({
  form,
  setForm,
  cccdFront,
  setCccdFront,
  cccdBack,
  setCccdBack,
  invoiceFile,
  setInvoiceFile,
  errors,
  setErrors,
  isSubmitting,
  handleSubmit,
  fillSampleData,
  years,
}) => {
  return (
    <div className="form-section">
      <div className="form-header">
        <h2 className="main-title">🚗 Đăng ký phương tiện</h2>
        <button
          type="button"
          className="fill-sample-btn"
          onClick={fillSampleData}
          title="Điền thông tin mẫu để test nhanh"
        >
          ⚡ Fill mẫu
        </button>
      </div>
      <form className="vehicle-form" onSubmit={handleSubmit}>
        <h4>Thông tin chủ sở hữu</h4>

        {/* ====== INPUT THÔNG TIN CHỦ SỞ HỮU ====== */}
        {["ownerName", "cccd", "addressInfo", "phone"].map((key) => (
          <div key={key} className="form-group">
            <input
              placeholder={
                key === "ownerName"
                  ? "Họ và tên (VD: Nguyễn Văn A)"
                  : key === "cccd"
                  ? "CCCD (12 chữ số)"
                  : key === "addressInfo"
                  ? "Địa chỉ thường trú (VD: 123 Đường ABC, Quận 1, TP.HCM)"
                  : "Số điện thoại (VD: 0321234567)"
              }
              value={form[key]}
              onChange={(e) => {
                const value = e.target.value;
                setForm({ ...form, [key]: value });

                let msg = "";

                if (key === "ownerName") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.split(/\s+/).length < 2) {
                    msg = "Họ tên phải có ít nhất 2 từ.";
                  } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(trimmed)) {
                    msg = "Họ tên chỉ chứa chữ cái và dấu tiếng Việt.";
                  }
                }

                if (key === "cccd") {
                  if (!/^\d{12}$/.test(value) || value.startsWith("000")) {
                    msg = "CCCD phải đúng 12 chữ số và không bắt đầu bằng 000.";
                  }
                }

                if (key === "addressInfo") {
                  if (!value.trim() || value.trim().length < 10) {
                    msg = "Địa chỉ phải có ít nhất 10 ký tự.";
                  }
                }

                if (key === "phone") {
                  const digitsOnly = value.replace(/\D/g, "");
                  if (!/^(0[3|5|7|8|9]\d{8})$/.test(digitsOnly)) {
                    msg = "SĐT phải 10 số, bắt đầu bằng 03/05/07/08/09.";
                  }
                }

                setErrors((prev) => ({ ...prev, [key]: msg }));
              }}
              onBlur={(e) => {
                const value = e.target.value;
                let msg = "";

                if (key === "ownerName") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.split(/\s+/).length < 2) {
                    msg = "Họ tên phải có ít nhất 2 từ.";
                  } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(trimmed)) {
                    msg = "Họ tên chỉ chứa chữ cái và dấu tiếng Việt.";
                  }
                }

                if (key === "cccd") {
                  if (!/^\d{12}$/.test(value) || value.startsWith("000")) {
                    msg = "CCCD phải đúng 12 chữ số và không bắt đầu bằng 000.";
                  }
                }

                if (key === "addressInfo") {
                  if (!value.trim() || value.trim().length < 10) {
                    msg = "Địa chỉ phải có ít nhất 10 ký tự.";
                  }
                }

                if (key === "phone") {
                  const digitsOnly = value.replace(/\D/g, "");
                  if (!/^(0[3|5|7|8|9]\d{8})$/.test(digitsOnly)) {
                    msg = "SĐT phải đúng định dạng.";
                  }
                }

                setErrors((prev) => ({ ...prev, [key]: msg }));
              }}
            />
            {errors[key] && <p className="error">{errors[key]}</p>}
          </div>
        ))}

        {/* ====== THÔNG TIN XE ====== */}
        <h4>Thông tin phương tiện</h4>

        {["plateNumber", "vehicleBrand", "model", "color"].map((key) => (
          <div key={key} className="form-group">
            <input
              placeholder={
                key === "plateNumber"
                  ? "Biển số (VD: 29A-12345 hoặc 30K1-12345)"
                  : key === "vehicleBrand"
                  ? "Hãng xe (VD: Toyota)"
                  : key === "model"
                  ? "Model (VD: Camry)"
                  : "Màu sắc (VD: Đen)"
              }
              value={form[key]}
              onChange={(e) => {
                const value =
                  key === "plateNumber"
                    ? e.target.value.toUpperCase() // chỉ upper biển số
                    : e.target.value;

                setForm({ ...form, [key]: value });

                let msg = "";

                if (key === "plateNumber") {
                  // regex chuẩn biển số VN
                  const plateRegex = /^\d{2}[A-Z]\d?-?\d{4,5}$/i;

                  if (!plateRegex.test(value)) {
                    msg =
                      "Biển số không hợp lệ (VD: 29A-12345 hoặc 30K1-12345).";
                  }
                } else {
                  // brand / model / color
                  if (!value.trim() || value.trim().length < 2) {
                    msg = "Trường này phải có ít nhất 2 ký tự.";
                  }
                }

                setErrors((prev) => ({ ...prev, [key]: msg }));
              }}
              onBlur={(e) => {
                const value =
                  key === "plateNumber"
                    ? e.target.value.toUpperCase()
                    : e.target.value;

                let msg = "";

                if (key === "plateNumber") {
                  const plateRegex = /^\d{2}[A-Z]\d?-?\d{4,5}$/i;

                  if (!plateRegex.test(value)) {
                    msg = "Biển số không hợp lệ.";
                  }
                } else {
                  if (!value.trim() || value.trim().length < 2) {
                    msg = "Trường này phải có ít nhất 2 ký tự.";
                  }
                }

                setErrors((prev) => ({ ...prev, [key]: msg }));
              }}
            />
            {errors[key] && <p className="error">{errors[key]}</p>}
          </div>
        ))}

        {/* ====== NĂM SẢN XUẤT ====== */}
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

        {/* ====== TÀI LIỆU CCCD ====== */}
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
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.size > 5 * 1024 * 1024) {
                        alert("File quá lớn! Giới hạn 5MB.");
                        return;
                      }
                      side.setState(file);
                    }}
                  />
                  <p>{side.label}</p>
                </label>
              )}
            </div>
          ))}
        </div>

        {errors.cccdFiles && <p className="error">{errors.cccdFiles}</p>}

        {/* ====== HÓA ĐƠN ====== */}
        <div className="form-group">
          <label>📄 Hóa đơn mua bán</label>
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && file.size > 10 * 1024 * 1024) {
                alert("File quá lớn! Giới hạn 10MB.");
                return;
              }
              setInvoiceFile(file);
            }}
          />
          {errors.invoiceFile && <p className="error">{errors.invoiceFile}</p>}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang gửi..." : "📩 Nộp hồ sơ"}
        </button>
      </form>
    </div>
  );
};

export default VehicleForm;
