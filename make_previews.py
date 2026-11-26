"""
Assemble the two preview videos from real captured frames.

Landscape: 1920x1080 — frames captured natively at that size; slight
  center-zoom (102%) to tighten dead space under the board.
Portrait:  720x1080 — captured natively at 2:3; no geometry change.

Both: cover image as frame 0 (2.5s), then gameplay at 8fps capture
  rate (frames were shot ~100ms apart), encoded h264, no audio.
"""

import os
import subprocess
import shutil
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
OUT = "assets/marketing/crazygames"
FPS = 10  # frames were captured at ~10fps

# Frame counts (from capture logs)
LAND_FRAMES = 134
PORT_FRAMES = 145

COVER_HOLD = 25  # 2.5s of cover at 10fps


def build_symp(name, frame_dir, cover, width, height, count, zoom=None):
    """Duplicate captured frames to a flat sequence, prepend cover."""
    seq = f"build/{name}-seq"
    shutil.rmtree(seq, ignore_errors=True)
    os.makedirs(seq, exist_ok=True)

    # Cover hold: copy the cover PNG as the first frames.
    cover_img = f"build/{name}-cover.png"
    shutil.copy(cover, cover_img)

    out_idx = 0
    for i in range(COVER_HOLD):
        shutil.copy(cover_img, f"{seq}/i{out_idx:05d}.png")
        out_idx += 1

    # Gameplay frames.
    for i in range(count):
        shutil.copy(f"{frame_dir}/f{i:04d}.png", f"{seq}/i{out_idx:05d}.png")
        out_idx += 1

    total = out_idx
    duration = total / FPS

    vf = f"scale={width}:{height}"
    if zoom:
        # Gentle center zoom to tighten dead space.
        z = zoom
        vf = (
            f"scale=iw*{z}:ih*{z},"
            f"crop={width}:{height}:(iw*{z}-{width})/2:(ih*{z}-{height})/2,"
            f"scale={width}:{height}"
        )

    dest = f"{OUT}/{name}"
    cmd = [
        FF, "-y",
        "-framerate", str(FPS),
        "-i", f"{seq}/i%05d.png",
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-an",
        dest,
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    # Verify.
    probe = subprocess.run(
        [FF, "-i", dest],
        capture_output=True, text=True
    ).stderr
    dur_line = [l for l in probe.splitlines() if "Duration" in l]
    res_line = [l for l in probe.splitlines() if "Stream" in l and "Video" in l]
    size = os.path.getsize(dest) // 1024
    print(f"{dest}: {dur_line[0].split(',')[0].split(': ', 1)[1]} | {res_line[0].split(', ')[2] if res_line else '?'} | {size} KB")
    return duration


os.makedirs("build", exist_ok=True)

d1 = build_symp(
    "preview-landscape.mp4",
    "capture/landscape",
    "assets/marketing/crazygames/cover-landscape.png",
    1920, 1080, LAND_FRAMES,
    zoom=None,
)
d2 = build_symp(
    "preview-portrait.mp4",
    "capture/portrait",
    "assets/marketing/crazygames/cover-portrait.png",
    720, 1080, PORT_FRAMES,
)
print(f"landscape duration: {d1:.1f}s | portrait duration: {d2:.1f}s")
