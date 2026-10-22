package io.slikk.ticktack;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins that live in this app module are not on Capacitor's
        // generated plugin list, so they register here, before the bridge
        // starts.
        registerPlugin(WatchBridgePlugin.class);
        // Capacitor's SystemBars plugin (insetsHandling: css) pads the web
        // view, so the activity can draw behind the system bars on every
        // Android version, not only on Android 15+ where it is enforced.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
