:root {
    --bg: #090b16;
    --panel: #101426;
    --purple: #9274ff;
    --text: #f5f5fb;
    --muted: #a4a8bb;
    --line: rgba(190,180,255,.17);
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: Arial, sans-serif;
}

button, input {
    font: inherit;
}

button {
    cursor: pointer;
}

[hidden] {
    display: none !important;
}

/* CONNEXION */

.auth-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background:
        radial-gradient(circle at 50% 20%, rgba(146,116,255,.18), transparent 42%),
        var(--bg);
}

.auth-card {
    width: 100%;
    max-width: 420px;
    padding: 35px;
    background: #101426;
    border: 1px solid var(--line);
    border-radius: 17px;
    box-shadow: 0 20px 70px rgba(0,0,0,.35);
}

.auth-logo {
    width: 65px;
    height: 65px;
    margin: 0 auto 18px;
    display: grid;
    place-items: center;
    background: var(--purple);
    color: #090b16;
    border-radius: 15px;
    font-size: 40px;
    font-weight: 900;
}

.auth-card h1 {
    text-align: center;
    font-size: 23px;
    letter-spacing: 2px;
}

.auth-card h1 span {
    color: var(--purple);
}

.auth-subtitle {
    color: var(--muted);
    text-align: center;
    font-size: 14px;
    margin-bottom: 25px;
}

.auth-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 22px;
}

.auth-tab {
    flex: 1;
    padding: 12px;
    color: var(--muted);
    background: #171b30;
    border: 1px solid var(--line);
    border-radius: 8px;
}

.auth-tab.active {
    color: white;
    background: #29234b;
    border-color: var(--purple);
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 7px;
    font-size: 13px;
    color: #d5d1e8;
}

.form-group input {
    width: 100%;
    padding: 13px;
    color: white;
    background: #171b30;
    border: 1px solid var(--line);
    border-radius: 8px;
    outline: none;
}

.form-group input:focus {
    border-color: var(--purple);
}

.auth-submit {
    width: 100%;
    padding: 14px;
    margin-top: 5px;
    color: #090b16;
    background: var(--purple);
    border: 0;
    border-radius: 8px;
    font-weight: bold;
}

.auth-submit:hover {
    filter: brightness(1.1);
}

.auth-submit:disabled {
    opacity: .6;
    cursor: wait;
}

.auth-message {
    min-height: 20px;
    margin-top: 15px;
    color: #c5b8ff;
    text-align: center;
    font-size: 13px;
    line-height: 1.5;
}

.auth-message.error {
    color: #ff8585;
}

.auth-footer {
    margin-top: 25px;
    color: var(--muted);
    text-align: center;
    font-size: 11px;
}

/* APPLICATION */

.app {
    display: flex;
    height: 100vh;
    overflow: hidden;
}

.sidebar {
    width: 270px;
    min-width: 230px;
    background: #0d1020;
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    padding: 18px 13px;
    overflow-y: auto;
}

.brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px 25px;
}

.brand-mark {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    background: var(--purple);
    color: #090b16;
    font-size: 28px;
    font-weight: 900;
    border-radius: 10px;
}

.brand strong {
    display: block;
    letter-spacing: 2px;
}

.brand span {
    color: var(--purple);
    font-size: 11px;
    letter-spacing: 4px;
}

.switch-button {
    width: 100%;
    padding: 13px;
    margin-bottom: 7px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #171b30;
    color: white;
    text-align: left;
}

.switch-button:hover,
.switch-button.selected {
    background: #29234b;
    border-color: var(--purple);
}

.sidebar h3 {
    margin: 24px 9px 8px;
    color: var(--purple);
    font-size: 10px;
    letter-spacing: 1.5px;
}

.channel {
    display: block;
    width: 100%;
    padding: 10px;
    margin: 3px 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #b9bbca;
    text-align: left;
}

.channel:hover,
.channel.active {
    background: #24213e;
    color: white;
}

.profile {
    margin-top: auto;
    padding: 13px 5px 5px;
    border-top: 1px solid var(--line);
    display: flex;
    align-items: center;
    gap: 10px;
}

.avatar {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--purple);
    color: #090b16;
    font-weight: bold;
}

.profile-info {
    min-width: 0;
}

.profile strong,
.profile small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.profile small {
    color: var(--muted);
    font-size: 11px;
    margin-top: 4px;
}

.profile button {
    margin-left: auto;
    background: none;
    border: 0;
    color: white;
    font-size: 20px;
}

.main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.topbar {
    height: 65px;
    flex-shrink: 0;
    padding: 0 25px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--line);
    background: #0d1020;
}

.topbar button {
    background: #29234b;
    color: #c5b8ff;
    border: 1px solid var(--line);
    padding: 10px 15px;
    border-radius: 7px;
}

.online-dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    margin-right: 9px;
    background: #55d995;
    border-radius: 50%;
}

.messages {
    flex: 1;
    padding: 25px;
    overflow-y: auto;
}

.welcome {
    margin: auto;
    text-align: center;
    padding: 70px 15px;
}

.welcome-icon {
    margin: auto;
    width: 75px;
    height: 75px;
    display: grid;
    place-items: center;
    background: #29234b;
    color: var(--purple);
    border-radius: 20px;
    font-size: 42px;
    font-weight: bold;
}

.welcome h1 {
    margin-top: 25px;
    font-size: 28px;
}

.welcome p {
    color: #c0c1d0;
}

.muted {
    color: var(--muted);
    font-size: 13px;
}

.message {
    margin-bottom: 17px;
    padding: 13px;
    background: #14192b;
    border: 1px solid var(--line);
    border-radius: 9px;
    overflow-wrap: anywhere;
}

.message strong {
    color: var(--purple);
}

.message p {
    margin: 7px 0 0;
}

.message-form {
    display: flex;
    gap: 10px;
    padding: 17px 22px;
    border-top: 1px solid var(--line);
    background: #0d1020;
}

.message-form input {
    flex: 1;
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    outline: none;
    background: #171b30;
    color: white;
}

.message-form input:focus {
    border-color: var(--purple);
}

.message-form button {
    padding: 0 20px;
    border: 0;
    border-radius: 8px;
    background: var(--purple);
    color: #090b16;
    font-weight: bold;
}

/* MOBILE */

@media (max-width: 650px) {
    .sidebar {
        width: 190px;
        min-width: 170px;
        padding: 12px 8px;
    }

    .brand {
        padding-left: 4px;
    }

    .brand strong {
        font-size: 12px;
    }

    .topbar {
        padding: 0 12px;
    }

    .messages {
        padding: 12px;
    }

    .message-form {
        padding: 10px;
    }

    .message-form button {
        padding: 0 12px;
    }

    .welcome h1 {
        font-size: 22px;
    }
}

@media (max-width: 420px) {
    .sidebar {
        width: 145px;
        min-width: 145px;
    }

    .brand span {
        letter-spacing: 2px;
    }

    .switch-button {
        font-size: 11px;
        padding: 10px 6px;
    }

    .channel {
        font-size: 11px;
        padding: 9px 5px;
    }

    .sidebar h3 {
        font-size: 9px;
    }

    .auth-card {
        padding: 24px 18px;
    }
}
