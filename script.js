const heroGrid = document.getElementById('heroGrid');
const selectionCount = document.getElementById('selectionCount');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const playerSlots = document.getElementById('playerSlots');
const enemySlots = document.getElementById('enemySlots');
const battleLog = document.getElementById('battleLog');
const roundCounter = document.getElementById('roundCounter');

const MAX_SELECTION = 3;
let selectedIds = [];
let battleInterval;
let gameState = null;

const heroes = [
    {
        id: 'ember',
        name: 'Ember Knight',
        role: 'Bruiser',
        power: 'Flame Sweep',
        color: '#f97316',
        stats: { hp: 120, attack: 22, speed: 8 },
        description: 'Sweeping slash deals splash damage and burns foes for 2 rounds.',
        ability(actor, target, allies, enemies, log) {
            const splashTargets = enemies.filter(e => e.alive && e.id !== target.id).slice(0, 1);
            const damage = actor.attack;
            dealDamage(target, damage, log, `${actor.name} cleaves ${target.name}`);
            splashTargets.forEach(t => dealDamage(t, Math.round(damage * 0.5), log, `${actor.name} scorches ${t.name}`));
            applyStatus(target, 'burn', 2, log, `${target.name} is burning!`);
        }
    },
    {
        id: 'storm',
        name: 'Storm Weaver',
        role: 'Mage',
        power: 'Chain Lightning',
        color: '#38bdf8',
        stats: { hp: 90, attack: 26, speed: 10 },
        description: 'Jolts a target then chains to another enemy for reduced damage.',
        ability(actor, target, allies, enemies, log) {
            dealDamage(target, actor.attack + 6, log, `${actor.name} shocks ${target.name}`);
            const chain = enemies.find(e => e.alive && e.id !== target.id);
            if (chain) {
                dealDamage(chain, Math.round(actor.attack * 0.6), log, `Lightning arcs to ${chain.name}`);
            }
        }
    },
    {
        id: 'aurora',
        name: 'Aurora Sage',
        role: 'Support',
        power: 'Radiant Bloom',
        color: '#a855f7',
        stats: { hp: 95, attack: 16, speed: 9 },
        description: 'Heals the lowest ally and grants a small shield.',
        ability(actor, target, allies, enemies, log) {
            const ally = allies.filter(a => a.alive).sort((a, b) => a.hp - b.hp)[0];
            if (ally) {
                heal(ally, 18, log, `${actor.name} restores ${ally.name}`);
                addShield(ally, 12, log, `${ally.name} gains a shield`);
            }
        }
    },
    {
        id: 'goliath',
        name: 'Goliath',
        role: 'Tank',
        power: 'Earth Bulwark',
        color: '#facc15',
        stats: { hp: 150, attack: 18, speed: 7 },
        description: 'Taunts foes and gains a massive shield for 2 rounds.',
        ability(actor, target, allies, enemies, log) {
            applyStatus(actor, 'taunt', 2, log, `${actor.name} taunts everyone!`);
            addShield(actor, 30, log, `${actor.name} fortifies!`);
        }
    },
    {
        id: 'shade',
        name: 'Shadowblade',
        role: 'Assassin',
        power: 'Night Strike',
        color: '#64748b',
        stats: { hp: 85, attack: 28, speed: 12 },
        description: 'Ignores shields and has a chance to stun for 1 round.',
        ability(actor, target, allies, enemies, log) {
            dealDamage(target, actor.attack + 8, log, `${actor.name} strikes from the shadows`, true);
            if (Math.random() < 0.35) {
                applyStatus(target, 'stun', 1, log, `${target.name} is stunned!`);
            }
        }
    },
    {
        id: 'frost',
        name: 'Frost Archer',
        role: 'Ranger',
        power: 'Piercing Shot',
        color: '#60a5fa',
        stats: { hp: 100, attack: 20, speed: 11 },
        description: 'High-speed shot that slows enemies (reduces speed) for 2 rounds.',
        ability(actor, target, allies, enemies, log) {
            dealDamage(target, actor.attack, log, `${actor.name} pierces ${target.name}`);
            applyStatus(target, 'slow', 2, log, `${target.name} is slowed.`);
        }
    },
    {
        id: 'verdant',
        name: 'Verdant Warden',
        role: 'Druid',
        power: 'Nature Pulse',
        color: '#22c55e',
        stats: { hp: 110, attack: 17, speed: 9 },
        description: 'Heals allies over time and poisons enemies for chip damage.',
        ability(actor, target, allies, enemies, log) {
            allies.filter(a => a.alive).forEach(a => heal(a, 8, log, `${actor.name} rejuvenates ${a.name}`));
            enemies.filter(e => e.alive).forEach(e => applyStatus(e, 'burn', 2, log, `${e.name} is poisoned`));
        }
    },
    {
        id: 'celest',
        name: 'Celestial Monk',
        role: 'Monk',
        power: 'Chi Flow',
        color: '#38f3ab',
        stats: { hp: 105, attack: 19, speed: 10 },
        description: 'If no allies are down, deals bonus damage; otherwise revives 1 ally with low HP.',
        ability(actor, target, allies, enemies, log) {
            const fallen = allies.find(a => !a.alive);
            if (fallen) {
                revive(fallen, 35, log, `${actor.name} revives ${fallen.name}`);
            } else {
                dealDamage(target, actor.attack + 10, log, `${actor.name} unleashes chi`);
            }
        }
    },
    {
        id: 'emberfox',
        name: 'Emberfox',
        role: 'Trickster',
        power: 'Foxfire Mirage',
        color: '#fb7185',
        stats: { hp: 92, attack: 18, speed: 13 },
        description: 'Creates mirages increasing evasion; counters when shielded.',
        ability(actor, target, allies, enemies, log) {
            applyStatus(actor, 'evade', 2, log, `${actor.name} becomes elusive.`);
            addShield(actor, 10, log, `${actor.name} weaves a mirage shield`);
        }
    },
    {
        id: 'voltage',
        name: 'Voltage Titan',
        role: 'Juggernaut',
        power: 'Overcharge',
        color: '#f472b6',
        stats: { hp: 140, attack: 21, speed: 8 },
        description: 'Charges for extra damage next attack and gains a shield.',
        ability(actor, target, allies, enemies, log) {
            applyStatus(actor, 'charged', 2, log, `${actor.name} is overcharged!`);
            addShield(actor, 16, log, `${actor.name} crackles with power`);
        }
    }
];

