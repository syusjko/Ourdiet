import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight, TrendingDown, Zap, Users, Camera } from 'lucide-react';
import SEO from '../components/SEO';

const STEPS = ['info', 'goal', 'result'];

function CalorieCalculator({ onGoSignup }) {
    const [step, setStep] = useState(0);
    const [gender, setGender] = useState('male');
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [weeks, setWeeks] = useState('8');
    const [result, setResult] = useState(null);
    const [animateResult, setAnimateResult] = useState(false);

    const canGoNext = () => {
        if (step === 0) return age && height && weight;
        if (step === 1) return targetWeight && weeks && parseFloat(targetWeight) < parseFloat(weight);
        return true;
    };

    const calculateBMR = () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseInt(age);
        if (gender === 'male') return Math.round(10 * w + 6.25 * h - 5 * a + 5);
        return Math.round(10 * w + 6.25 * h - 5 * a - 161);
    };

    const handleNext = () => {
        if (step === 0) {
            setStep(1);
        } else if (step === 1) {
            const bmr = calculateBMR();
            const tdee = Math.round(bmr * 1.4);
            const totalKgToLose = parseFloat(weight) - parseFloat(targetWeight);
            const totalCalToLose = totalKgToLose * 7700;
            const totalDays = parseInt(weeks) * 7;
            const dailyDeficit = Math.round(totalCalToLose / totalDays);
            const dailyTarget = Math.max(tdee - dailyDeficit, 1200);
            setResult({ bmr, tdee, totalKgToLose: totalKgToLose.toFixed(1), dailyDeficit, dailyTarget, weeks: parseInt(weeks), isSafe: dailyDeficit <= 1000 });
            setStep(2);
            setTimeout(() => setAnimateResult(true), 100);
        }
    };

    const handleBack = () => {
        if (step > 0) { setStep(step - 1); setAnimateResult(false); }
    };

    return (
        <div className="lp-calc" id="calculator">
            <div className="lp-calc-header">
                <div className="lp-calc-step-dots">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`lp-calc-dot ${i <= step ? 'active' : ''}`} />
                    ))}
                </div>
                <div className="lp-calc-step-label">
                    {step === 0 && 'About You'}
                    {step === 1 && 'Your Goal'}
                    {step === 2 && 'Your Plan'}
                </div>
            </div>

            <div className="lp-calc-body">
                {step === 0 && (
                    <div className="lp-calc-form lp-fade-in">
                        <h3 className="lp-calc-title">Tell us about yourself</h3>
                        <p className="lp-calc-sub">Enter your body metrics to calculate your daily calorie needs.</p>
                        <div className="lp-calc-gender">
                            <button className={`lp-gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>
                                Male
                            </button>
                            <button className={`lp-gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>
                                Female
                            </button>
                        </div>
                        <div className="lp-calc-fields">
                            <div className="lp-field">
                                <label>Age</label>
                                <div className="lp-field-input">
                                    <input type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
                                    <span className="lp-field-unit">years</span>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>Height</label>
                                <div className="lp-field-input">
                                    <input type="number" placeholder="170" value={height} onChange={e => setHeight(e.target.value)} />
                                    <span className="lp-field-unit">cm</span>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>Weight</label>
                                <div className="lp-field-input">
                                    <input type="number" placeholder="75" value={weight} onChange={e => setWeight(e.target.value)} />
                                    <span className="lp-field-unit">kg</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="lp-calc-form lp-fade-in">
                        <h3 className="lp-calc-title">Set your target</h3>
                        <p className="lp-calc-sub">How much weight do you want to lose, and how quickly?</p>
                        <div className="lp-calc-fields">
                            <div className="lp-field">
                                <label>Current Weight</label>
                                <div className="lp-field-input">
                                    <input type="number" value={weight} disabled style={{ opacity: 0.5 }} />
                                    <span className="lp-field-unit">kg</span>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>Target Weight</label>
                                <div className="lp-field-input">
                                    <input type="number" placeholder="68" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} />
                                    <span className="lp-field-unit">kg</span>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>Timeline</label>
                                <div className="lp-field-input">
                                    <select value={weeks} onChange={e => setWeeks(e.target.value)} className="lp-select">
                                        <option value="4">4 weeks</option>
                                        <option value="8">8 weeks</option>
                                        <option value="12">12 weeks</option>
                                        <option value="16">16 weeks</option>
                                        <option value="24">24 weeks</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        {targetWeight && parseFloat(targetWeight) >= parseFloat(weight) && (
                            <div className="lp-calc-warn">Target weight must be lower than your current weight.</div>
                        )}
                    </div>
                )}

                {step === 2 && result && (
                    <div className={`lp-calc-result lp-fade-in ${animateResult ? 'show' : ''}`}>
                        <div className="lp-result-hero">
                            <div className="lp-result-number">{result.dailyTarget}</div>
                            <div className="lp-result-unit">kcal / day</div>
                            <div className="lp-result-label">Your daily calorie budget</div>
                        </div>
                        <div className="lp-result-grid">
                            <div className="lp-result-card">
                                <div className="lp-result-card-value">{result.bmr}</div>
                                <div className="lp-result-card-label">Base Metabolism<br />(BMR)</div>
                            </div>
                            <div className="lp-result-card">
                                <div className="lp-result-card-value">{result.tdee}</div>
                                <div className="lp-result-card-label">Maintenance<br />(TDEE)</div>
                            </div>
                            <div className="lp-result-card accent">
                                <div className="lp-result-card-value">-{result.dailyDeficit}</div>
                                <div className="lp-result-card-label">Daily Deficit<br />Needed</div>
                            </div>
                        </div>
                        <div className="lp-result-summary">
                            <p>To reach <strong>{targetWeight}kg</strong> in <strong>{result.weeks} weeks</strong>, you need a daily deficit of <strong>{result.dailyDeficit} kcal</strong>.</p>
                            {!result.isSafe && (
                                <div className="lp-result-warn">This pace is quite aggressive. Consider extending your timeline for healthier results (recommended: 500-750 kcal deficit/day).</div>
                            )}
                        </div>
                        <div className="lp-result-cta">
                            <p className="lp-result-cta-text">Track meals, exercise, and hit your daily target with OurDiet.</p>
                            <Link to="/signup" className="lp-btn-signup">
                                Start tracking for free <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <div className="lp-calc-actions">
                {step > 0 && step < 2 && (
                    <button className="lp-calc-back" onClick={handleBack}>Back</button>
                )}
                {step < 2 && (
                    <button className="lp-calc-next" onClick={handleNext} disabled={!canGoNext()}>
                        {step === 1 ? 'Calculate' : 'Next'} <ArrowRight size={16} />
                    </button>
                )}
                {step === 2 && (
                    <button className="lp-calc-back" onClick={() => { setStep(0); setAnimateResult(false); }}>Start over</button>
                )}
            </div>
        </div>
    );
}

