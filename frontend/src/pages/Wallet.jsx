// src/pages/Wallet.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
const API = "http://localhost:3000";

function statCard({ title, value, sub }) {
  return (
    <div className="bg-white rounded p-4 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Wallet() {
  const { userId } = useParams();
  const [wallet, setWallet] = useState(null);
  const [openOrders, setOpenOrders] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [exposure, setExposure] = useState({ back: 0, lay: 0 });

  useEffect(() => {
    fetch();
    const ws = new WebSocket("ws://localhost:3000");
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const payload = msg.data || msg;
        if (payload?.type?.startsWith("wallet") || payload?.type?.startsWith("match") || payload?.type?.startsWith("orderbook")) {
          fetch();
        }
      } catch (e) {}
    };
    return () => ws.close();
  }, [userId]);

  async function fetch() {
    try {
      const [w, open, matches] = await Promise.all([
        axios.get(`${API}/api/wallet/${userId}`),
        axios.get(`${API}/api/m1/open-orders/${userId}`),
        axios.get(`${API}/api/m1/matches?limit=50`),
      ]);
      setWallet(w.data);
      setOpenOrders(open.data || []);
      setRecentMatches(matches.data || []);

      // compute exposure (simple): sum (odds-1)*stake for lays & stakes for backs
      let backExp = 0, layExp = 0;
      for (const m of matches.data || []) {
        if (m.backerId === userId) {
          // user backed; their potential payout is stake * odds (already settled later); but exposure = stake
          backExp += m.stake;
        }
        if (m.layerId === userId) {
          // user laid: liability is (odds-1)*stake (if unmatched still held as locked)
          layExp += (m.odds - 1) * m.stake;
        }
      }
      // include open orders as extra exposure for the user if they are layer
      for (const o of open.data || []) {
        layExp += (o.odds - 1) * (o.remaining || o.stake || 0);
      }
      setExposure({ back: backExp, lay: layExp });
    } catch (e) {
      console.error(e);
    }
  }

  if (!wallet) return <div className="p-6">Loading wallet...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Wallet — {userId}</h1>
        <div className="text-sm text-gray-500">Pseudo-login demo</div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCard({ title: "Available Balance", value: wallet.balance.toFixed(2) })}
        {statCard({ title: "Locked (Exposure)", value: wallet.locked.toFixed(2) })}
        {statCard({ title: "Net P/L", value: (wallet.netPL ?? (wallet.balance - 1000)).toFixed(2) })}
        {statCard({ title: "Total Exposure (lay)", value: exposure.lay.toFixed(2) })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Open Positions</h3>
          {openOrders.length === 0 && <div className="text-sm text-gray-500">No open offers</div>}
          {openOrders.map(o => (
            <div key={o._id} className="flex justify-between items-center border-b py-2">
              <div>
                <div className="text-sm font-medium">Offer {o._id}</div>
                <div className="text-xs text-gray-500">{o.odds} • remaining {o.remaining}</div>
              </div>
              <div className="text-sm text-red-600">{((o.odds - 1) * o.remaining).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Settled & Recent Matches</h3>
          {recentMatches.length === 0 && <div className="text-sm text-gray-500">No matches</div>}
          <div className="space-y-2 max-h-80 overflow-auto">
            {recentMatches.map(m => (
              <div key={m._id} className="flex justify-between items-center border-b py-2">
                <div>
                  <div className="text-sm font-medium">{m.backerId} → {m.layerId}</div>
                  <div className="text-xs text-gray-500">{m.stake}@{m.odds}</div>
                </div>
                <div className="text-sm">
                  {m.backerId === userId ? (
                    <div className="text-green-600">Back</div>
                  ) : m.layerId === userId ? (
                    <div className="text-red-600">Lay</div>
                  ) : <div className="text-gray-500">Other</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Risk Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Total Back Exposure</div>
            <div className="text-lg font-bold">{exposure.back.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Lay Liability</div>
            <div className="text-lg font-bold text-red-600">{exposure.lay.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Net Exposure</div>
            <div className="text-lg font-bold">{(exposure.back - exposure.lay).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