function createCard(hero) {
    const template = document.getElementById('heroCardTemplate');
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector('.role').textContent = hero.role;
    card.querySelector('.power').textContent = hero.power;
    card.querySelector('.name').textContent = hero.name;
    card.querySelector('.ability-name').textContent = hero.power;
    card.querySelector('.description').textContent = hero.description;
    card.querySelector('.hp').textContent = `HP ${hero.stats.hp}`;
    card.querySelector('.attack').textContent = `ATK ${hero.stats.attack}`;
    card.querySelector('.speed').textContent = `SPD ${hero.stats.speed}`;
    card.style.borderColor = hero.color;
    card.addEventListener('click', () => toggleSelect(hero.id, card));
    return card;
}

function renderRoster() {
    heroes.forEach(hero => heroGrid.appendChild(createCard(hero)));
}

function toggleSelect(id, card) {
    if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(h => h !== id);
        card.classList.remove('selected');
    } else {
        if (selectedIds.length >= MAX_SELECTION) return;
        selectedIds.push(id);
        card.classList.add('selected');
    }
    selectionCount.textContent = `${selectedIds.length} / ${MAX_SELECTION} selected`;
    startButton.disabled = selectedIds.length !== MAX_SELECTION;
}

function resetDraft() {
    selectedIds = [];
    selectionCount.textContent = `0 / ${MAX_SELECTION} selected`;
    startButton.disabled = true;
    document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
    clearBattlefield();
}

function clearBattlefield() {
    playerSlots.innerHTML = '';
    enemySlots.innerHTML = '';
    battleLog.innerHTML = '';
    roundCounter.textContent = 'Round 0';
    if (battleInterval) clearTimeout(battleInterval);
    gameState = null;
}

function pickEnemyTeam() {
    const pool = heroes.filter(h => !selectedIds.includes(h.id));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, MAX_SELECTION).map(copyHeroState);
}

