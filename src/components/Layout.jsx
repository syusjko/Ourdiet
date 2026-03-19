import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useState, useEffect } from 'react';
import { Home, Scale, Users, User, Plus, Search, LogOut, Camera, Type, FileDigit, Dumbbell, Zap, Activity, Footprints, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getTokens } from '../services/token';

const NAV_ITEMS = [
    { path: '/app/dashboard', label: 'Home', icon: <Home size={20} /> },
    { path: '/app/weight', label: 'Body', icon: <Scale size={20} /> },
    { path: '/app/workout', label: 'Workout', icon: <Dumbbell size={20} /> },
    { path: '/app/groups', label: 'Groups', icon: <Users size={20} /> },
    { path: '/app/profile', label: 'Settings', icon: <User size={20} /> },
];

const tabIcons = {
    home: (active) => (
        <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
    ),
    scale: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.15 : 1} />
            <path d="M12 8v8M8 12h8" />
        </svg>
    ),
    add: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    groups: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.15 : 1} />
            <circle cx="9" cy="7" r="4" fill={active ? 'currentColor' : 'none'} />
        </svg>
    ),
    profile: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.15 : 1} />
            <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} />
        </svg>
    ),
    workout: (active) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6.5 6.5a2 2 0 1 1 0 4h-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a2 2 0 1 1 0 4" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.15 : 1} />
            <path d="M17.5 6.5a2 2 0 1 0 0 4h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-1a2 2 0 1 0 0 4" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.15 : 1} />
            <line x1="6.5" y1="12" x2="17.5" y2="12" />
        </svg>
    ),
};

const TAB_ICON_MAP = {
    '/app/dashboard': 'home',
    '/app/weight': 'scale',
    '/app/workout': 'workout',
    '/app/groups': 'groups',
    '/app/profile': 'profile',
};

