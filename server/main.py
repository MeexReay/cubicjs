from websockets.server import serve, ServerConnection
import random, sys, asyncio, time

class Block:
    def __init__(self, x, y, block_type, color, collides):
        self.x = x
        self.y = y
        self.type = block_type
        self.color = color
        self.collides = collides

    async def tick(self):
        pass

    async def render(self):
        pass

    async def onCollide(self, player, x, y):
        if x != 0: player.vel_x = self.x + x - player.x
        if y != 0: player.vel_y = self.y + y - player.y

        if x != 0 or y != 0: # special blocks
            if self.type == "jump_boost":
                player.jump_speed = 5
                player.gravity_speed = 1.25
                player.on_ground = True
                await writePacket(player.websocket, "S", ["J", "5"])
                await writePacket(player.websocket, "S", ["G", "1.25"])
            elif player.jump_speed != 2:
                player.jump_speed = 2
                player.gravity_speed = 0.5
                await writePacket(player.websocket, "S", ["J", "2"])
                await writePacket(player.websocket, "S", ["G", "0.5"])

            if self.type == "killer":
                await player.setPos(*SPAWN)
                await player.sendToPlayers()

    def toStatement(self, add=True):
        return f"B1{self.x},{self.y},{int(self.collides)},{self.type},{self.color}" if add else f"B0{self.x},{self.y}"

class Player(Block):
    def __init__(self, websocket, x=None, y=None, name=None, color=None, vel_x=None, vel_y=None):
        super().__init__(x, y, None, color, True)
        self.x = x
        self.y = y

        self.name = name
        self.color = color
        self.vel_x = vel_x
        self.vel_y = vel_y

        self.websocket = websocket

        self.controls_x = 0
        self.controls_jump = False

        self.on_ground = False

        self.walk_speed = 1
        self.jump_speed = 2
        self.gravity_speed = 0.5

        self.last_

    async def setWalkSpeed(self, speed):
        await writePacket(self.websocket, "S", ["W", str(speed)])
        self.walk_speed = speed

    async def setGravitySpeed(self, speed):
        await writePacket(self.websocket, "S", ["G", str(speed)])
        self.gravity_speed = speed

    async def setJumpSpeed(self, speed):
        await writePacket(self.websocket, "S", ["J", str(speed)])
        self.jump_speed = speed

    async def sendName(self, name):
        await writePacket(self.websocket, "N", [name])

    async def setName(self, name):
        self.name = name
        await self.sendName(name)

    async def setColor(self, color):
        self.color = color
        await writePacket(self.websocket, "C", [color])

    async def setVel(self, x, y):
        if x == self.vel_x and y == self.vel_y: return

        self.vel_x = x
        self.vel_y = y

        await self.sendVel(x, y)

    async def setPos(self, x, y):
        if x == self.x and y == self.y: return

        self.x = x
        self.y = y

        await self.sendPos(x, y)

    async def sendVel(self, x, y):
        await writePacket(self.websocket, "V", [str(x), str(y)])

    async def sendPos(self, x, y):
        await writePacket(self.websocket, "P", [str(x), str(y)])

    async def sendMessage(self, message):
        await writePacket(self.websocket, "M", message.split("\n"))

    async def sendWorld(self, statements):
        if len(statements) == 0: return
        await writePacket(self.websocket, "W", statements)

    async def sendBlockTypes(self, types):
        await writePacket(self.websocket, "B", types)

    async def sendToPlayers(self):
        for p in getPlayers():
            if p != self:
                await p.sendWorld([self.toStatement()])

    async def tick(self):
        self.x = round(self.x * 100) / 100
        self.y = round(self.y * 100) / 100
        self.vel_x = round(self.vel_x * 100) / 100
        self.vel_y = round(self.vel_y * 100) / 100

        if not self.on_ground:
            self.vel_y -= self.gravity_speed

        await self.collide()

    async def collide(self):
        global WORLD

        self.on_ground = False

        for block in WORLD:
            if not block.collides: continue
            if block == self: continue

            collide_x = 0
            collide_y = 0

            if self.x > block.x-1 and self.x < block.x+1:
                if self.y > block.y and self.y + self.vel_y - 1 < block.y:
                    self.on_ground = True
                    collide_y = 1
                if self.y < block.y and self.y + self.vel_y > block.y - 1:
                    collide_y = -1

            if self.y > block.y-1 and self.y < block.y+1:
                if self.x > block.x and self.x + self.vel_x - 1 < block.x:
                    collide_x = 1
                if self.x < block.x and self.x + self.vel_x > block.x - 1:
                    collide_x = -1

            await block.onCollide(self, collide_x, collide_y)

    async def onCollide(self, player, x, y):
        await super().onCollide(player, x, y)
        # if x != 0:
        #     player.vel_x *= 0.5
        #     self.vel_x = player.vel_x
        # if y != 0:
        #     player.vel_y *= 0.5
        #     self.vel_y = player.vel_y
        # pass

    async def render(self):
        self.vel_x *= 0.5
        self.vel_y *= 0.5
        self.x += self.vel_x
        self.y += self.vel_y
        # await self.setVel(self.vel_x * 0.5, self.vel_y * 0.5)
        # await self.setPos(self.x + self.vel_x, self.y + self.vel_y)
        return self.vel_x != 0 or self.vel_y != 0

    async def keepAlive(self):
        await writePacket(self.websocket, "R", [str(self.x), str(self.y), str(self.vel_x), str(self.vel_y)])

    def toStatement(self, add=True):
        return f"P1{self.name},{self.x},{self.y},{self.vel_x},{self.vel_y},{self.color}" if add else f"P0{self.name}"

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

