# Brick Breaker

Jogo Brick Breaker feito com HTML, CSS e JavaScript, executado no navegador.

## Como executar

Para que o navegador carregue as músicas, execute o jogo por um servidor local.
Não é necessário instalar a extensão Live Server.

1. Abra a pasta do projeto no VS Code.
2. Abra o terminal integrado na pasta do projeto.
3. Execute:

   ```powershell
   python -m http.server 8000
   ```

4. Acesse [http://localhost:8000](http://localhost:8000) no navegador.
5. Para encerrar o servidor, volte ao terminal e pressione `Ctrl+C`.

Também é possível usar a extensão Live Server. Abrir o `index.html` diretamente
como `file:///` pode impedir que alguns navegadores reproduzam os arquivos de
áudio.

## Estrutura do projeto

- `index.html`: página e canvas do jogo.
- `src/main.js`: ponto de entrada; inicializa o jogo.
- `src/game.js`: estado, regras, colisões, fases e ciclo principal.
- `src/render.js`: desenho do canvas e das telas.
- `src/input.js`: teclado, mouse e ações dos controles.
- `src/audio.js`: músicas e efeitos sonoros.
- `src/config.js`: configurações, sprites e textos das fases.
- `Audios_game/`: arquivos das trilhas em MP3.

## Controles

- `Espaço`: iniciar o jogo ou continuar para a próxima fase.
- `←` / `→` ou mouse: mover a nave.
- `P`: pausar ou continuar.
- `R`: reiniciar após o fim do jogo ou a vitória contra o chefe.
- Teclas `2`, `3`, `4` ou `5` na tela inicial: começar diretamente no nível
  escolhido.

## Músicas

As trilhas ficam em `Audios_game/` e são reproduzidas em loop:

- `fase_1.mp3`: diálogos e transições.
- `fase_2.mp3`: fases normais.
- `fase_3.mp3`: fase do chefe final.
