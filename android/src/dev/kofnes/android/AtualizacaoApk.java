package dev.kofnes.android;

import dev.kofstation.android.Comandos;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * O atualizador do APK (M14.5). A versão nova sai junto da Release do PC (workflow `Versão`): `android-versao.txt`
 * (`codigo=<versionCode>` e `nome=<versão>`) e `KOFstation-novo.apk`. Aqui só se compara o `codigo` com o do APK instalado; quem
 * confere a assinatura é o próprio Android na hora de instalar (só entra APK assinado com a mesma chave). A instalação é
 * sempre a pessoa tocando em "Baixar" (o Android não deixa um app se instalar sozinho sem permissão especial).
 */
final class AtualizacaoApk implements Comandos.Delegado {
    static final String FONTE = "https://github.com/Marcelao98/KOFstation/releases/latest/download/";
    static final String APK = FONTE + "KOFstation-novo.apk";

    interface AoAchar { void nova(String nome); }

    private final int meuCodigo;
    private final String meuNome;
    private final AoAchar aoAchar;

    AtualizacaoApk(int meuCodigo, String meuNome, AoAchar aoAchar) {
        this.meuCodigo = meuCodigo;
        this.meuNome = meuNome;
        this.aoAchar = aoAchar;
    }

    @Override
    public Comandos.Saida chamar(String cmd, JSONObject a, byte[] corpo) throws JSONException {
        if (!"app.atualizacao".equals(cmd)) return null;
        JSONObject r = new JSONObject().put("versao", meuNome).put("commit", "").put("ligado", true).put("baixados", 0).put("bytes", 0);
        if (!a.optBoolean("procurar", false)) return new Comandos.Saida(r.put("situacao", "parado"), null);
        try {
            String[] v = ler(FONTE + "android-versao.txt");
            int codigo = Integer.parseInt(v[0]);
            if (codigo > meuCodigo) {
                if (aoAchar != null) aoAchar.nova(v[1]);
                r.put("situacao", "pronta").put("nova", v[1])
                        .put("textoAndroid", "🆕 tem versão nova do KOFstation (" + v[1] + "): toque em Baixar na janela que abriu e instale por cima");
            } else r.put("situacao", "emDia");
        } catch (Exception e) {
            r.put("situacao", "erro").put("erro", new JSONObject().put("code", "UPDATE_FAILED")
                    .put("message", "não consegui falar com o GitHub agora (" + e.getMessage() + ")"));
        }
        return new Comandos.Saida(r, null);
    }

    /** [codigo, nome] do android-versao.txt. */
    static String[] ler(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8000);
        c.setReadTimeout(8000);
        try {
            if (c.getResponseCode() != 200) throw new IOException("a publicação respondeu " + c.getResponseCode());
            BufferedReader b = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
            String codigo = null, nome = "";
            for (String l; (l = b.readLine()) != null;) {
                if (l.startsWith("codigo=")) codigo = l.substring(7).trim();
                else if (l.startsWith("nome=")) nome = l.substring(5).trim();
            }
            if (codigo == null) throw new IOException("android-versao.txt sem codigo=");
            return new String[] { codigo, nome };
        } finally { c.disconnect(); }
    }
}
