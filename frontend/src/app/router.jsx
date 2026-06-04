import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import SelectRolePage from "../pages/auth/SelectRolePage";

import ClientDashboardPage from "../pages/client/ClientDashboardPage";
import ClientProfilePage from "../pages/client/ClientProfilePage";

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/select-role" element={<SelectRolePage />} />
        <Route
          path="/onboarding/client-profile"
          element={<ClientProfilePage />}
        />
        <Route
          path="/client/dashboard"
          element={<ClientDashboardPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;