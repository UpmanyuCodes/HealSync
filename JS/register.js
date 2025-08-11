// Patient Registration - HealSync
// API: POST https://healsync-backend-d788.onrender.com/v1/healsync/patient/add

const REGISTER_API = 'https://healsync-backend-d788.onrender.com/v1/healsync/patient/add';
// OTP endpoints from attachments
const OTP_SEND_API = 'https://healsync-backend-d788.onrender.com/v1/healsync/otp/send'; // POST ?email=
const OTP_RESEND_API = 'https://healsync-backend-d788.onrender.com/v1/healsync/otp/resend'; // GET ?email=
const OTP_VERIFY_API = 'https://healsync-backend-d788.onrender.com/v1/healsync/otp/verify'; // POST ?email=&otp=

function setMsg(text, type = 'info') {
  const el = document.getElementById('register-message');
  if (!el) return;
  const colors = {
    info: '#1E3A8A',       // blue-800
    success: '#065F46',    // emerald-800
    error: '#7F1D1D'       // red-800
  };
  const bgs = {
    info: '#DBEAFE',       // blue-100
    success: '#D1FAE5',    // emerald-100
    error: '#FECACA'       // red-200
  };
  el.style.color = colors[type] || colors.info;
  el.style.background = bgs[type] || bgs.info;
  el.style.border = '1px solid rgba(0,0,0,0.05)';
  el.style.padding = '10px 12px';
  el.style.borderRadius = '8px';
  el.textContent = text;
}

function clearMsg(){ const el = document.getElementById('register-message'); if(el){ el.textContent=''; el.style.background='transparent'; el.style.border='none'; } }

function getTrimmedValue(id){ const v = document.getElementById(id)?.value || ''; return v.trim(); }

function validateForm(data){
  if(!data.patientName) return 'Full name is required.';
  const ageNum = Number(data.patientAge);
  if(!ageNum || ageNum < 0 || ageNum > 120) return 'Enter a valid age (0-120).';
  if(!data.gender) return 'Gender is required.';
  if(!/^\d{10}$/.test(data.mobileNo)) return 'Phone number must be 10 digits.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Enter a valid email address.';
  if(!data.password || data.password.length < 6) return 'Password must be at least 6 characters.';
  return '';
}

