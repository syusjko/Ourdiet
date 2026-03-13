import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function signUp(e) {
        e.preventDefault();
        if (!email || !password) { setError('Please fill in all fields'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

        setLoading(true);
        setError('');
        const userProfile = { id: email, email, full_name: 'Test Setup User' };
        localStorage.setItem('dummy_user', JSON.stringify(userProfile));

        // Refresh page or trigger redirect
        window.location.href = '/dashboard';
    }

    return (
        <div className="auth-page">
            <div className="auth-header">
                <div className="auth-logo">OurDiet</div>
                <h1 className="auth-title">Join OurDiet</h1>
                <p className="auth-subtitle">Start your healthy journey together</p>
            </div>

            <form onSubmit={signUp}>
                {error && <div className="toast error" style={{ position: 'relative', marginBottom: 16, top: 0, left: 0, transform: 'none' }}>{error}</div>}

                <div className="input-group">
                    <div className="input-with-icon">
                        <div className="input-icon"><Mail size={20} /></div>
                        <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="off" />
                    </div>
                </div>

                <div className="input-group">
                    <div className="input-with-icon">
                        <span className="input-icon">🔒</span>
                        <input className="input-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                </div>

                <div className="input-group">
                    <div className="input-with-icon">
                        <span className="input-icon">🔒</span>
                        <input className="input-field" type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                    {loading ? <div className="spinner" /> : 'Create Account'}
                </button>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign In</Link>
                </div>
            </form>
        </div>
    );
}
