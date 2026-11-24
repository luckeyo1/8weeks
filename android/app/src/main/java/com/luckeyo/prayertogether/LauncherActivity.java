package com.luckeyo.prayertogether;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;

/**
 * 앱 진입점. 크롬 Trusted Web Activity 로 웹앱(launchUrl)을 연다.
 * 딥링크(https://호스트/...)로 들어오면 그 주소를 그대로 연다.
 */
public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 8.0(O) 이하에서는 투명 테마 + 방향 고정이 충돌해 앱이 종료된다.
        // 그래서 O 초과에서만 세로 고정한다. (웹앱 자체는 크롬이 manifest 방향을 따른다)
        // https://github.com/GoogleChromeLabs/bubblewrap/issues/496
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }
}
