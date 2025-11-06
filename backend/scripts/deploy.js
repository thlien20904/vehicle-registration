const hre = require("hardhat");

async function main() {
  // Lấy tài khoản đầu tiên làm Admin
  const [deployer] = await hre.ethers.getSigners();
  const adminAddress = deployer.address;

  console.log("Deploying contracts with the account:", adminAddress);

  // Deploy Contract
  const VehicleRegistration = await hre.ethers.getContractFactory(
    "VehicleRegistration"
  );
  const vehicleRegistration = await VehicleRegistration.deploy(adminAddress);

  await vehicleRegistration.deployed();

  console.log("VehicleRegistration deployed to:", vehicleRegistration.address);

  // Ghi lại địa chỉ contract để sử dụng ở frontend
  // (Bạn có thể tự tạo file config riêng, ở đây ta chỉ cần ghi lại log)
  // Ví dụ: fs.writeFileSync('artifacts/contractAddress.js', `export const licenseContractAddress = '${vehicleRegistration.address}';`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
