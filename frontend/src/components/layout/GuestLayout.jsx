import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const GuestLayout = () => {
  return (
    <div className="bg-[#101319] text-[#e1e2eb] min-h-screen font-sans selection:bg-[#00F0FF]/30">
      <Navbar />
      <main>
        {/* Điểm tương thích hiển thị các trang con bên dưới */}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default GuestLayout;