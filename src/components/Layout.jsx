import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useState, useEffect } from 'react';
import { Home, Scale, Users, User, Plus, Search, Bell, LogOut, Camera, Type, FileDigit } from 'lucide-react';

const NAV_ITEMS = [
    { path: '/dashboard', label: 'Home', icon: <Home size={20} /> },
    { path: '/weight', label: 'Body', icon: <Scale size={20} /> },
    { path: '/groups', label: 'Groups', icon: <Users size={20} /> },
    { path: '/profile', label: 'Profile', icon: <User size={20} /> },
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
};

const TAB_ICON_MAP = {
    '/dashboard': 'home',
    '/weight': 'scale',
    '/groups': 'groups',
    '/profile': 'profile',
};

function RightPanelWidgets() {
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
                    <span className="widget-stat-value">0 kcal</span>
                </div>
                <div className="widget-stat-row">
                    <span className="widget-stat-label" style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#32ADE6', marginRight: 6 }}></div> Steps</span>
                    <span className="widget-stat-value">0</span>
                </div>
                <div className="widget-stat-row">
                    <span className="widget-stat-label">Net</span>
                    <span className="widget-stat-value" style={{ color: 'var(--green)' }}>0 kcal</span>
                </div>
            </div>

            <div className="right-panel-card">
                <div className="right-panel-title">Quick Add</div>
                <div className="widget-quickadd">
                    <Link to="/new-post" className="widget-quickadd-btn"><Camera size={16} /> Photo</Link>
                    <Link to="/new-post" className="widget-quickadd-btn"><Type size={16} /> Text</Link>
                    <Link to="/new-post" className="widget-quickadd-btn"><FileDigit size={16} /> Manual</Link>
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
    const isNewPost = location.pathname === '/new-post';

    const signOut = () => {
        localStorage.removeItem('dummy_user');
        window.location.href = '/login';
    };

    return (
        <>
            {/* ===== DESKTOP HEADER ===== */}
            <header className="desktop-header">
                <div className="desktop-header-logo">OurDiet</div>
                <div className="desktop-header-right">
                    <div className="desktop-header-search">
                        <Search size={16} color="var(--text2)" />
                        <input placeholder="Search meals, friends..." />
                    </div>
                    <button className="desktop-header-btn"><Bell size={18} /></button>
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

                    <Link to="/new-post" className={`sidebar-item ${location.pathname === '/new-post' ? 'active' : ''}`}>
                        <span className="sidebar-icon"><Plus size={20} /></span>
                        <span>New Post</span>
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user" onClick={() => navigate('/profile')}>
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
                <RightPanelWidgets />
            </aside>

            {/* ===== DESKTOP FAB ===== */}
            {!isNewPost && (
                <button className="desktop-fab" onClick={() => navigate('/new-post')}>+</button>
            )}

            {/* ===== MOBILE HEADER ===== */}
            {!isNewPost && (
                <header className="mobile-header">
                    <div className="mobile-header-logo">OurDiet</div>
                    <div className="mobile-header-actions">
                        <button className="header-btn"><Bell size={18} /></button>
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
                        { path: '/dashboard', label: 'Home', icon: 'home' },
                        { path: '/weight', label: 'Body', icon: 'scale' },
                        { path: '/new-post', label: '', icon: 'add' },
                        { path: '/groups', label: 'Groups', icon: 'groups' },
                        { path: '/profile', label: 'Profile', icon: 'profile' },
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
