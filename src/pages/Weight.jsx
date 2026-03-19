import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ArrowUp, ArrowDown, Sun, CheckCircle } from 'lucide-react';

const getLocalISODate = (d = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const calculateBMR = (weight, height, age, gender) => {
    if (!weight || !height || !age) return 0;
    if (gender === 'male') return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

export default function Weight() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [logs, setLogs] = useState([]);
    const [newWeight, setNewWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [selectedMonths, setSelectedMonths] = useState(1);
    const [selectedLoss, setSelectedLoss] = useState(2);
    const [editField, setEditField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [chartPeriod, setChartPeriod] = useState('30D');
    const [todayLogged, setTodayLogged] = useState(false);
    const [todayWeight, setTodayWeight] = useState(null);

    useEffect(() => { if (user) { fetchProfile(); fetchLogs(); checkTodayLog(); } }, [user, chartPeriod]);

    useEffect(() => {
        const max = selectedMonths * 4;
        if (selectedLoss > max) {
            setSelectedLoss(max);
        }
    }, [selectedMonths, selectedLoss]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) { setProfile(data); setTargetWeight(data.target_weight?.toString() || ''); setTargetDate(data.target_date || ''); }
    };

    const fetchLogs = async () => {
        if (!user) return;
        let query = supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: true });
        if (chartPeriod !== 'ALL') {
            const now = new Date();
            const daysBack = chartPeriod === '7D' ? 7 : chartPeriod === '90D' ? 90 : 30;
            const startDate = new Date(now); startDate.setDate(startDate.getDate() - daysBack);
            query = query.gte('logged_at', startDate.toISOString());
        }
        const { data } = await query;
        if (data) setLogs(data);
    };

    const checkTodayLog = async () => {
        if (!user) return;
        const today = getLocalISODate(new Date());
        const { data } = await supabase.from('weight_logs').select('*').eq('user_id', user.id)
            .gte('logged_at', `${today}T00:00:00`).lte('logged_at', `${today}T23:59:59`)
            .limit(1);
        if (data && data.length > 0) {
            setTodayLogged(true);
            setTodayWeight(data[0].weight);
        } else {
            setTodayLogged(false);
            setTodayWeight(null);
        }
    };

    const addWeight = async () => {
        if (!user || !newWeight) return;
        const w = parseFloat(newWeight);
        await supabase.from('weight_logs').insert({ user_id: user.id, weight: w });
        await supabase.from('profiles').update({ weight: w }).eq('id', user.id);
        setNewWeight('');
        setTodayLogged(true);
        setTodayWeight(w);
        fetchProfile(); fetchLogs();
    };

    const saveGoal = async () => {
        if (!user) return;
        const currentWeightVal = logs.length > 0 ? logs[logs.length - 1]?.weight : (profile?.weight || 0);
        if (!currentWeightVal) {
            alert('Please record your current weight first.');
            return;
        }

        const finalTargetWeight = currentWeightVal - selectedLoss;
        const tDate = new Date();
        tDate.setMonth(tDate.getMonth() + selectedMonths);
        const targetDateStr = getLocalISODate(tDate);

        await supabase.from('profiles').update({ target_weight: finalTargetWeight, target_date: targetDateStr }).eq('id', user.id);
        alert('Goal saved!');
        fetchProfile();
    };

    const updateProfile = async (field, value) => {
        if (!user) return;
        await supabase.from('profiles').update({ [field]: value }).eq('id', user.id);
        setProfile({ ...profile, [field]: value });
        setEditField(null);
    };

    const currentWeight = logs.length > 0 ? logs[logs.length - 1]?.weight : (profile?.weight || 0);
    const previousWeight = logs.length > 1 ? logs[logs.length - 2]?.weight : currentWeight;
    const change = currentWeight - previousWeight;
    const bmr = calculateBMR(profile?.weight, profile?.height, profile?.age, profile?.gender || 'male');
    const dailyDeficit = profile?.target_weight && profile?.target_date
        ? Math.round(((currentWeight - profile.target_weight) * 7700) / Math.max(1, Math.ceil((new Date(profile.target_date).getTime() - Date.now()) / 86400000)))
        : 0;
    const daysLeft = profile?.target_date ? Math.max(0, Math.ceil((new Date(profile.target_date).getTime() - Date.now()) / 86400000)) : 0;

    // Calculate streak
    const getStreak = () => {
        if (logs.length === 0) return 0;
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i <= 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = getLocalISODate(checkDate);
            const hasLog = logs.some(l => l.logged_at?.startsWith(dateStr));
            if (hasLog) {
                streak++;
            } else if (i === 0) {
                continue; // today might not be logged yet
            } else {
                break;
            }
        }
        return streak;
    };
    const streak = getStreak();

    // Simple SVG chart
    const chartData = logs;
    const chartMin = chartData.length ? Math.min(...chartData.map(l => l.weight)) - 1 : 0;
    const chartMax = chartData.length ? Math.max(...chartData.map(l => l.weight)) + 1 : 100;
    const chartW = 320;
    const chartH = 160;

    const pathD = chartData.map((log, i) => {
        const x = (chartW / (chartData.length - 1 || 1)) * i;
        const y = chartH - ((log.weight - chartMin) / (chartMax - chartMin || 1)) * chartH;
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');

    const areaD = `M 0,${chartH} ${chartData.map((log, i) => {
        const x = (chartW / (chartData.length - 1 || 1)) * i;
        const y = chartH - ((log.weight - chartMin) / (chartMax - chartMin || 1)) * chartH;
        return `L ${x},${y}`;
    }).join(' ')} L ${chartW},${chartH} Z`;

    return (
        <div style={{ paddingBottom: 16 }}>
            {/* Morning Routine Check-in Card */}
            <div className={`morning-checkin-card ${todayLogged ? 'done' : ''}`}>
                <div className="morning-checkin-header">
                    {todayLogged ? (
                        <CheckCircle size={28} color="#34C759" />
                    ) : (
                        <Sun size={28} color="#FF9F0A" />
                    )}
                    <div>
                        <div className="morning-checkin-title">
                            {todayLogged ? 'Morning Check-in Complete ✓' : 'Morning Weight Check-in'}
                        </div>
                        <div className="morning-checkin-sub">
                            {todayLogged
                                ? `Today: ${todayWeight?.toFixed(1)} kg`
                                : 'Wake up → Bathroom → Weigh → Record'}
                        </div>
                    </div>
                </div>

                {todayLogged ? (
                    <div className="morning-checkin-done">
                        <div className="morning-checkin-weight">{todayWeight?.toFixed(1)} <span>kg</span></div>
                        {change !== 0 && (
                            <span className="weight-change" style={{ background: change > 0 ? 'rgba(255,69,58,0.15)' : 'rgba(48,209,88,0.15)', color: change > 0 ? '#FF453A' : '#30D158' }}>
                                {change > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {change > 0 ? '+' : ''}{change.toFixed(1)}
                            </span>
                        )}
                        {streak > 1 && (
                            <div className="morning-streak">🔥 {streak} day streak</div>
                        )}
                    </div>
                ) : (
                    <div className="morning-checkin-input">
                        <div className="morning-checkin-tip">
                            💡 Measure right after waking up & using the bathroom for consistency
                        </div>
                        <div className="weight-row">
                            <input className="weight-input" type="number" step="0.1" placeholder="Enter weight (kg)" value={newWeight} onChange={e => setNewWeight(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addWeight()} />
                            <button className="weight-add-btn" onClick={addWeight}>Record</button>
                        </div>
                        <div className="morning-skip-hint">Forgot? That's okay — skip today and try tomorrow!</div>
                    </div>
                )}
            </div>

            {/* Current Weight Summary */}
            <div className="card" style={{ margin: '0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Current Weight</div>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span className="weight-big">{currentWeight.toFixed(1)}</span>
                        <span className="weight-unit">kg</span>
                        {change !== 0 && (
                            <span className="weight-change" style={{ background: change > 0 ? 'rgba(255,69,58,0.15)' : 'rgba(48,209,88,0.15)', color: change > 0 ? '#FF453A' : '#30D158' }}>
                                {change > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {change > 0 ? '+' : ''}{change.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
                {profile?.target_weight && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Target Weight</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
                            <span className="weight-big" style={{ fontSize: 28, color: 'var(--primary)' }}>{profile.target_weight.toFixed(1)}</span>
                            <span className="weight-unit" style={{ fontSize: 14 }}>kg</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Goal Setting */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Weight Loss Goal</div>
                
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Timeframe</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[1, 2, 3, 4].map(m => (
                            <button 
                                key={m} 
                                className={`period-btn ${selectedMonths === m ? 'active' : ''}`} 
                                style={{ flex: 1, padding: '8px 0' }}
                                onClick={() => setSelectedMonths(m)}
                            >
                                {m} {m === 1 ? 'Month' : 'Months'}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Target Weight Loss (Max {selectedMonths * 4}kg)</div>
                    <select 
                        className="input-field" 
                        value={selectedLoss} 
                        onChange={e => setSelectedLoss(parseInt(e.target.value))}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15 }}
                    >
                        {Array.from({ length: selectedMonths * 4 }, (_, i) => i + 1).map(loss => {
                            const cw = currentWeight || profile?.weight || 70;
                            const tWeight = (cw - loss).toFixed(1);
                            return (
                                <option key={loss} value={loss}>
                                    Lose {loss}kg (Goal: {tWeight}kg)
                                </option>
                            );
                        })}
                    </select>
                </div>

                <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={saveGoal}>Set Goal</button>
                {profile?.target_weight && profile?.target_date && (
                    <div className="goal-summary">
                        <div style={{ fontSize: 14 }}>
                            To reach <strong style={{ color: 'var(--primary)' }}>{profile.target_weight}kg</strong> in <strong>{daysLeft} days</strong>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>Daily deficit: -{dailyDeficit} kcal</div>
                    </div>
                )}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="card" style={{ margin: '0 16px 16px' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Weight Progress</div>
                    <div className="period-selector">
                        {['7D', '30D', '90D', 'ALL'].map(p => (
                            <button key={p} className={`period-btn ${chartPeriod === p ? 'active' : ''}`} onClick={() => setChartPeriod(p)}>{p}</button>
                        ))}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <svg width={chartW} height={chartH + 20} viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ width: '100%', height: 'auto' }}>
                            <defs>
                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
                                </linearGradient>
                            </defs>
                            <path d={areaD} fill="url(#areaGrad)" />
                            <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {chartData.length > 0 && (() => {
                                const lastX = chartW - 5;
                                const lastY = chartH - ((chartData[chartData.length - 1].weight - chartMin) / (chartMax - chartMin || 1)) * chartH;
                                return <circle cx={lastX} cy={lastY} r={6} fill="var(--primary)" stroke="#fff" strokeWidth={2} />;
                            })()}
                        </svg>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                        <span>{chartMax.toFixed(0)} kg</span>
                        <span>{chartMin.toFixed(0)} kg</span>
                    </div>
                </div>
            )}

            {/* Body Info */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Body Info</div>
                <div className="body-info-grid">
                    <div className="info-item" onClick={() => { setEditField('height'); setEditValue(profile?.height?.toString() || ''); }}>
                        <div className="info-value">{profile?.height || '--'}</div>
                        <div className="info-label-text">Height (cm)</div>
                    </div>
                    <div className="info-item" onClick={() => { setEditField('age'); setEditValue(profile?.age?.toString() || ''); }}>
                        <div className="info-value">{profile?.age || '--'}</div>
                        <div className="info-label-text">Age</div>
                    </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 16, marginBottom: 8 }}>Gender</div>
                <div className="gender-row">
                    {['male', 'female'].map(g => (
                        <button key={g} className={`gender-btn ${profile?.gender === g ? 'active' : ''}`} onClick={() => updateProfile('gender', g)}>
                            {g === 'male' ? 'Male' : 'Female'}
                        </button>
                    ))}
                </div>
            </div>

            {/* BMR */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Daily Base Metabolism (BMR)</div>
                <div className="bmr-value">{bmr || '--'} <span className="bmr-unit">kcal/day</span></div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Calories your body burns at rest</div>
            </div>

            {/* History */}
            <div className="section-title">History</div>
            {logs.slice(-10).reverse().map(log => (
                <div key={log.id} className="log-row">
                    <div className="log-weight">{log.weight.toFixed(1)} kg</div>
                    <div className="log-date">{new Date(log.logged_at).toLocaleDateString()}</div>
                </div>
            ))}

            {/* Edit Modal */}
            {editField && (
                <div className="modal-overlay modal-center">
                    <div className="modal-backdrop" onClick={() => setEditField(null)} />
                    <div className="modal-sheet" style={{ padding: 24, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Edit {editField}</div>
                        <input className="input-field" type="number" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            style={{ textAlign: 'center', fontSize: 24, marginBottom: 16 }} />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setEditField(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => updateProfile(editField, parseInt(editValue))}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
