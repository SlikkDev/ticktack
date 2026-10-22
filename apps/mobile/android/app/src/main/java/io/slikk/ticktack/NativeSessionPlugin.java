package io.slikk.ticktack;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native half of apps/web/src/lib/native/native-session.ts.
 *
 * {@code NativeSession.setSession({ apiUrl, token })} hands the API base URL
 * and the bearer token to native code. On Android that is the Wear OS relay;
 * the Assistant App Actions in res/xml/shortcuts.xml deep-link into the web
 * app and need no token of their own. A null token signs the watch out.
 */
@CapacitorPlugin(name = "NativeSession")
public class NativeSessionPlugin extends Plugin {

    @PluginMethod
    public void setSession(PluginCall call) {
        String apiUrl = call.getString("apiUrl");
        if (apiUrl == null || apiUrl.isEmpty()) {
            call.reject("apiUrl is required");
            return;
        }
        String token = call.getData().isNull("token") ? null : call.getString("token");
        WatchSessionRelay.update(getContext(), apiUrl, token);
        call.resolve();
    }
}