function copyHeroState(hero) {
    return {
        ...hero,
        hp: hero.stats.hp,
        maxHp: hero.stats.hp,
        attack: hero.stats.attack,
        speed: hero.stats.speed,
        alive: true,
        status: { burn: 0, shield: 0, regen: 0, stun: 0, taunt: 0, slow: 0, evade: 0, charged: 0 }
    };
}

function startBattle() {
    const playerTeam = selectedIds.map(id => heroes.find(h => h.id === id)).map(copyHeroState);
    const enemyTeam = pickEnemyTeam();
    gameState = { playerTeam, enemyTeam, round: 1, running: true };
    renderTeams(playerTeam, enemyTeam);
    logEvent('Battle starts!');
    nextRound();
}

function renderTeams(playerTeam, enemyTeam) {
    playerSlots.innerHTML = '';
    enemySlots.innerHTML = '';
    playerTeam.forEach(hero => playerSlots.appendChild(createFighter(hero)));
    enemyTeam.forEach(hero => enemySlots.appendChild(createFighter(hero)));
}

function createFighter(hero) {
    const template = document.getElementById('fighterTemplate');
    const el = template.content.firstElementChild.cloneNode(true);
    el.dataset.id = hero.id;
    el.querySelector('.f-name').textContent = hero.name;
    el.querySelector('.f-role').textContent = hero.role;
    updateFighter(el, hero);
    return el;
}

function updateFighter(el, hero) {
    const hpPercent = Math.max(0, Math.round((hero.hp / hero.maxHp) * 100));
    const healthFill = el.querySelector('.health-fill');
    healthFill.style.width = `${hpPercent}%`;
    healthFill.style.background = `linear-gradient(90deg, ${hero.color}, #16a34a)`;
    el.querySelector('.status-line').innerHTML = renderStatuses(hero);
    if (!hero.alive) {
        el.classList.add('fainted');
        el.style.opacity = 0.4;
    }
}

function renderStatuses(hero) {
    const statuses = [];
    if (hero.status.burn > 0) statuses.push(`<span class="status-pill burn">Burn ${hero.status.burn}</span>`);
    if (hero.status.regen > 0) statuses.push(`<span class="status-pill regen">Regen ${hero.status.regen}</span>`);
    if (hero.status.shield > 0) statuses.push(`<span class="status-pill shield">Shield ${hero.status.shield}</span>`);
    if (hero.status.stun > 0) statuses.push(`<span class="status-pill stun">Stun</span>`);
    if (hero.status.evade > 0) statuses.push(`<span class="status-pill">Evade ${hero.status.evade}</span>`);
    if (hero.status.taunt > 0) statuses.push(`<span class="status-pill">Taunt</span>`);
    if (hero.status.slow > 0) statuses.push(`<span class="status-pill">Slow ${hero.status.slow}</span>`);
    if (hero.status.charged > 0) statuses.push(`<span class="status-pill">Charged</span>`);
    return statuses.join('');
}

function logEvent(text) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = text;
    battleLog.appendChild(entry);
    battleLog.scrollTop = battleLog.scrollHeight;
}

function getFighterElement(hero) {
    return document.querySelector(`.fighter[data-id="${hero.id}"]`);
}

function animateHit(hero) {
    const el = getFighterElement(hero);
    if (!el) return;
    el.classList.add('hit');
    setTimeout(() => el.classList.remove('hit'), 400);
}

function animateHeal(hero) {
    const el = getFighterElement(hero);
    if (!el) return;
    el.classList.add('heal');
    setTimeout(() => el.classList.remove('heal'), 800);
}

function nextRound() {
    if (!gameState || !gameState.running) return;
    roundCounter.textContent = `Round ${gameState.round}`;

    const order = [...gameState.playerTeam, ...gameState.enemyTeam]
        .filter(h => h.alive)
        .sort((a, b) => (b.speed - (b.status.slow ? 2 : 0)) - (a.speed - (a.status.slow ? 2 : 0)));

    executeTurn(order, 0);
}

