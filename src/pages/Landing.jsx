import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, TrendingDown, Zap, Users, Camera, ChevronDown } from 'lucide-react';

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
                    {step === 0 && '기본 정보'}
                    {step === 1 && '목표 설정'}
                    {step === 2 && '나의 플랜'}
                </div>
            </div>

            <div className="lp-calc-body">
                {step === 0 && (
                    <div className="lp-calc-form lp-fade-in">
                        <h3 className="lp-calc-title">내 정보 입력</h3>
                        <p className="lp-calc-sub">기초대사량 계산을 위해 기본 정보를 입력해주세요.</p>
                        <div className="lp-calc-gender">
                            <button className={`lp-gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>
                                <span>🙋‍♂️</span> 남성
                            </button>
                            <button className={`lp-gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>
                                <span>🙋‍♀️</span> 여성
                            </button>
                        </div>
                        <div className="lp-calc-fields">
                            <div className="lp-field">
                                <label>나이</label>
                                <div className="lp-field-input">
                                    <input type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
                                    <span className="lp-field-unit">세</span>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>키</label>
                                <div className="lp-field-input">
                                    <input type="number" placeholder="170" value={height} onChange={e => setHeight(e.target.value)} />
                                    <span className="lp-field-unit">cm</span>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>체중</label>
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
                        <h3 className="lp-calc-title">목표를 설정하세요</h3>
                        <p className="lp-calc-sub">얼마나 빼고 싶은지, 기간은 어떻게 할지 정해주세요.</p>
                        <div className="lp-calc-fields">
                            <div className="lp-field">
                                <label>현재 체중</label>
                                <div className="lp-field-input">
                                    <input type="number" value={weight} disabled style={{ opacity: 0.5 }} />
                                    <span className="lp-field-unit">kg</span>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>목표 체중</label>
                                <div className="lp-field-input">
                                    <input type="number" placeholder="68" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} />
                                    <span className="lp-field-unit">kg</span>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>기간</label>
                                <div className="lp-field-input">
                                    <select value={weeks} onChange={e => setWeeks(e.target.value)} className="lp-select">
                                        <option value="4">4주</option>
                                        <option value="8">8주</option>
                                        <option value="12">12주</option>
                                        <option value="16">16주</option>
                                        <option value="24">24주</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        {targetWeight && parseFloat(targetWeight) >= parseFloat(weight) && (
                            <div className="lp-calc-warn">목표 체중은 현재 체중보다 낮아야 합니다.</div>
                        )}
                    </div>
                )}

                {step === 2 && result && (
                    <div className={`lp-calc-result lp-fade-in ${animateResult ? 'show' : ''}`}>
                        <div className="lp-result-hero">
                            <div className="lp-result-number">{result.dailyTarget}</div>
                            <div className="lp-result-unit">kcal / 일</div>
                            <div className="lp-result-label">하루 칼로리 목표</div>
                        </div>
                        <div className="lp-result-grid">
                            <div className="lp-result-card">
                                <div className="lp-result-card-value">{result.bmr}</div>
                                <div className="lp-result-card-label">기초대사량<br />(BMR)</div>
                            </div>
                            <div className="lp-result-card">
                                <div className="lp-result-card-value">{result.tdee}</div>
                                <div className="lp-result-card-label">유지 칼로리<br />(TDEE)</div>
                            </div>
                            <div className="lp-result-card accent">
                                <div className="lp-result-card-value">-{result.dailyDeficit}</div>
                                <div className="lp-result-card-label">일일 적자<br />필요량</div>
                            </div>
                        </div>
                        <div className="lp-result-summary">
                            <p><strong>{result.weeks}주</strong> 안에 <strong>{targetWeight}kg</strong>에 도달하려면 매일 <strong>{result.dailyDeficit} kcal</strong>의 적자가 필요합니다.</p>
                            {!result.isSafe && (
                                <div className="lp-result-warn">⚠️ 다소 급격한 페이스입니다. 건강한 감량을 위해 기간을 늘려보세요 (권장: 일 500~750 kcal 적자).</div>
                            )}
                        </div>
                        <div className="lp-result-cta">
                            <p className="lp-result-cta-text">OurDiet으로 식단, 운동을 추적하고 목표를 달성하세요.</p>
                            <Link to="/signup" className="lp-btn-signup">
                                무료로 시작하기 <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <div className="lp-calc-actions">
                {step > 0 && step < 2 && (
                    <button className="lp-calc-back" onClick={handleBack}>← 이전</button>
                )}
                {step < 2 && (
                    <button className="lp-calc-next" onClick={handleNext} disabled={!canGoNext()}>
                        {step === 1 ? '계산하기' : '다음'} <ArrowRight size={16} />
                    </button>
                )}
                {step === 2 && (
                    <button className="lp-calc-back" onClick={() => { setStep(0); setAnimateResult(false); }}>↻ 다시 계산</button>
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
            {/* Nav */}
            <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="lp-nav-inner">
                    <div className="lp-logo">OurDiet</div>
                    <div className="lp-nav-right">
                        <Link to="/login" className="lp-nav-link">로그인</Link>
                        <Link to="/signup" className="lp-btn-nav">시작하기</Link>
                    </div>
                </div>
            </nav>

            {/* Hero — left text + right calculator */}
            <section className="lp-hero">
                <div className="lp-hero-inner">
                    <div className="lp-hero-left">
                        <div className="lp-hero-badge">
                            <Sparkles size={13} /> 과학 기반 체중 관리
                        </div>
                        <h1 className="lp-hero-title">
                            안먹으면<br />
                            <span className="lp-gradient-text">빠진다.</span>
                        </h1>
                        <p className="lp-hero-desc">
                            위고비·마운자로와 똑같은 원리, 칼로리 적자.
                            마법의 약은 없습니다. AI 식단 추적과 그룹 동기부여로 함께 빼세요.
                        </p>
                        <div className="lp-hero-btns">
                            <Link to="/signup" className="lp-btn-hero">
                                무료로 시작하기 <ArrowRight size={16} />
                            </Link>
                        </div>

                        {/* Trust indicators */}
                        <div className="lp-hero-trust">
                            <div className="lp-trust-item">
                                <Zap size={14} /> AI 칼로리 분석
                            </div>
                            <div className="lp-trust-item">
                                <Users size={14} /> 그룹 다이어트
                            </div>
                            <div className="lp-trust-item">
                                <TrendingDown size={14} /> 체중 트래킹
                            </div>
                        </div>
                    </div>

                    <div className="lp-hero-right">
                        <div className="lp-hero-calc-label">
                            <Sparkles size={14} /> 지금 바로 테스트해보세요
                        </div>
                        <CalorieCalculator />
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="lp-section">
                <div className="lp-section-inner">
                    <div className="lp-overline">How It Works</div>
                    <h2 className="lp-section-title">세 단계로 시작하세요</h2>
                    <div className="lp-steps">
                        <div className="lp-step-card">
                            <div className="lp-step-icon"><Camera size={24} /></div>
                            <div className="lp-step-num">01</div>
                            <h3 className="lp-step-title">식사를 기록하세요</h3>
                            <p className="lp-step-desc">사진을 찍거나 텍스트로 입력하면 AI가 자동으로 칼로리와 영양소를 분석합니다.</p>
                        </div>
                        <div className="lp-step-card">
                            <div className="lp-step-icon"><TrendingDown size={24} /></div>
                            <div className="lp-step-num">02</div>
                            <h3 className="lp-step-title">적자를 추적하세요</h3>
                            <p className="lp-step-desc">섭취 칼로리 vs 소모 칼로리를 한눈에. BMR, 운동, 걸음수 모두 자동 계산됩니다.</p>
                        </div>
                        <div className="lp-step-card">
                            <div className="lp-step-icon"><Users size={24} /></div>
                            <div className="lp-step-num">03</div>
                            <h3 className="lp-step-title">함께 다이어트하세요</h3>
                            <p className="lp-step-desc">다이어트 그룹에 참여하고, 서로의 진행상황을 공유하며 동기부여하세요.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="lp-section lp-section-tinted">
                <div className="lp-section-inner">
                    <div className="lp-overline">Features</div>
                    <h2 className="lp-section-title">필요한 모든 기능</h2>
                    <div className="lp-features">
                        {[
                            { icon: <Sparkles size={20} />, title: 'AI 식단 분석', desc: '사진 또는 텍스트 — AI가 몇 초 만에 칼로리, 단백질, 탄수화물, 지방을 분석합니다.' },
                            { icon: <TrendingDown size={20} />, title: '체중 트래킹', desc: '매일 체중을 기록하고 트렌드 차트로 변화를 시각적으로 확인하세요.' },
                            { icon: <Zap size={20} />, title: '운동 & 걸음수', desc: '운동 칼로리와 걸음수를 추적하세요. 하루 총 소모량을 한눈에 볼 수 있습니다.' },
                            { icon: <Users size={20} />, title: '그룹 다이어트', desc: '그룹을 만들거나 참여하세요. 통계 비교, 진행상황 공유, 채팅까지 모두 인앱으로.' },
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
                    <h2 className="lp-cta-title">지금 시작할 준비 되셨나요?</h2>
                    <p className="lp-cta-desc">영원히 무료. 신용카드 불필요. 과학만 있으면 됩니다.</p>
                    <Link to="/signup" className="lp-btn-hero lp-btn-cta">
                        무료 계정 만들기 <ArrowRight size={16} />
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
