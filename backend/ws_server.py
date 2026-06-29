import json
from fastapi import FastAPI, WebSocket

app = FastAPI()

# Global reference to the connected frontend
connected_socket: WebSocket | None = None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global connected_socket
    await websocket.accept()
    connected_socket = websocket
    while True: # keep connection open
        raw_data = await websocket.receive_text()
        message = json.loads(raw_data)
        
        
        # User personal data & Agent behavior data
        # format -> {name: 'x-data', data: message}
        
        try:
            if message.get("name") == "user-data":
                data = message.get("data", {})
                # await handle_user_data(data)
        except ValueError:
            raise "[Error] key: 'name' || 'data' doesnt match from backend" 
        
        try:
            if message.get("name") == "agent-identity-data":
                data = message.get("data", {})
                # await handle_agent_identity_data(data)
        except ValueError:
            raise "[Error] key: 'name' || 'data' doesnt match from backend"