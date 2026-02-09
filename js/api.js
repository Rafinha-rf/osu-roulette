const API_BASE = 'https://api.nerinyan.moe/search';

export function getDifficultyColor(sr) {
    const stars = parseFloat(sr);
    if (stars < 2.0) return { color: "#88b300", name: "Easy", text: "white" };
    if (stars < 2.7) return { color: "#66ccff", name: "Normal", text: "white" };
    if (stars < 4.0) return { color: "#ffcc22", name: "Hard", text: "black" };
    if (stars < 5.3) return { color: "#ff66aa", name: "Insane", text: "white" };
    if (stars < 6.5) return { color: "#af45fc", name: "Expert", text: "white" };
    return { color: "#000000", name: "Expert+", text: "white" };
}

export async function buscarBeatmap(filtros) {
    const maxAttempts = 3;
    let attempt = 0;
    
    const statusMap = { 'ranked': 'ranked', 'loved': 'loved', 'pending': 'pending', 'graveyard': 'graveyard' };
    const status = statusMap[filtros.status] || 'ranked';

    while (attempt < maxAttempts) {
        let pageToTry;
        
        if ((filtros.query && filtros.query.trim() !== "") || (filtros.style && filtros.style !== 'all')) {
            pageToTry = attempt; 
        } else {
            pageToTry = Math.floor(Math.random() * 100);
        }

        console.log(`Tentativa ${attempt + 1}: Estilo ${filtros.style} | Pág ${pageToTry} (Buscando 100 mapas)...`);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            let queryParts = [];

            if (filtros.query && filtros.query.trim() !== "") {
                queryParts.push(filtros.query);
            }

            if (filtros.style && filtros.style !== 'all') {
                switch (filtros.style) {
                    case 'farm': queryParts.push('farm'); break;
                    case 'stream': queryParts.push('stream'); break;
                    case 'jump': queryParts.push('jump'); break;
                    case 'tech': queryParts.push('tech'); break;
                    case 'speed': queryParts.push('speed'); break;
                    case 'stamina': queryParts.push('stamina'); break;
                    case 'old': queryParts.push('year<=2012'); break;
                    case 'long': queryParts.push('length>=240'); break;
                }
            }
            
            const params = new URLSearchParams({
                q: queryParts.join(' '),
                m: filtros.mode || 0,
                s: status,
                p: pageToTry,
                pageSize: 100
            });

            const response = await fetch(`${API_BASE}?${params.toString()}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn("API Error / Timeout");
                attempt++;
                continue; 
            }
            
            const json = await response.json();
            
            if (!json || json.length === 0) {
                if (filtros.query || filtros.style !== 'all') break; 
                attempt++;
                continue;
            }

            const candidatos = json.filter(mapSet => {
                if (!mapSet.beatmaps) return false;

                const hasValidDiff = mapSet.beatmaps.some(diff => 
                    diff.difficulty_rating >= parseFloat(filtros.minSR) && 
                    diff.difficulty_rating <= parseFloat(filtros.maxSR) &&
                    diff.mode_int == (filtros.mode || 0)
                );

                if (!hasValidDiff) return false;

                if (filtros.query && filtros.query.trim() !== "") {
                    const q = filtros.query.toLowerCase();
                    const matchCreator = mapSet.creator.toLowerCase().includes(q);
                    const matchArtist = mapSet.artist.toLowerCase().includes(q);
                    const matchTitle = mapSet.title.toLowerCase().includes(q);
                    const matchDiffName = mapSet.beatmaps.some(diff => diff.version.toLowerCase().includes(q));
                    
                    if (!matchCreator && !matchArtist && !matchTitle && !matchDiffName) return false;
                }

                return true;
            });

            if (candidatos.length > 0) {
                console.log(`Sucesso! ${candidatos.length} mapas encontrados (de 100 baixados).`);
                const mapSet = candidatos[Math.floor(Math.random() * candidatos.length)];
                return normalizeBeatmap(mapSet, filtros.minSR, filtros.maxSR, filtros.query);
            }
            
            console.log("Baixamos 100 mapas, mas nenhum serviu.");
            attempt++;

        } catch (error) {
            console.warn(`Erro na tentativa ${attempt}:`, error);
            attempt++;
        }
    }

    return null; 
}

function normalizeBeatmap(mapSet, minSR, maxSR, query = "") {
    let targetDiff = null;
    const q = query ? query.toLowerCase() : "";

    if (q) {
        targetDiff = mapSet.beatmaps.find(child => 
            child.difficulty_rating >= minSR && 
            child.difficulty_rating <= maxSR &&
            child.mode_int == 0 &&
            child.version.toLowerCase().includes(q)
        );
    }

    if (!targetDiff) {
        const validDiffs = mapSet.beatmaps.filter(child => 
            child.difficulty_rating >= minSR && 
            child.difficulty_rating <= maxSR &&
            child.mode_int == 0
        ).sort((a, b) => b.difficulty_rating - a.difficulty_rating);
        
        if (validDiffs.length > 0) targetDiff = validDiffs[0];
    }

    if (!targetDiff) targetDiff = mapSet.beatmaps[0];

    const diffInfo = getDifficultyColor(targetDiff.difficulty_rating);
    const coverUrl = `https://assets.ppy.sh/beatmaps/${mapSet.id}/covers/cover.jpg`;
    
    return {
        id: mapSet.id,
        diffId: targetDiff.id,
        title: mapSet.title,
        artist: mapSet.artist,
        mapper: mapSet.creator, 
        cover: coverUrl,
        card: `https://assets.ppy.sh/beatmaps/${mapSet.id}/covers/card.jpg`,
        audio: `https://b.ppy.sh/preview/${mapSet.id}.mp3`,
        bpm: mapSet.bpm,
        length: formatLength(targetDiff.total_length),
        sr: targetDiff.difficulty_rating,
        diffColor: diffInfo.color,
        diffTextColor: diffInfo.text,
        diffName: targetDiff.version,
        status: mapSet.ranked, 
        url: `https://osu.ppy.sh/beatmapsets/${mapSet.id}`,
        download: `https://api.nerinyan.moe/d/${mapSet.id}`, 
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
    const btnDl = document.getElementById('btn-download');
    const btnWeb = document.getElementById('btn-website'); 

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
    
    const starIcon = starContainer.querySelector('.material-symbols-outlined');
    if(starIcon) starIcon.style.color = mapa.diffTextColor || 'white';
    
    btnDl.href = mapa.download;
    if (btnWeb) btnWeb.href = mapa.url; 

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
        imgBg.src = "https://osu.ppy.sh/assets/images/avatar-guest.8a2af920.png";
        imgBg.style.opacity = '1';
        if (mystery) mystery.classList.add('opacity-0', 'pointer-events-none');
        if (contentLayout) contentLayout.classList.remove('opacity-0');
    };
}