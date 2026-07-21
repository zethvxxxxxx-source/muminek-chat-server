const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

// 1. Tworzymy serwer HTTP serwujący stronę internetową
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Muminek Chat - Admin Panel</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #101014; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #181820; padding: 25px; border-radius: 12px; width: 340px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); border: 1px solid #282838; }
                h2 { margin: 0 0 15px 0; color: #00aaff; font-size: 20px; text-align: center; }
                label { font-size: 12px; color: #aaa; margin-top: 10px; display: block; }
                input { width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #333; background: #222230; color: #fff; box-sizing: border-box; outline: none; }
                input:focus { border-color: #00aaff; }
                button { width: 100%; padding: 12px; margin-top: 18px; border-radius: 6px; border: none; background: #00aaff; color: #fff; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { background: #0088cc; }
                #status { font-size: 11px; margin-top: 15px; text-align: center; color: #888; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>👑 Panel Nadawczy</h2>
                
                <label for="nick">Twoja nazwa / Rola:</label>
                <input type="text" id="nick" value="ADMIN" placeholder="np. ADMIN">

                <label for="msg">Wiadomość do graczy:</label>
                <input type="text" id="msg" placeholder="Wpisz treść..." onkeydown="if(event.key==='Enter') sendMsg()">

                <button onclick="sendMsg()">Wyślij do gry 🚀</button>
                <div id="status">Łączenie z czatem...</div>
            </div>

            <script>
                const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
                const ws = new WebSocket(protocol + '//' + location.host);
                const statusDiv = document.getElementById('status');

                ws.onopen = () => {
                    statusDiv.innerText = "🟢 Połączono z siecią czatu!";
                    statusDiv.style.color = "#50ff78";
                };

                ws.onclose = () => {
                    statusDiv.innerText = "🔴 Rozłączono z siecią.";
                    statusDiv.style.color = "#ff5050";
                };

                function sendMsg() {
                    const nick = document.getElementById('nick').value || 'ADMIN';
                    const text = document.getElementById('msg').value;
                    if (!text.trim()) return;

                    const payload = JSON.stringify({
                        senderName: "👑 " + nick,
                        userId: 1,
                        text: text
                    });

                    ws.send(payload);
                    document.getElementById('msg').value = '';
                }
            </script>
        </body>
        </html>
    `);
});

// 2. Podłączamy serwer WebSocket pod stworzony serwer HTTP
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Nowy klient (gra lub strona WWW) połączył się.');

    ws.on('message', (message) => {
        // Przesyłamy wiadomość do wszystkich innych połączonych klientów
        for (const client of clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Klient rozłączył się.');
    });
});

server.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
