import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import ApiPlayground from "./pages/ApiPlayground";
import ProfilePage from "./pages/ProfilePage";
import Documentation from "./pages/Documentation";
import Tokens from "./pages/Tokens";
import Staking from "./pages/Staking";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthCheck from "./components/auth/AuthCheck";
import DebugPage from "./pages/Debug";
import { isAuthenticated, login } from "./lib/auth";
import { MainLayout } from "./components/layouts/MainLayout";
import { useEffect } from "react";

const queryClient = new QueryClient();

// FOR DEVELOPMENT ONLY: Auto-login functionality
const DevLoginHelper = () => {
  useEffect(() => {
    // Check if we're in development and VITE_USE_MOCK_DATA is true
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      // Create a test user if not already logged in
      if (!isAuthenticated()) {
        console.log('DEV MODE: Creating test user for development');
        login({
          id: 'dev-user-123',
          name: 'Development User',
          email: 'dev@example.com',
        });
      }
    }
  }, []);

  return null;
};

// Component to handle root path redirection based on authentication
const RootRedirect = () => {
  const authenticated = isAuthenticated();
  console.log('[ROOT_REDIRECT] Authentication check result:', authenticated);
  console.log('[ROOT_REDIRECT] Will redirect to:', authenticated ? '/playground' : '/signin');
  
  return authenticated ? <Navigate to="/playground" replace /> : <Navigate to="/signin" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner 
        position="top-right"
        toastOptions={{
          duration: 4000,
          closeButton: true
        }}
      />
      <DevLoginHelper />
      <BrowserRouter>
        <AuthCheck>
          <Routes key={`routes-${Date.now()}`}>
            {/* Public routes */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/index" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/debug" element={<DebugPage />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<Navigate to="/playground" replace />} />
            <Route path="/tokens" element={<ProtectedRoute><Tokens /></ProtectedRoute>} />
            <Route path="/playground" element={<ProtectedRoute><ApiPlayground /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/staking" element={<ProtectedRoute><Staking /></ProtectedRoute>} />
            <Route path="/docs" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthCheck>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
