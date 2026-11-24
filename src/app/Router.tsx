import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage/HomePage";
import ExplorerPage from "../pages/ExplorerPage/ExplorerPage";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/explorer" element={<ExplorerPage />} />
    </Routes>
  );
}
