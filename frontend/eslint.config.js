import js from "@eslint/js"; // Cấu hình ESLint cho JavaScript chuẩn
import globals from "globals"; // Thêm các biến toàn cục cho môi trường trình duyệt
import reactHooks from "eslint-plugin-react-hooks"; // Plugin kiểm tra quy tắc React Hooks
import reactRefresh from "eslint-plugin-react-refresh"; // Plugin hỗ trợ Fast Refresh cho React
import { defineConfig, globalIgnores } from "eslint/config"; // Hàm cấu hình ESLint và ignore file

export default defineConfig([
  globalIgnores(["dist"]), // Bỏ qua thư mục dist khi kiểm tra lint
  {
    files: ["**/*.{js,jsx}"], // Áp dụng cho tất cả file .js và .jsx
    extends: [
      js.configs.recommended, // Sử dụng cấu hình ESLint JavaScript chuẩn
      reactHooks.configs["recommended-latest"], // Áp dụng quy tắc kiểm tra React Hooks
      reactRefresh.configs.vite, // Hỗ trợ Fast Refresh cho React khi dùng Vite
    ],
    languageOptions: {
      ecmaVersion: 2020, // Sử dụng cú pháp ECMAScript 2020
      globals: globals.browser, // Thêm các biến toàn cục của trình duyệt (window, document...)
      parserOptions: {
        ecmaVersion: "latest", // Sử dụng phiên bản ECMAScript mới nhất
        ecmaFeatures: { jsx: true }, // Hỗ trợ cú pháp JSX cho React
        sourceType: "module", // Sử dụng module ES6
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }], // Báo lỗi nếu có biến không dùng, trừ biến viết hoa đầu (thường là hằng số)
    },
  },
]); // Xuất cấu hình ESLint cho dự án
