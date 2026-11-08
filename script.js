// ======================================
// CONFIGURATION SUPABASE
// ======================================

const SUPABASE_URL = "https://hyqmkilzbuouventplui.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZVP0vVJvaM4n9mbgmKh4uQ_-VlGVU35";

let supabaseClient = null;
let currentUser = null;
let currentChannel = "annonces";
let currentMode = "server";
let authMode = "login";

// ======================================
// ELEMENTS HTML
// ======================================

const authScreen = document.getElementById("authScreen");
const app = document.getElementById("app");

const authForm = document.getElementById("authForm");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const authSubmit = document.getElementById("authSubmit");
const authMessage = document.getElementById("authMessage");

const usernameGroup = document.getElementById("usernameGroup");
const usernameInput = document.getElementById("usernameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

const profileName = document.getElementById("profileName");
const profileStatus = document.getElementById("profileStatus");
const profileAvatar = document.getElementById("profileAvatar");
const logoutButton = document.getElementById("logoutButton");

const messages = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const pageTitle = document.getElementById("pageTitle");

const serverMode = document.getElementById("serverMode");
const dmMode = document.getElementById("dmMode");
const serverPanel = document.getElementById("serverPanel");
const dmPanel = document.getElementById("dmPanel");
const aiMode = document.getElementById("aiMode");

// ======================================
// INITIALISATION
// ======================================

function showAuthMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.classList.toggle("error", isError);
}

function showAuthScreen() {
    authScreen.hidden = false;
    app.hidden = true;
}

function showApp() {
    authScreen.hidden = true;
    app.hidden = false;
}

function setLoading(loading) {
    authSubmit.disabled = loading;

    if (loading) {
        authSubmit.textContent = "Patiente...";
    } else {
        authSubmit.textContent =
            authMode === "login" ? "Se connecter" : "Créer mon compte";
    }
}

// ======================================
// CONNEXION / INSCRIPTION
// ======================================

function setAuthMode(mode) {
    authMode = mode;

    const isRegister = mode === "register";

    loginTab.classList.toggle("active", !isRegister);
    registerTab.classList.toggle("active", isRegister);

    usernameGroup.hidden = !isRegister;
    usernameInput.required = isRegister;

    passwordInput.autocomplete = isRegister
        ? "new-password"
        : "current-password";

    authSubmit.textContent = isRegister
        ? "Créer mon compte"
        : "Se connecter";

    showAuthMessage("");
}

loginTab.addEventListener("click", () => {
    setAuthMode("login");
});

registerTab.addEventListener("click", () => {
    setAuthMode("register");
});

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
        showAuthMessage(
            "La connexion Supabase n'est pas configurée. Vérifie les deux constantes dans script.js.",
            true
        );
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput.value.trim();

    if (authMode === "register" && username.length < 3) {
        showAuthMessage("Ton pseudo doit contenir au moins 3 caractères.", true);
        return;
    }

    setLoading(true);
    showAuthMessage("");

    try {
        if (authMode === "register") {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username
                    }
                }
            });

            if (error) throw error;

            if (data.session) {
                showAuthMessage("Compte créé avec succès !");
            } else {
                showAuthMessage(
                    "Compte créé ! Consulte ta boîte e-mail pour confirmer ton adresse avant de te connecter."
                );
            }

        } else {
            const { error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;
        }

    } catch (error) {
        showAuthMessage(error.message || "Une erreur est survenue.", true);
    } finally {
        setLoading(false);
    }
});

// ======================================
// PROFIL DU MEMBRE
// ======================================

async function loadProfile(user) {
    if (!user) return;

    let username = user.user_metadata?.username || "Membre";

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Erreur de chargement du profil :", error.message);
    }

    if (data?.username) {
        username = data.username;
    }

    profileName.textContent = username;
    profileAvatar.textContent = username.charAt(0).toUpperCase();
    profileStatus.textContent = "Connecté";
}

