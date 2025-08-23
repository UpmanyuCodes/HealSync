const express = require('express');
const router = express.Router();
const { bookAppointment } = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/appointments/book
// @desc    Book an appointment
// @access  Private (Patient)
router.post('/book', authMiddleware, bookAppointment);

module.exports = router;
