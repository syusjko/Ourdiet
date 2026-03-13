import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { analyzeFoodImage, analyzeFoodText } from '../services/ai';
import {
    Camera, Type, FileDigit, Sparkles, Globe, Users, Lock, Send,
    Dumbbell, Check, Plus, Minus, Clock, Flame, X, ChevronDown, ChevronUp
} from 'lucide-react';

// ============ EXERCISE DATA ============
// MET values (Metabolic Equivalent of Task) for common gym exercises
// Calorie/min = MET × 3.5 × bodyWeight(kg) / 200
const EXERCISE_CATEGORIES = [
    {
        name: 'Chest',
        exercises: [
            { id: 'bench_press', name: 'Bench Press', icon: '🏋️', met: 6.0 },
            { id: 'incline_bench', name: 'Incline Bench', icon: '🔼', met: 5.5 },
            { id: 'dumbbell_fly', name: 'Dumbbell Fly', icon: '🦅', met: 5.0 },
            { id: 'push_up', name: 'Push-ups', icon: '💪', met: 8.0 },
            { id: 'chest_press', name: 'Chest Press Machine', icon: '🎯', met: 5.0 },
        ]
    },
    {
        name: 'Back',
        exercises: [
            { id: 'deadlift', name: 'Deadlift', icon: '🏗️', met: 6.0 },
            { id: 'lat_pulldown', name: 'Lat Pulldown', icon: '⬇️', met: 5.5 },
            { id: 'barbell_row', name: 'Barbell Row', icon: '🚣', met: 5.5 },
            { id: 'pull_up', name: 'Pull-ups', icon: '🧗', met: 8.0 },
            { id: 'cable_row', name: 'Cable Row', icon: '🔗', met: 5.0 },
        ]
    },
    {
        name: 'Legs',
        exercises: [
            { id: 'squat', name: 'Squat', icon: '🦵', met: 6.0 },
            { id: 'leg_press', name: 'Leg Press', icon: '🦿', met: 5.5 },
            { id: 'leg_extension', name: 'Leg Extension', icon: '🔧', met: 4.5 },
            { id: 'leg_curl', name: 'Leg Curl', icon: '🔩', met: 4.5 },
            { id: 'lunge', name: 'Lunges', icon: '🚶', met: 6.0 },
            { id: 'calf_raise', name: 'Calf Raise', icon: '⬆️', met: 4.0 },
        ]
    },
    {
        name: 'Shoulder',
        exercises: [
            { id: 'overhead_press', name: 'Overhead Press', icon: '🏋️', met: 5.5 },
            { id: 'lateral_raise', name: 'Lateral Raise', icon: '↔️', met: 4.5 },
            { id: 'front_raise', name: 'Front Raise', icon: '⬆️', met: 4.5 },
            { id: 'face_pull', name: 'Face Pull', icon: '🎯', met: 4.0 },
        ]
    },
    {
        name: 'Arms',
        exercises: [
            { id: 'bicep_curl', name: 'Bicep Curl', icon: '💪', met: 4.5 },
            { id: 'tricep_pushdown', name: 'Tricep Pushdown', icon: '⬇️', met: 4.5 },
            { id: 'hammer_curl', name: 'Hammer Curl', icon: '🔨', met: 4.5 },
            { id: 'skull_crusher', name: 'Skull Crusher', icon: '💀', met: 5.0 },
        ]
    },
    {
        name: 'Core',
        exercises: [
            { id: 'plank', name: 'Plank', icon: '📏', met: 4.0 },
            { id: 'crunch', name: 'Crunch', icon: '🔄', met: 3.8 },
            { id: 'ab_rollout', name: 'Ab Rollout', icon: '🎡', met: 5.0 },
            { id: 'russian_twist', name: 'Russian Twist', icon: '🌀', met: 4.5 },
        ]
    },
    {
        name: 'Cardio',
        exercises: [
            { id: 'treadmill', name: 'Treadmill', icon: '🏃', met: 8.0, isCardio: true },
            { id: 'cycling', name: 'Cycling', icon: '🚴', met: 7.0, isCardio: true },
            { id: 'elliptical', name: 'Elliptical', icon: '🔄', met: 5.0, isCardio: true },
            { id: 'jump_rope', name: 'Jump Rope', icon: '🪢', met: 11.0, isCardio: true },
            { id: 'rowing', name: 'Rowing Machine', icon: '🚣', met: 7.0, isCardio: true },
        ]
    },
];

