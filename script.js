
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
let currentChannelId = null;
let currentMode = "server";
let authMode = "login";
let selectedTicket = null;
let aiHistory = [];
let siteCategories = [];

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
const dynamicCategories = $("dynamicCategories");

// ======================================
// OUTILS ADMINISTRATION
// ======================================

function createAdminElement(tag, className, content) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;

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

function isStaff() {
    return ["founder", "cofounder", "moderator"].includes(currentRole);
}

// ======================================
// VISIBILITÉ ADMINISTRATION
// ======================================

function updateAdminVisibility() {
    if (!adminButton) return;

    adminButton.hidden =
        !isStaff() ||
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

function renderRankCategories() {
    rankCategories.replaceChildren();

    if (!currentRank || !rankLabels[currentRank]) {
        const info = document.createElement("p");
        info.className = "muted rank-loading";
        info.textContent = "Aucune catégorie de rang ne t'a encore été attribuée.";
        rankCategories.appendChild(info);
        return;
    }

    const category = document.createElement("div");
    category.className = "category rank-category";

    const toggle = document.createElement("button");
    toggle.className = "category-toggle";
    toggle.setAttribute("aria-expanded", "true");

    const label = document.createElement("span");
    label.textContent = rankLabels[currentRank];

    const arrow = document.createElement("span");
    arrow.textContent = "⌄";

    toggle.append(label, arrow);

    const content = document.createElement("div");
    content.className = "category-content";

    const rankChannels = [
        { name: "💬 Général", slug: "general" },
        { name: "📊 RL Tracker", slug: "rl-tracker" }
    ];

    rankChannels.forEach(item => {
        const button = document.createElement("button");
        button.className = "channel";
        button.textContent = item.name;
        button.dataset.channel = `rank-${currentRank}-${item.slug}`;

        button.addEventListener("click", () => selectChannel(button));
        content.appendChild(button);
    });

    toggle.addEventListener("click", () => {
        const collapsed = category.classList.toggle("collapsed");
        toggle.setAttribute("aria-expanded", String(!collapsed));
    });

    category.append(toggle, content);
    rankCategories.appendChild(category);
}

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
        showAuthMessage(error.message || "Une erreur est survenue.", true);
    } finally {
        setLoading(false);
    }
});

// ======================================
// CATÉGORIES ET SALONS SUPABASE
// ======================================

