import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { syncPlanFromUser } from "@/lib/planStore";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userStr = params.get("user");
    const inviteId = params.get("invite");

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem("billkar_token", token);
        localStorage.setItem("billkar_user", JSON.stringify(user));
        // Sync plan from user data (Google OAuth now includes plan fields)
        syncPlanFromUser(user);
        // Re-init the api client token
        window.location.href = inviteId ? `/invite/${inviteId}` : "/dashboard";
        return;
      } catch (err) {
        console.error("Failed to parse auth callback data:", err);
      }
    }

    // Fallback — something went wrong
    navigate("/login");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 size={32} className="animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
