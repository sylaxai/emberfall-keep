"""Capture the scripted scenes. Run outside the restricted sandbox."""
import argparse
from contextlib import contextmanager
import json
from pathlib import Path
import subprocess
import tempfile
import time
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8080)
    return parser.parse_args()


def shots():
    return json.loads((ROOT / 'shots.json').read_text())


@contextmanager
def game_server(port):
    url = f'http://127.0.0.1:{port}'
    with tempfile.TemporaryFile(mode='w+') as log:
        process = subprocess.Popen(
            ['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
            cwd=ROOT / 'game', stdout=log, stderr=log,
        )
        try:
            deadline = time.monotonic() + 10
            while True:
                if process.poll() is not None:
                    log.seek(0)
                    raise RuntimeError('Game server failed:\n' + log.read())
                try:
                    with urlopen(url + '/index.html', timeout=0.5) as response:
                        if response.status == 200:
                            break
                except OSError:
                    pass
                if time.monotonic() >= deadline:
                    raise RuntimeError('Game server did not become ready')
                time.sleep(0.1)
            yield url
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def monitor(page):
    errors = []
    page.on('console', lambda message: errors.append('console: ' + message.text)
            if message.type == 'error' else None)
    page.on('pageerror', lambda error: errors.append('page: ' + str(error)))
    # The game has no favicon asset; avoid an unrelated browser favicon request.
    page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
    return errors


def check_errors(errors):
    if errors:
        raise AssertionError('Browser errors:\n' + '\n'.join(errors))


def load_shot(page, url, shot):
    response = page.goto(url + '/index.html' + shot['query'])
    assert response and response.ok, f"Failed to load {shot['query']}"
    page.wait_for_function('window.__shotReady === true', timeout=60000)


def main():
    args = arguments()
    with game_server(args.port) as url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1280, 'height': 720},
                                    device_scale_factor=1)
            errors = monitor(page)
            (ROOT / 'screenshots').mkdir(exist_ok=True)
            for shot in shots():
                load_shot(page, url, shot)
                check_errors(errors)
                target = ROOT / 'screenshots' / shot['name']
                for quality in (95, 90, 85):
                    page.screenshot(path=str(target), type='jpeg', quality=quality)
                    if target.stat().st_size < 262144:
                        break
                size = target.stat().st_size
                if size >= 262144:
                    raise AssertionError(f'{target.name}: {size} bytes exceeds limit')
                check_errors(errors)
                print(f'{target.name}: {size} bytes')
            check_errors(errors)
        finally:
            browser.close()


if __name__ == '__main__':
    main()
