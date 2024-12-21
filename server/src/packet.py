from websockets.server import ServerConnection

async def readPacket(websocket: ServerConnection) -> tuple[str, list[str]]:
    data = await websocket.recv()
    return data[0], data[1:].splitlines()

async def writePacket(websocket: ServerConnection, packet_id: str, packet_data: list[str]):
    await websocket.send(packet_id + ("\n".join(packet_data)))