package io.slikk.ticktack;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native half of apps/web/src/lib/native/watch-session.ts.
 *
 * {@code WatchBridge.setSession({ apiUrl, token })} relays the API base URL
 * and the bearer token to the paired Wear OS watch; a null token signs it out.
 */
@CapacitorPlugin(name = "WatchBridge")
public class WatchBridgePlugin extends Plugin {

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
