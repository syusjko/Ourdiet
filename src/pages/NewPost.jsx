import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { analyzeFoodImage, analyzeFoodText } from '../services/ai';
import { useTokens } from '../services/token';
import {
    Camera, Type, FileDigit, Sparkles, Globe, Users, Lock, Send,
    Dumbbell, Check, Plus, Minus, Clock, Flame, X, ChevronDown, ChevronUp
} from 'lucide-react';

const getLocalISODate = (d = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

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
    const [extraDescription, setExtraDescription] = useState('');
    const [mealType, setMealType] = useState('meal');
    const [mealDate, setMealDate] = useState(getLocalISODate());
    const [mode, setMode] = useState('photo');
    const [textQuery, setTextQuery] = useState('');
    // Remove exercise states
    // ...
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
        const hasTokens = await useTokens(user?.id);
        if (!hasTokens) {
            alert('일일 AI 분석 토큰(3개)을 모두 소진했습니다. 내일 다시 시도해주세요.');
            return;
        }
        setAnalyzing(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(imageFile);
            });
            const result = await analyzeFoodImage(base64, extraDescription);
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
        const hasTokens = await useTokens(user?.id);
        if (!hasTokens) {
            alert('일일 AI 분석 토큰(3개)을 모두 소진했습니다. 내일 다시 시도해주세요.');
            return;
        }
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
        // Meal post
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
            const insertData = {
                user_id: user.id,
                calories: parseInt(calories),
                protein: parseFloat(protein) || 0,
                carbs: parseFloat(carbs) || 0,
                fat: parseFloat(fat) || 0,
                description,
                image_url: imageUrl,
                meal_type: mealType,
                created_at: new Date(mealDate).toISOString(),
            };
            console.log('Inserting meal data:', insertData);
            const { data: insertResult, error: insertError } = await supabase.from('meals').insert(insertData);
            if (insertError) {
                console.error('Supabase insert error:', JSON.stringify(insertError, null, 2));
                alert(`등록 실패: ${insertError.message}\n코드: ${insertError.code}\n상세: ${insertError.details}`);
                return;
            }
            console.log('Insert success:', insertResult);
            navigate('/app/dashboard');
        } catch (error) {
            console.error('Post error:', error);
            alert('Failed to post meal');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="new-post-page">
            {/* Back Button */}
            <button className="back-btn" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← Back</button>

            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Log Meal</h2>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                <button className={`visibility-btn ${mode === 'photo' ? 'active' : ''}`} onClick={() => setMode('photo')}><Camera size={16} /> Photo</button>
                <button className={`visibility-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}><Type size={16} /> Text</button>
                <button className={`visibility-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}><FileDigit size={16} /> Manual</button>
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
                    <input id="file-input" type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                    {imagePreview && (
                        <div style={{ marginTop: 16 }}>
                            <div className="input-group">
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={14} color="#AF52DE" /> AI 추가 분석 설명 (선택)
                                </label>
                                <textarea className="input-field" placeholder="예: 소스는 안 먹었어요, 밥은 반 공기만 먹었어요 등" value={extraDescription} onChange={e => setExtraDescription(e.target.value)} style={{ minHeight: 60, fontSize: 13, marginBottom: 12 }} />
                            </div>
                            <button className="analyze-btn" onClick={analyzeImage} disabled={analyzing}>
                                {analyzing ? <div className="spinner" /> : <><Sparkles size={18} /> Analyze with AI</>}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Text Mode */}
            {mode === 'text' && (
                <>
                    <div className="input-group">
                        <label className="input-label">What did you eat?</label>
                        <textarea className="input-field" placeholder="e.g. A bowl of soup, one bowl of rice, and a few side dishes" value={textQuery} onChange={e => setTextQuery(e.target.value)}
                            style={{ minHeight: 100 }} />
                    </div>
                    <button className="analyze-btn" onClick={analyzeText} disabled={analyzing || !textQuery.trim()}>
                        {analyzing ? <div className="spinner" /> : <><Sparkles size={18} /> Analyze with AI</>}
                    </button>
                </>
            )}

            {/* Common fields for meal modes */}
            <>
                {/* Date */}
                <div className="input-group">
                    <label className="input-label">Date</label>
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

                {/* Meal Type */}
                <div className="input-group">
                    <label className="input-label">Category</label>
                    <div className="visibility-row">
                        {[
                            ['meal', '🥗 Meal'],
                            ['snack', '🍪 Snack'],
                            ['etc', '☕ Etc']
                        ].map(([v, label]) => (
                            <button key={v} className={`visibility-btn ${mealType === v ? 'active' : ''}`} onClick={() => setMealType(v)}>{label}</button>
                        ))}
                    </div>
                </div>
            </>

            {/* Post Button */}
            <button className="btn btn-primary" onClick={handlePost} disabled={posting} style={{ marginTop: 8 }}>
                {posting ? <div className="spinner" /> : (
                    <><Send size={18} /> Post Meal</>
                )}
            </button>
        </div>
    );
}
