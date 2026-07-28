# REQ-PLT-004 / ADR-014 — one image, two roles (web and worker), ffmpeg baked in.
#
# ADR-007 chose docker-over-serverless precisely so long jobs could call real binaries. This is the
# image that finally makes that true: ffmpeg and ffprobe are on PATH (FFMPEG_MODE=native), and
# Chromium is present for Remotion. The worker runs the same image with a different command, so a
# render can never work in one process and fail in the other.

# ---------- deps ----------
FROM node:22-bookworm-slim AS deps
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app

# Manifests only, so a source-only change reuses the install layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json      apps/web/
COPY apps/worker/package.json   apps/worker/
COPY libs/anm/package.json      libs/anm/
COPY libs/asm/package.json      libs/asm/
COPY libs/ast/package.json      libs/ast/
COPY libs/gen/package.json      libs/gen/
COPY libs/plt/package.json      libs/plt/
COPY libs/prj/package.json      libs/prj/
COPY libs/shared/package.json   libs/shared/
COPY libs/stb/package.json      libs/stb/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
WORKDIR /app
COPY . .
# Remotion's bundler and Next's compiler both need the workspace sources, not just the built output.
RUN pnpm --filter @avd/web build

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime
# `corepack enable` alone leaves a shim that DOWNLOADS pnpm on first use — that would make every
# container start depend on the npm registry being reachable. `prepare --activate` bakes it in.
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# ffmpeg/ffprobe: the export, thumbnail, probe and tail-frame paths (ADR-014, FFMPEG_MODE=native).
# chromium + its libs: Remotion renders (REQ-ANM-001) — pinned to the system browser so no deploy
# depends on a first-run download from the internet.
# fonts-liberation: burned captions have no font otherwise, and libass fails soft (blank captions).
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      chromium \
      fonts-liberation \
      fonts-dejavu-core \
      ca-certificates \
      dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app /app

ENV NODE_ENV=production \
    FFMPEG_MODE=native \
    REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium \
    CAPTION_FONT_FILE=/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf \
    CAPTION_FONT_NAME="Liberation Sans" \
    PORT=3000

EXPOSE 3000

# dumb-init reaps the ffmpeg/chromium children a long render leaves behind; without PID 1 doing
# that, a container accumulates zombies across a day of exports.
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "--filter", "@avd/web", "exec", "next", "start", "-p", "3000"]
