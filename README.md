# osu! Roulette 🎰

![Status do Projeto](https://img.shields.io/badge/status-ativo-brightgreen)
![Licença](https://img.shields.io/badge/license-MIT-blue)
![osu!](https://img.shields.io/badge/game-osu!-ff66aa)

> Um randomizador de beatmaps moderno para osu! com filtros inteligentes, auditoria de dados e interface web de alta performance.

O **osu! Roulette** resolve o clássico problema de "o que eu jogo agora?", permitindo que os jogadores roletem mapas aleatórios baseados em critérios específicos como **Dificuldade (Estrelas)**, **Modo de Jogo** e **Estilos de Mapa** (Farm, Stream, Tech, etc).

![Preview Screenshot](/assets/osu-roulette-screen.png)

## ✨ Funcionalidades

- **🎯 Filtros Inteligentes:** Busque por Modo (Std, Taiko, Catch, Mania), Status (Ranked, Loved, Graveyard) e Faixa de Dificuldade exata.
- **🧠 Algoritmo Curado por Estilo:** Lógica avançada que filtra mapas baseada em pools de mappers e metadados:
  - `Farm`: Mapas de curta duração com foco em ganho de PP.
  - `Stream`: Alta densidade de notas e mappers focados em stamina/flow.
  - `Tech`: Ritmos complexos e uso técnico de sliders.
  - `Old School`: Mapas clássicos (2007-2012) com validação rígida de ID.
  - `Marathon`: Filtragem direta para mapas de longa duração (+4 min).
- **🛡️ Blindagem de API:** Sistema multi-mirror (osu.direct, catboy.best) com fallback automático em caso de instabilidade ou erros de banco de dados (Ex: Err 111).
- **🚫 Algoritmo Anti-Repetição:** Sistema baseado em `Set` que garante que você não veja o mesmo mapa duas vezes na mesma sessão.
- **🎵 Preview de Áudio:** Toca automaticamente a prévia da música ao encontrar um resultado.
- **💾 Histórico Local:** Banco de dados **IndexedDB** para salvar seus drops recentes com persistência total.
- **🌍 Internacionalização:** Interface dinâmica com suporte a Português (PT-BR) e Inglês (EN).

## 🧠 Soluções de Engenharia (Destaques Técnicos)

### Filtro Oldschool Rígido
Para garantir a fidelidade da era clássica, implementamos uma trava dupla:
1. **Sintaxe de API:** Uso de `sort=id:asc` para priorizar os registros iniciais do osu!.
2. **Validação de ID:** O sistema descarta automaticamente mapas com ID superior a 100.000, bloqueando mapas novos que foram "Rankeados/Loved" recentemente mas que não pertencem à era clássica.

### Auditoria de Criadores (Mapper Verification)
Diferente de buscas comuns que usam tags, o sistema realiza uma auditoria no lado do cliente. Ele verifica se o campo `creator` corresponde exatamente à pool de mappers selecionada, filtrando mapas de terceiros que apenas mencionam mappers famosos nas tags.

### Fallback Inteligente de Assets
Tratamento de erro robusto para imagens. Caso o servidor de assets do osu! falhe ou o mapa não possua uma capa, o sistema injeta um asset padrão customizado, mantendo a integridade visual da UI e do Histórico.

## 🛠️ Tecnologias Utilizadas

- **Core:** HTML5, Tailwind CSS 3.4, Vanilla JavaScript (Módulos ES6+).
- **APIs de Dados:** [osu.direct](https://osu.direct/) e [Catboy](https://catboy.best/) (Endpoints de alta disponibilidade).
- **Armazenamento:** IndexedDB para histórico de drops.
- **Efeitos:** Canvas Confetti para celebração de drops.

## 🚀 Como Rodar Localmente

Como este projeto utiliza **Módulos ES** (`type="module"`), você precisa de um servidor local para evitar bloqueios de políticas de segurança (CORS).

### Opção 1: VS Code (Recomendado)
1. Instale a extensão **Live Server**.
2. Clique com o botão direito no `index.html` e selecione **"Open with Live Server"**.

### Opção 2: Python
Abra o terminal na pasta do projeto:
```bash
# Python 3
python -m http.server 8000