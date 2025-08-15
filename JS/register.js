// Patient Registration - HealSync
// API: POST https://healsync-backend-d788.onrender.com/v1/healsync/patient/add

const REGISTER_API = 'https://healsync-backend-d788.onrender.com/v1/healsync/patient/add';
// Updated OTP endpoints - fixing the 404 errors
const OTP_SEND_API = 'https://healsync-backend-d788.onrender.com/v1/healsync/email/send';
const OTP_VERIFY_API = 'https://healsync-backend-d788.onrender.com/v1/healsync/email/verify';

function setMsg(text, type = 'info') {
  const container = document.getElementById('alert-container');
  if (container) {
    container.innerHTML = '';
    if (!text) { container.style.display = 'none'; return; }
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    alert.textContent = text;
    container.appendChild(alert);
    container.style.display = 'block';
    return;
  }
  // Fallback for legacy container
  const el = document.getElementById('register-message');
  if (!el) return;
  el.textContent = text;
}

function clearMsg(){
  const container = document.getElementById('alert-container');
  if (container) { container.innerHTML = ''; container.style.display = 'none'; }
  const el = document.getElementById('register-message');
  if (el) { el.textContent = ''; }
}

function setLoading(btn, isLoading, loadingText){
  if(!btn) return;
  if(isLoading){
    btn.dataset.originalText = btn.textContent;
    if(loadingText) btn.textContent = loadingText;
    btn.classList.add('btn-loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
    if(btn.dataset.originalText){
      btn.textContent = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  }
}

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

  setLoading(btn, true, 'Creating...');
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
    setLoading(btn, false);
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
let isDevelopmentMode = true; // Set to false in production
let simulatedOtp = null; // For development mode

function updateSubmitState(){
  const submit = document.getElementById('register-submit');
  submit.disabled = !isVerified;
}

// Show development mode notice if enabled
function showDevelopmentNotice() {
  if (isDevelopmentMode) {
    const notice = document.getElementById('dev-mode-notice');
    if (notice) {
      notice.style.display = 'block';
    }
    console.log('🔧 Development Mode Enabled - Email API fallback active');
  }
}

// Test API availability and auto-enable development mode if needed
async function checkApiAvailability() {
  try {
    const response = await fetch(OTP_SEND_API, {
      method: 'OPTIONS', // Use OPTIONS to check if endpoint exists
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 404) {
      isDevelopmentMode = true;
      showDevelopmentNotice();
      console.log('🔧 API unavailable (404), auto-enabling development mode');
    }
  } catch (error) {
    console.log('🔧 API check failed, development mode remains active');
  }
}

// Initialize development mode notice
document.addEventListener('DOMContentLoaded', () => {
  showDevelopmentNotice();
  checkApiAvailability();
});

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
    setLoading(btn, true, isResend ? 'Resending...' : 'Sending...');
    
    // Use POST method with email in request body as per API specification
    const res = await fetch(OTP_SEND_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email })
    });
    
    const txt = await res.text();
    console.log('OTP Send Response:', res.status, txt);
    
    if(!res.ok) {
      // If API fails and we're in development mode, use fallback
      if (isDevelopmentMode && res.status === 404) {
        console.log('🔧 API unavailable, using development mode fallback');
        simulatedOtp = '123456'; // Simulated OTP for testing
        showSnack(`Development mode: OTP sent! Use 123456 to verify.`, 'info');
        otpSection.style.display = 'block';
        setLoading(btn, false);
        startCountdown(30);
        return;
      }
      
      // Try to parse error message from response
      let errorMsg = 'Failed to send OTP';
      try {
        const errorData = JSON.parse(txt);
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch {
        errorMsg = txt || errorMsg;
      }
      throw new Error(errorMsg);
    }
    
    showSnack(isResend ? 'OTP resent to your email.' : 'OTP sent to your email.', 'success');
    otpSection.style.display = 'block';
    setLoading(btn, false);
    startCountdown(30);
    
  } catch(err) {
    console.error('OTP Send Error:', err);
    setLoading(btn, false);
    btn.textContent = isResend ? 'Resend' : 'Send OTP';
    
    // Handle specific error cases
    if (err.message.includes('404')) {
      if (isDevelopmentMode) {
        console.log('🔧 Using development mode fallback due to 404');
        simulatedOtp = '123456';
        showSnack(`Development mode: API unavailable. Use OTP: 123456`, 'warning');
        otpSection.style.display = 'block';
        setLoading(btn, false);
        startCountdown(30);
        return;
      }
      setMsg('Email service is currently unavailable. Please try again later.', 'error');
    } else {
      setMsg(err.message || 'Failed to send OTP. Please check your email and try again.', 'error');
    }
  }
}

