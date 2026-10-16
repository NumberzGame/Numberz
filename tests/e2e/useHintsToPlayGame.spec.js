import { test, expect } from '@playwright/test';

const readState = async (btn) => {
  return await btn.evaluate((el) => {
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

const getHintsAndApplyThem = async (page) => {
  const beforeStates = [];
  const changedButtonIndices = [];

  const beforeButtons = page.locator('button');
  await page.waitForTimeout(800);
  const beforeCount = await beforeButtons.count();
  for (let i = 0; i < beforeCount; i++) {
    const button = await beforeButtons.nth(i);
    const state = await readState(button);
    beforeStates.push({index: i, ...state});
  }


  const hintButton = await page.getByRole('button', { name: 'hint' })
  await page.waitForTimeout(100);
  await hintButton.click();

  const afterButtons = page.locator('button');
  const afterCount = await afterButtons.count();
  for (let i = 0; i < afterCount; i++) {
    const before = beforeStates[i];
    if (!before) continue;
    const button = await afterButtons.nth(i);

    const after = await readState(button);
    if (!sameState(before, after) && !after.text.includes('hint')) {
      changedButtonIndices.push(i);
    }
  }

  console.log(`Changed buttons: ${changedButtonIndices.length}, before: ${beforeStates.length}, afterCount: ${afterCount}`);

  await page.waitForTimeout(600);
  expect(changedButtonIndices.length).toBe(3);

  for (const buttonIndex of changedButtonIndices) {
    await page.locator('button').nth(buttonIndex).click();
  }
  // Hide hints manually (for now)
  await hintButton.click();
  await page.getByRole('button', { name: '=' }).click();

}

const playSingleGameFollowingHints = async (page) => {
  let dialogue = null;
  for (let i = 1; i <= 5; i++) {
    await getHintsAndApplyThem(page);
    dialogue = page.getByRole('dialog', { name: 'You are the winner!!' })
    await page.waitForTimeout(1400);
    const numDialogues = await dialogue.count();
    if (numDialogues >= 1) {
      break;
    }
  }
  const banner = dialogue.getByRole('banner');
  const xButton = banner.getByRole('button');
  // also picks up svg img in button (.nth(0))
  const img = dialogue.getByRole('img').nth(1);
  await expect(img).toHaveAttribute('src', "/fireworks-city.jpg");
  await xButton.click();
  await page.waitForTimeout(150);
}

test('captures changed buttons after an action', async ({ page }) => { 
  await page.goto('https://numberz.uk');
  
  await page.waitForTimeout(600);
  for (let gameNumber = 1; gameNumber <= 4; gameNumber++) {
    await playSingleGameFollowingHints(page);
    const slider = page.getByRole('slider');
    await slider.focus();
    await slider.press('End');
    const newRandomGameButton = page.getByRole('button', {name: 'New random game'});
    newRandomGameButton.click();
  }
});