class Block {
    public x: number
    public y: number
    public color: string
    public collides: boolean
    public type: string

    constructor(
        x: number,
        y: number,
        color: string,
        collides: boolean,
        type: string,
    ) {
        this.x = x
        this.y = y
        this.color = color
        this.collides = collides
        this.type = type
    }

    render() {
        let rect = this.translate_to_camera()
        if (this.is_need_render(rect)) {
            ctx.fillStyle = this.color
            ctx.fillRect(...rect)
        }
    }

    is_need_render(rect: Rect): boolean {
        return rect[0] + rect[2] > 0 || rect[1] + rect[3] > 0 || rect[0] < width || rect[1] < height
    }

    translate_to_camera(): Rect {
        let size = camera.size * 16

        return [
            this.x * size - size / 2 + (width / 2 - camera.x * size),
            height - (this.y + 1) * size + size / 2 - (height / 2 - camera.y * size),
            size,
            size
        ]
    }

    tick() {

    }

    renderTick() {

    }

    on_collide(player: Player, x: number, y: number) {
        if (x != 0) player.velocity_x = this.x + x - player.x
        if (y != 0) player.velocity_y = this.y + y - player.y
    }

    renderText() {

    }
}

class Player extends Block {
    public velocity_x: number
    public velocity_y: number
    public name: string
    public on_ground: boolean

    constructor(
        x: number,
        y: number,
        name: string,
        color: string,
        velocity_x: number,
        velocity_y: number,
    ) {
        super(x, y, color, true, null)

        this.velocity_x = velocity_x
        this.velocity_y = velocity_y

        this.name = name
    }
    
    reset() {
        this.on_ground = false
    }

    on_collide(player: Player, x: number, y: number) {
        super.on_collide(player, x, y)
        // if (x != 0) {
        //     player.vel_x *= 0.5
        //     this.vel_x = player.vel_x
        // }
        // if (y != 0) {
        //     player.vel_y *= 0.5
        //     this.vel_y = player.vel_y
        // }
    }

    tick(collide=true) {
        this.x = Math.round(this.x * 100) / 100
        this.y = Math.round(this.y * 100) / 100
        this.velocity_x = Math.round(this.velocity_x * 100) / 100
        this.velocity_y = Math.round(this.velocity_y * 100) / 100

        if (collide) this.collide()
    }

    collide() {
        this.on_ground = false

        for (const block of blocks) {
            if (!block.collides) continue

            let collide_x = 0
            let collide_y = 0

            if (this.x > block.x-1 && this.x < block.x+1) {
                if (this.y > block.y && this.y + this.velocity_y - 1 < block.y) {
                    this.on_ground = true
                    collide_y = 1
                }
                if (this.y < block.y && this.y + this.velocity_y > block.y - 1) collide_y = -1
            }

            if (this.y > block.y-1 && this.y < block.y+1) {
                if (this.x > block.x && this.x + this.velocity_x - 1 < block.x) collide_x = 1
                if (this.x < block.x && this.x + this.velocity_x > block.x - 1) collide_x = -1
            }

            block.on_collide(this, collide_x, collide_y)
        }
    }

    renderTick() {
        this.velocity_x *= 0.5
        this.velocity_y *= 0.5
        this.x += this.velocity_x
        this.y += this.velocity_y
    }

    renderText() {
        super.renderText()

        let rect = this.translate_to_camera()

        if (this.is_need_render(rect)) {
            ctx.fillStyle = "#ddd"
            ctx.font = "15px monospace";
            let width = ctx.measureText(this.name).width
            ctx.fillText(this.name,rect[0]+rect[2]/2-width/2, rect[1]-5);
        }
    }

    teleport(x: number, y: number) {
        this.velocity_x = x - this.x
        this.velocity_y = y - this.y
    }

    forceTeleport(x: number, y: number) {
        this.x = x
        this.y = y
        this.velocity_x = 0
        this.velocity_y = 0
    }
}