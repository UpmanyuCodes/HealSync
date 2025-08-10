// Doctor Appointments UI
const baseUrl = typeof APPT_BASE !== 'undefined' ? APPT_BASE : 'http://localhost:8080/v1/healsync/book';

function setInfo(msg){ const el=document.getElementById('alert'); if(!el) return; el.className='alert alert-info'; el.textContent=msg; el.style.display='block'; }
function setSuccess(msg){ const el=document.getElementById('alert'); if(!el) return; el.className='alert alert-success'; el.textContent=msg; el.style.display='block'; }
function setError(msg){ const el=document.getElementById('alert'); if(!el) return; el.className='alert alert-error'; el.textContent=msg; el.style.display='block'; }
function clearAlert(){ const el=document.getElementById('alert'); if(el) el.style.display='none'; }

function apptCard(a){
  const wrapper = document.createElement('div'); wrapper.className='card appt-card';
  const title = document.createElement('div'); title.className='appt-title'; title.textContent = `#${a.scheduleId} with Patient ${a.patientId}`;
  const sub = document.createElement('div'); sub.className='appt-sub'; sub.textContent = `${a.startTime} — ${a.endTime}`;
  const meta = document.createElement('div'); meta.className='appt-meta'; meta.textContent = `Doctor: ${a.doctorId}`;
  const badge = document.createElement('span'); badge.className=`status-badge status-${String(a.status||'').toLowerCase()}`; badge.textContent=a.status;

  const cancelBtn = document.createElement('button'); cancelBtn.className='btn btn-secondary'; cancelBtn.textContent='Cancel';
  cancelBtn.addEventListener('click', async ()=>{
    try{
      const url = `${baseUrl}/cancel?appointmentId=${a.scheduleId}&doctorId=${a.doctorId}`;
      const res = await fetch(url, { method: 'POST' });
      const txt = await res.text();
      if(!res.ok) throw new Error(txt);
      setSuccess(txt || 'Appointment cancelled.');
      await loadDoctorAppointments();
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
      const url = `${baseUrl}/reschedule?appointmentId=${a.scheduleId}&requesterId=${a.doctorId}&requesterRole=DOCTOR&newStartDateTime=${encodeURIComponent(s)}&newEndDateTime=${encodeURIComponent(e)}`;
      const res = await fetch(url, { method: 'POST' });
      const txt = await res.text();
      if(!res.ok) throw new Error(txt);
      try{ JSON.parse(txt); }catch{}
      setSuccess('Rescheduled successfully');
      await loadDoctorAppointments();
    }catch(err){ setError(err.message || 'Reschedule failed'); }
  });

  // Notes section
  const notesWrap = document.createElement('div'); notesWrap.style.marginTop='0.5rem';
  const notesInput = document.createElement('textarea'); notesInput.placeholder='Add/update doctor notes...'; notesInput.rows=2; notesInput.className='form-input';
  const notesBtn = document.createElement('button'); notesBtn.className='btn btn-secondary'; notesBtn.textContent='Save Notes';
  notesBtn.addEventListener('click', async ()=>{
    const notes = notesInput.value || '';
    try{
      const url = `${baseUrl}/notes?appointmentId=${a.scheduleId}&doctorId=${a.doctorId}&notes=${encodeURIComponent(notes)}`;
      const res = await fetch(url, { method: 'POST' });
      const txt = await res.text();
      if(!res.ok) throw new Error(txt);
      setSuccess(txt || 'Notes updated.');
    }catch(err){ setError(err.message || 'Failed to update notes'); }
  });
  notesWrap.append(notesInput, notesBtn);

  const actions = document.createElement('div'); actions.className='actions'; actions.append(toggleRes, cancelBtn);
  const footer = document.createElement('div'); footer.className='appt-footer'; footer.append(badge, actions);
  wrapper.append(title, sub, meta, footer, inline, notesWrap);
  return wrapper;
}

async function loadDoctorAppointments(){
  clearAlert();
  const did = document.getElementById('doctorIdList').value;
  if(!did){ setError('Enter your Doctor ID to load appointments.'); return; }
  const container = document.getElementById('doctorApptList');
  container.innerHTML = '';
  container.appendChild(document.createTextNode('Loading...'));
  try{
    const res = await fetch(`${baseUrl}/doctor/appointments?doctorId=${encodeURIComponent(did)}`);
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

document.getElementById('loadDoctorAppts').addEventListener('click', loadDoctorAppointments);

// Prefill doctor id if present
try{
  const did = new URLSearchParams(location.search).get('doctorId') || localStorage.getItem('doctorId');
  if(did){ const i = document.getElementById('doctorIdList'); if(i) i.value = did; }
}catch{}
