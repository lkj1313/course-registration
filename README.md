# Course Registration

NestJS, Prisma, PostgreSQL로 구현한 대학교 수강신청 시스템 백엔드 연습 프로젝트입니다.

이 저장소는 실제 제출용 과제를 그대로 제출하려고 만든 것이 아니라, 이미 공개된 과제 요구사항을 기준으로 백엔드 설계와 구현을 연습하기 위해 만든 프로젝트입니다.  
그래서 README도 단순 실행법만 적기보다, 왜 이런 구조를 선택했는지와 어떤 식으로 기능을 풀어갔는지를 같이 정리했습니다.

## 1. 이 프로젝트에서 연습하려고 한 것

이 프로젝트를 하면서 의도한 연습 포인트는 아래와 같습니다.

- NestJS로 REST API 구조 잡기
- Prisma + PostgreSQL 조합으로 DB 설계하기
- 대량 시드 데이터 생성하기
- DTO와 ValidationPipe를 사용해 입력 검증하기
- 수강신청 도메인 규칙을 서비스 로직으로 구현하기
- 동시 요청 상황에서 정원 초과를 막는 방식 이해하기
- 기능 단위 브랜치와 커밋으로 작업 흐름 나누기

즉, “그냥 기능만 대충 붙이는 것”보다 아래 질문에 답할 수 있도록 만드는 것이 목표였습니다.

- 왜 이 테이블 구조가 필요한가?
- 왜 Prisma를 이렇게 연결했는가?
- 왜 수강신청은 조회 API보다 어렵고 중요한가?
- 왜 동시성은 애플리케이션 로직만으로는 불안한가?

## 2. 사용 기술

- NestJS
- Prisma
- PostgreSQL
- Docker Compose
- pnpm
- Jest / Supertest

## 3. 왜 이 조합을 골랐나

### NestJS

과제 요구사항이 “서버를 구조적으로 구현해보는 것”에 가까워 보여서, 단순 Express보다 모듈/서비스/컨트롤러가 나뉘는 NestJS가 연습에 더 적합하다고 판단했습니다.

### Prisma

ORM을 직접 한 번 써보면서 다음을 같이 연습하고 싶었습니다.

- 스키마 설계
- 마이그레이션
- 타입 안전한 쿼리
- DTO와 서비스 계층 연결

다만 Prisma를 쓴다고 동시성이 자동으로 해결되지는 않기 때문에, 핵심 로직에서는 트랜잭션과 row lock 개념을 따로 이해해야 했습니다.

### PostgreSQL

이 과제는 “정원 1명 남은 강좌에 100명이 동시에 신청해도 1명만 성공해야 한다”가 핵심이라서, SQLite보다 PostgreSQL이 더 적합하다고 판단했습니다.

이유:

- 트랜잭션 신뢰성이 좋음
- row-level lock 사용 가능
- 실제 실무에서 많이 쓰는 방향과 가깝다

## 4. 프로젝트 구조

```text
course-registration/
├── docs/
│   ├── API.md
│   └── REQUIREMENTS.md
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── database/
│   ├── enrollments/
│   ├── professors/
│   ├── prisma/
│   ├── students/
│   ├── app.controller.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
│   └── app.e2e-spec.ts
├── docker-compose.yml
└── README.md
```

### `src/database`

초기 데이터 생성 관련 코드가 들어 있습니다.

- 앱 시작 시 데이터가 비어 있으면 시드 수행
- 학과, 교수, 학생, 강좌, 시간표 생성

### `src/prisma`

Prisma client를 Nest 애플리케이션에서 주입해서 쓸 수 있도록 만든 모듈입니다.

### `src/students`

- 학생 목록 조회
- 학생 시간표 조회

### `src/professors`

- 교수 목록 조회

### `src/enrollments`

- 수강신청
- 수강취소
- 정원/학점/시간 충돌 검사
- 동시성 제어

## 5. 구현된 기능

현재 구현된 API는 아래와 같습니다.

