package com.luckeyo.prayertogether;

/**
 * 웹 푸시 알림을 이 앱의 알림으로 표시하도록 크롬에 위임받는 서비스.
 * (알림 권한 요청/표시는 android-browser-helper 기본 구현을 그대로 쓴다)
 */
public class DelegationService
        extends com.google.androidbrowserhelper.trusted.DelegationService {
}
