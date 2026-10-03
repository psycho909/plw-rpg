"""Shared disposable local browser helpers, adapted from the accepted UI harness.
Not an application API. Agents own their lane artifacts and page-error collection.
"""
import copy, json, os, time
from urllib.parse import urlsplit
from playwright.sync_api import expect
URL = os.environ.get("PLW_UI_URL", "http://127.0.0.1:5180/")
assert urlsplit(URL).hostname in {"127.0.0.1", "localhost"}
ORIGIN = f"{urlsplit(URL).scheme}://{urlsplit(URL).netloc}"
RESULTS = {"page_errors": []}

def close(page):
    if page.locator('dialog').count():
        page.keyboard.press('Escape')


def state(page):
    close(page)
    page.locator('.save-button').click()
    return page.evaluate('JSON.parse(localStorage.getItem("oakvale-v1"))')


def player(saved):
    return next(c for c in saved['characters'] if c['id'] == saved['activeCharacterId'])


def open_notes(page):
    close(page)
    page.keyboard.press('Escape')
    page.locator('.pixel-menu').get_by_role('button', name='旅人筆記', exact=True).click()


def travel(page, label=None, position=None):
    close(page)
    page.keyboard.press('m')
    if label:
        page.get_by_role('button', name='前往' + label, exact=True).click()
    else:
        page.locator(f'.overview-map button[data-position="{position}"]').click()
    expect(page.locator('dialog')).to_have_count(0)


def interact(page):
    page.locator('.context-action').click()
    expect(page.locator('dialog[open]')).to_have_count(1)


def new_page(browser, viewport=(1440, 1000), saved=None, raw=None, **options):
    config = {'viewport': {'width': viewport[0], 'height': viewport[1]}, **options}
    if saved is not None or raw is not None:
        fixture = copy.deepcopy(saved)
        if fixture is not None:
            fixture['lastSavedAt'] = int(time.time() * 1000)
        config['storage_state'] = {'cookies': [], 'origins': [{'origin': ORIGIN, 'localStorage': [{'name': 'oakvale-v1', 'value': raw if raw is not None else json.dumps(fixture)}]}]}
    context = browser.new_context(**config)
    page = context.new_page()
    page.on('pageerror', lambda error: RESULTS['page_errors'].append(str(error)))
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='暫停', exact=True).click()
    return context, page
