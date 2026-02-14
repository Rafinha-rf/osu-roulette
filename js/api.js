import { translations } from './languages.js'; 

const MIRRORS = [
    'https://osu.direct/api/v2/search',
    'https://catboy.best/api/v2/search'
];

const DEFAULT_COVER = './assets/404-not-found.jpg';

const sessionHistory = new Set();

const MAPPER_POOLS = {
    'farm': ['Sotarks', 'Browiec', 'Reform', 'Log Off Now', 'A r M i N', 'Nevo', 'Monstrata', 'Taeyang', 'Kowari', 'Lami', 'Fieryrage', 'Kroytz', 'Andrea', 'Lasse', 'Xexxar'],
    'stream': ['Mazzerin', 'Seni', 'GoldenWolf', 'Shinsc', 'Blue Dragon', 'pkk', 'eiri-', 'Bokamin', 'ItsWinter', 'Chekito', 'Sotarks'],
    'jump': ['Sotarks', 'Nevo', 'Reform', 'Smokelind', 'Kymxh', 'Lohctes', 'Shmiklak', 'Ameth Rian', 'Gero', 'FuJu'],
    'tech': ['Hollow Wings', 'NeilPerry', 'Mir', 'ProfessionalBox', 'val0108', 'rrtyui', 'ktgster', 'fanzhen0019', 'Akali', 'Skystar', 'Camellia'],
    'speed': ['Aricin', 'Maddy', 'Seni', 'Lmt', 'TheKingHenry', 'Kroytz', 'Ekoro', 'Ciyus Miapah'],
    'stamina': ['Mazzerin', 'Seni', 'Aurealu', 'Idke', 'Bokamin', 'TheKingHenry']
};

export function getDifficultyColor(sr) {
    const stars = parseFloat(sr);
    if (stars < 2.0) return { color: "#88b300", name: "Easy", text: "white" };
    if (stars < 2.7) return { color: "#66ccff", name: "Normal", text: "white" };
    if (stars < 4.0) return { color: "#ffcc22", name: "Hard", text: "black" };
    if (stars < 5.3) return { color: "#ff66aa", name: "Insane", text: "white" };
    if (stars < 6.5) return { color: "#af45fc", name: "Expert", text: "white" };
    return { color: "#000000", name: "Expert+", text: "white" };
}

const STATUS_CONFIG = {
    'ranked':    { icon: 'check_circle', color: '#4ade80', key: 'opt_ranked' },
    'approved':  { icon: 'verified',     color: '#4ade80', key: 'opt_ranked' },
    'qualified': { icon: 'verified',     color: '#60a5fa', key: 'opt_ranked' },
    'loved':     { icon: 'favorite',     color: '#ff66aa', key: 'opt_loved' },
    'graveyard': { icon: 'sentiment_very_dissatisfied', color: '#94a3b8', key: 'opt_graveyard' },
    'pending':   { icon: 'hourglass_empty', color: '#facc15', key: 'opt_pending' }, 
    'wip':       { icon: 'construction',    color: '#facc15', key: 'opt_pending' },
    1: { icon: 'check_circle', color: '#4ade80', key: 'opt_ranked' },
    2: { icon: 'verified',     color: '#4ade80', key: 'opt_ranked' },
    3: { icon: 'verified',     color: '#60a5fa', key: 'opt_ranked' },
    4: { icon: 'favorite',     color: '#ff66aa', key: 'opt_loved' },
    0: { icon: 'hourglass_empty', color: '#facc15', key: 'opt_pending' },
    '-2': { icon: 'sentiment_very_dissatisfied', color: '#94a3b8', key: 'opt_graveyard' }
};

const STATUS_TO_INT = { 'ranked': 1, 'loved': 4, 'pending': 0, 'graveyard': -2, 'all': null };

function obterAnoMapSet(mapSet) {
    const keys = ['submitted_date', 'SubmittedDate', 'ranked_date', 'approved_date', 'last_updated'];
    for (const key of keys) {
        const val = mapSet[key];
        if (val) {
            let year = 9999;
            if (typeof val === 'string') {
                const d = new Date(val);
                if (!isNaN(d.getTime())) year = d.getFullYear();
            } else if (typeof val === 'number') {
                const ts = val < 10000000000 ? val * 1000 : val;
                year = new Date(ts).getFullYear();
            }
            if (year > 1990 && year < 3000) return year;
        }
    }
    return 9999;
}

