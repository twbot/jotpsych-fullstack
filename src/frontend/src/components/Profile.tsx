import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import APIService from '../services/APIService';

interface UserData {
    username: string;
    motto: string;
}

const UserProfile: React.FC = () => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState('');
    const [transcriptionStatus, setTranscriptionStatus] = useState('');
    const { logout } = useAuth();
    const navigate = useNavigate();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const pollingIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        fetchUserData();
        return () => {
            if (pollingIntervalRef.current !== null) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    const fetchUserData = async () => {
        try {
            const data = await APIService.request('/user', 'GET', null, true);
            setUserData(data);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                sendAudioToServer(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingStatus('Recording... (max 15 seconds)');

            setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }, 15000);
        } catch (error) {
            console.error('Error starting recording:', error);
            setRecordingStatus('Error starting recording. Please try again.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setRecordingStatus('Processing...');
        }
    };

    const sendAudioToServer = async (audioBlob: Blob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
            const response = await APIService.request('/upload', 'POST', formData, true, true);
            if (response.success) {
                setRecordingStatus('Audio uploaded successfully. Transcription in progress...');
                startPolling(response.task_id);
            } else {
                setRecordingStatus('Failed to upload audio. Please try again.');
            }
        } catch (error) {
            console.error('Error uploading audio:', error);
            setRecordingStatus('An error occurred. Please try again.');
        }
    };

    const startPolling = (taskId: string) => {
        if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = window.setInterval(async () => {
            try {
                const response = await APIService.request(`/transcription_status/${taskId}`, 'GET', null, true);
                setTranscriptionStatus(response.status);

                if (response.state === 'SUCCESS') {
                    if (pollingIntervalRef.current !== null) {
                        clearInterval(pollingIntervalRef.current);
                    }
                    setRecordingStatus('Motto updated successfully!');
                    fetchUserData(); // Refresh user data to get the new motto
                } else if (response.state === 'FAILURE') {
                    if (pollingIntervalRef.current !== null) {
                        clearInterval(pollingIntervalRef.current);
                    }
                    setRecordingStatus('An error occurred during transcription. Please try again.');
                }
            } catch (error) {
                console.error('Error polling for transcription status:', error);
                if (pollingIntervalRef.current !== null) {
                    clearInterval(pollingIntervalRef.current);
                }
                setRecordingStatus('Error checking transcription status. Please try again.');
            }
        }, 2000); // Poll every 2 seconds
    };

    const handleRecordMotto = () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    return (
        <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-lg max-w-md w-full">
            <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 bg-gray-300 rounded-full mb-4"></div>
                <h2 className="text-2xl font-bold text-white">{userData?.username}</h2>
            </div>

            <div className="mb-8 flex justify-center">
                <p className="text-white text-lg italic">"{userData?.motto || 'My motto goes here!'}"</p>
            </div>

            <div className="flex justify-between">
                {recordingStatus && <p className="text-white mb-4">{recordingStatus}</p>}
                {transcriptionStatus && <p className="text-white mb-4">Transcription status: {transcriptionStatus}</p>}
            </div>

            <div className="flex justify-between">
                <button
                    onClick={handleRecordMotto}
                    className={` ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out`}
                >
                    {isRecording ? 'Stop Recording' : 'Record (New) Motto'}
                </button>
                <button
                    onClick={handleLogout}
                    className=" bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default UserProfile;