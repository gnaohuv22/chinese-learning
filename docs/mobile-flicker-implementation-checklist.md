# Mobile Flicker Stabilization Checklist

## Comparison Summary

### Findings both investigations agree on
- Global transition scope is too broad and can trigger heavy repaint/compositing work on mobile.
- Loading to empty to data state transitions can flash, especially with realtime Firestore snapshots.
- 100vh-based layout math is risky on Safari and Samsung Browser.
- Long-lived Firestore subscriptions need lifecycle teardown.
- Global route-enter animation can amplify flicker during async render updates.

### Findings from the second investigation that should also be included
- Untracked setTimeout callbacks can fire after navigation and mutate stale component state.
- Fixed overlays plus conditional mount/unmount and animation classes increase compositor instability on mobile.
- Missing media intrinsic sizing/loading hints can increase layout shifts.

### Severity adjustment
- Inner-scroll shell pattern is a high-risk contributor, but not the only root cause.
- Primary implementation priority remains lifecycle leaks + render state stabilization + CSS compositing simplification.

## Implementation Checklist

## Phase 0 - Baseline and Repro
- [ ] Record baseline repro on Samsung Browser and Safari with one stable script:
  - [ ] Open list pages: courses, videos, lessons, news.
  - [ ] Rapidly navigate list to detail to back 10 times.
  - [ ] Capture whether flash, disappear, or false empty state appears.
- [ ] Add temporary runtime logging for first and second emissions on key lists (videos, courses) to verify cache-first behavior.

## Phase 1 - Critical Fast Wins

