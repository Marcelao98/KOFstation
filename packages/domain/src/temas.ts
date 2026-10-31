// Os 126 temas do KOFstation, copiados do `TEMAS` do web/app.js do kofstation-old (mesmos ids, nomes, descrições e
// categorias). O visual de cada um está no estilo.css do antigo (apps/desktop/src/styles/antigo/estilo.css).
// Tema novo: um bloco [data-tema="id"] no CSS + uma linha aqui. Id sem hífen.

/** [id, nome, descrição opcional] */
export type Tema = readonly [id: string, nome: string, descricao?: string];
export type GrupoDeTemas = readonly [categoria: string, temas: readonly Tema[]];

export const TEMA_PADRAO = 'cafe';

// prettier-ignore
export const TEMAS: readonly GrupoDeTemas[] = [
  ['Clássicos do KOFstation', [['escuro', '🌙 Escuro'], ['claro', '☀️ Claro'], ['zsnes', '🕹️ ZSNES']]],
  ['Café', [['cafe', '☕ Café queimado'], ['espresso', 'Espresso'], ['cappuccino', 'Cappuccino'], ['latte', 'Latte'], ['mocha', 'Mocha'],
    ['caramelo', 'Caramelo'], ['coldbrew', 'Cold Brew'], ['canela', 'Café com canela']]],
  ['Consoles', [['super16', 'Super 16-bit'], ['portatil', 'Portátil verde'], ['atomico', 'Roxo atômico'], ['blast16', 'Blast 16'],
    ['cinza32', 'Cinza 32-bit'], ['branco', 'Branco console'], ['laminas', 'Verde lâminas'], ['neon', 'Fliperama neon']]],
  ['Computador e internet antiga', [['classico98', 'Clássico 98'], ['luna', 'Azul Luna'], ['mensageiro', 'Mensageiro'], ['rosa2004', 'Rede social 2004'],
    ['terminal', 'Terminal'], ['vapor', 'Vaporwave'], ['web1', 'Web 1.0']]],
  ['Animes', [
    ['esferas', 'Esferas do Dragão', 'Laranja, azul e dourado de aventura e artes marciais.'],
    ['detetive', 'Detetive Espiritual', 'Verde profundo, azul elétrico e roxo do outro mundo.'],
    ['dourado', 'Cosmos Dourado', 'Azul cósmico, dourado e constelações discretas.'],
    ['folhas', 'Folhas da Vila', 'Laranja de macacão, azul de bandana e preto de ninja.'],
    ['mar', 'Mar de Aventuras', 'Azul oceânico, vermelho de bandana e ouro de tesouro.'],
    ['pokebola', 'Mundo Pokémon', 'Amarelo, vermelho e azul, alegre e cheio de energia.'],
    ['alquimia', 'Círculo da Alquimia', 'Vinho, aço e vermelho de círculo de transmutação.'],
    ['cadernomorte', 'Caderno da Morte', 'Capa preta, etiqueta branca e a maçã vermelha.'],
    ['lamina', 'Lâmina Espiritual', 'Preto e branco de tinta, com laranja de lâmina.'],
    ['digital', 'Mundo Digital', 'Azul e verde digitais num painel claro de grade.'],
    ['cartas', 'Cartas Mágicas', 'Rosa, creme, lilás e um dourado delicado.'],
    ['cacadores', 'Caçadores de Aventuras', 'Verde de mapa antigo, azul e dourado de licença de caçador.'],
    ['respiracao', 'Respiração Solar', 'Preto, verde e vermelho de padrão xadrez.'],
    ['maldicao', 'Energia Amaldiçoada', 'Preto, roxo e azul de energia sobrenatural.'],
    ['motosserra', 'Motosserra Urbana', 'Laranja, preto e vermelho de oficina e concreto.'],
    ['alem', 'Além das Estrelas', 'Verde suave, azul acinzentado e dourado contemplativo.'],
    ['familia', 'Família em Segredo', 'Verde-oliva, rosa e creme com ar de espionagem retrô.'],
    ['caos', 'Caos Paranormal', 'Rosa neon e azul elétrico sobre roxo-escuro.'],
    ['trem', 'Trem dos Espíritos', 'Verde-água, vermelho de lanterna e ouro, sobre água calma.'],
    ['mononoke', 'Espíritos da Floresta', 'Verde-floresta, cinza de névoa, terra e vermelho de argila.'],
    ['unidade01', 'Unidade 01', 'Roxo e verde de robô gigante, com alerta laranja.'],
    ['lua', 'Guerreira da lua', 'Rosa, azul e dourado de uma noite de lua cheia.'],
    ['floresta', 'Floresta encantada', 'Verdes fundos e luz de vaga-lume.']]],
  ['Animais', [['onca', 'Onça-pintada'], ['arara', 'Arara-azul'], ['capivara', 'Capivara zen'], ['gato', 'Gato preto'], ['raposa', 'Raposa'], ['panda', 'Panda'], ['flamingo', 'Flamingo']]],
  ['Bem brasileiro', [['desenho', 'Manhã de desenho'], ['camelo', 'Console de camelô'], ['brasil', 'Brasil'],
    ['sessao', 'Sessão da Tarde', 'Azul de televisão, sol de tarde e laranja de VHS.'],
    ['globinho', 'TV Globinho', 'Azul elétrico, amarelo vibrante e vermelho de desenho animado.'],
    ['lanhouse', 'Lan House 2007', 'Âmbar sobre verde-oliva de menu de FPS clássico e linhas de monitor de tubo.'],
    ['orkutmsn', 'Orkut & MSN', 'Janela azul de mensageiro, rosa de rede social e bolinha verde: online.'],
    ['dvdcamelo', 'DVD de Camelô', 'Preto, prata e vermelho de capa de DVD e menu antigo.'],
    ['locadora', 'A Locadora', 'Azul-marinho, vinho e creme de capa de VHS.'],
    ['caderno', 'Caderno de Escola', 'Papel pautado, azul de caneta e margem vermelha.'],
    ['recreio', 'Recreio', 'Verde de quadra, amarelo de sol e doce de embalagem.'],
    ['boteco', 'Boteco do Bairro', 'Verde-garrafa, madeira escura e luz quente de fim de tarde.'],
    ['chuva', 'Chuva no Interior', 'Cinza azulado, verde apagado e uma luz amarela acolhedora.'],
    ['almoco', 'Almoço de Domingo', 'Creme, terracota e verde-oliva de mesa de família.'],
    ['feira', 'Feira de Domingo', 'Vermelho tomate, amarelo banana e verde folha de feira livre.'],
    ['brasil98', 'Brasil 1998', 'Verde escuro, amarelo envelhecido e azul de céu.'],
    ['hexa2002', 'Hexa 2002', 'Amarelo canário, verde bandeira e azul profundo de Copa.'],
    ['ferias', 'Férias de Verão', 'Turquesa, coral e sol, como álbum de férias.'],
    ['juninaescola', 'Festa Junina da Escola', 'Azul de noite, laranja de fogueira e bandeirinhas.'],
    ['casavo', 'Casa da Vó', 'Creme, madeira, verde antigo e a luz do abajur.'],
    ['mp3', 'MP3 & Fone de Ouvido', 'Prata metálico, preto e azul neon de tocador de MP3.'],
    ['gibi', 'Gibi da Banca', 'Vermelho, amarelo, azul e papel envelhecido de gibi.'],
    ['interior', 'Cidade do Interior', 'Azul de anoitecer, laranja de poste e concreto de rua tranquila.'],
    ['tropicalia', 'Tropicália', 'Verde, amarelo, rosa e cores psicodélicas de 1968.'],
    ['bossa', 'Bossa Nova', 'Creme, azul-petróleo e areia: minimalista e tranquilo.'],
    ['samba', 'Samba de Raiz', 'Vinho, dourado e madeira quente de roda de samba.'],
    ['choro', 'Choro Brasileiro', 'Madeira, verde-musgo e creme de instrumento acústico.'],
    ['frevo', 'Frevo', 'Vermelho, amarelo, azul e verde de sombrinha de frevo.'],
    ['maracatu', 'Maracatu', 'Preto, vermelho e dourado intensos de cortejo.'],
    ['cordel', 'Cordel', 'Papel envelhecido, tinta preta e terra, de xilogravura.'],
    ['azulejo', 'Azulejo Português', 'Azul-cobalto e branco de azulejo antigo.'],
    ['modernismo', 'Modernismo Brasileiro', 'Cores primárias e formas geométricas de composição modernista.'],
    ['brasilia', 'Concreto de Brasília', 'Branco, cinza e azul de arquitetura modernista.'],
    ['mataatlantica', 'Mata Atlântica', 'Verde profundo, musgo e a umidade da floresta.'],
    ['amazonica', 'Floresta Amazônica', 'Verde-jade e escuro, com luz dourada filtrada.'],
    ['sertao', 'Sertão', 'Ocre, terracota e areia sob um azul intenso.'],
    ['pantanal', 'Pantanal', 'Verde-oliva, azul de água e tons de terra.'],
    ['cerrado', 'Cerrado', 'Dourado, cobre e verde seco da vegetação nativa.'],
    ['litoral', 'Litoral Tropical', 'Turquesa, areia clara e coral, com sol e mar.'],
    ['ouropreto', 'Ouro Preto', 'Pedra, terracota, creme e dourado envelhecido.'],
    ['baiana', 'Baiana', 'Branco, azul, vermelho e dourado da cultura baiana.'],
    ['junina', 'Festa Junina', 'Azul noturno, vermelho, amarelo e laranja de fogueira.'],
    ['carnaval', 'Carnaval de Rua', 'Magenta, amarelo, verde e azul, vibrante e cheio de confete.'],
    ['clube', 'Clube da Esquina', 'MPB mineira: terra vermelha, sépia de foto antiga e a esquina de BH.']]],
  ['Clássicos do SNES', [
    ['smw', 'Super Mario World', 'Azul celeste, verde vivo e cores alegres de plataforma.'],
    ['alttp', 'The Legend of Zelda: A Link to the Past', 'Verde floresta, dourado e pergaminho de fantasia.'],
    ['metroid', 'Super Metroid', 'Preto, roxo profundo e verde alienígena de sci-fi.'],
    ['dkc', 'Donkey Kong Country', 'Verde tropical, marrom e tons de selva.'],
    ['mmx', 'Mega Man X', 'Azul metálico, ciano e cinza industrial.'],
    ['chrono', 'Chrono Trigger', 'Azul celeste, verde e dourado de aventura no tempo.'],
    ['ff6', 'Final Fantasy VI', 'Vinho, azul noturno e dourado de fantasia a vapor.'],
    ['earthbound', 'EarthBound', 'Rosa, azul pastel e cores excêntricas.'],
    ['kirby', 'Kirby Super Star', 'Rosa, azul claro e branco, alegre e suave.'],
    ['fzero', 'F-Zero', 'Preto, roxo e ciano neon de velocidade futurista.'],
    ['starfox', 'Star Fox', 'Azul espacial, verde e laranja de ficção científica.'],
    ['cv4', 'Super Castlevania IV', 'Preto, vinho, cinza e roxo gótico.'],
    ['contra', 'Contra III', 'Preto, vermelho e verde militar, industrial.'],
    ['sf2', 'Street Fighter II Turbo', 'Vermelho, azul e amarelo com energia de fliperama.'],
    ['mk', 'Mortal Kombat', 'Preto, vermelho escuro e dourado sombrios.'],
    ['mana', 'Secret of Mana', 'Verde mágico, azul e tons naturais.'],
    ['mariokart', 'Super Mario Kart', 'Vermelho, azul, amarelo e verde de pista e itens.'],
    ['yoshi', 'Yoshi\'s Island', 'Verde, rosa e amarelo de desenho feito à mão.'],
    ['ghouls', 'Super Ghouls \'n Ghosts', 'Roxo, cinza e azul noturno de fantasia sombria.'],
    ['terranigma', 'Terranigma', 'Azul profundo, verde e dourado, épico e contemplativo.'],
    ['encanador', 'Mundo dos encanadores', 'Céu azul, tijolo e cano de um mundo de plataforma.'], ['heroi', 'Herói de verde', 'Verde de floresta e dourado de relíquia, em clima de aventura.'], ['cacadora', 'Caçadora espacial', 'Escuro de nave com âmbar de visor de capacete.'], ['corredor', 'Corredor azul', 'Azul veloz e anéis dourados de um corredor sem freio.'], ['blocos', 'Blocos que caem', 'Cores primárias de peças que encaixam e descem.'], ['arena', 'Arena de luta', 'Preto, vermelho e dourado de arena de luta.']]],
];

