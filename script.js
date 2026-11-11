
// ======================================
// CONFIGURATION SUPABASE
// ======================================

const SUPABASE_URL = "https://hyqmkilzbuouventplui.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ZVP0vVJvaM4n9mbgmKh4uQ_-VlGVU35";

let supabaseClient = null;
let currentUser = null;
let currentRole = "member";
let currentRank = null;
let currentChannel = "reglement";
let currentMode = "server";
let authMode = "login";
let selectedTicket = null;
let aiHistory = [];

// ======================================
// ELEMENTS HTML
// ======================================

const $ = id => document.getElementById(id);

const authScreen = $("authScreen");
const app = $("app");
const authForm = $("authForm");
const loginTab = $("loginTab");
const registerTab = $("registerTab");
const authSubmit = $("authSubmit");
const authMessage = $("authMessage");
const usernameGroup = $("usernameGroup");
const usernameInput = $("usernameInput");
const emailInput = $("emailInput");
const passwordInput = $("passwordInput");

const profileName = $("profileName");
const profileStatus = $("profileStatus");
const profileAvatar = $("profileAvatar");
const logoutButton = $("logoutButton");

const messages = $("messages");
const messageForm = $("messageForm");
const messageInput = $("messageInput");
const pageTitle = $("pageTitle");

const serverMode = $("serverMode");
const dmMode = $("dmMode");
const serverPanel = $("serverPanel");
const dmPanel = $("dmPanel");
const aiMode = $("aiMode");
const adminButton = $("adminButton");
const ticketsButton = $("ticketsButton");
const rankCategories = $("rankCategories");

// ======================================
// VISIBILITÉ DU BOUTON ADMINISTRATION
// ======================================

function updateAdminVisibility() {
    if (!adminButton) return;

    adminButton.hidden =
        currentRole !== "founder" ||
        !["server", "admin"].includes(currentMode);
}

// ======================================
// CATÉGORIES DE RANG
// ======================================

const rankLabels = {
    "moins-de-diamant": "Moins de diamant",
    "diamant": "Diamant",
    "champion": "Champion",
    "grand-champion": "Grand Champion",
    "ssl": "SSL"
};

const rankOrder = [
    "moins-de-diamant",
    "diamant",
    "champion",
    "grand-champion",
    "ssl"
];

// ======================================
// AUTHENTIFICATION
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

    passwordInput.autocomplete = isRegister
        ? "new-password"
        : "current-password";

    authSubmit.textContent = isRegister
        ? "Créer mon compte"
        : "Se connecter";

    showAuthMessage("");
}

loginTab.addEventListener("click", () => setAuthMode("login"));
registerTab.addEventListener("click", () => setAuthMode("register"));

authForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!supabaseClient) {
        showAuthMessage(
            "La connexion Supabase n'est pas configurée.",
            true
        );
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput.value.trim();

    if (authMode === "register" && username.length < 3) {
        showAuthMessage(
            "Ton pseudo doit contenir au moins 3 caractères.",
            true
        );
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
                    data: { username }
                }
            });

            if (error) throw error;

            showAuthMessage(
                data.session
                    ? "Compte créé avec succès !"
                    : "Compte créé ! Consulte ta boîte e-mail pour confirmer ton adresse."
            );
        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
        }
    } catch (error) {
        showAuthMessage(
            error.message || "Une erreur est survenue.",
            true
        );
    } finally {
        setLoading(false);
    }
});