### 1) Remove universal transition selector
- [x] Update [src/styles.scss](src/styles.scss#L59) to remove global html * transition rule.
- [x] Keep transitions only on explicit interactive classes.
- Acceptance:
  - [ ] Theme and button transitions still feel responsive.
  - [ ] No global repaint spike when navigating.

### 2) Stabilize loading and empty-state transitions for list pages
- [x] Refactor [src/app/portal/video/video-list.component.ts](src/app/portal/video/video-list.component.ts#L24) and [src/app/portal/video/video-list.component.html](src/app/portal/video/video-list.component.html#L28) to use explicit state model: loading, ready-empty, ready-data, error.
- [x] Apply same pattern to [src/app/portal/courses/course-list.component.ts](src/app/portal/courses/course-list.component.ts#L39) and [src/app/portal/news/news-list.component.ts](src/app/portal/news/news-list.component.ts#L33).
- [x] Avoid immediate no-data state on first transient empty emission.
- Acceptance:
  - [ ] No flash of no video message before real data appears.
  - [ ] No spinner to empty to list thrash on first load.

### 3) Add teardown for long-lived Firestore subscriptions
- [x] Add DestroyRef and takeUntilDestroyed in components using getAll/getById streams without teardown.
- Priority targets:
  - [ ] [src/app/admin/courses/admin-courses.component.ts](src/app/admin/courses/admin-courses.component.ts#L38)
  - [ ] [src/app/admin/exams/admin-exams.component.ts](src/app/admin/exams/admin-exams.component.ts#L55)
  - [ ] [src/app/admin/exercises/admin-exercises.component.ts](src/app/admin/exercises/admin-exercises.component.ts#L130)
  - [ ] [src/app/admin/interactive-videos/admin-interactive-videos.component.ts](src/app/admin/interactive-videos/admin-interactive-videos.component.ts#L90)
  - [ ] [src/app/admin/lessons/admin-lessons.component.ts](src/app/admin/lessons/admin-lessons.component.ts#L44)
  - [ ] [src/app/admin/mock-tests/admin-mock-tests.component.ts](src/app/admin/mock-tests/admin-mock-tests.component.ts#L59)
  - [ ] [src/app/admin/submitted-exams/admin-submitted-exams.component.ts](src/app/admin/submitted-exams/admin-submitted-exams.component.ts#L38)
  - [ ] [src/app/portal/courses/course-list.component.ts](src/app/portal/courses/course-list.component.ts#L39)
  - [ ] [src/app/portal/courses/course-detail.component.ts](src/app/portal/courses/course-detail.component.ts#L26)
  - [ ] [src/app/portal/lessons/lesson-detail.component.ts](src/app/portal/lessons/lesson-detail.component.ts#L29)
  - [ ] [src/app/portal/video/video-list.component.ts](src/app/portal/video/video-list.component.ts#L24)
  - [ ] [src/app/portal/news/news-detail.component.ts](src/app/portal/news/news-detail.component.ts#L24)
  - [ ] [src/app/portal/mock-test/mock-test-list.component.ts](src/app/portal/mock-test/mock-test-list.component.ts#L28)
- Acceptance:
  - [ ] No duplicate emissions after repeated navigations.
  - [ ] Memory usage does not grow with route churn.

### 4) Replace 100vh usage with mobile-safe viewport units
- [x] Update [src/app/admin/layout/admin-layout.component.html](src/app/admin/layout/admin-layout.component.html#L4) and [src/app/admin/layout/admin-layout.component.html](src/app/admin/layout/admin-layout.component.html#L119) to use dvh/svh fallback strategy.
- Acceptance:
  - [ ] Sidebar and main area keep stable height while browser bars expand or collapse.

### 5) Disable global router-outlet sibling animation
- [x] Remove or gate [src/styles.scss](src/styles.scss#L106) router-outlet + * animation.
- Acceptance:
  - [ ] No page-enter jank on mobile during data-driven rerender.

## Phase 2 - Mobile Compositing Hardening

### 6) Fixed overlays and conditional animation strategy
- [x] Refactor overlay rendering in [src/app/admin/layout/admin-layout.component.html](src/app/admin/layout/admin-layout.component.html#L57) and [src/app/shared/components/bottom-nav/bottom-nav.component.html](src/app/shared/components/bottom-nav/bottom-nav.component.html#L6) to avoid mount/unmount plus animation race.
- [x] Prefer persistent layer with state class changes over repeated DOM destruction.
- Acceptance:
  - [ ] No backdrop flash when quickly opening and closing drawers or sheets.

### 7) Resolve inner-scroll shell risk
- [x] Re-evaluate shell in [src/styles.scss](src/styles.scss#L31) and [src/app/app.html](src/app/app.html#L2).
- [x] Either keep inner scroll with mobile-specific hardening or move to body-level scroll.
- Acceptance:
  - [ ] Stable scrolling behavior with keyboard and browser chrome changes on iOS/Samsung.

### 8) Timer and deferred callback cleanup
- [x] Track and clear pending timeouts in [src/app/admin/exercises/admin-exercises.component.ts](src/app/admin/exercises/admin-exercises.component.ts#L215).
- Acceptance:
  - [ ] No delayed stale UI updates after leaving the page.

### 9) Media layout shift hardening
- [x] Add loading and intrinsic sizing hints for image-heavy lists:
  - [ ] [src/app/portal/video/video-list.component.html](src/app/portal/video/video-list.component.html#L54)
  - [ ] [src/app/portal/news/news-list.component.html](src/app/portal/news/news-list.component.html#L15)
  - [ ] [src/app/shared/components/media-embed/media-embed.component.html](src/app/shared/components/media-embed/media-embed.component.html#L114)
- Acceptance:
  - [ ] Reduced visible image pop-in and less list reflow on slow mobile network.

## Phase 3 - Optional Performance Upgrade
- [ ] Gradually adopt OnPush in high-churn list and modal-heavy components after lifecycle and CSS fixes are stable.
- Acceptance:
  - [ ] No behavior regressions in forms, modals, and drag-drop lists.

## Verification Matrix
- [ ] Samsung Browser latest on Android
- [ ] Safari iOS (at least one recent device)
- [ ] Chrome desktop parity check
- [ ] Route churn test (10x list to detail to back)
- [ ] Video tab first-load test (must not show false empty state)
- [ ] Admin drawer and bottom sheet rapid toggle test

## Delivery Plan (Suggested PR Split)
- [ ] PR 1: Phase 1 items 1, 2, 5
- [ ] PR 2: Phase 1 items 3, 4
- [ ] PR 3: Phase 2 items 6, 8, 9
- [ ] PR 4: Phase 2 item 7 plus optional Phase 3 pilot
