package dev.kofstation.android;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Os comandos do contrato (docs/API_CONTRACTS.md) que a casca do Android atende por enquanto: app.*, log.write, config.*,
 * store.* (as mesmas pastas e nomes de arquivo do Rust: <dados>/<loja>/<chave>.json + .bin) e nativo.disponivel. O resto
 * devolve UNSUPPORTED com o motivo. Java puro (sem android.*): roda na JVM no teste (android/teste/ComandosTeste.java).
 */
public final class Comandos {
    /** Resultado de um comando: JSON (data) ou bytes (bin). */
    public static final class Saida {
        public final Object data;
        public final byte[] bin;
        Saida(Object data, byte[] bin) { this.data = data; this.bin = bin; }
    }

    /** Erro do contrato: código em MAIÚSCULAS e mensagem em português. */
    public static final class Erro extends Exception {
        public final String codigo;
        public Erro(String codigo, String mensagem) { super(mensagem); this.codigo = codigo; }
    }

    static final String[] LOJAS = { "jogos", "saves", "estados", "autos", "stats", "musicas", "capas", "visual", "roms", "bios" };
    static final int VERSAO_DA_CONFIG = 1;

    private final File dados;
    private final String versao;

    public Comandos(File dados, String versao) {
        this.dados = dados;
        this.versao = versao;
    }

    public Saida chamar(String cmd, JSONObject a, byte[] corpo) throws Erro {
        try {
            switch (cmd) {
                case "app.info": return json(new JSONObject()
                        .put("version", versao).put("contractVersion", 1).put("os", "android")
                        .put("arch", "arm64").put("dataDir", dados.getPath()));
                case "app.vivo": return json(JSONObject.NULL);
                case "app.atualizacao": return json(new JSONObject().put("estado", "desligado")
                        .put("texto", "a atualização do APK ainda não existe (M14.5)"));
                case "log.write": return logar(a);
                case "config.read": return json(lerConfig(a.optString("doc")));
                case "config.write": gravarConfig(a.optString("doc"), a.optJSONObject("data")); return json(JSONObject.NULL);
                case "store.list": return json(listar(a.optString("store"), a.optString("prefix", null)));
                case "store.get": return new Saida(null, pegar(a.optString("store"), a.optString("key", null)));
                case "store.meta": return json(meta(a.optString("store"), a.optString("key", null)));
                case "store.put": por(a.optString("store"), a.optString("key", null), a.optJSONObject("meta"), corpo); return json(JSONObject.NULL);
                case "store.delete": apagar(a.optString("store"), a.optString("key", null)); return json(JSONObject.NULL);
                case "store.space": return json(espaco());
                case "nativo.disponivel": return json(new JSONObject().put("sistemas", new JSONArray()));
                // sem pasta Kof Games no celular ainda (M14.3): o app abre jogos pelo seletor de arquivos e guarda a cópia na loja roms
                case "library.root.get": return json(new JSONObject().put("path", JSONObject.NULL).put("ok", false)
                        .put("missing", new JSONArray()).put("sugestao", ""));
                default:
                    throw new Erro("UNSUPPORTED", "o comando " + cmd + " ainda não existe no celular ("
                            + (cmd.startsWith("library.") || cmd.startsWith("file.") ? "pasta de ROMs: M14.3"
                            : cmd.startsWith("nativo.") ? "PS1 e N64 nativos: M14.4" : "casca do Android: M14.1") + ")");
            }
        } catch (JSONException e) {
            throw new Erro("INVALID_ARGS", "argumento inválido em " + cmd + ": " + e.getMessage());
        } catch (IOException e) {
            throw new Erro("IO_ERROR", "erro de leitura ou escrita em " + cmd + ": " + e.getMessage());
        }
    }

    private static Saida json(Object o) { return new Saida(o, null); }

    // ---------------------------------------------------------------- log

    private Saida logar(JSONObject a) throws IOException {
        File pasta = new File(dados, "logs");
        if (!pasta.isDirectory() && !pasta.mkdirs()) throw new IOException("não consegui criar " + pasta);
        File f = new File(pasta, "kofstation.log");
        if (f.length() > 2 << 20) { // 2 MB: guarda o anterior e começa de novo
            File antigo = new File(pasta, "kofstation.log.1");
            if (antigo.exists() && !antigo.delete()) throw new IOException("não consegui apagar o log antigo");
            if (!f.renameTo(antigo)) throw new IOException("não consegui girar o log");
        }
        String msg = a.optString("message");
        String linha = System.currentTimeMillis() + " [" + a.optString("level") + "] " + a.optString("target") + ": "
                + (msg.length() > 8192 ? msg.substring(0, 8192) : msg) + "\n";
        try (FileOutputStream o = new FileOutputStream(f, true)) { o.write(linha.getBytes(StandardCharsets.UTF_8)); }
        return json(JSONObject.NULL);
    }

