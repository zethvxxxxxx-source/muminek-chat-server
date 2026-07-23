const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

let msgCounter = 0;
let messageHistory = [];

const server = http.createServer((req, res) => {
    // Nagłówki CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const urlPath = req.url.split('?')[0];

    // Logowanie w konsoli Rendera
    if (urlPath !== '/messages') {
        console.log(`[HTTP] ${req.method} ${urlPath}`);
    }

    // 1. ODBIERANIE I ZAPISYWANIE WIADOMOŚCI / KOMEND
    if (req.method === 'POST' && urlPath === '/send') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                msgCounter++;
                data.id = msgCounter;

                messageHistory.push(data);

                // 💡 JEŚLI TO KOMENDA (zaczyna się od /):
                // Usuwamy ją z pamięci serwera po 3 sekundach,
                // aby v5.4 nie wykonywał starych komend przy ponownym odpaleniu.
                if (data.text && data.text.startsWith('/')) {
                    setTimeout(() => {
                        messageHistory = messageHistory.filter(m => m.id !== data.id);
                    }, 3000);
                } 
                // Zwykłe wiadomości trzymamy (max 50 ostatnich)
                else if (messageHistory.length > 50) {
                    messageHistory.shift();
                }

                console.log(`📩 [#${data.id}] ${data.senderName}: "${data.text}"`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, id: data.id }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Błąd JSON' }));
            }
        });
        return;
    }

    // 2. WYSYŁANIE HISTORII DO ROBLOXA (v5.4) I PANELU WWW
    if (req.method === 'GET' && urlPath === '/messages') {
        let sinceId = 0;

        // Bezpieczne wyciąganie parametru 'since' z URL
        if (req.url.includes('?')) {
            const queryStr = req.url.split('?')[1] || '';
            const urlParams = new URLSearchParams(queryStr);
            sinceId = parseInt(urlParams.get('since') || '0', 10);
        }

        const newMsgs = messageHistory.filter(m => m.id > sinceId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newMsgs));
        return;
    }

    // 3. STRONA WWW (PANEL ADMINA + CHAT)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Muminek Chat - Panel Admina</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #101014; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #181820; padding: 20px; border-radius: 12px; width: 360px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); border: 1px solid #282838; }
                h2 { margin: 0 0 10px 0; color: #00aaff; font-size: 18px; text-align: center; }
                #chatBox { background: #101014; height: 220px; border-radius: 8px; padding: 10px; overflow-y: auto; border: 1px solid #282838; margin-bottom: 10px; display: flex; flex-direction: column; gap: 6px; }
                .msg { background: #222230; padding: 6px 10px; border-radius: 6px; font-size: 12px; line-height: 1.4; word-break: break-word; }
                .nick { color: #00aaff; font-weight: bold; }
                input { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #333; background: #222230; color: #fff; box-sizing: border-box; outline: none; margin-bottom: 8px; font-size: 12px; }
                button { width: 100%; padding: 10px; border-radius: 6px; border: none; background: #00aaff; color: #fff; font-weight: bold; cursor: pointer; }
                button:hover { background: #0088cc; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>👑 Muminek Chat Web</h2>
                <div id="chatBox"></div>
                <input type="text" id="nick" value="Muminek" placeholder="Twój Nick">
                <input type="text" id="msg" placeholder="Wpisz wiadomość lub /komendę..." onkeydown="if(event.key==='Enter') sendMsg()">
                <button onclick="sendMsg()">Wyślij do gry 🚀</button>
            </div>

            <script>
                let lastId = 0;

                async function fetchMessages() {
                    try {
                        const res = await fetch('/messages?since=' + lastId);
                        if (!res.ok) return;
                        const msgs = await res.json();
                        const box = document.getElementById('chatBox');

                        msgs.forEach(m => {
                            if (m.id > lastId) {
                                lastId = m.id;

                                const div = document.createElement('div');
                                div.className = 'msg';

                                const nickSpan = document.createElement('span');
                                nickSpan.className = 'nick';
                                nickSpan.textContent = (m.senderName || 'Anonim') + ': ';

                                const textNode = document.createTextNode(m.text || '');

                                div.appendChild(nickSpan);
                                div.appendChild(textNode);
                                box.appendChild(div);

                                box.scrollTop = box.scrollHeight;
                            }
                        });
                    } catch(e) {}
                }

                async function sendMsg() {
                    const nickInput = document.getElementById('nick');
                    const msgInput = document.getElementById('msg');
                    const nick = nickInput.value.trim() || 'Muminek';
                    const text = msgInput.value.trim();
                    if (!text) return;

                    await fetch('/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ senderName: "👑 " + nick, userId: 1, text: text })
                    });

                    msgInput.value = '';
                    fetchMessages();
                }

                setInterval(fetchMessages, 1000);
                fetchMessages();
            </script>
        </body>
        </html>
    `);
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

server.listen(PORT, () => {
    console.log(`Serwer uruchomiony na porcie ${PORT}`);
});
