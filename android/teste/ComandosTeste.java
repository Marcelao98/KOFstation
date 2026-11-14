import dev.kofstation.android.Comandos;
import java.io.File;
import java.nio.file.Files;
import org.json.JSONArray;
import org.json.JSONObject;

/** Teste de JVM dos comandos da casca (sem Android). Rode: android/testar.sh */
public class ComandosTeste {
    static int falhas = 0;
    static void conferir(boolean ok, String o) { if (!ok) { falhas++; System.out.println("FALHOU: " + o); } else System.out.println("ok: " + o); }

    static String erro(Comandos c, String cmd, JSONObject a) {
        try { c.chamar(cmd, a, new byte[0]); return "sem erro"; } catch (Comandos.Erro e) { return e.codigo + ": " + e.getMessage(); }
    }

    public static void main(String[] args) throws Exception {
        File d = Files.createTempDirectory("kof-teste").toFile();
        Comandos c = new Comandos(d, "9.9.9");
        JSONObject info = (JSONObject) c.chamar("app.info", new JSONObject(), new byte[0]).data;
        conferir("android".equals(info.getString("os")) && "9.9.9".equals(info.getString("version")), "app.info diz android e a versão");

        // config: vazia, grava, lê, valor que não é texto é recusado
        JSONObject cfg = (JSONObject) c.chamar("config.read", new JSONObject().put("doc", "config"), new byte[0]).data;
        conferir(cfg.getJSONObject("valores").length() == 0, "config começa vazia");
        c.chamar("config.write", new JSONObject().put("doc", "config").put("data", new JSONObject().put("versao", 1)
                .put("valores", new JSONObject().put("tema", "cafe").put("volume", "80"))), new byte[0]);
        cfg = (JSONObject) c.chamar("config.read", new JSONObject().put("doc", "config"), new byte[0]).data;
        conferir("cafe".equals(cfg.getJSONObject("valores").getString("tema")), "config volta o que foi gravado");
        conferir(erro(c, "config.write", new JSONObject().put("doc", "config").put("data", new JSONObject().put("valores", new JSONObject().put("x", 1))))
                .startsWith("INVALID_ARGS"), "config recusa valor que não é texto");
        conferir(erro(c, "config.read", new JSONObject().put("doc", "outro")).startsWith("INVALID_ARGS"), "config recusa documento desconhecido");
        conferir(erro(c, "config.write", new JSONObject().put("doc", "config").put("data", new JSONObject().put("versao", 2).put("valores", new JSONObject())))
                .startsWith("SCHEMA_TOO_NEW"), "config recusa versão mais nova");
        Files.write(new File(d, "config/config.json").toPath(), "{estragado".getBytes());
        cfg = (JSONObject) c.chamar("config.read", new JSONObject().put("doc", "config"), new byte[0]).data;
        conferir(cfg.getJSONObject("valores").length() == 0 && new File(d, "config/config.json.estragado").isFile(), "config estragada volta vazia e guarda cópia");

        // lojas: put/list/get/meta/delete/space, chave com acento e barra, sem bytes apaga o .bin
        byte[] bytes = { 1, 2, 3, 4 };
        String chave = "Sonic o Ouriço|32768";
        c.chamar("store.put", new JSONObject().put("store", "saves").put("key", chave).put("meta", new JSONObject().put("n", 4)), bytes);
        conferir(new File(d, "saves/Sonic%20o%20Ouri%C3%A7o%7C32768.json").isFile(), "arquivo com o mesmo nome codificado do Rust");
        JSONArray lista = (JSONArray) c.chamar("store.list", new JSONObject().put("store", "saves"), new byte[0]).data;
        conferir(lista.length() == 1 && chave.equals(lista.getJSONObject(0).getString("key")) && lista.getJSONObject(0).getInt("size") == 4, "store.list acha a chave com o tamanho");
        conferir(java.util.Arrays.equals(bytes, c.chamar("store.get", new JSONObject().put("store", "saves").put("key", chave), new byte[0]).bin), "store.get devolve os bytes");
        conferir(((JSONObject) c.chamar("store.meta", new JSONObject().put("store", "saves").put("key", chave), new byte[0]).data).getInt("n") == 4, "store.meta devolve os metadados");
        conferir(((JSONArray) c.chamar("store.list", new JSONObject().put("store", "saves").put("prefix", "Zelda"), new byte[0]).data).length() == 0, "prefixo filtra");
        JSONArray esp = (JSONArray) c.chamar("store.space", new JSONObject(), new byte[0]).data;
        conferir(esp.length() == 1 && esp.getJSONObject(0).getLong("bytes") == 4, "store.space soma os bytes");
        c.chamar("store.put", new JSONObject().put("store", "saves").put("key", chave).put("meta", new JSONObject().put("n", 0)), new byte[0]);
        conferir(c.chamar("store.get", new JSONObject().put("store", "saves").put("key", chave), new byte[0]).bin.length == 0, "sem bytes: o .bin antigo sai");
        c.chamar("store.delete", new JSONObject().put("store", "saves").put("key", chave), new byte[0]);
        conferir(erro(c, "store.get", new JSONObject().put("store", "saves").put("key", chave)).startsWith("NOT_FOUND"), "apagado: NOT_FOUND");
        conferir(erro(c, "store.put", new JSONObject().put("store", "nao-existe").put("key", "k")).startsWith("INVALID_ARGS"), "loja desconhecida é recusada");
        conferir(erro(c, "store.get", new JSONObject().put("store", "saves")).startsWith("INVALID_ARGS"), "sem chave é recusado");

        // o que ainda não existe diz o porquê, em português
        String e = erro(c, "library.scan", new JSONObject());
        conferir(e.startsWith("UNSUPPORTED") && e.contains("M14.3"), "library.scan: UNSUPPORTED apontando o M14.3");
        conferir(erro(c, "nativo.abrir", new JSONObject()).contains("M14.4"), "nativo.abrir: UNSUPPORTED apontando o M14.4");
        conferir(((JSONArray) ((JSONObject) c.chamar("nativo.disponivel", new JSONObject(), new byte[0]).data).get("sistemas")).length() == 0, "nenhum núcleo nativo por enquanto");
        JSONObject raiz = (JSONObject) c.chamar("library.root.get", new JSONObject(), new byte[0]).data;
        conferir(raiz.isNull("path") && !raiz.getBoolean("ok"), "library.root.get: sem pasta escolhida");

        // codificar/decodificar iguais ao Rust
        c.chamar("log.write", new JSONObject().put("level", "info").put("target", "teste").put("message", "oi"), new byte[0]);
        conferir(new File(d, "logs/kofstation.log").length() > 0, "log.write grava no arquivo");

        System.out.println(falhas == 0 ? "TUDO OK" : falhas + " FALHAS");
        System.exit(falhas == 0 ? 0 : 1);
    }
}