export async function buscarBeatmap(filtros) {
    const maxAttempts = 15;
    let attempt = 0;
    let mirrorIndex = 0; 
    
    const statusMap = { 'ranked': 'ranked', 'loved': 'loved', 'pending': 'pending', 'graveyard': 'graveyard'};

    while (attempt < maxAttempts) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 100));

        let currentApi = MIRRORS[mirrorIndex];
        const temQuery = filtros.query && filtros.query.trim() !== "";
        
        let pageToTry;
        let maxPages = 50; 
        
        if (filtros.style === 'old') {
            maxPages = 20; 
        }

        if (temQuery) {
            pageToTry = 0; 
        } else {
            pageToTry = Math.floor(Math.random() * maxPages);
        }

        let statusToSearch;

        if (filtros.status === 'all') {
            const statusRoulette = ['ranked', 'ranked', 'graveyard', 'graveyard', 'loved', 'pending'];
            if (temQuery) {
                 const statusList = ['ranked', 'graveyard', 'loved', 'pending', 'graveyard', 'ranked'];
                 statusToSearch = statusList[attempt % statusList.length];
            } else {
                statusToSearch = statusRoulette[Math.floor(Math.random() * statusRoulette.length)];
            }
        } else {
            statusToSearch = statusMap[filtros.status] || 'ranked';
        }

        let finalStatus = STATUS_TO_INT[statusToSearch];

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            let queryParts = [];
            const params = new URLSearchParams();
            
            if (temQuery) {
                queryParts.push(filtros.query);
            }
            else if (filtros.style && filtros.style !== 'all') {
                switch (filtros.style) {
                    case 'farm': 
                    case 'stream':
                    case 'jump':
                    case 'tech':
                    case 'speed':
                    case 'stamina':
                        const pool = MAPPER_POOLS[filtros.style];
                        if (pool) {
                            const randomMapper = pool[Math.floor(Math.random() * pool.length)];
                            queryParts.push(`creator="${randomMapper}"`);
                        }
                        break;
                    
                    case 'old': 
                        params.append('sort', 'id:asc');
                        
                        if (!filtros.status || filtros.status === 'all' || finalStatus === -2) {
                            if (Math.random() > 0.2) finalStatus = 1; 
                        }
                        break;

                    case 'long': 
                        break;
                }
            }
            
            if (queryParts.length > 0) {
                params.append('q', queryParts.join(' '));
            }

            if (filtros.style !== 'old' && !temQuery) {
                const sortOptions = [
                    'id:desc',
                    'plays:desc',
                    'favourites:desc',
                    'rating:desc'
                ];
                const randomSort = sortOptions[Math.floor(Math.random() * sortOptions.length)];
                params.append('sort', randomSort);
            }
            
            params.append('mode', filtros.mode || 0);
            if (finalStatus !== null && finalStatus !== undefined) params.append('status', finalStatus);
            
            params.append('p', pageToTry);
            params.append('pageSize', 50);

            const response = await fetch(`${currentApi}?${params.toString()}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) { 
                mirrorIndex = (mirrorIndex + 1) % MIRRORS.length; 
                await new Promise(r => setTimeout(r, 200));
                continue; 
            }
            
            const json = await response.json();
            
            if (json.error) {
                mirrorIndex = (mirrorIndex + 1) % MIRRORS.length; 
                await new Promise(r => setTimeout(r, 200));
                continue;
            }

            if (!json || json.length === 0) {
                if (temQuery && filtros.status !== 'all') break; 
                await new Promise(r => setTimeout(r, 100));
                attempt++;
                continue;
            }

            const candidatos = json.filter(mapSet => {
                if (!mapSet.beatmaps) return false;
                if (['farm', 'stream', 'jump', 'tech', 'speed', 'stamina'].includes(filtros.style)) {
                    const pool = MAPPER_POOLS[filtros.style];
                    const creatorName = mapSet.creator.toLowerCase();
                    const poolLower = pool.map(m => m.toLowerCase());
                    
                    if (!poolLower.includes(creatorName)) return false; 
                }

                if (filtros.style === 'old') {
                    const setId = mapSet.id || mapSet.beatmapset_id || 999999;
                    if (setId > 100000) return false;

                    const ano = obterAnoMapSet(mapSet);
                    if (ano > 2012) return false;
                }

                const hasValidDiff = mapSet.beatmaps.some(diff => {
                    const matchSR = diff.difficulty_rating >= parseFloat(filtros.minSR) && 
                                    diff.difficulty_rating <= parseFloat(filtros.maxSR);
                    const matchMode = diff.mode_int == (filtros.mode || 0);
                    
                    if (!matchSR || !matchMode) return false;
                    if (filtros.style === 'long' && diff.total_length < 240) return false;
                    return true;
                });

                if (!hasValidDiff) return false;

                if (temQuery) {
                    const q = filtros.query.toLowerCase();
                    const matchCreator = mapSet.creator.toLowerCase().includes(q);
                    const matchArtist = mapSet.artist.toLowerCase().includes(q);
                    const matchTitle = mapSet.title.toLowerCase().includes(q);
                    const matchDiffName = mapSet.beatmaps.some(diff => diff.version.toLowerCase().includes(q));
                    if (!matchCreator && !matchArtist && !matchTitle && !matchDiffName) return false;
                }
                return true;
            });

            const candidatosNovos = candidatos.filter(m => !sessionHistory.has(m.id));

            if (candidatosNovos.length > 0) {
                const mapSet = candidatosNovos[Math.floor(Math.random() * candidatosNovos.length)];
                sessionHistory.add(mapSet.id);
                return normalizeBeatmap(mapSet, filtros.minSR, filtros.maxSR, filtros.query, filtros.style);
            }
            
            attempt++;

        } catch (error) {
            mirrorIndex = (mirrorIndex + 1) % MIRRORS.length;
            await new Promise(r => setTimeout(r, 300));
            attempt++;
        }
    }

    return null;
}

function normalizeBeatmap(mapSet, minSR, maxSR, query = "", style = "") {
    let targetDiff = null;
    const q = query ? query.toLowerCase() : "";

    const validDiffs = mapSet.beatmaps.filter(child => 
        child.difficulty_rating >= minSR && 
        child.difficulty_rating <= maxSR &&
        child.mode_int == 0
    ).sort((a, b) => b.difficulty_rating - a.difficulty_rating);

    if (style === 'long') {
        targetDiff = validDiffs.find(d => d.total_length >= 240);
    } 
    else if (q) {
        targetDiff = validDiffs.find(d => d.version.toLowerCase().includes(q));
    }

    if (!targetDiff && validDiffs.length > 0) targetDiff = validDiffs[0];
    if (!targetDiff) targetDiff = mapSet.beatmaps[0];

    const diffInfo = getDifficultyColor(targetDiff.difficulty_rating);
    
    let coverUrl = `https://assets.ppy.sh/beatmaps/${mapSet.id}/covers/cover.jpg`;
    if (mapSet.covers && mapSet.covers.cover) {
        coverUrl = mapSet.covers.cover;
    }
    
    return {
        id: mapSet.id,
        diffId: targetDiff.id,
        title: mapSet.title,
        artist: mapSet.artist,
        mapper: mapSet.creator, 
        cover: coverUrl,
        card: mapSet.covers?.card || `https://assets.ppy.sh/beatmaps/${mapSet.id}/covers/card.jpg`,
        audio: `https://b.ppy.sh/preview/${mapSet.id}.mp3`,
        bpm: mapSet.bpm,
        length: formatLength(targetDiff.total_length),
        sr: targetDiff.difficulty_rating,
        diffColor: diffInfo.color,
        diffTextColor: diffInfo.text,
        diffName: targetDiff.version,
        status: mapSet.status,
        url: `https://osu.ppy.sh/beatmapsets/${mapSet.id}`,
        download: `https://catboy.best/d/${mapSet.id}`,
        directLink: `osu://b/${targetDiff.id}` 
    };
}