- `GET /health`
- `GET /students`
- `GET /students/:studentId/timetable`
- `GET /professors`
- `POST /enrollments`
- `DELETE /enrollments`

참고로 `GET /courses`는 다른 기능 브랜치에서 구현한 뒤 분리된 상태였고, 현재 브랜치 기준 최종 통합은 사용자가 직접 하도록 남겨둔 상태입니다.

API 상세 형식은 [docs/API.md](docs/API.md)에 정리되어 있습니다.

## 6. 데이터 모델을 이렇게 잡은 이유

핵심 테이블은 아래와 같습니다.

- `Department`
- `Semester`
- `Student`
- `Professor`
- `Course`
- `CourseSchedule`
- `Enrollment`

### `CourseSchedule`를 분리한 이유

처음에는 강의 시간을 문자열 하나로 둘 수도 있습니다.  
하지만 시간표 충돌 검사를 하려면 `"월 09:00-10:30"` 같은 문자열보다 구조화된 값이 훨씬 다루기 쉽습니다.

그래서 내부적으로는:

- `dayOfWeek`
- `startPeriod`
- `endPeriod`

를 가진 별도 테이블로 두고, API 응답에서만 사람이 읽기 쉬운 문자열로 바꾸도록 했습니다.

### `Enrollment`가 필요한 이유

수강신청 시스템에서 진짜 중요한 건 “학생이 어떤 강좌를 신청했는가”입니다.  
그래서 학생과 강좌를 연결하는 중간 테이블로 `Enrollment`를 두었습니다.

이 테이블 덕분에 아래가 가능해집니다.

- 중복 신청 방지
- 시간표 조회
- 총 학점 계산
- 수강취소 처리

### `Course.enrolledCount`를 따로 둔 이유

현재 신청 인원을 매번 `Enrollment`를 세서 계산할 수도 있지만, 정원 체크를 빠르게 하려면 현재 인원을 컬럼으로 유지하는 편이 단순합니다.

대신 이 값은 항상 `Enrollment`와 같이 갱신되어야 하므로, 신청/취소 시 트랜잭션 안에서 같이 업데이트하도록 했습니다.

## 7. 초기 데이터 생성 방식

과제 요구사항상 아래 조건을 만족해야 했습니다.

- 학과 10개 이상
- 교수 100명 이상
- 학생 10,000명 이상
- 강좌 500개 이상
- 서버 시작 시 동적 생성

그래서 정적 CSV를 두지 않고, 작은 토큰 목록을 조합해서 데이터를 만들도록 했습니다.

예:

- 성씨 목록
- 이름 음절 목록
- 학과 이름 목록
- 강좌명 토큰 목록

생성 전략은 대략 이렇습니다.

1. 활성 학기 1개 생성
2. 학과 10개 생성
3. 학과별 교수 생성
4. 학과별 학생 생성
5. 강좌 생성
6. 강좌별 시간표 생성

초기 버전에서는 수강신청 내역 없이 시작하고, `enrolledCount`는 0으로 두었습니다.

## 8. 수강신청 규칙

수강신청 시 아래를 검사합니다.

1. 학생이 존재하는가
2. 강좌가 존재하는가
3. 이미 신청한 강좌인가
4. 정원이 남아 있는가
5. 총 학점이 18학점을 초과하는가
6. 기존 강좌와 시간 충돌이 있는가

수강취소 시에는:

1. 학생이 존재하는가
2. 강좌가 존재하는가
3. 해당 수강신청이 존재하는가
4. 신청 내역 삭제 후 `enrolledCount` 감소

## 9. 동시성은 어떻게 처리했나

이 프로젝트에서 가장 중요하게 본 부분입니다.

문제 상황은 이렇습니다.

- 정원이 1명 남음
- 100명이 동시에 신청
- 단순 조회 후 저장 방식이면 정원이 초과될 수 있음

이를 막기 위해 신청/취소 시 다음 흐름을 사용했습니다.

