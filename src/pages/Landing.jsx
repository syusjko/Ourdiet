import { Link } from 'react-router-dom';

export default function Landing() {
    return (
        <div className="landing-page">
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-logo">OurDiet</div>
                    <div className="landing-nav-btns">
                        <Link to="/login" className="landing-nav-link">Log In</Link>
                        <Link to="/signup" className="landing-btn-primary">Sign Up</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="landing-hero">
                <div className="landing-hero-content">
                    <h1 className="landing-hero-title">
                        Eat less.<br />
                        <span className="landing-hero-title-sub">Lose weight.</span>
                    </h1>
                    <p className="landing-hero-desc">
                        The principle is simple—it's the exact same science behind Wegovy. Create a calorie deficit. Track what you eat, share your progress, and stay accountable together.
                    </p>
                    <div className="landing-hero-actions">
                        <Link to="/signup" className="landing-btn-hero">Get Started — it's free</Link>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="landing-divider" />

            {/* How it works */}
            <section className="landing-section">
                <div className="landing-section-inner">
                    <p className="landing-overline">How it works</p>
                    <h2 className="landing-section-title">Three steps to better eating habits</h2>

                    <div className="landing-steps">
                        <div className="landing-step-card">
                            <div className="landing-step-num">1</div>
                            <h3 className="landing-step-title">Log your meal</h3>
                            <p className="landing-step-desc">Take a photo or type what you ate. Our AI identifies the food and estimates calories, protein, carbs, and fat.</p>
                        </div>
                        <div className="landing-step-card">
                            <div className="landing-step-num">2</div>
                            <h3 className="landing-step-title">Track your progress</h3>
                            <p className="landing-step-desc">See your daily calorie intake, weight trend, and workout activity in one clean dashboard.</p>
                        </div>
                        <div className="landing-step-card">
                            <div className="landing-step-num">3</div>
                            <h3 className="landing-step-title">Stay accountable</h3>
                            <p className="landing-step-desc">Join or create groups with friends. See each other's daily stats and keep each other motivated through chat.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="landing-section landing-section-alt">
                <div className="landing-section-inner">
                    <p className="landing-overline">Features</p>
                    <h2 className="landing-section-title">Everything you need, nothing you don't</h2>

                    <div className="landing-features">
                        <div className="landing-feature-card">
                            <h3 className="landing-feature-title">AI Food Analysis</h3>
                            <p className="landing-feature-desc">Snap a photo and let Gemini AI break down the nutrition. 3 free tokens per day.</p>
                        </div>
                        <div className="landing-feature-card">
                            <h3 className="landing-feature-title">Weight Tracking</h3>
                            <p className="landing-feature-desc">Log your weight daily and visualise changes over time with a simple chart.</p>
                        </div>
                        <div className="landing-feature-card">
                            <h3 className="landing-feature-title">Workout Log</h3>
                            <p className="landing-feature-desc">Record steps and exercise calories. See your total burn alongside what you eat.</p>
                        </div>
                        <div className="landing-feature-card">
                            <h3 className="landing-feature-title">Group Diet</h3>
                            <p className="landing-feature-desc">Create private or public groups. Share progress, compare stats, and chat in-app.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="landing-cta">
                <div className="landing-cta-inner">
                    <h2 className="landing-cta-title">Ready to start?</h2>
                    <p className="landing-cta-desc">Free to use. No credit card required.</p>
                    <Link to="/signup" className="landing-btn-hero landing-btn-white">Create your account</Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-logo" style={{ fontSize: 18 }}>OurDiet</div>
                    <div className="landing-footer-copy">© 2026 OurDiet</div>
                </div>
            </footer>
        </div>
    );
}
