import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllDoctors, bookAppointment } from '../services/api';

const BookAppointment = () => {
    const [doctors, setDoctors] = useState([]);
    const [doctorId, setDoctorId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const response = await getAllDoctors();
                setDoctors(response.data);
            } catch (err) {
                setError('Failed to fetch doctors.');
            }
        };
        fetchDoctors();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!doctorId || !date || !time || !reason) {
            setError('All fields are required.');
            return;
        }

        try {
            const appointmentData = { doctorId, date, time, reason };
            await bookAppointment(appointmentData);
            setSuccess('Appointment booked successfully!');
            setTimeout(() => {
                navigate('/patient-profile');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to book appointment.');
        }
    };

    return (
        <div>
            <h2>Book an Appointment</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Select Doctor:</label>
                    <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
                        <option value="">--Select a Doctor--</option>
                        {doctors.map((doctor) => (
                            <option key={doctor._id} value={doctor._id}>
                                Dr. {doctor.name} ({doctor.specialization})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Date:</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
                <div>
                    <label>Time:</label>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>
                <div>
                    <label>Reason for Appointment:</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} required />
                </div>
                <button type="submit">Book Appointment</button>
            </form>
        </div>
    );
};

export default BookAppointment;
