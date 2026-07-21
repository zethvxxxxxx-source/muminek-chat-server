const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Nowy gracz połączył się z czatem.');

    ws.on('message', (message) => {
        for (const client of clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Gracz rozłączył się.');
    });
});

console.log(`Serwer WebSocket działa na porcie ${PORT}`);
