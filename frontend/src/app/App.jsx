// src/app/App.jsx

import { BrowserRouter, Routes, Route } from "react-router-dom";

// Guest
import LandingPage            from "../modules/guest/pages/LandingPage";

// Auth
import LoginPage          from "../modules/auth/pages/LoginPage";
import RegisterPage       from "../modules/auth/pages/RegisterPage";
import RoleSelectionPage  from "../modules/auth/pages/RoleSelectionPage";

// Client
import ClientDashboard        from "../modules/client/pages/ClientDashboard";
import ClientProfileSetupPage from "../modules/client/pages/ClientProfileSetupPage";

// Expert — mở comment khi làm đến
// import ExpertDashboard     from "../modules/expert/pages/ExpertDashboard";

// Admin — mở comment khi làm đến
// import AdminDashboard      from "../modules/admin/pages/AdminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Guest */}
        <Route path="/"                     element={<LandingPage />} />

        {/* Auth */}
        <Route path="/login"                element={<LoginPage />} />
        <Route path="/register"             element={<RegisterPage />} />
        <Route path="/role-selection"       element={<RoleSelectionPage />} />

        {/* Client */}
        <Route path="/client/dashboard"     element={<ClientDashboard />} />
        <Route path="/client/profile-setup" element={<ClientProfileSetupPage />} />

        {/* Expert */}
        {/* <Route path="/expert/dashboard"  element={<ExpertDashboard />} /> */}

        {/* Admin */}
        {/* <Route path="/admin/dashboard"   element={<AdminDashboard />} /> */}

      </Routes>
    </BrowserRouter>
  );
}