function formatLength(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function atualizarInterface(mapa) {
    if (!mapa) return;

    const imgBg = document.getElementById('map-bg');
    const title = document.getElementById('map-title');
    const artist = document.getElementById('map-artist');
    const mapper = document.getElementById('map-mapper');
    const bpm = document.getElementById('map-bpm');
    const length = document.getElementById('map-length');
    const stars = document.getElementById('map-stars');
    
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    
    const btnDl = document.getElementById('btn-download');
    const btnWeb = document.getElementById('btn-website');
    const btnOpen = document.getElementById('btn-open'); 

    const contentLayout = document.getElementById('content-layout');
    const mystery = document.getElementById('mystery-overlay');

    title.innerText = mapa.title;
    artist.innerText = mapa.artist;
    mapper.innerText = mapa.mapper;
    bpm.innerText = mapa.bpm;
    length.innerText = mapa.length;
    
    stars.innerText = parseFloat(mapa.sr).toFixed(2);
    const starContainer = stars.parentElement;
    starContainer.style.backgroundColor = mapa.diffColor;
    starContainer.style.color = mapa.diffTextColor || 'white';
    
    const starIconElem = starContainer.querySelector('.material-symbols-outlined');
    if(starIconElem) starIconElem.style.color = mapa.diffTextColor || 'white';
    
    const config = STATUS_CONFIG[mapa.status] || STATUS_CONFIG['graveyard'];
    
    statusIcon.innerText = config.icon;
    statusIcon.style.color = config.color;
    
    const currentLang = localStorage.getItem('osu_roulette_lang') || 'pt';

    let translatedStatus = translations[currentLang][config.key] || mapa.status;
    statusText.innerText = translatedStatus;
    statusText.style.color = config.color;

    btnDl.href = mapa.download;
    if (btnWeb) btnWeb.href = mapa.url;
    if (btnOpen) btnOpen.href = mapa.directLink;

    const downloadingImage = new Image();
    downloadingImage.src = mapa.cover;

    downloadingImage.onload = function() {
        imgBg.src = this.src;
        imgBg.style.opacity = '1'; 
        if (mystery) mystery.classList.add('opacity-0', 'pointer-events-none');
        if (contentLayout) {
            contentLayout.classList.remove('opacity-0');
            const card = document.getElementById('result-card');
            card.style.borderColor = `${mapa.diffColor}60`;
            card.style.boxShadow = `0 0 30px ${mapa.diffColor}20`;
        }
    };

    downloadingImage.onerror = function() {
        imgBg.src = DEFAULT_COVER; 
        imgBg.style.opacity = '1';
        if (mystery) mystery.classList.add('opacity-0', 'pointer-events-none');
        if (contentLayout) contentLayout.classList.remove('opacity-0');
    };
}