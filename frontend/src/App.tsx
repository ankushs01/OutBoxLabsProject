import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./components/ui/Toast";
import { RequireAuth } from "./components/RequireAuth";
import { AppLayout } from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Inbox from "./pages/Inbox";
import Compose from "./pages/Compose";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Navigate to="/dashboard/scheduled" replace />} />
                <Route path="/dashboard/:folder" element={<Inbox />} />
                <Route path="/dashboard/:folder/:id" element={<Inbox />} />
              </Route>
              <Route path="/compose" element={<Compose />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
