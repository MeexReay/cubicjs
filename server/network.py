from websockets.server import serve, ServerConnection
import asyncio
from config import BLOCK_TYPES, COLORS, SPAWN
from main import WORLD, getPlayer, getPlayers
from player import Player
import random

async def startServer(host, port):
    async with serve(handler, host, port):
        print(f"started server on {host}:{port}")
        await asyncio.get_running_loop().create_future()

async def readPacket(websocket: ServerConnection) -> tuple[str, list[str]]:
    data = await websocket.recv()
    return data[0], data[1:].splitlines()

async def writePacket(websocket: ServerConnection, packet_id: str, packet_data: list[str]):
    await websocket.send(packet_id + ("\n".join(packet_data)))

async def handler(websocket: ServerConnection):
    packet_id, packet_data = await readPacket(websocket)

    name = packet_data[0]

    if packet_id != "J":
        await writePacket(websocket, "K", ["join packet is invalid"])
        return
    if getPlayer(name) != None:
        await writePacket(websocket, "K", ["this nickname is already in use"])
        return

    print(name, "joined to the server")

    try:
        player = Player(websocket)

        await player.sendWorld([b.toStatement() for b in WORLD])

        await player.sendBlockTypes(BLOCK_TYPES.keys())
        await player.setColor(random.choice(COLORS))
        await player.setPos(*SPAWN)
        await player.setVel(0,0)
        await player.setName(name)
        await player.setWalkSpeed(0.5)

        await player.sendToPlayers()

        WORLD.append(player)

        while True:
            packet_id, packet_data = await readPacket(websocket)
            player.onPacket(packet_id, packet_data)
    except Exception as exc:
        WORLD.remove(player)

        for p in getPlayers():
            await p.sendWorld([player.toStatement(False)])

        await writePacket(websocket, "K", [str(exc)])

    print(name, "left the server")