package io.slikk.ticktack.widget;

import android.content.Intent;
import android.widget.RemoteViewsService;

/** Supplies the rows of the widget's task list; see {@link TaskListFactory}. */
public class TaskListService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new TaskListFactory(getApplicationContext());
    }
}
