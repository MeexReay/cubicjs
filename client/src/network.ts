class Packet {
    private id: string
    private data: string[]

    constructor(id: string, data: string[]) {
        this.id = id
        this.data = data
    }

    getId(): string { return this.id }
    getData(): string[] { return this.data }

    static fromString(data: string): Packet {
        return new Packet(data[0], data.slice(1).split("\n"))
    }
}

class JoinPacket extends Packet {
    constructor(name: string) {
        super("J", [name])
    }
}

class MessagePacket extends Packet {
    constructor(message: string) {
        super("M", [message])
    }
}

class KeyPacket extends Packet {
    constructor(key: string, pressed: boolean) {
        super("K", [key, pressed ? "1" : "0"])
    }
}

class PlaceBlockPacket extends Packet {
    constructor(x: number, y: number, type: string) {
        super("P", [x.toString(), y.toString(), type])
    }
}

class DestroyBlockPacket extends Packet {
    constructor(x: number, y: number) {
        super("D", [x.toString(), y.toString()])
    }
}

class PositionPacket extends Packet {
    constructor(x: number, y: number) {
        super("X", [x.toString(), y.toString()])
    }
}

class VelocityPacket extends Packet {
    constructor(x: number, y: number) {
        super("V", [x.toString(), y.toString()])
    }
}

class Connection {
    private socket: WebSocket
    private on_packet: (packet: Packet) => void
    private on_close: (error: string | null) => void

    constructor(
        address: string, 
        on_packet: (packet: Packet) => void, 
        on_close: (error: string | null) => void
    ) {
        this.socket = new WebSocket(
            "ws://"+address,
            "cubic",
        )
        this.on_packet = on_packet
        this.on_close = on_close

        this.socket.onmessage = this._on_message
        this.socket.onclose = this._on_close
        this.socket.onerror = this._on_error
    }

    private _on_message(event: MessageEvent) {
        this.on_packet(Packet.fromString(event.data))
    }

    private _on_close(event: CloseEvent) {
        this.on_close(null)
    }

    private _on_error(event: Event) {
        this.on_close(event.toString())
    }

    close() {
        this.socket.close()
    }

    send(packet: Packet) {
        this.socket.send(packet.getId()+packet.getData())
    }
}