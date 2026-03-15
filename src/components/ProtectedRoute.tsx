import { Navigate } from "react-router-dom";
import { api } from "@/lib/api";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!api.isLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
