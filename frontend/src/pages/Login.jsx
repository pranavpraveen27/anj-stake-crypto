// src/pages/Login.jsx
import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [name, setName] = useState("");

  function submit() {
    const id = (name || "").trim();
    if (!id) return alert("Enter a username");
    localStorage.setItem("userId", id);
    onLogin(id);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-xl w-[420px] shadow-xl border border-gray-700">
        <h2 className="text-white text-2xl font-bold mb-6 text-center">Pseudo Login</h2>

        <input
          type="text"
          className="w-full mb-4 px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none"
          placeholder="Enter username (e.g. U1, pranav)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={submit}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
          >
            Continue
          </button>
          <button
            onClick={() => {
              const demo = `U${Math.floor(2 + Math.random() * 20)}`;
              setName(demo);
              localStorage.setItem("userId", demo);
              onLogin(demo);
            }}
            className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Quick demo user
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-400">
          This is a developer pseudo-login for testing wallets and bets. No password required.
        </p>
      </div>
    </div>
  );
}
