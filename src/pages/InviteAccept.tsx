import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api, setActiveBusiness } from "@/lib/api";
import { setTeamRole } from "@/lib/planStore";
import { toast } from "sonner";

const InviteAccept = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<{ business_name: string; email: string; role: string } | null>(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  const getErrorMessage = (value: unknown, fallback: string): string =>
    value instanceof Error ? value.message : fallback;

  useEffect(() => {
    if (!inviteId) return;
    api.getInviteDetails(inviteId)
      .then((data) => setInvite(data))
      .catch((err) => setError(getErrorMessage(err, "Invite not found")))
      .finally(() => setLoading(false));
  }, [inviteId]);

  const isLoggedIn = api.isLoggedIn();

  const handleAccept = async () => {
    if (!inviteId) return;
    setAccepting(true);
    try {
      const result = await api.acceptInvite(inviteId);
      if (invite && result?.business_id) {
        const normalizedRole = String(invite.role || "staff").toLowerCase();
        setActiveBusiness({ id: result.business_id, name: invite.business_name, role: normalizedRole });
        setTeamRole(normalizedRole);
      }
      setAccepted(true);
      toast.success("You've joined the team!");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to accept invite"));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center"
      >
        {loading ? (
          <div className="py-8">
            <Loader2 size={32} className="mx-auto text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading invite...</p>
          </div>
        ) : error ? (
          <div className="py-4">
            <XCircle size={40} className="mx-auto text-red-400 mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Invite Not Found</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
              Go to BillKar
            </Link>
          </div>
        ) : accepted ? (
          <div className="py-4">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">You're In!</h2>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">You're invited!</h2>
            <p className="text-sm text-gray-500 mb-1">
              You've been invited to join
            </p>
            <p className="text-lg font-bold text-indigo-600 mb-1">{invite?.business_name}</p>
            <p className="text-xs text-gray-400 mb-6">
              as <span className="font-medium text-gray-600 capitalize">{invite?.role || "Staff"}</span> on BillKar
            </p>

            {isLoggedIn ? (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-70"
              >
                {accepting ? (
                  <><Loader2 size={14} className="inline animate-spin mr-1.5" />Joining...</>
                ) : (
                  "Accept & Join Team"
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <Link
                  to={`/signup?invite=${inviteId}`}
                  className="block w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Create Account
                </Link>
                <Link
                  to={`/login?invite=${inviteId}`}
                  className="block w-full py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Already have an account? Log in
                </Link>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default InviteAccept;
