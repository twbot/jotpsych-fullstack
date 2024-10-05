import React, { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Home from "./components/Home";
import UpdateMessage from "./components/UpdateMessage";
import VersionManager from "./services/VersionManager";
import APIService from "./services/APIService";
import UserProfile from "./components/Profile";

function App() {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    VersionManager.setUpdateCallback(() => {
      setNeedsUpdate(false);
    });
  }, []);

  const checkVersion = async () => {
    try {
      await APIService.request("/", "GET");
    } catch (error) {
      if (error instanceof Error && error.message === "Update required") {
        setNeedsUpdate(true);
      }
    }
  };

  useEffect(() => {
    checkVersion();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 w-screen min-w-screen">
      {needsUpdate && <UpdateMessage />}
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
    </div>
  );
}

export default App;