import { buscarBeatmap, atualizarInterface } from './api.js';
import { OsuDatabase } from './db.js';
import { translations } from './languages.js';

const db = new OsuDatabase();
let currentLang = localStorage.getItem('osu_roulette_lang') || 'pt';
let isSpinning = false;

const SPIN_DURATION_MS = 10000;

const sfxSpin = new Audio('./assets/sounds/welcome-to-osu.mp3');
sfxSpin.loop = false; 
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
        const emptyP = historyList.querySelector('p');
        if (emptyP) emptyP.innerText = t.emptyHistory || "Nenhum drop recente.";
    }
}

function showModal(titleKey, messageKey) {
    const modal = document.getElementById('custom-modal');
    const modalBox = document.getElementById('modal-box');
    const elTitle = document.getElementById('modal-title');
    const elMsg = document.getElementById('modal-message');
    const elBtn = document.getElementById('modal-close');
    
    const lang = localStorage.getItem('osu_roulette_lang') || 'pt';
    const t = translations[lang];

    elTitle.innerText = t[titleKey] || titleKey || "Ops!";
    elMsg.innerText = t[messageKey] || messageKey || "Erro desconhecido.";
    elBtn.innerText = t['btn_close'] || "Ok";

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modalBox.classList.remove('scale-90');
    modalBox.classList.add('scale-100');
}

function hideModal() {
    const modal = document.getElementById('custom-modal');
    const modalBox = document.getElementById('modal-box');
    
    modal.classList.add('opacity-0', 'pointer-events-none');
    modalBox.classList.remove('scale-100');
    modalBox.classList.add('scale-90');
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

    document.getElementById('modal-close').addEventListener('click', hideModal);
    document.getElementById('modal-overlay').addEventListener('click', hideModal);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal();
        
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault(); 
            girarRoleta();
        }
    });
});

async function girarRoleta() {
    if (isSpinning) return;

    isSpinning = true;
    const spinBtn = document.getElementById('spin-button');
    spinBtn.disabled = true;

    const filtros = {
        query: document.getElementById('search-filter').value,
        mode: document.getElementById('mode-filter').value,
        status: document.getElementById('status-filter').value,
        style: document.getElementById('style-filter').value,
        minSR: document.getElementById('stars-min').value,
        maxSR: document.getElementById('stars-max').value
    };
    
    if (parseFloat(filtros.minSR) > parseFloat(filtros.maxSR)) {
        showModal('error_title', 'err_min_max');
        isSpinning = false; 
        spinBtn.disabled = false;
        return;
    }

    if (audioPreview) {
        audioPreview.pause();
        audioPreview = null;
    }

    sfxSpin.muted = isMuted;
    if (!isMuted) {
        sfxSpin.currentTime = 0;
        sfxSpin.play().catch(() => {});
    }

    const wheel = document.getElementById('wheel');
    const resultCard = document.getElementById('result-card');
    const mystery = document.getElementById('mystery-overlay');
    const contentLayout = document.getElementById('content-layout');

    if (contentLayout) contentLayout.classList.add('opacity-0');
    if (mystery) mystery.classList.remove('opacity-0', 'pointer-events-none');
    
    resultCard.style.boxShadow = 'none';
    resultCard.style.borderColor = 'rgba(255,255,255,0.1)';

    const imgBg = document.getElementById('map-bg');
    if (imgBg) {
        imgBg.style.opacity = '0'; 
    }

    currentRotation += (3080 + Math.random() * 360); 
    
    wheel.style.transition = `transform ${SPIN_DURATION_MS / 1000}s cubic-bezier(0.15, 0, 0.15, 1)`;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    const apiPromise = buscarBeatmap(filtros);
    const animationPromise = new Promise(resolve => setTimeout(resolve, SPIN_DURATION_MS));

    try {
        const [mapa] = await Promise.all([apiPromise, animationPromise]);

        sfxSpin.pause();
        sfxSpin.currentTime = 0;
        
        if (!mapa) {
            showModal('error_title', 'error_not_found');
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
        console.error(error);
        sfxSpin.pause();
        showModal('error_title', 'error_not_found');
    } finally {
        isSpinning = false; 
        spinBtn.disabled = false;
    }
}

function playPreview(url) {
    if (audioPreview) {
        audioPreview.pause();
        audioPreview = null;
    }

    audioPreview = new Audio(url);
    audioPreview.volume = 0.3;
    audioPreview.muted = isMuted;
    
    const playPromise = audioPreview.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {});
    }
    
    const btnPlay = document.getElementById('preview-btn');
    const icon = document.getElementById('play-icon');
    
    if (icon) icon.innerText = "pause";
    
    if (btnPlay) {
        btnPlay.onclick = () => {
            if (!audioPreview) return;
            
            if (audioPreview.paused) {
                audioPreview.play();
                if (icon) icon.innerText = "pause";
            } else {
                audioPreview.pause();
                if (icon) icon.innerText = "play_arrow";
            }
        };
    }
    
    audioPreview.onended = () => {
        if (icon) icon.innerText = "play_arrow";
    };
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
            
            if (audioPreview) {
                audioPreview.muted = isMuted;
                if (!isMuted && audioPreview.paused) {
                    audioPreview.play().catch(() => {});
                }
            }
            
            if (isSpinning && !sfxSpin.paused) {
                 sfxSpin.muted = isMuted;
            }
            
            updateIcon();
        });
    }
}

async function renderizarHistorico() {
    const list = document.getElementById('history-list');
    const items = await db.getAllHistory();
    const t = translations[currentLang];
    
    const defaultCover = './assets/404-not-found.jpg';
    
    if (items.length === 0) {
        list.innerHTML = `<p class="text-slate-500 col-span-full text-center text-sm">${t?.emptyHistory || "Nenhum drop recente."}</p>`;
        return;
    }
    
    list.innerHTML = items.map(mapa => {
        const imgUrl = mapa.cover || defaultCover;

        return `
            <a href="${mapa.url}" target="_blank" 
               class="group relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-card-dark transition-all shadow-lg"
               style="--hover-color: ${mapa.diffColor}"
               onmouseover="this.style.borderColor=this.style.getPropertyValue('--hover-color'); this.style.boxShadow='0 0 15px ' + this.style.getPropertyValue('--hover-color') + '40'"
               onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.boxShadow='none'">
                
                <img src="${imgUrl}" 
                     onerror="this.onerror=null; this.src='${defaultCover}';" 
                     class="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity">
                
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                
                <div class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm" style="background-color: ${mapa.diffColor}">
                    ${parseFloat(mapa.sr).toFixed(2)} ★
                </div>
                
                <div class="absolute bottom-3 left-3 right-3">
                    <p class="text-xs sm:text-sm text-white font-black truncate drop-shadow-md">${mapa.title}</p>
                    <p class="text-[10px] text-slate-300 truncate">${mapa.artist}</p>
                </div>
            </a>
        `;
    }).join('');
}