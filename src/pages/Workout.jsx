import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Flame, Footprints, Dumbbell, Activity, Edit, ChevronLeft, ChevronRight, TrendingUp, Zap, Sparkles, Trash2, Check, X } from 'lucide-react';
import { analyzeExerciseText } from '../services/ai';

const calculateBMR = (weight, height, age, gender) => {
    if (!weight || !height || !age) return 0;
    if (gender === 'male') return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

export default function Workout() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [steps, setSteps] = useState(0);
    const [activeCalories, setActiveCalories] = useState(0);
    const [aiTokens, setAiTokens] = useState(3);
    const [stepsInput, setStepsInput] = useState('');
    const [activeCalInput, setActiveCalInput] = useState('');
    const [editingSteps, setEditingSteps] = useState(false);
    const [editingExercise, setEditingExercise] = useState(false);
    const [aiExerciseInput, setAiExerciseInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [weeklyBurnData, setWeeklyBurnData] = useState([]);

    const isToday = (d) => d.toDateString() === new Date().toDateString();

    const bmrFull = calculateBMR(profile?.weight, profile?.height, profile?.age, profile?.gender || 'male');

    const getTimeFraction = () => {
        if (!isToday(selectedDate)) return 1;
        const now = new Date();
        const hoursElapsed = now.getHours() + now.getMinutes() / 60;
        return hoursElapsed / 24;
    };
    const bmrBurned = Math.round(bmrFull * getTimeFraction());

    const weight = profile?.weight || 70;
    const stepCalories = Math.round(steps * weight * 0.0005);
    const totalBurned = bmrBurned + stepCalories + activeCalories;

    useEffect(() => { if (user) fetchProfile(); }, [user]);
    useEffect(() => { if (user) fetchProfile(); }, [user]);
    useEffect(() => {
        if (user) {
            loadWorkoutData(selectedDate);
            fetchWeeklyBurnData();
        }
    }, [selectedDate, user]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

    const loadWorkoutData = async (date) => {
        const dateStr = date.toISOString().split('T')[0];
        const { data } = await supabase.from('workout_logs')
            .select('steps, exercise_calories')
            .eq('user_id', user.id)
            .eq('log_date', dateStr)
            .maybeSingle();

        if (data) {
            setSteps(data.steps || 0);
            setActiveCalories(data.exercise_calories || 0);
        } else {
            setSteps(0);
            setActiveCalories(0);
        }
        
        // AI Tokens logic (3 per day per user)
        const tokenKey = `ai_tokens_${user.id}_${dateStr}`;
        const storedTokens = localStorage.getItem(tokenKey);
        if (storedTokens !== null) {
            setAiTokens(parseInt(storedTokens));
        } else {
            localStorage.setItem(tokenKey, '3');
            setAiTokens(3);
        }
    };

    const fetchWeeklyBurnData = async () => {
        if (!user) return;
        const ed = new Date();
        const sd = new Date();
        sd.setDate(sd.getDate() - 6);
        
        const endStr = ed.toISOString().split('T')[0];
        const startStr = sd.toISOString().split('T')[0];

        const { data: logs } = await supabase.from('workout_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('log_date', startStr)
            .lte('log_date', endStr);
            
        const dataMap = {};
        if (logs) {
            logs.forEach(log => {
                dataMap[log.log_date] = log;
            });
        }

        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayLog = dataMap[dateStr] || { steps: 0, exercise_calories: 0 };
            const s = dayLog.steps || 0;
            const a = dayLog.exercise_calories || 0;
            const dayBmr = i === 0 ? bmrBurned : bmrFull;
            const dayStepCal = Math.round(s * weight * 0.0005);
            
            data.push({
                date: dateStr,
                day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
                steps: s,
                exercise: a,
                bmr: dayBmr,
                stepCal: dayStepCal,
                total: dayBmr + dayStepCal + a,
            });
        }
        setWeeklyBurnData(data);
    };

    const updateWorkoutLog = async (newSteps, newCals) => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        await supabase.from('workout_logs').upsert({
            user_id: user.id,
            log_date: dateStr,
            steps: newSteps,
            exercise_calories: newCals,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, log_date' });
        fetchWeeklyBurnData(); // Refresh chart after updating
    };

    const saveSteps = async () => {
        const v = parseInt(stepsInput);
        if (!isNaN(v)) {
            setSteps(v);
            setStepsInput('');
            setEditingSteps(false);
            await updateWorkoutLog(v, activeCalories);
        }
    };

    const clearSteps = async () => {
        setSteps(0);
        await updateWorkoutLog(0, activeCalories);
    };

    const saveActiveCal = async () => {
        const v = parseInt(activeCalInput);
        if (!isNaN(v)) {
            setActiveCalories(v);
            setActiveCalInput('');
            setEditingExercise(false);
            await updateWorkoutLog(steps, v);
        }
    };

    const clearActiveCal = async () => {
        setActiveCalories(0);
        await updateWorkoutLog(steps, 0);
    };

    const handleAiSuggest = async () => {
        if (!aiExerciseInput.trim() || isAiLoading) return;
        if (aiTokens <= 0) {
            alert("You have used all 3 AI tokens for today!");
            return;
        }
        
        setIsAiLoading(true);
        setAiResult(null);
        try {
            const result = await analyzeExerciseText(aiExerciseInput, profile?.weight || 70);
            if (result && result.caloriesBurned) {
                setAiResult(result);
                // Deduct token on success
                const newTokens = aiTokens - 1;
                setAiTokens(newTokens);
                const sd = selectedDate.toISOString().split('T')[0];
                localStorage.setItem(`ai_tokens_${user.id}_${sd}`, newTokens.toString());
            } else {
                alert("Couldn't analyze the exercise. Please try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Error analyzing exercise.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const applyAiResult = async () => {
        if (aiResult && aiResult.caloriesBurned) {
            const currentCals = activeCalories || 0;
            const newCals = currentCals + aiResult.caloriesBurned;
            setActiveCalories(newCals);
            await updateWorkoutLog(steps, newCals);
            setAiExerciseInput('');
            setAiResult(null);
        }
    };

    const goToPrevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d);
    };

    const goToNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        if (d <= new Date()) setSelectedDate(d);
    };

    const formatDateTitle = (d) => {
        if (isToday(d)) return 'Today';
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    };

    const maxBurn = weeklyBurnData.length > 0 ? Math.max(...weeklyBurnData.map(d => d.total), 1) : 1;

    return (
        <div style={{ paddingBottom: 16 }}>
            {/* Page Title */}
            <div className="workout-header">
                <div className="workout-header-icon">
                    <Dumbbell size={24} />
                </div>
                <div>
                    <div className="workout-header-title">Workout</div>
                    <div className="workout-header-sub">Track your activity & burn</div>
                </div>
            </div>

            {/* Date Navigation */}
            <div className="date-nav" style={{ margin: '0 16px 16px' }}>
                <button className="date-nav-btn" onClick={goToPrevDay}><ChevronLeft size={20} /></button>
                <div className="date-nav-title">{formatDateTitle(selectedDate)}</div>
                <button className="date-nav-btn" onClick={goToNextDay} disabled={isToday(selectedDate)}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Total Burn Hero */}
            <div className="workout-hero">
                <div className="workout-hero-ring">
                    <svg width={120} height={120}>
                        <defs>
                            <linearGradient id="burnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FF9500" />
                                <stop offset="100%" stopColor="#FA114F" />
                            </linearGradient>
                        </defs>
                        <circle cx={60} cy={60} r={52} fill="none" stroke="rgba(255,149,0,0.15)" strokeWidth={10} />
                        <circle cx={60} cy={60} r={52} fill="none" stroke="url(#burnGrad)" strokeWidth={10}
                            strokeDasharray={2 * Math.PI * 52}
                            strokeDashoffset={2 * Math.PI * 52 * (1 - Math.min(totalBurned / (bmrFull + (profile?.target_burn || 500)), 1))}
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                    </svg>
                    <div className="workout-hero-value">
                        <Flame size={18} color="#FF9500" />
                        <span className="workout-hero-number">{totalBurned}</span>
                        <span className="workout-hero-unit">kcal</span>
                    </div>
                </div>
                <div className="workout-hero-label">Total Burned</div>
            </div>

            {/* Burn Breakdown */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Flame size={16} /> Burn Breakdown
                </div>
                <div className="burn-breakdown">
                    <div className="burn-row">
                        <div className="burn-row-left">
                            <Activity size={16} color="#FF9500" />
                            <div>
                                <div className="burn-row-title">Base Metabolism (BMR)</div>
                                <div className="burn-row-sub">
                                    {isToday(selectedDate)
                                        ? `${Math.round(getTimeFraction() * 100)}% of day elapsed`
                                        : 'Full day'}
                                    {bmrFull > 0 && <> · Daily total: {bmrFull} kcal</>}
                                </div>
                            </div>
                        </div>
                        <div className="burn-row-value">{bmrBurned}</div>
                    </div>
                    <div className="burn-row">
                        <div className="burn-row-left">
                            <Footprints size={16} color="#32ADE6" />
                            <div>
                                <div className="burn-row-title">Walking ({steps.toLocaleString()} steps)</div>
                                <div className="burn-row-sub">Based on {weight}kg body weight</div>
                            </div>
                        </div>
                        <div className="burn-row-value">{stepCalories}</div>
                    </div>
                    <div className="burn-row">
                        <div className="burn-row-left">
                            <Dumbbell size={16} color="#AF52DE" />
                            <div>
                                <div className="burn-row-title">Exercise (manual)</div>
                                <div className="burn-row-sub">Gym, sports, etc.</div>
                            </div>
                        </div>
                        <div className="burn-row-value">{activeCalories}</div>
                    </div>
                    <div className="burn-total">
                        <span>Total Burned</span>
                        <span style={{ color: '#34C759', fontWeight: 800 }}>{totalBurned} kcal</span>
                    </div>
                </div>
            </div>

            {/* Activity Log */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={16} /> Today's Activity Log
                </div>

                {/* Steps row */}
                <div className="burn-row" style={{ marginBottom: 12 }}>
                    <div className="burn-row-left">
                        <Footprints size={16} color="#32ADE6" />
                        <div>
                            <div className="burn-row-title">Steps</div>
                            {editingSteps ? (
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <input className="steps-input" type="number" placeholder="걸음수 입력" value={stepsInput}
                                        onChange={e => setStepsInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && saveSteps()}
                                        style={{ width: 120, height: 32, fontSize: 13 }} autoFocus />
                                    <button className="weight-add-btn" onClick={saveSteps} style={{ padding: '0 10px', fontSize: 12, height: 32 }}><Check size={14} /></button>
                                    <button className="btn btn-secondary" onClick={() => setEditingSteps(false)} style={{ padding: '0 10px', fontSize: 12, height: 32 }}><X size={14} /></button>
                                </div>
                            ) : (
                                <div className="burn-row-sub">{steps > 0 ? `${steps.toLocaleString()} 걸음 · ${stepCalories} kcal` : '미등록'}</div>
                            )}
                        </div>
                    </div>
                    {!editingSteps && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setStepsInput(steps > 0 ? steps.toString() : ''); setEditingSteps(true); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4 }}><Edit size={15} /></button>
                            {steps > 0 && <button onClick={clearSteps}
                                style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>}
                        </div>
                    )}
                </div>

                {/* Exercise Calories row */}
                <div className="burn-row">
                    <div className="burn-row-left">
                        <Dumbbell size={16} color="#AF52DE" />
                        <div>
                            <div className="burn-row-title">Exercise</div>
                            {editingExercise ? (
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <input className="steps-input" type="number" placeholder="소모 칼로리 입력" value={activeCalInput}
                                        onChange={e => setActiveCalInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && saveActiveCal()}
                                        style={{ width: 140, height: 32, fontSize: 13 }} autoFocus />
                                    <button className="weight-add-btn" onClick={saveActiveCal} style={{ padding: '0 10px', fontSize: 12, height: 32 }}><Check size={14} /></button>
                                    <button className="btn btn-secondary" onClick={() => setEditingExercise(false)} style={{ padding: '0 10px', fontSize: 12, height: 32 }}><X size={14} /></button>
                                </div>
                            ) : (
                                <div className="burn-row-sub">{activeCalories > 0 ? `${activeCalories} kcal 소모` : '미등록'}</div>
                            )}
                        </div>
                    </div>
                    {!editingExercise && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setActiveCalInput(activeCalories > 0 ? activeCalories.toString() : ''); setEditingExercise(true); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4 }}><Edit size={15} /></button>
                            {activeCalories > 0 && <button onClick={clearActiveCal}
                                style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>}
                        </div>
                    )}
                </div>
            </div>

            {/* Manual Input */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Edit size={16} /> Add / Update Activity
                </div>
                <div className="workout-input-group">
                    <div className="workout-input-row">
                        <div className="workout-input-icon"><Footprints size={16} color="#32ADE6" /></div>
                        <input className="steps-input" type="number" placeholder="Steps" value={stepsInput} onChange={e => setStepsInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveSteps()} />
                        <button className="weight-add-btn" onClick={saveSteps} style={{ padding: '0 16px', fontSize: 13 }}>Save</button>
                    </div>
                    <div className="workout-input-row">
                        <div className="workout-input-icon"><Dumbbell size={16} color="#AF52DE" /></div>
                        <input className="steps-input" type="number" placeholder="Exercise calories (kcal)" value={activeCalInput} onChange={e => setActiveCalInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveActiveCal()} />
                        <button className="weight-add-btn" onClick={saveActiveCal} style={{ padding: '0 16px', fontSize: 13 }}>Save</button>
                    </div>
                </div>
            </div>

            {/* AI Assistant Input */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={16} color="#AF52DE" /> AI Assistant
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, background: aiTokens > 0 ? 'rgba(175, 82, 222, 0.15)' : 'rgba(255, 69, 58, 0.15)', color: aiTokens > 0 ? '#AF52DE' : '#FF453A', padding: '4px 8px', borderRadius: 12 }}>
                        {aiTokens} tokens left
                    </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>Describe your activity, and AI will estimate the calories burned.</div>
                
                <div className="workout-input-row" style={{ display: 'flex', gap: 8 }}>
                    <input className="steps-input" style={{ flex: 1 }} type="text" placeholder="e.g. 30 mins swimming..." value={aiExerciseInput} onChange={e => setAiExerciseInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiSuggest()} disabled={isAiLoading || aiTokens <= 0} />
                    <button className="weight-add-btn" onClick={handleAiSuggest} disabled={isAiLoading || !aiExerciseInput.trim() || aiTokens <= 0} style={{ padding: '0 16px', fontSize: 13, background: aiTokens > 0 ? '#AF52DE' : 'var(--border)' }}>
                        {isAiLoading ? 'Wait...' : 'Ask AI'}
                    </button>
                </div>
                
                {aiResult && (
                    <div style={{ marginTop: 12, padding: 12, background: 'rgba(175, 82, 222, 0.08)', borderRadius: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{aiResult.activityName} ({aiResult.durationMinutes} min)</span>
                            <span style={{ color: '#AF52DE' }}>+{aiResult.caloriesBurned} kcal</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setAiResult(null)} style={{ fontSize: 12, padding: '4px 12px' }}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={applyAiResult} style={{ fontSize: 12, padding: '4px 12px', background: '#AF52DE', border: 'none' }}>Add</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Weekly Burn Chart */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={16} /> Weekly Burn
                </div>
                <div className="workout-weekly-chart">
                    {weeklyBurnData.map((d, i) => {
                        const bmrH = Math.max((d.bmr / maxBurn) * 100, 2);
                        const stepH = Math.max((d.stepCal / maxBurn) * 100, 0);
                        const exH = Math.max((d.exercise / maxBurn) * 100, 0);
                        const isSelected = d.date === selectedDate.toISOString().split('T')[0];
                        return (
                            <div key={i} className={`workout-bar-col ${isSelected ? 'selected' : ''}`}
                                onClick={() => setSelectedDate(new Date(d.date + 'T12:00:00'))}>
                                <div className="workout-bar-stack" style={{ height: 100 }}>
                                    <div className="workout-bar-segment" style={{ height: `${exH}%`, background: '#AF52DE' }} title={`Exercise: ${d.exercise}`} />
                                    <div className="workout-bar-segment" style={{ height: `${stepH}%`, background: '#32ADE6' }} title={`Steps: ${d.stepCal}`} />
                                    <div className="workout-bar-segment" style={{ height: `${bmrH}%`, background: 'linear-gradient(180deg, #FF9500, #FA114F)' }} title={`BMR: ${d.bmr}`} />
                                </div>
                                <span className="workout-bar-label">{d.day}</span>
                                <span className="workout-bar-value">{d.total > 0 ? d.total : '-'}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="workout-legend">
                    <div className="workout-legend-item"><div className="workout-legend-dot" style={{ background: 'linear-gradient(135deg, #FF9500, #FA114F)' }} /> BMR</div>
                    <div className="workout-legend-item"><div className="workout-legend-dot" style={{ background: '#32ADE6' }} /> Steps</div>
                    <div className="workout-legend-item"><div className="workout-legend-dot" style={{ background: '#AF52DE' }} /> Exercise</div>
                </div>
            </div>

        </div>
    );
}
