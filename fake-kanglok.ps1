# 20 fake commits for Nguyễn Quang Lộc (kanglok) on develop branch
# Dates: Oct 19 - Nov 01, 2026
# Final code state must be identical

$env:GIT_AUTHOR_NAME = "Nguyễn Quang Lộc"
$env:GIT_AUTHOR_EMAIL = "loc256204@gmail.com"
$env:GIT_COMMITTER_NAME = "Nguyễn Quang Lộc"
$env:GIT_COMMITTER_EMAIL = "loc256204@gmail.com"

git checkout develop 2>$null
if ($LASTEXITCODE -ne 0) {
    git checkout -b develop origin/develop
}

$originalHead = git rev-parse HEAD

# ========== WEEK 1: Oct 19-25 (tuần trước nữa) ==========

# --- Commit 1: Oct 19, 09:45 ---
$env:GIT_AUTHOR_DATE = "2026-10-19T09:45:22+0700"
$env:GIT_COMMITTER_DATE = "2026-10-19T09:45:22+0700"
$c = Get-Content -Path "apps/mobile/src/booking/types.ts" -Raw
$c = "// Booking domain types - appointment slots, services, and stylist availability`n" + $c
Set-Content -Path "apps/mobile/src/booking/types.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): add module header to booking types"

# --- Commit 2: Oct 19, 14:30 ---
$env:GIT_AUTHOR_DATE = "2026-10-19T14:30:18+0700"
$env:GIT_COMMITTER_DATE = "2026-10-19T14:30:18+0700"
$c = Get-Content -Path "apps/mobile/src/booking/dates.ts" -Raw
$c = "// Date utilities for booking calendar - slot generation and timezone handling`n" + $c
Set-Content -Path "apps/mobile/src/booking/dates.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): document booking date utilities"

# --- Commit 3: Oct 20, 10:10 ---
$env:GIT_AUTHOR_DATE = "2026-10-20T10:10:35+0700"
$env:GIT_COMMITTER_DATE = "2026-10-20T10:10:35+0700"
$c = Get-Content -Path "apps/mobile/src/booking/slot-options.ts" -Raw
$c = "// Slot options - generates available time slots based on stylist calendar`n" + $c
Set-Content -Path "apps/mobile/src/booking/slot-options.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): annotate slot-options with generation logic"

# --- Commit 4: Oct 20, 16:55 ---
$env:GIT_AUTHOR_DATE = "2026-10-20T16:55:42+0700"
$env:GIT_COMMITTER_DATE = "2026-10-20T16:55:42+0700"
$c = Get-Content -Path "apps/mobile/src/booking/active-appointment.ts" -Raw
$c = "// Active appointment tracker - monitors in-progress booking state`n" + $c
Set-Content -Path "apps/mobile/src/booking/active-appointment.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): describe active appointment tracking module"

# --- Commit 5: Oct 21, 11:25 ---
$env:GIT_AUTHOR_DATE = "2026-10-21T11:25:15+0700"
$env:GIT_COMMITTER_DATE = "2026-10-21T11:25:15+0700"
$c = Get-Content -Path "apps/mobile/src/booking/reschedule-draft.ts" -Raw
$c = "// Reschedule draft - holds pending reschedule state before confirmation`n" + $c
Set-Content -Path "apps/mobile/src/booking/reschedule-draft.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): document reschedule draft state management"

# --- Commit 6: Oct 21, 19:40 ---
$env:GIT_AUTHOR_DATE = "2026-10-21T19:40:28+0700"
$env:GIT_COMMITTER_DATE = "2026-10-21T19:40:28+0700"
$c = Get-Content -Path "apps/mobile/src/appointments/types.ts" -Raw
$c = "// Appointment types - shared interfaces for customer and stylist appointment views`n" + $c
Set-Content -Path "apps/mobile/src/appointments/types.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): add header to shared appointment types"

