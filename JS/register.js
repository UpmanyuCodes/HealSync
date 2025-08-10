// Patient Registration - HealSync
// API: POST https://healsync-backend-d788.onrender.com/v1/healsync/patient/add

const REGISTER_API = 'https://healsync-backend-d788.onrender.com/v1/healsync/patient/add';

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
