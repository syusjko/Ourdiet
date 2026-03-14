import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    async function signIn(e) {
        e.preventDefault();
        if (!email || !password) { setError('Please enter email and password'); return; }
        setLoading(true);
        setError('');

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }

        // Redirect after successful login
        navigate('/app/dashboard');
    }

    async function signInWithGoogle() {
        const { error: err } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/app/dashboard' }
        });
        if (err) setError(err.message);
    }

    return (
        <div className="auth-page">
            <div className="auth-header">
                <div className="auth-logo">OurDiet</div>
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to track your health goals</p>
            </div>

            <form onSubmit={signIn}>
                {error && <div className="toast error" style={{ position: 'relative', marginBottom: 16, top: 0, left: 0, transform: 'none' }}>{error}</div>}

                <div className="input-group">
                    <div className="input-with-icon">
                        <div className="input-icon"><Mail size={20} /></div>
                        <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="off" />
                    </div>
                </div>

                <div className="input-group">
                    <div className="input-with-icon" style={{ position: 'relative' }}>
                        <div className="input-icon"><Lock size={20} /></div>
                        <input className="input-field" type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', fontSize: 16, color: 'var(--text2)' }}>
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <div className="forgot-password">
                    <a href="#">Forgot Password?</a>
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading}>
                    {loading ? <div className="spinner" /> : 'Sign In'}
                </button>

                <div className="auth-divider">
                    <div className="auth-divider-line" />
                    <span className="auth-divider-text">or</span>
                    <div className="auth-divider-line" />
                </div>

                <button className="btn btn-google" type="button" onClick={signInWithGoogle}>
                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24.81-.6z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    Continue with Google
                </button>

                <div className="auth-footer">
                    Don't have an account? <Link to="/signup">Sign Up</Link>
                </div>
            </form>
        </div>
    );
}