const calculateBMR = (weight, height, age, gender) => {
    if (!weight || !height || !age) return 0;
    if (gender === 'male') return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

function RightPanelWidgets({ user }) {
    const [profile, setProfile] = useState(null);
    const [steps, setSteps] = useState(0);
    const [activeCalories, setActiveCalories] = useState(0);

    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (data) setProfile(data);
            };
            fetchProfile();

            const loadLocal = () => {
                const dateStr = new Date().toISOString().split('T')[0];
                const savedSteps = localStorage.getItem(`steps_${dateStr}`);
                const savedCal = localStorage.getItem(`activeCal_${dateStr}`);
                setSteps(savedSteps ? parseInt(savedSteps) : 0);
                setActiveCalories(savedCal ? parseInt(savedCal) : 0);
            };
            loadLocal();
            
            const interval = setInterval(loadLocal, 2000); // Polling for quick stats update
            return () => clearInterval(interval);
        }
    }, [user]);

    const bmrFull = calculateBMR(profile?.weight, profile?.height, profile?.age, profile?.gender || 'male');

    return (
        <>
            <div className="right-panel-card">
                <div className="right-panel-title">Today's Summary</div>
                <div className="widget-stat-row">
                    <span className="widget-stat-label" style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FA114F', marginRight: 6 }}></div> Consumed</span>
                    <span className="widget-stat-value">0 kcal</span>
                </div>
                <div className="widget-stat-row">
                    <span className="widget-stat-label" style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34C759', marginRight: 6 }}></div> Burned</span>
                    <span className="widget-stat-value">{bmrFull + activeCalories + Math.round(steps * (profile?.weight || 70) * 0.0005)} kcal</span>
                </div>
                <div className="widget-stat-row">
                    <span className="widget-stat-label" style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#32ADE6', marginRight: 6 }}></div> Steps</span>
                    <span className="widget-stat-value">{steps.toLocaleString()}</span>
                </div>
                <div className="widget-stat-row">
                    <span className="widget-stat-label">Net</span>
                    <span className="widget-stat-value" style={{ color: 'var(--green)' }}>0 kcal</span>
                </div>
            </div>

            <div className="right-panel-card">
                <div className="right-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <Zap size={14} /> Quick Stats
                </div>
                <div className="workout-quick-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div className="workout-stat-card" style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="workout-stat-icon" style={{ background: 'rgba(255,149,0,0.12)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}><Activity size={18} color="#FF9500" /></div>
                        <div className="workout-stat-value" style={{ fontSize: 18, fontWeight: 700 }}>{bmrFull}</div>
                        <div className="workout-stat-label" style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Daily BMR</div>
                    </div>
                    <div className="workout-stat-card" style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="workout-stat-icon" style={{ background: 'rgba(50,173,230,0.12)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}><Footprints size={18} color="#32ADE6" /></div>
                        <div className="workout-stat-value" style={{ fontSize: 18, fontWeight: 700 }}>{steps.toLocaleString()}</div>
                        <div className="workout-stat-label" style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Steps</div>
                    </div>
                    <div className="workout-stat-card" style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="workout-stat-icon" style={{ background: 'rgba(175,82,222,0.12)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}><Dumbbell size={18} color="#AF52DE" /></div>
                        <div className="workout-stat-value" style={{ fontSize: 18, fontWeight: 700 }}>{activeCalories}</div>
                        <div className="workout-stat-label" style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Exercise</div>
                    </div>
                </div>
            </div>

            <div className="right-panel-card">
                <div className="right-panel-title">Quick Add</div>
                <div className="widget-quickadd">
                    <Link to="/app/new-post" className="widget-quickadd-btn"><Camera size={16} /> Photo</Link>
                    <Link to="/app/new-post" className="widget-quickadd-btn"><Type size={16} /> Text</Link>
                    <Link to="/app/new-post" className="widget-quickadd-btn"><FileDigit size={16} /> Manual</Link>
                </div>
            </div>

            <div className="right-panel-card">
                <div className="right-panel-title">Weekly Goal</div>
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text2)', fontSize: 13 }}>
                    Set a weight loss goal in<br />the Body tab to track progress
                </div>
            </div>
        </>
    );
}

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNewPost = location.pathname === '/app/new-post';

    const [aiTokens, setAiTokens] = useState(3);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        if (user) {
            const updateTokens = async () => setAiTokens(await getTokens(user.id));
            updateTokens();
            window.addEventListener('tokens_updated', updateTokens);
            return () => window.removeEventListener('tokens_updated', updateTokens);
        }
    }, [user, location.pathname]);

    useEffect(() => {
        const performSearch = async () => {
            if (searchQuery.trim().length > 0) {
                const { data } = await supabase.from('diet_groups').select('id, name, category, description').ilike('name', `%${searchQuery}%`).limit(5);
                setSearchResults(data || []);
            } else {
                setSearchResults([]);
            }
        };
        const timeoutId = setTimeout(performSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const signOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <>
            {/* ===== DESKTOP HEADER ===== */}
            <header className="desktop-header">
                <div className="desktop-header-logo">OurDiet</div>
                <div className="desktop-header-right">
                    <div style={{ marginRight: 16, fontSize: 14, fontWeight: 'bold', color: 'var(--primary)' }}>
                        <Sparkles size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {aiTokens === 'PRO' ? 'PRO' : `${aiTokens} Tokens`}
                    </div>
                    <div className="desktop-header-search" style={{ position: 'relative' }}>
                        <Search size={16} color="var(--text2)" />
                        <input 
                            placeholder="Search groups..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchResults.length > 0 && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, 
                                background: 'var(--bg-card)', border: '1px solid var(--border)', 
                                borderRadius: 'var(--radius-md)', zIndex: 100, marginTop: 4,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden'
                            }}>
                                {searchResults.map(result => (
                                    <div key={result.id} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => { navigate(`/app/groups?id=${result.id}`); setSearchQuery(''); }}>
                                        <div style={{ fontWeight: 500, fontSize: 14 }}>{result.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{result.description}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="desktop-header-btn" onClick={() => navigate('/app/profile')} style={{ padding: 0, width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #AF52DE)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, border: 'none' }}>
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </button>
                    <button className="desktop-header-btn" onClick={signOut}><LogOut size={18} /></button>
                </div>
            </header>

            {/* ===== LEFT SIDEBAR (Desktop) ===== */}
            <aside className="sidebar">
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}

                    <div className="sidebar-divider" />

                    <Link to="/app/new-post" className={`sidebar-item ${location.pathname === '/app/new-post' ? 'active' : ''}`}>
                        <span className="sidebar-icon"><Plus size={20} /></span>
                        <span>New Post</span>
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user" onClick={() => navigate('/app/profile')}>
                        <div className="sidebar-user-avatar">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user?.full_name || user?.email?.split('@')[0] || 'User'}</div>
                            <div className="sidebar-user-email">{user?.email || ''}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ===== RIGHT PANEL (Desktop) ===== */}
            <aside className="right-panel">
                <RightPanelWidgets user={user} />
            </aside>

            {/* ===== DESKTOP FAB ===== */}
            {!isNewPost && (
                <button className="desktop-fab" onClick={() => navigate('/app/new-post')}>+</button>
            )}

            {/* ===== MOBILE HEADER ===== */}
            {!isNewPost && (
                <header className="mobile-header">
                    <div className="mobile-header-logo">OurDiet</div>
                    <div className="mobile-header-actions" style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ marginRight: 12, fontSize: 13, fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                            <Sparkles size={14} style={{ marginRight: 4 }} />
                            {aiTokens === 'PRO' ? 'PRO' : aiTokens}
                        </div>
                        <button className="header-btn" onClick={() => navigate('/app/profile')} style={{ padding: 0, width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #AF52DE)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, border: 'none', marginLeft: 4 }}>
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </button>
                    </div>
                </header>
            )}

            {/* ===== MAIN CONTENT ===== */}
            <div className="desktop-content">
                <div className="desktop-content-inner">
                    <div className="mobile-content">
                        <Outlet />
                    </div>
                </div>
            </div>

            {/* ===== BOTTOM TAB BAR (Mobile) ===== */}
            {!isNewPost && (
                <nav className="tab-bar">
                    {[
                        { path: '/app/dashboard', label: 'Home', icon: 'home' },
                        { path: '/app/weight', label: 'Body', icon: 'scale' },
                        { path: '/app/new-post', label: '', icon: 'add' },
                        { path: '/app/workout', label: 'Workout', icon: 'workout' },
                        { path: '/app/groups', label: 'Groups', icon: 'groups' },
                    ].map(tab => {
                        const isActive = location.pathname === tab.path;
                        const isAdd = tab.icon === 'add';
                        return (
                            <button
                                key={tab.path}
                                className={`tab-item ${isActive ? 'active' : ''}`}
                                onClick={() => navigate(tab.path)}
                            >
                                {isAdd ? (
                                    <div className="tab-add-btn">{tabIcons.add()}</div>
                                ) : (
                                    <>
                                        {tabIcons[tab.icon](isActive)}
                                        <span>{tab.label}</span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </nav>
            )}
        </>
    );
}
