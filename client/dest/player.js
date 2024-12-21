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
