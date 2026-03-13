import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Utensils, Search, Users } from 'lucide-react';

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [friendsCount, setFriendsCount] = useState(0);
    const [showEdit, setShowEdit] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showFriends, setShowFriends] = useState(false);

    useEffect(() => { if (user) { fetchProfile(); fetchPosts(); fetchFriendsCount(); } }, [user]);
    useEffect(() => { if (searchQuery.length > 0) searchUsers(); else setSearchResults([]); }, [searchQuery]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) { setProfile(data); setEditName(data.full_name || ''); setEditBio(data.bio || ''); }
    };

    const fetchPosts = async () => {
        if (!user) return;
        const { data } = await supabase.from('meals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setPosts(data);
    };

    const fetchFriendsCount = async () => {
        if (!user) return;
        const { count } = await supabase.from('friendships').select('*', { count: 'exact', head: true }).or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq('status', 'accepted');
        setFriendsCount(count || 0);
    };

    const fetchFriends = async () => {
        if (!user) return;
        const { data } = await supabase.from('friendships')
            .select('*, friend:friend_id (id, email, full_name), requester:user_id (id, email, full_name)')
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq('status', 'accepted');
        if (data) setFriends(data.map(f => ({ ...f, profile: f.user_id === user.id ? f.friend : f.requester })));
    };

    const searchUsers = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('id, email, full_name').ilike('email', `%${searchQuery}%`).neq('id', user.id).limit(5);
        if (data) setSearchResults(data);
    };

    const sendRequest = async (friendId) => {
        if (!user) return;
        await supabase.from('friendships').insert({ user_id: user.id, friend_id: friendId, status: 'pending' });
        setSearchQuery(''); setSearchResults([]);
        alert('Friend request sent!');
    };

    const saveProfile = async () => {
        if (!user) return;
        await supabase.from('profiles').update({ full_name: editName, bio: editBio }).eq('id', user.id);
        fetchProfile();
        setShowEdit(false);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const groupPostsByDate = (posts) => {
        const groups = {};
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

        posts.forEach(post => {
            const date = new Date(post.created_at);
            let key;
            if (date.toDateString() === today.toDateString()) key = 'Today';
            else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';
            else key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(post);
        });

        return Object.entries(groups).map(([title, data]) => ({ title, data }));
    };

    const groupedPosts = groupPostsByDate(posts);

    return (
        <div style={{ paddingBottom: 16 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{profile?.full_name || user?.email?.split('@')[0]}</div>
                <button onClick={signOut} style={{ background: 'none', color: 'var(--text2)', fontSize: 14, fontWeight: 500 }}>Sign Out</button>
            </div>

            {/* Profile Card */}
            <div className="profile-card">
                <div className="profile-top">
                    <div className="profile-avatar">
                        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-stats">
                        <div className="stat-item">
                            <div className="stat-number">{posts.length}</div>
                            <div className="stat-label">posts</div>
                        </div>
                        <div className="stat-item" onClick={() => { setShowFriends(true); fetchFriends(); }} style={{ cursor: 'pointer' }}>
                            <div className="stat-number">{friendsCount}</div>
                            <div className="stat-label">friends</div>
                        </div>
                    </div>
                </div>
                <div className="profile-info">
                    <div className="display-name">{profile?.full_name || 'Add your name'}</div>
                    {profile?.bio && <div className="bio-text">{profile.bio}</div>}
                </div>
                <button className="edit-profile-btn" onClick={() => setShowEdit(true)}>Edit Profile</button>
            </div>

            {/* Posts */}
            {groupedPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: 'var(--text3)' }}><Utensils size={48} /></div>
                    Share your first meal!
                </div>
            ) : (
                groupedPosts.map(section => (
                    <div key={section.title}>
                        <div className="date-header">{section.title}</div>
                        <div className="posts-grid">
                            {section.data.map(post => (
                                <div key={post.id} className="grid-item">
                                    {post.image_url && post.image_url !== 'manual' ? (
                                        <img src={post.image_url} alt={post.description} />
                                    ) : (
                                        <div className="grid-placeholder">
                                            <div className="grid-cal">{post.calories}</div>
                                            <div className="grid-unit-text">kcal</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Edit Profile Modal */}
            {showEdit && (
                <div className="modal-overlay modal-center">
                    <div className="modal-backdrop" onClick={() => setShowEdit(false)} />
                    <div className="modal-sheet" style={{ textAlign: 'center' }}>
                        <div className="sheet-handle" />
                        <div className="sheet-title">Edit Profile</div>
                        <div className="profile-avatar" style={{ margin: '0 auto 16px', width: 90, height: 90, fontSize: 36 }}>
                            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : editName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="input-group" style={{ textAlign: 'left' }}>
                            <label className="input-label">Name</label>
                            <input className="input-field" placeholder="Your name" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="input-group" style={{ textAlign: 'left' }}>
                            <label className="input-label">Bio</label>
                            <textarea className="input-field" placeholder="Tell us about yourself..." value={editBio} onChange={e => setEditBio(e.target.value)} />
                        </div>
                        <button className="btn btn-primary" onClick={saveProfile}>Save Changes</button>
                        <button className="close-btn" onClick={() => setShowEdit(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Friends Modal */}
            {showFriends && (
                <div className="modal-overlay">
                    <div className="modal-backdrop" onClick={() => setShowFriends(false)} />
                    <div className="modal-sheet">
                        <div className="sheet-handle" />
                        <div className="sheet-title">Friends</div>

                        <div className="search-box" style={{ margin: '0 0 16px' }}>
                            <Search size={18} color="var(--text2)" />
                            <input className="search-input" placeholder="Search by email..." value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)} autoCapitalize="off" />
                        </div>

                        {searchResults.map(r => (
                            <div key={r.id} className="friend-card" style={{ margin: '0 0 8px' }}>
                                <div className="avatar avatar-fallback" style={{ background: 'var(--blue)' }}>{r.email.charAt(0).toUpperCase()}</div>
                                <div className="friend-info">
                                    <div className="friend-name">{r.full_name || r.email.split('@')[0]}</div>
                                    <div className="friend-sub">{r.email}</div>
                                </div>
                                <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => sendRequest(r.id)}>Add</button>
                            </div>
                        ))}

                        {friends.map(f => (
                            <div key={f.id} className="friend-card" style={{ margin: '0 0 8px' }}>
                                <div className="avatar avatar-fallback" style={{ background: 'var(--blue)' }}>{f.profile?.email?.charAt(0).toUpperCase()}</div>
                                <div className="friend-info">
                                    <div className="friend-name">{f.profile?.full_name || f.profile?.email?.split('@')[0]}</div>
                                    <div className="friend-sub">View profile</div>
                                </div>
                                <span style={{ color: 'var(--text3)' }}>›</span>
                            </div>
                        ))}

                        {friends.length === 0 && searchResults.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text3)' }}><Users size={48} /></div>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>No friends yet</div>
                                <div style={{ fontSize: 13 }}>Search by email above</div>
                            </div>
                        )}

                        <button className="close-btn" onClick={() => setShowFriends(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
