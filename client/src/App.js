import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PatientProfile from './components/PatientProfile';
import DoctorProfile from './components/DoctorProfile';
import AllDoctors from './components/AllDoctors';
import BookAppointment from './components/BookAppointment'; // Import BookAppointment component

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/patient-profile" element={<PatientProfile />} />
          <Route path="/doctor-profile" element={<DoctorProfile />} />
          <Route path="/doctors" element={<AllDoctors />} />
          <Route path="/book-appointment" element={<BookAppointment />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;