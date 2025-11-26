const hre = require("hardhat"); // Import Hardhat Runtime Environment để dùng các API của Hardhat

async function main() {
  // Lấy tài khoản đầu tiên trong danh sách tài khoản của node, dùng làm admin
  const [deployer] = await hre.ethers.getSigners(); // Lấy danh sách tài khoản, chọn tài khoản đầu tiên làm admin
  const adminAddress = deployer.address; // Lấy địa chỉ ví của admin

  console.log("Deploying contracts with the account:", adminAddress); // In ra địa chỉ ví đang deploy contract

  // Deploy Contract VehicleRegistration với adminAddress làm admin
  const VehicleRegistration = await hre.ethers.getContractFactory(
    "VehicleRegistration"
  ); // Lấy factory để tạo instance contract VehicleRegistration
  const vehicleRegistration = await VehicleRegistration.deploy(adminAddress); // Deploy contract, truyền địa chỉ admin vào constructor

  await vehicleRegistration.deployed(); // Đợi contract được deploy thành công

  console.log("VehicleRegistration deployed to:", vehicleRegistration.address); // In ra địa chỉ contract vừa deploy

  // Ghi lại địa chỉ contract để sử dụng ở frontend (có thể ghi ra file để frontend tự động lấy)
  // Ví dụ: fs.writeFileSync('artifacts/contractAddress.js', `export const licenseContractAddress = '${vehicleRegistration.address}';`); // Chưa thực hiện, chỉ là ví dụ ghi chú
}

main()
  .then(() => process.exit(0)) // Nếu deploy thành công thì thoát chương trình với mã 0
  .catch((error) => {
    console.error(error); // Nếu có lỗi thì in ra lỗi
    process.exit(1); // Thoát chương trình với mã lỗi 1
  });
