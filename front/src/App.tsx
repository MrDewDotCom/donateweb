import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import DonatePage from "./pages/Donate";
import AdminPage from "./pages/Admin";
import OverlayPage from "./pages/Overlay";
import SettingsPage from "./pages/Settings";
import GoalWidget from "./pages/GoalWidget";
import TopDonatorsWidget from "./pages/TopDonatorsWidget";
import RecentDonationsWidget from "./pages/RecentDonationsWidget";
import LoginPage from "./pages/Login";
import ProtectedRoute from "./components/protectedroute";
import DonatePageLanding from "./pages/DonatePageLanding";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DonatePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
        />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
        />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/goal" element={<GoalWidget />} />
        <Route path="/top" element={<TopDonatorsWidget />} />
        <Route path="/recent" element={<RecentDonationsWidget />} />
        <Route path="/donate/:id/:token" element={<DonatePage />} />
        <Route path="/landing" element={<DonatePageLanding />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;