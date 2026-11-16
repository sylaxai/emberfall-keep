"""Exercise mouse play and every scripted scene outside the sandbox."""
from playwright.sync_api import sync_playwright

from shoot import arguments, check_errors, game_server, load_shot, monitor, shots


def main():
    args = arguments()
    with game_server(args.port) as url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1280, 'height': 720},
                                    device_scale_factor=1)
            errors = monitor(page)
            response = page.goto(url + '/index.html')
            assert response and response.ok, 'Title screen failed to load'
            page.wait_for_function('window.__game && window.__game.state.wave === 0')
            page.mouse.click(640, 360)
            page.wait_for_timeout(100)
            # Arrow is selected initially; these grass cells flank the first bend.
            for x, y in ((280, 280), (440, 280)):
                page.mouse.click(x, y)
                page.wait_for_function(
                    '(count) => window.__game.state.towers.filter(t => t.active).length === count',
                    arg=1 if x == 280 else 2,
                )
            page.mouse.click(1120, 677)  # Start Wave
            page.wait_for_function("window.__game.state.waveState === 'fight'")
            page.wait_for_timeout(4000)
            assert page.evaluate('window.__game.state.enemies.some(e => e.active)'), 'No enemies spawned'
            page.mouse.click(1125, 35)  # Pause
            page.wait_for_timeout(150)
            snapshot = page.evaluate('JSON.stringify(window.__game.state)')
            page.wait_for_timeout(500)
            assert page.evaluate('JSON.stringify(window.__game.state)') == snapshot, 'Pause did not freeze play'
            page.mouse.click(1125, 35)  # Resume
            page.wait_for_function(
                '(before) => JSON.stringify(window.__game.state) !== before', arg=snapshot,
            )
            check_errors(errors)
            for shot in shots():
                load_shot(page, url, shot)
                check_errors(errors)
                print(f"Ready: {shot['query']}")
            check_errors(errors)
            print('PASS: mouse play, pause/resume, all shot scenes; zero browser errors')
        finally:
            browser.close()


if __name__ == '__main__':
    main()
