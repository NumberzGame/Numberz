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
  const beforeCount = await beforeButtons.count();
  for (let i = 0; i < beforeCount; i++) {
    const button = await beforeButtons.nth(i);
    expect(button).toBeVisible();
    const state = await readState(button);
    beforeStates.push({index: i, ...state});
  }


  const hintButton = await page.getByRole('button', { name: 'hint' })
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

  // console.log(`Changed buttons: ${changedButtonIndices.length}, before: ${beforeStates.length}, afterCount: ${afterCount}`);

  expect(changedButtonIndices.length).toBe(3);
  // seelct move
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
}

test('captures changed buttons after an action', async ({ page }) => { 
  // await page.goto('https://numberz.uk');
  await page.goto('http://localhost:8000');
  const N=3;
  for (let gameNumber = 1; gameNumber <= N; gameNumber++) {
    
    const badgeTexts = (await page.locator('.mantine-Badge-root .mantine-Badge-label').allTextContents());
    const [score, grade, pointsAvailable, goal] = badgeTexts;
    console.log(`Playing game number: ${gameNumber}/${N}. Score: ${score}, grade: ${grade}, points avail: ${pointsAvailable}, goal: ${goal}`);
    await playSingleGameFollowingHints(page);
    const slider = page.getByRole('slider');
    await slider.focus();
    await slider.press('End');
    const newRandomGameButton = await page.getByRole('button', {name: 'New random game'});
    await newRandomGameButton.click();
  }
});