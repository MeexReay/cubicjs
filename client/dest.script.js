const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const width = 640;
const height = 480;
const server_ip = document.getElementById("server-ip");
const server_nick = document.getElementById("server-nick");
const connect_server = document.getElementById("connect-server");
const server_error = document.getElementById("server-error");
function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let currentLine = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const testLine = currentLine + char;
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = char;
        }
        else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
}
function lerp(a, b, alpha) {
    return a + alpha * (b - a);
}
function setServerError(text) {
    server_error.innerText = text;
}
connect_server.onclick = () => {
    let ip = server_ip.value;
    let nick = server_nick.value;
    setServerError("");
    if (ip.length == 0)
        return setServerError("введите айпи пж");
    if (nick.length == 0)
        return setServerError("введите ник пж");
    if (!ip.includes(":"))
        ip += ":8000";
    connectServer(ip, nick);
};
setInterval(tick, 1000 / 20);
setInterval(renderTick, 1000 / 60);
let renderTimer = () => {
    render();
    requestAnimationFrame(renderTimer);
};
requestAnimationFrame(renderTimer);
class Block {
    constructor(x, y, color, collides, type) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.collides = collides;
        this.type = type;
    }
    render() {
        let rect = this.translate_to_camera();
        if (this.is_need_render(rect)) {
            ctx.fillStyle = this.color;
            ctx.fillRect(...rect);
        }
    }
    is_need_render(rect) {
        return rect[0] + rect[2] > 0 || rect[1] + rect[3] > 0 || rect[0] < width || rect[1] < height;
    }
    translate_to_camera() {
        let size = camera.size * 16;
        return [
            this.x * size - size / 2 + (width / 2 - camera.x * size),
            height - (this.y + 1) * size + size / 2 - (height / 2 - camera.y * size),
            size,
            size
        ];
    }
    tick() {
    }
    renderTick() {
    }
    on_collide(player, x, y) {
        if (x != 0)
            player.velocity_x = this.x + x - player.x;
        if (y != 0)
            player.velocity_y = this.y + y - player.y;
    }
    renderText() {
    }
}
class Player extends Block {
    constructor(x, y, name, color, velocity_x, velocity_y) {
        super(x, y, color, true, null);
        this.velocity_x = velocity_x;
        this.velocity_y = velocity_y;
        this.name = name;
    }
    reset() {
        this.on_ground = false;
    }
    on_collide(player, x, y) {
        super.on_collide(player, x, y);
    }
    tick(collide = true) {
        this.x = Math.round(this.x * 100) / 100;
        this.y = Math.round(this.y * 100) / 100;
        this.velocity_x = Math.round(this.velocity_x * 100) / 100;
        this.velocity_y = Math.round(this.velocity_y * 100) / 100;
        if (collide)
            this.collide();
    }
    collide() {
        this.on_ground = false;
        for (const block of blocks) {
            if (!block.collides)
                continue;
            let collide_x = 0;
            let collide_y = 0;
            if (this.x > block.x - 1 && this.x < block.x + 1) {
                if (this.y > block.y && this.y + this.velocity_y - 1 < block.y) {
                    this.on_ground = true;
                    collide_y = 1;
                }
                if (this.y < block.y && this.y + this.velocity_y > block.y - 1)
                    collide_y = -1;
            }
            if (this.y > block.y - 1 && this.y < block.y + 1) {
                if (this.x > block.x && this.x + this.velocity_x - 1 < block.x)
                    collide_x = 1;
                if (this.x < block.x && this.x + this.velocity_x > block.x - 1)
                    collide_x = -1;
            }
            block.on_collide(this, collide_x, collide_y);
        }
    }
    renderTick() {
        this.velocity_x *= 0.5;
        this.velocity_y *= 0.5;
        this.x += this.velocity_x;
        this.y += this.velocity_y;
    }
    renderText() {
        super.renderText();
        let rect = this.translate_to_camera();
        if (this.is_need_render(rect)) {
            ctx.fillStyle = "#ddd";
            ctx.font = "15px monospace";
            let width = ctx.measureText(this.name).width;
            ctx.fillText(this.name, rect[0] + rect[2] / 2 - width / 2, rect[1] - 5);
        }
    }
    teleport(x, y) {
        this.velocity_x = x - this.x;
        this.velocity_y = y - this.y;
    }
    forceTeleport(x, y) {
        this.x = x;
        this.y = y;
        this.velocity_x = 0;
        this.velocity_y = 0;
    }
}
class Packet {
    constructor(id, data) {
        this.id = id;
        this.data = data;
    }
    getId() { return this.id; }
    getData() { return this.data; }
    static fromString(data) {
        return new Packet(data[0], data.slice(1).split("\n"));
    }
}
class JoinPacket extends Packet {
    constructor(name) {
        super("J", [name]);
    }
}
class MessagePacket extends Packet {
    constructor(message) {
        super("M", [message]);
    }
}
class KeyPacket extends Packet {
    constructor(key, pressed) {
        super("K", [key, pressed ? "1" : "0"]);
    }
}
class PlaceBlockPacket extends Packet {
    constructor(x, y, type) {
        super("P", [x.toString(), y.toString(), type]);
    }
}
class DestroyBlockPacket extends Packet {
    constructor(x, y) {
        super("D", [x.toString(), y.toString()]);
    }
}
class PositionPacket extends Packet {
    constructor(x, y) {
        super("X", [x.toString(), y.toString()]);
    }
}
class VelocityPacket extends Packet {
    constructor(x, y) {
        super("V", [x.toString(), y.toString()]);
    }
}
class Connection {
    constructor(address, on_packet, on_close) {
        this.socket = new WebSocket("ws://" + address, "cubic");
        this.on_packet = on_packet;
        this.on_close = on_close;
        this.socket.onmessage = this._on_message;
        this.socket.onclose = this._on_close;
        this.socket.onerror = this._on_error;
    }
    _on_message(event) {
        this.on_packet(Packet.fromString(event.data));
    }
    _on_close(event) {
        this.on_close(null);
    }
    _on_error(event) {
        this.on_close(event.toString());
    }
    close() {
        this.socket.close();
    }
    send(packet) {
        this.socket.send(packet.getId() + packet.getData());
    }
}
var ticksAlive = 0;
var debugMode = false;
var camera = {
    x: 0.0,
    y: 0.0,
    size: 1.5
};
var chatOpened = false;
var chatMessages = [];
var chatTyping = "";
class MainPlayer extends Player {
    constructor() {
        super(0.0, 0.0, "unnamed player", "#5e6", 0, 0);
        this.reset();
        this.conn = null;
    }
    reset() {
        super.reset();
        this.walk_speed = 1;
        this.jump_speed = 2;
        this.gravity_speed = 0.5;
        this.controls_x = 0;
        this.controls_jump = false;
        this.block_type = null;
        this.all_block_types = [
            "normal", "normal", "normal", "normal", "normal",
            "normal", "normal", "normal", "normal", "normal"
        ];
    }
    onConnect(name) {
        this.x = 0.0;
        this.y = 0.0;
        this.velocity_x = 0.0;
        this.velocity_y = 0.0;
        camera.x = 0.0;
        camera.y = 0.0;
        chatOpened = false;
        chatMessages = [];
        this.name = name;
        this.color = "#5e6";
        blocks = [];
        this.reset();
    }
    register() {
        document.addEventListener("keydown", (e) => {
            let key = e.code;
            if (chatOpened) {
                if (key == "Backspace") {
                    chatTyping = chatTyping.slice(0, chatTyping.length - 1);
                }
                else if (key == "Enter") {
                    if (chatTyping == "") {
                        chatOpened = false;
                        return;
                    }
                    this.sendPacket(new MessagePacket(chatTyping));
                    chatTyping = "";
                    chatOpened = false;
                }
                else if (key == "Escape") {
                    chatOpened = false;
                }
                else if (e.key.length == 1) {
                    chatTyping += e.key;
                    e.preventDefault();
                    return false;
                }
            }
            else {
                if (key == "KeyD") {
                    this.controls_x = 1;
                }
                else if (key == "KeyA") {
                    this.controls_x = -1;
                }
                else if (key == "Space") {
                    this.controls_jump = true;
                    e.preventDefault();
                    return false;
                }
                else if (key == "KeyR") {
                    if (this.conn == null) {
                        this.forceTeleport(0, 1);
                    }
                }
                else if (key == "KeyT") {
                    chatOpened = true;
                }
                if (e.key == "0")
                    this.block_type = null;
                if ("123456789".includes(e.key))
                    this.block_type = this.all_block_types[parseInt(e.key) - 1];
                if (allowed_key_to_send.includes(key)) {
                    this.sendPacket(new KeyPacket(key, true));
                }
                if (key == "Escape") {
                    this.closeConnection();
                }
            }
            if (key == "F3") {
                debugMode = !debugMode;
                e.preventDefault();
                return false;
            }
        });
        document.addEventListener("keyup", (e) => {
            let key = e.code;
            if ((key == "KeyD" && this.controls_x == 1)
                || (key == "KeyA" && this.controls_x == -1)) {
                this.controls_x = 0;
            }
            else if (key == "Space" && this.controls_jump) {
                this.controls_jump = false;
            }
            if (allowed_key_to_send.includes(key)) {
                this.sendPacket(new KeyPacket(key, false));
            }
        });
        canvas.addEventListener("wheel", e => {
            if (e.deltaY > 0) {
                camera.size *= 0.5 * (e.deltaY / 114);
            }
            else {
                camera.size *= 2 * (e.deltaY / -114);
            }
            e.preventDefault();
            return false;
        });
        canvas.addEventListener("mousedown", e => {
            let rect = canvas.getBoundingClientRect();
            let size = 16 * camera.size;
            let x = Math.round((e.clientX - rect.x) / size - (width / size / 2) + camera.x);
            let y = Math.round((height - (e.clientY - rect.y)) / size - (height / size / 2) + camera.y);
            if (e.buttons == 2 && this.block_type != null) {
                if (this.conn == null) {
                    placeBlock(new Block(x, y, "#555", true, this.block_type));
                }
                this.sendPacket(new PlaceBlockPacket(x, y, this.block_type));
            }
            else if (e.buttons == 1) {
                if (this.conn == null) {
                    removeBlock(x, y);
                }
                this.sendPacket(new DestroyBlockPacket(x, y));
            }
        });
    }
    sendPacket(packet) {
        if (this.conn != null) {
            this.conn.send(packet);
        }
    }
    closeConnection() {
        if (this.conn != null)
            this.conn.close();
        this.conn = null;
    }
    onPacket(packet) {
        let packet_id = packet.getId();
        let packet_data = packet.getData();
        if (packet_id == "K") {
            setServerError(packet_data[0]);
            this.closeConnection();
        }
        if (packet_id == "N") {
            this.name = packet_data[0];
        }
        if (packet_id == "C") {
            this.color = packet_data[0];
        }
        if (packet_id == "M") {
            chatMessages.unshift(...packet_data);
        }
        if (packet_id == "R") {
            this.velocity_x = parseFloat(packet_data[0]) - this.x + parseFloat(packet_data[2]);
            this.velocity_y = parseFloat(packet_data[1]) - this.y + parseFloat(packet_data[3]);
        }
        if (packet_id == "P") {
            let x = parseFloat(packet_data[0]);
            let y = parseFloat(packet_data[1]);
            this.x = x;
            this.y = y;
        }
        if (packet_id == "V") {
            let x = parseFloat(packet_data[0]);
            let y = parseFloat(packet_data[1]);
            this.velocity_x = x;
            this.velocity_y = y;
        }
        if (packet_id == "S") {
            let speed_type = packet_data[0];
            let speed = parseFloat(packet_data[1]);
            if (speed_type == "W") {
                this.walk_speed = speed;
            }
            else if (speed_type == "J") {
                this.jump_speed = speed;
            }
            else if (speed_type == "G") {
                this.gravity_speed = speed;
            }
        }
        if (packet_id == "W") {
            for (const data of packet_data) {
                let type = data[0];
                let create = data[1] == "1";
                let params = data.slice(2).split(",");
                if (type == "B") {
                    let x = parseFloat(params[0]);
                    let y = parseFloat(params[1]);
                    if (create) {
                        let collides = params[2] == "1";
                        let type = params[3];
                        let color = params[4];
                        let block = getBlock(x, y);
                        if (block != null) {
                            block.x = x;
                            block.y = y;
                            block.color = color;
                            block.collides = collides;
                            block.type = type;
                        }
                        else {
                            placeBlock(new Block(x, y, color, collides, type));
                        }
                    }
                    else {
                        removeBlock(x, y);
                    }
                }
                else if (type == "P") {
                    let name = params[0];
                    if (create) {
                        let x = parseFloat(params[1]);
                        let y = parseFloat(params[2]);
                        let vel_x = parseFloat(params[3]);
                        let vel_y = parseFloat(params[4]);
                        let color = params[5];
                        let player = getPlayer(name);
                        if (player != null) {
                            player.x = x;
                            player.y = y;
                            player.color = color;
                            player.velocity_x = vel_x;
                            player.velocity_y = vel_y;
                        }
                        else {
                            placeBlock(new Player(x, y, name, color, vel_x, vel_y));
                        }
                    }
                    else {
                        removePlayer(name);
                    }
                }
            }
        }
        if (packet_id == "B") {
            this.all_block_types = packet_data.slice(0, 9);
            this.block_type = null;
        }
    }
    tick() {
        super.tick(false);
        let vel_x = this.velocity_x;
        let vel_y = this.velocity_y;
        this.velocity_x += this.controls_x * this.walk_speed;
        if (this.controls_jump && this.on_ground) {
            this.velocity_y += this.jump_speed;
            this.on_ground = false;
        }
        else {
            this.velocity_y -= this.gravity_speed;
        }
        this.collide();
        ticksAlive++;
        this.sendPacket(new VelocityPacket(this.velocity_x - vel_x, this.velocity_y - vel_y));
        this.sendPacket(new PositionPacket(this.x, this.y));
    }
    render() {
        super.render();
        camera.x = Math.round(lerp(camera.x, this.x, 0.075) * 1000) / 1000;
        camera.y = Math.round(lerp(camera.y, this.y, 0.075) * 1000) / 1000;
    }
    renderText() {
        super.renderText();
        if (this.block_type != null) {
            ctx.fillStyle = "#76d";
            ctx.font = "15px monospace";
            ctx.fillText("selected: " + this.block_type, 0, 15);
        }
        if (debugMode) {
            ctx.fillStyle = "#de7";
            ctx.font = "20px monospace";
            ctx.fillText("x: " + this.x, 0, 20);
            ctx.fillText("y: " + this.y, 0, 40);
            ctx.fillText("velocity_x: " + this.velocity_x, 0, 60);
            ctx.fillText("velocity_y: " + this.velocity_y, 0, 80);
            ctx.fillText("camera.x: " + camera.x, 0, 100);
            ctx.fillText("camera.y: " + camera.y, 0, 120);
        }
        if (!chatOpened) {
            ctx.fillStyle = "#22222288";
            ctx.fillRect(5, height - 35, width * 0.4, 30);
            ctx.fillStyle = "#aaaaaa88";
            ctx.font = "15px monospace";
            ctx.fillText("Нажмите T для чата", 15, height - 15);
        }
        else {
            ctx.fillStyle = "#22222288";
            ctx.fillRect(5, height - 35, width - 10, 30);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(5, height - 35);
            ctx.lineTo(width - 5, height - 35);
            ctx.lineTo(width - 5, height - 5);
            ctx.lineTo(5, height - 5);
            ctx.lineTo(5, height - 35);
            ctx.closePath();
            ctx.clip();
            ctx.font = "15px monospace";
            if (chatTyping.length == 0) {
                ctx.fillStyle = "#aaaaaa88";
                ctx.fillText("Напишите сообщение...", 15, height - 15);
            }
            else {
                ctx.fillStyle = "#ffffff";
                let text_width = ctx.measureText(chatTyping).width;
                ctx.fillText(chatTyping, Math.min(10, width - text_width - 10), height - 15);
            }
            ctx.restore();
        }
        if (chatMessages.length > 0) {
            let draw_message = (message) => {
                let lines = wrapText(ctx, message, message_width - 20);
                let height = lines.length * 20 + 5 + 5;
                let top = message_bottom - height;
                ctx.fillStyle = "#22222288";
                ctx.fillRect(5, top, message_width, height);
                let y = 5;
                for (let line of lines) {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(line, 15, top + y + 15);
                    y += 5 + 20;
                }
                message_bottom -= height + 5;
            };
            let message_width = width * 0.4;
            let message_bottom = height - 35 - 5;
            if (chatOpened) {
                chatMessages.forEach(draw_message);
            }
            else {
                draw_message(chatMessages[0]);
            }
        }
    }
}
var player = new MainPlayer();
player.register();
var blocks = [];
const allowed_key_to_send = [
    "KeyR", "KeyW", "KeyE", "KeyQ", "KeyS",
    "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5",
    "Numpad6", "Numpad7", "Numpad8", "Numpad9", "Numpad0",
    "ShiftLeft", "ControlLeft", "Enter",
    "F1", "F2", "KeyZ", "KeyX", "KeyC"
];
function connectServer(address, name) {
    player.closeConnection();
    player.onConnect(name);
    try {
        let conn = new Connection(address, player.onPacket, (e) => {
            player.conn = null;
            setServerError(e == null ? "Connection closed due to error" : e);
            resetWorld();
        });
        conn.send(new JoinPacket(name));
    }
    catch (exception) {
        setServerError(exception);
    }
}
function resetWorld() {
    player.onConnect("unnamed player");
    blocks = [];
    blocks.push(new Block(-1, -1, "#555", true, "normal"));
    blocks.push(new Block(0, -1, "#a67", true, "spawn"));
    blocks.push(new Block(1, -1, "#555", true, "normal"));
}
function getBlock(x, y) {
    let value = blocks.find(o => !(o instanceof Player) && o.x == x && o.y == y);
    if (typeof value === "undefined") {
        return null;
    }
    else {
        return value;
    }
}
function placeBlock(block) {
    blocks.push(block);
}
function removeBlock(x, y) {
    blocks = blocks.filter(o => o instanceof Player || o.x != x || o.y != y);
}
function getPlayer(name) {
    let value = blocks.find(o => o instanceof Player && o.name == name);
    if (typeof value === "undefined") {
        return null;
    }
    else {
        return value;
    }
}
function removePlayer(name) {
    blocks = blocks.filter(o => !(o instanceof Player) || o.name != name);
}
function render() {
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, width, height);
    for (const block of blocks)
        block.render();
    for (const block of blocks)
        block.renderText();
    player.render();
    player.renderText();
}
function tick() {
    for (const block of blocks)
        block.tick();
    player.tick();
}
function renderTick() {
    for (const block of blocks)
        block.renderTick();
    player.renderTick();
}
resetWorld();
