import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:3000";

export default function Settle() {
  const [market, setMarket] = useState("m1");
  const [msg, setMsg] = useState("");

  async function settle(val) {
    const resp = await axios.post(`${API}/api/${market}/settle`, { backersWin: val });
    setMsg(`Market settled: ${val ? "Backers Win" : "Layers Win"}`);
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4 font-bold">Settle Market</h1>

      <input
        className="px-4 py-2 mb-4 rounded bg-gray-800 border border-gray-600 text-white"
        value={market}
        onChange={(e) => setMarket(e.target.value)}
      />

      <div className="flex gap-4">
        <button
          onClick={() => settle(true)}
          className="px-6 py-3 bg-green-600 rounded hover:bg-green-700"
        >
          BACKERS WIN
        </button>

        <button
          onClick={() => settle(false)}
          className="px-6 py-3 bg-red-600 rounded hover:bg-red-700"
        >
          LAYERS WIN
        </button>
      </div>

      {msg && <div className="mt-4 text-green-400">{msg}</div>}
    </div>
  );
}