function executeTurn(order, idx) {
    if (!gameState || !gameState.running) return;
    if (idx >= order.length) {
        gameState.round += 1;
        battleInterval = setTimeout(nextRound, 700);
        return;
    }

    const actor = order[idx];
    if (!actor.alive) {
        executeTurn(order, idx + 1);
        return;
    }

    processStatuses(actor);
    if (!actor.alive) {
        executeTurn(order, idx + 1);
        return;
    }

    const targetTeam = gameState.playerTeam.includes(actor) ? gameState.enemyTeam : gameState.playerTeam;
    const allies = gameState.playerTeam.includes(actor) ? gameState.playerTeam : gameState.enemyTeam;

    if (actor.status.stun > 0) {
        logEvent(`<strong>${actor.name}</strong> is stunned and misses the turn.`);
        actor.status.stun -= 1;
        executeTurn(order, idx + 1);
        return;
    }

    const taunter = targetTeam.find(t => t.alive && t.status.taunt > 0);
    const target = taunter || targetTeam.find(t => t.alive);
    if (!target) {
        finishBattle();
        return;
    }

    const actorEl = getFighterElement(actor);
    if (actorEl) actorEl.classList.add('active');

    setTimeout(() => {
        actor.ability(actor, target, allies, targetTeam, logEvent);
        const bonus = actor.status.charged > 0 ? 8 : 0;
        if (bonus && target.alive) {
            dealDamage(target, bonus, logEvent, `${actor.name} overcharge bonus`);
            actor.status.charged -= 1;
        }
        actor.status.taunt = Math.max(0, actor.status.taunt - 1);
        actor.status.evade = Math.max(0, actor.status.evade - 1);
        actor.status.slow = Math.max(0, actor.status.slow - 1);
        if (!checkVictory()) {
            if (actorEl) actorEl.classList.remove('active');
            battleInterval = setTimeout(() => executeTurn(order, idx + 1), 550);
        }
    }, 250);
}

function processStatuses(hero) {
    if (!hero.alive) return;
    if (hero.status.burn > 0) {
        dealDamage(hero, 6, logEvent, `${hero.name} suffers burn.`);
        hero.status.burn -= 1;
    }
    if (!hero.alive) return;
    if (hero.status.regen > 0) {
        heal(hero, 8, logEvent, `${hero.name} regenerates.`);
        hero.status.regen -= 1;
    }
}

function checkVictory() {
    const playerAlive = gameState.playerTeam.some(h => h.alive);
    const enemyAlive = gameState.enemyTeam.some(h => h.alive);
    if (playerAlive && enemyAlive) return false;
    finishBattle(playerAlive);
    return true;
}

function finishBattle(playerWon) {
    gameState.running = false;
    if (playerWon === undefined) {
        playerWon = gameState.playerTeam.some(h => h.alive);
    }
    const message = playerWon ? 'You win! 🎉' : 'Defeat... try a new draft.';
    logEvent(`<strong>${message}</strong>`);
    startButton.disabled = false;
}

function dealDamage(target, amount, log, text, ignoreShield = false) {
    if (!target.alive) return;
    if (target.status.evade > 0 && Math.random() < 0.4) {
        target.status.evade -= 1;
        log(`${target.name} evades the strike!`);
        return;
    }
    let remaining = amount;
    if (!ignoreShield && target.status.shield > 0) {
        const absorbed = Math.min(target.status.shield, remaining);
        target.status.shield -= absorbed;
        remaining -= absorbed;
    }
    target.hp -= remaining;
    if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        log(`${text} for <span class="damage">${amount}</span> dmg. ${target.name} is down!`);
    } else {
        log(`${text} for <span class="damage">${amount}</span> dmg.`);
    }
    animateHit(target);
    updateFighter(getFighterElement(target), target);
}

function heal(target, amount, log, text) {
    if (!target.alive) return;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    log(`${text} for <span class="heal">${amount}</span> HP.`);
    animateHeal(target);
    updateFighter(getFighterElement(target), target);
}

function addShield(target, value, log, text) {
    target.status.shield += value;
    log(text);
    updateFighter(getFighterElement(target), target);
}

function applyStatus(target, status, duration, log, text) {
    target.status[status] = Math.max(target.status[status], duration);
    log(text);
    updateFighter(getFighterElement(target), target);
}

function revive(target, percent, log, text) {
    if (target.alive) return;
    target.alive = true;
    target.hp = Math.round((percent / 100) * target.maxHp);
    log(text);
    updateFighter(getFighterElement(target), target);
}

startButton.addEventListener('click', () => {
    startButton.disabled = true;
    clearBattlefield();
    startBattle();
});

resetButton.addEventListener('click', resetDraft);
renderRoster();
