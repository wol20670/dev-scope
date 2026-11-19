import { expect, test, type Page } from '@playwright/test'
import { concepts } from '../../src/content/concepts'

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 768

/** 가로 스크롤이 생기지 않는지 */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test.describe('페이지 접근 (직접 URL)', () => {
  for (const path of ['/', '/concepts', '/search?q=lock', '/about']) {
    test(`${path} 를 직접 열 수 있다`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(path)
      await expect(page.locator('h1')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      expect(errors).toEqual([])
    })
  }

  test('모든 개념 상세 페이지가 본문과 출처를 렌더링한다', async ({ page }) => {
    test.slow()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    for (const c of concepts) {
      await page.goto(`/concepts/${c.slug}`)
      await expect(page.getByRole('heading', { level: 1, name: c.title })).toBeVisible()
      await expect(page.locator('h2#왜-필요한가')).toBeVisible()
      await expect(page.locator('#references a').first()).toHaveAttribute('href', /^https:\/\//)
      if (c.visualizationType !== 'static') await expect(page.getByTestId('simulator')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    }
    expect(errors).toEqual([])
  })

  test('지연 로드 청크를 못 불러오면 404가 아니라 새로고침을 안내한다', async ({ page }) => {
    // 새 버전 배포 후 열려 있던 탭이 사라진 청크를 요청하는 상황을 흉내 낸다
    await page.route('**/assets/content-*.js', (route) => route.abort())
    await page.goto('/concepts/cors')
    await expect(page.getByRole('heading', { name: '페이지를 불러오지 못했습니다' })).toBeVisible()
    await expect(page.getByRole('button', { name: '새로고침' })).toBeVisible()
  })

  test('없는 주소와 없는 개념은 404 안내를 보여 준다', async ({ page }) => {
    await page.goto('/no-such-page')
    await expect(page.getByText('404')).toBeVisible()
    await page.goto('/concepts/no-such-concept')
    await expect(page.getByRole('heading', { name: /개념을 찾을 수 없습니다/ })).toBeVisible()
  })
})

test.describe('검색과 탐색', () => {
  test('메인에서 검색 → 결과 → 상세 페이지로 이동한다', async ({ page }) => {
    await page.goto('/')
    const hero = page.getByRole('main').getByRole('searchbox')
    await hero.fill('낙관적 락과 비관적 락의 차이')
    await hero.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=/)
    const first = page.getByTestId('concept-card').first()
    await expect(first).toContainText('낙관적 락과 비관적 락')
    await first.click()
    await expect(page).toHaveURL('/concepts/optimistic-pessimistic-lock')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('낙관적 락과 비관적 락')
  })

  test('영어 용어로 한국어 개념을 찾는다', async ({ page }) => {
    await page.goto('/search?q=event%20loop')
    await expect(page.getByTestId('concept-card').first()).toContainText('이벤트 루프')
  })

  test('본문에만 있는 단어도 찾고, 일치한 문맥을 보여 준다', async ({ page }) => {
    await page.goto('/search?q=%ED%99%94%EC%9D%B4%ED%8A%B8%EB%B3%B4%EB%93%9C') // 화이트보드
    const card = page.getByTestId('concept-card')
    await expect(card).toHaveCount(1)
    await expect(card).toContainText('트랜잭션 격리 수준')
    await expect(card.getByTestId('body-snippet')).toContainText('화이트보드')
  })

  test('콘텐츠 JSON(content/concepts.json)을 공개한다', async ({ request }) => {
    const res = await request.get('/content/concepts.json')
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data.schemaVersion).toBe(1)
    expect(data.concepts).toHaveLength(concepts.length)
    expect(data.concepts[0].sections.length).toBeGreaterThan(0)
  })

  test('결과가 없으면 대안 키워드와 카테고리를 안내한다', async ({ page }) => {
    await page.goto('/search?q=kubernetes')
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByRole('heading', { name: '카테고리에서 찾아보기' })).toBeVisible()
    await page.getByRole('link', { name: 'Frontend' }).first().click()
    await expect(page).toHaveURL(/category=frontend/)
  })

  test('필터가 목록을 좁히고 새로고침 후에도 유지된다', async ({ page }) => {
    await page.goto('/concepts')
    await expect(page.getByTestId('result-count')).toContainText(String(concepts.length))
    if (isMobile(page)) await page.getByRole('button', { name: /필터/ }).click()

    await page.getByRole('button', { name: /^Frontend/ }).click()
    // 필터 상태는 URL에서 오고, 라우터 내비게이션이 끝난 뒤 반영된다
    await page.getByLabel('시뮬레이터가 있는 개념만').click()
    await expect(page.getByLabel('시뮬레이터가 있는 개념만')).toBeChecked()
    const expected = concepts.filter((c) => c.category === 'frontend' && c.visualizationType !== 'static').length
    await expect(page.getByTestId('concept-card')).toHaveCount(expected)
    await expect(page).toHaveURL(/category=frontend/)
    await expect(page).toHaveURL(/sim=1/)

    await page.reload()
    await expect(page.getByTestId('concept-card')).toHaveCount(expected)

    await page.getByRole('button', { name: '필터 초기화' }).first().click()
    await expect(page.getByTestId('concept-card')).toHaveCount(concepts.length)
  })

  test('키워드 필터는 한국어와 영어를 모두 검색한다', async ({ page }) => {
    await page.goto('/concepts')
    await page.getByLabel('키워드로 필터').fill('transaction')
    await expect(page.getByTestId('concept-card').first()).toContainText('트랜잭션')
  })

  test('관련 개념과 이전·다음 개념으로 이동한다', async ({ page }) => {
    await page.goto('/concepts/optimistic-pessimistic-lock')
    const related = page.locator('#related').getByTestId('concept-card').first()
    const title = (await related.locator('h3').textContent())!
    await related.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)

    await page.goto(`/concepts/${concepts[1].slug}`)
    await page.getByRole('link', { name: /다음 개념/ }).click()
    await expect(page).toHaveURL(`/concepts/${concepts[2].slug}`)
    await page.getByRole('link', { name: /이전 개념/ }).click()
    await expect(page).toHaveURL(`/concepts/${concepts[1].slug}`)
  })
})

