import { test, expect } from '@playwright/test';


const readButtonStates = async (buttonLocators, expectedNumButtons) => {
  await expect(buttonLocators).toHaveCount(expectedNumButtons);
  const states = {};
  for (const buttonLocator of await buttonLocators.all()) {
    await expect(buttonLocator).toBeVisible();
    await buttonLocator.evaluate(async (el) => {
      const text  = await buttonLocator.textContent();
      const s = window.getComputedStyle(el);
      states[text] = {
        locator: buttonLocator,
        backgroundImage: s.backgroundImage,
        color: s.color,
        boxShadow: s.boxShadow,
      };
    });
  }
  return states;
};

const sameState = (a, b) =>
  a.backgroundImage === b.backgroundImage &&
  a.color === b.color &&
  a.boxShadow === b.boxShadow;

const getHintsAndApplyThem = async (page, moveNum) => {
  const changedButtonsLabelsAndLocators = [];

  
  // (7 - moveNum) seeds,
  // +, -, *, /, =,
  // undo move,
  // get hint,
  // end game,
  // light/dark mode
  const expectedNumButtons = 16 - moveNum;

  const buttonLocators = await page.getByRole('button');
  const initialButtonsStates = readButtonStates(buttonLocators, expectedNumButtons);



  const hintButtonLocator = beforeStates["hint"];

  try {
    await expect(hintButtonLocator).toBeVisible({ timeout: 10_000 });
  } catch (error) {
    console.error('Hint button missing');
    console.error('URL:', page.url());
    console.error('Button count:', await buttonLocators.count());
    console.error(
      'Button texts:',
      await buttonLocators.allTextContents()
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
  
  await expect(hintButtonLocator).toBeEnabled();

  await hintButtonLocator.click();

  const buttonsStatesWithHintsShown = readButtonStates(buttonLocators, expectedNumButtons);
  for (const [text, before] of Object.entries(initialButtonsStates)) {

    const after = buttonsStatesWithHintsShown[text];

    if (!sameState(before, after) && !text.includes('hint')) {
      changedButtonsLabelsAndLocators.push([text, before.locator]);
    }
  }

  console.log(`Move number: ${moveNum}, hint: ${changedButtonsLabel.map((x) => x[0])}`);

  await expect(changedButtonsLabelsAndLocators.length).toBe(3);
  
  // Hide hints manually (for now)
  await hintButtonLocator.click();

  // Select move.  Click all buttons highlighted by the hint (whose readState was changed)
  for (const [label, buttonLocator] of changedButtonsLabelsAndLocators) {
    await buttonLocator.click();
  }
  // Submit move (after following the hint)
  await initialButtonsStates['='].locator.click();

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
    
    const badges = await page.locator('.mantine-Badge-root .mantine-Badge-text');
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
