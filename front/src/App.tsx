import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DonatePage from "./pages/Donate";
import AdminOverview from "./pages/AdminOverview";
import AdminDonations from "./pages/AdminDonations";
import DonationTypesPage from "./pages/DonationTypes";
import OverlayPage from "./pages/Overlay";
import SettingsPage from "./pages/Settings";
import GoalWidget from "./pages/GoalWidget";
import TopDonatorsWidget from "./pages/TopDonatorsWidget";
import RecentDonationsWidget from "./pages/RecentDonationsWidget";
import LoginPage from "./pages/Login";
import ProtectedRoute from "./components/protectedroute";
import AdminLayout from "./components/AdminLayout";
import DonatePageLanding from "./pages/DonatePageLanding";
import TimerWidget from "./pages/TimerWidget";
import VideoWidget from "./pages/VideoWidget";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DonatePageLanding />} />
        <Route path="/login" element={<LoginPage />} />
        {/* แอดมิน: sidebar ซ้าย + หน้าที่เลือก */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
        >
          <Route index element={<AdminOverview />} />
          <Route path="donations" element={<AdminDonations />} />
          <Route path="alert" element={<SettingsPage key="alert" section="alert" />} />
          <Route path="goal" element={<SettingsPage key="goal" section="goal" />} />
          <Route path="top" element={<SettingsPage key="top" section="top" />} />
          <Route path="recent" element={<SettingsPage key="recent" section="recent" />} />
          <Route path="timer" element={<SettingsPage key="timer" section="timer" />} />
          <Route path="video" element={<SettingsPage key="video" section="video" />} />
          <Route path="types" element={<DonationTypesPage />} />
          <Route path="payment" element={<SettingsPage key="payment" section="payment" />} />
        </Route>
        {/* ลิงก์เก่า /settings → หน้าใหม่ */}
        <Route path="/settings" element={<Navigate to="/admin/alert" replace />} />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/goal" element={<GoalWidget />} />
        <Route path="/top" element={<TopDonatorsWidget />} />
        <Route path="/recent" element={<RecentDonationsWidget />} />
        <Route path="/timer" element={<TimerWidget />} />
        <Route path="/video" element={<VideoWidget />} />
        <Route path="/donate/:id/:token" element={<DonatePage />} />
        <Route path="/donate" element={<DonatePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;