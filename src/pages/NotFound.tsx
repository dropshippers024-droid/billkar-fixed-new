import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <div className="text-center px-4">
        <FileQuestion size={64} className="mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="text-6xl font-extrabold text-primary mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">This page doesn't exist or has been moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/dashboard"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Go to Dashboard
          </Link>
          <Link to="/"
            className="inline-flex items-center gap-2 border border-border px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-background transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
