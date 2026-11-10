
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
let currentRole = "member";

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
const adminButton = document.getElementById("adminButton");

// ======================================
// AFFICHAGE ET AUTHENTIFICATION
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
    authSubmit.textContent = loading
        ? "Patiente..."
        : authMode === "login" ? "Se connecter" : "Créer mon compte";
}

function setAuthMode(mode) {
    authMode = mode;
    const isRegister = mode === "register";

    loginTab.classList.toggle("active", !isRegister);
    registerTab.classList.toggle("active", isRegister);
    usernameGroup.hidden = !isRegister;
    usernameInput.required = isRegister;
    passwordInput.autocomplete = isRegister ? "new-password" : "current-password";
    authSubmit.textContent = isRegister ? "Créer mon compte" : "Se connecter";
    showAuthMessage("");
}

loginTab.addEventListener("click", () => setAuthMode("login"));
registerTab.addEventListener("click", () => setAuthMode("register"));

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
        showAuthMessage("La connexion Supabase n'est pas configurée.", true);
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
                options: { data: { username } }
            });

            if (error) throw error;

            if (data.session) {
                showAuthMessage("Compte créé avec succès !");
            } else {
                showAuthMessage(
                    "Compte créé ! Consulte ta boîte e-mail pour confirmer ton adresse."
                );
            }
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({
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
// PROFIL ET RÔLE
// ======================================

async function loadProfile(user) {
    if (!user) return;

    let username = user.user_metadata?.username || "Membre";

    const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Erreur profil :", profileError.message);
    }

    if (profile?.username) username = profile.username;

    profileName.textContent = username;
    profileAvatar.textContent = username.charAt(0).toUpperCase();
    profileStatus.textContent = "Connecté";

    const { data: roleData, error: roleError } = await supabaseClient
        .from("site_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (roleError) {
        console.error("Erreur rôle :", roleError.message);
        currentRole = "member";
    } else {
        currentRole = roleData?.role || "member";
    }

    adminButton.hidden = currentRole !== "founder";
}

// ======================================
// SESSION
// ======================================

async function handleSession(session) {
    if (!session?.user) {
        currentUser = null;
        currentRole = "member";
        adminButton.hidden = true;
        showAuthScreen();
        return;
    }

    currentUser = session.user;
    showApp();
    await loadProfile(currentUser);
}

async function initialiseAuth() {
    if (!window.supabase?.createClient) {
        showAuthScreen();
        showAuthMessage("Impossible de charger Supabase. Vérifie ta connexion Internet.", true);
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
            Promise.resolve().then(() => handleSession(session));
        });
    } catch (error) {
        console.error(error);
        showAuthScreen();
        showAuthMessage("Impossible de se connecter à Supabase : " + error.message, true);
    }
}

// ======================================
// DÉCONNEXION
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
// MESSAGES PRIVÉS
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
            <p class="muted">Tes conversations avec tes amis apparaîtront ici.</p>
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
// MODE IA (À CONNECTER)
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
            <p class="muted">La connexion à l'intelligence artificielle sera ajoutée dans une prochaine étape.</p>
        </div>
    `;
});

// ======================================
// ADMINISTRATION
// ======================================

function createAdminElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
}

function roleLabel(role) {
    const labels = {
        founder: "Fondateur",
        cofounder: "Cofondateur",
        moderator: "Modérateur",
        member: "Membre"
    };
    return labels[role] || "Membre";
}

async function openAdministration() {
    if (currentRole !== "founder") {
        alert("Accès réservé au Fondateur.");
        return;
    }

    currentMode = "admin";
    pageTitle.textContent = "⚙ Administration";
    messageForm.hidden = true;
    messages.innerHTML = "";

    const heading = createAdminElement("h1", "admin-heading", "Administration");
    const description = createAdminElement(
        "p", "muted",
        "Gestion des membres et des rôles de Fractale Esport."
    );
    const status = createAdminElement("p", "admin-status", "Chargement des membres...");
    const list = createAdminElement("div", "admin-list");

    messages.append(heading, description, status, list);

    const { data, error } = await supabaseClient.rpc("get_site_members");

    if (error) {
        status.textContent = "Impossible de charger les membres : " + error.message;
        status.classList.add("error");
        return;
    }

    status.textContent = `${data.length} membre(s) trouvé(s).`;

    if (!data.length) {
        list.appendChild(createAdminElement("p", "muted", "Aucun membre trouvé."));
        return;
    }

    data.forEach(member => {
        const card = createAdminElement("div", "admin-member");
        const info = createAdminElement("div", "admin-member-info");
        const name = createAdminElement("strong", "", member.username || "Membre");
        const role = createAdminElement("span", "admin-role", roleLabel(member.role));

        info.append(name, role);

        if (member.role_created_at) {
            const date = new Date(member.role_created_at);
            const dateText = createAdminElement(
                "small",
                "admin-date",
                "Rôle attribué le " + date.toLocaleDateString("fr-FR")
            );
            info.appendChild(dateText);
        }

        card.appendChild(info);

        if (member.role !== "founder" && member.user_id !== currentUser.id) {
            const select = document.createElement("select");
            select.className = "role-select";
            select.setAttribute("aria-label", "Modifier le rôle de " + (member.username || "ce membre"));

            const options = [
                ["member", "Membre"],
                ["moderator", "Modérateur"],
                ["cofounder", "Cofondateur"]
            ];

            options.forEach(([value, label]) => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = label;
                option.selected = value === member.role;
                select.appendChild(option);
            });

            const saveButton = createAdminElement("button", "role-save", "Enregistrer");

            saveButton.addEventListener("click", async () => {
                saveButton.disabled = true;
                saveButton.textContent = "Enregistrement...";

                const { error: updateError } = await supabaseClient.rpc(
                    "set_site_role",
                    {
                        target_user: member.user_id,
                        new_role: select.value
                    }
                );

                if (updateError) {
                    alert("Erreur : " + updateError.message);
                    saveButton.disabled = false;
                    saveButton.textContent = "Enregistrer";
                    return;
                }

                alert("Rôle de " + (member.username || "ce membre") + " mis à jour.");
                await openAdministration();
            });

            card.append(select, saveButton);
        } else if (member.role === "founder") {
            card.appendChild(createAdminElement("span", "protected-role", "Compte protégé"));
        }

        list.appendChild(card);
    });
}

adminButton.addEventListener("click", openAdministration);

// ======================================
// LANCEMENT
// ======================================

initialiseAuth();
