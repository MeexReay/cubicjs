interface Packet {
    getId(): string
    getData(): string
}

function createPacket(id: string, ...params: string[]): Packet {
    return {
        getId: () => id,
        getData: () => params.join("\n"),
    } 
}

function fromPacket(data: string): Packet {
    return createPacket(data[0], ...data.slice(1).split("\n"))
}

class Connection {
    private socket: WebSocket
    private on_packet: (packet: Packet) => {}
    private on_close: (error: string | null) => {}

    constructor(
        socket: WebSocket, 
        on_packet: (packet: Packet) => {}, 
        on_close: (error: string | null) => {}
    ) {
        this.socket = socket
        this.on_packet = on_packet
        this.on_close = on_close

        this.socket.onmessage = this._on_message
        this.socket.onclose = this._on_close
        this.socket.onerror = this._on_error
    }

    private _on_message(event: MessageEvent) {
        this.on_packet(fromPacket(event.data))
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