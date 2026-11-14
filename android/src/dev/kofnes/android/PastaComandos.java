package dev.kofnes.android;

import android.os.ParcelFileDescriptor;
import dev.kofstation.android.Comandos;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.CRC32;
import java.util.zip.DataFormatException;
import java.util.zip.Inflater;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * A pasta de ROMs do celular (Pasta.java, SAF) vista pelo contrato do app novo: `library.root.get`, `library.scan`,
 * `file.read/stat`, `file.zip.list/read` e `pasta.preparar` (o PS1/N64 nativo copia o CD direto da pasta). Os caminhos são
 * "Games/<caminho dentro da pasta escolhida>": o app novo acha o console pela extensão e pelo conteúdo do zip, então a
 * pasta pode ter qualquer organização. Organizar e importar arquivos pra dentro dela é coisa do PC (UNSUPPORTED).
 */
final class PastaComandos implements Comandos.Delegado {
    private final Pasta pasta;
    private final MainActivity.Preparar preparar;

    PastaComandos(Pasta pasta, MainActivity.Preparar preparar) {
        this.pasta = pasta;
        this.preparar = preparar;
    }

    @Override
    public Comandos.Saida chamar(String cmd, JSONObject a, byte[] corpo) throws Comandos.Erro, IOException, JSONException {
        switch (cmd) {
            case "library.root.get": {
                String nome = pasta.nome();
                return json(new JSONObject().put("path", nome.isEmpty() ? JSONObject.NULL : nome).put("ok", !nome.isEmpty())
                        .put("missing", new JSONArray()).put("sugestao", ""));
            }
            case "library.scan": {
                if (pasta.nome().isEmpty()) throw new Comandos.Erro("ROOT_MISSING", "escolha a pasta de ROMs (Biblioteca → Escolher a pasta)");
                StringBuilder er = new StringBuilder("\\.(");
                JSONArray exts = a.optJSONArray("exts");
                for (int i = 0; exts != null && i < exts.length(); i++) er.append(i > 0 ? "|" : "").append(java.util.regex.Pattern.quote(exts.getString(i)));
                er.append(")$");
                JSONArray lista = new JSONArray(pasta.listar(er.toString()));
                JSONArray files = new JSONArray();
                for (int i = 0; i < lista.length(); i++) {
                    JSONObject x = lista.getJSONObject(i);
                    files.put(new JSONObject().put("path", "Games/" + x.getString("r")).put("size", x.getLong("t")).put("modified", 0));
                }
                return json(new JSONObject().put("root", pasta.nome()).put("files", files));
            }
            case "library.crc": return json(new JSONObject().put("crcs", new JSONObject())); // o CRC No-Intro fica pro PC; sem ele a biblioteca usa o nome
            case "library.inventory": return json(new JSONObject().put("files", new JSONArray()).put("dirs", new JSONArray()));
            case "file.stat": {
                Pasta.Item it = item(a);
                return json(new JSONObject().put("size", it.tamanho >= 0 ? it.tamanho : tamanho(it)).put("dir", false));
            }
            case "file.read": {
                Pasta.Item it = item(a);
                return new Comandos.Saida(null, ler(it, a.optLong("offset", 0), a.has("length") ? a.getLong("length") : -1));
            }
            case "file.zip.list": {
                Pasta.Item it = item(a);
                ParcelFileDescriptor f = pasta.abrir(it);
                try {
                    FileChannel c = new FileInputStream(f.getFileDescriptor()).getChannel();
                    JSONArray itens = new JSONArray();
                    for (Entrada e : central(c)) itens.put(new JSONObject().put("nome", e.nome).put("tamanho", e.tamanho).put("crc", String.format("%08x", e.crc)));
                    return json(new JSONObject().put("size", c.size()).put("itens", itens));
                } finally { f.close(); }
            }
            case "file.zip.read": {
                Pasta.Item it = item(a);
                ParcelFileDescriptor f = pasta.abrir(it);
                try {
                    FileChannel c = new FileInputStream(f.getFileDescriptor()).getChannel();
                    String alvo = a.optString("entrada");
                    for (Entrada e : central(c)) if (e.nome.equals(alvo)) return new Comandos.Saida(null, extrair(c, e, a.has("length") ? a.getLong("length") : -1));
                    throw new Comandos.Erro("NOT_FOUND", "não achei " + alvo + " dentro do zip");
                } finally { f.close(); }
            }
            case "pasta.preparar": { // o PS1/N64 nativo vai copiar este arquivo (e as faixas dele) direto da pasta
                Pasta.Item it = item(a);
                preparar.preparar(it.uri.toString());
                return json(JSONObject.NULL);
            }
            case "library.organize.apply": case "library.import": case "library.import.parte":
                throw new Comandos.Erro("UNSUPPORTED", "organizar e importar arquivos pra pasta de ROMs só existe no PC; no celular a pasta é só de leitura");
            default: return null;
        }
    }

    private static Comandos.Saida json(Object o) { return new Comandos.Saida(o, null); }

