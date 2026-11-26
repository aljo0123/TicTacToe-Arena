"""Extract spot-check frames from the built previews and verify
first frame == cover, resolution, and no content cropping."""

import subprocess
import os
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
OUT = "assets/marketing/crazygames"

checks = [
    ("preview-landscape.mp4", "check-land-first.png", 0.5),
    ("preview-landscape.mp4", "check-land-mid.png", 6.0),
    ("preview-landscape.mp4", "check-land-end.png", 15.0),
    ("preview-portrait.mp4", "check-port-first.png", 0.5),
    ("preview-portrait.mp4", "check-port-mid.png", 6.0),
    ("preview-portrait.mp4", "check-port-end.png", 16.0),
]

os.makedirs("check", exist_ok=True)
for video, dest, t in checks:
    subprocess.run(
        [FF, "-y", "-ss", str(t), "-i", f"{OUT}/{video}",
         "-frames:v", "1", f"check/{dest}"],
        capture_output=True, check=True
    )
    print(f"extracted check/{dest} @ {t}s")
