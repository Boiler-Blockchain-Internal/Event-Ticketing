import { expect, test } from '@playwright/test'

test('attendee claims a pass and sees a rotating QR', async ({ page }) => {
  await page.goto('/#/redeem')
  await expect(page.getByRole('heading', { name: /Claim your pass/ })).toBeVisible()
  await page.getByRole('button', { name: /Claim this pass/ }).click()
  await expect(page).toHaveURL(/#\/tickets/)
  await expect(page.getByText('EVENT TICKET')).toBeVisible()
  await expect(page.getByRole('img', { name: /refreshes every 30 seconds/ })).toBeVisible()
  await expect(page.getByText(/New code in/)).toBeVisible()
})

test('door staff get green, amber and red results', async ({ page }) => {
  await page.goto('/#/scan')
  const result = page.locator('.scan-result')
  const scan = async () => {
    await page.getByRole('button', { name: 'Simulate scan' }).click()
    await expect(result).toBeVisible()
    const text = await result.innerText()
    await page.getByRole('button', { name: 'Scan next' }).click()
    return text
  }
  expect(await scan()).toMatch(/Admit/)
  expect(await scan()).toMatch(/Admit/)
  expect(await scan()).toMatch(/Already checked in[\s\S]*First scanned at/)
  expect(await scan()).toMatch(/Do not admit[\s\S]*Revoked/)
  expect(await scan()).toMatch(/different event/)
  expect(await scan()).toMatch(/expired/)
  await expect(page.locator('.scan-result.green, .scan-result.amber, .scan-result.red')).toHaveCount(0)
})

test('organizer creates an event and gets claim and door links', async ({ page }) => {
  await page.goto('/#/admin')
  await page.getByLabel('Event name').fill('Spring Kickoff')
  await expect(page.getByLabel(/Event ID/)).toHaveValue('spring-kickoff')
  await page.getByLabel('Capacity').fill('150')
  await page.getByRole('button', { name: /Create event/ }).click()
  await expect(page.getByText('Event created')).toBeVisible()
  await expect(page.getByText(/#\/redeem\?e=spring-kickoff/)).toBeVisible()
  await expect(page.getByText(/#\/scan\?t=/)).toBeVisible()
})
