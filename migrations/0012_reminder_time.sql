-- 알림 시간 선택(매일 정한 시간에 한 번). 시간은 서비스 timezone(기본 Asia/Seoul) 기준 "HH:MM".
-- reminder_time 이 NULL 이면 기본 08:00. reminder_sent_date 는 같은 날 두 번 보내지 않기 위한 표시.
-- D1 콘솔은 한 줄 입력이라 아래 두 문장을 한 줄씩 실행하면 된다.
alter table users add column reminder_time text;
alter table users add column reminder_sent_date text;
