# osu! Roulette 🎰

![Status do Projeto](https://img.shields.io/badge/status-ativo-brightgreen)
![Licença](https://img.shields.io/badge/license-MIT-blue)
![osu!](https://img.shields.io/badge/game-osu!-ff66aa)

> Um randomizador de beatmaps moderno para osu! com filtros avançados e interface web.

O **osu! Roulette** resolve o clássico problema de "o que eu jogo agora?", permitindo que os jogadores roletem mapas aleatórios baseados em critérios específicos como **Dificuldade (Estrelas)**, **Modo de Jogo** e **Estilos de Mapa** (Farm, Stream, Tech, etc).

![Preview Screenshot](/assets/osu-roulette-screen.png)

## ✨ Funcionalidades

- **🎯 Filtros Inteligentes:** Busque por Modo (Std, Taiko, Catch, Mania), Status (Ranked, Loved, etc.) e Faixa de Dificuldade.
- **🧠 Detecção de Estilo:** Lógica especial para encontrar tipos específicos de mapas:
  - `Farm`: Encontra mapas focados em PP (pulos, duração curta).
  - `Stream`: Mapas de alta densidade de notas.
  - `Tech`: Ritmos complexos e sliders técnicos.
  - `Old School`: Mapas clássicos da era 2007-2012.
  - `Marathon`: Mapas com mais de 4 minutos de duração.
- **🎵 Preview de Áudio:** Toca automaticamente a prévia da música ao encontrar o resultado.
- **💾 Histórico Local:** Salva seus drops recentes usando **IndexedDB**, para você nunca perder um mapa legal que encontrou.
- **🌍 Internacionalização:** Interface totalmente traduzida para Português (PT-BR) e Inglês (EN).
- **🎨 UI Moderna:** Design Glassmorphism inspirado na estética do osu!lazer, responsivo para Celular e PC.

## 🛠️ Tecnologias Utilizadas

- **Core:** HTML5, Tailwind CSS (via CDN), Vanilla JavaScript (Módulos ES6+).
- **Dados:** [NeriNyan API](https://api.nerinyan.moe/) (Um espelho mais rápido da busca oficial do osu!).
- **Armazenamento:** IndexedDB (via biblioteca `idb`) para histórico persistente.
- **Efeitos:** Canvas Confetti.

## 🚀 Como Rodar Localmente

Como este projeto utiliza **Módulos ES** (`type="module"`), você não pode simplesmente abrir o arquivo `index.html` direto no navegador devido a políticas de segurança (CORS). Você precisa de um servidor local.

### Opção 1: VS Code (Recomendado)
1. Instale a extensão **Live Server**.
2. Clique com o botão direito no `index.html` e selecione **"Open with Live Server"**.

### Opção 2: Python
Se você tem Python instalado, abra o terminal na pasta do projeto:
```bash
# Python 3
python -m http.server 8000
