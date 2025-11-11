require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify"); // để verify contract trên Etherscan
require("dotenv").config(); // đọc biến môi trường từ file .env

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28", // phiên bản Solidity bạn đang dùng
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // giúp tránh lỗi "stack too deep"
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL, // từ file .env
      accounts: [process.env.PRIVATE_KEY], // private key ví của bạn
      chainId: 11155111, // ID của Sepolia
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY, // dùng để verify contract
  },
};
