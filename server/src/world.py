from player import Player
from block import Block

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

WORLD = [
    Block(-1, -1, "normal", "#555", True),
    Block(0, -1, "spawn", "#2ad", True),
    Block(1, -1, "normal", "#555", True)
]