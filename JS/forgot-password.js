// Forgot Password Flow - HealSync
// API base
const API_BASE = 'https://healsync-backend-d788.onrender.com';

const form = document.getElementById('forgot-form');
const emailInput = document.getElementById('email');
const alertContainer = document.getElementById('alert-container');
const sendBtn = document.getElementById('send-otp-btn');

function normalizeEmail(v){ return (v || '').trim().toLowerCase(); }
function isValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function showAlert(message, type='info'){
  alertContainer.innerHTML = '';
  const el = document.createElement('div');
  el.className = `alert ${type}`;
  el.style.display = 'block';
  el.textContent = message;
  alertContainer.appendChild(el);
}
function clearAlert(){ alertContainer.innerHTML = ''; }

function setLoading(isLoading){
  if(isLoading){
    sendBtn.classList.add('btn-loading');
    sendBtn.disabled = true;
  } else {
    sendBtn.classList.remove('btn-loading');
    sendBtn.disabled = false;
  }
}

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
  setTimeout(()=> el.classList.remove('show'), 2200);
}

form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  clearAlert();
  const email = normalizeEmail(emailInput.value);
  if(!isValidEmail(email)){
    showAlert('Please enter a valid email address.', 'error');
    return;
  }
  try{
    setLoading(true);
    const res = await fetch(`${API_BASE}/v1/healsync/password/forgot`,{
      method:'POST',
      headers:{ 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    // Regardless of existence, treat as success if 200, else generic error
    if(res.ok){
      sessionStorage.setItem('resetEmail', email);
      showSnack("If an account exists, we've sent instructions.", 'success');
      window.location.href = '/HTML/verify-otp.html';
    } else {
      showAlert('Something went wrong. Please try again.', 'error');
    }
  } catch(err){
    showAlert('Something went wrong. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});