// ======================================
// GESTION DE LA SESSION
// ======================================

async function handleSession(session) {
    if (!session || !session.user) {
        currentUser = null;
        showAuthScreen();
        return;
    }

    currentUser = session.user;
    showApp();
    await loadProfile(currentUser);
}

async function initialiseAuth() {
    if (
        SUPABASE_URL.includes("COLLE_ICI") ||
        SUPABASE_PUBLISHABLE_KEY.includes("COLLE_ICI")
    ) {
        showAuthScreen();
        showAuthMessage(
            "Ajoute ton Project URL et ta clé Publishable dans script.js.",
            true
        );
        return;
    }

    if (!window.supabase || !window.supabase.createClient) {
        showAuthScreen();
        showAuthMessage(
            "Impossible de charger Supabase. Vérifie ta connexion Internet.",
            true
        );
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );

        const { data, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        await handleSession(data.session);

        supabaseClient.auth.onAuthStateChange((event, session) => {
            // On laisse le rappel d'authentification se terminer
            // avant de charger le profil.
            Promise.resolve().then(() => handleSession(session));
        });

    } catch (error) {
        console.error(error);
        showAuthScreen();
        showAuthMessage(
            "Impossible de se connecter à Supabase : " + error.message,
            true
        );
    }
}

// ======================================
// DECONNEXION
// ======================================

logoutButton.addEventListener("click", async () => {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Erreur lors de la déconnexion : " + error.message);
    }
});

// ======================================
// SALONS
// ======================================

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

    messageForm.hidden = false;
    messageInput.placeholder = "Écrire un message...";

    showWelcome();
}

document.querySelectorAll(".channel").forEach(button => {
    button.addEventListener("click", () => selectChannel(button));
});

// ======================================
// MODE SERVEUR
// ======================================

serverMode.addEventListener("click", () => {
    currentMode = "server";

    serverPanel.hidden = false;
    dmPanel.hidden = true;

    serverMode.classList.add("selected");
    dmMode.classList.remove("selected");

    pageTitle.textContent = "# " + currentChannel;

    messageForm.hidden = false;
    messageInput.placeholder = "Écrire un message...";

    showWelcome();
});

// ======================================
// MESSAGES PRIVES
// ======================================

dmMode.addEventListener("click", () => {
    currentMode = "dm";

    serverPanel.hidden = true;
    dmPanel.hidden = false;

    dmMode.classList.add("selected");
    serverMode.classList.remove("selected");

    pageTitle.textContent = "Messages privés";

    messageForm.hidden = true;

    messages.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">✉</div>
            <h1>Messages privés</h1>
            <p class="muted">
                Tes conversations avec tes amis apparaîtront ici.
            </p>
        </div>
    `;
});

// ======================================
// ENVOI DE MESSAGES TEMPORAIRES
// ======================================

messageForm.addEventListener("submit", event => {
    event.preventDefault();

    if (!currentUser || currentMode !== "server") return;

    const content = messageInput.value.trim();

    if (!content) return;

    const message = document.createElement("div");
    message.className = "message";

    const author = document.createElement("strong");
    author.textContent = profileName.textContent;

    const text = document.createElement("p");
    text.textContent = content;

    message.append(author, text);
    messages.appendChild(message);

    messageInput.value = "";
    messages.scrollTop = messages.scrollHeight;
});

// ======================================
// MODE IA (EN ATTENTE DE CONNEXION)
// ======================================

aiMode.addEventListener("click", () => {
    currentMode = "ai";

    pageTitle.textContent = "✦ Mode IA";
    messageForm.hidden = true;

    messages.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">✦</div>
            <h1>Assistant Fractale</h1>
            <p>Bienvenue dans ton espace IA.</p>
            <p class="muted">
                La connexion à l'intelligence artificielle sera ajoutée dans une prochaine étape.
            </p>
        </div>
    `;
});

// ======================================
// LANCEMENT
// ======================================

initialiseAuth();
