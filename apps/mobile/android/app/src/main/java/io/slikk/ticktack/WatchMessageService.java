package io.slikk.ticktack;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;

/**
 * Answers a watch that asks for the session, for example right after the
 * watch app was installed. Play services starts this service on demand, so
 * the phone app does not have to be running.
 */
public class WatchMessageService extends WearableListenerService {

    @Override
    public void onMessageReceived(MessageEvent event) {
        if (WatchSessionRelay.REQUEST_SESSION_PATH.equals(event.getPath())) {
            WatchSessionRelay.publish(this);
        }
    }
}
