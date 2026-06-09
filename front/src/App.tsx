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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DonatePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/goal" element={<GoalWidget />} />
        <Route path="/top" element={<TopDonatorsWidget />} />
        <Route path="/recent" element={<RecentDonationsWidget />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;