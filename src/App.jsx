import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Weight from './pages/Weight';
import Groups from './pages/Groups';
import Profile from './pages/Profile';
import NewPost from './pages/NewPost';
import './index.css';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="loading-page">
                <div className="loading-logo">OurDiet</div>
                <div className="spinner" />
            </div>
        );
    }
    return user ? children : <Navigate to="/login" />;
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
    return user ? <Navigate to="/dashboard" /> : children;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
                    <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/dashboard" />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="weight" element={<Weight />} />
                        <Route path="groups" element={<Groups />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="new-post" element={<NewPost />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
