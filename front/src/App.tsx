import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import DonatePage from "./pages/Donate";
import AdminPage from "./pages/Admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DonatePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;