function channelSlug(name) {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

async function seedDefaultCategories() {
    if (!isStaff()) return;

    const defaults = [
        {
            name: "🏠 Accueil",
            position: 0,
            staff_only: false,
            channels: ["📜 Règlement", "🤝 Partenariat", "🔊 Membres"]
        },
        {
            name: "📁 Information",
            position: 1,
            staff_only: false,
            channels: [
                "📢 Annonces",
                "📋 Recrutement",
                "📊 Sondage",
                "🎉 Événement",
                "👥 Effectif-officiel",
                "🏆 Résultat-scrim",
                "🏟️ Tournois",
                "🎭 Rôles"
            ]
        },
        {
            name: "⚙ Communauté",
            position: 2,
            staff_only: false,
            channels: [
                "💬 Chat",
                "🖼️ Images",
                "🎬 Clips",
                "🚗 Preset",
                "⚙️ Settings",
                "📈 Niveaux",
                "🔢 Compteur",
                "🌟 Réputations",
                "💡 Suggestions"
            ]
        },
        {
            name: "🛡️ Staff",
            position: 3,
            staff_only: true,
            channels: [
                "🛡️ Modération",
                "🚨 Signalements",
                "💬 Staff-chat"
            ]
        }
    ];

    for (const item of defaults) {
        const { data: category, error } = await supabaseClient
            .from("site_categories")
            .insert({
                name: item.name,
                position: item.position,
                staff_only: item.staff_only,
                created_by: currentUser.id
            })
            .select()
            .single();

        if (error) throw error;

        const channels = item.channels.map((name, index) => ({
            category_id: category.id,
            name,
            position: index,
            created_by: currentUser.id
        }));

        const { error: channelError } = await supabaseClient
            .from("site_channels")
            .insert(channels);

        if (channelError) throw channelError;
    }
}

async function loadSiteCategories() {
    if (!currentUser) return;

    dynamicCategories.replaceChildren();

    const loading = createAdminElement(
        "p",
        "muted",
        "Chargement des catégories..."
    );

    dynamicCategories.appendChild(loading);

    try {
        let { data: categories, error } = await supabaseClient
            .from("site_categories")
            .select("*")
            .order("position", { ascending: true });

        if (error) throw error;

        // Création des catégories initiales si la base est vide.
        if ((!categories || categories.length === 0) && isStaff()) {
            await seedDefaultCategories();

            const result = await supabaseClient
                .from("site_categories")
                .select("*")
                .order("position", { ascending: true });

            if (result.error) throw result.error;
            categories = result.data;
        }

        const { data: channels, error: channelError } = await supabaseClient
            .from("site_channels")
            .select("*")
            .order("position", { ascending: true });

        if (channelError) throw channelError;

        siteCategories = (categories || []).map(category => ({
            ...category,
            channels: (channels || [])
                .filter(channel => channel.category_id === category.id)
        }));

        renderSiteCategories();

    } catch (error) {
        console.error("Erreur catégories :", error);

        dynamicCategories.replaceChildren(
            createAdminElement(
                "p",
                "admin-status error",
                "Impossible de charger les catégories : " + error.message
            )
        );
    }
}

function renderSiteCategories() {
    dynamicCategories.replaceChildren();

    if (!siteCategories.length) {
        dynamicCategories.appendChild(
            createAdminElement(
                "p",
                "muted",
                isStaff()
                    ? "Aucune catégorie. Tu peux en créer depuis l'administration."
                    : "Aucune catégorie disponible pour le moment."
            )
        );
        return;
    }

    siteCategories.forEach(category => {
        const wrapper = document.createElement("div");
        wrapper.className = "category";
        wrapper.dataset.categoryId = category.id;

        const toggle = document.createElement("button");
        toggle.className = "category-toggle";
        toggle.setAttribute("aria-expanded", "true");

        const title = document.createElement("span");
        title.textContent = category.name;

        const arrow = document.createElement("span");
        arrow.textContent = "⌄";

        toggle.append(title, arrow);

        const content = document.createElement("div");
        content.className = "category-content";

        category.channels.forEach(channel => {
            const button = document.createElement("button");
            button.className = "channel";
            button.textContent = channel.name;
            button.dataset.channel = channelSlug(channel.name);
            button.dataset.channelId = channel.id;

            button.addEventListener("click", () => {
                selectChannel(button);
            });

            content.appendChild(button);
        });

        toggle.addEventListener("click", () => {
            const collapsed = wrapper.classList.toggle("collapsed");
            toggle.setAttribute("aria-expanded", String(!collapsed));
        });

        wrapper.append(toggle, content);
        dynamicCategories.appendChild(wrapper);
    });

    // Réactive le salon actuellement sélectionné après actualisation.
    if (currentChannelId) {
        const active = dynamicCategories.querySelector(
            `[data-channel-id="${currentChannelId}"]`
        );

        if (active) active.classList.add("active");
    }
}

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

    if (profile?.username) username = profile.username;

    profileName.textContent = username;
    profileAvatar.textContent = username.charAt(0).toUpperCase();
    profileStatus.textContent = "Connecté";

    const { data: roleData, error: roleError } = await supabaseClient
        .from("site_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    currentRole = roleError ? "member" : (roleData?.role || "member");

    updateAdminVisibility();

    const { data: rankData, error: rankError } = await supabaseClient
        .from("member_rank_roles")
        .select("rank_category")
        .eq("user_id", user.id)
        .maybeSingle();

    if (rankError) {
        console.error("Erreur chargement rang :", rankError.message);
        currentRank = null;
    } else {
        currentRank = rankData?.rank_category || null;
    }

    renderRankCategories();
    await loadSiteCategories();
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
        currentChannelId = null;
        siteCategories = [];

        dynamicCategories.replaceChildren();
        rankCategories.replaceChildren();

        updateAdminVisibility();

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

        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        await handleSession(data.session);

        supabaseClient.auth.onAuthStateChange((event, session) => {
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

function showWelcome(title = "Bienvenue sur Fractale Esport") {
    messages.replaceChildren();

    const welcome = document.createElement("div");
    welcome.className = "welcome";

    const icon = document.createElement("div");
    icon.className = "welcome-icon";
    icon.textContent = "F";

    const heading = document.createElement("h1");
    heading.textContent = title;

    const description = document.createElement("p");
    description.textContent = "Une structure, une passion, un objectif.";

    const note = document.createElement("p");
    note.className = "muted";
    note.textContent =
        "La sauvegarde des messages sera ajoutée dans une prochaine étape.";

    welcome.append(icon, heading, description, note);
    messages.appendChild(welcome);
}

function selectChannel(button) {
    const slug = button.dataset.channel || "";

    if (slug.startsWith("rank-")) {
        const rankFromChannel = slug.split("-").slice(1, -1).join("-");

        if (rankFromChannel !== currentRank) {
            alert("Cette catégorie ne correspond pas à ton rang.");
            return;
        }
    }

    document.querySelectorAll(".channel").forEach(channel => {
        channel.classList.remove("active");
    });

    button.classList.add("active");

    currentChannel = slug;
    currentChannelId = button.dataset.channelId || null;
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

// ======================================
// SYSTÈME D'AMIS
// ======================================

async function getFriendUsernames(userIds) {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (!ids.length) return {};

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, username")
        .in("id", ids);

    if (error) throw error;

    const result = {};
    (data || []).forEach(profile => {
        result[profile.id] = profile.username || "Membre";
    });

    return result;
}

function createFriendSection(title, description = "") {
    const section = document.createElement("section");
    section.className = "friends-section";

    const heading = createAdminElement("h2", "", title);
    section.appendChild(heading);

    if (description) {
        section.appendChild(createAdminElement("p", "muted", description));
    }

    return section;
}

function createFriendCard(username, statusText = "") {
    const card = createAdminElement("div", "friend-card");
    const info = createAdminElement("div", "friend-card-info");

    const name = createAdminElement("strong", "", username);
    info.appendChild(name);

    if (statusText) {
        info.appendChild(createAdminElement("small", "muted", statusText));
    }

    card.appendChild(info);
    return card;
}

async function openFriendsPanel() {
    if (!currentUser || !supabaseClient) return;

    dmPanel.replaceChildren();

    const heading = createAdminElement("h1", "admin-heading", "👥 Mes amis");
    const description = createAdminElement(
        "p",
        "muted",
        "Recherche des membres et gère tes demandes d'amitié."
    );

    const searchSection = createFriendSection(
        "🔎 Rechercher un membre",
        "Entre le pseudo d'un membre de Fractale Esport."
    );

    const searchForm = document.createElement("form");
    searchForm.className = "friend-search-form";

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Rechercher par pseudo...";
    searchInput.maxLength = 24;
    searchInput.required = true;

    const searchButton = createAdminElement("button", "primary-button", "Rechercher");
    searchButton.type = "submit";

    searchForm.append(searchInput, searchButton);

    const searchStatus = createAdminElement("p", "admin-status", "");
    const searchResults = createAdminElement("div", "friend-list");

    searchSection.append(searchForm, searchStatus, searchResults);

    const incomingSection = createFriendSection("📩 Demandes reçues");
    const incomingList = createAdminElement("div", "friend-list");

    incomingSection.appendChild(incomingList);

    const outgoingSection = createFriendSection("📨 Demandes envoyées");
    const outgoingList = createAdminElement("div", "friend-list");

    outgoingSection.appendChild(outgoingList);

    const friendsSection = createFriendSection("💜 Ma liste d'amis");
    const friendsList = createAdminElement("div", "friend-list");

    friendsSection.appendChild(friendsList);

    dmPanel.append(
        heading,
        description,
        searchSection,
        incomingSection,
        outgoingSection,
        friendsSection
    );

    async function refreshFriendLists() {
        incomingList.replaceChildren();
        outgoingList.replaceChildren();
        friendsList.replaceChildren();

        try {
            // Demandes reçues
            const { data: incoming, error: incomingError } = await supabaseClient
                .from("friend_requests")
                .select("*")
                .eq("receiver_id", currentUser.id)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (incomingError) throw incomingError;

            // Demandes envoyées
            const { data: outgoing, error: outgoingError } = await supabaseClient
                .from("friend_requests")
                .select("*")
                .eq("sender_id", currentUser.id)
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (outgoingError) throw outgoingError;

            // Amitiés
            const { data: friendships, error: friendshipError } = await supabaseClient
                .from("friendships")
                .select("*")
                .or(
                    `user_one.eq.${currentUser.id},user_two.eq.${currentUser.id}`
                );

            if (friendshipError) throw friendshipError;

            const incomingIds = (incoming || []).map(item => item.sender_id);
            const outgoingIds = (outgoing || []).map(item => item.receiver_id);

            const friendIds = (friendships || []).map(item =>
                item.user_one === currentUser.id
                    ? item.user_two
                    : item.user_one
            );

            const usernames = await getFriendUsernames([
                ...incomingIds,
                ...outgoingIds,
                ...friendIds
            ]);

            // Afficher les demandes reçues
            if (!incoming?.length) {
                incomingList.appendChild(
                    createAdminElement("p", "muted", "Aucune demande reçue.")
                );
            }

            (incoming || []).forEach(request => {
                const card = createFriendCard(
                    usernames[request.sender_id] || "Membre",
                    "Souhaite devenir ton ami."
                );

                const actions = createAdminElement("div", "friend-actions");

                const accept = createAdminElement("button", "friend-accept", "✓ Accepter");
                const reject = createAdminElement("button", "friend-reject", "✕ Refuser");

                accept.addEventListener("click", async () => {
                    accept.disabled = true;

                    const { error: updateError } = await supabaseClient
                        .from("friend_requests")
                        .update({ status: "accepted" })
                        .eq("id", request.id)
                        .eq("receiver_id", currentUser.id);

                    if (updateError) {
                        alert("Impossible d'accepter la demande : " + updateError.message);
                        accept.disabled = false;
                        return;
                    }

                    const { error: insertError } = await supabaseClient
                        .from("friendships")
                        .insert({
                            user_one: currentUser.id,
                            user_two: request.sender_id
                        });

                    if (insertError) {
                        alert(
                            "La demande est acceptée, mais la création de l'amitié a échoué : " +
                            insertError.message
                        );
                    }

                    await refreshFriendLists();
                });

                reject.addEventListener("click", async () => {
                    reject.disabled = true;

                    const { error } = await supabaseClient
                        .from("friend_requests")
                        .update({ status: "rejected" })
                        .eq("id", request.id)
                        .eq("receiver_id", currentUser.id);

                    if (error) {
                        alert("Impossible de refuser la demande : " + error.message);
                        reject.disabled = false;
                        return;
                    }

                    await refreshFriendLists();
                });

                actions.append(accept, reject);
                card.appendChild(actions);
                incomingList.appendChild(card);
            });

            // Afficher les demandes envoyées
            if (!outgoing?.length) {
                outgoingList.appendChild(
                    createAdminElement("p", "muted", "Aucune demande envoyée.")
                );
            }

            (outgoing || []).forEach(request => {
                const card = createFriendCard(
                    usernames[request.receiver_id] || "Membre",
                    "Demande en attente."
                );

                const cancel = createAdminElement("button", "friend-reject", "Annuler");

                cancel.addEventListener("click", async () => {
                    cancel.disabled = true;

                    const { error } = await supabaseClient
                        .from("friend_requests")
                        .delete()
                        .eq("id", request.id)
                        .eq("sender_id", currentUser.id);

                    if (error) {
                        alert("Impossible d'annuler : " + error.message);
                        cancel.disabled = false;
                        return;
                    }

                    await refreshFriendLists();
                });

                card.appendChild(cancel);
                outgoingList.appendChild(card);
            });

            // Afficher les amis
            if (!friendIds.length) {
                friendsList.appendChild(
                    createAdminElement("p", "muted", "Tu n'as pas encore d'amis.")
                );
            }

            (friendships || []).forEach(friendship => {
                const friendId = friendship.user_one === currentUser.id
                    ? friendship.user_two
                    : friendship.user_one;

                const card = createFriendCard(
                    usernames[friendId] || "Membre",
                    "Ami Fractale"
                );

                const remove = createAdminElement("button", "friend-reject", "Retirer");

                remove.addEventListener("click", async () => {
                    if (!confirm("Retirer ce membre de ta liste d'amis ?")) return;

                    remove.disabled = true;

                    const { error } = await supabaseClient
                        .from("friendships")
                        .delete()
                        .eq("id", friendship.id);

                    if (error) {
                        alert("Impossible de retirer cet ami : " + error.message);
                        remove.disabled = false;
                        return;
                    }

                    await refreshFriendLists();
                });

                card.appendChild(remove);
                friendsList.appendChild(card);
            });

        } catch (error) {
            console.error("Erreur du système d'amis :", error);

            incomingList.replaceChildren(
                createAdminElement(
                    "p",
                    "admin-status error",
                    "Erreur : " + error.message
                )
            );
        }
    }

    // Recherche de membres
    searchForm.addEventListener("submit", async event => {
        event.preventDefault();

        const query = searchInput.value.trim();

        searchResults.replaceChildren();

        if (query.length < 2) {
            searchStatus.textContent = "Entre au moins 2 caractères.";
            return;
        }

        searchButton.disabled = true;
        searchStatus.textContent = "Recherche en cours...";

        try {
            const { data: profiles, error } = await supabaseClient
                .from("profiles")
                .select("id, username")
                .ilike("username", `%${query}%`)
                .neq("id", currentUser.id)
                .limit(20);

            if (error) throw error;

            if (!profiles?.length) {
                searchStatus.textContent = "Aucun membre trouvé.";
                return;
            }

            searchStatus.textContent = `${profiles.length} membre(s) trouvé(s).`;

            for (const profile of profiles) {
                const card = createFriendCard(profile.username || "Membre");

                const add = createAdminElement("button", "friend-add", "＋ Ajouter");

                add.addEventListener("click", async () => {
                    add.disabled = true;
                    add.textContent = "Envoi...";

                    try {
                        // Vérifier si une amitié existe déjà.
                        const { data: existingFriend, error: friendError } =
                            await supabaseClient
                                .from("friendships")
                                .select("id")
                                .or(
                                    `and(user_one.eq.${currentUser.id},user_two.eq.${profile.id}),and(user_one.eq.${profile.id},user_two.eq.${currentUser.id})`
                                )
                                .limit(1);

                        if (friendError) throw friendError;

                        if (existingFriend?.length) {
                            add.textContent = "Déjà amis";
                            return;
                        }

                        // Vérifier les demandes dans les deux sens.
                        const { data: existingRequests, error: requestError } =
                            await supabaseClient
                                .from("friend_requests")
                                .select("id, sender_id, receiver_id, status")
                                .or(
                                    `and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`
                                );

                        if (requestError) throw requestError;

                        const pending = (existingRequests || []).find(
                            item => item.status === "pending"
                        );

                        if (pending) {
                            add.textContent = pending.sender_id === currentUser.id
                                ? "Demande envoyée"
                                : "Demande reçue";
                            return;
                        }

                        // Supprimer une ancienne demande refusée du même expéditeur
                        // pour pouvoir en envoyer une nouvelle.
                        const oldRejected = (existingRequests || []).filter(
                            item =>
                                item.sender_id === currentUser.id &&
                                item.status === "rejected"
                        );

                        for (const oldRequest of oldRejected) {
                            const { error: deleteError } = await supabaseClient
                                .from("friend_requests")
                                .delete()
                                .eq("id", oldRequest.id);

                            if (deleteError) throw deleteError;
                        }

                        const { error: insertError } = await supabaseClient
                            .from("friend_requests")
                            .insert({
                                sender_id: currentUser.id,
                                receiver_id: profile.id,
                                status: "pending"
                            });

                        if (insertError) throw insertError;

                        add.textContent = "✓ Demande envoyée";
                        await refreshFriendLists();

                    } catch (error) {
                        console.error(error);
                        alert("Impossible d'envoyer la demande : " + error.message);
                        add.disabled = false;
                        add.textContent = "＋ Ajouter";
                    }
                });

                card.appendChild(add);
                searchResults.appendChild(card);
            }

        } catch (error) {
            console.error("Erreur de recherche :", error);
            searchStatus.textContent = "Erreur : " + error.message;
        } finally {
            searchButton.disabled = false;
        }
    });

    await refreshFriendLists();
}

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

    pageTitle.textContent = "Amis";
    messageForm.hidden = true;

    openFriendsPanel();
});

// ======================================
// MESSAGES TEMPORAIRES
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
// MODE IA
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

async function searchAIKnowledge(question) {
    const { data, error } = await supabaseClient
        .from("ai_knowledge")
        .select("id, question, answer, keywords, category")
        .limit(200);

    if (error) throw error;

    const normalizedQuestion = normalizeAIText(question);
    const words = normalizedQuestion.split(" ").filter(word => word.length >= 3);

    if (!words.length) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const item of data || []) {
        const storedQuestion = normalizeAIText(item.question);
        const storedAnswer = normalizeAIText(item.answer);
        const keywords = (item.keywords || []).map(normalizeAIText);

        let score = 0;

        for (const word of words) {
            if (keywords.some(keyword =>
                keyword === word ||
                keyword.includes(word) ||
                word.includes(keyword)
            )) score += 3;

            if (storedQuestion.includes(word)) score += 2;
            if (storedAnswer.includes(word)) score += 0.5;
        }

        if (normalizedQuestion === storedQuestion) score += 20;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
        }
    }

    return bestScore < 4 ? null : bestMatch;
}

function renderAIAssistant() {
    messages.replaceChildren();

    const panel = createAdminElement("div", "ai-panel");
    const heading = createAdminElement("div", "ai-heading");

    const title = createAdminElement("h1", "", "✦ Assistant Fractale");
    const description = createAdminElement(
        "p",
        "",
        "Un assistant qui enrichit ses connaissances grâce à Fractale Esport."
    );

    heading.append(title, description);

    const chat = createAdminElement("div", "ai-chat");

    aiHistory.forEach(item => addAIMessage(chat, item.role, item.content));

    if (!aiHistory.length) {
        chat.appendChild(createAdminElement(
            "div",
            "ai-empty",
            "Salut ! Je suis l'assistant Fractale. Pose-moi une question sur Rocket League ou notre structure !"
        ));
    }

    const form = createAdminElement("form", "ai-form");

    const input = document.createElement("textarea");
    input.className = "ai-input";
    input.placeholder = "Pose ta question...";
    input.maxLength = 600;
    input.rows = 2;
    input.required = true;

    const send = createAdminElement("button", "ai-send", "Envoyer ➤");
    send.type = "submit";

    form.append(input, send);
    panel.append(heading, chat, form);
    messages.appendChild(panel);

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const content = input.value.trim();
        if (!content || !currentUser || !supabaseClient) return;

        addAIMessage(chat, "user", content);
        aiHistory.push({ role: "user", content });
        aiHistory = aiHistory.slice(-20);

        input.value = "";
        input.disabled = true;
        send.disabled = true;
        send.textContent = "Recherche...";

        const waiting = createAdminElement(
            "p",
            "ai-waiting",
            "Je recherche dans mes connaissances..."
        );

        chat.appendChild(waiting);

        try {
            const knowledge = await searchAIKnowledge(content);

            const reply = knowledge
                ? knowledge.answer
                : "Je ne connais pas encore la réponse à cette question. Mes connaissances sont encore en développement ! Tu peux demander à un membre de l'équipe Fractale ou ouvrir un ticket pour obtenir de l'aide.";

            aiHistory.push({ role: "assistant", content: reply });
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
// ADMINISTRATION
// ======================================

async function openAdministration() {
    if (!isStaff()) {
        alert("Accès réservé à l'équipe Fractale.");
        return;
    }

    currentMode = "admin";
    updateAdminVisibility();

    pageTitle.textContent = "⚙ Administration";
    messageForm.hidden = true;
    messages.replaceChildren();

    const heading = createAdminElement(
        "h1",
        "admin-heading",
        "Administration Fractale"
    );

    const description = createAdminElement(
        "p",
        "muted",
        "Gestion des membres, des salons et des connaissances de l'assistant."
    );

    const navigation = createAdminElement("div", "admin-navigation");

    const membersButton = createAdminElement("button", "primary-button", "👥 Gestion des membres");
    const channelsButton = createAdminElement("button", "primary-button", "📁 Gestion des salons");
    const knowledgeButton = createAdminElement("button", "primary-button", "✦ Gestion des connaissances IA");

    membersButton.addEventListener("click", openAdministration);
    channelsButton.addEventListener("click", openChannelManagement);
    knowledgeButton.addEventListener("click", openKnowledgeManagement);

    navigation.append(membersButton, channelsButton, knowledgeButton);

    const status = createAdminElement("p", "admin-status", "Chargement des membres...");
    const list = createAdminElement("div", "admin-list");

    messages.append(heading, description, navigation, status, list);

    const { data, error } = await supabaseClient.rpc("get_site_members");

    if (error) {
        status.textContent = "Impossible de charger les membres : " + error.message;
        status.classList.add("error");
        return;
    }

    status.textContent = `${(data || []).length} membre(s) trouvé(s).`;

    (data || []).forEach(member => {
        const card = createAdminElement("div", "admin-member");
        const info = createAdminElement("div", "admin-member-info");

        const name = createAdminElement("strong", "", member.username || "Membre");
        const role = createAdminElement("span", "admin-role", roleLabel(member.role));

        info.append(name, role);

        if (member.role_created_at) {
            info.appendChild(createAdminElement(
                "small",
                "admin-date",
                "Rôle attribué le " + new Date(member.role_created_at).toLocaleDateString("fr-FR")
            ));
        }

        card.appendChild(info);

        if (member.role !== "founder" && member.user_id !== currentUser.id) {
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

            const save = createAdminElement("button", "role-save", "Enregistrer");

            save.addEventListener("click", async () => {
                save.disabled = true;
                save.textContent = "Enregistrement...";

                const { error: updateError } = await supabaseClient.rpc(
                    "set_site_role",
                    {
                        target_user: member.user_id,
                        new_role: select.value
                    }
                );

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
            card.appendChild(createAdminElement("span", "protected-role", "Compte protégé"));
        }

        list.appendChild(card);
    });
}

adminButton.addEventListener("click", openAdministration);

// ======================================
// GESTION DES CATÉGORIES ET DES SALONS
// ======================================

async function openChannelManagement() {
    if (!isStaff()) {
        alert("Accès réservé à l'équipe Fractale.");
        return;
    }

    currentMode = "admin";
    updateAdminVisibility();

    pageTitle.textContent = "📁 Gestion des salons";
    messageForm.hidden = true;
    messages.replaceChildren();

    const heading = createAdminElement("h1", "admin-heading", "📁 Gestion des salons");

    const description = createAdminElement(
        "p",
        "muted",
        "Crée des catégories, ajoute des salons et organise ton serveur."
    );

    const back = createAdminElement("button", "primary-button", "← Retour à l'administration");
    back.addEventListener("click", openAdministration);

    const categoryForm = createAdminElement("form", "management-form");

    categoryForm.appendChild(createAdminElement("h2", "", "Créer une catégorie"));

    const categoryLabel = createAdminElement("label", "", "Nom de la catégorie");

    const categoryInput = document.createElement("input");
    categoryInput.placeholder = "Exemple : 🎮 Jeux";
    categoryInput.maxLength = 50;
    categoryInput.minLength = 2;
    categoryInput.required = true;

    const staffLabel = createAdminElement("label", "staff-checkbox");

    const staffCheckbox = document.createElement("input");
    staffCheckbox.type = "checkbox";

    const staffText = document.createElement("span");
    staffText.textContent = "Catégorie réservée au staff";

    staffLabel.append(staffCheckbox, staffText);

    const categorySubmit = createAdminElement("button", "", "Créer la catégorie");
    categorySubmit.type = "submit";

    const categoryStatus = createAdminElement("p", "admin-status", "");

    categoryForm.append(
        categoryLabel,
        categoryInput,
        staffLabel,
        categorySubmit,
        categoryStatus
    );

    const listTitle = createAdminElement("h2", "", "Catégories existantes");
    const list = createAdminElement("div", "category-management");

    messages.append(heading, description, back, categoryForm, listTitle, list);

    categoryForm.addEventListener("submit", async event => {
        event.preventDefault();

        const name = categoryInput.value.trim();

        if (name.length < 2) {
            categoryStatus.textContent = "Le nom doit contenir au moins 2 caractères.";
            categoryStatus.classList.add("error");
            return;
        }

        categorySubmit.disabled = true;
        categoryStatus.classList.remove("error");
        categoryStatus.textContent = "Création en cours...";

        const { error } = await supabaseClient
            .from("site_categories")
            .insert({
                name,
                staff_only: staffCheckbox.checked,
                position: siteCategories.length,
                created_by: currentUser.id
            });

        if (error) {
            categoryStatus.textContent = "Erreur : " + error.message;
            categoryStatus.classList.add("error");
            categorySubmit.disabled = false;
            return;
        }

        categoryForm.reset();
        categoryStatus.textContent = "Catégorie créée avec succès !";

        await loadSiteCategories();
        await renderCategoryManagementList(list);
        categorySubmit.disabled = false;
    });

    await loadSiteCategories();
    await renderCategoryManagementList(list);
}

async function renderCategoryManagementList(list) {
    list.replaceChildren();

    const { data: categories, error } = await supabaseClient
        .from("site_categories")
        .select("*")
        .order("position", { ascending: true });

    if (error) {
        list.appendChild(createAdminElement(
            "p",
            "admin-status error",
            "Erreur de chargement : " + error.message
        ));
        return;
    }

    const { data: channels, error: channelError } = await supabaseClient
        .from("site_channels")
        .select("*")
        .order("position", { ascending: true });

    if (channelError) {
        list.appendChild(createAdminElement(
            "p",
            "admin-status error",
            "Erreur de chargement des salons : " + channelError.message
        ));
        return;
    }

    for (const category of categories || []) {
        const card = createAdminElement("div", "category-admin-card");

        const header = createAdminElement("div", "category-admin-header");

        const title = createAdminElement("h3", "", category.name);

        const privacy = createAdminElement(
            "span",
            "muted",
            category.staff_only ? "🔒 Réservée au staff" : "🌐 Publique"
        );

        const actions = createAdminElement("div", "category-admin-actions");

        const rename = createAdminElement("button", "", "✏️ Renommer");
        rename.addEventListener("click", async () => {
            const newName = prompt("Nouveau nom de la catégorie :", category.name);

            if (!newName || newName.trim().length < 2) return;

            const { error } = await supabaseClient
                .from("site_categories")
                .update({ name: newName.trim() })
                .eq("id", category.id);

            if (error) {
                alert("Erreur : " + error.message);
                return;
            }

            await loadSiteCategories();
            await renderCategoryManagementList(list);
        });

        const privacyButton = createAdminElement(
            "button",
            "",
            category.staff_only ? "🌐 Rendre publique" : "🔒 Réserver au staff"
        );

        privacyButton.addEventListener("click", async () => {
            const { error } = await supabaseClient
                .from("site_categories")
                .update({ staff_only: !category.staff_only })
                .eq("id", category.id);

            if (error) {
                alert("Erreur : " + error.message);
                return;
            }

            await loadSiteCategories();
            await renderCategoryManagementList(list);
        });

        const remove = createAdminElement("button", "", "🗑️ Supprimer");

        remove.addEventListener("click", async () => {
            if (!confirm(
                `Supprimer la catégorie "${category.name}" et tous ses salons ?`
            )) return;

            const { error } = await supabaseClient
                .from("site_categories")
                .delete()
                .eq("id", category.id);

            if (error) {
                alert("Erreur : " + error.message);
                return;
            }

            await loadSiteCategories();
            await renderCategoryManagementList(list);
        });

        actions.append(rename, privacyButton, remove);
        header.append(title, actions);

        card.append(header, privacy);

        const categoryChannels = (channels || [])
            .filter(channel => channel.category_id === category.id);

        categoryChannels.forEach(channel => {
            const row = createAdminElement("div", "channel-admin-row");

            const channelName = createAdminElement("span", "", channel.name);
            const channelActions = createAdminElement("div", "channel-admin-actions");

            const edit = createAdminElement("button", "", "✏️");
            edit.title = "Renommer le salon";

            edit.addEventListener("click", async () => {
                const newName = prompt("Nouveau nom du salon :", channel.name);

                if (!newName || newName.trim().length < 2) return;

                const { error } = await supabaseClient
                    .from("site_channels")
                    .update({ name: newName.trim() })
                    .eq("id", channel.id);

                if (error) {
                    alert("Erreur : " + error.message);
                    return;
                }

                await loadSiteCategories();
                await renderCategoryManagementList(list);
            });

            const deleteChannel = createAdminElement("button", "", "🗑️");
            deleteChannel.title = "Supprimer le salon";

            deleteChannel.addEventListener("click", async () => {
                if (!confirm(`Supprimer le salon "${channel.name}" ?`)) return;

                const { error } = await supabaseClient
                    .from("site_channels")
                    .delete()
                    .eq("id", channel.id);

                if (error) {
                    alert("Erreur : " + error.message);
                    return;
                }

                await loadSiteCategories();
                await renderCategoryManagementList(list);
            });

            channelActions.append(edit, deleteChannel);
            row.append(channelName, channelActions);
            card.appendChild(row);
        });

        const addForm = createAdminElement("form", "management-form");

        const addLabel = createAdminElement("label", "", "Ajouter un salon");

        const addInput = document.createElement("input");
        addInput.placeholder = "Exemple : 💬 Discussion";
        addInput.maxLength = 50;
        addInput.minLength = 2;
        addInput.required = true;

        const addButton = createAdminElement("button", "", "＋ Ajouter le salon");
        addButton.type = "submit";

        const addStatus = createAdminElement("p", "admin-status", "");

        addForm.append(addLabel, addInput, addButton, addStatus);

        addForm.addEventListener("submit", async event => {
            event.preventDefault();

            const name = addInput.value.trim();

            if (name.length < 2) return;

            addButton.disabled = true;
            addStatus.textContent = "Ajout du salon...";

            const { error } = await supabaseClient
                .from("site_channels")
                .insert({
                    category_id: category.id,
                    name,
                    position: categoryChannels.length,
                    created_by: currentUser.id
                });

            if (error) {
                addStatus.textContent = "Erreur : " + error.message;
                addStatus.classList.add("error");
                addButton.disabled = false;
                return;
            }

            await loadSiteCategories();
            await renderCategoryManagementList(list);
        });

        card.appendChild(addForm);
        list.appendChild(card);
    }

    if (!categories?.length) {
        list.appendChild(createAdminElement(
            "p",
            "muted",
            "Aucune catégorie enregistrée."
        ));
    }
}

// ======================================
// GESTION DES CONNAISSANCES IA
// ======================================

let editingKnowledgeId = null;

async function openKnowledgeManagement() {
    if (!isStaff()) {
        alert("Accès réservé à l'équipe Fractale.");
        return;
    }

    currentMode = "admin";
    updateAdminVisibility();

    pageTitle.textContent = "✦ Gestion des connaissances IA";
    messageForm.hidden = true;
    messages.replaceChildren();

    const heading = createAdminElement("h1", "admin-heading", "✦ Gestion des connaissances IA");

    const description = createAdminElement(
        "p",
        "muted",
        "Ajoute des informations pour améliorer les réponses de l'assistant."
    );

    const backButton = createAdminElement(
        "button",
        "primary-button",
        "← Retour à l'administration"
    );

    backButton.addEventListener("click", openAdministration);

    const form = createAdminElement("form", "knowledge-form");

    const formTitle = createAdminElement("h2", "", "Ajouter une connaissance");
    const questionLabel = createAdminElement("label", "", "Question");

    const questionInput = document.createElement("input");
    questionInput.type = "text";
    questionInput.placeholder = "Exemple : Qu'est-ce que Fractale Esport ?";
    questionInput.maxLength = 300;
    questionInput.minLength = 3;
    questionInput.required = true;

    const answerLabel = createAdminElement("label", "", "Réponse");

    const answerInput = document.createElement("textarea");
    answerInput.placeholder = "Écris la réponse que l'assistant devra donner...";
    answerInput.maxLength = 3000;
    answerInput.required = true;
    answerInput.rows = 5;

    const categoryLabel = createAdminElement("label", "", "Catégorie");
    const categoryInput = document.createElement("select");

    [
        ["general", "Général"],
        ["fractale", "Fractale Esport"],
        ["rocket-league", "Rocket League"],
        ["reglement", "Règlement"],
        ["support", "Support"],
        ["tournois", "Tournois"]
    ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        categoryInput.appendChild(option);
    });

    const keywordsLabel = createAdminElement("label", "", "Mots-clés (séparés par des virgules)");

    const keywordsInput = document.createElement("input");
    keywordsInput.type = "text";
    keywordsInput.placeholder = "Exemple : fractale, équipe, communauté";

    const status = createAdminElement("p", "admin-status", "");

    const submit = createAdminElement("button", "primary-button", "Ajouter la connaissance");
    submit.type = "submit";

    const cancel = createAdminElement("button", "", "Annuler la modification");
    cancel.type = "button";
    cancel.hidden = true;

    form.append(
        formTitle,
        questionLabel,
        questionInput,
        answerLabel,
        answerInput,
        categoryLabel,
        categoryInput,
        keywordsLabel,
        keywordsInput,
        submit,
        cancel,
        status
    );

    const listTitle = createAdminElement("h2", "", "Connaissances enregistrées");
    const listStatus = createAdminElement("p", "muted", "Chargement des connaissances...");
    const list = createAdminElement("div", "knowledge-list");

    messages.append(heading, description, backButton, form, listTitle, listStatus, list);

    function resetKnowledgeForm() {
        editingKnowledgeId = null;
        form.reset();
        formTitle.textContent = "Ajouter une connaissance";
        submit.textContent = "Ajouter la connaissance";
        cancel.hidden = true;
        status.textContent = "";
    }

    cancel.addEventListener("click", resetKnowledgeForm);

    async function loadKnowledgeList() {
        list.replaceChildren();
        listStatus.textContent = "Chargement des connaissances...";

        const { data, error } = await supabaseClient
            .from("ai_knowledge")
            .select("id, question, answer, category, keywords, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            listStatus.textContent = "Impossible de charger les connaissances : " + error.message;
            return;
        }

        listStatus.textContent = `${data.length} connaissance(s) enregistrée(s).`;

        if (!data.length) {
            list.appendChild(createAdminElement("p", "muted", "Aucune connaissance enregistrée."));
            return;
        }

        data.forEach(item => {
            const card = createAdminElement("div", "knowledge-card");
            const question = createAdminElement("h3", "", item.question);
            const category = createAdminElement("small", "knowledge-category", "Catégorie : " + item.category);
            const answer = createAdminElement("p", "", item.answer);
            const keywords = createAdminElement(
                "small",
                "muted",
                "Mots-clés : " + ((item.keywords || []).join(", ") || "Aucun")
            );

            const actions = createAdminElement("div", "knowledge-actions");

            const edit = createAdminElement("button", "", "✏️ Modifier");

            edit.addEventListener("click", () => {
                editingKnowledgeId = item.id;
                questionInput.value = item.question;
                answerInput.value = item.answer;
                categoryInput.value = item.category || "general";
                keywordsInput.value = (item.keywords || []).join(", ");

                formTitle.textContent = "Modifier une connaissance";
                submit.textContent = "Enregistrer les modifications";
                cancel.hidden = false;

                status.textContent = "Modification de : " + item.question;

                form.scrollIntoView({ behavior: "smooth", block: "start" });
            });

            const remove = createAdminElement("button", "", "🗑️ Supprimer");

            remove.addEventListener("click", async () => {
                if (!confirm("Veux-tu vraiment supprimer cette connaissance ?")) return;

                remove.disabled = true;
                remove.textContent = "Suppression...";

                const { error: deleteError } = await supabaseClient
                    .from("ai_knowledge")
                    .delete()
                    .eq("id", item.id);

                if (deleteError) {
                    alert("Impossible de supprimer : " + deleteError.message);
                    remove.disabled = false;
                    remove.textContent = "🗑️ Supprimer";
                    return;
                }

                if (editingKnowledgeId === item.id) resetKnowledgeForm();
                await loadKnowledgeList();
            });

            actions.append(edit, remove);
            card.append(question, category, answer, keywords, actions);
            list.appendChild(card);
        });
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const question = questionInput.value.trim();
        const answer = answerInput.value.trim();
        const category = categoryInput.value;

        const keywords = keywordsInput.value
            .split(",")
            .map(word => word.trim())
            .filter(Boolean)
            .slice(0, 30);

        if (question.length < 3 || !answer) {
            status.textContent = "La question doit contenir au moins 3 caractères et la réponse ne doit pas être vide.";
            status.classList.add("error");
            return;
        }

        submit.disabled = true;
        status.classList.remove("error");
        status.textContent = editingKnowledgeId
            ? "Enregistrement des modifications..."
            : "Ajout de la connaissance...";

        try {
            const knowledgeData = { question, answer, category, keywords };

            const result = editingKnowledgeId !== null
                ? await supabaseClient.from("ai_knowledge").update(knowledgeData).eq("id", editingKnowledgeId)
                : await supabaseClient.from("ai_knowledge").insert(knowledgeData);

            if (result.error) throw result.error;

            status.textContent = editingKnowledgeId
                ? "Connaissance modifiée avec succès !"
                : "Nouvelle connaissance ajoutée !";

            resetKnowledgeForm();
            await loadKnowledgeList();

        } catch (error) {
            console.error("Erreur gestion des connaissances :", error);
            status.textContent = "Erreur : " + error.message;
            status.classList.add("error");
        } finally {
            submit.disabled = false;
        }
    });

    await loadKnowledgeList();
}

// ======================================
// TICKETS
// ======================================

function ticketHeading(title, description) {
    messages.replaceChildren();

    const heading = createAdminElement("h1", "admin-heading", title);
    const text = createAdminElement("p", "muted", description);

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
    const title = createAdminElement("h2", "", "Créer un ticket");
    const label = createAdminElement("label", "", "Sujet de ta demande");

    const input = document.createElement("input");
    input.maxLength = 100;
    input.minLength = 3;
    input.required = true;
    input.placeholder = "Exemple : Demande d'aide";

    const detailsLabel = createAdminElement("label", "", "Explique ta demande");

    const details = document.createElement("textarea");
    details.maxLength = 2000;
    details.required = true;
    details.placeholder = "Décris ta demande...";

    const submit = createAdminElement("button", "primary-button", "Ouvrir le ticket");
    submit.type = "submit";

    const status = createAdminElement("p", "muted", "");

    form.append(title, label, input, detailsLabel, details, submit, status);

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
            status.textContent = "Ticket créé, mais le premier message n'a pas pu être envoyé : " + messageError.message;
            submit.disabled = false;
            return;
        }

        await openTicket(ticket);
    });

    const listTitle = createAdminElement("h2", "", "Tes tickets");
    const list = createAdminElement("div", "ticket-list");

    messages.append(form, listTitle, list);

    const { data: tickets, error } = await supabaseClient
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        list.appendChild(createAdminElement(
            "p",
            "admin-status error",
            "Impossible de charger les tickets : " + error.message
        ));
        return;
    }

    if (!tickets.length) {
        list.appendChild(createAdminElement("p", "muted", "Aucun ticket pour le moment."));
        return;
    }

    tickets.forEach(ticket => {
        const card = createAdminElement("div", "ticket-card");
        const info = createAdminElement("div", "ticket-card-info");

        const subject = createAdminElement("strong", "", ticket.subject);
        const date = createAdminElement("small", "", new Date(ticket.created_at).toLocaleString("fr-FR"));

        const state = createAdminElement(
            "span",
            ticket.status === "closed" ? "ticket-status closed" : "ticket-status",
            ticket.status === "closed" ? "Fermé" : "Ouvert"
        );

        info.append(subject, date, state);

        const open = createAdminElement("button", "", "Voir le ticket");
        open.addEventListener("click", () => openTicket(ticket));

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

    const conversation = createAdminElement("div", "ticket-conversation");
    const status = createAdminElement("p", "muted", "Chargement des messages...");
    const messageList = createAdminElement("div", "");

    conversation.append(status, messageList);

    const actions = createAdminElement("div", "ticket-actions");
    const back = createAdminElement("button", "", "← Retour aux tickets");

    back.addEventListener("click", openTickets);
    actions.appendChild(back);

    if (ticket.status === "open") {
        const close = createAdminElement("button", "", "Fermer le ticket");

        close.addEventListener("click", async () => {
            if (!confirm("Veux-tu vraiment fermer ce ticket ?")) return;

            close.disabled = true;

            const { error } = await supabaseClient.rpc(
                "close_site_ticket",
                { target_ticket: ticket.id }
            );

            if (error) {
                alert("Impossible de fermer le ticket : " + error.message);
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

    messageList.replaceChildren();

    if (error) {
        status.textContent = "Impossible de charger les messages : " + error.message;
        messages.appendChild(conversation);
        return;
    }

    status.textContent = ticket.status === "closed" ? "Ticket fermé" : "Ticket ouvert";

    data.forEach(item => {
        const block = createAdminElement("div", "ticket-message");

        const author = createAdminElement(
            "small",
            "",
            item.user_id === currentUser.id ? "Toi" : "Membre du support"
        );

        const content = createAdminElement("p", "", item.content);
        const date = createAdminElement(
            "small",
            "",
            new Date(item.created_at).toLocaleString("fr-FR")
        );

        block.append(author, content, date);
        messageList.appendChild(block);
    });

    if (ticket.status === "open") {
        const reply = createAdminElement("form", "ticket-reply");

        const input = document.createElement("input");
        input.placeholder = "Écrire une réponse...";
        input.maxLength = 2000;
        input.required = true;

        const send = createAdminElement("button", "primary-button", "Envoyer");
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
                alert("Erreur lors de l'envoi : " + error.message);
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
