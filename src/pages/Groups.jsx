import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Users, Target, Flame, Scale, Calendar, Activity } from 'lucide-react';

export default function Groups() {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('calorie');
    const [targetValue, setTargetValue] = useState('');

    useEffect(() => { if (user) { fetchGroups(); } }, [user]);

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
        await supabase.from('diet_groups').insert({
            name, description, category,
            target_value: parseFloat(targetValue) || null,
            leader_id: user.id, is_public: true,
        });
        const { data: created } = await supabase.from('diet_groups').select('id').eq('leader_id', user.id).order('created_at', { ascending: false }).limit(1).single();
        if (created) await supabase.from('group_members').insert({ group_id: created.id, user_id: user.id });
        setShowCreate(false);
        setName(''); setDescription(''); setCategory('calorie'); setTargetValue('');
        fetchGroups();
    };

    const joinGroup = async (groupId) => {
        if (!user) return;
        await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id });
        fetchGroups();
    };

    const categoryContents = {
        calorie: <><Flame size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Calorie</>,
        weight: <><Scale size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Weight</>,
        streak: <><Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Streak</>,
        activity: <><Activity size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />Activity</>
    };
    const categoryColors = { calorie: '#FF9500', weight: '#0A84FF', streak: '#34C759', activity: '#AF52DE' };

    return (
        <div style={{ paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 8px' }}>
                <div className="page-title" style={{ padding: 0, marginBottom: 0 }}>Groups</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create</button>
            </div>

            {myGroups.length > 0 && (
                <>
                    <div className="section-title" style={{ marginTop: 16 }}>My Groups</div>
                    {myGroups.map(g => (
                        <div key={g.id} className="group-card">
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
                                <div className="group-name">{g.name}</div>
                                <div className="group-badge" style={{ background: categoryColors[g.category] + '20', color: categoryColors[g.category] }}>
                                    {categoryContents[g.category]}
                                </div>
                            </div>
                            {g.description && <div className="group-desc">{g.description}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <div className="group-meta"><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={14} /> {g.group_members?.[0]?.count || 0} members</span></div>
                                <button className="btn btn-primary btn-sm" onClick={() => joinGroup(g.id)}>Join</button>
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

                        <button className="btn btn-primary" onClick={createGroup}>Create Group</button>
                        <button className="close-btn" onClick={() => setShowCreate(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