// ======================================
// PROFIL, RÔLE ET RANG
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

    if (profile?.username) {
        username = profile.username;
    }

    profileName.textContent = username;
    profileAvatar.textContent = username.charAt(0).toUpperCase();
    profileStatus.textContent = "Connecté";

    const { data: roleData, error: roleError } = await supabaseClient
        .from("site_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    currentRole = roleError
        ? "member"
        : (roleData?.role || "member");

    const staff = [
        "founder",
        "cofounder",
        "moderator"
    ].includes(currentRole);

    updateAdminVisibility();

    const staffCategory = $("staffCategory");

    if (staffCategory) {
        staffCategory.hidden = !staff;
    }

    const { data: rankData, error: rankError } = await supabaseClient
        .from("member_rank_roles")
        .select("rank_category")
        .eq("user_id", user.id)
        .maybeSingle();

    if (rankError) {
        console.error(
            "Erreur chargement rang :",
            rankError.message
        );

        currentRank = null;
    } else {
        currentRank = rankData?.rank_category || null;
    }

    renderRankCategories();
}

// ======================================
// CATÉGORIES DE RANG
// ======================================

function renderRankCategories() {
    rankCategories.innerHTML = "";

    if (!currentRank || !rankLabels[currentRank]) {
        const info = document.createElement("p");

        info.className = "muted rank-loading";
        info.textContent =
            "Aucune catégorie de rang ne t'a encore été attribuée.";

        rankCategories.appendChild(info);
        return;
    }

    const category = document.createElement("div");
    category.className = "category rank-category";

    const toggle = document.createElement("button");
    toggle.className = "category-toggle";

    toggle.innerHTML = `
        <span>${rankLabels[currentRank]}</span>
        <span>⌄</span>
    `;

    toggle.setAttribute("aria-expanded", "true");

    const content = document.createElement("div");
    content.className = "category-content";

    const rankChannels = [
        {
            name: "💬 Général",
            slug: "general"
        },
        {
            name: "📊 RL Tracker",
            slug: "rl-tracker"
        }
    ];

    rankChannels.forEach(item => {
        const button = document.createElement("button");

        button.className = "channel";
        button.textContent = item.name;
        button.dataset.channel =
            `rank-${currentRank}-${item.slug}`;

        button.addEventListener("click", () => {
            selectChannel(button);
        });

        content.appendChild(button);
    });

    toggle.addEventListener("click", () => {
        const collapsed = category.classList.toggle("collapsed");

        toggle.setAttribute(
            "aria-expanded",
            String(!collapsed)
        );
    });

    category.append(toggle, content);
    rankCategories.appendChild(category);
}

// ======================================
// SESSION
// ======================================

async function handleSession(session) {
    if (!session?.user) {
        currentUser = null;
        currentRole = "member";
        currentRank = null;
        currentMode = "server";

        function updateAdminVisibility() {
    if (!adminButton) return;

    const staff = [
        "founder",
        "cofounder",
        "moderator"
    ].includes(currentRole);

    adminButton.hidden =
        !staff ||
        !["server", "admin"].includes(currentMode);
}

        $("staffCategory").hidden = true;

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

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        await handleSession(data.session);

        supabaseClient.auth.onAuthStateChange(
            (event, session) => {
                Promise.resolve().then(() => {
                    handleSession(session);
                });
            }
        );
    } catch (error) {
        console.error(error);

        showAuthScreen();

        showAuthMessage(
            "Impossible de se connecter à Supabase : " +
            error.message,
            true
        );
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
// CATÉGORIES REPLIABLES
// ======================================

document.querySelectorAll(".category-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const category = button.closest(".category");

        const collapsed = category.classList.toggle("collapsed");

        button.setAttribute(
            "aria-expanded",
            String(!collapsed)
        );
    });
});

// ======================================
// SALONS
// ======================================

function showWelcome(title = "Bienvenue sur Fractale Esport") {
    messages.innerHTML = "";

    const welcome = document.createElement("div");
    welcome.className = "welcome";

    const icon = document.createElement("div");
    icon.className = "welcome-icon";
    icon.textContent = "F";

    const heading = document.createElement("h1");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent =
        "Une structure, une passion, un objectif.";

    const note = document.createElement("p");
    note.className = "muted";

    note.textContent =
        "La sauvegarde des messages de salons sera ajoutée dans une prochaine étape.";

    welcome.append(icon, heading, description, note);

    messages.appendChild(welcome);
}

