/* Núcleo libretro mínimo, só pros testes do kof-nativo (compilado pelo próprio teste; nada de ROM).
 * Imagem 320x240 XRGB8888 da cor da opção "minimo_cor"; o pixel (0,0) mostra os botões do jogador 1 (R = byte baixo,
 * G = byte alto) e o 1º byte do conteúdo (B); o pixel (1,0) é o número do quadro. Som: 735 amostras por quadro
 * (44.100 Hz a 60 fps), esquerda = contador, direita = -esquerda. Estado = número do quadro. Bateria = 8 bytes.
 * Com "minimo_quebrar=sim" ele chama abort() no 5º quadro (o supervisor tem que perceber). */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#define EXPORTA __declspec(dllexport)
#else
#define EXPORTA __attribute__((visibility("default")))
#endif

struct retro_system_info { const char *library_name, *library_version, *valid_extensions; bool need_fullpath, block_extract; };
struct retro_game_geometry { unsigned base_width, base_height, max_width, max_height; float aspect_ratio; };
struct retro_system_timing { double fps, sample_rate; };
struct retro_system_av_info { struct retro_game_geometry geometry; struct retro_system_timing timing; };
struct retro_game_info { const char *path; const void *data; size_t size; const char *meta; };
struct retro_variable { const char *key, *value; };
typedef void (*log_t)(unsigned, const char *, ...);
struct retro_log_callback { log_t log; };

typedef bool (*env_t)(unsigned, void *);
typedef void (*video_t)(const void *, unsigned, unsigned, size_t);
typedef void (*amostra_t)(int16_t, int16_t);
typedef size_t (*amostras_t)(const int16_t *, size_t);
typedef void (*poll_t)(void);
typedef int16_t (*input_t)(unsigned, unsigned, unsigned, unsigned);

static env_t env;
static video_t video;
static amostras_t amostras;
static poll_t poll;
static input_t input;
static log_t logar;
static uint32_t fb[320 * 240];
static uint32_t quadro;
static uint8_t conteudo;
static uint8_t bateria[8] = { 'K', 'O', 'F', 0, 0, 0, 0, 0 };
static int16_t som[735 * 2];
static uint32_t cor = 0xff0000;
static bool quebrar;

static void ler_opcoes(void)
{
   struct retro_variable v = { "minimo_cor", NULL };
   if (env(15, &v) && v.value)
      cor = !strcmp(v.value, "verde") ? 0x00ff00 : !strcmp(v.value, "azul") ? 0x0000ff : 0xff0000;
   v.key = "minimo_quebrar";
   v.value = NULL;
   quebrar = env(15, &v) && v.value && !strcmp(v.value, "sim");
}

EXPORTA unsigned retro_api_version(void) { return 1; }
EXPORTA void retro_set_environment(env_t e)
{
   static const struct retro_variable vars[] = {
      { "minimo_cor", "Cor; vermelho|verde|azul" },
      { "minimo_quebrar", "Quebrar; nao|sim" },
      { NULL, NULL },
   };
   bool sem_jogo = true;
   env = e;
   env(16, (void *)vars);
   env(18, &sem_jogo);
}
EXPORTA void retro_set_video_refresh(video_t v) { video = v; }
EXPORTA void retro_set_audio_sample(amostra_t a) { (void)a; }
EXPORTA void retro_set_audio_sample_batch(amostras_t a) { amostras = a; }
EXPORTA void retro_set_input_poll(poll_t p) { poll = p; }
EXPORTA void retro_set_input_state(input_t i) { input = i; }
EXPORTA void retro_init(void)
{
   struct retro_log_callback l;
   if (env(27, &l))
      logar = l.log;
   if (logar)
      logar(1, "minimo iniciou %d %s\n", 42, "ok");
}
EXPORTA void retro_deinit(void) {}
EXPORTA void retro_get_system_info(struct retro_system_info *i)
{
   memset(i, 0, sizeof(*i));
   i->library_name = "minimo";
   i->library_version = "1.0";
   i->valid_extensions = "bin";
}
EXPORTA void retro_get_system_av_info(struct retro_system_av_info *i)
{
   memset(i, 0, sizeof(*i));
   i->geometry.base_width = i->geometry.max_width = 320;
   i->geometry.base_height = i->geometry.max_height = 240;
   i->geometry.aspect_ratio = 4.0f / 3.0f;
   i->timing.fps = 60.0;
   i->timing.sample_rate = 44100.0;
}
EXPORTA void retro_set_controller_port_device(unsigned p, unsigned d) { (void)p; (void)d; }
EXPORTA void retro_reset(void) { quadro = 0; }
EXPORTA bool retro_load_game(const struct retro_game_info *g)
{
   unsigned fmt = 1; /* XRGB8888 */
   if (!env(10, &fmt))
      return false;
   conteudo = (g && g->data && g->size) ? ((const uint8_t *)g->data)[0] : 0;
   ler_opcoes();
   return true;
}
EXPORTA bool retro_load_game_special(unsigned t, const struct retro_game_info *g, size_t n) { (void)t; (void)g; (void)n; return false; }
EXPORTA void retro_unload_game(void) {}
EXPORTA void retro_run(void)
{
   bool mudou = false;
   unsigned i;
   uint16_t botoes;
   if (env(17, &mudou) && mudou)
      ler_opcoes();
   poll();
   botoes = (uint16_t)input(0, 1, 0, 256);
   quadro++;
   if (quebrar && quadro == 5)
      abort();
   for (i = 0; i < 320 * 240; i++)
      fb[i] = cor;
   fb[0] = ((uint32_t)(botoes & 0xff) << 16) | ((uint32_t)(botoes >> 8) << 8) | conteudo;
   fb[1] = quadro & 0xffffff;
   video(fb, 320, 240, 320 * 4);
   for (i = 0; i < 735; i++) {
      int16_t v = (int16_t)(((quadro - 1) * 735 + i) & 0x7fff);
      som[i * 2] = v;
      som[i * 2 + 1] = (int16_t)-v;
   }
   amostras(som, 735);
}
EXPORTA size_t retro_serialize_size(void) { return 4; }
EXPORTA bool retro_serialize(void *d, size_t n)
{
   if (n < 4)
      return false;
   memcpy(d, &quadro, 4);
   return true;
}
EXPORTA bool retro_unserialize(const void *d, size_t n)
{
   if (n != 4)
      return false;
   memcpy(&quadro, d, 4);
   return true;
}
EXPORTA void retro_cheat_reset(void) {}
EXPORTA void retro_cheat_set(unsigned i, bool e, const char *c) { (void)i; (void)e; (void)c; }
EXPORTA unsigned retro_get_region(void) { return 0; }
EXPORTA void *retro_get_memory_data(unsigned id) { return id == 0 ? bateria : NULL; }
EXPORTA size_t retro_get_memory_size(unsigned id) { return id == 0 ? sizeof(bateria) : 0; }
