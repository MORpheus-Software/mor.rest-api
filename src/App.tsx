
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import ApiPlayground from "./pages/ApiPlayground";
import ProfilePage from "./pages/ProfilePage";
import Staking from "./pages/Staking";
import Documentation from "./pages/Documentation";
import Dashboard from "./pages/Dashboard";
import Tokens from "./pages/Tokens";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GitHubCallback from "./pages/GitHubCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/github/callback" element={<GitHubCallback />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tokens" element={<ProtectedRoute><Tokens /></ProtectedRoute>} />
          <Route path="/playground" element={<ProtectedRoute><ApiPlayground /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/staking" element={<ProtectedRoute><Staking /></ProtectedRoute>} />
          <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