function selectChannel(button) {
    if (button.dataset.channel.startsWith("rank-")) {
        const rankFromChannel = button.dataset.channel
            .split("-")
            .slice(1, -1)
            .join("-");

        if (rankFromChannel !== currentRank) {
            alert("Cette catégorie ne correspond pas à ton rang.");
            return;
        }
    }

    document.querySelectorAll(".channel").forEach(channel => {
        channel.classList.remove("active");
    });

    button.classList.add("active");

    currentChannel = button.dataset.channel;
    currentMode = "server";

    updateAdminVisibility();

    serverPanel.hidden = false;
    dmPanel.hidden = true;

    serverMode.classList.add("selected");
    dmMode.classList.remove("selected");

    ticketsButton.classList.remove("selected");

    pageTitle.textContent = button.textContent.trim();

    messageForm.hidden = false;
    messageInput.placeholder = "Écrire un message...";

    showWelcome("Salon " + button.textContent.trim());
}

document.querySelectorAll("#serverPanel .channel").forEach(button => {
    button.addEventListener("click", () => {
        selectChannel(button);
    });
});

// ======================================
// MODE SERVEUR / MESSAGES PRIVÉS
// ======================================

serverMode.addEventListener("click", () => {
    currentMode = "server";

    updateAdminVisibility();

    serverPanel.hidden = false;
    dmPanel.hidden = true;

    serverMode.classList.add("selected");
    dmMode.classList.remove("selected");

    ticketsButton.classList.remove("selected");

    pageTitle.textContent = "# " + currentChannel;

    messageForm.hidden = false;

    showWelcome();
});

dmMode.addEventListener("click", () => {
    currentMode = "dm";

    updateAdminVisibility();

    serverPanel.hidden = true;
    dmPanel.hidden = false;

    dmMode.classList.add("selected");
    serverMode.classList.remove("selected");

    ticketsButton.classList.remove("selected");

    pageTitle.textContent = "Messages privés";

    messageForm.hidden = true;

    showWelcome("Messages privés");
});

// ======================================
// MESSAGES DE SALONS (TEMPORAIRES)
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
 // MODE IA - ASSISTANT FRACTALE GRATUIT
 // ======================================

function normalizeAIText(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function addAIMessage(container, role, content) {
    const message = document.createElement("div");
    message.className = `ai-message ${role}`;

    const author = document.createElement("strong");
    author.textContent = role === "user"
        ? profileName.textContent
        : "✦ Assistant Fractale";

    const text = document.createElement("p");
    text.textContent = content;

    message.append(author, text);
    container.appendChild(message);

    return message;
}

// Recherche dans la base de connaissances
async function searchAIKnowledge(question) {
    const { data, error } = await supabaseClient
        .from("ai_knowledge")
        .select("id, question, answer, keywords, category")
        .limit(200);

    if (error) {
        console.error("Erreur base IA :", error);
        throw error;
    }

    const normalizedQuestion = normalizeAIText(question);
    const words = normalizedQuestion
        .split(" ")
        .filter(word => word.length >= 3);

    if (!words.length) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const item of data || []) {
        const storedQuestion = normalizeAIText(item.question);
        const storedAnswer = normalizeAIText(item.answer);
        const keywords = (item.keywords || [])
            .map(normalizeAIText);

        let score = 0;

        for (const word of words) {
            if (keywords.some(keyword =>
                keyword === word ||
                keyword.includes(word) ||
                word.includes(keyword)
            )) {
                score += 3;
            }

            if (storedQuestion.includes(word)) {
                score += 2;
            }

            if (storedAnswer.includes(word)) {
                score += 0.5;
            }
        }

        // Une correspondance exacte est prioritaire
        if (normalizedQuestion === storedQuestion) {
            score += 20;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
        }
    }

    // Évite de donner une réponse trop éloignée
    if (bestScore < 4) {
        return null;
    }

    return bestMatch;
}