export default function Landing() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="lp">
            <SEO 
                title="Eat less. Lose weight." 
                description="The same calorie deficit science behind Wegovy & Ozempic — no magic pills. AI-powered meal tracking and group accountability to help you stay on track."
                url="/"
            />
            {/* Nav */}
            <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="lp-nav-inner">
                    <div className="lp-logo">OurDiet</div>
                    <div className="lp-nav-right">
                        <Link to="/login" className="lp-nav-link">Log In</Link>
                        <Link to="/signup" className="lp-btn-nav">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero — left text + right calculator */}
            <section className="lp-hero">
                <div className="lp-hero-inner">
                    <div className="lp-hero-left">
                        <div className="lp-hero-badge">
                            Science-based weight management
                        </div>
                        <h1 className="lp-hero-title">
                            Eat less.<br />
                            <span className="lp-gradient-text">Lose weight.</span>
                        </h1>
                        <p className="lp-hero-desc">
                            The same calorie deficit science behind Wegovy &amp; Ozempic — no magic pills.
                            AI-powered meal tracking and group accountability to help you stay on track.
                        </p>
                        <div className="lp-hero-btns">
                            <Link to="/signup" className="lp-btn-hero">
                                Get Started — it's free <ArrowRight size={16} />
                            </Link>
                        </div>

                        {/* Trust indicators */}
                        <div className="lp-hero-trust">
                            <div className="lp-trust-item">
                                <Zap size={14} /> AI Calorie Analysis
                            </div>
                            <div className="lp-trust-item">
                                <Users size={14} /> Group Diet
                            </div>
                            <div className="lp-trust-item">
                                <TrendingDown size={14} /> Weight Tracking
                            </div>
                        </div>
                    </div>

                    <div className="lp-hero-right">
                        <div className="lp-hero-calc-label">
                            Try it now — no signup needed
                        </div>
                        <CalorieCalculator />
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="lp-section">
                <div className="lp-section-inner">
                    <div className="lp-overline">How It Works</div>
                    <h2 className="lp-section-title">Three steps to your goal</h2>
                    <div className="lp-steps">
                        <div className="lp-step-card">
                            <div className="lp-step-icon"><Camera size={24} /></div>
                            <div className="lp-step-num">01</div>
                            <h3 className="lp-step-title">Log your meals</h3>
                            <p className="lp-step-desc">Snap a photo or type what you ate. AI identifies the food and calculates calories instantly.</p>
                        </div>
                        <div className="lp-step-card">
                            <div className="lp-step-icon"><TrendingDown size={24} /></div>
                            <div className="lp-step-num">02</div>
                            <h3 className="lp-step-title">Track your deficit</h3>
                            <p className="lp-step-desc">See your daily balance of calories in vs. out. BMR, exercise, steps — all calculated automatically.</p>
                        </div>
                        <div className="lp-step-card">
                            <div className="lp-step-icon"><Users size={24} /></div>
                            <div className="lp-step-num">03</div>
                            <h3 className="lp-step-title">Stay accountable</h3>
                            <p className="lp-step-desc">Join diet groups, compare progress, and motivate each other through daily check-ins.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="lp-section lp-section-tinted">
                <div className="lp-section-inner">
                    <div className="lp-overline">Features</div>
                    <h2 className="lp-section-title">Everything you need</h2>
                    <div className="lp-features">
                        {[
                            { icon: <Zap size={20} />, title: 'AI Food Analysis', desc: 'Photo or text — our AI breaks down calories, protein, carbs, and fat in seconds.' },
                            { icon: <TrendingDown size={20} />, title: 'Weight Tracking', desc: 'Log daily weigh-ins and visualize your progress with beautiful trend charts.' },
                            { icon: <Camera size={20} />, title: 'Workout & Steps', desc: 'Track exercise calories and steps. See your total daily burn at a glance.' },
                            { icon: <Users size={20} />, title: 'Group Diet', desc: 'Create or join groups. Share stats, compare progress, and chat — all in-app.' },
                        ].map((f, i) => (
                            <div key={i} className="lp-feature-card">
                                <div className="lp-feature-icon">{f.icon}</div>
                                <h3 className="lp-feature-title">{f.title}</h3>
                                <p className="lp-feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="lp-cta">
                <div className="lp-cta-inner">
                    <h2 className="lp-cta-title">Ready to start your journey?</h2>
                    <p className="lp-cta-desc">Free forever. No credit card required. Just science.</p>
                    <Link to="/signup" className="lp-btn-hero lp-btn-cta">
                        Create your free account <ArrowRight size={16} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="lp-footer">
                <div className="lp-footer-inner">
                    <div className="lp-logo" style={{ fontSize: 16 }}>OurDiet</div>
                    <div className="lp-footer-copy">© 2026 OurDiet</div>
                </div>
            </footer>
        </div>
    );
}
