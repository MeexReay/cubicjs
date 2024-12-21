from block import Block
from network import writePacket
from config import SPAWN, REACH_DISTANCE, BLOCK_TYPES
from main import getPlayers, WORLD
import time

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

        self.on_ground = False

        self.walk_speed = 1
        self.jump_speed = 2
        self.gravity_speed = 0.5

        self.lsd_pos = (x, y)
        self.lsd_time = time.time()

    async def sendPacket(self, packet_id, packet_data):
        await writePacket(self.websocket, packet_id, packet_data)

    async def onPacket(self, packet_id, packet_data):
        if packet_id == "V":
            vel_x, vel_y = float(packet_data[0]), float(packet_data[1])
            vel_x = max(min(vel_x, self.walk_speed), -self.walk_speed)
            vel_y = max(min(vel_y, self.jump_speed), 0)

            self.vel_x += vel_x

            if self.on_ground:
                self.vel_y += vel_y
                self.on_ground = False

            await self.sendToPlayers()

        if packet_id == "X":
            x, y = float(packet_data[0]), float(packet_data[1])

            ticks = (time.time() - self.lsd_time) * 20
            rx, ry = abs(x - self.lsd_pos[0]), y - self.lsd_pos[1]

            if rx > self.walk_speed * ticks: return
            if ry < 0 and abs(ry) > self.gravity_speed * ticks: return
            if ry > 0 and ry > self.jump_speed * ticks: return

            self.x = x
            self.y = y

            self.lsd_pos = (x, y)
            self.lsd_time = time.time()

            await self.sendToPlayers()

        if packet_id == "K":
            key,pressed = packet_data
            pressed = pressed == "1"

            if key == "KeyR" and pressed:
                await self.setPos(SPAWN[0], SPAWN[1])
            if key == "ShiftLeft":
                if pressed:
                    await self.setWalkSpeed(1)
                else:
                    await self.setWalkSpeed(0.5)

        if packet_id == "M":
            message = packet_data[0]
            message = f"{self.name} > {message}"

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
            if not block: return

            if block.type == "spawn": return # spawn block protection

            if abs(x - self.x) ** 2 + abs(y - self.y) ** 2 > REACH_DISTANCE ** 2:
                return

            WORLD.remove(block)

            for p in getPlayers():
                await p.sendWorld([block.toStatement(False)])

        if packet_id == "P":
            x,y,block_type = packet_data
            x,y = int(x),int(y)

            if block_type not in BLOCK_TYPES:
                return

            if abs(x - self.x) ** 2 + abs(y - self.y) ** 2 > REACH_DISTANCE ** 2:
                return

            found_block = False
            for i in WORLD:
                if type(i) == Player:
                    continue
                if i.x == x and i.y == y:
                    found_block = True
                    break
            if found_block: return

            block = Block(x,y,block_type,BLOCK_TYPES[block_type],True)

            WORLD.append(block)

            for p in getPlayers():
                await p.sendWorld([block.toStatement()])

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
