import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Gate that redirects to /login when there's no cached user.
// The real auth check is the backend cookie; this just avoids showing
// the dashboard shell to someone who never signed in.
export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