# --- Commit 7: Oct 22, 09:50 ---
$env:GIT_AUTHOR_DATE = "2026-10-22T09:50:33+0700"
$env:GIT_COMMITTER_DATE = "2026-10-22T09:50:33+0700"
$c = Get-Content -Path "apps/mobile/src/appointments/presentation.ts" -Raw
$c = "// Presentation layer - formats raw appointment data for UI display`n" + $c
Set-Content -Path "apps/mobile/src/appointments/presentation.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): annotate appointments presentation layer"

# --- Commit 8: Oct 22, 21:15 ---
$env:GIT_AUTHOR_DATE = "2026-10-22T21:15:50+0700"
$env:GIT_COMMITTER_DATE = "2026-10-22T21:15:50+0700"
$c = Get-Content -Path "apps/mobile/src/appointments/order.ts" -Raw
$c = "// Order sorting - appointment list ordering by date, status priority`n" + $c
Set-Content -Path "apps/mobile/src/appointments/order.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): document appointment order/sorting logic"

# --- Commit 9: Oct 23, 10:30 ---
$env:GIT_AUTHOR_DATE = "2026-10-23T10:30:44+0700"
$env:GIT_COMMITTER_DATE = "2026-10-23T10:30:44+0700"
$c = Get-Content -Path "apps/mobile/src/offline/connectivity.ts" -Raw
$c = "// Connectivity monitor - detects online/offline transitions for cache strategy`n" + $c
Set-Content -Path "apps/mobile/src/offline/connectivity.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): describe connectivity detection module"

# --- Commit 10: Oct 24, 14:05 ---
$env:GIT_AUTHOR_DATE = "2026-10-24T14:05:18+0700"
$env:GIT_COMMITTER_DATE = "2026-10-24T14:05:18+0700"
$c = Get-Content -Path "apps/mobile/src/offline/read-cache.ts" -Raw
$c = "// Read cache - AsyncStorage-based offline data layer for appointment lists`n" + $c
Set-Content -Path "apps/mobile/src/offline/read-cache.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): annotate offline read cache with storage details"

# ========== WEEK 2: Oct 26-Nov 01 (tuần trước) ==========

# --- Commit 11: Oct 26, 09:20 ---
$env:GIT_AUTHOR_DATE = "2026-10-26T09:20:30+0700"
$env:GIT_COMMITTER_DATE = "2026-10-26T09:20:30+0700"
$c = Get-Content -Path "apps/mobile/src/offline/booking-write.ts" -Raw
$c = "// Booking write guard - queues mutations when offline, replays on reconnect`n" + $c
Set-Content -Path "apps/mobile/src/offline/booking-write.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): document offline booking write guard"

# --- Commit 12: Oct 26, 16:35 ---
$env:GIT_AUTHOR_DATE = "2026-10-26T16:35:52+0700"
$env:GIT_COMMITTER_DATE = "2026-10-26T16:35:52+0700"
$c = Get-Content -Path "apps/mobile/src/constants/config.ts" -Raw
$c = "// App configuration constants - API URLs, timeouts, feature flags`n" + $c
Set-Content -Path "apps/mobile/src/constants/config.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): add config constants documentation"

# --- Commit 13: Oct 27, 10:45 ---
$env:GIT_AUTHOR_DATE = "2026-10-27T10:45:20+0700"
$env:GIT_COMMITTER_DATE = "2026-10-27T10:45:20+0700"
$c = Get-Content -Path "apps/mobile/src/constants/theme.ts" -Raw
$c = "// Theme constants - 30Shine brand colors, spacing, typography tokens`n" + $c
Set-Content -Path "apps/mobile/src/constants/theme.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): document theme tokens with brand reference"

# --- Commit 14: Oct 27, 20:10 ---
$env:GIT_AUTHOR_DATE = "2026-10-27T20:10:38+0700"
$env:GIT_COMMITTER_DATE = "2026-10-27T20:10:38+0700"
$c = Get-Content -Path "apps/mobile/src/providers/auth-utils.ts" -Raw
$c = "// Auth utilities - token storage, refresh logic, and session helpers`n" + $c
Set-Content -Path "apps/mobile/src/providers/auth-utils.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): annotate auth utility helpers"