1. 트랜잭션 시작
2. `Student` row lock
3. `Course` row lock
4. 검증 수행
5. `Enrollment` insert/delete
6. `Course.enrolledCount` update
7. 커밋

이렇게 하면 같은 학생/같은 강좌에 대한 동시 요청이 겹쳐도, 검증과 저장 사이에 경쟁 상태가 발생하지 않도록 만들 수 있습니다.

### 왜 학생도 락하는가

강좌 정원만 보면 강좌 row만 잠그면 될 것 같지만, 실제로는 학생 단위 경쟁 상태도 있습니다.

예를 들어 같은 학생이 동시에:

- 강좌 A 신청
- 강좌 B 신청

을 보내면, 둘 다 각자 18학점 제한을 통과해버릴 수 있습니다.  
또는 시간표 충돌이 있는데도 둘 다 성공할 수 있습니다.

그래서 학생 row도 같이 잠궈서 같은 학생의 동시 신청을 직렬화했습니다.

## 10. DTO를 왜 사용했나

처음에는 단순 조회 API에서 직접 문자열 파싱으로 처리하기도 했습니다.  
하지만 Nest를 연습하는 목적도 있었기 때문에, 이후에는 DTO + ValidationPipe 패턴으로 정리했습니다.

예를 들면:

- `departmentId`
- `limit`
- `offset`
- `studentId`
- `courseId`

같은 값들을 DTO로 정의하고, 컨트롤러에서 검증을 통과한 값만 서비스로 넘기도록 했습니다.

DTO를 사용한 이유는:

- 입력 형식을 명확히 하기 위해
- 숫자 변환과 최소값 검증을 한 곳에서 처리하기 위해
- 서비스 로직에서 파싱 코드를 줄이기 위해

## 11. 실행 방법

### 1. 환경 변수 준비

`.env.example`을 복사해서 `.env`를 만듭니다.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2. PostgreSQL 실행

```bash
docker compose up -d
```

기본 연결 정보:

- host: `localhost`
- port: `5433`
- database: `course_registration`

### 3. 의존성 설치

```bash
pnpm install
```

### 4. Prisma Client 생성

```bash
pnpm prisma generate
```

### 5. 마이그레이션 반영

```bash
pnpm prisma migrate deploy
```

개발 중 새 마이그레이션 생성:

```bash
pnpm prisma migrate dev
```

### 6. 서버 실행

```bash
pnpm start
```

개발 모드:

```bash
pnpm start:dev
```

서버 포트는 기본 `3000`입니다.

## 12. 테스트

단위 테스트:

```bash
pnpm test
```

E2E 테스트:

```bash
pnpm test:e2e -- --runInBand
```

빌드 확인:

```bash
pnpm build
```

현재 E2E에서 검증하는 것:

- `/health`
- `/students`
- `/professors`
- `/students/:studentId/timetable`
- `/enrollments` 신청
- `/enrollments` 취소
- 동시 신청 시 정원 초과 방지

## 13. 문서

- 요구사항 분석: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)
- API 문서: [docs/API.md](docs/API.md)

## 14. 아직 남아 있는 것

이 프로젝트는 기능 단위 브랜치로 쪼개서 연습하다 보니, 아직 사용자가 직접 병합해야 하는 상태의 브랜치들이 있습니다.

또한 아래는 추가로 더 다듬을 수 있습니다.

- `GET /courses` 최종 통합 상태 확인
- README와 API 문서 완전 동기화
- 커스텀 예외 필터 정리
- 응답 DTO 분리
- 더 정교한 동시성/부하 테스트

## 15. 메모

이 프로젝트는 “정답 구현”보다 아래를 연습하는 데 더 의미가 있었습니다.

- 요구사항이 애매할 때 직접 결정하기
- DB 모델을 먼저 설계하고 API를 맞추기
- 동시성 문제를 말로만이 아니라 코드와 테스트로 확인하기
- 기능 단위로 브랜치와 커밋을 나누기
