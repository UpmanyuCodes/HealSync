// Verify OTP Flow - HealSync
const API_BASE = 'https://healsync-backend-d788.onrender.com';

const form = document.getElementById('verify-form');
const emailInput = document.getElementById('email');
const otpInput = document.getElementById('otp');
const resendBtn = document.getElementById('resend-btn');
const countdownEl = document.getElementById('countdown');
const alertContainer = document.getElementById('alert-container');
const verifyBtn = document.getElementById('verify-btn');

let countdownTimer = null;
let remaining = 0;

function showAlert(message, type='info'){
  alertContainer.innerHTML = '';
  const el = document.createElement('div');
  el.className = `alert ${type}`;
  el.style.display = 'block';
  el.textContent = message;
  alertContainer.appendChild(el);
}
function clearAlert(){ alertContainer.innerHTML = ''; }

function showSnack(message, type='info'){
  let el = document.getElementById('snackbar');
  if(!el){ el = document.createElement('div'); el.id='snackbar'; el.className='snackbar'; document.body.appendChild(el); }
  el.className = `snackbar ${type}`; el.textContent = message; el.classList.add('show');
  setTimeout(()=> el.classList.remove('show'), 2200);
}

function startCountdown(sec=30){
  remaining = sec;
  updateCountdown();
  resendBtn.disabled = true;
  if(countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(()=>{
    remaining -= 1;
    updateCountdown();
    if(remaining <= 0){
      clearInterval(countdownTimer);
      countdownTimer = null;
      countdownEl.textContent = '';
      resendBtn.disabled = false;
    }
  }, 1000);
}

function updateCountdown(){
  countdownEl.textContent = remaining > 0 ? `Resend available in ${remaining}s` : '';
}

function isValidOtp(v){ return /^\d{6}$/.test((v||'').trim()); }

// Prefill email or redirect back
(function init(){
  const email = sessionStorage.getItem('resetEmail');
  if(!email){ window.location.href = '/HTML/forgot-password.html'; return; }
  emailInput.value = email;
  otpInput.focus();
  startCountdown(30); // initial cooldown from previous send
})();

resendBtn?.addEventListener('click', async ()=>{
  clearAlert();
  const email = sessionStorage.getItem('resetEmail');
  if(!email) { window.location.href = '/HTML/forgot-password.html'; return; }
  try{
    resendBtn.disabled = true;
    const res = await fetch(`${API_BASE}/v1/healsync/password/resend`,{
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email })
    });
    if(res.ok){
      showSnack("If an account exists, we've sent instructions.", 'success');
      startCountdown(30);
    } else if(res.status === 429){
      showAlert('Too many requests. Please wait a moment and try again.', 'error');
      resendBtn.disabled = false;
    } else {
      showAlert('Something went wrong. Please try again.', 'error');
      resendBtn.disabled = false;
    }
  }catch(err){
    showAlert('Something went wrong. Please try again.', 'error');
    resendBtn.disabled = false;
  }
});

form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  clearAlert();
  const email = sessionStorage.getItem('resetEmail');
  const otp = (otpInput.value||'').trim();
  if(!isValidOtp(otp)){
    showAlert('Invalid or expired OTP. Please try again or resend.', 'error');
    return;
  }
  try{
    verifyBtn.disabled = true;
    verifyBtn.classList.add('btn-loading');
    const res = await fetch(`${API_BASE}/v1/healsync/password/verify`,{
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, otp })
    });
    if(res.ok){
      sessionStorage.setItem('otpVerified','true');
      sessionStorage.setItem('otpValue', otp); // carry to reset
      window.location.href = '/HTML/reset-password.html';
    } else if(res.status === 400){
      showAlert('Invalid or expired OTP. Please try again or resend.', 'error');
    } else {
      showAlert('Something went wrong. Please try again.', 'error');
    }
  }catch(err){
    showAlert('Something went wrong. Please try again.', 'error');
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.classList.remove('btn-loading');
  }
});
