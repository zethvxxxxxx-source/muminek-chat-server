const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

let msgCounter = 0;
let messageHistory = [];

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // WYSYŁANIE WIADOMOŚCI
    if (req.method === 'POST' && req.url === '/send') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                msgCounter++;
                data.id = msgCounter; // Każda wiadomość dostaje swój numer ID
                
                messageHistory.push(data);
                if (messageHistory.length > 50) messageHistory.shift();

                broadcastToWS(data);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, id: data.id }));
            } catch (e) {
                res.writeHead(400);
                res.end('Błąd JSON');
            }
        });
        return;
    }

    // POBIERANIE WIADOMOŚCI DLA ROBLOXA
    if (req.method === 'GET' && req.url.startsWith('/messages')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const sinceId = parseInt(urlParams.get('since') || '0');
        
        // Zwracamy tylko wiadomości o numerze wyższym niż ostatnio pobrane
        const newMsgs = messageHistory.filter(m => m.id > sinceId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newMsgs));
        return;
    }

    // STRONA WWW (PANEL NADAMICZY)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Muminek Chat - Admin Panel</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #101014; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #181820; padding: 25px; border-radius: 12px; width: 340px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); border: 1px solid #282838; }
                h2 { margin: 0 0 15px 0; color: #00aaff; font-size: 20px; text-align: center; }
                label { font-size: 12px; color: #aaa; margin-top: 10px; display: block; }
                input { width: 100%; padding: 10px; margin-top: 5px; border-radius: 6px; border: 1px solid #333; background: #222230; color: #fff; box-sizing: border-box; outline: none; }
                button { width: 100%; padding: 12px; margin-top: 18px; border-radius: 6px; border: none; background: #00aaff; color: #fff; font-weight: bold; cursor: pointer; }
                #status { font-size: 11px; margin-top: 15px; text-align: center; color: #50ff78; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>👑 Panel Nadawczy</h2>
                <label>Twoja nazwa / Rola:</label>
                <input type="text" id="nick" value="Muminek" placeholder="np. ADMIN">

                <label>Wiadomość do graczy:</label>
                <input type="text" id="msg" placeholder="Wpisz treść..." onkeydown="if(event.key==='Enter') sendMsg()">

                <button onclick="sendMsg()">Wyślij do gry 🚀</button>
                <div id="status">🟢 Serwer HTTP gotowy!</div>
            </div>

            <script>
                function sendMsg() {
                    const nick = document.getElementById('nick').value || 'Muminek';
                    const text = document.getElementById('msg').value;
                    if (!text.trim()) return;

                    fetch('/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ senderName: "👑 " + nick, userId: 1, text: text })
                    });

                    document.getElementById('msg').value = '';
                }
            </script>
        </body>
        </html>
    `);
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

function broadcastToWS(data) {
    const msg = JSON.stringify(data);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}

wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
});

server.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