// Affichage du chat
function renderAIAssistant() {
    messages.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "ai-panel";

    const heading = document.createElement("div");
    heading.className = "ai-heading";

    const title = document.createElement("h1");
    title.textContent = "✦ Assistant Fractale";

    const description = document.createElement("p");
    description.textContent =
        "Un assistant qui enrichit ses connaissances grâce à Fractale Esport.";

    heading.append(title, description);

    const chat = document.createElement("div");
    chat.className = "ai-chat";

    aiHistory.forEach(item => {
        addAIMessage(chat, item.role, item.content);
    });

    if (aiHistory.length === 0) {
        const welcome = document.createElement("div");
        welcome.className = "ai-empty";
        welcome.textContent =
            "Salut ! Je suis l'assistant Fractale. Pose-moi une question sur Rocket League ou notre structure !";

        chat.appendChild(welcome);
    }

    const form = document.createElement("form");
    form.className = "ai-form";

    const input = document.createElement("textarea");
    input.className = "ai-input";
    input.placeholder = "Pose ta question...";
    input.maxLength = 600;
    input.rows = 2;
    input.required = true;

    const send = document.createElement("button");
    send.type = "submit";
    send.className = "ai-send";
    send.textContent = "Envoyer ➤";

    form.append(input, send);
    panel.append(heading, chat, form);
    messages.appendChild(panel);

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const content = input.value.trim();

        if (!content || !currentUser || !supabaseClient) {
            return;
        }

        addAIMessage(chat, "user", content);

        aiHistory.push({
            role: "user",
            content
        });

        aiHistory = aiHistory.slice(-20);

        input.value = "";
        input.disabled = true;
        send.disabled = true;
        send.textContent = "Recherche...";

        const waiting = document.createElement("p");
        waiting.className = "ai-waiting";
        waiting.textContent =
            "Je recherche dans mes connaissances...";

        chat.appendChild(waiting);
        chat.scrollTop = chat.scrollHeight;

        try {
            const knowledge = await searchAIKnowledge(content);

            let reply;

            if (knowledge) {
                reply = knowledge.answer;
            } else {
                reply =
                    "Je ne connais pas encore la réponse à cette question. " +
                    "Mes connaissances sont encore en développement ! " +
                    "Tu peux demander à un membre de l'équipe Fractale " +
                    "ou ouvrir un ticket pour obtenir de l'aide.";
            }

            aiHistory.push({
                role: "assistant",
                content: reply
            });

            aiHistory = aiHistory.slice(-20);

            waiting.remove();

            addAIMessage(chat, "assistant", reply);

        } catch (error) {
            console.error("Erreur Assistant Fractale :", error);

            waiting.textContent =
                "Impossible de consulter ma base de connaissances. Réessaie plus tard.";

            aiHistory.pop();
            input.value = content;

        } finally {
            input.disabled = false;
            send.disabled = false;
            send.textContent = "Envoyer ➤";
            input.focus();
            chat.scrollTop = chat.scrollHeight;
        }
    });
}

aiMode.addEventListener("click", () => {
    currentMode = "ai";

    updateAdminVisibility();

    serverPanel.hidden = true;
    dmPanel.hidden = true;

    serverMode.classList.remove("selected");
    dmMode.classList.remove("selected");
    ticketsButton.classList.remove("selected");

    pageTitle.textContent = "✦ Mode IA";
    messageForm.hidden = true;

    renderAIAssistant();
});

// ======================================
// OUTILS ADMINISTRATION
// ======================================

function createAdminElement(tag, className, content) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (content !== undefined) {
        element.textContent = content;
    }

    return element;
}

function roleLabel(role) {
    return {
        founder: "Fondateur",
        cofounder: "Cofondateur",
        moderator: "Modérateur",
        member: "Membre"
    }[role] || "Membre";
}

