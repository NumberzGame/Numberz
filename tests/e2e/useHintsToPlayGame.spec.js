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

const getHintsAndApplyThem = async (page) => {
  const beforeStates = [];
  const changedButtonIndices = [];

  const beforeButtons = page.locator('button');
  const beforeCount = await beforeButtons.count();
  for (let i = 0; i < beforeCount; i++) {
    const state = await readState(beforeButtons, i);
    beforeStates.push({index: i, ...state});
  }


  const hintButton = await page.getByRole('button', { name: 'hint' })
  await hintButton.click();

  const afterButtons = page.locator('button');
  const afterCount = await afterButtons.count();
  for (let i = 0; i < afterCount; i++) {
    const before = beforeStates[i];
    if (!before) continue;

    const after = await readState(afterButtons, i);

    if (!sameState(before, after) && !after.text.includes('hint')) {
      changedButtonIndices.push(i);
    }
  }

  // console.log(`Changed buttons: ${changedButtonIndices.length}, before: ${beforeStates.length}, afterCount: ${afterCount}`);

  await expect(changedButtonIndices.length).toBe(3);
  // Select move.  Click all buttons highlighted by the hint (whose readState was changed)
  for (const buttonIndex of changedButtonIndices) {
    await page.locator('button').nth(buttonIndex).click();
  }
  // Hide hints manually (for now)
  await hintButton.click();
  // Submit move (after following the hint)
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
}


test('captures changed buttons after an action', async ({ page }) => { 
  // await page.goto('https://numberz.uk');
  await page.goto('http://localhost:8000');
  const N=3;
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