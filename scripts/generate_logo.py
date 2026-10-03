import os
import math
from PIL import Image, ImageDraw

os.makedirs('assets', exist_ok=True)
os.makedirs('public', exist_ok=True)

# 1. Create crisp, clean SVG logo
svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A73E8"/>
      <stop offset="50%" stop-color="#0B57D0"/>
      <stop offset="100%" stop-color="#041E49"/>
    </linearGradient>
    <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#C2E7FF"/>
    </linearGradient>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7CBEFF" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#A8C7FA" stop-opacity="0.3"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0B57D0" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Base Rounded Squircle with Shadow -->
  <rect x="32" y="32" width="448" height="448" rx="108" fill="url(#bgGrad)" filter="url(#glow)"/>

  <!-- Subtle Inner Border -->
  <rect x="34" y="34" width="444" height="444" rx="106" fill="none" stroke="#A8C7FA" stroke-width="4" stroke-opacity="0.3"/>

  <!-- Stream Broadcast Arc 1 -->
  <path d="M 330 150 A 150 150 0 0 1 330 362" fill="none" stroke="url(#waveGrad)" stroke-width="28" stroke-linecap="round"/>

  <!-- Stream Broadcast Arc 2 -->
  <path d="M 380 100 A 220 220 0 0 1 380 412" fill="none" stroke="url(#waveGrad)" stroke-width="24" stroke-linecap="round" stroke-opacity="0.6"/>

  <!-- Central Play Icon with Soft Rounded Corners -->
  <polygon points="190,165 315,256 190,347" fill="url(#playGrad)"/>

  <!-- Center Circle Accent (Signal Hub Dot) -->
  <circle cx="155" cy="256" r="16" fill="#7CBEFF"/>
</svg>
"""

with open('public/logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

with open('assets/logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

# 2. Render high resolution 512x512 PNG using Pillow with anti-aliasing (supersampling)
def create_high_res_icon(size=512):
    scale = 4
    canvas_size = size * scale
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = 32 * scale
    radius = 108 * scale
    w = canvas_size - 2 * margin

    # Draw rounded background squircle
    draw.rounded_rectangle(
        [margin, margin, margin + w, margin + w],
        radius=radius,
        fill=(11, 87, 208, 255) # Deep Google Blue #0B57D0
    )

    # Gradient overlay simulation
    top_color = (26, 115, 232, 180) # #1A73E8
    draw.rounded_rectangle(
        [margin + 4*scale, margin + 4*scale, margin + w - 4*scale, margin + w/2],
        radius=radius - 4*scale,
        fill=top_color
    )

    # Border stroke
    draw.rounded_rectangle(
        [margin, margin, margin + w, margin + w],
        radius=radius,
        outline=(168, 199, 250, 160), # #A8C7FA
        width=int(4 * scale)
    )

    # Stream Wave Arcs
    cx, cy = int(256 * scale), int(256 * scale)
    
    # Outer Arc (bbox)
    outer_r = int(180 * scale)
    draw.arc(
        [cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r],
        start=-50,
        end=50,
        fill=(124, 190, 255, 140),
        width=int(24 * scale)
    )

    # Inner Arc
    inner_r = int(120 * scale)
    draw.arc(
        [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
        start=-55,
        end=55,
        fill=(168, 199, 250, 220),
        width=int(28 * scale)
    )

    # Play Triangle
    # points: (190, 165), (315, 256), (190, 347)
    p1 = (int(190 * scale), int(165 * scale))
    p2 = (int(315 * scale), int(256 * scale))
    p3 = (int(190 * scale), int(347 * scale))
    draw.polygon([p1, p2, p3], fill=(255, 255, 255, 255))

    # Signal dot
    dot_r = int(16 * scale)
    dot_x, dot_y = int(155 * scale), int(256 * scale)
    draw.ellipse(
        [dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r],
        fill=(168, 199, 250, 255)
    )

    # Downsample using LANCZOS for crystal clean anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# Generate 512x512 master image
icon_512 = create_high_res_icon(512)
icon_512.save('assets/icon.png', 'PNG')
icon_512.save('public/logo.png', 'PNG')

# Generate multi-size ICO file for Windows (256, 128, 64, 48, 32, 16)
sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
icon_512.save('assets/icon.ico', format='ICO', sizes=sizes)
icon_512.save('public/favicon.ico', format='ICO', sizes=[(64, 64), (32, 32), (16, 16)])

print("Successfully generated open source logo assets: SVG, PNG, and multi-resolution ICO files.")
