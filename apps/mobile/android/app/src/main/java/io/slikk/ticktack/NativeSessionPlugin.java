package io.slikk.ticktack;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import io.slikk.ticktack.widget.TaskWidgetProvider;

/**
 * Native half of apps/web/src/lib/native/native-session.ts.
 *
 * {@code NativeSession.setSession({ apiUrl, clientUrl, token })} hands the URLs
 * and the bearer token to native code: the home screen widget calls the API
 * with them and the Wear OS relay forwards them to the watch. The Assistant
 * App Actions in res/xml/shortcuts.xml deep-link into the web app and need no
 * token of their own. A null token signs the widget and the watch out.
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
        String clientUrl = call.getData().isNull("clientUrl") ? null : call.getString("clientUrl");
        String token = call.getData().isNull("token") ? null : call.getString("token");
        Context context = getContext();
        NativeSessionStore.save(context, apiUrl, clientUrl, token);
        WatchSessionRelay.publish(context);
        // The widget shows the signed-in user's tasks, or asks to sign in.
        TaskWidgetProvider.requestUpdate(context);
        call.resolve();
    }
}
