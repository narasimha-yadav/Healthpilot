import { useEffect, useRef, useState } from 'react';
import { addFamilyMember, analyzeReport, askHealthPilot, confirmAccountVerification, confirmPasswordReset, getChatHistory, getFamilyMembers, getMedicineStatuses, getReports, loginAccount, registerAccount, requestAccountVerification, requestPasswordReset, resetMedicineStatuses, saveMedicineStatus, saveReport } from './api';
import './capabilities.css';

const medicines = [
  { id: 1, name: 'Metformin', dose: '500 mg', time: '8:00 am' },
  { id: 2, name: 'Amlodipine', dose: '5 mg', time: '9:00 am' },
  { id: 3, name: 'Metformin', dose: '500 mg', time: '8:00 pm' },
];

const sampleResults = [
  ['HbA1c', '8.1%', 'high', 'Your average sugar has been higher than the usual target.'],
  ['Fasting sugar', '164 mg/dL', 'watch', 'This is above the usual fasting range.'],
  ['LDL', '128 mg/dL', 'watch', 'This is a little above the preferred level for many people.'],
  ['Hemoglobin', '13.2 g/dL', 'normal', 'This is in the usual healthy range.'],
  ['Creatinine', '1.0 mg/dL', 'normal', 'This result is in the usual kidney function range.'],
];

const copy = {
  en: {
    language: 'English', login: 'Log in', demo: 'Continue as demo patient', home: 'Home', add: 'Add', ask: 'Ask', records: 'Records', family: 'Family',
    greeting: 'Good morning, Narasimha', subtitle: 'Let’s take care of today, one step at a time.', adherence: 'Today’s adherence', taken: 'Taken', missed: 'Missed',
    reset: 'Reset today', alert: 'Family alert', askQuestion: 'Ask HealthPilot a question', latest: 'Latest report', viewReport: 'View report',
    addTitle: 'Add a report', addText: 'Take a clear photo of a lab report or prescription. HealthPilot will only use values it can read.',
    upload: 'Upload photo', sample: 'Try the sample report', explanation: 'Your report, in simple words', doctorQuestions: 'Questions for your doctor',
    askTitle: 'Ask HealthPilot', askText: 'Simple answers for you and your family.', me: 'Me', familyMember: 'Family member', send: 'Send', listen: 'Listen',
    recordsTitle: 'Your records', trend: 'HbA1c trend', timeline: 'Health timeline', visit: 'Doctor visit summary', familyTitle: 'Family support',
    alertRule: 'Alert after missed doses in a row', preview: 'Preview alert', logout: 'Log out',
  },
  te: {
    language: 'తెలుగు', login: 'లాగిన్', demo: 'డెమో రోగిగా కొనసాగండి', home: 'హోమ్', add: 'జోడించు', ask: 'అడుగు', records: 'రికార్డులు', family: 'కుటుంబం',
    greeting: 'శుభోదయం, రమేష్', subtitle: 'ఈ రోజును ఒక్కో అడుగుగా చూసుకుందాం.', adherence: 'ఈ రోజు మందుల క్రమం', taken: 'తీసుకున్నారు', missed: 'మిస్ అయ్యింది',
    reset: 'ఈ రోజు రీసెట్', alert: 'కుటుంబ హెచ్చరిక', askQuestion: 'HealthPilot ను ప్రశ్న అడగండి', latest: 'తాజా రిపోర్ట్', viewReport: 'రిపోర్ట్ చూడండి',
    addTitle: 'రిపోర్ట్ జోడించండి', addText: 'ల్యాబ్ రిపోర్ట్ లేదా ప్రిస్క్రిప్షన్ ఫోటో తీయండి.', upload: 'ఫోటో అప్‌లోడ్', sample: 'నమూనా రిపోర్ట్ ప్రయత్నించండి',
    explanation: 'మీ రిపోర్ట్, సులభమైన మాటల్లో', doctorQuestions: 'డాక్టర్‌ను అడగాల్సిన ప్రశ్నలు', askTitle: 'HealthPilot ను అడగండి', askText: 'మీకు, మీ కుటుంబానికి సులభమైన సమాధానాలు.',
    me: 'నేను', familyMember: 'కుటుంబ సభ్యుడు', send: 'పంపండి', listen: 'వినండి', recordsTitle: 'మీ రికార్డులు', trend: 'HbA1c మార్పు', timeline: 'ఆరోగ్య కాలక్రమం',
    visit: 'డాక్టర్ సందర్శన సారాంశం', familyTitle: 'కుటుంబ సహాయం', alertRule: 'వరుసగా మిస్ అయిన మోతాదుల తర్వాత హెచ్చరిక', preview: 'హెచ్చరిక చూడండి', logout: 'లాగ్ అవుట్',
  },
  hi: {
    language: 'हिन्दी', login: 'लॉग इन', demo: 'डेमो मरीज़ के रूप में जारी रखें', home: 'होम', add: 'जोड़ें', ask: 'पूछें', records: 'रिकॉर्ड', family: 'परिवार',
    greeting: 'सुप्रभात, रमेश', subtitle: 'आज की देखभाल एक-एक कदम करके करें।', adherence: 'आज की दवा नियमितता', taken: 'ली गई', missed: 'छूटी',
    reset: 'आज रीसेट करें', alert: 'परिवार को चेतावनी', askQuestion: 'HealthPilot से सवाल पूछें', latest: 'नवीनतम रिपोर्ट', viewReport: 'रिपोर्ट देखें',
    addTitle: 'रिपोर्ट जोड़ें', addText: 'लैब रिपोर्ट या प्रिस्क्रिप्शन की साफ़ फोटो लें।', upload: 'फोटो अपलोड करें', sample: 'सैंपल रिपोर्ट आज़माएं',
    explanation: 'आपकी रिपोर्ट, आसान भाषा में', doctorQuestions: 'डॉक्टर से पूछने के सवाल', askTitle: 'HealthPilot से पूछें', askText: 'आप और परिवार के लिए आसान जवाब।',
    me: 'मैं', familyMember: 'परिवार का सदस्य', send: 'भेजें', listen: 'सुनें', recordsTitle: 'आपके रिकॉर्ड', trend: 'HbA1c ट्रेंड', timeline: 'स्वास्थ्य टाइमलाइन',
    visit: 'डॉक्टर मुलाकात सारांश', familyTitle: 'परिवार का साथ', alertRule: 'लगातार छूटी दवाओं के बाद चेतावनी', preview: 'चेतावनी देखें', logout: 'लॉग आउट',
  },
};