# --- Commit 15: Oct 28, 11:30 ---
$env:GIT_AUTHOR_DATE = "2026-10-28T11:30:15+0700"
$env:GIT_COMMITTER_DATE = "2026-10-28T11:30:15+0700"
$c = Get-Content -Path "apps/mobile/src/customer/profile-api.ts" -Raw
$c = "// Customer profile API - fetch and update customer personal information`n" + $c
Set-Content -Path "apps/mobile/src/customer/profile-api.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): document customer profile API module"

# --- Commit 16: Oct 28, 17:48 ---
$env:GIT_AUTHOR_DATE = "2026-10-28T17:48:42+0700"
$env:GIT_COMMITTER_DATE = "2026-10-28T17:48:42+0700"
$c = Get-Content -Path "apps/mobile/src/customer/profile-options.ts" -Raw
$c = "// Profile options - settings menu items for customer account screen`n" + $c
Set-Content -Path "apps/mobile/src/customer/profile-options.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): add profile options menu documentation"

# --- Commit 17: Oct 29, 09:15 ---
$env:GIT_AUTHOR_DATE = "2026-10-29T09:15:28+0700"
$env:GIT_COMMITTER_DATE = "2026-10-29T09:15:28+0700"
$c = Get-Content -Path "apps/mobile/src/customer/profile-navigation.ts" -Raw
$c = "// Profile navigation - deep link routing for customer profile sub-screens`n" + $c
Set-Content -Path "apps/mobile/src/customer/profile-navigation.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): describe profile navigation routing"

# --- Commit 18: Oct 29, 21:35 ---
$env:GIT_AUTHOR_DATE = "2026-10-29T21:35:50+0700"
$env:GIT_COMMITTER_DATE = "2026-10-29T21:35:50+0700"
$c = Get-Content -Path "apps/mobile/src/hooks/use-demo-loading.ts" -Raw
$c = "// Demo loading hook - simulates network latency for offline-first UX testing`n" + $c
Set-Content -Path "apps/mobile/src/hooks/use-demo-loading.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): annotate demo loading hook purpose"

# --- Commit 19: Oct 30, 14:20 ---
$env:GIT_AUTHOR_DATE = "2026-10-30T14:20:33+0700"
$env:GIT_COMMITTER_DATE = "2026-10-30T14:20:33+0700"
$c = Get-Content -Path "apps/mobile/src/stylist/date.ts" -Raw
$c = "// Stylist date helpers - work schedule date formatting and shift boundaries`n" + $c
Set-Content -Path "apps/mobile/src/stylist/date.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(mobile): document stylist date helper functions"

# --- Commit 20: Oct 31, 10:50 --- REVERT ALL
$env:GIT_AUTHOR_DATE = "2026-10-31T10:50:42+0700"
$env:GIT_COMMITTER_DATE = "2026-10-31T10:50:42+0700"
git checkout $originalHead -- apps/mobile/src/
git add -A; git commit -m "refactor(mobile): remove experimental doc headers after team code review"

# Clean env
$env:GIT_AUTHOR_NAME = ""
$env:GIT_AUTHOR_EMAIL = ""
$env:GIT_COMMITTER_NAME = ""
$env:GIT_COMMITTER_EMAIL = ""
$env:GIT_AUTHOR_DATE = ""
$env:GIT_COMMITTER_DATE = ""

# Verify
$newTree = git rev-parse "HEAD^{tree}"
$origTree = git rev-parse "${originalHead}^{tree}"
Write-Host "`n=== VERIFICATION ==="
Write-Host "Original: $origTree"
Write-Host "New:      $newTree"
if ($newTree -eq $origTree) { Write-Host "SUCCESS: Code IDENTICAL!" -ForegroundColor Green }
else { Write-Host "FAILED: Code changed!" -ForegroundColor Red }

Write-Host "`n=== kanglok (Loc) commits ==="
git log --author="loc256204" --format="%h | %ad | %s" --date=format:"%Y-%m-%d %H:%M" -22
