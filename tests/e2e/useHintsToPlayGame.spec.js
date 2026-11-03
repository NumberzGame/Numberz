import { test, expect } from '@playwright/test';

const readState = async (btns, i) => {
  const button = await btns.nth(i);
  await expect(button).toBeVisible();
  return await button.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return {
      text: el.innerText.trim(),
      backgroundImage: s.backgroundImage,
      color: s.color,
      boxShadow: s.boxShadow,
    };
  });
};

const sameState = (a, b) =>
  a.text === b.text &&
  a.backgroundImage === b.backgroundImage &&
  a.color === b.color &&
  a.boxShadow === b.boxShadow;

const getHintsAndApplyThem = async (page, moveNum) => {
  const beforeStates = [];
  const changedButtonIndexedStates = [];

  const beforeButtons = await page.getByRole('button');
  const beforeCount = await beforeButtons.count();
  for (let i = 0; i < beforeCount; i++) {
    const state = await readState(beforeButtons, i);
    beforeStates.push({index: i, ...state});
  }


  const hintButton = await page.getByRole('button', { name: 'hint' })

  try {
    await expect(hintButton).toBeVisible({ timeout: 10_000 });
  } catch (error) {
    console.error('Hint button missing');
    console.error('URL:', page.url());
    console.error('Button count:', await page.getByRole('button').count());
    console.error(
      'Button labels:',
      await page.getByRole('button').allTextContents()
    );
    console.error(
      'Page title:',
      await page.title()
    );

    await page.screenshot({
      path: 'playwright-report/hint-button-missing.png',
      fullPage: true,
    });

    throw error;
  }
  
  await expect(hintButton).toBeVisible();
  await expect(hintButton).toBeEnabled();

  await hintButton.click();

  const afterButtons = page.getByRole('button');
  const afterCount = await afterButtons.count();
  for (let i = 0; i < afterCount; i++) {
    const before = beforeStates[i];
    if (!before) continue;

    const after = await readState(afterButtons, i);

    if (!sameState(before, after) && !after.text.includes('hint')) {
      changedButtonIndexedStates.push([i, before]);
    }
  }

  console.log(`Move number: ${moveNum}, hint: ${changedButtonIndexedStates.map((x) => x[1].text)}`);

  await expect(changedButtonIndexedStates.length).toBe(3);
  
  // Hide hints manually (for now)
  await hintButton.click();

  // Select move.  Click all buttons highlighted by the hint (whose readState was changed)
  for (const [buttonIndex, state] of changedButtonIndexedStates) {
    await page.getByRole('button').nth(buttonIndex).click();
  }
  // Submit move (after following the hint)
  await page.getByRole('button', { name: '=' }).click();

}

const playSingleGameFollowingHints = async (page) => {
  let dialogue = null;
  const buttons = await page.getByRole('button');
  await expect(buttons).toHaveCount(15); // 6 seeds, 6 ops, hint, end, & light/dark mode

  for (let i = 1; i <= 5; i++) {
    await getHintsAndApplyThem(page, i);
    dialogue = page.getByRole('dialog', { name: 'You are the winner!!' })
    const numDialogues = await dialogue.count();
    if (numDialogues >= 1) {
      break;
    }
  }
  await expect(dialogue).toBeVisible();

  const banner = dialogue.getByRole('banner');
  await expect(banner).toBeVisible();

  const xButton = banner.getByRole('button');
  await expect(xButton).toBeVisible();
  // also picks up svg img in button (.nth(0))
  const img = dialogue.getByRole('img').nth(1);
  await expect(img).toBeVisible();

  await expect(img).toHaveAttribute('src', "/fireworks-city.jpg");
  await xButton.click();
  
  dialogue = page.getByRole('dialog', { name: 'You are the winner!!' })
  await expect(dialogue).toHaveCount(0);
}


test('captures changed buttons after an action', async ({ page }) => {
  page.on('pageerror', error => {
    console.error('Browser page error:', error);
  });

  page.on('console', message => {
    if (message.type() === 'error') {
      console.error('Browser console error:', message.text());
    }
  });
  await page.goto('http://localhost:8000');
  const N=7;
  for (let gameNumber = 1; gameNumber <= N; gameNumber++) {
    
    const badges = await page.locator('.mantine-Badge-root .mantine-Badge-label');
    await expect(badges).toHaveCount(4);
    const [score, grade, pointsAvailable, goal] = await badges.allTextContents();
    console.log(`Playing game number: ${gameNumber}/${N}. Score: ${score}, grade: ${grade}, points avail: ${pointsAvailable}, goal: ${goal}`);

    await playSingleGameFollowingHints(page);
    const slider = page.getByRole('slider');
    await slider.focus();
    await slider.press('End');
    const newRandomGameButton = await page.getByRole('button', {name: 'New random game'});
    await newRandomGameButton.click();
  }
});
