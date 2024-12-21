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