    // ---------------------------------------------------------------- config

    private File arquivoDaConfig(String doc) throws Erro {
        if (!"config".equals(doc)) throw new Erro("INVALID_ARGS", "documento desconhecido: " + doc);
        return new File(new File(dados, "config"), "config.json");
    }

    private JSONObject lerConfig(String doc) throws Erro, IOException {
        File f = arquivoDaConfig(doc);
        JSONObject v;
        if (!f.isFile()) v = new JSONObject();
        else {
            try {
                v = new JSONObject(new String(ler(f), StandardCharsets.UTF_8));
            } catch (JSONException e) {
                // arquivo estragado: guarda uma cópia e começa do zero, sem derrubar o app (igual ao Rust)
                copiar(f, new File(f.getPath() + ".estragado"));
                v = new JSONObject();
            }
        }
        if (v.optInt("versao", VERSAO_DA_CONFIG) > VERSAO_DA_CONFIG) throw new Erro("SCHEMA_TOO_NEW", doc + " v" + v.optInt("versao"));
        JSONObject valores = v.optJSONObject("valores");
        try {
            return new JSONObject().put("versao", VERSAO_DA_CONFIG).put("valores", valores == null ? new JSONObject() : valores);
        } catch (JSONException e) { throw new Erro("INVALID_ARGS", e.getMessage()); }
    }

    private void gravarConfig(String doc, JSONObject data) throws Erro, IOException, JSONException {
        File f = arquivoDaConfig(doc);
        if (data == null) throw new Erro("INVALID_ARGS", "faltou o argumento data");
        if (data.optInt("versao", VERSAO_DA_CONFIG) > VERSAO_DA_CONFIG) throw new Erro("SCHEMA_TOO_NEW", doc);
        JSONObject valores = data.optJSONObject("valores");
        if (valores == null) throw new Erro("INVALID_ARGS", "data.valores: esperava um objeto");
        for (java.util.Iterator<String> it = valores.keys(); it.hasNext();) {
            String k = it.next();
            if (!(valores.get(k) instanceof String)) throw new Erro("INVALID_ARGS", "o valor de " + k + " tem que ser texto");
        }
        gravarAtomico(f, new JSONObject().put("versao", VERSAO_DA_CONFIG).put("valores", valores).toString(2).getBytes(StandardCharsets.UTF_8));
    }

    // ---------------------------------------------------------------- lojas (store.*)

