import os
import sys
import time
import threading
import http.server
import socketserver
import subprocess
import glob
from playwright.sync_api import sync_playwright

DIST_DIR = r"C:\Projects\code\v_c\IT Start\dist"
OUTPUT_DIR = r"C:\Projects\code\v_c\IT Start\videos"
FINAL_MP4 = r"C:\Projects\code\v_c\IT Start\it_start_screencast.mp4"
PORT = 8999

os.makedirs(OUTPUT_DIR, exist_ok=True)

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def log_message(self, format, *args):
        pass  # Suppress request spam

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), SPAHandler) as httpd:
        httpd.serve_forever()

def smooth_mouse_move(page, start_x, start_y, end_x, end_y, steps=25, delay=0.015):
    for i in range(steps + 1):
        x = start_x + (end_x - start_x) * (i / steps)
        y = start_y + (end_y - start_y) * (i / steps)
        page.mouse.move(x, y)
        time.sleep(delay)

def smooth_scroll(page, delta_y, steps=20, delay=0.02):
    step_y = delta_y / steps
    for _ in range(steps):
        page.evaluate(f"window.scrollBy(0, {step_y})")
        time.sleep(delay)

def inject_cursor(page):
    page.evaluate("""
    () => {
        if (document.getElementById('screencast-cursor')) return;
        const cursor = document.createElement('div');
        cursor.id = 'screencast-cursor';
        cursor.style.cssText = 'position:fixed;width:22px;height:22px;border-radius:50%;background:rgba(59,130,246,0.75);border:2.5px solid white;pointer-events:none;z-index:9999999;transform:translate(-50%,-50%);transition:transform 0.12s ease, background 0.15s ease;box-shadow:0 0 12px rgba(0,0,0,0.4);left:960px;top:540px;';
        document.body.appendChild(cursor);

        window.addEventListener('mousemove', e => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        }, { passive: true });

        window.addEventListener('mousedown', () => {
            cursor.style.transform = 'translate(-50%,-50%) scale(0.65)';
            cursor.style.background = 'rgba(239,68,68,0.95)';
        }, { passive: true });

        window.addEventListener('mouseup', () => {
            cursor.style.transform = 'translate(-50%,-50%) scale(1)';
            cursor.style.background = 'rgba(59,130,246,0.75)';
        }, { passive: true });
    }
    """)

