window.ChatWidget = (function () {
    let chatRef = null;
    let messagesQuery = null;
    let player = null;

    function escapeHtml(str) {
        return String(str)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function renderTemplate(root) {
        root.innerHTML = `
            <div class="chat-box">
                <div id="chat-msgs" class="chat-msgs"></div>
                <div class="chat-in-row">
                    <input type="text" id="chat-in" placeholder="Сообщение...">
                    <button class="send-btn" id="chat-send-btn">></button>
                </div>
            </div>
        `;
    }

    function addSystemMessage(box, text) {
        const div = document.createElement('div');
        div.className = 'sys-msg';
        div.textContent = text;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }

    function renderMessages(snapshot, box) {
        box.innerHTML = "";

        if (!snapshot.exists()) {
            addSystemMessage(box, "Чат пуст. Напиши первое сообщение.");
            return;
        }

        snapshot.forEach(function (childSnap) {
            const m = childSnap.val() || {};
            const div = document.createElement('div');
            div.className = 'msg';

            div.innerHTML =
                "<b>" + escapeHtml(m.user || "Игрок") + ":</b> " +
                escapeHtml(m.text || "");

            box.appendChild(div);
        });

        box.scrollTop = box.scrollHeight;
    }

    function sendMessage(input, box) {
        const text = input.value.trim();

        if (!text) return;

        if (!chatRef) {
            addSystemMessage(box, "Чат еще не подключился.");
            return;
        }

        if (!player || !player.name) {
            addSystemMessage(box, "Не найдено имя игрока.");
            return;
        }

        chatRef.push(
            {
                user: player.name,
                text: text,
                timestamp: Date.now()
            },
            function (error) {
                if (error) {
                    console.error("Ошибка отправки:", error);
                    addSystemMessage(box, "Не удалось отправить сообщение.");
                    return;
                }

                input.value = "";
            }
        );
    }

    function init(options) {
        const root = document.getElementById(options.rootId);
        if (!root) {
            console.error("ChatWidget: контейнер не найден:", options.rootId);
            return;
        }

        if (typeof firebase === 'undefined') {
            root.innerHTML = '<div class="chat-box"><div class="sys-msg">Firebase SDK не загружен.</div></div>';
            return;
        }

        player = options.player || { name: "Шиноби" };

        renderTemplate(root);

        const box = root.querySelector('#chat-msgs');
        const input = root.querySelector('#chat-in');
        const btn = root.querySelector('#chat-send-btn');

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(options.firebaseConfig);
            }

            const db = firebase.database();
            chatRef = db.ref(options.path || 'messages');
            messagesQuery = chatRef.orderByChild('timestamp').limitToLast(20);

            messagesQuery.on(
                'value',
                function (snapshot) {
                    renderMessages(snapshot, box);
                },
                function (error) {
                    console.error("Ошибка чтения:", error);
                    addSystemMessage(box, "Ошибка чтения чата. Проверь Firebase Rules и databaseURL.");
                }
            );
        } catch (e) {
            console.error("Ошибка инициализации чата:", e);
            addSystemMessage(box, "Ошибка запуска чата.");
        }

        btn.addEventListener('click', function () {
            sendMessage(input, box);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage(input, box);
            }
        });
    }

    return {
        init: init
    };
})();