export const TODOS_TEMAS: readonly Tema[] = TEMAS.flatMap(([, l]) => l);

export const semAcento = (t: string): string =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** A busca da galeria: cada palavra tem que aparecer no nome, na categoria, no id ou na descrição (sem acento). */
export function achaTema(busca: string, categoria: string, [id, nome, desc]: Tema): boolean {
  const alvo = semAcento(`${nome} ${categoria} ${id} ${desc ?? ''}`);
  return semAcento(busca)
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => alvo.includes(p));
}

/** Os grupos que passam na categoria escolhida ('todos' = todas) e na busca, sem grupos vazios. */
export function temasFiltrados(categoria: string, busca: string): GrupoDeTemas[] {
  return TEMAS.map(([g, l]): GrupoDeTemas => [
    g,
    l.filter((t) => (categoria === 'todos' || categoria === g) && achaTema(busca, g, t)),
  ]).filter(([, l]) => l.length > 0);
}

/** Contagem por categoria pra fileira de botões (com a busca aplicada). */
export function contarCategorias(busca: string): { categoria: string; n: number }[] {
  const por = TEMAS.map(([g, l]) => ({ categoria: g, n: l.filter((t) => achaTema(busca, g, t)).length }));
  return [{ categoria: 'todos', n: por.reduce((s, c) => s + c.n, 0) }, ...por];
}

export const nomeDoTema = (id: string): string | undefined => TODOS_TEMAS.find(([k]) => k === id)?.[1];
