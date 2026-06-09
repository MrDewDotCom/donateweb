import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import DonatePage from "./pages/Donate";
import AdminPage from "./pages/Admin";
import OverlayPage from "./pages/Overlay";
import SettingsPage from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DonatePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/overlay" element={<OverlayPage />} />
        <Route path="/settings" element={<SettingsPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;