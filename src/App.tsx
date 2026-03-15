import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CommandPalette from "./components/CommandPalette";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import InvoiceCreator from "./pages/InvoiceCreator";
import InvoicesList from "./pages/InvoicesList";
import Estimates from "./pages/Estimates";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import SalesReport from "./pages/SalesReport";
import GSTReport from "./pages/GSTReport";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import Reminders from "./pages/Reminders";
import AuthCallback from "./pages/AuthCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Admin from "./pages/Admin";
import InviteAccept from "./pages/InviteAccept";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <CommandPalette />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/invite/:inviteId" element={<InviteAccept />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/onboarding" element={<P><Onboarding /></P>} />
          <Route path="/dashboard" element={<P><Dashboard /></P>} />
          <Route path="/dashboard/invoices" element={<P><InvoicesList /></P>} />
          <Route path="/dashboard/invoices/new" element={<P><InvoiceCreator /></P>} />
          <Route path="/dashboard/estimates" element={<P><Estimates /></P>} />
          <Route path="/dashboard/customers" element={<P><Customers /></P>} />
          <Route path="/dashboard/products" element={<P><Products /></P>} />
          <Route path="/dashboard/reports/sales" element={<P><SalesReport /></P>} />
          <Route path="/dashboard/reports/gst" element={<P><GSTReport /></P>} />
          <Route path="/dashboard/expenses" element={<P><Expenses /></P>} />
          <Route path="/dashboard/settings" element={<P><Settings /></P>} />
          <Route path="/dashboard/reminders" element={<P><Reminders /></P>} />
          <Route path="/admin" element={<P><Admin /></P>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
