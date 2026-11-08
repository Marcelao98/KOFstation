// Núcleo de teste que desenha com OpenGL (SET_HW_RENDER, perfil core 3.3), como o LRPS2: metade de cima vermelha e a
// de baixo verde (no OpenGL a origem é embaixo: o frontend tem que virar), 320x240. Conta os quadros no azul do canto.
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>
#ifdef _WIN32
#define EXPORTA __declspec(dllexport)
#define APIENTRY __stdcall
#else
#define EXPORTA __attribute__((visibility("default")))
#define APIENTRY
#endif
typedef bool (*env_t)(unsigned, void *);
typedef void (*video_t)(const void *, unsigned, unsigned, size_t);
typedef uintptr_t (*fbo_t)(void);
typedef void (*(*proc_t)(const char *))(void);
struct hw { unsigned tipo; void (*reset)(void); fbo_t fbo; proc_t proc; bool depth, stencil, embaixo; unsigned ma, mi; bool cache; void (*destruir)(void); bool debug; };
struct geo { unsigned bw, bh, mw, mh; float aspect; };
struct av { struct geo g; double fps, taxa; };
struct info { const char *nome, *versao, *ext; bool full, block; };
struct game { const char *path; const void *data; size_t size; const char *meta; };
static env_t env; static video_t video; static struct hw h;
static void (APIENTRY *bindFb)(unsigned, unsigned); static void (APIENTRY *clearColor)(float, float, float, float);
static void (APIENTRY *clear)(unsigned); static void (APIENTRY *viewport)(int, int, int, int);
static void (APIENTRY *scissor)(int, int, int, int); static void (APIENTRY *enable)(unsigned); static void (APIENTRY *disable)(unsigned);
static int resetou, quadros;
static void reset(void) {
  bindFb = (void *)h.proc("glBindFramebuffer"); clearColor = (void *)h.proc("glClearColor"); clear = (void *)h.proc("glClear");
  viewport = (void *)h.proc("glViewport"); scissor = (void *)h.proc("glScissor"); enable = (void *)h.proc("glEnable"); disable = (void *)h.proc("glDisable");
  resetou = bindFb && clearColor && clear && viewport && scissor && enable && disable;
}
EXPORTA unsigned retro_api_version(void) { return 1; }
EXPORTA void retro_set_environment(env_t e) { env = e; }
EXPORTA void retro_set_video_refresh(video_t v) { video = v; }
EXPORTA void retro_set_audio_sample(void *f) { (void)f; }
EXPORTA void retro_set_audio_sample_batch(void *f) { (void)f; }
EXPORTA void retro_set_input_poll(void *f) { (void)f; }
EXPORTA void retro_set_input_state(void *f) { (void)f; }
EXPORTA void retro_init(void) {}
EXPORTA void retro_deinit(void) {}
EXPORTA void retro_get_system_info(struct info *i) { memset(i, 0, sizeof *i); i->nome = "gl"; i->versao = "1"; i->ext = "bin"; i->full = true; }
EXPORTA void retro_get_system_av_info(struct av *a) { a->g.bw = 320; a->g.bh = 240; a->g.mw = 640; a->g.mh = 480; a->g.aspect = 4.0f / 3; a->fps = 60; a->taxa = 44100; }
EXPORTA bool retro_load_game(const struct game *g) {
  (void)g; memset(&h, 0, sizeof h); h.tipo = 3; h.ma = 3; h.mi = 3; h.depth = true; h.stencil = true; h.embaixo = true; h.reset = reset;
  return env(14, &h);
}
EXPORTA void retro_run(void) {
  if (!resetou) return;
  quadros++;
  bindFb(0x8D40, (unsigned)h.fbo()); viewport(0, 0, 320, 240);
  disable(0x0C11); clearColor(0, 1, (quadros & 255) / 255.0f, 1); clear(0x4000);   // tudo verde (azul = nº do quadro)
  enable(0x0C11); scissor(0, 120, 320, 120); clearColor(1, 0, (quadros & 255) / 255.0f, 1); clear(0x4000);   // metade de cima (y>=120) vermelha
  disable(0x0C11);
  video((void *)(intptr_t)-1, 320, 240, 0);
}
EXPORTA void retro_reset(void) {}
EXPORTA size_t retro_serialize_size(void) { return 0; }
EXPORTA bool retro_serialize(void *d, size_t n) { (void)d; (void)n; return false; }
EXPORTA bool retro_unserialize(const void *d, size_t n) { (void)d; (void)n; return false; }
EXPORTA void retro_unload_game(void) {}
EXPORTA void *retro_get_memory_data(unsigned id) { (void)id; return NULL; }
EXPORTA size_t retro_get_memory_size(unsigned id) { (void)id; return 0; }
EXPORTA void retro_set_controller_port_device(unsigned p, unsigned d) { (void)p; (void)d; }
