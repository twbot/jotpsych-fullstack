import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import APIService from "../services/APIService";

function Home() {
  const [username, setUsername] = useState<string>("");
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await APIService.request("/user", "GET", null, true);
        setUsername(data.username);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6">Home</h2>
        {isAuthenticated ? (
          <>
            <p className="text-white mb-4">Welcome, {username}!</p>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:shadow-outline-red focus:border-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          <p className="text-white">
            Please <Link to="/login" className="text-blue-300 hover:text-blue-200">login</Link> or{" "}
            <Link to="/register" className="text-blue-300 hover:text-blue-200">register</Link>.
          </p>
        )}
      </div>
    </div>
  );
}

export default Home;