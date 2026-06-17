# Marie Borders — Auto-Compress Listing Video + Compact Thumbnail Strip

**Date:** 2026-06-16
**Project:** mbreal-83286 (danpellegrini63) · repo danpoahu/MarieBorders
**Branch:** feature/listing-video-autocompress-thumbnail-strip
**Surface:** `STAGE/` (the live Marie Borders site; root is the coming-soon page)

> SAFETY: STAGE = live. No `firebase deploy` and no `git push` until Daniel reviews.

---

## Feature 1 — Auto-compress listing video on upload (server-side)

### Goal
The agent uploads any-size MP4/MOV/WebM in the CMS; a Cloud Function compresses it
to fit the site's constraints (< 10 MB, VP9/WebM, 720p) automatically. Removes the
manual ffmpeg step. Expected volume ~2/month → stays within Blaze free tier (~$0).

### Why server-side
Rejected client-side (ffmpeg.wasm) — fragile/slow on large 1080p files and dead on
phones. Project already runs 5 gen-2 functions, so it's already on Blaze; no plan change.

### Flow
1. **Browser (`STAGE/cms.html`)**
   - Raise the uploader limit (currently 10 MB) to **200 MB**; accept `video/mp4,video/quicktime,video/webm`.
   - Generate `jobId = uuid()`. Create Firestore `videoJobs/{jobId}` = `{ status:'processing', scopeId, createdAt }`.
   - Upload the **raw original** to `listing-video-raw/{scopeId}/{jobId}.{ext}` (custom metadata: `jobId`, `scopeId`).
   - Show "Compressing video…" in the video strip; `onSnapshot` the job doc.
   - On `status:'done'` → set `drawerVideo = { url, storagePath }`, render preview (unchanged from today); persists on **Save**.
   - On `status:'error'` → toast the message, clear the strip.
2. **Cloud Function (`functions/index.js`)** — `onObjectFinalized`, filter to `listing-video-raw/` prefix only (avoids retrigger loop).
   - Download object to `/tmp`.
   - Transcode with bundled `ffmpeg-static`: **VP9 WebM, scale -2:720, two-pass `-b:v 430k`, libopus 96k**, `-row-mt 1 -deadline good -cpu-used 1`.
   - **Verify output < 10,485,760 bytes.** If over → re-encode at 540p (and, if still over, step bitrate down). Hard floor so we never exceed the cap.
   - Upload result to `listing-photos/{scopeId}/video-{uuid}.webm` (contentType video/webm); `getDownloadURL()`.
   - Delete the raw original.
   - Update `videoJobs/{jobId}` → `{ status:'done', url, storagePath, finishedAt }` (or `{ status:'error', message }`).
   - Config: `memory: '2GiB'`, `timeoutSeconds: 540`, region matching existing functions.

### Rules
- **Storage** (`storage.rules`): new match `listing-video-raw/{scopeId}/{file}` → `allow read, write: if isAuthed() && size < 200MB && contentType.matches('video/.*')`. (Compressed file under `listing-photos/` is written by the admin SDK, which bypasses rules.)
- **Firestore** (`firestore.rules`): new `match /videoJobs/{jobId}` → `allow read, write: if isAuthed()` (CMS-only; per the every-collection-needs-a-rule checklist).

### Dependencies
- Add `ffmpeg-static` to `functions/package.json` (provides a full Linux ffmpeg binary with libvpx + libopus at runtime). Spawn via `child_process`.

### Edge cases
- Unsupported/corrupt input → `status:'error'`, raw deleted, toast.
- Very long video (> ~4 min): best-effort at 540p; note in UI that long videos lose quality (do not hard-block in v1).
- Function idempotency: keyed by `jobId`; re-fire on the same object no-ops if job already `done`.
- Always-transcode (input is expected to be a raw camera file).

---

## Feature 2 — Compact one-line thumbnail strip

### Problem
`renderGallery` renders thumbnails as a `display:grid` (`repeat(auto-fill, minmax(90px,1fr))`)
in `STAGE/assets/css/site.css` (`.gallery__thumbs`), so 34 photos wrap to ~5 rows and
eat a lot of vertical space.

### Change (CSS-first, minimal JS)
- `.gallery__thumbs`: `display:flex; flex-wrap:nowrap; overflow-x:auto; gap:var(--s3); scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch;` + thin styled scrollbar.
- `.gallery__thumb`: `flex:0 0 84px;` (fixed), keep `aspect-ratio:1/1`, `scroll-snap-align:start`.
- Optional edge fade (left/right mask) to signal "scrollable".
- `STAGE/assets/js/listing-detail.js` `show(idx)`: after marking `.is-active`, call
  `activeBtn.scrollIntoView({ inline:'center', block:'nearest', behavior:'smooth' })`
  so navigating keeps the active thumb in view.
- Main image + video behavior unchanged.

### Result
Thumbnails collapse from ~5 rows to a single horizontally-scrollable rail, reclaiming
the vertical space, while still showing all 34.

---

## Testing
- **Thumbnails:** open a STAGE listing locally; verify single row, horizontal scroll, active-thumb auto-scroll, video thumb play badge intact, mobile width OK.
- **Compress:** local function test where possible; on STAGE, upload a >10 MB MOV → "Compressing…" → resolves to a <10 MB WebM on the listing; verify raw deleted, job doc done, error path on a bad file.

## Rollout (gated on Daniel)
1. Build on branch; local + STAGE-folder testing.
2. Daniel reviews.
3. Deploy function (`firebase deploy --only functions:<name>` + rules) — **with Daniel's ok**.
4. Push site files — **with Daniel's ok**. (STAGE is live; do NOT promote to root.)
