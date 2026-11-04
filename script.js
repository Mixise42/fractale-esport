
const messages = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const pageTitle = document.getElementById("pageTitle");

const serverMode = document.getElementById("serverMode");
const dmMode = document.getElementById("dmMode");
const serverPanel = document.getElementById("serverPanel");
const dmPanel = document.getElementById("dmPanel");
const aiMode = document.getElementById("aiMode");

let currentChannel = "annonces";
let currentMode = "server";

function showWelcome() {
    messages.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">F</div>
            <h1>Bienvenue sur Fractale Esport</h1>
            <p>Une structure, une passion, un objectif.</p>
            <p class="muted">Sélectionne un salon pour commencer à discuter.</p>
        </div>
    `;
}

function selectChannel(button) {
    document.querySelectorAll(".channel").forEach(channel => {
        channel.classList.remove("active");
    });

    button.classList.add("active");
    currentChannel = button.dataset.channel;
    currentMode = "server";

    pageTitle.textContent = "# " + currentChannel;
    showWelcome();
}

document.querySelectorAll(".channel").forEach(button => {
    button.addEventListener("click", () => selectChannel(button));
});

serverMode.addEventListener("click", () => {
    currentMode = "server";
    serverPanel.hidden = false;
    dmPanel.hidden = true;

    serverMode.classList.add("selected");
    dmMode.classList.remove("selected");

    pageTitle.textContent = "# " + currentChannel;
    showWelcome();
});

dmMode.addEventListener("click", () => {
    currentMode = "dm";
    serverPanel.hidden = true;
    dmPanel.hidden = false;

    dmMode.classList.add("selected");
    serverMode.classList.remove("selected");

    pageTitle.textContent = "Messages privés";
    messages.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">✉</div>
            <h1>Messages privés</h1>
            <p class="muted">Tes conversations avec tes amis apparaîtront ici.</p>
        </div>
    `;
});

messageForm.addEventListener("submit", event => {
    event.preventDefault();

    const content = messageInput.value.trim();

    if (!content) return;

    const message = document.createElement("div");
    message.className = "message";

    const author = document.createElement("strong");
    author.textContent = "Moi";

    const text = document.createElement("p");
    text.textContent = content;

    message.append(author, text);
    messages.appendChild(message);

    messageInput.value = "";
    messages.scrollTop = messages.scrollHeight;
});

aiMode.addEventListener("click", () => {
    currentMode = "ai";
    pageTitle.textContent = "✦ Mode IA";

    messages.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">✦</div>
            <h1>Assistant Fractale</h1>
            <p>Bienvenue dans ton espace IA.</p>
            <p class="muted">La connexion à l'intelligence artificielle sera ajoutée plus tard.</p>
        </div>
    `;
});
