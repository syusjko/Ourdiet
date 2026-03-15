import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Users, Target, Flame, Scale, Calendar, Activity, ArrowLeft, Crown, UserMinus, Trash2, MessageCircle, Send, Lock, Search } from 'lucide-react';

export default function Groups() {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);
    const activeGroupId = searchParams.get('id');

    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('calorie');
    const [targetValue, setTargetValue] = useState('');
    const [password, setPassword] = useState('');

    const [groupActivity, setGroupActivity] = useState([]);
    const [groupMembersProfile, setGroupMembersProfile] = useState([]);
    const [groupMembersWorkout, setGroupMembersWorkout] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'chat'
    const messagesEndRef = useRef(null);

    useEffect(() => { 
        if (user) { 
            if (activeGroupId) {
                const isMember = myGroups.some(g => g.id === activeGroupId);
                // Even without checking here, RLS will block if they bypass it, but let's assume they are member
                // since they got here from "My Groups".
                fetchGroupDetails();
            } else {
                fetchGroups(); 
            }
        } 
    }, [user, activeGroupId, myGroups]);

    useEffect(() => {
        if (activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    const fetchGroupDetails = async () => {
        if (!user || !activeGroupId) return;
        const { data: group } = await supabase.from('diet_groups').select('*').eq('id', activeGroupId).single();
        if (group) setActiveGroup(group);

        const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', activeGroupId);
        if (!members || members.length === 0) return;
        const userIds = members.map(m => m.user_id);

        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, weight').in('id', userIds);
        setGroupMembersProfile(profiles || []);

        const todayDate = new Date().toISOString().split('T')[0];
        
        // Fetch meals for eaten calories
        const { data: meals } = await supabase.from('meals').select('*').in('user_id', userIds).gte('created_at', todayDate).order('created_at', { ascending: false });
        setGroupActivity(meals || []);

        // Fetch workouts
        const { data: workouts } = await supabase.from('workout_logs').select('*').in('user_id', userIds).eq('log_date', todayDate);
        setGroupMembersWorkout(workouts || []);

        // Fetch messages
        const { data: msgs } = await supabase.from('group_messages').select('*').eq('group_id', activeGroupId).order('created_at', { ascending: true });
        setMessages(msgs || []);
    };

    const fetchGroups = async () => {
        if (!user) return;
        const { data: members } = await supabase.from('group_members').select('group_id').eq('user_id', user.id);
        const myGroupIds = members?.map(m => m.group_id) || [];

        const { data: allGroups } = await supabase.from('diet_groups').select('*, group_members(count)').eq('is_public', true).order('created_at', { ascending: false });

        if (allGroups) {
            setGroups(allGroups.filter(g => !myGroupIds.includes(g.id)));
            setMyGroups(allGroups.filter(g => myGroupIds.includes(g.id) || g.leader_id === user.id));
        }
    };

    const createGroup = async () => {
        if (!user || !name) return;
        
        try {
            const { data: created, error } = await supabase.from('diet_groups').insert({
                name, 
                description, 
                category, 
                password: password || null,
                target_value: parseFloat(targetValue) || null,
                leader_id: user.id, 
                is_public: !password,
            }).select().single();

            if (error) {
                console.error("Error creating group:", error);
                alert("그룹 생성에 실패했습니다: " + error.message);
                return;
            }

            if (created) {
                const { error: memberError } = await supabase.from('group_members').insert({ 
                    group_id: created.id, 
                    user_id: user.id 
                });
                
                if (memberError) {
                    console.error("Error adding to members:", memberError);
                    alert("멤버 추가에 실패했습니다: " + memberError.message);
                }
            }

            setShowCreate(false);
            setName(''); 
            setDescription(''); 
            setCategory('calorie'); 
            setTargetValue(''); 
            setPassword('');
            fetchGroups();
        } catch (err) {
            console.error("Exception in createGroup:", err);
            alert("알 수 없는 오류가 발생했습니다.");
        }
    };

    const joinGroup = async (group) => {
        if (!user) return;
        if (group.password) {
            const input = prompt('Enter group password:');
            if (input !== group.password) {
                alert('비밀번호가 틀렸습니다.');
                return;
            }
        }
        await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
        fetchGroups();
    };

    const kickMember = async (memberId) => {
        if (!confirm('정말 이 멤버를 퇴출하시겠습니까?')) return;
        await supabase.from('group_members').delete().eq('group_id', activeGroupId).eq('user_id', memberId);
        fetchGroupDetails();
    };

    const deleteGroup = async () => {
        if (!confirm('이 그룹을 완전히 삭제하시겠습니까? 돌이킬 수 없습니다.')) return;
        await supabase.from('diet_groups').delete().eq('id', activeGroupId);
        navigate('/app/groups');
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !user) return;
        await supabase.from('group_messages').insert({ group_id: activeGroupId, user_id: user.id, message: newMessage });
        setNewMessage('');
        fetchGroupDetails();
    };

    const getMemberStats = (memberId) => {
        const eaten = groupActivity.filter(m => m.user_id === memberId).reduce((sum, m) => sum + (m.calories || 0), 0);
        const workout = groupMembersWorkout.find(w => w.user_id === memberId);
        const profile = groupMembersProfile.find(p => p.id === memberId);
        const weight = profile?.weight || 70;
        const steps = workout ? workout.steps : 0;
        const exerciseCals = workout ? (workout.exercise_calories || 0) : 0;
        const burned = Math.round(steps * weight * 0.0005) + exerciseCals;
        return { eaten, burned };
    };

    const categoryContents = {
        calorie: <><Flame size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Calorie</>,
        weight: <><Scale size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Weight</>,
        streak: <><Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Streak</>,
        activity: <><Activity size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Activity</>
    };
    const categoryColors = { calorie: '#FF9500', weight: '#0A84FF', streak: '#34C759', activity: '#AF52DE' };

    if (activeGroupId && activeGroup) {
        const isLeader = activeGroup.leader_id === user?.id;

        return (
            <div style={{ paddingBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => navigate('/app/groups')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ArrowLeft size={20} /></button>
                        <div className="page-title" style={{ padding: 0, marginBottom: 0 }}>{activeGroup.name || 'Group Activity'}</div>
                    </div>
                    {isLeader && (
                        <button onClick={deleteGroup} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: 4 }}><Trash2 size={20} /></button>
                    )}
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                    <button className={`tab-item ${activeTab === 'stats' ? 'active' : ''}`} style={{ flex: 1, padding: 12, borderBottom: activeTab === 'stats' ? '2px solid var(--primary)' : 'none' }} onClick={() => setActiveTab('stats')}>
                        Stats & Feed
                    </button>
                    <button className={`tab-item ${activeTab === 'chat' ? 'active' : ''}`} style={{ flex: 1, padding: 12, borderBottom: activeTab === 'chat' ? '2px solid var(--primary)' : 'none' }} onClick={() => setActiveTab('chat')}>
                        Group Chat
                    </button>
                </div>

                {activeTab === 'stats' && (
                    <div style={{ padding: '0 16px' }}>
                        {/* Member Stats */}
                        <div className="section-title" style={{ marginTop: 0 }}>Today's Member Stats</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                            {groupMembersProfile.map(profile => {
                                const stats = getMemberStats(profile.id);
                                const memberName = profile.full_name || profile.email?.split('@')[0] || 'User';
                                const memberIsLeader = profile.id === activeGroup.leader_id;
                                return (
                                    <div key={profile.id} className="group-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                {memberIsLeader && <Crown size={16} color="#FF9500" />}
                                                {memberName}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', gap: 12 }}>
                                                <span style={{ color: '#FA114F' }}>섭취: {stats.eaten} kcal</span>
                                                <span style={{ color: '#34C759' }}>소모: {stats.burned} kcal</span>
                                            </div>
                                        </div>
                                        {(isLeader && profile.id !== user.id) && (
                                            <button onClick={() => kickMember(profile.id)} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: 8 }}><UserMinus size={18} /></button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Feed */}
                        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Today's Feed</span>
                            <span style={{ fontSize: 13, fontWeight: 'normal', color: 'var(--text2)' }}>{groupActivity.length} posts</span>
                        </div>
                        {groupActivity.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>No activity today.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {groupActivity.map(meal => {
                                    const profile = groupMembersProfile.find(p => p.id === meal.user_id);
                                    const name = profile?.full_name || profile?.email?.split('@')[0] || 'User';
                                    return (
                                        <div key={meal.id} className="group-card" style={{ padding: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{name.charAt(0).toUpperCase()}</div>
                                                    {name}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(meal.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            </div>
                                            {meal.image_url && meal.image_url !== 'manual' && (
                                                <img src={meal.image_url} alt="meal" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 12 }} />
                                            )}
                                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{meal.description || 'Meal'}</div>
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--primary)', fontWeight: 600 }}>
                                                <Flame size={16} /> {meal.calories} kcal
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
                            {messages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Say hi to the group!</div>
                            ) : (
                                messages.map(msg => {
                                    const profile = groupMembersProfile.find(p => p.id === msg.user_id);
                                    const name = profile?.full_name || profile?.email?.split('@')[0] || 'User';
                                    const isMe = msg.user_id === user.id;
                                    return (
                                        <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                            {!isMe && <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2, marginLeft: 4 }}>{name}</div>}
                                            <div style={{ background: isMe ? 'var(--primary)' : 'var(--bg-subtle)', color: isMe ? '#fff' : 'var(--text)', padding: '10px 14px', borderRadius: 'var(--radius-md)', borderBottomRightRadius: isMe ? 2 : 'var(--radius-md)', borderTopLeftRadius: !isMe ? 2 : 'var(--radius-md)', wordBreak: 'break-word' }}>
                                                {msg.message}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                            <input className="input-field" placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} style={{ margin: 0, padding: '10px 14px' }} />
                            <button className="btn btn-primary" onClick={sendMessage} style={{ padding: '0 16px' }}><Send size={18} /></button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px' }}>
                <div className="page-title" style={{ padding: 0, marginBottom: 0 }}>Groups</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create</button>
            </div>

            <div style={{ padding: '8px 16px' }} className="mobile-only-search">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} color="var(--text2)" style={{ position: 'absolute', left: 12 }} />
                    <input 
                        className="input-field"
                        style={{ paddingLeft: 36, margin: 0, height: 40, background: 'var(--bg-subtle)' }}
                        placeholder="Search groups..." 
                        onChange={(e) => {
                            const query = e.target.value.toLowerCase();
                            if (query) {
                                setGroups(groups => groups.filter(g => g.name.toLowerCase().includes(query)));
                            } else {
                                fetchGroups();
                            }
                        }}
                    />
                </div>
            </div>

            {myGroups.length > 0 && (
                <>
                    <div className="section-title" style={{ marginTop: 16 }}>My Groups</div>
                    {myGroups.map(g => (
                        <div key={g.id} className="group-card" onClick={() => navigate(`/app/groups?id=${g.id}`)} style={{ cursor: 'pointer' }}>
                            <div className="group-header">
                                <div className="group-name">{g.name}</div>
                                <div className="group-badge" style={{ background: categoryColors[g.category] + '20', color: categoryColors[g.category] }}>
                                    {categoryContents[g.category]}
                                </div>
                            </div>
                            {g.description && <div className="group-desc">{g.description}</div>}
                            <div className="group-meta">
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={14} /> {g.group_members?.[0]?.count || 1} members</span>
                                {g.target_value && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Target size={14} /> {g.target_value}</span>}
                            </div>
                        </div>
                    ))}
                </>
            )}

            {groups.length > 0 && (
                <>
                    <div className="section-title" style={{ marginTop: 16 }}>Discover Groups</div>
                    {groups.map(g => (
                        <div key={g.id} className="group-card">
                            <div className="group-header">
                                <div className="group-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {g.password && <Lock size={14} color="var(--text2)" />}
                                    {g.name}
                                </div>
                                <div className="group-badge" style={{ background: categoryColors[g.category] + '20', color: categoryColors[g.category] }}>
                                    {categoryContents[g.category]}
                                </div>
                            </div>
                            {g.description && <div className="group-desc">{g.description}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <div className="group-meta"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={14} /> {g.group_members?.[0]?.count || 0} members</span></div>
                                <button className="btn btn-primary btn-sm" onClick={() => joinGroup(g)}>Join</button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {myGroups.length === 0 && groups.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text3)' }}><Users size={48} /></div>
                    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>No groups yet</div>
                    <div style={{ fontSize: 14 }}>Create or join a group to start!</div>
                </div>
            )}

            {/* Create Group Modal */}
            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal-backdrop" onClick={() => setShowCreate(false)} />
                    <div className="modal-sheet">
                        <div className="sheet-handle" />
                        <div className="sheet-title">Create Group</div>

                        <div className="input-group">
                            <label className="input-label">Group Name</label>
                            <input className="input-field" placeholder="e.g. Summer body 2026" value={name} onChange={e => setName(e.target.value)} />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Description</label>
                            <textarea className="input-field" placeholder="What's this group about?" value={description} onChange={e => setDescription(e.target.value)} />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Category</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {Object.keys(categoryContents).map((key) => (
                                    <button key={key} className={`gender-btn ${category === key ? 'active' : ''}`}
                                        style={category === key ? { background: categoryColors[key], color: '#fff' } : {}}
                                        onClick={() => setCategory(key)}>{categoryContents[key]}</button>
                                ))}
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Target Value (optional)</label>
                            <input className="input-field" type="number" placeholder="e.g. 2000 calories" value={targetValue} onChange={e => setTargetValue(e.target.value)} />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Password (optional, to make private)</label>
                            <input className="input-field" type="password" placeholder="Leave blank for public group" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>

                        <button className="btn btn-primary" onClick={createGroup}>Create Group</button>
                        <button className="close-btn" onClick={() => setShowCreate(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
