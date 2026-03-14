import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Weight from './pages/Weight';
import Groups from './pages/Groups';
import Profile from './pages/Profile';
import NewPost from './pages/NewPost';
import Workout from './pages/Workout';
import Onboarding from './pages/Onboarding';
import EmailVerification from './pages/EmailVerification';
import './index.css';

function ProtectedRoute({ children }) {
    const { user, profile, loading, profileLoading } = useAuth();

    if (loading || profileLoading) {
        return (
            <div className="loading-page">
                <div className="loading-logo">OurDiet</div>
                <div className="spinner" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;

    // Check email verification
    if (user.email && !user.email_confirmed_at) {
        return <Navigate to="/verify-email" />;
    }

    // Check if profile is set up (onboarding needed)
    if (!profile || !profile.height || !profile.weight) {
        return <Navigate to="/onboarding" />;
    }

    return children;
}

function AuthRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="loading-page">
                <div className="loading-logo">OurDiet</div>
                <div className="spinner" />
            </div>
        );
    }
    return user ? <Navigate to="/app/dashboard" /> : children;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<AuthRoute><Landing /></AuthRoute>} />
                    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                    <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
                    <Route path="/verify-email" element={<EmailVerification />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/app/dashboard" />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="weight" element={<Weight />} />
                        <Route path="groups" element={<Groups />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="new-post" element={<NewPost />} />
                        <Route path="workout" element={<Workout />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;

