import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatientProfile, updatePatientProfile } from '../services/api';

const PatientProfile = () => {
    const [profile, setProfile] = useState({ name: '', email: '', medicalHistory: '' });
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getPatientProfile();
                setProfile(data);
            } catch (error) {
                console.error('Failed to fetch profile', error);
            }
        };

        fetchProfile();
    }, []);

    const handleUpdate = async () => {
        try {
            await updatePatientProfile(profile);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile', error);
        }
    };

    if (!profile.email) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2>Patient Profile</h2>
            <button onClick={() => navigate('/book-appointment')}>Book Appointment</button>
            {isEditing ? (
                <div>
                    <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                    <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                    <textarea
                        value={profile.medicalHistory}
                        onChange={(e) => setProfile({ ...profile, medicalHistory: e.target.value })}
                    />
                    <button onClick={handleUpdate}>Save</button>
                    <button onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
            ) : (
                <div>
                    <p>Name: {profile.name}</p>
                    <p>Email: {profile.email}</p>
                    <p>Medical History: {profile.medicalHistory}</p>
                    <button onClick={() => setIsEditing(true)}>Edit</button>
                </div>
            )}
        </div>
    );
};

export default PatientProfile;