package dev.kofstation.android;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * A casca: uma WebView que serve o app novo (apps/desktop/dist, dentro dos assets em web/) em https://kofstation.local/
 * com os cabeçalhos de isolamento que o app exige (SharedArrayBuffer do som e dos núcleos), a ponte KofAndroid, o seletor
 * de arquivos do Android pro `<input type=file>` e o botão Voltar (pergunta à página antes de sair).
 */
public final class MainActivity extends Activity {
    private static final String ORIGEM = "https://kofstation.local/";
    private static final int PEDIDO_ARQUIVO = 7;
    private WebView web;
    private ValueCallback<Uri[]> escolhendo;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        setContentView(web);
        Comandos comandos = new Comandos(getFilesDir(), "@VERSAO_NOME@");
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        web.addJavascriptInterface(new Ponte(comandos), "KofAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!"kofstation.local".equals(u.getHost())) return null; // o resto vai pra rede normalmente
                return servir(u.getPath());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (escolhendo != null) escolhendo.onReceiveValue(null);
                escolhendo = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
                        .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolha o jogo"), PEDIDO_ARQUIVO);
                } catch (RuntimeException e) {
                    escolhendo = null;
                    cb.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });
        web.loadUrl(ORIGEM + "index.html?celular=1");
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        if (pedido != PEDIDO_ARQUIVO || escolhendo == null) return;
        Uri[] uris = null;
        if (resultado == RESULT_OK && dados != null) {
            if (dados.getClipData() != null) {
                uris = new Uri[dados.getClipData().getItemCount()];
                for (int k = 0; k < uris.length; k++) uris[k] = dados.getClipData().getItemAt(k).getUri();
            } else if (dados.getData() != null) uris = new Uri[] { dados.getData() };
        }
        escolhendo.onReceiveValue(uris);
        escolhendo = null;
    }

    @Override
    public void onWindowFocusChanged(boolean foco) {
        super.onWindowFocusChanged(foco);
        if (foco) getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    /** Voltar: a página decide (fecha o menu rápido, volta uma tela, abre o menu no jogo); no Início, sai do app. */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__kofVoltar ? window.__kofVoltar() : false)", new ValueCallback<String>() {
            @Override public void onReceiveValue(String r) {
                if (!"true".equals(r)) finish();
            }
        });
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }

    // ---------------------------------------------------------------- assets em https://kofstation.local/

    private static final Map<String, String> TIPOS = new HashMap<>();
    static {
        TIPOS.put("html", "text/html"); TIPOS.put("js", "text/javascript"); TIPOS.put("mjs", "text/javascript");
        TIPOS.put("css", "text/css"); TIPOS.put("json", "application/json"); TIPOS.put("svg", "image/svg+xml");
        TIPOS.put("png", "image/png"); TIPOS.put("jpg", "image/jpeg"); TIPOS.put("ico", "image/x-icon");
        TIPOS.put("woff2", "font/woff2"); TIPOS.put("wasm", "application/wasm"); TIPOS.put("txt", "text/plain");
    }

    private WebResourceResponse servir(String caminho) {
        String p = caminho == null || caminho.equals("/") ? "index.html" : caminho.substring(1);
        if (p.contains("..")) return resposta(404, "text/plain", null);
        try {
            InputStream in = getAssets().open("web/" + p);
            String ext = p.substring(p.lastIndexOf('.') + 1).toLowerCase();
            return resposta(200, TIPOS.containsKey(ext) ? TIPOS.get(ext) : "application/octet-stream", in);
        } catch (IOException e) {
            return resposta(404, "text/plain", null);
        }
    }

    private static WebResourceResponse resposta(int codigo, String tipo, InputStream corpo) {
        WebResourceResponse r = new WebResourceResponse(tipo, "utf-8", corpo);
        r.setStatusCodeAndReasonPhrase(codigo, codigo == 200 ? "OK" : "Not Found");
        Map<String, String> h = new HashMap<>();
        h.put("Cross-Origin-Opener-Policy", "same-origin");
        h.put("Cross-Origin-Embedder-Policy", "require-corp");
        h.put("Cross-Origin-Resource-Policy", "same-origin");
        h.put("Cache-Control", "no-cache");
        r.setResponseHeaders(h);
        return r;
    }
}