    /** A chave vira nome de arquivo com %XX no que não for letra, número, '_' , '-' ou '.' (não no começo nem repetido). */
    static String codificar(String chave) throws Erro {
        if (chave == null || chave.isEmpty() || chave.getBytes(StandardCharsets.UTF_8).length > 400)
            throw new Erro("INVALID_ARGS", "key: chave vazia ou grande demais");
        StringBuilder s = new StringBuilder();
        for (byte x : chave.getBytes(StandardCharsets.UTF_8)) {
            int b = x & 0xff;
            boolean letra = (b >= '0' && b <= '9') || (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z');
            if (letra || b == '_' || b == '-' || (b == '.' && s.length() > 0 && s.charAt(s.length() - 1) != '.')) s.append((char) b);
            else s.append(String.format("%%%02X", b));
        }
        return s.toString();
    }

    static String decodificar(String nome) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] b = nome.getBytes(StandardCharsets.UTF_8);
        for (int i = 0; i < b.length; i++) {
            if (b[i] == '%' && i + 3 <= b.length) {
                try { o.write(Integer.parseInt(new String(b, i + 1, 2, StandardCharsets.UTF_8), 16)); i += 2; continue; }
                catch (NumberFormatException e) { /* não é %XX: segue como texto */ }
            }
            o.write(b[i]);
        }
        return new String(o.toByteArray(), StandardCharsets.UTF_8);
    }

    private File pastaDaLoja(String loja) throws Erro {
        if (!Arrays.asList(LOJAS).contains(loja)) throw new Erro("INVALID_ARGS", "store: loja desconhecida: " + loja);
        return new File(dados, loja);
    }

    private void por(String loja, String chave, JSONObject meta, byte[] bytes) throws Erro, IOException {
        File d = pastaDaLoja(loja);
        if (!d.isDirectory() && !d.mkdirs()) throw new IOException("não consegui criar " + d);
        String c = codificar(chave);
        File bin = new File(d, c + ".bin");
        if (bytes == null || bytes.length == 0) { if (bin.exists() && !bin.delete()) throw new IOException("não consegui apagar " + bin); }
        else gravarAtomico(bin, bytes);
        gravarAtomico(new File(d, c + ".json"), (meta == null ? "null" : meta.toString()).getBytes(StandardCharsets.UTF_8));
    }

    private byte[] pegar(String loja, String chave) throws Erro, IOException {
        File d = pastaDaLoja(loja);
        String c = codificar(chave);
        if (!new File(d, c + ".json").isFile()) throw new Erro("NOT_FOUND", loja + "/" + chave + " não existe");
        File bin = new File(d, c + ".bin");
        return bin.isFile() ? ler(bin) : new byte[0];
    }

    private Object meta(String loja, String chave) throws Erro, IOException, JSONException {
        File j = new File(pastaDaLoja(loja), codificar(chave) + ".json");
        if (!j.isFile()) throw new Erro("NOT_FOUND", loja + "/" + chave + " não existe");
        String t = new String(ler(j), StandardCharsets.UTF_8).trim();
        return "null".equals(t) ? JSONObject.NULL : new JSONObject(t);
    }

    private void apagar(String loja, String chave) throws Erro, IOException {
        File d = pastaDaLoja(loja);
        String c = codificar(chave);
        for (String ext : new String[] { ".json", ".bin" }) {
            File f = new File(d, c + ext);
            if (f.exists() && !f.delete()) throw new IOException("não consegui apagar " + f);
        }
    }

    private JSONArray listar(String loja, String prefixo) throws Erro, IOException, JSONException {
        File d = pastaDaLoja(loja);
        File[] arquivos = d.listFiles();
        List<String[]> achados = new ArrayList<>();
        if (arquivos != null) for (File f : arquivos) {
            String nome = f.getName();
            if (!nome.endsWith(".json")) continue;
            String chave = decodificar(nome.substring(0, nome.length() - 5));
            if (prefixo != null && !prefixo.isEmpty() && !chave.startsWith(prefixo)) continue;
            achados.add(new String[] { chave, nome.substring(0, nome.length() - 5) });
        }
        Collections.sort(achados, new java.util.Comparator<String[]>() { // sem lambda: o dx do minSdk 24 não aceita invokedynamic
            @Override public int compare(String[] x, String[] y) { return x[0].compareTo(y[0]); }
        });
        JSONArray r = new JSONArray();
        for (String[] k : achados) {
            Object m;
            try {
                String t = new String(ler(new File(d, k[1] + ".json")), StandardCharsets.UTF_8).trim();
                m = "null".equals(t) ? JSONObject.NULL : new JSONObject(t);
            } catch (JSONException e) { continue; } // registro com JSON estragado: ignorado (igual ao Rust)
            File bin = new File(d, k[1] + ".bin");
            r.put(new JSONObject().put("key", k[0]).put("meta", m).put("size", bin.isFile() ? bin.length() : 0));
        }
        return r;
    }

    private JSONArray espaco() throws JSONException {
        JSONArray r = new JSONArray();
        for (String loja : LOJAS) {
            long bytes = 0, itens = 0;
            File[] l = new File(dados, loja).listFiles();
            if (l != null) for (File f : l) {
                if (f.getName().endsWith(".json")) itens++;
                if (f.getName().endsWith(".bin")) bytes += f.length();
            }
            if (itens > 0 || bytes > 0) r.put(new JSONObject().put("store", loja).put("bytes", bytes).put("items", itens));
        }
        return r;
    }

    // ---------------------------------------------------------------- arquivos

    static byte[] ler(File f) throws IOException {
        try (InputStream in = new FileInputStream(f); ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            byte[] b = new byte[64 * 1024];
            for (int n; (n = in.read(b)) > 0;) o.write(b, 0, n);
            return o.toByteArray();
        }
    }

    static void copiar(File de, File para) throws IOException { gravarAtomico(para, ler(de)); }

    /** Arquivo temporário + rename: nunca deixa um arquivo pela metade. */
    static void gravarAtomico(File alvo, byte[] bytes) throws IOException {
        File pai = alvo.getParentFile();
        if (pai != null && !pai.isDirectory() && !pai.mkdirs()) throw new IOException("não consegui criar " + pai);
        File tmp = new File(alvo.getPath() + ".tmp");
        try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(bytes); o.getFD().sync(); }
        if (!tmp.renameTo(alvo)) throw new IOException("não consegui trocar " + alvo);
    }
}