test.describe('시뮬레이터', () => {
  test('락: 단계 이동·초기화·시나리오 전환', async ({ page }) => {
    await page.goto('/concepts/optimistic-pessimistic-lock')
    const sim = page.getByTestId('simulator')
    const indicator = sim.getByTestId('step-indicator')
    await expect(indicator).toContainText('STEP 1 /')
    await expect(sim.getByRole('button', { name: '이전 단계' })).toBeDisabled()

    for (let i = 0; i < 5; i++) await sim.getByRole('button', { name: '다음 단계' }).click()
    await expect(indicator).toContainText('STEP 6 /')
    await expect(sim.getByTestId('tx-B-status')).toHaveText(/버전 충돌/)
    await expect(sim.getByTestId('db-version')).toHaveAttribute('data-value', '1')

    await sim.getByRole('button', { name: '이전 단계' }).click()
    await expect(indicator).toContainText('STEP 5 /')
    await sim.getByRole('button', { name: '처음부터 다시' }).click()
    await expect(indicator).toContainText('STEP 1 /')

    await sim.getByRole('tab', { name: '비관적 락' }).click()
    await sim.getByRole('button', { name: '3단계: B는 충돌하는 잠금을 요청하고 대기' }).click()
    await expect(sim.getByTestId('tx-B-status')).toHaveText(/잠금 대기/)
    await expect(sim.getByTestId('db-lock')).toContainText('트랜잭션 A 보유')
  })

  test('자동 재생은 진행하고, 일시정지하면 멈춘다', async ({ page }) => {
    await page.goto('/concepts/optimistic-pessimistic-lock')
    const sim = page.getByTestId('simulator')
    const indicator = sim.getByTestId('step-indicator')
    await sim.getByRole('button', { name: '자동 재생' }).click()
    await expect(indicator).toContainText('STEP 2 /', { timeout: 5000 })
    await sim.getByRole('button', { name: '일시정지' }).click()
    const paused = await indicator.textContent()
    await page.waitForTimeout(2600)
    await expect(indicator).toHaveText(paused!)
  })

  test('격리 수준: 조합에 따라 이상 현상 발생·방지 방식이 달라진다', async ({ page }) => {
    await page.goto('/concepts/transaction-isolation')
    const sim = page.getByTestId('simulator')
    const toEnd = async () => {
      const next = sim.getByRole('button', { name: '다음 단계' })
      while (await next.isEnabled()) await next.click()
    }

    // 기본: Non-repeatable Read · READ COMMITTED · PostgreSQL → 발생
    await toEnd()
    await expect(sim.getByTestId('iso-verdict')).toHaveAttribute('data-outcome', 'anomaly')

    // REPEATABLE READ로 바꾸면 처음부터 다시 시작하고, 스냅샷으로 방지
    await sim.getByRole('tab', { name: 'REPEATABLE READ', exact: true }).click()
    await expect(sim.getByTestId('step-indicator')).toContainText('STEP 1 /')
    await toEnd()
    await expect(sim.getByTestId('iso-verdict')).toHaveAttribute('data-outcome', 'snapshot')

    // 비교표에서 MySQL · SERIALIZABLE 선택 → 잠금 대기
    await sim.getByRole('button', { name: /비교표 보기/ }).click()
    await sim.getByTestId('iso-matrix').locator('tbody tr').nth(3).getByRole('button').nth(1).click()
    await expect(sim.getByTestId('iso-matrix')).toBeVisible()
    await sim.getByRole('button', { name: /4단계/ }).click()
    await expect(sim.getByTestId('iso-T2-status')).toHaveText(/잠금 대기/)

    // Dirty Read · MySQL · READ UNCOMMITTED → 커밋되지 않은 값을 읽음
    await sim.getByRole('tab', { name: 'Dirty Read', exact: true }).click()
    await sim.getByRole('tab', { name: 'READ UNCOMMITTED', exact: true }).click()
    await sim.getByRole('button', { name: /4단계/ }).click()
    await expect(sim.getByTestId('iso-T1-result')).toContainText('커밋되지 않은 값')
  })

  test('키보드 ←/→로 단계를 이동한다', async ({ page }) => {
    await page.goto('/concepts/optimistic-pessimistic-lock')
    const sim = page.getByTestId('simulator')
    await sim.getByRole('button', { name: '다음 단계' }).focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(sim.getByTestId('step-indicator')).toContainText('STEP 3 /')
    await page.keyboard.press('ArrowLeft')
    await expect(sim.getByTestId('step-indicator')).toContainText('STEP 2 /')
  })

  test('이벤트 루프: 끝까지 진행하면 실제 실행 순서가 출력된다', async ({ page }) => {
    await page.goto('/concepts/js-event-loop')
    const sim = page.getByTestId('simulator')
    const next = sim.getByRole('button', { name: '다음 단계' })
    while (await next.isEnabled()) await next.click()
    await expect(sim.getByTestId('console-output')).toContainText('A')
    await sim.getByRole('button', { name: '최종 출력 순서 보기' }).click()
    await expect(sim.getByTestId('final-output')).toHaveText('최종: A → D → C → B')
  })

  test('React 렌더링: state 변경 시 렌더링 대상과 DOM 변경을 구분한다', async ({ page }) => {
    await page.goto('/concepts/react-rendering')
    const sim = page.getByTestId('simulator')
    await sim.getByRole('button', { name: 'setCount(count + 1)' }).click()
    await sim.getByRole('button', { name: '일시정지' }).click()
    await sim.getByRole('button', { name: /3단계/ }).click()
    await expect(sim.getByTestId('node-CountLabel')).toHaveAttribute('data-status', 'committed')
    await expect(sim.getByTestId('node-IncrementButton')).toHaveAttribute('data-status', 'unchanged')
    await expect(sim.getByTestId('node-Header')).toHaveAttribute('data-status', 'idle')
    await sim.getByRole('button', { name: /4단계/ }).click()
    await expect(sim.getByTestId('ui-preview')).toContainText('count: 1')

    await sim.getByLabel(/Sidebar를/).check()
    await sim.getByRole('button', { name: 'setTheme(toggle)' }).click()
    await sim.getByRole('button', { name: '일시정지' }).click()
    await sim.getByRole('button', { name: /2단계/ }).click()
    await expect(sim.getByTestId('node-Sidebar')).toHaveAttribute('data-status', 'skipped')
    await expect(sim.getByTestId('node-Header')).toHaveAttribute('data-status', 'rendered')
  })

  test('HTTP: 요청을 보내면 계층을 따라 이동하고, 계층을 클릭하면 코드가 보인다', async ({ page }) => {
    await page.goto('/concepts/http-request-lifecycle')
    const sim = page.getByTestId('simulator')
    await sim.getByRole('button', { name: 'API 요청 보내기' }).click()
    await expect(sim.getByTestId('layer-server')).toHaveAttribute('data-active', 'true', { timeout: 6000 })
    await sim.getByRole('button', { name: '일시정지' }).click()
    await sim.getByRole('button', { name: /Repository 계층 설명 보기/ }).click()
    await expect(sim.getByTestId('layer-detail')).toContainText('ProductRepository.java')
    // 응답 방향
    await sim.getByRole('button', { name: /^8단계/ }).click()
    await expect(sim.getByTestId('http-direction')).toHaveText('← 응답')
  })
})