// ======================================
// ADMINISTRATION
// ======================================

function isStaff() {
    return [
        "founder",
        "cofounder",
        "moderator"
    ].includes(currentRole);
}

async function openAdministration() {
    if (!isStaff()) {
        alert("Accès réservé à l'équipe Fractale.");
        return;
    }

    currentMode = "admin";
    updateAdminVisibility();

    pageTitle.textContent = "⚙ Administration";
    messageForm.hidden = true;
    messages.innerHTML = "";

    const heading = createAdminElement(
        "h1",
        "admin-heading",
        "Administration Fractale"
    );

    const description = createAdminElement(
        "p",
        "muted",
        "Gestion des membres et des connaissances de l'assistant."
    );

    const navigation = createAdminElement(
        "div",
        "admin-navigation"
    );

    const membersButton = createAdminElement(
        "button",
        "primary-button",
        "👥 Gestion des membres"
    );

    const knowledgeButton = createAdminElement(
        "button",
        "primary-button",
        "✦ Gestion des connaissances IA"
    );

    membersButton.addEventListener("click", openAdministration);
    knowledgeButton.addEventListener("click", openKnowledgeManagement);

    navigation.append(membersButton, knowledgeButton);

    const status = createAdminElement(
        "p",
        "admin-status",
        "Chargement des membres..."
    );

    const list = createAdminElement("div", "admin-list");

    messages.append(
        heading,
        description,
        navigation,
        status,
        list
    );

    const { data, error } =
        await supabaseClient.rpc("get_site_members");

    if (error) {
        status.textContent =
            "Impossible de charger les membres : " + error.message;

        status.classList.add("error");
        return;
    }

    status.textContent =
        `${data.length} membre(s) trouvé(s).`;

    (data || []).forEach(member => {
        const card = createAdminElement("div", "admin-member");

        const info = createAdminElement(
            "div",
            "admin-member-info"
        );

        const name = createAdminElement(
            "strong",
            "",
            member.username || "Membre"
        );

        const role = createAdminElement(
            "span",
            "admin-role",
            roleLabel(member.role)
        );

        info.append(name, role);

        if (member.role_created_at) {
            info.appendChild(
                createAdminElement(
                    "small",
                    "admin-date",
                    "Rôle attribué le " +
                    new Date(member.role_created_at)
                        .toLocaleDateString("fr-FR")
                )
            );
        }

        card.appendChild(info);

        if (
            member.role !== "founder" &&
            member.user_id !== currentUser.id
        ) {
            const select = document.createElement("select");
            select.className = "role-select";

            [
                ["member", "Membre"],
                ["moderator", "Modérateur"],
                ["cofounder", "Cofondateur"]
            ].forEach(([value, label]) => {
                const option = document.createElement("option");

                option.value = value;
                option.textContent = label;
                option.selected = value === member.role;

                select.appendChild(option);
            });

            const save = createAdminElement(
                "button",
                "role-save",
                "Enregistrer"
            );

            save.addEventListener("click", async () => {
                save.disabled = true;
                save.textContent = "Enregistrement...";

                const { error: updateError } =
                    await supabaseClient.rpc("set_site_role", {
                        target_user: member.user_id,
                        new_role: select.value
                    });

                if (updateError) {
                    alert("Erreur : " + updateError.message);

                    save.disabled = false;
                    save.textContent = "Enregistrer";
                    return;
                }

                alert("Rôle mis à jour.");
                await openAdministration();
            });

            card.append(select, save);
        } else {
            card.appendChild(
                createAdminElement(
                    "span",
                    "protected-role",
                    "Compte protégé"
                )
            );
        }

        list.appendChild(card);
    });
}

adminButton.addEventListener("click", openAdministration);

// ======================================
// TICKETS
// ======================================

