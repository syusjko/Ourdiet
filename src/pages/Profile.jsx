import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { 
    User, Settings, Bell, Shield, Moon, 
    LogOut, ChevronRight, Camera, Trash2, Activity
} from 'lucide-react';

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [showEditName, setShowEditName] = useState(false);
    const [editName, setEditName] = useState('');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [isPro, setIsPro] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
            setProfile(data);
            setEditName(data.full_name || '');
            setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
            setIsPro(data.is_pro || false);
        }
    };

    const saveName = async () => {
        if (!user || !editName.trim()) return;
        setIsLoading(true);
        try {
            await supabase.from('profiles').update({ full_name: editName, is_pro: isPro, timezone: timezone }).eq('id', user.id);
            await fetchProfile();
            window.dispatchEvent(new Event('tokens_updated'));
            setShowEditName(false);
        } catch (error) {
            alert('Failed to update name');
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        if (window.confirm('Are you sure you want to sign out?')) {
            await supabase.auth.signOut();
            navigate('/login');
        }
    };

    const deleteAccount = async () => {
        if (!window.confirm('WARNING: This will permanently delete your account and all data. This action cannot be undone.\n\nAre you sure?')) return;
        if (!window.confirm('FINAL CONFIRMATION: Type "yes" mentally. Are you really sure you want to delete everything?')) return;

        try {
            // Delete all user data from tables
            await supabase.from('weight_logs').delete().eq('user_id', user.id);
            await supabase.from('meals').delete().eq('user_id', user.id);
            await supabase.from('friendships').delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            await supabase.from('profiles').delete().eq('id', user.id);

            // Sign out (full auth.users deletion requires Supabase Edge Function)
            await supabase.auth.signOut();
            navigate('/login');
        } catch (err) {
            alert('Failed to delete account: ' + err.message);
        }
    };

    return (
        <div style={{ paddingBottom: 100, background: 'var(--bg)', minHeight: '100vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="header-sticky" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', background: 'var(--bg)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Settings</div>
            </div>

            {/* Profile Avatar Section */}
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div className="profile-avatar" style={{ width: 90, height: 90, fontSize: 36, margin: '0 auto', border: '3px solid var(--primary)' }}>
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase())}
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{profile?.full_name || 'User'}</div>
                    <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>{user?.email}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
                    📍 {profile?.timezone || 'Timezone not set'}
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, padding: '6px 16px', borderRadius: 20 }} onClick={() => setShowEditName(true)}>
                    Edit Profile
                </button>
            </div>

            <div style={{ padding: '0 16px' }}>
                {/* Account Section */}
                <div className="settings-section">
                    <div className="settings-section-title">Account</div>
                    <div className="settings-card">
                        <button className="settings-item" onClick={() => setShowEditName(true)}>
                            <div className="settings-item-left">
                                <div className="settings-icon" style={{ background: 'rgba(10, 132, 255, 0.15)', color: '#0A84FF' }}><User size={18} /></div>
                                <span>Personal Information</span>
                            </div>
                            <ChevronRight size={18} color="var(--text3)" />
                        </button>
                        <div className="settings-divider" />
                        <button className="settings-item">
                            <div className="settings-item-left">
                                <div className="settings-icon" style={{ background: 'rgba(48, 209, 88, 0.15)', color: '#30D158' }}><Shield size={18} /></div>
                                <span>Privacy & Security</span>
                            </div>
                            <ChevronRight size={18} color="var(--text3)" />
                        </button>
                        <div className="settings-divider" />
                        <button className="settings-item" onClick={() => navigate('/app/weight')}>
                            <div className="settings-item-left">
                                <div className="settings-icon" style={{ background: 'rgba(255, 149, 0, 0.15)', color: '#FF9500' }}><Activity size={18} /></div>
                                <span>Body Profile (Weight/Height)</span>
                            </div>
                            <ChevronRight size={18} color="var(--text3)" />
                        </button>
                    </div>
                </div>

                {/* App Settings Section */}
                <div className="settings-section">
                    <div className="settings-section-title">Preferences</div>
                    <div className="settings-card">
                        <button className="settings-item">
                            <div className="settings-item-left">
                                <div className="settings-icon" style={{ background: 'rgba(191, 90, 242, 0.15)', color: '#BF5AF2' }}><Bell size={18} /></div>
                                <span>Notifications</span>
                            </div>
                            <ChevronRight size={18} color="var(--text3)" />
                        </button>
                        <div className="settings-divider" />
                        <div className="settings-item">
                            <div className="settings-item-left">
                                <div className="settings-icon" style={{ background: 'rgba(94, 92, 230, 0.15)', color: '#5E5CE6' }}><Moon size={18} /></div>
                                <span>Dark Mode</span>
                            </div>
                            <div className="theme-switch">
                                <span style={{ fontSize: 13, color: 'var(--text2)', marginRight: 8 }}>Always On</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support & About Section */}
                <div className="settings-section">
                    <div className="settings-section-title">Support</div>
                    <div className="settings-card">
                        <button className="settings-item">
                            <div className="settings-item-left">
                                <div className="settings-icon" style={{ background: 'rgba(100, 210, 255, 0.15)', color: '#64D2FF' }}><Settings size={18} /></div>
                                <span>Help Center</span>
                            </div>
                            <ChevronRight size={18} color="var(--text3)" />
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="settings-section" style={{ marginTop: 32 }}>
                    <div className="settings-card" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                        <button className="settings-item danger-item" onClick={signOut} style={{ justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius)' }}>
                            <LogOut size={18} />
                            <span style={{ fontWeight: 600 }}>Sign Out</span>
                        </button>
                    </div>
                </div>

                <div className="settings-section" style={{ marginTop: 16 }}>
                    <div className="settings-card" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                        <button className="settings-item delete-item" onClick={deleteAccount} style={{ justifyContent: 'center', background: 'rgba(255, 69, 58, 0.1)', color: '#FF453A', borderRadius: 'var(--radius)' }}>
                            <Trash2 size={18} />
                            <span style={{ fontWeight: 600 }}>Delete Account</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {showEditName && (
                <div className="modal-overlay modal-center" style={{ zIndex: 100 }}>
                    <div className="modal-backdrop" onClick={() => setShowEditName(false)} />
                    <div className="modal-sheet" style={{ textAlign: 'center', maxHeight: '85vh', overflowY: 'auto', paddingBottom: 40 }}>
                        <div className="sheet-title" style={{ marginBottom: 20 }}>Edit Personal Info</div>
                        
                        <div className="input-group" style={{ textAlign: 'left' }}>
                            <label className="input-label">Display Name</label>
                            <input className="input-field" placeholder="Enter your name" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>

                        <div className="input-group" style={{ textAlign: 'left' }}>
                            <label className="input-label">Country / Timezone</label>
                            <select className="input-field" value={timezone} onChange={e => setTimezone(e.target.value)} style={{ padding: '12px', background: 'var(--bg-subtle)' }}>
                                <option value="Asia/Seoul">🇰🇷 South Korea (Asia/Seoul)</option>
                                <option value="America/New_York">🇺🇸 USA - East (America/New_York)</option>
                                <option value="America/Los_Angeles">🇺🇸 USA - West (America/Los_Angeles)</option>
                                <option value="Europe/London">🇬🇧 UK (Europe/London)</option>
                                <option value="Europe/Paris">🇫🇷 France (Europe/Paris)</option>
                                <option value="Asia/Tokyo">🇯🇵 Japan (Asia/Tokyo)</option>
                                <option value="Australia/Sydney">🇦🇺 Australia (Australia/Sydney)</option>
                            </select>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Selected timezone will be used for AI and daily targets.</div>
                        </div>

                        <div className="input-group" style={{ textAlign: 'left', opacity: 0.6 }}>
                            <label className="input-label">Email Address</label>
                            <input className="input-field" value={user?.email || ''} disabled />
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Email cannot be changed directly here.</div>
                        </div>

                        <div className="input-group" style={{ textAlign: 'left', marginTop: 16 }}>
                            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>PRO Account (Unlimited AI)</span>
                                <input type="checkbox" checked={isPro} onChange={e => setIsPro(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                            </label>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Enable PRO to get unlimited AI workout suggestions!</div>
                        </div>
                        
                        <button className="btn btn-primary" onClick={saveName} disabled={isLoading} style={{ marginTop: 20 }}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button className="close-btn" onClick={() => setShowEditName(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
