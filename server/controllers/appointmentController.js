const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

exports.bookAppointment = async (req, res) => {
    try {
        const { doctorId, date, time, reason } = req.body;
        const patientId = req.user.id; // Assuming patient's ID is in req.user

        // Validate doctor existence
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        const newAppointment = new Appointment({
            patientId,
            doctorId,
            date,
            time,
            reason,
        });

        await newAppointment.save();
        res.status(201).json({ message: 'Appointment booked successfully', appointment: newAppointment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
