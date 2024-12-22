
import asyncio
from network import startServer
from world import *
from config import *


async def tickTimer():
    while True:
        for b in WORLD:
            await b.tick()
        await asyncio.sleep(1/20)

async def renderTimer():
    while True:
        for p in getPlayers():
            await p.sendWorld([b.toStatement() for b in WORLD if await b.render() and b != p])
        await asyncio.sleep(1/60)

async def main():
    asyncio.get_event_loop().create_task(tickTimer())
    asyncio.get_event_loop().create_task(renderTimer())
    await startServer(HOST, PORT)

if __name__ == "__main__":
    asyncio.run(main())