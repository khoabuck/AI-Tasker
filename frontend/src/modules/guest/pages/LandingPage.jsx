// src/modules/guest/pages/LandingPage.jsx
// Trang chủ — lắp ráp tất cả section lại
// Nằm trong src/modules/guest/pages/ nên muốn ra src/components/ phải dùng ../../../components/

import { useState, useEffect } from "react";

// Tất cả section component nằm trong src/components/layout/
import Navbar            from "../../../components/layout/Navbar";
import Footer            from "../../../components/layout/Footer";
import HeroSection       from "../../../components/layout/HeroSection";
import StatsSection      from "../../../components/layout/StatsSection";
import CategoriesSection from "../../../components/layout/CategoriesSection";
import ExpertsSection    from "../../../components/layout/ExpertsSection";
import ProjectsSection   from "../../../components/layout/ProjectsSection";
import HowItWorksSection from "../../../components/layout/HowItWorksSection";

export default function LandingPage() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
  }, []);

  // Toggle class "dark" trên <html> để Tailwind dark mode hoạt động
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Mouse tracking cho hiệu ứng neon glow
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.querySelectorAll(".neon-glow").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width  / 2)) / 30;
        const dy = (e.clientY - (rect.top  + rect.height / 2)) / 30;
        el.style.boxShadow = `${dx}px ${dy}px 25px rgba(34, 211, 238, 0.2)`;
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="bg-gray-950 text-white min-h-screen">
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
      <main>
        <HeroSection />
        <StatsSection />
        <CategoriesSection />
        <ExpertsSection />
        <ProjectsSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  );
}