function ticketHeading(title, description) {
    messages.innerHTML = "";

    const heading = createAdminElement(
        "h1",
        "admin-heading",
        title
    );

    const text = createAdminElement(
        "p",
        "muted",
        description
    );

    messages.append(heading, text);
}

async function openTickets() {
    currentMode = "tickets";

    updateAdminVisibility();

    selectedTicket = null;

    serverPanel.hidden = true;
    dmPanel.hidden = true;

    serverMode.classList.remove("selected");
    dmMode.classList.remove("selected");

    ticketsButton.classList.add("selected");

    pageTitle.textContent = "🎫 Tickets";

    messageForm.hidden = true;

    ticketHeading(
        "Centre de support",
        "Ouvre un ticket pour contacter l'équipe Fractale Esport."
    );

    const form = createAdminElement("form", "ticket-form");

    const title = createAdminElement(
        "h2",
        "",
        "Créer un ticket"
    );

    const label = createAdminElement(
        "label",
        "",
        "Sujet de ta demande"
    );

    label.htmlFor = "ticketSubject";

    const input = document.createElement("input");

    input.id = "ticketSubject";
    input.maxLength = 100;
    input.minLength = 3;
    input.required = true;
    input.placeholder = "Exemple : Demande d'aide";

    const detailsLabel = createAdminElement(
        "label",
        "",
        "Explique ta demande"
    );

    detailsLabel.htmlFor = "ticketDetails";

    const details = document.createElement("textarea");

    details.id = "ticketDetails";
    details.maxLength = 2000;
    details.required = true;
    details.placeholder = "Décris ta demande...";

    const submit = createAdminElement(
        "button",
        "primary-button",
        "Ouvrir le ticket"
    );

    submit.type = "submit";

    const status = createAdminElement("p", "muted", "");

    form.append(
        title,
        label,
        input,
        detailsLabel,
        details,
        submit,
        status
    );

    form.addEventListener("submit", async event => {
        event.preventDefault();

        submit.disabled = true;
        status.textContent = "Création du ticket...";

        const { data: ticket, error } = await supabaseClient
            .from("tickets")
            .insert({
                user_id: currentUser.id,
                subject: input.value.trim()
            })
            .select()
            .single();

        if (error) {
            status.textContent = "Erreur : " + error.message;
            submit.disabled = false;
            return;
        }

        const { error: messageError } = await supabaseClient
            .from("ticket_messages")
            .insert({
                ticket_id: ticket.id,
                user_id: currentUser.id,
                content: details.value.trim()
            });

        if (messageError) {
            status.textContent =
                "Ticket créé, mais le premier message n'a pas pu être envoyé : " +
                messageError.message;

            submit.disabled = false;
            return;
        }

        await openTicket(ticket);
    });

    const listTitle = createAdminElement(
        "h2",
        "",
        "Tes tickets"
    );

    const list = createAdminElement("div", "ticket-list");

    messages.append(form, listTitle, list);

    const { data: tickets, error } = await supabaseClient
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        list.appendChild(
            createAdminElement(
                "p",
                "admin-status error",
                "Impossible de charger les tickets : " + error.message
            )
        );

        return;
    }

    if (!tickets.length) {
        list.appendChild(
            createAdminElement(
                "p",
                "muted",
                "Aucun ticket pour le moment."
            )
        );

        return;
    }

    tickets.forEach(ticket => {
        const card = createAdminElement("div", "ticket-card");

        const info = createAdminElement(
            "div",
            "ticket-card-info"
        );

        const subject = createAdminElement(
            "strong",
            "",
            ticket.subject
        );

        const date = createAdminElement(
            "small",
            "",
            new Date(ticket.created_at).toLocaleString("fr-FR")
        );

        const state = createAdminElement(
            "span",
            ticket.status === "closed"
                ? "ticket-status closed"
                : "ticket-status",
            ticket.status === "closed" ? "Fermé" : "Ouvert"
        );

        info.append(subject, date, state);

        const open = createAdminElement(
            "button",
            "",
            "Voir le ticket"
        );

        open.addEventListener("click", () => {
            openTicket(ticket);
        });

        card.append(info, open);

        list.appendChild(card);
    });
}

