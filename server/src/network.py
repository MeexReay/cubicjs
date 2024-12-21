from websockets.server import serve, ServerConnection
import asyncio
from config import BLOCK_TYPES, COLORS, SPAWN
from world import *
from player import Player
from packet import *
import random
import traceback

async def startServer(host, port):
    async with serve(handler, host, port):
        print(f"started server on {host}:{port}")
        await asyncio.get_running_loop().create_future()

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
            await player.onPacket(packet_id, packet_data)
    except Exception as exc:
        traceback.print_exc()

        WORLD.remove(player)

        for p in getPlayers():
            await p.sendWorld([player.toStatement(False)])

        await writePacket(websocket, "K", [str(exc)])

    print(name, "left the server")