import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ChevronRight, ChevronLeft, User, Activity, Target, Check } from 'lucide-react';

const getLocalISODate = (d = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const STEPS = ['Welcome', 'Body Profile', 'Goal Setting', 'Complete'];

export default function Onboarding() {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    // Body Profile
    const [fullName, setFullName] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('male');

    // Goal
    const [selectedMonths, setSelectedMonths] = useState(2);
    const [selectedLoss, setSelectedLoss] = useState(4);

    const [saving, setSaving] = useState(false);

    const canProceedStep1 = fullName.trim() && height && weight && age;
    const currentWeight = parseFloat(weight) || 70;
    const maxLoss = selectedMonths * 4;

    const saveProfile = async () => {
        if (!user) return;
        setSaving(true);

        const targetWeight = currentWeight - selectedLoss;
        const tDate = new Date();
        tDate.setMonth(tDate.getMonth() + selectedMonths);
        const targetDateStr = getLocalISODate(tDate);

        try {
            await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                full_name: fullName,
                height: parseFloat(height),
                weight: parseFloat(weight),
                age: parseInt(age),
                gender,
                target_weight: targetWeight,
                target_date: targetDateStr,
            });

            // Also log the initial weight
            await supabase.from('weight_logs').insert({
                user_id: user.id,
                weight: parseFloat(weight),
            });

            // IMPORTANT: Fetch the newly updated profile before finishing
            await refreshProfile();

            setStep(3); // Go to complete
        } catch (err) {
            alert('Failed to save profile. Please try again.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const finish = () => {
        navigate('/app/dashboard');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
            {/* Progress Bar */}
            <div style={{ padding: '20px 24px 0', display: 'flex', gap: 6 }}>
                {STEPS.map((_, i) => (
                    <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i <= step ? 'var(--primary)' : 'var(--border)',
                        transition: 'background 0.3s'
                    }} />
                ))}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
                {/* Step 0: Welcome */}
                {step === 0 && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Welcome to OurDiet!</h1>
                        <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
                            Let's set up your profile so we can personalize<br />your diet and workout experience.
                        </p>
                        <button className="btn btn-primary" style={{ maxWidth: 320, margin: '0 auto' }} onClick={() => setStep(1)}>
                            Get Started <ChevronRight size={18} style={{ marginLeft: 4 }} />
                        </button>
                    </div>
                )}

                {/* Step 1: Body Profile */}
                {step === 1 && (
                    <div style={{ maxWidth: 420, margin: '0 auto', width: '100%', animation: 'fadeIn 0.4s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(10, 132, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={20} color="#0A84FF" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Body Profile</h2>
                                <p style={{ fontSize: 13, color: 'var(--text2)' }}>Tell us about yourself</p>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Display Name</label>
                            <input className="input-field" placeholder="What should we call you?" value={fullName} onChange={e => setFullName(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            <div className="input-group">
                                <label className="input-label">Height (cm)</label>
                                <input className="input-field" type="number" placeholder="170" value={height} onChange={e => setHeight(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Weight (kg)</label>
                                <input className="input-field" type="number" step="0.1" placeholder="70.0" value={weight} onChange={e => setWeight(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            <div className="input-group">
                                <label className="input-label">Age</label>
                                <input className="input-field" type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Gender</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['male', 'female'].map(g => (
                                        <button key={g} className={`period-btn ${gender === g ? 'active' : ''}`}
                                            style={{ flex: 1, padding: '10px 0' }}
                                            onClick={() => setGender(g)}>
                                            {g === 'male' ? '♂ Male' : '♀ Female'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                            <button className="btn btn-secondary" onClick={() => setStep(0)}>
                                <ChevronLeft size={18} /> Back
                            </button>
                            <button className="btn btn-primary" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                                Next <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Goal Setting */}
                {step === 2 && (
                    <div style={{ maxWidth: 420, margin: '0 auto', width: '100%', animation: 'fadeIn 0.4s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 69, 58, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Target size={20} color="#FF453A" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Set Your Goal</h2>
                                <p style={{ fontSize: 13, color: 'var(--text2)' }}>Choose a realistic target</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8 }}>Timeframe</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[1, 2, 3, 4].map(m => (
                                    <button key={m}
                                        className={`period-btn ${selectedMonths === m ? 'active' : ''}`}
                                        style={{ flex: 1, padding: '10px 0' }}
                                        onClick={() => { setSelectedMonths(m); if (selectedLoss > m * 4) setSelectedLoss(m * 4); }}>
                                        {m}mo
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8 }}>
                                Target Weight Loss (max {maxLoss}kg)
                            </div>
                            <select className="input-field"
                                value={selectedLoss}
                                onChange={e => setSelectedLoss(parseInt(e.target.value))}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 15 }}>
                                {Array.from({ length: maxLoss }, (_, i) => i + 1).map(loss => (
                                    <option key={loss} value={loss}>
                                        Lose {loss}kg → Goal: {(currentWeight - loss).toFixed(1)}kg
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Preview */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
                            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Your Plan Preview</div>
                            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 800 }}>{currentWeight.toFixed(1)}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Current (kg)</div>
                                </div>
                                <div style={{ fontSize: 24, color: 'var(--text3)', alignSelf: 'center' }}>→</div>
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{(currentWeight - selectedLoss).toFixed(1)}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Target (kg)</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: '#30D158' }}>{selectedMonths}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Months</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>
                                <ChevronLeft size={18} /> Back
                            </button>
                            <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                                {saving ? 'Saving...' : 'Save & Continue'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Complete */}
                {step === 3 && (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(48, 209, 88, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Check size={40} color="#30D158" />
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>You're All Set! 🚀</h1>
                        <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
                            Your profile is ready. Let's start tracking<br />your journey to a healthier you!
                        </p>
                        <button className="btn btn-primary" style={{ maxWidth: 320, margin: '0 auto' }} onClick={finish}>
                            Go to Dashboard <ChevronRight size={18} style={{ marginLeft: 4 }} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
