type Rect = [number, number, number, number]

var ticksAlive = 0

var debugMode = false

var camera = {
    x: 0.0,
    y: 0.0,
    size: 1.5
}

var chatOpened = false
var chatMessages: string[] = []
var chatTyping = ""

var player = new MainPlayer()
player.register()

var blocks: Block[] = []

const allowed_key_to_send = [
    "KeyR", "KeyW", "KeyE", "KeyQ", "KeyS",
    "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5",
    "Numpad6", "Numpad7", "Numpad8", "Numpad9", "Numpad0",
    "ShiftLeft", "ControlLeft", "Enter",
    "F1", "F2", "KeyZ", "KeyX", "KeyC"
]

async function connectServer(address: string, name: string) {
    player.closeConnection()
    player.onConnect(name)

    try {
        player.conn = new Connection(
            await Connection.createSocket(
                address, 
                (p) => player.onPacket(p), 
                (e) => {
                    player.conn = null
                    setServerError(e == null ? "Connection closed due to error" : e)
                    resetWorld()
                }
            )
        )
        player.conn.send(new JoinPacket(name))
    } catch (exception) {
        setServerError(exception)
        console.log(exception)
    }
}

function resetWorld() {
    player.onConnect("unnamed player")
    blocks = []
    blocks.push(new Block(-1, -1, "#555", true, "normal"));
    blocks.push(new Block(0, -1, "#a67", true, "spawn"));
    blocks.push(new Block(1, -1, "#555", true, "normal"));
}

function getBlock(x: number, y: number): Block {
    let value = blocks.find(o => !(o instanceof Player) && o.x == x && o.y == y)
    if (typeof value === "undefined") {
        return null
    } else {
        return value
    }
}

function placeBlock(block: Block) {
    blocks.push(block);
}

function removeBlock(x: number, y: number) {
    blocks = blocks.filter(o => o instanceof Player || o.x != x || o.y != y)
}

function getPlayer(name: string): Player | null {
    let value = blocks.find(o => o instanceof Player && o.name == name) as Player
    if (typeof value === "undefined") {
        return null
    } else {
        return value
    }
}

function removePlayer(name: string) {
    blocks = blocks.filter(o => !(o instanceof Player) || o.name != name)
}

function render() {
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, width, height);

    for (const block of blocks)
        block.render()
    for (const block of blocks)
        block.renderText()
    player.render()
    player.renderText()
}

function tick() {
    for (const block of blocks)
        block.tick()
    player.tick()
}

function renderTick() {
    for (const block of blocks)
        block.renderTick()
    player.renderTick()
}

resetWorld()