from playwright.sync_api import sync_playwright
from pathlib import Path
import os
from urllib.parse import urlparse
base=os.environ.get("QA_BASE", "http://127.0.0.1:5174")
assert urlparse(base).hostname in ["localhost", "127.0.0.1"], "Local preview QA only"
out=Path(os.environ.get('QA_OUT',str(Path(__file__).resolve().parent.parent/'docs/screenshots/hardening')));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for name,width,height in [('desktop',1440,960),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},is_mobile=name=='mobile',has_touch=name=='mobile')
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base,wait_until='domcontentloaded',timeout=60000)
  page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
  page.screenshot(path=str(out/f'city-{name}-preview.png'))
  page.locator('.live-person button').click()
  page.locator('.life-story').wait_for()
  assert 'tuổi mô phỏng' in page.locator('.life-story').inner_text()
  page.screenshot(path=str(out/f'profile-{name}-preview.png'))
  page.get_by_role('button',name='Đóng bảng thông tin',exact=True).click()
  # venue panel opens by selecting its accessible navigation button
  page.get_by_role('button',name='Địa điểm',exact=True).click()
  page.locator('.venue-grid button').filter(has_text='Bếp chung').click()
  page.locator('.interior-canvas canvas').wait_for(timeout=60000)
  page.locator('.interior-view').scroll_into_view_if_needed()
  page.wait_for_timeout(1000)
  page.screenshot(path=str(out/f'interior-{name}-preview.png'))
  page.get_by_role('button',name='Tầng 2',exact=True).click()
  page.wait_for_timeout(500)
  assert page.get_by_role('button',name='Tầng 2',exact=True).get_attribute('aria-pressed')=='true'
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  assert not errors, errors
  print(name,'PASS: 3D city, profile, furnished interior, floor selection, no page errors/overflow',flush=True)
  page.close()
 browser.close()
