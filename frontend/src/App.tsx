import { Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { ResendConfirmation } from "./pages/ResendConfirmation";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-semibold">FinSight</h1>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/resend-confirmation" element={<ResendConfirmation />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
      </Route>
    </Routes>
  );
}

export default App;