test.describe('레이아웃과 접근성', () => {
  test('모바일 메뉴가 열리고 닫힌다', async ({ page }) => {
    test.skip(!isMobile(page), '모바일 전용')
    await page.goto('/')
    await page.getByRole('button', { name: '메뉴 열기' }).click()
    await page.getByRole('navigation', { name: '모바일 메뉴' }).getByRole('link', { name: '소개' }).click()
    await expect(page).toHaveURL('/about')
    await expect(page.getByRole('navigation', { name: '모바일 메뉴' })).toBeHidden()
  })

  test('본문 건너뛰기 링크와 헤딩 구조가 있다', async ({ page }) => {
    await page.goto('/concepts/cors')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: '본문으로 건너뛰기' })).toBeFocused()
    await expect(page.locator('h1')).toHaveCount(1)
    // 본문(MDX)은 지연 로드되므로 렌더링을 기다린 뒤 센다
    await expect(page.locator('h2#왜-필요한가')).toBeVisible()
    expect(await page.locator('main h2').count()).toBeGreaterThanOrEqual(9)
  })

  test('모든 이미지·아이콘 버튼에 접근 가능한 이름이 있다', async ({ page }) => {
    for (const path of ['/', '/concepts/js-event-loop']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const unnamed = await page.$$eval('button, a[href]', (els) =>
        els.filter((el) => !(el.getAttribute('aria-label') || el.textContent?.trim())).map((el) => el.outerHTML.slice(0, 80)),
      )
      expect(unnamed).toEqual([])
    }
  })

  test('모션 감소 설정에서도 시뮬레이터 상태가 텍스트로 전달된다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/concepts/optimistic-pessimistic-lock')
    const sim = page.getByTestId('simulator')
    for (let i = 0; i < 5; i++) await sim.getByRole('button', { name: '다음 단계' }).click()
    await expect(sim.getByTestId('step-description')).toContainText('OptimisticLockException')
    await expect(sim.getByTestId('tx-B-status')).toHaveText(/버전 충돌/)
  })
})
