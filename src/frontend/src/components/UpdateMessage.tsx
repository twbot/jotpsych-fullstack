import React from 'react';

const UpdateMessage: React.FC = () => {
    return (
        <div className="fixed top-0 left-0 w-full flex justify-center items-center h-screen bg-black bg-opacity-50 z-50">
            <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-lg max-w-md w-full">
                <h2 className="text-2xl font-bold text-white mb-4">Update Required</h2>
                <p className="text-white mb-6">
                    A new version of the application is available. Please refresh the page to get the latest updates.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
                >
                    Refresh Now
                </button>
            </div>
        </div>
    );
};

export default UpdateMessage;