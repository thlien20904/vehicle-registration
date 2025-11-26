import { useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import Swal from "sweetalert2";
import { contractAddress, contractABI } from "./config";

const StatusMap = {
  0: "CHỜ DUYỆT",
  1: "ĐÃ DUYỆT",
  2: "TỪ CHỐI",
};

export const useVehicleRealtime = (
  provider,
  isAdmin,
  account,
  allVehicleIds,
  setVehicles,
  setAllVehicleIds,
  fetchSingleVehicle,
  updateSingleVehicle,
  fetchVehicles // Để trigger nếu cần
) => {
  const contractRef = useRef(null);
  const listenersRef = useRef({ submitted: null, reviewed: null });

  useEffect(() => {
    if (!provider) {
      // Clean khi provider null
      if (contractRef.current) {
        if (listenersRef.current.submitted) contractRef.current.off("VehicleSubmitted", listenersRef.current.submitted);
        if (listenersRef.current.reviewed) contractRef.current.off("VehicleReviewed", listenersRef.current.reviewed);
        listenersRef.current = { submitted: null, reviewed: null };
      }
      return;
    }

    // Tạo contract nếu chưa có
    if (!contractRef.current) {
      contractRef.current = new ethers.Contract(contractAddress, contractABI, provider);
    }

    console.log("👂 Lắng nghe events...");

    // Handlers với useCallback để ổn định (tránh re-create & stale closure)
    const handleVehicleSubmitted = useCallback(async (vehicleId, owner, fee) => {
      const idNum = parseInt(vehicleId.toString());
      console.log("🆕 Event Submitted #", idNum, "- Known IDs:", allVehicleIds);
      if (allVehicleIds.includes(idNum)) {
        console.log("⏭️ Skip dup #", idNum);
        return;
      }
      // Optimistic append
      const newVehicle = await fetchSingleVehicle(provider, idNum);
      if (newVehicle) {
        setVehicles((prev) => {
          if (prev.some((v) => v.id === idNum)) return prev;
          const updated = [...prev, newVehicle].sort((a, b) => a.id - b.id);
          console.log("📝 Optimistic append #", idNum, "- New IDs:", updated.map((v) => v.id));
          return updated;
        });
        setAllVehicleIds((prev) => [...new Set([...prev, idNum])]);
      }
      if (isAdmin) {
        Swal.fire({
          icon: "info",
          title: "📝 Hồ sơ đăng ký mới",
          html: `<p><strong>Hồ sơ xe #${idNum}</strong></p><p>Người gửi: ${owner.substring(0, 10)}...</p><p>💰 Đã nhận: ${ethers.utils.formatEther(fee)} ETH</p>`,
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
        });
      }
    }, [allVehicleIds, provider, fetchSingleVehicle, setVehicles, setAllVehicleIds, isAdmin]); // Deps đầy đủ, không vehicles

    const handleVehicleReviewed = useCallback(async (vehicleId, status, reviewer, rejectionReason) => {
      const idNum = parseInt(vehicleId.toString());
      await updateSingleVehicle(idNum);
      setVehicles((prev) => {
        const updatedVehicle = prev.find((v) => v.id === idNum);
        if (!isAdmin && updatedVehicle && updatedVehicle.walletAddress.toLowerCase() === account.toLowerCase()) {
          const statusStr = StatusMap[parseInt(status.toString())];
          Swal.fire({
            icon: parseInt(status.toString()) === 1 ? "success" : "warning",
            title: statusStr === "ĐÃ DUYỆT" ? "✅ Đã duyệt!" : "❌ Bị từ chối",
            html: `<p>Hồ sơ xe #${idNum}</p>${rejectionReason ? `<p><strong>Lý do:</strong> ${rejectionReason}</p>` : ""}`,
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
          });
        }
        return prev;
      });
    }, [isAdmin, account, updateSingleVehicle, setVehicles]); // Không vehicles

    // Clean cũ
    if (listenersRef.current.submitted) contractRef.current.off("VehicleSubmitted", listenersRef.current.submitted);
    if (listenersRef.current.reviewed) contractRef.current.off("VehicleReviewed", listenersRef.current.reviewed);

    listenersRef.current.submitted = handleVehicleSubmitted;
    listenersRef.current.reviewed = handleVehicleReviewed;
    contractRef.current.on("VehicleSubmitted", handleVehicleSubmitted);
    contractRef.current.on("VehicleReviewed", handleVehicleReviewed);

    return () => {
      if (contractRef.current) {
        if (listenersRef.current.submitted) contractRef.current.off("VehicleSubmitted", listenersRef.current.submitted);
        if (listenersRef.current.reviewed) contractRef.current.off("VehicleReviewed", listenersRef.current.reviewed);
      }
    };
  }, [
    provider,
    isAdmin,
    account,
    allVehicleIds, // Giữ để update check dup khi IDs thay
    setVehicles,
    setAllVehicleIds,
    fetchSingleVehicle,
    updateSingleVehicle,
    fetchVehicles, // Thêm để sync nếu cần
    // KHÔNG có vehicles để tránh loop
  ]);
};