import json
from fastapi import FastAPI, WebSocket
from persistance.config_store import config_store

app = FastAPI()
saved_messages = []
# Global reference to the connected frontend
connected_socket: WebSocket | None = None

# Instance created in main.py; shares the same chat_history reference as ai_service on run
system_prompt_builder = None

# Instance created in main.py; shares the same event bus as all services
event_bus = None

# Instance created in main.py; uses state_manager as a public object
state_manager = None


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global connected_socket, state_manager, event_bus, system_prompt_builder
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
    
    for msg in saved_messages:
        await websocket.send_text(json.dumps({
            "name": "CHAT_MESSAGE",
            "data": {"role": msg["role"], "content": msg["content"]}
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
                
        # User chat input
        # format -> "string"
        if message.get("name") == "user-input":
            try: 
                user_input = message.get("data")
                await event_bus.publish("USER_CHAT_INPUT", {"user_input": user_input})
            except Exception as e:
                print(f"[ws_server] Error: {e}")
            
        if message.get("name") == "sphere-toggled":
            try:
                current = state_manager.system_state
                if current in ["LISTENING", "PROCESSING_STT", "THINKING", "SPEAKING", "SPEAKING_DONE"]:
                    # await event_bus.publish("STOP_SPEAKING", {})
                    await event_bus.publish("IDLE", {})
                elif current == "IDLE":
                    await event_bus.publish("WAKE_DETECTED", {})
            except Exception as e:
                print(f"[ws_server] Error: {e}")
