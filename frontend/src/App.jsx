import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { contractAddress, contractABI } from "./config";
import { ipfsClient } from "./ipfsClient";
import SubmitLicenseForm from "./components/SubmitLicenseForm";
import "./App.css";

// Enum trạng thái giấy phép (đồng bộ với smart contract)
const StatusMap = {
  0: "CHỜ DUYỆT",
  1: "ĐÃ DUYỆT",
  2: "BỊ TỪ CHỐI",
};

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 1. Kết nối ví Metamask
  const connectWallet = useCallback(async () => {
    const web3Modal = new Web3Modal({
      network: "hardhat", // hoặc "localhost" nếu bạn chạy node local
      cacheProvider: true,
    });

    try {
      const connection = await web3Modal.connect();
      console.log("-> Đã kết nối Web3Modal.");
      console.log("Connection object:", connection);

      const newProvider = new ethers.providers.Web3Provider(connection);
      const newSigner = newProvider.getSigner();
      const newAccount = await newSigner.getAddress();

      setProvider(newProvider);
      setSigner(newSigner);
      setAccount(newAccount);

      // Kiểm tra địa chỉ admin trong contract
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        newProvider
      );

      const adminAddress = await contract.adminAddress();
      console.log("Địa chỉ Metamask:", newAccount);
      console.log("Địa chỉ Admin từ Contract:", adminAddress);

      setIsAdmin(newAccount.toLowerCase() === adminAddress.toLowerCase());
    } catch (error) {
      console.error("❌ Lỗi kết nối ví:", error);
      alert(
        "Không thể kết nối ví! Vui lòng kiểm tra Metamask hoặc mạng Hardhat."
      );
    }
  }, []);

  // 🔹 2. Lấy danh sách giấy phép
  const fetchLicenses = useCallback(async () => {
    if (!provider) return;
    setLoading(true);

    try {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        provider
      );
      const ids = await contract.getAllLicenseIds();
      const licenseDetails = await Promise.all(
        ids.map((id) => contract.licenses(id))
      );

      setLicenses(
        licenseDetails.map((l) => ({
          id: l.licenseId.toNumber(),
          companyName: l.companyName,
          companyAddress: l.companyAddress,
          ipfsHash: l.documentIpfsHash,
          status: StatusMap[l.status],
          submitter: l.submitter,
          reviewer: l.reviewer,
        }))
      );
    } catch (error) {
      console.error("❌ Lỗi khi tải giấy phép:", error);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  // 🔹 3. Admin duyệt giấy phép
  const reviewLicense = async (licenseId, isApproved) => {
    if (!signer || !isAdmin) return;
    const newStatus = isApproved ? 1 : 2;

    try {
      const contract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      const tx = await contract.reviewLicense(licenseId, newStatus);
      await tx.wait();

      alert(
        `✅ Giấy phép ID ${licenseId} đã được ${
          isApproved ? "DUYỆT" : "TỪ CHỐI"
        }.`
      );

      await fetchLicenses();
    } catch (error) {
      console.error("❌ Lỗi khi duyệt giấy phép:", error);
      alert("Lỗi giao dịch! Đảm bảo bạn là Admin và mạng đang chạy.");
    }
  };

  // Khởi tạo
  useEffect(() => {
    connectWallet();
  }, [connectWallet]);

  useEffect(() => {
    if (provider) fetchLicenses();
  }, [provider, fetchLicenses]);

  // 🔹 Giao diện khi chưa kết nối ví
  if (!account) {
    return (
      <div className="container connect-section">
        <h1 className="main-title">Quản Lý Cấp Phép Kinh Doanh</h1>
        <button className="connect-btn" onClick={connectWallet}>
          Kết nối Metamask
        </button>
      </div>
    );
  }

  // 🔹 Giao diện User (không phải admin)
  if (!isAdmin) {
    return (
      <div className="container">
        <h1>Cổng Nộp Hồ Sơ Kinh Doanh</h1>
        <p>
          Tài khoản hiện tại: <strong>{account}</strong> (Vai trò: User)
        </p>
        <SubmitLicenseForm
          signer={signer}
          account={account}
          onSubmission={fetchLicenses}
          provider={provider}
        />
      </div>
    );
  }

  // 🔹 Giao diện Admin
  return (
    <div className="admin-container">
      <h1 className="admin-title">Dashboard Kiểm Duyệt Giấy Phép</h1>

      <div className="admin-info">
        <p>
          Tài khoản Admin: <strong>{account}</strong>
        </p>
        <p>Vai trò: ADMIN</p>
      </div>

      <h2>Danh Sách Giấy Phép ({licenses.length})</h2>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <table className="license-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên Công Ty / Địa chỉ</th>
              <th>IPFS</th>
              <th>Trạng thái</th>
              <th>Người gửi</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>
                  <strong>{l.companyName}</strong>
                  <br />
                  <small>{l.companyAddress}</small>
                </td>
                <td>
                  <a
                    href={`http://127.0.0.1:8080/ipfs/${l.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Xem
                  </a>
                </td>
                <td>{l.status}</td>
                <td>{l.submitter.substring(0, 8)}...</td>
                <td>
                  {l.status === "CHỜ DUYỆT" ? (
                    <>
                      <button onClick={() => reviewLicense(l.id, true)}>
                        Duyệt
                      </button>
                      <button onClick={() => reviewLicense(l.id, false)}>
                        Từ chối
                      </button>
                    </>
                  ) : (
                    <span>
                      Đã xử lý:{" "}
                      {l.reviewer.substring(0, 8) !== "0x000000"
                        ? l.reviewer.substring(0, 8) + "..."
                        : "N/A"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