def record():
    # Start background local web server
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1)
    print("Local HTTP server running on port", PORT)

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

    print("Using browser binary:", chrome_path)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--window-size=1920,1080"
            ]
        )

        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=OUTPUT_DIR,
            record_video_size={"width": 1920, "height": 1080}
        )

        page = context.new_page()
        print("Navigating to site...")
        page.goto(f"http://127.0.0.1:{PORT}", wait_until="networkidle")
        time.sleep(1)
        inject_cursor(page)
        page.mouse.move(960, 540)
        time.sleep(2)

        # 1. Hero & Header intro (0-15s)
        print("Scene 1: Hero & Theme toggle...")
        time.sleep(2.5)

        # Toggle to light theme
        theme_btn = page.locator("button[aria-label*='светл'], button[aria-label*='темн'], button[title*='тем'], button[title*='свет']").first
        if theme_btn.count() > 0:
            box = theme_btn.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 540, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.5)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(2.5)
                # Toggle back to dark theme
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(2)

        # 2. Scroll to Filters and select Frontend -> React (15-40s)
        print("Scene 2: Filtering vacancies...")
        smooth_scroll(page, 380, steps=25, delay=0.03)
        time.sleep(1.5)

        # Find Frontend direction pill/button
        fe_button = page.locator("button:has-text('Frontend')").first
        if fe_button.count() > 0:
            box = fe_button.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 400, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.4)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(1.5)

        # Find React subtrack pill
        react_sub = page.locator("button:has-text('React')").first
        if react_sub.count() > 0:
            box = react_sub.bounding_box()
            if box:
                smooth_mouse_move(page, box['x'], box['y'] - 100, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.3)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(1.5)

        # 3. Vacancy Card Details: Company Info & Selection Steps (40-75s)
        print("Scene 3: Vacancy card details & company info...")
        smooth_scroll(page, 280, steps=20, delay=0.03)
        time.sleep(1.5)

        # Hover over info icon (CircleAlert) of first card
        info_btn = page.locator("button[aria-label*='О компании'], button[title*='Информация о компании']").first
        if info_btn.count() > 0:
            box = info_btn.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 500, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.6)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(3) # Show Company Modal
                
                # Scroll company modal slightly to see perks
                modal = page.locator(".modal-overlay-animation, div[role='dialog']").first
                page.evaluate("() => { const el = document.querySelector('.overflow-y-auto'); if (el) el.scrollBy(0, 200); }")
                time.sleep(2)
                page.evaluate("() => { const el = document.querySelector('.overflow-y-auto'); if (el) el.scrollBy(0, -200); }")
                time.sleep(1)

                # Close company modal
                close_btn = page.locator("button:has-text('Закрыть')").first
                if close_btn.count() > 0:
                    cbox = close_btn.bounding_box()
                    if cbox:
                        smooth_mouse_move(page, box['x'], box['y'], cbox['x'] + cbox['width']/2, cbox['y'] + cbox['height']/2)
                        time.sleep(0.3)
                        page.mouse.click(cbox['x'] + cbox['width']/2, cbox['y'] + cbox['height']/2)
                else:
                    page.keyboard.press("Escape")
                time.sleep(1.5)

        # Click "Как пройти на стажировку (этапы)"
        steps_btn = page.locator("button:has-text('Как пройти на стажировку')").first
        if steps_btn.count() > 0:
            box = steps_btn.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 500, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.4)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(2.5)

        # Toggle favorite star
        fav_btn = page.locator("button[aria-label='В избранное'], button[title*='избран']").first
        if fav_btn.count() > 0:
            box = fav_btn.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 400, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.4)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(1.5)

        # Mark application tracked
        track_btn = page.locator("button:has-text('Откликнулся'), button:has-text('В отклики')").first
        if track_btn.count() > 0:
            box = track_btn.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 500, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.4)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(1.5)

        # 4. Roadmap Modal (75-120s)
        print("Scene 4: Roadmap viewer & topics...")
        plan_btn = page.locator("button:has-text('План')").first
        if plan_btn.count() > 0:
            box = plan_btn.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 500, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.4)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(2.5)

                # Scroll inside modal to see roadmap topics
                page.evaluate("() => { const el = document.querySelector('.overflow-y-auto'); if (el) el.scrollBy(0, 320); }")
                time.sleep(1.5)

                # Check topic checkboxes
                checks = page.locator("button:has-text('Изучено'), input[type='checkbox'], button:has(.lucide-square)")
                for i in range(min(checks.count(), 3)):
                    chk = checks.nth(i)
                    cbox = chk.bounding_box()
                    if cbox and cbox['y'] > 100 and cbox['y'] < 900:
                        smooth_mouse_move(page, 960, 500, cbox['x'] + cbox['width']/2, cbox['y'] + cbox['height']/2)
                        time.sleep(0.3)
                        page.mouse.click(cbox['x'] + cbox['width']/2, cbox['y'] + cbox['height']/2)
                        inject_cursor(page)
                        time.sleep(1.2)

                # Scroll further down to see interview question in modal
                page.evaluate("() => { const el = document.querySelector('.overflow-y-auto'); if (el) el.scrollBy(0, 380); }")
                time.sleep(2)

                # Expand an interview question if present
                q_btn = page.locator("button:has-text('Вопрос с собеседования'), button:has(.lucide-help-circle)").first
                if q_btn.count() > 0:
                    qbox = q_btn.bounding_box()
                    if qbox and qbox['y'] > 100 and qbox['y'] < 950:
                        smooth_mouse_move(page, 960, 600, qbox['x'] + qbox['width']/2, qbox['y'] + qbox['height']/2)
                        time.sleep(0.3)
                        page.mouse.click(qbox['x'] + qbox['width']/2, qbox['y'] + qbox['height']/2)
                        inject_cursor(page)
                        time.sleep(3)

                # Close roadmap modal
                close_icon = page.locator("button[aria-label='Закрыть'], button:has(.lucide-x)").first
                if close_icon.count() > 0:
                    cbox = close_icon.bounding_box()
                    if cbox:
                        smooth_mouse_move(page, 960, 400, cbox['x'] + cbox['width']/2, cbox['y'] + cbox['height']/2)
                        time.sleep(0.3)
                        page.mouse.click(cbox['x'] + cbox['width']/2, cbox['y'] + cbox['height']/2)
                else:
                    page.keyboard.press("Escape")
                time.sleep(1.5)

        # 5. Switch to "Мои отклики" (Applications Tracker) (120-145s)
        print("Scene 5: Applications tracker...")
        smooth_scroll(page, -600, steps=25, delay=0.02)
        time.sleep(1)

        app_tab = page.locator("button:has-text('Мои отклики')").first
        if app_tab.count() > 0:
            box = app_tab.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 200, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.4)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(3)

                # Smooth scroll in applications
                smooth_scroll(page, 200, steps=15, delay=0.03)
                time.sleep(2)

        # 6. Switch to "Вопросы" (Trainer) (145-165s)
        print("Scene 6: Questions trainer...")
        smooth_scroll(page, -300, steps=15, delay=0.02)
        time.sleep(1)

        q_tab = page.locator("button:has-text('Вопросы')").first
        if q_tab.count() > 0:
            box = q_tab.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 200, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.4)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(2)

                # Show question answer
                reveal_btn = page.locator("button:has-text('Показать ответ')").first
                if reveal_btn.count() > 0:
                    rbox = reveal_btn.bounding_box()
                    if rbox:
                        smooth_mouse_move(page, 960, 400, rbox['x'] + rbox['width']/2, rbox['y'] + rbox['height']/2)
                        time.sleep(0.3)
                        page.mouse.click(rbox['x'] + rbox['width']/2, rbox['y'] + rbox['height']/2)
                        inject_cursor(page)
                        time.sleep(2.5)

        # 7. Return to Каталог & Outro
        print("Scene 7: Outro...")
        cat_tab = page.locator("button:has-text('Каталог')").first
        if cat_tab.count() > 0:
            box = cat_tab.bounding_box()
            if box:
                smooth_mouse_move(page, 960, 200, box['x'] + box['width']/2, box['y'] + box['height']/2)
                time.sleep(0.3)
                page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                inject_cursor(page)
                time.sleep(2)

        smooth_scroll(page, -500, steps=20, delay=0.02)
        time.sleep(3)

        print("Finished script interaction. Closing context...")
        context.close()
        browser.close()

    # Convert recorded webm to high quality mp4 via ffmpeg
    webms = glob.glob(os.path.join(OUTPUT_DIR, "*.webm"))
    if not webms:
        print("Error: No recorded webm found!")
        return

    latest_webm = max(webms, key=os.path.getmtime)
    print("Converting", latest_webm, "to", FINAL_MP4)

    ffmpeg_bin = r"C:\Users\Тимур\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
    if not os.path.exists(ffmpeg_bin):
        ffmpeg_bin = "ffmpeg"

    cmd = [
        ffmpeg_bin, "-y",
        "-i", latest_webm,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "22",
        "-r", "30",
        FINAL_MP4
    ]
    subprocess.run(cmd, check=True)
    print("Successfully generated final MP4:", FINAL_MP4)

if __name__ == "__main__":
    record()
