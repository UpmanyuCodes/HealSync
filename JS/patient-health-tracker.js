import { PatientApiService } from './patient-api-service.js';
import { showSnackbar } from './snackbar.js';

document.addEventListener('DOMContentLoaded', () => {
    const apiService = new PatientApiService();

    const monthEl = document.getElementById('current-month');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const detailsDateEl = document.getElementById('details-date');
    const detailsContentEl = document.getElementById('details-data-content');
    const noDataPlaceholder = document.querySelector('.no-data-placeholder');
    const logoutBtn = document.querySelector('.logout-btn');

    let currentDate = new Date();
    let healthData = [];

    const initTracker = async () => {
        const patientId = localStorage.getItem('patientId');
        if (!patientId) {
            showSnackbar('Patient not found. Please log in again.', 'error');
            window.location.href = '/HTML/login.html';
            return;
        }

        try {
            const data = await apiService.getEmotionDataByPatientId(patientId);
            healthData = data.map(entry => ({
                ...entry,
                date: new Date(entry.date).setHours(0, 0, 0, 0) // Normalize date
            }));
            renderCalendar();
            showDetailsForToday();
        } catch (error) {
            console.error('Error fetching health data:', error);
            showSnackbar('Failed to load health data.', 'error');
        }
    };

    const renderCalendar = () => {
        calendarGrid.innerHTML = '';
        monthEl.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty cells for days before the first of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'other-month');
            calendarGrid.appendChild(emptyCell);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('calendar-day');
            dayCell.dataset.day = day;

            const dayNumber = document.createElement('span');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);

            const date = new Date(year, month, day).setHours(0, 0, 0, 0);
            const dataForDay = healthData.find(d => d.date === date);

            if (dataForDay) {
                const moodIndicator = document.createElement('span');
                moodIndicator.classList.add('mood-indicator');
                moodIndicator.textContent = getMoodEmoji(dataForDay.mood);
                dayCell.appendChild(moodIndicator);
                dayCell.addEventListener('click', () => showDetails(dataForDay));
            } else {
                 dayCell.addEventListener('click', () => showEmptyDetails(new Date(year, month, day)));
            }

            calendarGrid.appendChild(dayCell);
        }
    };
    
    const showDetailsForToday = () => {
        const today = new Date().setHours(0, 0, 0, 0);
        const dataForToday = healthData.find(d => d.date === today);
        if (dataForToday) {
            showDetails(dataForToday);
        } else {
            showEmptyDetails(new Date());
        }
    };

    const showEmptyDetails = (date) => {
        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
        const day = date.getDate();
        const dayCell = calendarGrid.querySelector(`[data-day='${day}']:not(.other-month)`);
        if (dayCell) {
            dayCell.classList.add('selected');
        }

        detailsDateEl.textContent = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        noDataPlaceholder.style.display = 'block';
        detailsContentEl.style.display = 'none';
    };


    const showDetails = (data) => {
        // Highlight selected day
        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
        const day = new Date(data.date).getDate();
        const dayCell = calendarGrid.querySelector(`[data-day='${day}']`);
        if (dayCell) {
            dayCell.classList.add('selected');
        }

        noDataPlaceholder.style.display = 'none';
        detailsContentEl.style.display = 'block';

        detailsDateEl.textContent = new Date(data.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        detailsContentEl.innerHTML = `
            <div class="details-item">
                <span class="details-label"><i class="fas fa-smile"></i> Mood</span>
                <span class="details-value">${data.mood} ${getMoodEmoji(data.mood)}</span>
            </div>
            <div class="details-item">
                <span class="details-label"><i class="fas fa-head-side-virus"></i> Pain Level</span>
                <span class="details-value">${data.painLevel} / 10</span>
            </div>
            <div class="details-item">
                <span class="details-label"><i class="fas fa-sticky-note"></i> Notes</span>
                <span class="details-value">${data.notes || 'No notes'}</span>
            </div>
        `;
    };

    const getMoodEmoji = (mood) => {
        const moodMap = {
            'Happy': '😊',
            'Sad': '😢',
            'Angry': '😠',
            'Anxious': '😟',
            'Calm': '😌'
        };
        return moodMap[mood] || '😐';
    };

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/HTML/login.html';
    });

    initTracker();
});