function ExerciseCard({ exercise, isSelected, onToggle }) {
    return (
        <button
            className={`exercise-card ${isSelected ? 'selected' : ''}`}
            onClick={onToggle}
        >
            <div className="exercise-card-icon">{exercise.icon}</div>
            <div className="exercise-card-name">{exercise.name}</div>
            {isSelected && (
                <div className="exercise-card-check"><Check size={14} /></div>
            )}
        </button>
    );
}

function ExerciseSetInput({ exercise, entry, onChange, bodyWeight, gender }) {
    const { sets, reps, weight: liftWeight, duration } = entry;

    // Calculate calories for this exercise
    // MET adjusted for weight intensity: heavier weights = +20-40% MET
    // Gender difference: women burn ~5-10% fewer calories for same exercise
    const genderMultiplier = gender === 'female' ? 0.92 : 1.0;
    const weightIntensityBonus = exercise.isCardio ? 0 : Math.min((liftWeight || 0) / (bodyWeight * 0.6), 0.4);
    const adjustedMET = exercise.met * (1 + weightIntensityBonus) * genderMultiplier;

    let exerciseCalories;
    if (exercise.isCardio) {
        // Cardio: duration in minutes
        const durationMin = duration || 0;
        exerciseCalories = Math.round(adjustedMET * 3.5 * bodyWeight / 200 * durationMin);
    } else {
        // Weight training: estimate ~30 sec per rep (set time includes rest conceptually)
        const totalTimeMin = (sets || 0) * (reps || 0) * 0.07; // ~4.2 sec per rep on avg
        // Add rest time: ~60 sec between sets
        const totalWithRest = totalTimeMin + ((sets || 1) - 1) * 1;
        exerciseCalories = Math.round(adjustedMET * 3.5 * bodyWeight / 200 * totalWithRest);
    }

    return (
        <div className="exercise-set-row">
            <div className="exercise-set-header">
                <span className="exercise-set-icon">{exercise.icon}</span>
                <span className="exercise-set-name">{exercise.name}</span>
                <button className="exercise-remove" onClick={() => onChange(null)}>
                    <X size={16} />
                </button>
            </div>

            <div className="exercise-set-inputs">
                {exercise.isCardio ? (
                    <div className="exercise-input-group">
                        <label>Duration</label>
                        <div className="exercise-stepper">
                            <button onClick={() => onChange({ ...entry, duration: Math.max(0, (duration || 0) - 5) })}><Minus size={14} /></button>
                            <input type="number" value={duration || ''} placeholder="0"
                                onChange={e => onChange({ ...entry, duration: parseInt(e.target.value) || 0 })} />
                            <span className="exercise-unit">min</span>
                            <button onClick={() => onChange({ ...entry, duration: (duration || 0) + 5 })}><Plus size={14} /></button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="exercise-input-group">
                            <label>Sets</label>
                            <div className="exercise-stepper">
                                <button onClick={() => onChange({ ...entry, sets: Math.max(0, (sets || 0) - 1) })}><Minus size={14} /></button>
                                <input type="number" value={sets || ''} placeholder="0"
                                    onChange={e => onChange({ ...entry, sets: parseInt(e.target.value) || 0 })} />
                                <button onClick={() => onChange({ ...entry, sets: (sets || 0) + 1 })}><Plus size={14} /></button>
                            </div>
                        </div>
                        <div className="exercise-input-group">
                            <label>Reps</label>
                            <div className="exercise-stepper">
                                <button onClick={() => onChange({ ...entry, reps: Math.max(0, (reps || 0) - 1) })}><Minus size={14} /></button>
                                <input type="number" value={reps || ''} placeholder="0"
                                    onChange={e => onChange({ ...entry, reps: parseInt(e.target.value) || 0 })} />
                                <button onClick={() => onChange({ ...entry, reps: (reps || 0) + 1 })}><Plus size={14} /></button>
                            </div>
                        </div>
                        <div className="exercise-input-group">
                            <label>Weight</label>
                            <div className="exercise-stepper">
                                <button onClick={() => onChange({ ...entry, weight: Math.max(0, (liftWeight || 0) - 5) })}><Minus size={14} /></button>
                                <input type="number" value={liftWeight || ''} placeholder="0"
                                    onChange={e => onChange({ ...entry, weight: parseInt(e.target.value) || 0 })} />
                                <span className="exercise-unit">kg</span>
                                <button onClick={() => onChange({ ...entry, weight: (liftWeight || 0) + 5 })}><Plus size={14} /></button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="exercise-set-cal">
                <Flame size={14} color="#FF9500" />
                <span style={{ color: '#FF9500', fontWeight: 700 }}>{exerciseCalories}</span>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>kcal</span>
            </div>
        </div>
    );
}

// Calculate total exercise calories
function calcTotalExerciseCalories(selectedExercises, exerciseEntries, bodyWeight, gender) {
    let total = 0;
    for (const exId of selectedExercises) {
        const exercise = EXERCISE_CATEGORIES.flatMap(c => c.exercises).find(e => e.id === exId);
        const entry = exerciseEntries[exId] || {};
        if (!exercise) continue;

        const genderMultiplier = gender === 'female' ? 0.92 : 1.0;
        const weightIntensityBonus = exercise.isCardio ? 0 : Math.min((entry.weight || 0) / (bodyWeight * 0.6), 0.4);
        const adjustedMET = exercise.met * (1 + weightIntensityBonus) * genderMultiplier;

        if (exercise.isCardio) {
            total += Math.round(adjustedMET * 3.5 * bodyWeight / 200 * (entry.duration || 0));
        } else {
            const totalTimeMin = (entry.sets || 0) * (entry.reps || 0) * 0.07;
            const totalWithRest = totalTimeMin + ((entry.sets || 1) - 1) * 1;
            total += Math.round(adjustedMET * 3.5 * bodyWeight / 200 * totalWithRest);
        }
    }
    return total;
}

export default function NewPost() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [posting, setPosting] = useState(false);
    const [calories, setCalories] = useState('');
    const [description, setDescription] = useState('');
    const [caption, setCaption] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [foodComponents, setFoodComponents] = useState([]);
    const [visibility, setVisibility] = useState('friends');
    const [mealDate, setMealDate] = useState(new Date().toISOString().split('T')[0]);
    const [mode, setMode] = useState('photo');
    const [textQuery, setTextQuery] = useState('');

    // Exercise state
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [exerciseEntries, setExerciseEntries] = useState({});
    const [exBodyWeight, setExBodyWeight] = useState('');
    const [exGender, setExGender] = useState('male');
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [profile, setProfile] = useState(null);

    // Load profile for body info
    useEffect(() => {
        if (user) fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
            setProfile(data);
            setExBodyWeight(data.weight?.toString() || '70');
            setExGender(data.gender || 'male');
        }
    };

    const toggleExercise = (exId) => {
        if (selectedExercises.includes(exId)) {
            setSelectedExercises(prev => prev.filter(id => id !== exId));
            setExerciseEntries(prev => { const n = { ...prev }; delete n[exId]; return n; });
        } else {
            setSelectedExercises(prev => [...prev, exId]);
            setExerciseEntries(prev => ({ ...prev, [exId]: { sets: 3, reps: 10, weight: 20, duration: 20 } }));
        }
    };

    const updateExerciseEntry = (exId, entry) => {
        if (entry === null) {
            setSelectedExercises(prev => prev.filter(id => id !== exId));
            setExerciseEntries(prev => { const n = { ...prev }; delete n[exId]; return n; });
        } else {
            setExerciseEntries(prev => ({ ...prev, [exId]: entry }));
        }
    };

    const bodyWeight = parseFloat(exBodyWeight) || 70;
    const totalExerciseCal = calcTotalExerciseCalories(selectedExercises, exerciseEntries, bodyWeight, exGender);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const analyzeImage = async () => {
        if (!imageFile) return;
        setAnalyzing(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(imageFile);
            });
            const result = await analyzeFoodImage(base64);
            setCalories(result.calories.toString());
            setDescription(result.description);
            setProtein(result.protein?.toString() || '0');
            setCarbs(result.carbs?.toString() || '0');
            setFat(result.fat?.toString() || '0');
            setFoodComponents(result.components || []);
        } catch (error) {
            if (error?.message === 'NOT_FOOD') {
                alert('음식 사진이 아닙니다. 음식이 포함된 사진으로 다시 시도해주세요.');
            } else {
                alert('Failed to analyze image');
            }
        } finally {
            setAnalyzing(false);
        }
    };

    const analyzeText = async () => {
        if (!textQuery.trim()) return;
        setAnalyzing(true);
        try {
            const result = await analyzeFoodText(textQuery);
            setCalories(result.calories.toString());
            setDescription(result.description);
            setProtein(result.protein?.toString() || '0');
            setCarbs(result.carbs?.toString() || '0');
            setFat(result.fat?.toString() || '0');
        } catch (error) {
            alert('Failed to analyze food');
        } finally {
            setAnalyzing(false);
        }
    };

    const handlePost = async () => {
        if (mode === 'exercise') {
            // Save exercise as active calories
            if (!user || totalExerciseCal === 0) { alert('운동을 선택하고 세트/반복을 입력해주세요'); return; }
            setPosting(true);
            try {
                const dateStr = mealDate;
                const exerciseDesc = selectedExercises.map(exId => {
                    const ex = EXERCISE_CATEGORIES.flatMap(c => c.exercises).find(e => e.id === exId);
                    const entry = exerciseEntries[exId] || {};
                    if (ex?.isCardio) return `${ex.name} ${entry.duration}min`;
                    return `${ex?.name} ${entry.sets}×${entry.reps} @${entry.weight}kg`;
                }).join(', ');

                // Save to localStorage as active calories
                const existingCal = parseInt(localStorage.getItem(`activeCal_${dateStr}`) || '0');
                localStorage.setItem(`activeCal_${dateStr}`, existingCal + totalExerciseCal);

                // Also save exercise log for record
                const existingLogs = JSON.parse(localStorage.getItem(`exerciseLogs_${dateStr}`) || '[]');
                existingLogs.push({
                    exercises: selectedExercises.map(exId => ({
                        ...EXERCISE_CATEGORIES.flatMap(c => c.exercises).find(e => e.id === exId),
                        ...exerciseEntries[exId]
                    })),
                    totalCalories: totalExerciseCal,
                    description: exerciseDesc,
                    timestamp: new Date().toISOString()
                });
                localStorage.setItem(`exerciseLogs_${dateStr}`, JSON.stringify(existingLogs));

                navigate('/dashboard');
            } catch (error) {
                console.error('Exercise post error:', error);
                alert('Failed to save exercise');
            } finally {
                setPosting(false);
            }
            return;
        }

        // Meal post (original logic)
        if (!user || !calories) { alert('Please enter calories or analyze the image/text'); return; }
        setPosting(true);
        try {
            let imageUrl = 'manual';
            if (imageFile) {
                const fileName = `${user.id}/${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage.from('meal-images').upload(fileName, imageFile, { contentType: imageFile.type, upsert: false });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('meal-images').getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
            }
            await supabase.from('meals').insert({
                user_id: user.id,
                calories: parseInt(calories),
                protein: parseFloat(protein) || 0,
                carbs: parseFloat(carbs) || 0,
                fat: parseFloat(fat) || 0,
                description,
                caption,
                image_url: imageUrl,
                visibility,
                created_at: new Date(mealDate).toISOString(),
            });
            navigate('/dashboard');
        } catch (error) {
            console.error('Post error:', error);
            alert('Failed to post meal');
        } finally {
            setPosting(false);
        }
    };

    const isMealMode = mode !== 'exercise';

    return (
        <div className="new-post-page">
            {/* Back Button */}
            <button className="back-btn" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← Back</button>

            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>{mode === 'exercise' ? 'Log Exercise' : 'Log Meal'}</h2>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                <button className={`visibility-btn ${mode === 'photo' ? 'active' : ''}`} onClick={() => setMode('photo')}><Camera size={16} /> Photo</button>
                <button className={`visibility-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}><Type size={16} /> Text</button>
                <button className={`visibility-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}><FileDigit size={16} /> Manual</button>
                <button className={`visibility-btn ${mode === 'exercise' ? 'active' : ''}`} onClick={() => setMode('exercise')}><Dumbbell size={16} /> Exercise</button>
            </div>

            {/* Photo Mode */}
            {mode === 'photo' && (
                <>
                    <label className="upload-area" htmlFor="file-input">
                        {imagePreview ? (
                            <>
                                <img src={imagePreview} alt="Preview" />
                                {foodComponents.map((comp, idx) => (
                                    <div key={idx} style={{
                                        position: 'absolute',
                                        left: `${comp.x}%`, top: `${comp.y}%`,
                                        background: 'rgba(255,107,53,0.95)',
                                        border: '2px solid #fff',
                                        borderRadius: 12, padding: '6px 10px',
                                        transform: 'translate(-50%, -50%)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                        zIndex: 2,
                                    }}>
                                        <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{comp.name}</div>
                                        <div style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{comp.calories} kcal</div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                <div className="upload-icon" style={{ display: 'flex' }}><Camera size={48} /></div>
                                <div className="upload-text">Tap to select a photo</div>
                                <div className="upload-hint">or drag and drop</div>
                            </>
                        )}
                    </label>
                    <input id="file-input" type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />
                    {imagePreview && (
                        <button className="analyze-btn" onClick={analyzeImage} disabled={analyzing}>
                            {analyzing ? <div className="spinner" /> : <><Sparkles size={18} /> Analyze with AI</>}
                        </button>
                    )}
                </>
            )}

            {/* Text Mode */}
            {mode === 'text' && (
                <>
                    <div className="input-group">
                        <label className="input-label">What did you eat?</label>
                        <textarea className="input-field" placeholder="e.g. 김치찌개 한 그릇, 밥 한 공기, 반찬 3개" value={textQuery} onChange={e => setTextQuery(e.target.value)}
                            style={{ minHeight: 100 }} />
                    </div>
                    <button className="analyze-btn" onClick={analyzeText} disabled={analyzing || !textQuery.trim()}>
                        {analyzing ? <div className="spinner" /> : <><Sparkles size={18} /> AI로 영양분석</>}
                    </button>
                </>
            )}

            {/* ==================== EXERCISE MODE ==================== */}
            {mode === 'exercise' && (
                <>
                    {/* Body Profile for calorie calculation */}
                    <div className="exercise-profile-card">
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Dumbbell size={16} /> Body Profile
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <div className="exercise-input-group" style={{ flex: 1 }}>
                                <label>Body Weight</label>
                                <div className="exercise-stepper">
                                    <input type="number" value={exBodyWeight} placeholder="70"
                                        onChange={e => setExBodyWeight(e.target.value)} style={{ textAlign: 'center' }} />
                                    <span className="exercise-unit">kg</span>
                                </div>
                            </div>
                            <div className="exercise-input-group" style={{ flex: 1 }}>
                                <label>Gender</label>
                                <div className="gender-row" style={{ marginTop: 4 }}>
                                    <button className={`gender-btn ${exGender === 'male' ? 'active' : ''}`}
                                        onClick={() => setExGender('male')} style={{ fontSize: 13, padding: 8 }}>
                                        Male
                                    </button>
                                    <button className={`gender-btn ${exGender === 'female' ? 'active' : ''}`}
                                        onClick={() => setExGender('female')} style={{ fontSize: 13, padding: 8 }}>
                                        Female
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                            {exGender === 'male' ? '♂ Males burn ~8% more calories on average' : '♀ Females have slightly lower calorie burn per exercise'}
                        </div>
                    </div>

                    {/* Exercise Categories */}
                    <div style={{ marginBottom: 16 }}>
                        <div className="input-label" style={{ marginBottom: 8 }}>Select Exercises</div>
                        {EXERCISE_CATEGORIES.map(cat => (
                            <div key={cat.name} className="exercise-category">
                                <button className="exercise-category-header"
                                    onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}>
                                    <span style={{ fontWeight: 600 }}>{cat.name}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {cat.exercises.filter(e => selectedExercises.includes(e.id)).length > 0 && (
                                            <span className="exercise-cat-badge">
                                                {cat.exercises.filter(e => selectedExercises.includes(e.id)).length}
                                            </span>
                                        )}
                                        {expandedCategory === cat.name ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </span>
                                </button>
                                {expandedCategory === cat.name && (
                                    <div className="exercise-card-grid">
                                        {cat.exercises.map(ex => (
                                            <ExerciseCard
                                                key={ex.id}
                                                exercise={ex}
                                                isSelected={selectedExercises.includes(ex.id)}
                                                onToggle={() => toggleExercise(ex.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Selected Exercise Inputs */}
                    {selectedExercises.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div className="input-label" style={{ marginBottom: 8 }}>Exercise Details</div>
                            {selectedExercises.map(exId => {
                                const exercise = EXERCISE_CATEGORIES.flatMap(c => c.exercises).find(e => e.id === exId);
                                if (!exercise) return null;
                                return (
                                    <ExerciseSetInput
                                        key={exId}
                                        exercise={exercise}
                                        entry={exerciseEntries[exId] || {}}
                                        onChange={entry => updateExerciseEntry(exId, entry)}
                                        bodyWeight={bodyWeight}
                                        gender={exGender}
                                    />
                                );
                            })}

                            {/* Total Calories */}
                            <div className="exercise-total">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Flame size={20} color="#FF9500" />
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>Total Burn</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: 28, fontWeight: 800, color: '#FF9500' }}>{totalExerciseCal}</span>
                                    <span style={{ fontSize: 14, color: 'var(--text2)', marginLeft: 4 }}>kcal</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Common fields for meal modes */}
            {isMealMode && (
                <>
                    {/* Date */}
                    <div className="input-group">
                        <label className="input-label">날짜</label>
                        <input className="input-field" type="date" value={mealDate} onChange={e => setMealDate(e.target.value)} />
                    </div>

                    {/* Calories */}
                    <div className="input-group">
                        <label className="input-label">Calories</label>
                        <input className="input-field" type="number" placeholder="0" value={calories} onChange={e => setCalories(e.target.value)} style={{ fontSize: 24, fontWeight: 700 }} />
                    </div>

                    {/* Macros */}
                    <div className="macros-row">
                        <div className="macro-input">
                            <div className="input-label">Protein (g)</div>
                            <input className="input-field" type="number" placeholder="0" value={protein} onChange={e => setProtein(e.target.value)} />
                        </div>
                        <div className="macro-input">
                            <div className="input-label">Carbs (g)</div>
                            <input className="input-field" type="number" placeholder="0" value={carbs} onChange={e => setCarbs(e.target.value)} />
                        </div>
                        <div className="macro-input">
                            <div className="input-label">Fat (g)</div>
                            <input className="input-field" type="number" placeholder="0" value={fat} onChange={e => setFat(e.target.value)} />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="input-group">
                        <label className="input-label">Description</label>
                        <input className="input-field" placeholder="What did you eat?" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    {/* Caption */}
                    <div className="input-group">
                        <label className="input-label">Caption (optional)</label>
                        <textarea className="input-field" placeholder="Add a caption..." value={caption} onChange={e => setCaption(e.target.value)} style={{ minHeight: 60 }} />
                    </div>

                    {/* Visibility */}
                    <div className="input-group">
                        <label className="input-label">Who can see this?</label>
                        <div className="visibility-row">
                            {[
                                ['public', <><Globe size={16} /> Public</>],
                                ['friends', <><Users size={16} /> Friends</>],
                                ['private', <><Lock size={16} /> Private</>]
                            ].map(([v, label]) => (
                                <button key={v} className={`visibility-btn ${visibility === v ? 'active' : ''}`} onClick={() => setVisibility(v)}>{label}</button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Exercise date */}
            {mode === 'exercise' && (
                <div className="input-group">
                    <label className="input-label">날짜</label>
                    <input className="input-field" type="date" value={mealDate} onChange={e => setMealDate(e.target.value)} />
                </div>
            )}

            {/* Post Button */}
            <button className="btn btn-primary" onClick={handlePost} disabled={posting} style={{ marginTop: 8 }}>
                {posting ? <div className="spinner" /> : (
                    mode === 'exercise'
                        ? <><Dumbbell size={18} /> Save Exercise ({totalExerciseCal} kcal)</>
                        : <><Send size={18} /> Post Meal</>
                )}
            </button>
        </div>
    );
}
