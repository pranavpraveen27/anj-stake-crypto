// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Market from "./pages/Market";
import Wallet from "./pages/Wallet";
import MyBets from "./pages/MyBets";
import Settle from "./pages/Settle";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("userId");
    if (saved) setUser(saved);
  }, []);

  useEffect(() => {
  const ws = new WebSocket("ws://localhost:3000");

  ws.onopen = () => console.log("WS connected");
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    window.dispatchEvent(new CustomEvent("ws-message", { detail: msg }));
  };
  ws.onerror = (e) => console.log("WS error", e);
  ws.onclose = () => console.log("WS closed");

  return () => ws.close();
}, []);


  if (!user) return <Login onLogin={(u) => setUser(u)} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4 flex items-center gap-4">
        <Link to="/" className="font-semibold">Dashboard</Link>
        <Link to="/market/m1" className="text-gray-600">Market</Link>
        <Link to={`/wallet/${user}`} className="text-gray-600">Wallet</Link>
        <Link to={`/mybets/${user}`} className="text-gray-600">My Bets</Link>
        <Link to="/settle" className="text-gray-600">Settle</Link>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-sm text-gray-700">Logged in as <b>{user}</b></div>
          <button className="text-sm px-3 py-1 rounded bg-gray-200" onClick={() => { localStorage.removeItem("userId"); setUser(null); }}>Logout</button>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/market/:marketId" element={<Market user={user} />} />
          <Route path="/wallet/:userId" element={<Wallet />} />
          <Route path="/mybets/:userId" element={<MyBets />} />
          <Route path="/settle" element={<Settle />} />
        </Routes>
      </main>
    </div>
  );
}