async def readPacket(websocket: ServerConnection) -> tuple[str, list[str]]:
    data = await websocket.recv()
    id,data = data[0], data[1:].splitlines()
    print(id, data)
    return id,data

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

            if packet_id == "V":
                vel_x, vel_y = float(packet_data[0]), float(packet_data[1])
                vel_x = max(min(vel_x, player.walk_speed), -player.walk_speed)
                vel_y = max(min(vel_y, player.jump_speed), 0)

                player.vel_x += vel_x

                if player.on_ground:
                    player.vel_y += vel_y
                    player.on_ground = False

                await player.sendToPlayers()

            if packet_id == "K":
                key,pressed = packet_data
                pressed = pressed == "1"

                if key == "KeyR" and pressed:
                    await player.setPos(SPAWN[0], SPAWN[1])
                if key == "ShiftLeft":
                    if pressed:
                        await player.setWalkSpeed(1)
                    else:
                        await player.setWalkSpeed(0.5)

            if packet_id == "M":
                message = packet_data[0]
                message = f"{name} > {message}"

                for p in getPlayers():
                    await p.sendMessage(message)

                print(message)

            if packet_id == "D":
                x,y = packet_data
                x,y = int(x),int(y)

                block = None
                for i in WORLD:
                    if type(i) == Player:
                        continue
                    if i.x == x and i.y == y:
                        block = i
                        break
                if not block: continue

                if block.type == "spawn": continue # spawn block protection

                if abs(x - player.x) ** 2 + abs(y - player.y) ** 2 > REACH_DISTANCE ** 2:
                    continue

                WORLD.remove(block)

                for p in getPlayers():
                    await p.sendWorld([block.toStatement(False)])

            if packet_id == "P":
                x,y,block_type = packet_data
                x,y = int(x),int(y)

                if block_type not in BLOCK_TYPES:
                    continue

                if abs(x - player.x) ** 2 + abs(y - player.y) ** 2 > REACH_DISTANCE ** 2:
                    continue

                found_block = False
                for i in WORLD:
                    if type(i) == Player:
                        continue
                    if i.x == x and i.y == y:
                        found_block = True
                        break
                if found_block: continue

                block = Block(x,y,block_type,BLOCK_TYPES[block_type],True)

                WORLD.append(block)

                for p in getPlayers():
                    await p.sendWorld([block.toStatement()])
    except Exception as exc:
        WORLD.remove(player)

        for p in getPlayers():
            await p.sendWorld([player.toStatement(False)])

        await writePacket(websocket, "K", [str(exc)])

    print(name, "left the server")

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
    async with serve(handler, HOST, PORT) as server:
        print(f"started server on {HOST}:{PORT}")
        await asyncio.get_running_loop().create_future()



HOST,PORT = sys.argv[1].split(":")
PORT = int(PORT)

COLORS = ["#d22", "#2d2", "#22d", "#dd2", "#2dd", "#d2d", "#ddd"]
SPAWN = (0, 0)

REACH_DISTANCE = 15

BLOCK_TYPES = {
    "normal": "#555",
    "jump_boost": "#2d2",
    "killer": "#d22",
}

WORLD = [
    Block(-1, -1, "normal", "#555", True),
    Block(0, -1, "spawn", "#2ad", True),
    Block(1, -1, "normal", "#555", True)
]



if __name__ == "__main__":
    asyncio.run(main())