async function handleRegister(e){
  e.preventDefault();
  clearMsg();
  if(!isVerified){ setMsg('Please verify your email with OTP before creating your account.', 'error'); return; }
  const btn = document.getElementById('register-submit');
  const payload = {
    patientName: getTrimmedValue('fullname'),
    patientAge: getTrimmedValue('Age'),
    gender: getTrimmedValue('Gender'),
    mobileNo: getTrimmedValue('phone-number'),
    email: getTrimmedValue('email'),
    password: getTrimmedValue('password')
  };
  const err = validateForm(payload);
  if(err){ setMsg(err, 'error'); return; }

  btn.disabled = true; btn.textContent = 'Creating...';
  setMsg('Creating your account...', 'info');

  try{
    const res = await fetch(REGISTER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const txt = await res.text();
    if(!res.ok){ throw new Error(txt || 'Registration failed'); }

    // Try parsing response
    let data; try { data = JSON.parse(txt); } catch { data = null; }

    // Store basics for convenience
    if(data && data.patientId){
      localStorage.setItem('patientId', String(data.patientId));
      localStorage.setItem('patientName', data.patientName || '');
      localStorage.setItem('patientEmail', data.email || '');
    }

    setMsg('Account created successfully. Redirecting to login...', 'success');
    setTimeout(()=>{ window.location.href = '/HTML/login.html'; }, 1200);
  }catch(error){
    setMsg(error.message || 'Registration failed. Please try again.', 'error');
  }finally{
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

const form = document.getElementById('register-form');
if(form){ form.addEventListener('submit', handleRegister); }

// --- Snackbar helpers ---
function showSnack(message, type='info'){
  let el = document.getElementById('snackbar');
  if(!el){
    el = document.createElement('div');
    el.id = 'snackbar';
    el.className = 'snackbar';
    document.body.appendChild(el);
  }
  el.className = `snackbar ${type}`;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(()=>{ el.classList.remove('show'); }, 2200);
}

// --- OTP flow ---
let isVerified = false;
let resendCountdown = 0;
let countdownTimer = null;

function updateSubmitState(){
  const submit = document.getElementById('register-submit');
  submit.disabled = !isVerified;
}

function startCountdown(seconds){
  resendCountdown = seconds;
  const btn = document.getElementById('send-otp-btn');
  const cd = document.getElementById('otp-countdown');
  btn.textContent = 'Send OTP';
  btn.disabled = true;
  cd.textContent = `Resend in ${resendCountdown}s`;
  if(countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(()=>{
    resendCountdown -= 1;
    if(resendCountdown <= 0){
      clearInterval(countdownTimer);
      cd.textContent = '';
      btn.textContent = 'Resend';
      btn.disabled = false;
    } else {
      cd.textContent = `Resend in ${resendCountdown}s`;
    }
  }, 1000);
}

async function sendOtp(isResend=false){
  const email = getTrimmedValue('email');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    setMsg('Enter a valid email before requesting OTP.', 'error');
    return;
  }
  const btn = document.getElementById('send-otp-btn');
  const otpSection = document.getElementById('otp-section');
  const verifiedBadge = document.getElementById('email-verified-badge');
  isVerified = false; verifiedBadge.style.display = 'none'; updateSubmitState();

  try{
    btn.disabled = true;
    btn.textContent = isResend ? 'Resending...' : 'Sending...';
    const url = isResend ? `${OTP_RESEND_API}?email=${encodeURIComponent(email)}`
                         : `${OTP_SEND_API}?email=${encodeURIComponent(email)}`;
    const method = isResend ? 'GET' : 'POST';
    const res = await fetch(url, { method });
    const txt = await res.text();
    if(!res.ok) throw new Error(txt || 'Failed to send OTP');
    showSnack(isResend ? 'OTP resent to your email.' : 'OTP sent to your email.', 'success');
    otpSection.style.display = 'block';
    startCountdown(30);
  }catch(err){
    btn.disabled = false; btn.textContent = isResend ? 'Resend' : 'Send OTP';
    setMsg(err.message || 'Failed to send OTP', 'error');
  }
}

async function verifyOtp(){
  const email = getTrimmedValue('email');
  const otp = getTrimmedValue('otp-input');
  if(!otp || otp.length !== 6){ setMsg('Enter the 6-digit OTP you received.', 'error'); return; }
  const btn = document.getElementById('verify-otp-btn');
  const verifiedBadge = document.getElementById('email-verified-badge');
  try{
    btn.disabled = true; btn.textContent = 'Verifying...';
    const url = `${OTP_VERIFY_API}?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
    const res = await fetch(url, { method: 'POST' });
    const txt = await res.text();
    if(!res.ok) throw new Error(txt || 'OTP verification failed');
    // If backend returns JSON, you can parse it if needed.
    isVerified = true; updateSubmitState();
    verifiedBadge.style.display = 'inline-block';
    showSnack('OTP verified successfully.', 'success');
    setMsg('Email verified. You can now create your account.', 'success');
  }catch(err){
    setMsg(err.message || 'OTP verification failed', 'error');
  }finally{
    btn.disabled = false; btn.textContent = 'Verify OTP';
  }
}

// Wire buttons
const sendBtn = document.getElementById('send-otp-btn');
sendBtn?.addEventListener('click', ()=>{
  const isResend = (sendBtn.textContent || '').trim().toLowerCase() === 'resend';
  sendOtp(isResend);
});
document.getElementById('verify-otp-btn')?.addEventListener('click', verifyOtp);