    private Pasta.Item item(JSONObject a) throws Comandos.Erro {
        String p = a.optString("path");
        Pasta.Item it = pasta.porCaminho(p.startsWith("Games/") ? p.substring(6) : p);
        if (it == null) throw new Comandos.Erro("NOT_FOUND", "o arquivo " + p + " não está na pasta de ROMs (ela mudou? escolha a pasta de novo)");
        return it;
    }

    private long tamanho(Pasta.Item it) throws IOException {
        ParcelFileDescriptor f = pasta.abrir(it);
        try { return f.getStatSize(); } finally { f.close(); }
    }

    private byte[] ler(Pasta.Item it, long off, long len) throws IOException {
        ParcelFileDescriptor f = pasta.abrir(it);
        try {
            FileChannel c = new FileInputStream(f.getFileDescriptor()).getChannel();
            long total = c.size();
            long n = len < 0 ? total - off : Math.min(len, total - off);
            if (n < 0) n = 0;
            if (n > Integer.MAX_VALUE - 8) throw new IOException("arquivo grande demais pra passar pela página: " + it.nome);
            ByteBuffer b = ByteBuffer.allocate((int) n);
            c.position(off);
            while (b.hasRemaining() && c.read(b) > 0) { /* lê até encher */ }
            return b.array();
        } finally { f.close(); }
    }

    // ---------------------------------------------------------------- zip (diretório central, sem ler o arquivo todo)

    private static final class Entrada { String nome; long tamanho, comprimido, local; int metodo; long crc; }

    private static int u16(ByteBuffer b, int i) { return b.getShort(i) & 0xffff; }
    private static long u32(ByteBuffer b, int i) { return b.getInt(i) & 0xffffffffL; }

    private static List<Entrada> central(FileChannel c) throws IOException {
        long tam = c.size();
        int cauda = (int) Math.min(tam, 65557);
        ByteBuffer t = ByteBuffer.allocate(cauda).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        c.position(tam - cauda);
        while (t.hasRemaining() && c.read(t) > 0) { /* lê */ }
        int e = -1;
        for (int i = cauda - 22; i >= 0; i--) if (u32(t, i) == 0x06054b50L) { e = i; break; }
        if (e < 0) throw new IOException("isso não parece um zip");
        int n = u16(t, e + 10);
        long tamDir = u32(t, e + 12), iniDir = u32(t, e + 16);
        ByteBuffer d = ByteBuffer.allocate((int) tamDir).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        c.position(iniDir);
        while (d.hasRemaining() && c.read(d) > 0) { /* lê */ }
        List<Entrada> r = new ArrayList<Entrada>();
        int p = 0;
        for (int k = 0; k < n && p + 46 <= d.capacity() && u32(d, p) == 0x02014b50L; k++) {
            Entrada x = new Entrada();
            x.metodo = u16(d, p + 10);
            x.crc = u32(d, p + 16);
            x.comprimido = u32(d, p + 20);
            x.tamanho = u32(d, p + 24);
            int ln = u16(d, p + 28), le = u16(d, p + 30), lc = u16(d, p + 32);
            x.local = u32(d, p + 42);
            byte[] nome = new byte[ln];
            for (int i = 0; i < ln; i++) nome[i] = d.get(p + 46 + i);
            x.nome = new String(nome, java.nio.charset.StandardCharsets.UTF_8);
            if (!x.nome.endsWith("/")) r.add(x);
            p += 46 + ln + le + lc;
        }
        return r;
    }

    private static byte[] extrair(FileChannel c, Entrada e, long limite) throws IOException {
        ByteBuffer h = ByteBuffer.allocate(30).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        c.position(e.local);
        while (h.hasRemaining() && c.read(h) > 0) { /* lê */ }
        long ini = e.local + 30 + u16(h, 26) + u16(h, 28);
        if (e.comprimido > Integer.MAX_VALUE - 8 || e.tamanho > Integer.MAX_VALUE - 8) throw new IOException("entrada grande demais pra passar pela página: " + e.nome);
        ByteBuffer dados = ByteBuffer.allocate((int) e.comprimido);
        c.position(ini);
        while (dados.hasRemaining() && c.read(dados) > 0) { /* lê */ }
        int quanto = (int) (limite >= 0 ? Math.min(limite, e.tamanho) : e.tamanho);
        if (e.metodo == 0) return java.util.Arrays.copyOf(dados.array(), quanto);
        if (e.metodo != 8) throw new IOException("método de compressão " + e.metodo + " não suportado em " + e.nome);
        Inflater inf = new Inflater(true);
        try {
            inf.setInput(dados.array());
            byte[] saida = new byte[quanto];
            int got = 0;
            while (got < quanto && !inf.finished()) {
                int k = inf.inflate(saida, got, quanto - got);
                if (k == 0 && (inf.needsInput() || inf.needsDictionary())) break;
                got += k;
            }
            return got == quanto ? saida : java.util.Arrays.copyOf(saida, got);
        } catch (DataFormatException ex) {
            throw new IOException("zip corrompido em " + e.nome + ": " + ex.getMessage());
        } finally { inf.end(); }
    }
}
