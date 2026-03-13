import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Edit, Utensils, ChevronLeft, ChevronRight, Plus, Image, Clock, Flame, Footprints, Dumbbell, Activity } from 'lucide-react';

const calculateBMR = (weight, height, age, gender) => {
    if (!weight || !height || !age) return 0;
    if (gender === 'male') return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

function ActivityRings({ size = 90, move = 0, exercise = 0, stand = 0 }) {
    const center = size / 2;
    const strokeWidth = 8;
    const colors = [
        { color: '#FA114F', progress: move, radius: (size - strokeWidth) / 2 },
        { color: '#34C759', progress: exercise, radius: (size - strokeWidth) / 2 - 12 },
        { color: '#32ADE6', progress: stand, radius: (size - strokeWidth) / 2 - 24 },
    ];

    return (
        <svg width={size} height={size} className="rings-container">
            {colors.map((ring, i) => {
                const circumference = 2 * Math.PI * ring.radius;
                const offset = circumference * (1 - Math.min(ring.progress, 1));
                return (
                    <g key={i}>
                        <circle cx={center} cy={center} r={ring.radius} fill="none" stroke={ring.color} strokeWidth={strokeWidth} opacity={0.2} />
                        <circle cx={center} cy={center} r={ring.radius} fill="none" stroke={ring.color} strokeWidth={strokeWidth}
                            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                            transform={`rotate(-90 ${center} ${center})`}
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                    </g>
                );
            })}
        </svg>
    );
}

function DayMealCard({ meal }) {
    const time = new Date(meal.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return (
        <div className="day-meal-card">
            {meal.image_url && meal.image_url !== 'manual' ? (
                <div className="day-meal-thumb">
                    <img src={meal.image_url} alt={meal.description} />
                </div>
            ) : (
                <div className="day-meal-thumb day-meal-thumb-empty">
                    <Utensils size={20} />
                </div>
            )}
            <div className="day-meal-info">
                <div className="day-meal-name">{meal.description || 'Meal'}</div>
                <div className="day-meal-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {time}</span>
                </div>
                <div className="day-meal-macros">
                    {meal.protein > 0 && <span style={{ color: '#FF9500' }}>P {meal.protein}g</span>}
                    {meal.carbs > 0 && <span style={{ color: '#34C759' }}>C {meal.carbs}g</span>}
                    {meal.fat > 0 && <span style={{ color: '#FA114F' }}>F {meal.fat}g</span>}
                </div>
            </div>
            <div className="day-meal-cal">
                <div className="day-meal-cal-num">{meal.calories}</div>
                <div className="day-meal-cal-unit">kcal</div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [caloriesConsumed, setCaloriesConsumed] = useState(0);
    const [dailyNutrients, setDailyNutrients] = useState({ protein: 0, carbs: 0, fat: 0 });
    const [dayMeals, setDayMeals] = useState([]);
    const [steps, setSteps] = useState(0);
    const [activeCalories, setActiveCalories] = useState(0);
    const [stepsInput, setStepsInput] = useState('');
    const [activeCalInput, setActiveCalInput] = useState('');
    const [showStats, setShowStats] = useState(false);
    const [statsTab, setStatsTab] = useState('day');
    const [weeklyData, setWeeklyData] = useState([]);
    const [calendarDays, setCalendarDays] = useState([]);
    const scrollRef = useRef(null);

    const isToday = (d) => d.toDateString() === new Date().toDateString();
    const isSelected = (d) => d.toDateString() === selectedDate.toDateString();

    const targetCalories = profile?.target_calories || 2000;
    const targetSteps = profile?.target_steps || 10000;
    const targetBurn = profile?.target_burn || 500;
    const bmrFull = calculateBMR(profile?.weight, profile?.height, profile?.age, profile?.gender || 'male');

    // Time-proportional BMR: today = (hours elapsed / 24) × BMR, past days = full BMR
    const getTimeFraction = () => {
        if (!isToday(selectedDate)) return 1; // past days: full 24h
        const now = new Date();
        const hoursElapsed = now.getHours() + now.getMinutes() / 60;
        return hoursElapsed / 24;
    };
    const bmrBurned = Math.round(bmrFull * getTimeFraction());

    // Steps → Calories: ~0.04 kcal per step for 80kg person, scales with body weight
    // Formula: steps × weight(kg) × 0.0005
    const weight = profile?.weight || 70;
    const stepCalories = Math.round(steps * weight * 0.0005);

    const totalBurned = bmrBurned + stepCalories + activeCalories;
    const netCalories = caloriesConsumed - totalBurned;

    const consumedProgress = Math.min(caloriesConsumed / targetCalories, 1);
    const burnedProgress = Math.min(totalBurned / (bmrFull + targetBurn), 1);
    const stepsProgress = Math.min(steps / targetSteps, 1);

    // Build 14-day calendar (7 before today + today + 6 future? No — 14 days ending today)
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

    useEffect(() => { if (user) fetchProfile(); }, [user]);
    useEffect(() => {
        if (user) {
            fetchDayData(selectedDate);
            loadLocalData(selectedDate);
        }
    }, [selectedDate, user]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

    const fetchDayData = async (date) => {
        if (!user) return;
        const dateStr = date.toISOString().split('T')[0];
        const { data } = await supabase.from('meals').select('*').eq('user_id', user.id)
            .gte('created_at', `${dateStr}T00:00:00`).lte('created_at', `${dateStr}T23:59:59`)
            .order('created_at', { ascending: true });
        if (data) {
            setDayMeals(data);
            setCaloriesConsumed(data.reduce((a, c) => a + c.calories, 0));
            setDailyNutrients({
                protein: Math.round(data.reduce((a, c) => a + (c.protein || 0), 0)),
                carbs: Math.round(data.reduce((a, c) => a + (c.carbs || 0), 0)),
                fat: Math.round(data.reduce((a, c) => a + (c.fat || 0), 0)),
            });
        } else {
            setDayMeals([]);
            setCaloriesConsumed(0);
            setDailyNutrients({ protein: 0, carbs: 0, fat: 0 });
        }
    };

    const loadLocalData = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        const savedSteps = localStorage.getItem(`steps_${dateStr}`);
        const savedCal = localStorage.getItem(`activeCal_${dateStr}`);
        setSteps(savedSteps ? parseInt(savedSteps) : 0);
        setActiveCalories(savedCal ? parseInt(savedCal) : 0);
    };

    const fetchWeeklyData = async () => {
        if (!user) return;
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(); date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const { data } = await supabase.from('meals').select('calories').eq('user_id', user.id).gte('created_at', `${dateStr}T00:00:00`).lte('created_at', `${dateStr}T23:59:59`);
            const total = data?.reduce((acc, m) => acc + m.calories, 0) || 0;
            days.push({ date: dateStr, calories: total, day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()] });
        }
        setWeeklyData(days);
    };

    const saveSteps = () => {
        const v = parseInt(stepsInput);
        if (!isNaN(v)) {
            setSteps(v);
            localStorage.setItem(`steps_${selectedDate.toISOString().split('T')[0]}`, v);
            setStepsInput('');
        }
    };

    const saveActiveCal = () => {
        const v = parseInt(activeCalInput);
        if (!isNaN(v)) {
            setActiveCalories(v);
            localStorage.setItem(`activeCal_${selectedDate.toISOString().split('T')[0]}`, v);
            setActiveCalInput('');
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

    // Scroll to active date on mount
    useEffect(() => {
        if (scrollRef.current) {
            const active = scrollRef.current.querySelector('.day-pill.active');
            if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth' });
        }
    }, [calendarDays, selectedDate]);

    return (
        <>
            {/* Date Strip */}
            <div className="date-strip" ref={scrollRef}>
                {calendarDays.map((d, i) => {
                    const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                    return (
                        <button
                            key={i}
                            className={`day-pill ${isSelected(d) ? 'active' : ''} ${isToday(d) ? 'today' : ''}`}
                            onClick={() => setSelectedDate(new Date(d))}
                        >
                            <span className="day-pill-weekday">{dayLabel}</span>
                            <span className="day-pill-date">{d.getDate()}</span>
                        </button>
                    );
                })}
            </div>

            {/* Date Navigation */}
            <div className="date-nav">
                <button className="date-nav-btn" onClick={goToPrevDay}><ChevronLeft size={20} /></button>
                <div className="date-nav-title">{formatDateTitle(selectedDate)}</div>
                <button className="date-nav-btn" onClick={goToNextDay} disabled={isToday(selectedDate)}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Activity Summary */}
            <div className="summary-card" onClick={() => { setShowStats(true); fetchWeeklyData(); }}>
                <div className="summary-top">
                    <ActivityRings size={90} move={consumedProgress} exercise={burnedProgress} stand={stepsProgress} />
                    <div className="summary-stats">
                        <div className="summary-row">
                            <div className="summary-dot" style={{ background: '#FA114F' }} />
                            <span className="summary-label">Eaten</span>
                            <span className="summary-value">{caloriesConsumed}</span>
                        </div>
                        <div className="summary-row">
                            <div className="summary-dot" style={{ background: '#34C759' }} />
                            <span className="summary-label">Burned</span>
                            <span className="summary-value">{totalBurned}</span>
                        </div>
                        <div className="summary-row">
                            <div className="summary-dot" style={{ background: '#32ADE6' }} />
                            <span className="summary-label">Steps</span>
                            <span className="summary-value">{steps.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div className="net-row">
                    <span className="net-label">Net Calories</span>
                    <span className="net-value" style={{ color: netCalories > 0 ? '#FF9500' : '#34C759' }}>
                        {netCalories > 0 ? '+' : ''}{netCalories} kcal
                    </span>
                </div>

                {profile?.target_weight && profile?.target_date && (() => {
                    const currentWeight = profile.weight || 0;
                    const weightDiff = currentWeight - profile.target_weight;
                    const totalCal = weightDiff * 7700;
                    const daysLeft = Math.max(1, Math.ceil((new Date(profile.target_date).getTime() - Date.now()) / 86400000));
                    const dailyDeficit = Math.round(totalCal / daysLeft);
                    const todayDeficit = -netCalories;
                    const difference = todayDeficit - dailyDeficit;

                    return (
                        <div className="goal-deficit-row">
                            <div className="goal-deficit-left">
                                <span className="goal-deficit-label">Goal Deficit</span>
                                <div className="goal-deficit-values">
                                    <span className="goal-deficit-current" style={{ color: todayDeficit >= 0 ? '#34C759' : '#FF9500' }}>
                                        {todayDeficit >= 0 ? '-' : '+'}{Math.abs(todayDeficit)}
                                    </span>
                                    <span className="goal-deficit-separator">/</span>
                                    <span className="goal-deficit-target">-{dailyDeficit}</span>
                                    <span className="goal-deficit-unit">kcal</span>
                                </div>
                            </div>
                            <div className="goal-deficit-right">
                                <div className="goal-diff" style={{ color: difference >= 0 ? '#34C759' : '#FF9500' }}>
                                    {difference >= 0 ? '+' : ''}{difference}
                                </div>
                                <div className="progress-bar" style={{ width: 80 }}>
                                    <div className="progress-fill" style={{
                                        width: `${Math.min((dailyDeficit > 0 ? Math.max(todayDeficit, 0) / dailyDeficit : 0) * 100, 100)}%`,
                                        background: todayDeficit >= dailyDeficit ? '#34C759' : 'var(--primary)'
                                    }} />
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Macros Summary Bar */}
            <div className="macros-summary">
                <div className="macros-summary-item">
                    <div className="macros-summary-value" style={{ color: '#FF9500' }}>{dailyNutrients.protein}g</div>
                    <div className="macros-summary-label">Protein</div>
                </div>
                <div className="macros-summary-divider" />
                <div className="macros-summary-item">
                    <div className="macros-summary-value" style={{ color: '#34C759' }}>{dailyNutrients.carbs}g</div>
                    <div className="macros-summary-label">Carbs</div>
                </div>
                <div className="macros-summary-divider" />
                <div className="macros-summary-item">
                    <div className="macros-summary-value" style={{ color: '#FA114F' }}>{dailyNutrients.fat}g</div>
                    <div className="macros-summary-label">Fat</div>
                </div>
            </div>

            {/* Day's Meals */}
            <div className="day-section">
                <div className="day-section-header">
                    <span className="day-section-title">Meals ({dayMeals.length})</span>
                    <button className="day-section-action" onClick={() => navigate('/new-post')}>
                        <Plus size={16} /> Add
                    </button>
                </div>

                {dayMeals.length === 0 ? (
                    <div className="day-empty">
                        <Utensils size={40} strokeWidth={1.5} />
                        <div className="day-empty-title">No meals recorded</div>
                        <div className="day-empty-sub">{isToday(selectedDate) ? 'Tap + to log your first meal today' : 'No records for this day'}</div>
                        {isToday(selectedDate) && (
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/new-post')} style={{ marginTop: 12 }}>
                                <Plus size={16} /> Log Meal
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="day-meals-list">
                        {dayMeals.map(meal => <DayMealCard key={meal.id} meal={meal} />)}
                    </div>
                )}
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

            {/* Manual Steps & Active Calories Input */}
            <div className="card" style={{ margin: '0 16px 16px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}><Edit size={16} /> Manual Input</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input className="steps-input" type="number" placeholder="Steps" value={stepsInput} onChange={e => setStepsInput(e.target.value)} />
                    <button className="weight-add-btn" onClick={saveSteps} style={{ padding: '0 16px', fontSize: 13 }}>Save</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input className="steps-input" type="number" placeholder="Exercise calories (kcal)" value={activeCalInput} onChange={e => setActiveCalInput(e.target.value)} />
                    <button className="weight-add-btn" onClick={saveActiveCal} style={{ padding: '0 16px', fontSize: 13 }}>Save</button>
                </div>
            </div>

            {/* Stats Modal */}
            {showStats && (
                <div className="modal-overlay">
                    <div className="modal-backdrop" onClick={() => setShowStats(false)} />
                    <div className="modal-sheet">
                        <div className="sheet-handle" />
                        <div className="sheet-title">Statistics</div>

                        <div className="tab-row">
                            {['day', 'week', 'goal'].map(tab => (
                                <button key={tab} className={`stats-tab ${statsTab === tab ? 'active' : ''}`} onClick={() => setStatsTab(tab)}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        {statsTab === 'day' && (
                            <>
                                <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                                    {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                                </div>
                                <div className="day-stat-card"><div className="day-stat-label">Consumed</div><div className="day-stat-value" style={{ color: '#FA114F' }}>{caloriesConsumed}</div><div className="day-stat-unit">kcal</div></div>
                                <div className="day-stat-card"><div className="day-stat-label">Burned</div><div className="day-stat-value" style={{ color: '#34C759' }}>{totalBurned}</div><div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 11, color: 'var(--text3)' }}><span>BMR: {bmrBurned}</span><span>Steps: {stepCalories}</span><span>Exercise: {activeCalories}</span></div></div>
                                <div className="day-stat-card" style={{ background: netCalories > 0 ? 'rgba(255,149,0,0.1)' : 'rgba(52,199,89,0.1)' }}>
                                    <div className="day-stat-label">Net Calories</div>
                                    <div className="day-stat-value" style={{ color: netCalories > 0 ? '#FF9500' : '#34C759' }}>{netCalories > 0 ? '+' : ''}{netCalories}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{netCalories > 0 ? 'Calorie surplus' : 'Calorie deficit'}</div>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Nutrients</div>
                                <div className="nutrients-row">
                                    <div className="nutrient-card"><div className="nutrient-label">Protein</div><div className="nutrient-value" style={{ color: '#FF9500' }}>{dailyNutrients.protein}g</div></div>
                                    <div className="nutrient-card"><div className="nutrient-label">Carbs</div><div className="nutrient-value" style={{ color: '#34C759' }}>{dailyNutrients.carbs}g</div></div>
                                    <div className="nutrient-card"><div className="nutrient-label">Fat</div><div className="nutrient-value" style={{ color: '#FA114F' }}>{dailyNutrients.fat}g</div></div>
                                </div>
                            </>
                        )}

                        {statsTab === 'week' && (
                            <div className="week-chart">
                                {weeklyData.map((d, i) => (
                                    <div key={i} className="bar-col">
                                        <div className="bar" style={{ height: Math.max((d.calories / targetCalories) * 100, 4), background: d.calories >= targetCalories ? 'var(--primary)' : 'var(--text3)' }} />
                                        <span className="bar-label">{d.day}</span>
                                        <span className="bar-value">{d.calories > 0 ? d.calories : '-'}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {statsTab === 'goal' && (
                            profile?.target_weight && profile?.target_date ? (() => {
                                const currentWeight = profile.weight || 0;
                                const weightDiff = currentWeight - profile.target_weight;
                                const totalCal = weightDiff * 7700;
                                const daysLeft = Math.max(0, Math.ceil((new Date(profile.target_date).getTime() - Date.now()) / 86400000));
                                const dailyDeficit = daysLeft > 0 ? Math.round(totalCal / daysLeft) : 0;
                                const todayDeficit = Math.abs(netCalories);
                                return (
                                    <>
                                        <div className="day-stat-card"><div className="day-stat-label">Target Weight</div><div className="day-stat-value" style={{ color: 'var(--primary)' }}>{profile.target_weight} kg</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>in {daysLeft} days</div></div>
                                        <div className="day-stat-card"><div className="day-stat-label">Weight to Lose</div><div className="day-stat-value" style={{ color: '#FF9500' }}>{weightDiff.toFixed(1)} kg</div></div>
                                        <div className="day-stat-card"><div className="day-stat-label">Daily Deficit Needed</div><div className="day-stat-value" style={{ color: 'var(--primary)' }}>{dailyDeficit} kcal</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Today: {todayDeficit} kcal ({dailyDeficit > 0 ? Math.round(todayDeficit / dailyDeficit * 100) : 0}%)</div></div>
                                    </>
                                );
                            })() : (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
                                    <p>No weight loss goal set</p>
                                    <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Go to Body tab to set your goal</p>
                                </div>
                            )
                        )}

                        <button className="close-btn" onClick={() => setShowStats(false)}>Close</button>
                    </div>
                </div>
            )}
        </>
    );
}
