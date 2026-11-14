import os
import math
from PIL import Image, ImageDraw, ImageFont

def draw_atlas_crest(size, is_foreground_only=False, is_round=False):
    # Base image with transparency
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center_x = size / 2.0
    center_y = size / 2.0

    if not is_foreground_only:
        # Background: Rich Dark Stadium Hex/Circle
        bg_radius = size / 2.0
        if is_round:
            draw.ellipse([0, 0, size, size], fill=(18, 20, 26, 255))
        else:
            corner_r = int(size * 0.22)
            draw.rounded_rectangle([0, 0, size, size], radius=corner_r, fill=(18, 20, 26, 255))

        # Glowing outer pitch ring
        pitch_r = size * 0.44
        draw.ellipse([center_x - pitch_r, center_y - pitch_r, center_x + pitch_r, center_y + pitch_r],
                     outline=(0, 255, 135, 45), width=max(1, int(size * 0.015)))

    # Scale factor relative to 512px canvas
    s = size / 512.0

    # Shield Crest Vertices
    # Top center, top right, bottom right, bottom center, bottom left, top left
    crest_pts = [
        (center_x, center_y - 150 * s),
        (center_x + 130 * s, center_y - 75 * s),
        (center_x + 130 * s, center_y + 80 * s),
        (center_x, center_y + 165 * s),
        (center_x - 130 * s, center_y + 80 * s),
        (center_x - 130 * s, center_y - 75 * s)
    ]

    # Draw Shield Fill
    draw.polygon(crest_pts, fill=(28, 32, 42, 255))

    # Outer Shield Outline: Electric Neon Green (#00FF87)
    draw.polygon(crest_pts, outline=(0, 255, 135, 255), width=max(2, int(10 * s)))

    # Inner Glow Line: Cyan (#00F5D4)
    inner_pts = [
        (center_x, center_y - 138 * s),
        (center_x + 118 * s, center_y - 68 * s),
        (center_x + 118 * s, center_y + 72 * s),
        (center_x, center_y + 150 * s),
        (center_x - 118 * s, center_y + 72 * s),
        (center_x - 118 * s, center_y - 68 * s)
    ]
    draw.polygon(inner_pts, outline=(0, 245, 212, 120), width=max(1, int(3 * s)))

    # Champion Golden Star on top
    star_cy = center_y - 120 * s
    star_r_out = 18 * s
    star_r_in = 7 * s
    star_pts = []
    for i in range(10):
        angle = i * (math.pi / 5.0) - (math.pi / 2.0)
        r = star_r_out if i % 2 == 0 else star_r_in
        star_pts.append((center_x + r * math.cos(angle), star_cy + r * math.sin(angle)))
    draw.polygon(star_pts, fill=(250, 204, 21, 255))

    # Iconic Bold Futuristic 'A' Monogram
    # Outer A points
    a_outer = [
        (center_x, center_y - 65 * s),
        (center_x + 68 * s, center_y + 95 * s),
        (center_x + 36 * s, center_y + 95 * s),
        (center_x + 20 * s, center_y + 55 * s),
        (center_x - 20 * s, center_y + 55 * s),
        (center_x - 36 * s, center_y + 95 * s),
        (center_x - 68 * s, center_y + 95 * s),
    ]
    draw.polygon(a_outer, fill=(0, 255, 135, 255))

    # Inner cutout triangle of 'A'
    a_inner = [
        (center_x, center_y - 15 * s),
        (center_x - 12 * s, center_y + 25 * s),
        (center_x + 12 * s, center_y + 25 * s),
    ]
    draw.polygon(a_inner, fill=(28, 32, 42, 255))

    # Crossbar neon accent
    draw.line([
        (center_x - 18 * s, center_y + 35 * s),
        (center_x + 18 * s, center_y + 35 * s)
    ], fill=(255, 255, 255, 230), width=max(2, int(5 * s)))

    return img

def draw_splash(width, height):
    img = Image.new("RGBA", (width, height), (15, 17, 23, 255))
    draw = ImageDraw.Draw(img)

    # Ambient stadium glow gradient
    center_x = width / 2.0
    center_y = height / 2.0

    # Draw centered icon
    icon_size = min(int(min(width, height) * 0.42), 340)
    crest = draw_atlas_crest(icon_size, is_foreground_only=False)

    img.paste(crest, (int(center_x - icon_size / 2.0), int(center_y - icon_size / 2.0 - 20)), crest)

    return img

def main():
    res_dir = "android/app/src/main/res"

    mipmaps = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }

    print("Generating Mipmap App Icons...")
    for folder, (size, fg_size) in mipmaps.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Standard icon
        icon = draw_atlas_crest(size, is_foreground_only=False, is_round=False)
        icon.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")

        # Round icon
        round_icon = draw_atlas_crest(size, is_foreground_only=False, is_round=True)
        round_icon.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")

        # Foreground for adaptive icons (padded on transparent)
        fg_icon = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        fg_content = draw_atlas_crest(int(fg_size * 0.72), is_foreground_only=True)
        fg_offset = int((fg_size - int(fg_size * 0.72)) / 2)
        fg_icon.paste(fg_content, (fg_offset, fg_offset), fg_content)
        fg_icon.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")

        print(f"  ✓ {folder} generated ({size}px & {fg_size}px)")

    # Splash screens
    splash_targets = {
        "drawable/splash.png": (480, 320),
        "drawable-land-mdpi/splash.png": (480, 320),
        "drawable-land-hdpi/splash.png": (800, 480),
        "drawable-land-xhdpi/splash.png": (1280, 720),
        "drawable-land-xxhdpi/splash.png": (1600, 960),
        "drawable-land-xxxhdpi/splash.png": (1920, 1280),
        "drawable-port-mdpi/splash.png": (320, 480),
        "drawable-port-hdpi/splash.png": (480, 800),
        "drawable-port-xhdpi/splash.png": (720, 1280),
        "drawable-port-xxhdpi/splash.png": (960, 1600),
        "drawable-port-xxxhdpi/splash.png": (1280, 1920),
    }

    print("Generating Splash Screens...")
    for rel_path, (w, h) in splash_targets.items():
        out_path = os.path.join(res_dir, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        splash_img = draw_splash(w, h)
        splash_img.save(out_path, "PNG")
        print(f"  ✓ {rel_path} ({w}x{h})")

    print("All icons and splash screens successfully generated!")

if __name__ == "__main__":
    main()
