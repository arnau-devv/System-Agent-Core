import json
from fastapi import FastAPI, WebSocket
from persistance.config_store import config_store

app = FastAPI()

# Global reference to the connected frontend
connected_socket: WebSocket | None = None

# Instance created in main.py; shares the same chat_history reference as ai_service on run
system_prompt_builder = None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global connected_socket
    await websocket.accept()
    connected_socket = websocket
    
    # Send persisted config to frontend on connect
    await websocket.send_text(json.dumps({
        "name": "INIT-CONFIG",
        "data": {
            "user": config_store.get("user"),
            "agent_identity": config_store.get("agent_identity")
        }
    }))
    
    while True: # keep connection open
        raw_data = await websocket.receive_text()
        message = json.loads(raw_data)
        
        # User personal data & Agent behavior data
        # format -> {name: 'x-data', data: message}
        if message.get("name") == "user-data":
            try:
                data = message.get("data", {})
                await system_prompt_builder.handle_user_data(data)
            except Exception as e:
                print(f"[ws_server] Error: {e}")
        
        if message.get("name") == "agent-identity-data":
            try:
                data = message.get("data", {})
                await system_prompt_builder.handle_agent_identity_data(data)
            except Exception as e:
                print(f"[ws_server] Error: {e}")
            
