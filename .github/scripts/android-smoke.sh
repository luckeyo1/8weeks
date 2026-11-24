#!/usr/bin/env bash
# 에뮬레이터에 APK 를 설치·실행하고, 앱이 비정상 종료되는지 logcat 으로 확인한다.
# 사용: android-smoke.sh <출력폴더> <apk>...
set -u
OUT="$1"; shift
PKG=com.luckeyo.prayertogether
mkdir -p "$OUT"
status=0

adb wait-for-device
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 1; done'
adb shell getprop ro.build.version.release
adb shell pm list packages | grep -E 'chrome|webview' || true

for APK in "$@"; do
  name=$(basename "$APK" .apk)
  echo "::group::$name"
  adb uninstall "$PKG" >/dev/null 2>&1 || true
  adb install -r "$APK" || { echo "::error::$name 설치 실패"; status=1; echo "::endgroup::"; continue; }
  adb logcat -c
  adb shell am start -W -n "$PKG/.LauncherActivity"
  sleep 25
  adb logcat -d -v time > "$OUT/logcat-$name.txt"
  adb exec-out screencap -p > "$OUT/screen-$name.png" || true
  adb shell dumpsys activity activities | grep -E 'ResumedActivity' | head -5 || true
  if grep -q "FATAL EXCEPTION" "$OUT/logcat-$name.txt"; then
    echo "::error::$name 비정상 종료 발견"
    grep -A 60 "FATAL EXCEPTION" "$OUT/logcat-$name.txt" | head -120
    status=1
  else
    echo "$name: 비정상 종료 없음"
    grep -E "$PKG|TWALauncher|TwaLauncher|androidbrowserhelper" "$OUT/logcat-$name.txt" | head -60 || true
  fi
  echo "::endgroup::"
done
exit $status
