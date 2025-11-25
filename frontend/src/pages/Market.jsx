// src/pages/Market.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:3000";

function ColourBar({ type, children }) {
  const bg = type === "layer" ? "bg-red-50" : "bg-green-50";
  const border = type === "layer" ? "border-red-200" : "border-green-200";
  return (
    <div className={`${bg} ${border} border p-3 rounded mb-3`}>
      {children}
    </div>
  );
}

export default function Market({ user }) {
  const { marketId } = useParams();
  const [orderbook, setOrderbook] = useState([]);
  const [matches, setMatches] = useState([]);
  const [layerForm, setLayerForm] = useState({ layerId: user || "U1", stake: 100, odds: 3.0 });
  const [backForm, setBackForm] = useState({ backerId: user || "U4", stake: 50 });
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    fetchOrderbook();
    fetchMatches();

    const ws = new WebSocket("ws://localhost:3000");
    wsRef.current = ws;
    ws.onopen = () => console.log("WS open");
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const payload = msg.data || msg;
        if (!payload) return;
        if (payload.type?.startsWith("orderbook") || payload.type?.startsWith("match")) {
          fetchOrderbook();
          fetchMatches();
        }
      } catch (e) {
        console.error("WS parse", e);
      }
    };
    ws.onclose = () => console.log("WS closed");
    return () => ws.close();
  }, [marketId]);

  useEffect(() => {
    // keep forms defaulted to current login user
    setLayerForm(f => ({ ...f, layerId: user }));
    setBackForm(f => ({ ...f, backerId: user }));
  }, [user]);

  async function fetchOrderbook() {
    try {
      const res = await axios.get(`${API}/api/${marketId}/orderbook`);
      setOrderbook(res.data.orderbook || []);
    } catch (e) {
      console.error(e);
      setOrderbook([]);
    }
  }
  async function fetchMatches() {
    try {
      const res = await axios.get(`${API}/api/${marketId}/matches?limit=20`);
      setMatches(res.data || []);
    } catch (e) {
      console.error(e);
      setMatches([]);
    }
  }

  async function doPlaceLayer() {
    setLoading(true);
    try {
      const payload = { layerId: layerForm.layerId, stake: Number(layerForm.stake), odds: Number(layerForm.odds) };
      await axios.post(`${API}/markets/${marketId}/layer`, payload);
      fetchOrderbook();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to place layer");
    } finally {
      setLoading(false);
    }
  }

  async function doPlaceBack() {
    setLoading(true);
    try {
      const payload = { backerId: backForm.backerId, stake: Number(backForm.stake) };
      await axios.post(`${API}/markets/${marketId}/back`, payload);
      fetchMatches();
      fetchOrderbook();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to place back");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Market {marketId}</h1>
        <div className="text-sm text-gray-500">Live • Single market demo</div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <ColourBar type="layer">
            <h4 className="font-semibold">Place Lay (Layer)</h4>
            <div className="flex gap-3 items-center mt-2">
              <input value={layerForm.layerId} onChange={e => setLayerForm({...layerForm, layerId:e.target.value})} className="px-3 py-2 rounded border bg-white" />
              <input value={layerForm.stake} type="number" onChange={e => setLayerForm({...layerForm, stake:e.target.value})} className="px-3 py-2 rounded border w-32" />
              <input value={layerForm.odds} type="number" step="0.1" onChange={e => setLayerForm({...layerForm, odds:e.target.value})} className="px-3 py-2 rounded border w-28" />
              <button onClick={doPlaceLayer} disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded">Place Layer</button>
            </div>
          </ColourBar>

          <ColourBar type="back">
            <h4 className="font-semibold">Place Back (Backer)</h4>
            <div className="flex gap-3 items-center mt-2">
              <input value={backForm.backerId} onChange={e => setBackForm({...backForm, backerId:e.target.value})} className="px-3 py-2 rounded border bg-white" />
              <input value={backForm.stake} type="number" onChange={e => setBackForm({...backForm, stake:e.target.value})} className="px-3 py-2 rounded border w-40" />
              <button onClick={doPlaceBack} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">Place Back</button>
            </div>
          </ColourBar>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">My Open Offers</h4>
            <div className="space-y-2">
              {orderbook.flatMap(b => b.offers).filter(o => o.layerId === layerForm.layerId).map(o => (
                <div key={o.offerId} className="p-2 border rounded bg-white">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{o.offerId}</div>
                      <div className="text-xs text-gray-500">{o.layerId} • remaining {Number(o.remaining).toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-500 font-bold">{b => b?.odds}</div>
                    </div>
                  </div>
                </div>
              ))}
              {orderbook.flatMap(b => b.offers).filter(o => o.layerId === layerForm.layerId).length === 0 && <div className="text-sm text-gray-500">No open offers</div>}
            </div>
          </div>
        </div>

        <div>
          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-semibold mb-2">Orderbook</h3>
            {orderbook.length === 0 && <div className="text-sm text-gray-500">No offers</div>}
            {orderbook.map(b => (
              <div key={b.odds} className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">Odds {b.odds}</div>
                  <div className="text-sm text-gray-500">{b.offers.length} offers</div>
                </div>

                {b.offers.map(o => (
                  <div key={o.offerId} className={`p-2 rounded mb-2 flex justify-between items-center ${o.layerId === layerForm.layerId ? "bg-red-50" : "bg-white"}`}>
                    <div>
                      <div className="text-sm font-medium">{o.layerId}</div>
                      <div className="text-xs text-gray-500">remaining: {Number(o.remaining).toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{b.odds}</div>
                      <div className="text-xs text-gray-400">{o.offerId}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-white rounded shadow">
            <h3 className="font-semibold mb-2">Recent Matches</h3>
            {matches.length === 0 && <div className="text-sm text-gray-500">No matches</div>}
            {matches.map(m => (
              <div key={m._id || `${m.backerId}-${m.layerId}-${m.stake}`} className="p-2 border-b">
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm font-medium">{m.backerId} → {m.layerId}</div>
                    <div className="text-xs text-gray-500">{m.stake}@{m.odds}</div>
                  </div>
                  <div className="text-sm text-green-600 font-bold">{(m.stake * m.odds).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
