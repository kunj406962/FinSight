import { Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { ResendConfirmation } from "./pages/ResendConfirmation";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Accounts } from "./pages/Accounts";
import {AccountDetail} from "./pages/AccountDetail";

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
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/:accountId" element={<AccountDetail />} />
      </Route>
      <Route path="*" element={<div>404 Not Found</div>} />            
    </Routes>
  );
}

export default App;