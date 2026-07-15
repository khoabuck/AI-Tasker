// src/components/layout/ClientLayout.jsx
// Layout dùng cho tất cả trang của Client (sau khi đăng nhập)
// Có Navbar riêng với menu Client + Footer

import ClientNavbar from "./ClientNavbar";
import Footer       from "./Footer";

export default function ClientLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden bg-[#101319] text-[#e1e2eb]">
      <ClientNavbar />

      <main className="w-full min-w-0 flex-1 overflow-x-hidden">
        {children}
      </main>

      <Footer />
    </div>
  );
}