function Icon({ name, size = 20 }) {
  const paths = { home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6', plus: 'M12 5v14M5 12h14', chat: 'M4 5.5h16v11H9l-5 4v-4H4z', file: 'M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6', users: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 8a3 3 0 0 1 0 6M20 20v-2a4 4 0 0 0-3-3', sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z', eye: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', eyeoff: 'M3 3l18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a18 18 0 0 1-3 3.7M6.2 6.3C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6', mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM19 12a7 7 0 0 1-14 0M12 19v3M8 22h8', arrow: 'M5 12h14M13 6l6 6-6 6', check: 'M5 12l4 4L19 6', warning: 'M12 3 2.8 20h18.4L12 3zM12 9v4M12 17h.01' };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function Brand({ dark, setDark, language, setLanguage }) {
  return <header className="topbar"><div className="brand"><img src="/altrix-labs-logo.png" alt="Altrix Labs" /><span>Health<span>Pilot</span></span></div><div className="top-actions"><select aria-label="Language" value={language} onChange={e => setLanguage(e.target.value)}><option value="en">EN</option><option value="te">తెలుగు</option><option value="hi">हिन्दी</option><option value="ta">தமிழ்</option></select><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle light and dark mode"><Icon name="sun" size={19} /></button></div></header>;
}

function SafetyNote() { return null; }

function Login({ t, onLogin }) {
  const [fields, setFields] = useState({ identity: localStorage.getItem('healthpilot-identity') || '', fullName: '', email: '', phone: '', password: '', confirmPassword: '', terms: false });
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const switchMode = nextMode => {
    setMode(nextMode);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const submit = async event => {
    event.preventDefault();
    if (mode === 'login' && (!fields.phone.trim() || !fields.password.trim())) {
      setError('Enter your phone number and password to log in.');
      return;
    }
    if (mode === 'create' && (!fields.fullName.trim() || !fields.email.trim() || !fields.phone.trim() || !fields.password.trim() || !fields.confirmPassword.trim())) {
      setError('Enter your full name, email, phone number, password, and password confirmation.');
      return;
    }
    if (mode === 'create' && fields.password !== fields.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (mode === 'create' && !fields.terms) {
      setError('Accept the terms and conditions to create your account.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginAccount(fields.phone, fields.password);
      } else {
        const response = await registerAccount(fields.fullName, fields.email, fields.password, fields.phone);
        setVerificationCode(response.development_code || '');
        setVerificationMode(true);
        setError('Account created. Enter the verification code shown for local development.');
        return;
      }
      if (remember) localStorage.setItem('healthpilot-identity', (mode === 'login' ? fields.phone : fields.email).trim());
      onLogin((mode === 'login' ? fields.phone : fields.email).trim());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };
  const resendVerification = async () => {
    setSubmitting(true);
    try {
      const response = await requestAccountVerification(fields.email);
      setVerificationCode(response.development_code || '');
      setError('A new verification code was created.');
    } catch (requestError) { setError(requestError.message); } finally { setSubmitting(false); }
  };
  const finishVerification = async event => {
    event.preventDefault();
    if (verificationCode.length !== 6) { setError('Enter the six-digit verification code.'); return; }
    setSubmitting(true);
    try {
      await confirmAccountVerification(fields.email || fields.phone, verificationCode);
      setVerificationMode(false);
      setVerificationCode('');
      setMode('login');
      setError('Account verified. You can now log in.');
    } catch (requestError) { setError(requestError.message); } finally { setSubmitting(false); }
  };
  const startReset = async () => {
    if (!fields.phone.trim()) { setError('Enter your phone number first.'); return; }
    setSubmitting(true);
    try {
      const response = await requestPasswordReset(fields.phone);
      setResetCode(response.development_code);
      setResetMode(true);
      setError('A reset code was created for this local development app.');
    } catch (requestError) { setError(requestError.message); } finally { setSubmitting(false); }
  };
  const finishReset = async event => {
    event.preventDefault();
    if (resetCode.length !== 6 || resetPassword.length < 6) { setError('Enter the six-digit code and a password with at least 6 characters.'); return; }
    setSubmitting(true);
    try { await confirmPasswordReset(fields.phone, resetCode, resetPassword); setResetMode(false); setResetCode(''); setResetPassword(''); setError('Password updated. You can now log in.'); setMode('login'); } catch (requestError) { setError(requestError.message); } finally { setSubmitting(false); }
  };
  if (resetMode) return <main className="login-page"><section className="login-card auth-card"><button type="button" className="back-button" onClick={() => setResetMode(false)}>← Back to Log In</button><h2>Reset Password</h2><p className="muted">Enter the local reset code and choose a new password.</p><form onSubmit={finishReset}><label>Reset code<input value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code" /></label><label>New password<input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="At least 6 characters" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary full auth-submit" type="submit" disabled={submitting}>{submitting ? 'Updating...' : 'Update Password'}</button></form></section></main>;
  if (verificationMode) return <main className="login-page"><section className="login-card auth-card"><button type="button" className="back-button" onClick={() => { setVerificationMode(false); switchMode('create'); }}>← Back to Create Account</button><h2>Verify Account</h2><p className="muted">Enter the six-digit code sent to your email.</p><form onSubmit={finishVerification}><label>Email<input type="email" value={fields.email} onChange={e => setFields({ ...fields, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></label><label>Verification code<input value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code" autoComplete="one-time-code" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary full auth-submit" type="submit" disabled={submitting}>{submitting ? 'Verifying...' : 'Verify Account'}</button></form><button type="button" className="demo-link" onClick={resendVerification} disabled={submitting}>Resend verification code</button></section></main>;
  return <main className="login-page"><div className="login-hero"><img className="logo-large" src="/altrix-labs-logo.png" alt="Altrix Labs — Intelligent Solutions. Real Impact." /><div className="gold-line" /><h1>Understand your health.<br />Follow your plan.<br /><em>Family beside you.</em></h1><p>Simple, calm support for your healthcare journey.</p></div><section className="login-card auth-card"><div className="auth-tabs" role="tablist"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} role="tab" aria-selected={mode === 'login'}>Log In</button><button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => switchMode('create')} role="tab" aria-selected={mode === 'create'}>Create Account</button></div><h2>{mode === 'login' ? 'Log In' : 'Create Account'}</h2><p className="muted">{mode === 'login' ? 'Welcome back. Continue your care journey.' : 'Create your account to begin your care journey.'}</p>  <form onSubmit={submit}>{mode === 'create' ? <><label>Full name<input value={fields.fullName} onChange={e => setFields({ ...fields, fullName: e.target.value })} placeholder="Your full name" autoComplete="name" /></label><label>Email<input type="email" value={fields.email} onChange={e => setFields({ ...fields, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></label>  <label>Phone number<input type="tel" value={fields.phone} onChange={e => setFields({ ...fields, phone: e.target.value })} placeholder="Enter your phone number" autoComplete="tel" required /></label></> :   <label>Phone number<input type="tel" value={fields.phone} onChange={e => { setFields({ ...fields, phone: e.target.value }); setError(''); }} placeholder="Enter your phone number" autoComplete="tel" /></label>}<label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={fields.password} onChange={e => { setFields({ ...fields, password: e.target.value }); setError(''); }} placeholder="Enter your password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeoff' : 'eye'} size={19} /></button></div></label>{mode === 'create' && <><label>Confirm password<input type="password" value={fields.confirmPassword} onChange={e => setFields({ ...fields, confirmPassword: e.target.value })} placeholder="Re-enter your password" autoComplete="new-password" /></label><label className="terms-option"><input type="checkbox" checked={fields.terms} onChange={e => setFields({ ...fields, terms: e.target.checked })} /> I agree to the Terms and Conditions</label></>}{mode === 'login' && <div className="auth-options"><label className="remember-option"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember Me</label><button type="button" className="forgot-link" onClick={startReset}>Forgot Password?</button></div>}{error && <p className="form-error" role="alert">{error}</p>}<button className="primary full auth-submit" type="submit" disabled={submitting}>{submitting ? 'Saving...' : mode === 'login' ? 'Log In' : 'Create Account'} <Icon name="arrow" size={18} /></button></form><div className="or"><span>or</span></div><button type="button" className="secondary full google-button" onClick={() => setError('Google sign-in is not configured yet. Use your email or username.')}><strong>G</strong> Continue with Google</button><button type="button" className="demo-link" onClick={() => onLogin('demo-patient')}>{t.demo}</button></section></main>;
}

function AdherenceRing({ percent }) { return <div className="ring" style={{ '--progress': `${percent * 3.6}deg` }}><div><strong>{percent}%</strong><span>today</span></div></div>; }

function Home({ t, meds, streaks, setMeds, reset, goTo, alertRule }) {
  const taken = meds.filter(m => m.status === 'taken').length;
  const percent = Math.round((taken / meds.length) * 100);
  const activeAlert = Object.values(streaks).some(value => value >= alertRule);
  return <div className="page home-page"><div className="welcome"><div><p className="eyebrow">THURSDAY, OCTOBER 8</p><h1>{t.greeting}</h1><p>{t.subtitle}</p></div><div className="avatar">N</div></div><section className="card adherence-card"><div><p className="eyebrow">{t.adherence.toUpperCase()}</p><h2>{taken} <span>/ {meds.length} doses</span></h2><p className="muted">{percent === 100 ? 'All done for today!' : percent === 0 ? 'Start with your next dose.' : 'You are doing well. Keep going.'}</p></div><AdherenceRing percent={percent} /></section><div className="section-heading"><h2>Today’s medicines</h2><button className="text-button" onClick={reset}>{t.reset}</button></div><section className="med-list">{meds.map(m => <div className={`medicine ${m.status || ''}`} key={m.id}><div className="med-icon"><span>{m.name[0]}</span></div><div className="med-copy"><strong>{m.name} <small>{m.dose}</small></strong><span>{m.time}</span></div><div className="med-actions"><button className={m.status === 'taken' ? 'status-selected taken' : ''} onClick={() => setMeds(meds.map(item => item.id === m.id ? { ...item, status: 'taken' } : item))} aria-label={`Mark ${m.name} taken`}><Icon name="check" size={15} /></button><button className={m.status === 'missed' ? 'status-selected missed' : ''} onClick={() => setMeds(meds.map(item => item.id === m.id ? { ...item, status: 'missed' } : item))} aria-label={`Mark ${m.name} missed`}><Icon name="warning" size={15} /></button></div></div>)}</section>{activeAlert ? <div className="alert-banner"><div className="alert-icon"><Icon name="warning" /></div><div><strong>{t.alert}</strong><p>Alert sent to Priya. Narasimha missed {Math.max(...Object.values(streaks))} doses in a row.</p></div></div> : <div className="family-strip"><div className="family-face">P</div><div><strong>Priya is supporting you</strong><p>She will be notified if you miss {alertRule} doses in a row.</p></div><Icon name="arrow" size={18} /></div>}<button className="ask-card" onClick={() => goTo('ask')}><span className="ask-symbol"><Icon name="chat" /></span><span><strong>{t.askQuestion}</strong><small>Get a simple answer in your language</small></span><Icon name="arrow" /></button><section className="report-preview"><div className="section-heading"><h2>{t.latest}</h2><button className="text-button" onClick={() => goTo('report')}>{t.viewReport}</button></div><div className="report-row"><div className="report-file"><Icon name="file" /></div><div><strong>Annual health check</strong><p>October 6, 2026 <span className="dot" /> 5 results</p></div><span className="pill high">Needs attention</span></div></section><SafetyNote text={t.note} /></div>;
}

function AddReport({ t, onSample, onUpload, loading }) { const input = useRef(); return <div className="page"><div className="screen-heading"><span className="round-icon"><Icon name="plus" /></span><div><p className="eyebrow">YOUR HEALTH LIBRARY</p><h1>{t.addTitle}</h1></div></div><p className="intro">{t.addText}</p><div className={`upload-zone ${loading ? 'loading' : ''}`} onClick={() => !loading && input.current.click()}><input ref={input} type="file" accept="image/*" onChange={onUpload} hidden /><div className="upload-icon"><Icon name={loading ? 'sun' : 'plus'} size={28} /></div><strong>{loading ? 'Reading your report…' : t.upload}</strong><span>{loading ? 'The HealthPilot service is checking readable values.' : 'JPG, PNG up to 10 MB'}</span></div><div className="or"><span>or</span></div><button className="secondary full" onClick={onSample} disabled={loading}><Icon name="file" size={18} /> {t.sample}</button><section className="pipeline-card"><p className="eyebrow">AI RECORD PIPELINE</p><div className="pipeline-steps"><span className="pipeline-active">Upload</span><i>→</i><span className="pipeline-active">OCR / text</span><i>→</i><span>Structure</span><i>→</i><span>Summary</span></div><small>Demo mode uses the sample extraction layer. A secure OCR provider can be connected without changing this user flow.</small></section><div className="how-it-works"><h3>How it works</h3><div><span>1</span><p><strong>Share a clear photo</strong><small>Make sure words and numbers are easy to read.</small></p></div><div><span>2</span><p><strong>Read it simply</strong><small>See what each result may mean in everyday language.</small></p></div><div><span>3</span><p><strong>Prepare for your visit</strong><small>Take helpful questions to your doctor.</small></p></div></div><SafetyNote text={t.note} /></div>; }

function ResultCard({ result }) { return <div className="result-row"><div className="result-info"><strong>{result[0]}</strong><span>{result[3]}</span></div><div className="result-value"><b>{result[1]}</b><span className={`pill ${result[2]}`}>{result[2] === 'high' ? 'High' : result[2] === 'watch' ? 'Watch' : 'Normal'}</span></div></div>; }

function Report({ t, uploaded }) { const results = uploaded.results || sampleResults; return <div className="page"><button className="back-button" onClick={uploaded.back}>← {t.add}</button><div className="screen-heading"><span className="round-icon"><Icon name="file" /></span><div><p className="eyebrow">{uploaded.isSample ? 'SAMPLE REPORT' : 'UPLOADED REPORT'}</p><h1>{uploaded.error ? 'Report needs review' : t.explanation}</h1></div></div>{uploaded.error ? <div className="report-error" role="alert"><Icon name="warning" /><div><strong>We could not read this image.</strong><p>{uploaded.error}</p><small>Try a clear, well-lit photo of a medical report, or use the sample report.</small></div></div> : <><div className="report-title"><div className="report-file"><Icon name="file" /></div><div><strong>{uploaded.isSample ? 'Annual health check' : uploaded.name}</strong><p>Read on October 8, 2026</p></div><span className="pill high">{results.length} findings</span></div><p className="section-label">RESULTS AT A GLANCE</p><section className="results-list">{results.map((r, i) => <ResultCard result={r} key={i} />)}</section><section className="soft-card"><h3>Medicines found</h3><p>{uploaded.medicines || 'Metformin 500 mg • Amlodipine 5 mg'}</p><small>Ask your doctor or pharmacist before making any changes.</small></section><section className="questions"><h3>{t.doctorQuestions}</h3>{(uploaded.questions || ['Could my HbA1c goal be different for me?', 'What can help bring my fasting sugar closer to target?', 'When should I repeat these tests?']).map(question => <p key={question}>{question}</p>)}</section></>}<SafetyNote text={t.note} /></div>; }

function Ask({ t, language }) { const [person, setPerson] = useState('me'); const [input, setInput] = useState(''); const [listening, setListening] = useState(false); const [messages, setMessages] = useState([{ from: 'ai', text: 'Hello Narasimha. I can help you understand your medicines, reports, and care plan. What would you like to know?' }]); const recognition = useRef(); useEffect(() => { getChatHistory().then(({ messages: saved }) => { if (saved.length) setMessages(saved.map(message => ({ from: message.sender, text: message.message }))); }).catch(() => {}); }, []); const speechLang = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' }[language]; const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window; const canListen = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window); const localAnswer = text => /chest pain|breath|faint|stroke|bleed|very low|very high/i.test(text) ? 'This may be an emergency. Call 108 or 112, or go to the nearest hospital now. Do not wait for a chat reply.' : 'I can explain this in simple words. Please follow the plan from your doctor, and ask your doctor or pharmacist before changing any medicine or dose.'; const send = async text => { const value = (text || input).trim(); if (!value) return; setMessages(current => [...current, { from: 'user', text: value }]); setInput(''); try { const response = await askHealthPilot(value, language, person); setMessages(current => [...current, { from: 'ai', text: response.reply }]); } catch { setMessages(current => [...current, { from: 'ai', text: localAnswer(value) }]); } }; const listen = text => { if (canSpeak) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }; const toggleMic = () => { if (!canListen) return; if (listening) { recognition.current.stop(); setListening(false); return; } const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; recognition.current = new SpeechRecognition(); recognition.current.lang = speechLang; recognition.current.onresult = e => setInput(e.results[0][0].transcript); recognition.current.onend = () => setListening(false); recognition.current.start(); setListening(true); }; return <div className="page ask-page"><div className="screen-heading"><span className="round-icon"><Icon name="chat" /></span><div><p className="eyebrow">YOUR AI COPILOT</p><h1>{t.askTitle}</h1></div></div><p className="intro">{t.askText}</p><div className="person-toggle"><button className={person === 'me' ? 'active' : ''} onClick={() => setPerson('me')}>{t.me}</button><button className={person === 'family' ? 'active' : ''} onClick={() => setPerson('family')}>{t.familyMember}</button></div><div className="quick-questions"><button onClick={() => send('What does my HbA1c result mean?')}>What does my HbA1c mean?</button><button onClick={() => send('What should I remember about my medicines?')}>Medicine reminders</button><button onClick={() => send('What should I ask my doctor?')}>Prepare for my visit</button></div><section className="chat-box">{messages.map((message, i) => <div className={`message ${message.from}`} key={i}><div className="message-avatar">{message.from === 'ai' ? 'H' : 'N'}</div><div><p>{message.text}</p>{message.from === 'ai' && canSpeak && <button className="listen-button" onClick={() => listen(message.text)}><Icon name="sun" size={14} /> {t.listen}</button>}</div></div>)}</section><div className="composer">{canListen && <button className={`mic-button ${listening ? 'listening' : ''}`} onClick={toggleMic} aria-label="Use microphone"><Icon name="mic" /></button>}<input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type your question..." /><button className="send-button" onClick={() => send()} aria-label={t.send}><Icon name="arrow" /></button></div><SafetyNote text={t.note} /></div>; }

function exportFhirBundle(reports) {
  const observations = (reports[0]?.results || sampleResults).map(result => ({
    resourceType: 'Observation',
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', display: result[0] }] },
    valueString: result[1],
    interpretation: [{ text: result[2] }],
  }));
  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    identifier: { system: 'https://healthpilot.local/abha', value: 'ABHA-DEMO-1042-7788' },
    entry: observations.map(resource => ({ resource })),
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/fhir+json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'healthpilot-abdm-demo-bundle.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function CapabilityStatus({ reports }) {
  return <section className="settings-card capability-card" aria-labelledby="capability-title">
    <div className="section-heading"><div><p className="eyebrow">ALTRIX LABS CHALLENGE</p><h2 id="capability-title">Copilot capability status</h2></div><span className="pill normal">Prototype</span></div>
    <div className="capability-list">
      <div><span className="capability-icon"><Icon name="file" size={16} /></span><div><strong>Medical record intelligence and OCR</strong><small><b className="status-live">Demo active</b> Text extraction and sample analysis work; live OCR is ready for provider integration.</small></div></div>
      <div><span className="capability-icon"><Icon name="chat" size={16} /></span><div><strong>Plain-language health summary</strong><small><b className="status-live">Implemented</b> Built-in explanations are available in English and Telugu.</small></div></div>
      <div><span className="capability-icon"><Icon name="arrow" size={16} /></span><div><strong>Unified health profile and timeline</strong><small><b className="status-live">Implemented</b> Saved reports, cross-record trends, and care events are combined here.</small></div></div>
      <div><span className="capability-icon"><Icon name="users" size={16} /></span><div><strong>Language support</strong><small><b className="status-live">Telugu + Hindi active</b> Tamil follows the same translation pattern as a future extension.</small></div></div>
      <div><span className="capability-icon"><Icon name="check" size={16} /></span><div><strong>ABDM / ABHA and FHIR readiness</strong><small><b className="status-live">Demo ready</b> Mock ABHA ID with LOINC-style observations.</small><button type="button" className="text-button capability-action" onClick={() => exportFhirBundle(reports)}>Download FHIR demo bundle</button></div></div>
    </div>
    <div className="architecture-strip"><strong>Architecture</strong><span>Upload → OCR → structured records → AI summary → timeline</span></div>
  </section>;
}

function Records({ t, reports }) { return <div className="page"><div className="screen-heading"><span className="round-icon"><Icon name="file" /></span><div><p className="eyebrow">YOUR HEALTH STORY</p><h1>{t.recordsTitle}</h1></div></div><CapabilityStatus reports={reports} />{reports.length > 0 && <section className="settings-card"><h3>Saved reports</h3>{reports.map(report => <p key={report.id}><strong>{report.name}</strong><br /><small>{report.source === 'upload' ? 'Uploaded' : 'Sample'} · {report.created_at}</small></p>)}</section>}<section className="card chart-card"><div className="section-heading"><div><p className="eyebrow">{t.trend.toUpperCase()}</p><h2>8.1% <span className="pill high">Above target</span></h2></div><span className="muted">Last 4 tests</span></div><svg className="chart" viewBox="0 0 360 150" role="img" aria-label="HbA1c trend chart"><line x1="34" y1="25" x2="34" y2="125" /><line x1="34" y1="125" x2="350" y2="125" /><line className="target-line" x1="34" y1="85" x2="350" y2="85" /><polyline points="45,111 140,96 235,78 325,60" /><circle cx="45" cy="111" r="5" /><circle cx="140" cy="96" r="5" /><circle cx="235" cy="78" r="5" /><circle cx="325" cy="60" r="5" /><text x="40" y="143">Jun</text><text x="133" y="143">Jul</text><text x="228" y="143">Aug</text><text x="317" y="143">Oct</text><text x="268" y="80">7.0 target</text></svg></section><div className="section-heading"><h2>{t.timeline}</h2><button className="text-button">Filter</button></div><section className="timeline"><div><span className="timeline-dot lab" /><p><strong>Annual health check</strong><small>October 6, 2026 · Lab report added</small></p></div><div><span className="timeline-dot visit" /><p><strong>Dr. Mehta visit</strong><small>September 12, 2026 · Care plan reviewed</small></p></div><div><span className="timeline-dot lab" /><p><strong>Blood tests</strong><small>August 4, 2026 · Results recorded</small></p></div></section><button className="primary full"><Icon name="file" size={18} /> {t.visit}</button><SafetyNote text={t.note} /></div>; }

function Architecture() {
  const layers = [
    ['1', 'Patient input', 'Prescriptions, lab reports, discharge summaries, and wellness data'],
    ['2', 'Intelligence layer', 'OCR/text extraction, validation, and medicine/observation detection'],
    ['3', 'Health profile', 'FHIR-style records, LOINC observations, and mock ABHA identifier'],
    ['4', 'Patient experience', 'Plain-language summaries, trends, timeline, and family support'],
  ];
  return <div className="page"><div className="screen-heading"><span className="round-icon"><Icon name="file" /></span><div><p className="eyebrow">ALTRIX LABS CHALLENGE</p><h1>Solution architecture</h1></div></div><p className="intro">A safe, modular path from fragmented health information to understandable action.</p><section className="architecture-flow">{layers.map(([number, title, detail]) => <div className="architecture-layer" key={number}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div></div>)}</section><section className="settings-card architecture-status"><h3>Integration readiness</h3><p><b>Ready in demo:</b> sample extraction, health explanations, timeline, trends, Telugu/Hindi UI, and mock FHIR export.</p><p><b>Next integration:</b> secure OCR provider, approved AI model, Tamil translation pack, and official ABDM consent services.</p></section><div className="privacy-card"><strong>Safety boundary</strong><p>HealthPilot explains information and supports preparation. It does not diagnose conditions or replace a doctor.</p></div><SafetyNote /></div>;
}

function Family({ t, rule, setRule, onLogout, members, setMembers }) { const [preview, setPreview] = useState(false); const [adding, setAdding] = useState(false); const [saving, setSaving] = useState(false); const [form, setForm] = useState({ name: '', relation: '', phone: '' }); const [formError, setFormError] = useState(''); const addMember = async event => { event.preventDefault(); const name = form.name.trim(); const relation = form.relation.trim(); if (!name || !relation) { setFormError('Please enter a name and relationship.'); return; } setSaving(true); setFormError(''); try { const response = await addFamilyMember({ name, relation, phone: form.phone.trim() }); setMembers([...members, response.member]); setForm({ name: '', relation: '', phone: '' }); setAdding(false); } catch (error) { setFormError(error.message); } finally { setSaving(false); } }; const toggleForm = () => { setAdding(!adding); setFormError(''); }; return <div className="page"><div className="screen-heading"><span className="round-icon"><Icon name="users" /></span><div><p className="eyebrow">YOUR CARE CIRCLE</p><h1>{t.familyTitle}</h1></div></div><p className="intro">A trusted person can help you stay on track. They only see alerts you choose to share.</p>{members.map((member, index) => <section className="contact-card" key={member.id || `${member.name}-${index}`}><div className="contact-avatar">{member.name[0].toUpperCase()}</div><div><strong>{member.name}</strong><span>{member.relation}</span>{member.phone && <small>{member.phone}</small>}</div><span className="connected">{index === 0 ? 'Connected' : 'Added'}</span></section>)}<button className="secondary full add-member-button" onClick={toggleForm}><Icon name="plus" size={17} /> {adding ? 'Cancel' : 'Add family member'}</button>{adding && <form className="settings-card member-form" onSubmit={addMember} noValidate><label>Name<input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setFormError(''); }} placeholder="Family member name" /></label><label>Relationship<input value={form.relation} onChange={e => { setForm({ ...form, relation: e.target.value }); setFormError(''); }} placeholder="Daughter, son, spouse..." /></label><label>Phone (optional)<input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Enter phone number" /></label>{formError && <p className="form-error" role="alert">{formError}</p>}<button className="primary full" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save family member'}</button></form>}<section className="settings-card"><label>{t.alertRule}<select value={rule} onChange={e => setRule(Number(e.target.value))}><option value="1">1 missed dose</option><option value="2">2 missed doses</option><option value="3">3 missed doses</option></select></label><p>We’ll show an alert here when Narasimha misses {rule} doses in a row.</p><button className="secondary full" onClick={() => setPreview(!preview)}><Icon name="warning" size={17} /> {t.preview}</button>{preview && <div className="preview-alert"><strong>Alert sent to {members[0]?.name || 'your family member'}</strong><span>Narasimha missed {rule} doses in a row.</span></div>}</section><div className="privacy-card"><strong>Your privacy matters</strong><p>Family alerts are shown on this screen only. No real message is sent.</p></div><button className="logout-button" onClick={onLogout}>{t.logout}</button><SafetyNote text={t.note} /></div>; }

function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('healthpilot-session') === 'active');
  const [screen, setScreen] = useState('home');
  const [language, setLanguage] = useState(() => localStorage.getItem('healthpilot-language') || 'en');
  const [dark, setDark] = useState(() => localStorage.getItem('healthpilot-dark') === 'true');
  const [meds, setMeds] = useState(medicines.map(m => ({ ...m, status: null })));
  const [streaks, setStreaks] = useState({});
  const [rule, setRule] = useState(2);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [uploaded, setUploaded] = useState({ isSample: true, name: 'Annual health check' });
  const [reports, setReports] = useState([]);
  const t = copy[language] || copy.en;
  useEffect(() => { localStorage.setItem('healthpilot-language', language); document.documentElement.lang = language === 'en' ? 'en' : language === 'te' ? 'te' : language === 'ta' ? 'ta' : 'hi'; }, [language]);
  useEffect(() => { localStorage.setItem('healthpilot-dark', dark); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => {
    if (!loggedIn) {
      setFamilyMembers([]);
      return;
    }
    getFamilyMembers().then(response => setFamilyMembers(response.members)).catch(() => setFamilyMembers([]));
  }, [loggedIn]);
  useEffect(() => {
    if (!loggedIn) {
      setReports([]);
      return;
    }
    getReports().then(response => setReports(response.reports)).catch(() => setReports([]));
  }, [loggedIn]);
  useEffect(() => {
    if (!loggedIn) return;
    getMedicineStatuses().then(({ statuses }) => {
      const saved = new Map(statuses.map(item => [item.medicine_id, item.status]));
      setMeds(medicines.map(medicine => ({ ...medicine, status: saved.get(medicine.id) || null })));
    }).catch(() => {});
  }, [loggedIn]);
  const markMeds = (next) => { const changed = next.find((m, i) => m.status !== meds[i].status); if (changed?.status === 'missed') setStreaks({ ...streaks, [changed.id]: (streaks[changed.id] || 0) + 1 }); if (changed?.status === 'taken') setStreaks({ ...streaks, [changed.id]: 0 }); setMeds(next); if (changed?.status) saveMedicineStatus(changed.id, changed.status).catch(() => {}); };
  const reset = () => { setMeds(medicines.map(m => ({ ...m, status: null }))); setStreaks({}); if (loggedIn) resetMedicineStatuses().catch(() => {}); };
  const showReport = async (isSample = true, name = 'Annual health check', report = {}) => { setUploaded({ isSample, name, ...report, back: () => setScreen('add') }); setScreen('report'); if (!report.error && loggedIn) { try { const response = await saveReport({ name, source: isSample ? 'sample' : 'upload', results: report.results || [] }); setReports(previous => [response.report, ...previous]); } catch { /* The report remains viewable when history storage is unavailable. */ } } };
  const [uploading, setUploading] = useState(false);
  const uploadReport = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const report = await analyzeReport(file, language);
      showReport(false, file.name, report);
    } catch (error) {
      showReport(false, file.name, { error: error.message });
    } finally {
      setUploading(false);
    }
  };
  const nav = [{ id: 'home', label: t.home, icon: 'home' }, { id: 'add', label: t.add, icon: 'plus' }, { id: 'ask', label: t.ask, icon: 'chat' }, { id: 'records', label: t.records, icon: 'file' }, { id: 'architecture', label: 'Architecture', icon: 'file' }, { id: 'family', label: t.family, icon: 'users' }];
  const login = identity => { sessionStorage.setItem('healthpilot-session', 'active'); sessionStorage.setItem('healthpilot-user', identity); setLoggedIn(true); };
  const logout = () => { sessionStorage.removeItem('healthpilot-session'); sessionStorage.removeItem('healthpilot-user'); localStorage.removeItem('healthpilot-identity'); reset(); setLoggedIn(false); setScreen('home'); };
  if (!loggedIn) return <div className={dark ? 'app dark' : 'app'}><Brand dark={dark} setDark={setDark} language={language} setLanguage={setLanguage} /><Login t={t} onLogin={login} /></div>;
  return <div className={dark ? 'app dark' : 'app'}><Brand dark={dark} setDark={setDark} language={language} setLanguage={setLanguage} /><div className="content">{screen === 'home' && <Home t={t} meds={meds} streaks={streaks} setMeds={markMeds} reset={reset} goTo={setScreen} alertRule={rule} />}{screen === 'add' && <AddReport t={t} onSample={() => showReport(true)} onUpload={uploadReport} loading={uploading} />}{screen === 'report' && <Report t={t} uploaded={uploaded} />}{screen === 'ask' && <Ask t={t} language={language} />}{screen === 'records' && <Records t={t} reports={reports} />}{screen === 'architecture' && <Architecture />}{screen === 'family' && <Family t={t} rule={rule} setRule={setRule} members={familyMembers} setMembers={setFamilyMembers} onLogout={logout} />}</div><nav className="bottom-nav">{nav.map(item => <button className={screen === item.id || (screen === 'report' && item.id === 'add') ? 'active' : ''} key={item.id} onClick={() => setScreen(item.id)}><Icon name={item.icon} size={21} /><span>{item.label}</span></button>)}</nav></div>;
}

export default App;
