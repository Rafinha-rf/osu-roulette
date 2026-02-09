import { buscarBeatmap, atualizarInterface } from './api.js';
import { OsuDatabase } from './db.js';
import { translations } from './languages.js';

const db = new OsuDatabase();

let currentLang = localStorage.getItem('osu_roulette_lang') || 'pt';

const sfxSpin = new Audio('./assets/sounds/welcome-to-osu.mp3');

sfxSpin.loop = true; 
sfxSpin.volume = 0.5;

let audioPreview = null;
let isMuted = localStorage.getItem('audio_muted') === 'true';

let currentRotation = 0;

function applyLanguage(lang) {
    const t = translations[lang];
    if (!t) return;

    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                el.placeholder = t[key];
            } else {
                el.innerText = t[key];
            }
        }
    });
    
    const historyList = document.getElementById('history-list');
    if (historyList && historyList.children.length === 0) {
        const emptyMsg = historyList.querySelector('p');
        if(emptyMsg) emptyMsg.innerText = t.emptyHistory;
    }
}

 

document.addEventListener('DOMContentLoaded', () => {
    renderizarHistorico();
    setupAudioControls();
    applyLanguage(currentLang);

    const spinBtn = document.getElementById('spin-button');
    spinBtn.addEventListener('click', girarRoleta);

    window.setLanguage = (lang) => {
        currentLang = lang;
        localStorage.setItem('osu_roulette_lang', lang);
        applyLanguage(lang);
    };

    document.getElementById('clear-history').addEventListener('click', async () => {
        await db.clearHistory();
        renderizarHistorico();
    });
});



async function girarRoleta() {
    const spinBtn = document.getElementById('spin-button');
    const wheel = document.getElementById('wheel');
    const resultCard = document.getElementById('result-card');
    const mystery = document.getElementById('mystery-overlay');
    const contentLayout = document.getElementById('content-layout');
    
    const filtros = {
        query: document.getElementById('search-filter').value,
        mode: document.getElementById('mode-filter').value,
        status: document.getElementById('status-filter').value,
        style: document.getElementById('style-filter').value,
        minSR: document.getElementById('stars-min').value,
        maxSR: document.getElementById('stars-max').value
    };

    if (parseFloat(filtros.minSR) > parseFloat(filtros.maxSR)) {
        showModal(translations[currentLang].err_min_max); 
        return;
    }

    spinBtn.disabled = true;

    if (mystery) mystery.classList.remove('opacity-0', 'pointer-events-none');

    if (contentLayout) contentLayout.classList.add('opacity-0');

    resultCard.style.boxShadow = 'none';
    resultCard.style.borderColor = 'rgba(255,255,255,0.1)';

    const imgBg = document.getElementById('map-bg');
    if (imgBg) {
        imgBg.src = "";
        imgBg.style.opacity = '0'; 
    }

    document.getElementById('map-title').innerText = "...";
    document.getElementById('map-artist').innerText = "";
    document.getElementById('map-mapper').innerText = "";

    if (audioPreview) {
        audioPreview.pause();
        audioPreview = null;
    }

    if (!isMuted) {
        sfxSpin.currentTime = 0;
        sfxSpin.play().catch(() => {});
    }


    currentRotation += (1800 + Math.random() * 360); 
    
    wheel.style.transition = "transform 4.5s cubic-bezier(0.15, 0, 0.15, 1)";
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    const apiPromise = buscarBeatmap(filtros);
    
    const animationPromise = new Promise(resolve => setTimeout(resolve, 4500));

    try {
        const [mapa] = await Promise.all([apiPromise, animationPromise]);

        sfxSpin.pause();
        sfxSpin.currentTime = 0;

        spinBtn.disabled = false;
        
        if (!mapa || mapa === "API_ERROR") {
            alert("Nenhum mapa encontrado! Tente outros filtros.");
            return;
        }

        atualizarInterface(mapa);
        playPreview(mapa.audio);
        await db.saveHistory(mapa);
        renderizarHistorico();
        
        if (typeof confetti === 'function') {
            confetti({ 
                colors: ['#ff66aa', '#66ccff', '#ffcc22'],
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

    } catch (error) {
        sfxSpin.pause();
        spinBtn.disabled = false;
        console.error(error);
        if (!mapa || mapa === "API_ERROR") {
        showModal(translations[currentLang].err_not_found);
        return;
        }
    }
}

function playPreview(url) {
    if (isMuted) return;

    audioPreview = new Audio(url);
    audioPreview.volume = 0.3;
    
    const playPromise = audioPreview.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => console.log("Autoplay bloqueado. Usuário precisa clicar."));
    }
    
    const btnPlay = document.getElementById('preview-btn');
    const icon = document.getElementById('play-icon');
    
    if (icon) icon.innerText = "pause";
    
    if (btnPlay) {
        btnPlay.onclick = () => {
            if (audioPreview.paused) {
                audioPreview.play();
                if (icon) icon.innerText = "pause";
            } else {
                audioPreview.pause();
                if (icon) icon.innerText = "play_arrow";
            }
        };
    }
}

function setupAudioControls() {
    const btn = document.getElementById('mute-btn');
    const icon = document.getElementById('mute-icon');

    const updateIcon = () => {
        if (icon) {
            icon.innerText = isMuted ? 'volume_off' : 'volume_up';
            icon.style.color = isMuted ? 'gray' : '#ff66aa';
        }
    };
    updateIcon();

    if (btn) {
        btn.addEventListener('click', () => {
            isMuted = !isMuted;
            localStorage.setItem('audio_muted', isMuted);
            if (audioPreview) audioPreview.muted = isMuted;
            updateIcon();
        });
    }
}

async function renderizarHistorico() {
    const list = document.getElementById('history-list');
    const items = await db.getAllHistory();
    
    if (items.length === 0) {
        list.innerHTML = `<p class="text-slate-500 col-span-full text-center text-sm">Nenhum drop recente.</p>`;
        return;
    }

    list.innerHTML = items.map(mapa => `
        <a href="${mapa.url}" target="_blank" class="group relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-card-dark hover:border-[${mapa.diffColor}] transition-all shadow-lg hover:shadow-[0_0_15px_${mapa.diffColor}40]">
            <img src="${mapa.cover}" class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
            
            <div class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm" style="background-color: ${mapa.diffColor}">
                ${parseFloat(mapa.sr).toFixed(2)} ★
            </div>
            
            <div class="absolute bottom-3 left-3 right-3">
                <p class="text-xs sm:text-sm text-white font-black truncate drop-shadow-md">${mapa.title}</p>
                <p class="text-[10px] text-slate-300 truncate">${mapa.artist}</p>
            </div>
        </a>
    `).join('');
}