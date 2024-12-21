import sys


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