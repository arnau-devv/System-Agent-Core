from fastapi import FastAPI, WebSocket

app = FastAPI()

# Global reference to the connected frontend
connected_socket: WebSocket | None = None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global connected_socket
    await websocket.accept()
    connected_socket = websocket
    while True:
        await websocket.receive_text()  # keep connection open