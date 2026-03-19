import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Users, Target, Flame, Scale, Calendar, Activity, ArrowLeft, Crown, UserMinus, Trash2, Send, Lock, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const getLocalISODate = (d = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const catEmojis = { meal: '🥗', snack: '🍪', etc: '☕' };

function ProgressRing({ size = 50, progress = 0, color = "#FA114F" }) {
    const center = size / 2;
    const strokeWidth = 5;
    const radius = Math.max(0, (size - strokeWidth) / 2);
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - Math.min(progress, 1));
    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} opacity={0.15} />
                <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
        </div>
    );
}

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
    const [filterCategory, setFilterCategory] = useState('all');

    const [groupActivity, setGroupActivity] = useState([]);
    const [groupMembersProfile, setGroupMembersProfile] = useState([]);
    const [groupMembersWorkout, setGroupMembersWorkout] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('stats');
    const messagesEndRef = useRef(null);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const scrollRef = useRef(null);

    const isToday = (d) => d.toDateString() === new Date().toDateString();
    const isSelected = (d) => d.toDateString() === selectedDate.toDateString();

    useEffect(() => {
        const days = [];
        const today = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(d);
        }
        setCalendarDays(days);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            const active = scrollRef.current.querySelector('.day-pill.active');
            if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth' });
        }
    }, [calendarDays, selectedDate]);

    useEffect(() => { 
        if (user) { 
            if (activeGroupId) {
                fetchGroupDetails();
            } else {
                fetchGroups(); 
            }
        } 
    }, [user, activeGroupId, selectedDate]);

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

        const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
        setGroupMembersProfile(profiles || []);

        const todayDate = getLocalISODate(selectedDate);
        
        const { data: meals } = await supabase.from('meals').select('*').in('user_id', userIds).gte('created_at', `${todayDate}T00:00:00`).lte('created_at', `${todayDate}T23:59:59`).order('created_at', { ascending: false });
        setGroupActivity(meals || []);

        const { data: workouts } = await supabase.from('workout_logs').select('*').in('user_id', userIds).eq('log_date', todayDate);
        setGroupMembersWorkout(workouts || []);

        const { data: msgs } = await supabase.from('group_messages').select('*').eq('group_id', activeGroupId).order('created_at', { ascending: true });
        setMessages(msgs || []);
    };

    const fetchGroups = async () => {
        if (!user) return;
        const { data: members } = await supabase.from('group_members').select('group_id').eq('user_id', user.id);
        const myGroupIds = members?.map(m => m.group_id) || [];

        let myGroupsData = [];
        if (myGroupIds.length > 0) {
            const { data } = await supabase.from('diet_groups').select('*, group_members(count)').in('id', myGroupIds).order('created_at', { ascending: false });
            myGroupsData = data || [];
        }

        const { data: allPublicGroups } = await supabase.from('diet_groups').select('*, group_members(count)').eq('is_public', true).order('created_at', { ascending: false });
        if (allPublicGroups) setGroups(allPublicGroups.filter(g => !myGroupIds.includes(g.id)));
        setMyGroups(myGroupsData);
    };

    const createGroup = async () => {
        if (!user || !name) return;
        try {
            const { data: created, error } = await supabase.from('diet_groups').insert({
                name, description, category, password: password || null, target_value: parseFloat(targetValue) || null, leader_id: user.id, is_public: !password,
            }).select().single();
            if (error) { alert("그룹 생성 실패: " + error.message); return; }
            if (created) await supabase.from('group_members').insert({ group_id: created.id, user_id: user.id });
            setShowCreate(false); setName(''); setDescription(''); setCategory('calorie'); setTargetValue(''); setPassword('');
            fetchGroups();
        } catch (err) { alert("오류 발생"); }
    };

    const joinGroup = async (group) => {
        if (!user) return;
        if (group.password && prompt('Enter group password:') !== group.password) return alert('비밀번호가 틀렸습니다.');
        await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id });
        fetchGroups();
    };

    const kickMember = async (memberId) => {
        if (!confirm('정말 이 멤버를 퇴출하시겠습니까?')) return;
        await supabase.from('group_members').delete().eq('group_id', activeGroupId).eq('user_id', memberId);
        fetchGroupDetails();
    };

    const deleteGroup = async () => {
        if (!confirm('이 그룹을 완전히 삭제하시겠습니까?')) return;
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
        
        const h = profile?.height || 170;
        const w = profile?.weight || 70;
        const steps = workout ? workout.steps : 0;
        const exerciseCals = workout ? (workout.exercise_calories || 0) : 0;
        const distKm = (steps * (h * 0.00414)) / 1000;
        const burned = Math.round(distKm * w * 1.036) + exerciseCals;
        
        return { eaten, burned, targetEaten: profile?.target_calories ? Number(profile.target_calories) : 2000, targetBurned: profile?.target_burn ? Number(profile.target_burn) : 500 };
    };

    const goToPrevDay = () => {
        const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d);
    };
    const goToNextDay = () => {
        const d = new Date(selectedDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setSelectedDate(d);
    };
    const formatDateTitle = (d) => {
        if (isToday(d)) return 'Today';
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
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
                        <div className="page-title" style={{ padding: 0, marginBottom: 0 }}>{activeGroup.name}</div>
                    </div>
                    {isLeader && <button onClick={deleteGroup} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: 4 }}><Trash2 size={20} /></button>}
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
                    <>
                        <div className="date-strip" ref={scrollRef}>
                            {calendarDays.map((d, i) => {
                                const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                                return (
                                    <button key={i} className={`day-pill ${isSelected(d) ? 'active' : ''} ${isToday(d) ? 'today' : ''}`} onClick={() => setSelectedDate(new Date(d))}>
                                        <span className="day-pill-weekday">{dayLabel}</span>
                                        <span className="day-pill-date">{d.getDate()}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="date-nav">
                            <button className="date-nav-btn" onClick={goToPrevDay}><ChevronLeft size={20} /></button>
                            <div className="date-nav-title">{formatDateTitle(selectedDate)}</div>
                            <button className="date-nav-btn" onClick={goToNextDay} disabled={isToday(selectedDate)}><ChevronRight size={20} /></button>
                        </div>
                        <div style={{ padding: '0 16px' }}>
                            <div className="section-title" style={{ marginTop: 0 }}>Member Stats</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {groupMembersProfile.map(profile => {
                                const stats = getMemberStats(profile.id);
                                const memberName = profile.full_name || profile.email?.split('@')[0] || 'User';
                                const memberIsLeader = profile.id === activeGroup.leader_id;
                                const memberMeals = groupActivity.filter(m => m.user_id === profile.id);
                                
                                return (
                                    <div key={profile.id} className="group-card" style={{ padding: 16, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #AF52DE)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                                                    {memberName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {memberIsLeader && <Crown size={14} color="#FF9500" />}
                                                        {memberName}
                                                    </div>
                                                    {(isLeader && profile.id !== user.id) && (
                                                        <button onClick={() => kickMember(profile.id)} style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: 12, cursor: 'pointer', padding: 0, marginTop: 2 }}>Kick</button>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <ProgressRing size={48} progress={stats.eaten / stats.targetEaten} color="#FA114F" />
                                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Flame size={16} color="#FA114F" />
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{stats.eaten}</div>
                                                    <div style={{ fontSize: 9, color: 'var(--text2)' }}>섭취 (kcal)</div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <ProgressRing size={48} progress={stats.burned / stats.targetBurned} color="#34C759" />
                                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Activity size={16} color="#34C759" />
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{stats.burned}</div>
                                                    <div style={{ fontSize: 9, color: 'var(--text2)' }}>소모 (kcal)</div>
                                                </div>
                                            </div>
                                        </div>

                                        {memberMeals.length > 0 ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                                                {memberMeals.map(m => (
                                                    <div key={m.id} style={{ background: 'var(--bg-subtle)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                        {m.image_url && m.image_url !== 'manual' && (
                                                            <img src={m.image_url} alt="meal" style={{ width: '100%', height: 75, objectFit: 'cover' }} />
                                                        )}
                                                        <div style={{ padding: '8px 10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                <span>{catEmojis[m.meal_type || 'meal']}</span> {m.description || 'Meal'}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#FA114F', fontWeight: 700, marginTop: 4 }}>{m.calories} kcal</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0', background: 'var(--bg-subtle)', borderRadius: 12 }}>
                                                아직 식단이 기록되지 않았습니다.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    </>
                )}

                {activeTab === 'chat' && (
                    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
                            {messages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Group chat is empty.</div>
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
                    <input className="input-field" style={{ paddingLeft: 36, margin: 0, height: 40, background: 'var(--bg-subtle)' }} placeholder="Search groups..." onChange={(e) => {
                            const query = e.target.value.toLowerCase();
                            if (query) setGroups(groups => groups.filter(g => g.name.toLowerCase().includes(query)));
                            else fetchGroups();
                    }} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px', marginBottom: 16 }} className="hide-scrollbar">
                <button className={`gender-btn ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')} style={filterCategory === 'all' ? { background: 'var(--primary)', color: '#fff', padding: '6px 16px', whiteSpace: 'nowrap', borderRadius: '100px' } : { padding: '6px 16px', whiteSpace: 'nowrap', borderRadius: '100px' }}>
                    All
                </button>
                {Object.keys(categoryContents).map(key => (
                    <button key={key} className={`gender-btn ${filterCategory === key ? 'active' : ''}`} onClick={() => setFilterCategory(key)} style={filterCategory === key ? { background: categoryColors[key], color: '#fff', padding: '6px 16px', whiteSpace: 'nowrap', borderRadius: '100px' } : { padding: '6px 16px', whiteSpace: 'nowrap', borderRadius: '100px' }}>
                        {categoryContents[key]}
                    </button>
                ))}
            </div>

            {myGroups.filter(g => filterCategory === 'all' || g.category === filterCategory).length > 0 && (
                <>
                    <div className="section-title" style={{ marginTop: 16 }}>My Groups</div>
                    {myGroups.filter(g => filterCategory === 'all' || g.category === filterCategory).map(g => (
                        <div key={g.id} className="group-card" onClick={() => navigate(`/app/groups?id=${g.id}`)} style={{ cursor: 'pointer' }}>
                            <div className="group-header">
                                <div className="group-name">{g.name}</div>
                                <div className="group-badge" style={{ background: categoryColors[g.category] + '20', color: categoryColors[g.category] }}>{categoryContents[g.category]}</div>
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

            {groups.filter(g => filterCategory === 'all' || g.category === filterCategory).length > 0 && (
                <>
                    <div className="section-title" style={{ marginTop: 16 }}>Discover Groups</div>
                    {groups.filter(g => filterCategory === 'all' || g.category === filterCategory).map(g => (
                        <div key={g.id} className="group-card">
                            <div className="group-header">
                                <div className="group-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{g.password && <Lock size={14} color="var(--text2)" />} {g.name}</div>
                                <div className="group-badge" style={{ background: categoryColors[g.category] + '20', color: categoryColors[g.category] }}>{categoryContents[g.category]}</div>
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
                </div>
            )}

            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal-backdrop" onClick={() => setShowCreate(false)} />
                    <div className="modal-sheet">
                        <div className="sheet-handle" />
                        <div className="sheet-title">Create Group</div>
                        <div className="input-group"><label className="input-label">Group Name</label><input className="input-field" placeholder="e.g. Summer body 2026" value={name} onChange={e => setName(e.target.value)} /></div>
                        <div className="input-group"><label className="input-label">Description</label><textarea className="input-field" placeholder="What's this group about?" value={description} onChange={e => setDescription(e.target.value)} /></div>
                        <div className="input-group">
                            <label className="input-label">Category</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {Object.keys(categoryContents).map((key) => <button key={key} className={`gender-btn ${category === key ? 'active' : ''}`} style={category === key ? { background: categoryColors[key], color: '#fff' } : {}} onClick={() => setCategory(key)}>{categoryContents[key]}</button>)}
                            </div>
                        </div>
                        <div className="input-group"><label className="input-label">Target Value (optional)</label><input className="input-field" type="number" placeholder="e.g. 2000 calories" value={targetValue} onChange={e => setTargetValue(e.target.value)} /></div>
                        <div className="input-group"><label className="input-label">Password (optional)</label><input className="input-field" type="password" placeholder="Leave blank for public group" value={password} onChange={e => setPassword(e.target.value)} /></div>
                        <button className="btn btn-primary" onClick={createGroup}>Create Group</button>
                        <button className="close-btn" onClick={() => setShowCreate(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
