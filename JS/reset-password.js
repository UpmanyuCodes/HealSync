// Reset Password Flow - HealSync
const API_BASE = 'https://healsync-backend-d788.onrender.com';

const form = document.getElementById('reset-form');
const emailInput = document.getElementById('email');
const newPwd = document.getElementById('newPassword');
const confirmPwd = document.getElementById('confirmPassword');
const resetBtn = document.getElementById('reset-btn');
const alertContainer = document.getElementById('alert-container');

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

function isStrongPassword(p){
  // length >= 8, at least 3 classes: upper, lower, digit, special
  if(!p || p.length < 8) return false;
  const classes = [/[A-Z]/, /[a-z]/, /\d/, /[^\w\s]/];
  let count = 0; classes.forEach(rx => { if(rx.test(p)) count++; });
  return count >= 3;
}

(function init(){
  const email = sessionStorage.getItem('resetEmail');
  const otp = sessionStorage.getItem('otpValue');
  if(!email || !otp){ window.location.href = '/HTML/verify-otp.html'; return; }
  emailInput.value = email;
})();

form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  clearAlert();
  const email = sessionStorage.getItem('resetEmail');
  const otp = sessionStorage.getItem('otpValue');
  const p1 = newPwd.value || '';
  const p2 = confirmPwd.value || '';

  if(!isStrongPassword(p1)){
    showAlert('Password must be at least 8 characters and include 3 of: uppercase, lowercase, digit, special.', 'error');
    return;
  }
  if(p1 !== p2){
    showAlert('Passwords do not match.', 'error');
    return;
  }

  try{
    resetBtn.disabled = true;
    resetBtn.classList.add('btn-loading');
    const res = await fetch(`${API_BASE}/v1/healsync/password/reset`,{
      method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, otp, newPassword: p1 })
    });
    if(res.ok){
      // Flag for login page toast and clear sensitive data
      sessionStorage.setItem('healSync_reset_success','1');
      sessionStorage.removeItem('resetEmail');
      sessionStorage.removeItem('otpVerified');
      sessionStorage.removeItem('otpValue');
      window.location.href = '/HTML/login.html';
    } else if(res.status === 400){
      showAlert('Unable to reset password. The code may be invalid or expired. Request a new code.', 'error');
    } else {
      showAlert('Something went wrong. Please try again.', 'error');
    }
  } catch(err){
    showAlert('Something went wrong. Please try again.', 'error');
  } finally {
    // Clear form fields regardless
    newPwd.value = '';
    confirmPwd.value = '';
    resetBtn.disabled = false;
    resetBtn.classList.remove('btn-loading');
  }
});
