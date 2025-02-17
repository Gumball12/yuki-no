---
id: 'GitHub으로-기술-문서-번역-프로젝트-시작하기'
title: 'GitHub으로 기술 문서 번역 프로젝트 시작하기'
subtitle: 'Yuki-no로 문서 번역 프로젝트 자동화하기'
date: '2025.02.14'
---

# GitHub으로 기술 문서 번역 프로젝트 시작하기

오픈소스 프로젝트 문서를 번역하는 일은 더 많은 사람들이 기술에 접근할 수 있게 돕는 중요한 일이다. 나는 현재 [Vite](https://vitejs.dev)의 [한국어 문서 번역 프로젝트](https://github.com/vitejs/docs-ko) 메인테이너로 활동하고 있다. Vite는 매우 빠른 속도로 발전하는 차세대 프론트엔드 빌드 도구로, 매일 수많은 업데이트가 이루어진다.

이 글은 번역 프로젝트를 진행하면서 겪은 어려움과, 이를 해결하기 위해 개발한 [Yuki-no](https://github.com/Gumball12/yuki-no)라는 도구를 소개하기 위해 작성했다. 활발하게 개발되는 프로젝트의 문서를 번역할 때 발생할 수 있는 문제들과 그 해결 방법을 공유하고자 한다.

# 초기 - 수동으로 관리하기

처음에는 이렇게 시작했다:

1. 원본 저장소 변경 사항을 확인
2. 새로운 내용을 번역
3. PR을 만들어 리뷰...

이 방식은 처음에는 단순해 보였지만, 프로젝트가 진행될수록 여러 가지 문제점이 드러났다.

## 빈번한 업데이트 추적의 어려움

Vite 문서는 하루에도 여러 번 업데이트된다. 가령 하루에도 아래와 같은 커밋들이 종종 올라오는데:

```
feat(docs): add migration guide for v5
chore: update dependencies
docs: clarify plugin usage
docs: update configuration examples
fix(docs): fix typos in deployment guide
docs: add new plugin documentation
```

이런 상황에서 모든 변경사항을 수동으로 매일 추적하는 것은 비용이 높았다.

## 복잡한 관리 프로세스

또한 다음과 같은 반복적인 작업을 필요로 했다:

1. 매일 원본 저장소 커밋 확인
2. 문서 관련 커밋을 일일이 판별
3. 해당 내용이 실제 릴리스된 것인지 확인
4. 번역이 필요한 부분을 이슈로 생성
5. 번역 진행

이러한 작업은 실제 번역 작업보다 관리에 더 많은 시간을 쏟게 만들어, 지속적인 번역 진행을 어렵게 한다.

## 작업 효율성 저하

그리고 다음과 같은 문제를 야기한다:

- 변경 사항을 일부 놓칠 수 있게 됨
- 릴리스되지 않은 내용을 번역하기도 해서 시간이 낭비
- 변경 사항 적용이 늦어져 필요하지 않은 부분을 번역
- 번역 작업을 지루하게 만들고 의욕을 떨어트림

# 중기 - Ryu-Cho 도입

수동 관리의 한계를 느끼고 [Ryu-Cho](https://github.com/vuejs-translations/ryu-cho)를 도입했다. Vue.js 및 한국어 외 다른 언어를 대상으로 하는 Vite 번역 프로젝트에서 사용되는 이 도구는, 변경사항 추적 자동화가 가능했지만 한계점이 있었다.

## 기본 기능

Ryu-Cho는 다음과 같은 기본적인 기능을 제공한다:

- 원본 저장소 커밋 모니터링
- 새로운 커밋에 대한 GitHub 이슈 생성

다만 실제 번역 프로젝트 운영에 필요한 기능들이 몇 부족했다.

## 실제 사용의 어려움

Ryu-Cho를 실제로 사용하면서 다음과 같은 문제점들이 드러났다:

- **릴리스 상태 추적 불가능**
  - 번역 전 릴리즈 여부를 확인해야 하는 번거로움이 그대로 남아있음
  - 릴리스되지 않은 기능의 문서를 번역하는 경우 발생
- **이슈 관리의 한계**
  - 이슈 라벨링 기능 부재로 번역 이슈와 일반 이슈가 섞임
  - 작업 상태 추적이 어려워짐
- **설정과 유지보수의 어려움**
  - 문제 발생 시 디버깅을 위한 로그 부족
  - 설정 옵션의 유연성 부족

이러한 한계들로 인해 새로운 도구의 필요성을 느끼게 되었고, Yuki-no 개발의 직접적인 계기가 되었다.

# 현재 - Yuki-no

<p align="center">
  <img src="/images/250214/yuki-no-logo.webp" width="350" alt="Yuki-no Logo" title="Yuki-no Logo">
</p>

Ryu-Cho의 한계를 극복하기 위해 개발된 Yuki-no는 현재 [Vite 한국어 문서 번역 프로젝트](https://github.com/vitejs/docs-ko)에서 실제로 사용되고 있다.

## 주요 이점

1. **자동화된 변경 사항 추적**

   ![Automated Change Tracking](/images/250214/automated-change-tracking.webp)

   - 원본 저장소 내 필요한 부분에 대한 변경 사항만을 모니터링
   - 번역이 필요한 부분을 GitHub 이슈로 생성 및 라벨링
   - 배치 처리를 통한 효율적인 GitHub API 사용

2. **릴리스 상태 기반 번역 관리**

   <p align="center">
     <img src="/images/250214/automated-release-tracking.webp" width="450" alt="Automated Release Tracking" title="Automated Release Tracking">
   </p>

   - 정식 릴리스된 내용과 프리 릴리스 버전 구분
   - 릴리스 상태에 따른 라벨링
   - 불필요한 번역 작업 방지

3. **효율적인 작업 관리**

   - 번역이 필요한 부분만 한눈에 파악 가능
   - GitHub 기반 이슈 관리 프로세스 그대로 사용 가능
   - 최적화된 GitHub API 사용으로 안정적인 운영

## 성능 최적화

Yuki-no는 GitHub API를 효율적으로 사용하기 위해 다음과 같은 최적화를 적용했다:

- 커밋을 5개씩 묶어서 배치 처리해 API 호출 최소화
- 배치 작업 간 3초 지연 시간을 적용해 짧은 시간에 API 호출이 몰리지 않도록 만듦
- API 요청 한도 초과 등 실패 상황 발생 시 다음 Action에서 자동으로 재시도하는 메커니즘 구현

또한 상세한 로그와 함께 실시간 진행률을 보여줘, 현재 어디까지 진행했는지 쉽게 확인할 수 있도록 했다.

# Yuki-no 사용하기

만약 Ryu-Cho와 같이 기존에 다른 형태로 번역 프로세스가 구성되어 있다면 [마이그레이션 문서](https://github.com/Gumball12/yuki-no/tree/main/MIGRATION.md)를 참고하자.

## 1. GitHub Actions 설정

먼저 저장소에 GitHub Actions 권한을 설정해야 한다. 이는 Actions에서 Issues 및 Issue Comments를 생성하기 위해 필요하다. 참고로 Ryu-Cho와 같은 GitHub Issues 기반 번역 프로세스를 구축하는 모든 Actions에서 이를 요구한다:

![settings](/images/250214/settings.webp)

- 리포지토리 Settings 탭으로 이동 > Actions > General > Workflow permissions 항목
- "Read and write permissions" 선택
- 변경 사항 저장

## 2. Yuki-no 설정 파일 작성

다음으로 `.github/workflows/yuki-no.yml` 파일을 생성해야 한다. 자세한 내용은 [Yuki-no 문서](https://github.com/Gumball12/yuki-no/tree/main/README.md)를 참고하자:

```yml
name: yuki-no

on:
  schedule:
    - cron: '0 * * * *' # 매시간 실행
  workflow_dispatch: # 수동 실행 옵션

jobs:
  yuki-no:
    runs-on: ubuntu-latest
    steps:
      - uses: Gumball12/yuki-no@v1
        with:
          access-token: ${{ secrets.GITHUB_TOKEN }}
          head-repo: https://github.com/vitejs/vite.git
          track-from: abcd1234
          include: |
            docs/**
          release-tracking: true
```

## 3. 번역 작업 시작하기

이제 번역 작업은 이렇게 진행할 수 있다:

1. **자동 이슈 생성**

   - `track-from` 커밋부터 시작해, 원본 문서가 업데이트되면 자동으로 이슈 생성
   - 릴리스 상태도 자동으로 추적
   - 커밋에 대한 정보 포함

2. **작업 현황 관리**

   - 라벨로 작업 상태 관리 (예: 번역 이슈는 `sync`이 붙음)
   - 릴리스 추적 라벨로 우선순위 파악 (예: 정식 릴리스되지 않은 변경 사항에는 `pending`이 붙음)
   - 작업자 배정 및 진행 상황 추적

3. **번역 및 리뷰**

   - PR 생성 및 리뷰 진행
   - 릴리스 상태에 따른 번역 및 배포 시점 조절

## 효율적인 관리를 위한 팁

1. **파일 패턴 활용**

   ```yml
   include: |
     docs/**/*.md        # 문서 파일만 추적
     .vitepress/config.ts # 설정 파일도 포함
   exclude: |
     docs/**/*.test.ts   # 테스트 파일 제외
     docs/internal/**    # 내부 문서 제외
   ```

   - `include`로 번역이 필요한 파일만 선택적으로 추적
   - `exclude`로 불필요한 파일 제외
   - [Glob 패턴](https://github.com/micromatch/picomatch?tab=readme-ov-file#advanced-globbing)을 사용해 유연한 파일 선택 가능

2. **릴리스 추적 시스템 활용**

   ```yml
   release-tracking: true
   release-tracking-labels: |
     pending
     pre-release
     released
   ```

   - `release-tracking`: 릴리스 상태 자동 추적 활성화
   - `release-tracking-labels`: 릴리스 상태별 라벨 지정
   - 라벨 및 이슈 코멘트를 통한 릴리스 상태 확인

**동작 방식:**

- 새 커밋이 감지되면 `sync` 라벨로 시작 (`labels` 옵션을 통해 지정, 기본값 `sync`)
- 정식 릴리스 이전 변경 사항은 `pending` 라벨이 붙음 (`release-tracking-labels` 옵션을 통해 지정, 기본값 `pending`)
- 릴리스 상태 변경 시 이슈에 코멘트 자동 추가
- 정식 릴리스 시 `pending` 라벨 제거됨

# 마무리

Yuki-no를 도입한 후, Vite 한국어 문서 번역 프로젝트는 이런 개선을 이루었다:

- 불필요한 번역 작업 피함
- 번역자들의 작업 만족도 향상
- 번역 진행 방식 간결화 및 진입 장벽 낮춤

현재 Vite 한국어 문서 번역 프로젝트는 Yuki-no를 통해 안정적이고 효율적인 번역 프로세스를 운영하고 있으며, 이는 다른 번역 프로젝트에도 좋은 참고 사례가 될 수 있을 것이다.

더 자세한 내용은 [Yuki-no 문서](https://github.com/Gumball12/yuki-no)를 참고하자. 질문이나 제안이 있다면 [GitHub Issues](https://github.com/Gumball12/yuki-no/issues)에 남겨주기를 바란다.
