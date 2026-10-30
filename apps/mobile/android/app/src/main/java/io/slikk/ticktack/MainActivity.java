package io.slikk.ticktack;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;
import io.slikk.ticktack.widget.TaskWidgetProvider;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins that live in this app module are not on Capacitor's
        // generated plugin list, so they register here, before the bridge
        // starts.
        registerPlugin(NativeSessionPlugin.class);
        // Capacitor's SystemBars plugin (insetsHandling: css) pads the web
        // view, so the activity can draw behind the system bars on every
        // Android version, not only on Android 15+ where it is enforced.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Whatever the user just did in the app, the home screen widget
        // should show it; this is a no-op while no widget is placed.
        TaskWidgetProvider.requestUpdate(this);
    }
}
