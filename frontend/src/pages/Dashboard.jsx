// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
const API = "http://localhost:3000";

export default function Dashboard() {
  const marketId = "m1";
  const [summary, setSummary] = useState(null);
  const [orderbook, setOrderbook] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    fetchAll();
    const ws = new WebSocket("ws://localhost:3000");
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const p = msg.data || msg;
        // update lightly and then re-fetch authoritative state
        if (p?.type?.startsWith("orderbook") || p?.type?.startsWith("match")) {
          fetchAll();
        }
      } catch (e) {}
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    function listener(e) {
      const { detail } = e;
      if (detail.type === "wallet-update") fetchWallet();
    }
    window.addEventListener("ws-message", listener);
    return () => window.removeEventListener("ws-message", listener);
  }, []);

  async function fetchAll() {
    try {
      const [s, ob, m] = await Promise.all([
        axios.get(`${API}/api/${marketId}/summary`),
        axios.get(`${API}/api/${marketId}/orderbook`),
        axios.get(`${API}/api/${marketId}/matches?limit=6`),
      ]);
      setSummary(s.data);
      setOrderbook(ob.data.orderbook || []);
      setMatches(m.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard — Market {marketId}</h1>
        <div className="text-sm text-gray-400">
          Single market demo • live updates
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 p-4 bg-white rounded shadow">
          <h3 className="font-semibold mb-2">Market Summary</h3>
          <div className="flex gap-6">
            <div>
              <div className="text-sm text-gray-500">Liability</div>
              <div className="text-xl font-bold">
                {(summary?.liability ?? 0).toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Total Offers</div>
              <div className="text-xl font-bold">
                {summary?.totalOffers ?? 0}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Matches</div>
              <div className="text-xl font-bold">
                {summary?.matchesCount ?? 0}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Top odds</div>
              <div className="flex gap-2">
                {summary?.topOdds?.map((o) => (
                  <div
                    key={o}
                    className="px-2 py-1 bg-gray-100 rounded text-sm"
                  >
                    {o}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <hr className="my-4" />

          <h4 className="font-medium mb-2">Top of Book</h4>
          <div className="grid grid-cols-3 gap-2">
            {orderbook.map((bucket) => (
              <div key={bucket.odds} className="p-2 border rounded">
                <div className="text-sm text-gray-500">Odds</div>
                <div className="font-bold text-lg">{bucket.odds}</div>
                <div className="mt-2 text-sm">
                  {bucket.offers.slice(0, 4).map((o) => (
                    <div
                      key={o.offerId}
                      className="flex justify-between text-xs border-b py-1"
                    >
                      <div>{o.layerId}</div>
                      <div>{Number(o.remaining).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <h3 className="font-semibold mb-2">Recent Matches</h3>
          <div className="space-y-2">
            {matches.length === 0 && (
              <div className="text-sm text-gray-500">No matches yet</div>
            )}
            {matches.map((m) => (
              <div
                key={m._id || `${m.backerId}-${m.layerId}-${m.stake}`}
                className="flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-medium">
                    {m.backerId} → {m.layerId}
                  </div>
                  <div className="text-xs text-gray-500">
                    {m.stake}@{m.odds}
                  </div>
                </div>
                <div className="text-sm text-green-600 font-bold">
                  {(m.stake * m.odds).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
