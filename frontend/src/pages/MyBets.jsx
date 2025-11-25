import React, {useEffect, useState} from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
const API = "http://localhost:3000";

export default function MyBets(){
  const { userId } = useParams();
  const [offers, setOffers] = useState([]);

  useEffect(()=>{ fetch(); },[userId]);

  async function fetch(){
    const r = await axios.get(`${API}/api/m1/open-orders/${userId}`);
    setOffers(r.data);
  }

  return (
    <div>
      <h1>Open Offers — {userId}</h1>
      {offers.map(o=>(
        <div key={o._id} style={{border:"1px solid #eee", padding:8, marginBottom:6}}>
          Offer {o._id}: stake {o.stake} remaining {o.remaining} odds {o.odds}
        </div>
      ))}
    </div>
  );
}
