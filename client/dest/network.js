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
