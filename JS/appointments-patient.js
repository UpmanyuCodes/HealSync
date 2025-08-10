// Patient Appointments UI
// Depends on appointments-shared.js being loaded first if sharing helpers; we'll inline safe fallbacks.
const baseUrl = typeof APPT_BASE !== 'undefined' ? APPT_BASE : 'http://localhost:8080/v1/healsync/book';

function toIso(id){ const v=document.getElementById(id).value; if(!v) return ''; const d=new Date(v); return d.toISOString().slice(0,19); }
function setInfo(msg){ const el=document.getElementById('alert'); if(!el) return; el.className='alert alert-info'; el.textContent=msg; el.style.display='block'; }
function setSuccess(msg){ const el=document.getElementById('alert'); if(!el) return; el.className='alert alert-success'; el.textContent=msg; el.style.display='block'; }
function setError(msg){ const el=document.getElementById('alert'); if(!el) return; el.className='alert alert-error'; el.textContent=msg; el.style.display='block'; }
function clearAlert(){ const el=document.getElementById('alert'); if(el) el.style.display='none'; }

function apptCard(a){
  const status = (a.status || '').toLowerCase();
  const statusCls = `status-badge status-${status}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'card appt-card';
  // header
  const title = document.createElement('div');
  title.className = 'appt-title';
  title.textContent = `#${a.scheduleId} with Dr ${a.doctorId}`;
  const sub = document.createElement('div');
  sub.className = 'appt-sub';
  sub.textContent = `${a.startTime} — ${a.endTime}`;
  const meta = document.createElement('div'); meta.className='appt-meta'; meta.textContent = `Patient: ${a.patientId}`;
  // status
  const badge = document.createElement('span'); badge.className = statusCls; badge.textContent = a.status;
  // actions
  const actions = document.createElement('div'); actions.className='actions';
  const cancelBtn = document.createElement('button'); cancelBtn.className='btn btn-secondary'; cancelBtn.textContent='Cancel';
  cancelBtn.addEventListener('click', async ()=>{
    try{
      const url = `${baseUrl}/cancel/patient?appointmentId=${a.scheduleId}&patientId=${a.patientId}`;
      const res = await fetch(url, { method: 'POST' });
      const txt = await res.text();
      if(!res.ok) throw new Error(txt);
      setSuccess(txt || 'Appointment cancelled.');
      await loadPatientAppointments();
    }catch(err){ setError(err.message || 'Failed to cancel'); }
  });
  const toggleRes = document.createElement('button'); toggleRes.className='btn btn-primary'; toggleRes.textContent='Reschedule';
  const inline = document.createElement('div'); inline.className='inline-reschedule';
  const startI = document.createElement('input'); startI.type='datetime-local';
  const endI = document.createElement('input'); endI.type='datetime-local';
  const go = document.createElement('button'); go.className='btn btn-primary'; go.textContent='Update';
  inline.append(startI, endI, go);
  toggleRes.addEventListener('click', ()=>{ inline.classList.toggle('visible'); });
  go.addEventListener('click', async ()=>{
    const s = startI.value ? new Date(startI.value).toISOString().slice(0,19) : '';
    const e = endI.value ? new Date(endI.value).toISOString().slice(0,19) : '';
    if(!s || !e){ setError('Pick new start and end times.'); return; }
    try{
      const url = `${baseUrl}/reschedule?appointmentId=${a.scheduleId}&requesterId=${a.patientId}&requesterRole=PATIENT&newStartDateTime=${encodeURIComponent(s)}&newEndDateTime=${encodeURIComponent(e)}`;
      const res = await fetch(url, { method: 'POST' });
      const txt = await res.text();
      if(!res.ok) throw new Error(txt);
      try{ JSON.parse(txt); }catch{}
      setSuccess('Rescheduled successfully');
      await loadPatientAppointments();
    }catch(err){ setError(err.message || 'Reschedule failed'); }
  });
  actions.append(toggleRes, cancelBtn);

  const footer = document.createElement('div'); footer.className='appt-footer'; footer.append(badge, actions);
  wrapper.append(title, sub, meta, footer, inline);
  return wrapper;
}

function getQueryParam(name){ try{ return new URLSearchParams(location.search).get(name); }catch{ return null; } }

function prefillPatient(){
  const pid = getQueryParam('patientId') || localStorage.getItem('patientId') || '';
  if(pid){
    const a = document.getElementById('patientId'); if(a) a.value = pid;
    const b = document.getElementById('patientIdList'); if(b) b.value = pid;
  }
}

function validateDateRange(startIso, endIso){
  if(!startIso || !endIso) return false;
  try{ return new Date(startIso) < new Date(endIso); }catch{ return false; }
}

async function bookAppointment(){
  clearAlert();
  const specialty = document.getElementById('specialty').value;
  const patientId = document.getElementById('patientId').value;
  const startIso = toIso('start');
  const endIso = toIso('end');
  if(!specialty || !patientId || !startIso || !endIso){ setError('All fields are required.'); return; }
  if(!validateDateRange(startIso, endIso)){ setError('End time must be after start time.'); return; }
  setInfo('Booking...');
  try{
    const url = `${baseUrl}/appointment?specialty=${encodeURIComponent(specialty)}&startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}&patientId=${encodeURIComponent(patientId)}`;
    const res = await fetch(url, { method: 'POST' });
    const txt = await res.text();
    if(!res.ok) throw new Error(txt);
    setSuccess('Booked successfully.');
    try { console.log('Booked:', JSON.parse(txt)); } catch{}
    // auto refresh list if patientIdList matches
    const pidList = document.getElementById('patientIdList');
    if(pidList && pidList.value === String(patientId)) await loadPatientAppointments();
  }catch(err){ setError(err.message || 'Booking failed'); }
}

async function loadPatientAppointments(){
  clearAlert();
  const pid = document.getElementById('patientIdList').value;
  if(!pid){ setError('Enter your Patient ID to load appointments.'); return; }
  const container = document.getElementById('patientApptList');
  container.innerHTML = '';
  container.appendChild(document.createTextNode('Loading...'));
  try{
    const res = await fetch(`${baseUrl}/patient/appointments?patientId=${encodeURIComponent(pid)}`);
    if(!res.ok) throw new Error(await res.text());
    const list = await res.json();
    container.innerHTML = '';
    if(!list || list.length === 0){
      const empty = document.createElement('div'); empty.className='card';
      empty.innerHTML = '<div class="muted">No appointments found.</div>';
      container.appendChild(empty);
      return;
    }
    list.forEach(a => container.appendChild(apptCard(a)));
  }catch(err){
    container.innerHTML = '';
    setError(err.message || 'Failed to load appointments');
  }
}

document.getElementById('bookBtn').addEventListener('click', bookAppointment);
document.getElementById('loadPatientAppts').addEventListener('click', loadPatientAppointments);

// Prefill IDs on load
prefillPatient();
