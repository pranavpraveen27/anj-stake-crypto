import React from 'react'

const App = () => {

  const ws=new WebSocket("ws://localhost:300");
  ws.onopen=()=>{
    console.log("ws connected");
    ws.send("hello from clinet")
  }

  ws.onmessage=(event)=>{
    console.log("server:", event.data)
  }

  return (
    <div className='text-fuchsia-500'>
      <h1>this is app</h1>
      <div>
        
      </div>
    </div>
  )
}

export default App