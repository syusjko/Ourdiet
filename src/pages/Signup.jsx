import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [signupSuccess, setSignupSuccess] = useState(false);

    async function signUp(e) {
        e.preventDefault();
        if (!email || !password) { setError('Please fill in all fields'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

        setLoading(true);
        setError('');

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: email.split('@')[0],
                }
            }
        });

        setLoading(false);

        if (signUpError) {
            setError(signUpError.message);
            return;
        }

        // Check if email confirmation is required
        if (data?.user && data?.session === null) {
            setSignupSuccess(true);
        } else {
            // Redirect if email confirmation is off
            navigate('/app/dashboard');
        }
    }

    // Show success message after signup
    if (signupSuccess) {
        return (
            <div className="auth-page">
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(48, 209, 88, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <CheckCircle size={40} color="#30D158" />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Check Your Email! 📬</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
                        We've sent a verification link to
                    </p>
                    <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 16, marginBottom: 24 }}>
                        {email}
                    </p>
                    <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
                        Click the link in the email to verify your account,<br />then come back here to sign in.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/login')}>
                        Go to Sign In
                    </button>
                </div>
            </div>
        );
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
                        <div className="input-icon"><Lock size={20} /></div>
                        <input className="input-field" type="password" placeholder="Password (6+ chars)" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                </div>

                <div className="input-group">
                    <div className="input-with-icon">
                        <div className="input-icon"><Lock size={20} /></div>
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

