// src/components/layout/ClientLayout.jsx
// Layout dùng cho tất cả trang của Client (sau khi đăng nhập)
// Có Navbar riêng với menu Client + Footer

import ClientNavbar from "./ClientNavbar";
import Footer       from "./Footer";

export default function ClientLayout({ children }) {
  return (
    <div className="bg-[#101319] text-[#e1e2eb] min-h-screen flex flex-col">
      <ClientNavbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}