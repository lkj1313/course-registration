# API Specification

## 1. 공통 사항

- Base URL: `http://localhost:3000`
- Content-Type: `application/json`
- 인증은 사용하지 않는다.
- 모든 API는 현재 활성 학기를 기준으로 동작한다.

## 2. 에러 응답 형식

에러 응답은 아래 형식을 사용한다.

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "code": "COURSE_FULL",
  "message": "The course capacity has been reached."
}
```

### 에러 코드 목록

| HTTP Status | Code | 의미 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 요청 형식이 잘못됨 |
| 404 | `STUDENT_NOT_FOUND` | 학생을 찾을 수 없음 |
| 404 | `PROFESSOR_NOT_FOUND` | 교수를 찾을 수 없음 |
| 404 | `COURSE_NOT_FOUND` | 강좌를 찾을 수 없음 |
| 404 | `ENROLLMENT_NOT_FOUND` | 신청 내역을 찾을 수 없음 |
| 409 | `ALREADY_ENROLLED` | 이미 신청한 강좌 |
| 409 | `COURSE_FULL` | 정원 초과 |
| 409 | `CREDIT_LIMIT_EXCEEDED` | 18학점 초과 |
| 409 | `SCHEDULE_CONFLICT` | 시간표 충돌 |

## 3. 헬스체크

### `GET /health`

서버가 정상 구동 중이며, 초기 데이터 생성이 완료되었는지 확인한다.

#### Response

```json
{
  "status": "ok",
  "timestamp": "2026-03-08T06:00:00.000Z"
}
```

#### Status Codes

- `200 OK`

## 4. 학생 목록 조회

### `GET /students`

학생 목록을 조회한다.

### Query Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `departmentId` | number | No | 학과별 필터 |
| `limit` | number | No | 최대 반환 개수 |
| `offset` | number | No | 시작 위치 |

#### Response

```json
{
  "items": [
    {
      "id": 1,
      "studentNumber": "20260001",
      "name": "김민준",
      "departmentId": 3,
      "departmentName": "컴퓨터공학과"
    }
  ],
  "total": 10000,
  "limit": 50,
  "offset": 0
}
```

#### Status Codes

- `200 OK`
- `400 Bad Request`

## 5. 교수 목록 조회

### `GET /professors`

교수 목록을 조회한다.

### Query Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `departmentId` | number | No | 학과별 필터 |
| `limit` | number | No | 최대 반환 개수 |
| `offset` | number | No | 시작 위치 |

#### Response

```json
{
  "items": [
    {
      "id": 14,
      "name": "이서준",
      "departmentId": 3,
      "departmentName": "컴퓨터공학과"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### Status Codes

- `200 OK`
- `400 Bad Request`

## 6. 강좌 목록 조회

### `GET /courses`

강좌 목록을 조회한다. 학과별 필터를 지원한다.

### Query Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `departmentId` | number | No | 학과별 필터 |
| `limit` | number | No | 최대 반환 개수 |
| `offset` | number | No | 시작 위치 |

#### Response

```json
{
  "items": [
    {
      "id": 201,
      "code": "CSE201",
      "name": "자료구조",
      "departmentId": 3,
      "departmentName": "컴퓨터공학과",
      "professorId": 14,
      "professorName": "이서준",
      "credits": 3,
      "capacity": 30,
      "enrolled": 25,
      "schedule": "월 09:00-10:30",
      "semester": "2026-1"
    }
  ],
  "total": 500,
  "limit": 50,
  "offset": 0
}
```

#### Status Codes

- `200 OK`
- `400 Bad Request`

## 7. 수강신청

### `POST /enrollments`

학생이 강좌를 신청한다.

#### Request Body

```json
{
  "studentId": 1,
  "courseId": 201
}
```

#### Success Response

```json
{
  "id": 90001,
  "studentId": 1,
  "courseId": 201,
  "semester": "2026-1",
  "createdAt": "2026-03-08T06:01:00.000Z"
}
```

#### Status Codes

- `201 Created`
- `400 Bad Request`
- `404 Not Found`
- `409 Conflict`

#### Error Cases

- `STUDENT_NOT_FOUND`
- `COURSE_NOT_FOUND`
- `ALREADY_ENROLLED`
- `COURSE_FULL`
- `CREDIT_LIMIT_EXCEEDED`
- `SCHEDULE_CONFLICT`

## 8. 수강취소

### `DELETE /enrollments`

학생이 신청한 강좌를 취소한다.

#### Request Body

```json
{
  "studentId": 1,
  "courseId": 201
}
```

#### Success Response

```json
{
  "success": true
}
```

#### Status Codes

- `200 OK`
- `400 Bad Request`
- `404 Not Found`

#### Error Cases

- `STUDENT_NOT_FOUND`
- `COURSE_NOT_FOUND`
- `ENROLLMENT_NOT_FOUND`

## 9. 내 시간표 조회

### `GET /students/:studentId/timetable`

학생의 이번 학기 시간표를 조회한다.

#### Path Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `studentId` | number | Yes | 학생 ID |

#### Response

```json
{
  "student": {
    "id": 1,
    "studentNumber": "20260001",
    "name": "김민준",
    "departmentId": 3,
    "departmentName": "컴퓨터공학과"
  },
  "semester": "2026-1",
  "totalCredits": 12,
  "items": [
    {
      "courseId": 201,
      "code": "CSE201",
      "name": "자료구조",
      "credits": 3,
      "professorName": "이서준",
      "schedule": "월 09:00-10:30"
    },
    {
      "courseId": 305,
      "code": "CSE305",
      "name": "운영체제",
      "credits": 3,
      "professorName": "박지훈",
      "schedule": "수 13:00-14:30"
    }
  ]
}
```

#### Status Codes

- `200 OK`
- `404 Not Found`

#### Error Cases

- `STUDENT_NOT_FOUND`

## 10. 동시성 관련 보장

수강신청 API는 동시 요청 상황에서도 아래 조건을 보장해야 한다.

- 정원은 절대 초과되지 않는다.
- 동일 학생의 동일 강좌 중복 신청이 발생하지 않는다.
- 동일 학생의 총 신청 학점이 18학점을 초과하지 않는다.
- 동일 학생의 시간표 충돌이 발생하지 않는다.

이 보장은 단일 애플리케이션 인스턴스 기준으로 제공한다.
