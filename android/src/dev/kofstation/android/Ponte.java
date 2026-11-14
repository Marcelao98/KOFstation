package dev.kofstation.android;

import android.util.Base64;
import android.webkit.JavascriptInterface;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * A ponte `window.KofAndroid` que a página usa (apps/desktop/src/platform/android.ts): um método só, `chamar`, que recebe o
 * comando, os argumentos em JSON e os bytes em base64 e devolve `{"ok":true,"data":…,"bin":"<base64>"}` ou
 * `{"ok":false,"error":{code,message}}`. Roda na thread da ponte do WebView (não na da página).
 */
public final class Ponte {
    private final Comandos comandos;

    public Ponte(Comandos comandos) { this.comandos = comandos; }

    @JavascriptInterface
    public String chamar(String cmd, String argsJson, String corpoBase64) {
        try {
            JSONObject a = argsJson == null || argsJson.isEmpty() ? new JSONObject() : new JSONObject(argsJson);
            byte[] corpo = corpoBase64 == null || corpoBase64.isEmpty() ? new byte[0] : Base64.decode(corpoBase64, Base64.NO_WRAP);
            Comandos.Saida s = comandos.chamar(cmd, a, corpo);
            JSONObject r = new JSONObject().put("ok", true);
            if (s.bin != null) r.put("bin", Base64.encodeToString(s.bin, Base64.NO_WRAP));
            else r.put("data", s.data);
            return r.toString();
        } catch (Comandos.Erro e) {
            return erro(e.codigo, e.getMessage());
        } catch (JSONException | IllegalArgumentException e) {
            return erro("INVALID_ARGS", "argumentos inválidos em " + cmd + ": " + e.getMessage());
        } catch (RuntimeException e) {
            // nunca deixa a página sem resposta: o erro volta com o código do contrato e a causa
            return erro("INTERNAL", "falha na casca do Android em " + cmd + ": " + e);
        }
    }

    private static String erro(String codigo, String mensagem) {
        try {
            return new JSONObject().put("ok", false).put("error", new JSONObject().put("code", codigo).put("message", mensagem)).toString();
        } catch (JSONException e) {
            return "{\"ok\":false,\"error\":{\"code\":\"INTERNAL\",\"message\":\"erro ao montar a resposta\"}}";
        }
    }
}
