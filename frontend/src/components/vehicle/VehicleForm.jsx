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
  years,
}) => {
  return (
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
                  ? "CCCD (12 chữ số)"
                  : key === "addressInfo"
                  ? "Địa chỉ thường trú (VD: 123 Đường ABC, Quận 1, TP.HCM)"
                  : "Số điện thoại (VD: 0321234567)"
              }
              value={form[key]}
              onChange={(e) => {
                const value = e.target.value;
                setForm({ ...form, [key]: value });

                // Xóa lỗi nếu người dùng nhập lại đúng
                let msg = "";
                if (key === "ownerName") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.split(/\s+/).length < 2) {
                    msg = "Họ tên phải có ít nhất 2 từ (chỉ chữ cái và dấu).";
                  } else if (
                    !/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂ ƯỰỲỴÝỶỸ\s]+$/.test(
                      trimmed
                    )
                  ) {
                    msg = "Họ tên chỉ chứa chữ cái và dấu tiếng Việt.";
                  }
                } else if (key === "cccd") {
                  if (!/^\d{12}$/.test(value) || value.startsWith("000")) {
                    msg = "CCCD phải đúng 12 chữ số (không bắt đầu bằng 000).";
                  }
                } else if (key === "addressInfo") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.length < 10) {
                    msg = "Địa chỉ phải có ít nhất 10 ký tự.";
                  }
                } else if (key === "phone") {
                  const digitsOnly = value.replace(/\D/g, "");
                  if (
                    !/^(0[3|5|7|8|9][0-9]{8})$/.test(digitsOnly) ||
                    digitsOnly.length !== 10
                  ) {
                    msg =
                      "SĐT phải đúng 10 chữ số, bắt đầu bằng 03/05/07/08/09 (VD: 0321234567).";
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
                    msg = "Họ tên phải có ít nhất 2 từ (chỉ chữ cái và dấu).";
                  } else if (
                    !/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂ ƯỰỲỴÝỶỸ\s]+$/.test(
                      trimmed
                    )
                  ) {
                    msg = "Họ tên chỉ chứa chữ cái và dấu tiếng Việt.";
                  }
                } else if (key === "cccd") {
                  if (!/^\d{12}$/.test(value) || value.startsWith("000")) {
                    msg = "CCCD phải đúng 12 chữ số (không bắt đầu bằng 000).";
                  }
                } else if (key === "addressInfo") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.length < 10) {
                    msg = "Địa chỉ phải có ít nhất 10 ký tự.";
                  }
                } else if (key === "phone") {
                  const digitsOnly = value.replace(/\D/g, "");
                  if (
                    !/^(0[3|5|7|8|9][0-9]{8})$/.test(digitsOnly) ||
                    digitsOnly.length !== 10
                  ) {
                    msg =
                      "SĐT phải đúng 10 chữ số, bắt đầu bằng 03/05/07/08/09 (VD: 0321234567).";
                  }
                }

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
                  ? "Biển số (VD: 29A-12345 hoặc 30K1-12345)"
                  : key === "vehicleBrand"
                  ? "Hãng xe (VD: Toyota)"
                  : key === "model"
                  ? "Model (VD: Camry)"
                  : "Màu sắc (VD: Đen)"
              }
              value={form[key]}
              onChange={(e) => {
                const value = e.target.value.toUpperCase(); // Tự uppercase cho biển số
                setForm({ ...form, [key]: value });

                // Xóa lỗi khi người dùng sửa đúng
                let msg = "";
                if (key === "plateNumber") {
                  if (!/^\d{2}[A-Z]{1,2}-\d{4,5}$/.test(value)) {
                    // Cập nhật regex: 2 số + 1-2 chữ + - + 4-5 số
                    msg =
                      "Biển số không hợp lệ (VD: 29A-12345 hoặc 30K1-12345).";
                  }
                } else if (key === "vehicleBrand") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.length < 2) {
                    msg = "Hãng xe phải có ít nhất 2 ký tự.";
                  }
                } else if (key === "model") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.length < 2) {
                    msg = "Model phải có ít nhất 2 ký tự.";
                  }
                } else if (key === "color") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.length < 2) {
                    msg = "Màu sắc phải có ít nhất 2 ký tự.";
                  }
                }

                setErrors((prev) => ({ ...prev, [key]: msg }));
              }}
              onBlur={(e) => {
                const value = e.target.value.toUpperCase();
                let msg = "";
                if (key === "plateNumber") {
                  if (!/^\d{2}[A-Z]{1,2}-\d{4,5}$/.test(value)) {
                    msg =
                      "Biển số không hợp lệ (VD: 29A-12345 hoặc 30K1-12345).";
                  }
                } else if (key === "vehicleBrand") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.length < 2) {
                    msg = "Hãng xe phải có ít nhất 2 ký tự.";
                  }
                } else if (key === "model") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.length < 2) {
                    msg = "Model phải có ít nhất 2 ký tự.";
                  }
                } else if (key === "color") {
                  const trimmed = value.trim();
                  if (!trimmed || trimmed.length < 2) {
                    msg = "Màu sắc phải có ít nhất 2 ký tự.";
                  }
                }

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
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.size > 5 * 1024 * 1024) {
                        // Thêm check size <5MB
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

        <div className="form-group">
          <label>📄 Hóa đơn mua bán</label>
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && file.size > 10 * 1024 * 1024) {
                // Thêm check size <10MB cho PDF
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