async function verifyOtp(){
  const email = getTrimmedValue('email');
  const otp = getTrimmedValue('otp-input');
  if(!otp || otp.length !== 6){ setMsg('Enter the 6-digit OTP you received.', 'error'); return; }
  const btn = document.getElementById('verify-otp-btn');
  const verifiedBadge = document.getElementById('email-verified-badge');
  
  try{
    setLoading(btn, true, 'Verifying...');
    
    // Check development mode fallback first
    if (isDevelopmentMode && simulatedOtp && otp === simulatedOtp) {
      console.log('🔧 Development mode: OTP verified with simulated OTP');
      isVerified = true; 
      updateSubmitState();
      verifiedBadge.style.display = 'inline-block';
      showSnack('Development mode: OTP verified successfully!', 'success');
      setMsg('Email verified. You can now create your account.', 'success');
      setLoading(btn, false);
      return;
    }
    
    // Use POST method with email and otp in request body
    const res = await fetch(OTP_VERIFY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email: email,
        otp: otp 
      })
    });
    
    const txt = await res.text();
    console.log('OTP Verify Response:', res.status, txt);
    
    if(!res.ok) {
      // If API fails and we're in development mode, check simulated OTP
      if (isDevelopmentMode && res.status === 404) {
        if (otp === simulatedOtp) {
          console.log('🔧 Development mode: OTP verified with fallback');
          isVerified = true; 
          updateSubmitState();
          verifiedBadge.style.display = 'inline-block';
          showSnack('Development mode: OTP verified!', 'success');
          setMsg('Email verified. You can now create your account.', 'success');
          setLoading(btn, false);
          return;
        } else {
          throw new Error('Invalid OTP. Use 123456 for development mode.');
        }
      }
      
      // Try to parse error message from response
      let errorMsg = 'OTP verification failed';
      try {
        const errorData = JSON.parse(txt);
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch {
        errorMsg = txt || errorMsg;
      }
      throw new Error(errorMsg);
    }
    
    // If backend returns JSON, you can parse it if needed.
    isVerified = true; 
    updateSubmitState();
    verifiedBadge.style.display = 'inline-block';
    showSnack('OTP verified successfully.', 'success');
    setMsg('Email verified. You can now create your account.', 'success');
    
  } catch(err) {
    console.error('OTP Verify Error:', err);
    
    // Handle specific error cases
    if (err.message.includes('404')) {
      if (isDevelopmentMode) {
        setMsg('Development mode: Use OTP 123456 to verify.', 'warning');
      } else {
        setMsg('Email verification service is currently unavailable. Please try again later.', 'error');
      }
    } else if (err.message.includes('invalid') || err.message.includes('expired')) {
      setMsg('Invalid or expired OTP. Please request a new one.', 'error');
    } else {
      setMsg(err.message || 'OTP verification failed. Please try again.', 'error');
    }
  } finally {
    setLoading(btn, false);
    btn.textContent = 'Verify OTP';
  }
}

// Wire buttons
const sendBtn = document.getElementById('send-otp-btn');
sendBtn?.addEventListener('click', ()=>{
  const isResend = (sendBtn.textContent || '').trim().toLowerCase() === 'resend';
  sendOtp(isResend);
});
document.getElementById('verify-otp-btn')?.addEventListener('click', verifyOtp);
