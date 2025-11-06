require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config(); // Nếu bạn muốn dùng biến môi trường

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28", // phiên bản Solidity bạn đang dùng
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // bật Intermediate Representation giúp tránh "stack too deep"
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
  },
};
