from config import SPAWN

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
                player.setGravitySpeed(1.25)
                player.setJumpSpeed(5)
                player.on_ground = True
            elif player.jump_speed != 2:
                player.setGravitySpeed(0.5)
                player.setJumpSpeed(2)

            if self.type == "killer":
                await player.setPos(*SPAWN)
                await player.sendToPlayers()

    def toStatement(self, add=True):
        return f"B1{self.x},{self.y},{int(self.collides)},{self.type},{self.color}" if add else f"B0{self.x},{self.y}"