
import asyncio, time
from network import startServer
from player import Player
from block import Block
from config import *

def getPlayers():
    global WORLD
    for b in WORLD:
        if type(b) == Player:
            yield b

def getPlayer(name):
    global WORLD
    for b in WORLD:
        if type(b) == Player:
            if b.name == name:
                return b

def current_milli_time():
    return round(time.time() * 1000)

async def tickTimer():
    while True:
        for b in WORLD:
            await b.tick()
        await asyncio.sleep(1/20)

async def keepAliveTimer():
    while True:
        for b in getPlayers():
            await b.keepAlive()
        await asyncio.sleep(1)

async def renderTimer():
    while True:
        for p in getPlayers():
            await p.sendWorld([b.toStatement() for b in WORLD if await b.render() and b != p])
        await asyncio.sleep(1/60)

async def main():
    asyncio.get_event_loop().create_task(tickTimer())
    asyncio.get_event_loop().create_task(keepAliveTimer())
    asyncio.get_event_loop().create_task(renderTimer())
    await startServer(HOST, PORT)

WORLD = [
    Block(-1, -1, "normal", "#555", True),
    Block(0, -1, "spawn", "#2ad", True),
    Block(1, -1, "normal", "#555", True)
]

if __name__ == "__main__":
    asyncio.run(main())