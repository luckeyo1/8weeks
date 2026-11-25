-- 이용 통계: 기능별 하루 사용 횟수의 합계만 저장한다. 누가 썼는지(사용자 id)는 저장하지 않는다.
-- (날짜, 이벤트)마다 한 행이고 count 만 올라간다. 관리자 › 이용 통계에서 본다.
-- D1 콘솔은 한 줄 입력이라 아래 한 줄을 그대로 실행하면 된다.
create table if not exists usage_events (day text not null, event text not null, count integer not null default 0, primary key (day, event));
