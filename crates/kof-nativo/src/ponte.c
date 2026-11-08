/* Ponte do log do libretro: o núcleo chama um printf variádico; aqui ele vira texto e vai pro Rust. */
#include <stdarg.h>
#include <stdio.h>

extern void kof_nativo_log(unsigned nivel, const char *texto);

void kof_nativo_log_ponte(unsigned nivel, const char *fmt, ...)
{
   char buf[2048];
   va_list ap;
   if (!fmt)
      return;
   va_start(ap, fmt);
   vsnprintf(buf, sizeof(buf), fmt, ap);
   va_end(ap);
   buf[sizeof(buf) - 1] = 0;
   kof_nativo_log(nivel, buf);
}
