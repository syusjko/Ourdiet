import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Mail, RefreshCw, LogOut } from 'lucide-react';

export default function EmailVerification() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    const resendEmail = async () => {
        if (resending) return;
        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user?.email,
            });
            if (error) throw error;
            setResent(true);
            setTimeout(() => setResent(false), 5000);
        } catch (err) {
            alert('Failed to resend email: ' + err.message);
        } finally {
            setResending(false);
        }
    };

    const checkVerification = async () => {
        // Refresh the session to check if email has been verified
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.user?.email_confirmed_at) {
            // Email verified! Reload app to trigger proper routing
            window.location.href = '/dashboard';
        } else {
            alert('Email has not been verified yet. Please check your inbox and click the verification link.');
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
                {/* Email Icon */}
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255, 149, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <Mail size={40} color="#FF9500" />
                </div>

                <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Verify Your Email</h1>
                <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
                    We've sent a verification link to
                </p>
                <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 16, marginBottom: 24 }}>
                    {user?.email}
                </p>
                <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
                    Please check your inbox (and spam folder) and click the verification link to activate your account.
                </p>

                {/* Buttons */}
                <button className="btn btn-primary" onClick={checkVerification} style={{ marginBottom: 12 }}>
                    <RefreshCw size={16} style={{ marginRight: 6 }} /> I've Verified My Email
                </button>

                <button className="btn btn-secondary" onClick={resendEmail} disabled={resending || resent} style={{ marginBottom: 24 }}>
                    {resent ? '✓ Email Sent!' : resending ? 'Sending...' : 'Resend Verification Email'}
                </button>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 8 }}>
                    <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}>
                        <LogOut size={14} /> Sign out and use a different account
                    </button>
                </div>
            </div>
        </div>
    );
}
