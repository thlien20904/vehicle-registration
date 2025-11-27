import { defineConfig } from "vite"; // Import hàm cấu hình Vite
import react from "@vitejs/plugin-react"; // Plugin hỗ trợ React cho Vite
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill"; // Polyfill cho biến toàn cục Node.js (process, buffer)
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill"; // Polyfill cho module Node.js khi dùng trên trình duyệt

// Cấu hình chuẩn cho ethers + Vite
export default defineConfig({
  plugins: [react()], // Thêm plugin React để hỗ trợ JSX, Fast Refresh...
  define: {
    global: "globalThis", // Định nghĩa lại 'global' để fix lỗi khi dùng ethers.js trên trình duyệt
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis", // Định nghĩa lại 'global' cho quá trình build
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true, // Polyfill cho biến 'process' của Node.js
          buffer: true, // Polyfill cho biến 'buffer' của Node.js
        }),
        NodeModulesPolyfillPlugin(), // Polyfill cho các module Node.js (fs, path...) khi dùng trên trình duyệt
      ],
    },
  },
  resolve: {
    alias: {
      buffer: "buffer", // Alias cho module 'buffer' để dùng trên trình duyệt
      process: "process/browser", // Alias cho 'process' để dùng bản browser
      stream: "stream-browserify", // Alias cho 'stream' để dùng bản browser
      util: "util", // Alias cho 'util' để dùng trên trình duyệt
    },
  },
});
