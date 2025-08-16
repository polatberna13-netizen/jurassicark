<template>
    <header class="header">
        <div class="container header-container">
            <span class="wordmark">JURASSIC ARK Store</span>
            <nav class="nav">
                <a class="nav-link" target="_blank" href="https://discord.gg/erzjsP9Kg8">
                    <i class="bi bi-discord"></i>
                </a>
                <a class="nav-link" target="_blank" href="https://ark-servers.net/server/402996/">
                    Vote <i class="bi bi-hand-thumbs-up-fill"></i>
                </a>
            </nav>
        </div>
    </header>
</template>
<style scoped>
.header {
    background: #171a21;
    position: sticky;
    top: 0;
    z-index: 50;
}

.header-container {
    margin: 0 auto;
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.wordmark {
    font-size: 3rem;
    font-weight: 800;
}

.nav {
    display: flex;
    gap: 18px;
    align-items: center;
    overflow-x: auto;
    font-size: 2rem;
}

.nav-link {
    position: relative;
    display: flex;
    align-items: center;
    background-color: rgba(103, 112, 123, .2);
    padding: 0 1rem;
    border: 0;
    cursor: pointer;
    font-weight: 700;
    letter-spacing: .02em;
    color: #c7d5e0;
    transition: color .15s ease;
}

.nav-link:hover {
    color: #ffffff;
}
</style>