// ======================================
// CONVERSATION D'UN TICKET
// ======================================

async function openTicket(ticket) {
    selectedTicket = ticket;

    currentMode = "ticket";

    updateAdminVisibility();

    pageTitle.textContent = "🎫 " + ticket.subject;

    messageForm.hidden = true;

    ticketHeading(
        ticket.subject,
        "Conversation privée avec l'équipe Fractale Esport."
    );

    const conversation = createAdminElement(
        "div",
        "ticket-conversation"
    );

    const status = createAdminElement(
        "p",
        "muted",
        "Chargement des messages..."
    );

    const messageList = createAdminElement("div", "");

    conversation.append(status, messageList);

    const actions = createAdminElement(
        "div",
        "ticket-actions"
    );

    const back = createAdminElement(
        "button",
        "",
        "← Retour aux tickets"
    );

    back.addEventListener("click", openTickets);

    actions.appendChild(back);

    if (ticket.status === "open") {
        const close = createAdminElement(
            "button",
            "",
            "Fermer le ticket"
        );

        close.addEventListener("click", async () => {
            if (!confirm("Veux-tu vraiment fermer ce ticket ?")) {
                return;
            }

            close.disabled = true;

            const { error } = await supabaseClient.rpc(
                "close_site_ticket",
                {
                    target_ticket: ticket.id
                }
            );

            if (error) {
                alert(
                    "Impossible de fermer le ticket : " +
                    error.message
                );

                close.disabled = false;

                return;
            }

            alert("Ticket fermé.");

            await openTickets();
        });

        actions.appendChild(close);
    }

    conversation.appendChild(actions);

    const { data, error } = await supabaseClient
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

    messageList.innerHTML = "";

    if (error) {
        status.textContent =
            "Impossible de charger les messages : " + error.message;

        messages.appendChild(conversation);

        return;
    }

    status.textContent =
        ticket.status === "closed"
            ? "Ticket fermé"
            : "Ticket ouvert";

    data.forEach(item => {
        const block = createAdminElement(
            "div",
            "ticket-message"
        );

        const author = createAdminElement(
            "small",
            "",
            item.user_id === currentUser.id
                ? "Toi"
                : "Membre du support"
        );

        const content = createAdminElement(
            "p",
            "",
            item.content
        );

        const date = createAdminElement(
            "small",
            "",
            new Date(item.created_at).toLocaleString("fr-FR")
        );

        block.append(author, content, date);

        messageList.appendChild(block);
    });

    if (ticket.status === "open") {
        const reply = createAdminElement(
            "form",
            "ticket-reply"
        );

        const input = document.createElement("input");

        input.placeholder = "Écrire une réponse...";
        input.maxLength = 2000;
        input.required = true;

        const send = createAdminElement(
            "button",
            "primary-button",
            "Envoyer"
        );

        send.type = "submit";

        reply.append(input, send);

        reply.addEventListener("submit", async event => {
            event.preventDefault();

            const content = input.value.trim();

            if (!content) return;

            send.disabled = true;

            const { error } = await supabaseClient
                .from("ticket_messages")
                .insert({
                    ticket_id: ticket.id,
                    user_id: currentUser.id,
                    content
                });

            if (error) {
                alert(
                    "Erreur lors de l'envoi : " + error.message
                );

                send.disabled = false;

                return;
            }

            await openTicket(ticket);
        });

        conversation.appendChild(reply);
    }

    messages.appendChild(conversation);

    messages.scrollTop = messages.scrollHeight;
}

ticketsButton.addEventListener("click", openTickets);

// ======================================
// LANCEMENT
// ======================================

initialiseAuth();
