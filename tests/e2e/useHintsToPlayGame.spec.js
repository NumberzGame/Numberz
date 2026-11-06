import { test, expect } from '@playwright/test';


const getButtonsInfo = async (page, expectedNumButtons) => {
  const buttonLocators = page.getByRole('button');
  await expect(buttonLocators).toHaveCount(expectedNumButtons);
  const states = {};
  for (let i=0; i < expectedNumButtons; i++) {
    const buttonLocator = await buttonLocators.nth(i);
    await expect(buttonLocator).toBeVisible();
    const text = await buttonLocator.textContent();
    const buttonInfo = await buttonLocator.evaluate(async (el) => {
      const s = window.getComputedStyle(el);
      return {
        label: el.innerText,
        backgroundImage: s.backgroundImage,
        color: s.color,
        boxShadow: s.boxShadow,
      };
    });
    states[i] = {
      locator: buttonLocator,
      ...buttonInfo,
    };
  }
  return states;
};

const sameState = (a, b) =>
  a.backgroundImage === b.backgroundImage &&
  a.color === b.color &&
  a.boxShadow === b.boxShadow;

const getHintsAndApplyThem = async (page, moveNum) => {
  const changedButtonsInfo = [];

  
  // (7 - moveNum) seeds,
  // +, -, *, /, =,
  // undo move,
  // get hint,
  // end game,
  // light/dark mode
  const expectedNumButtons = 16 - moveNum;

  let initialButtonsInfo;

  try {
    initialButtonsInfo =
      await getButtonsInfo(page, expectedNumButtons);
  } catch (error) {
    console.error('FAILED TO GET INITIAL BUTTONS');
    console.error('Move number:', moveNum);
    console.error('URL:', page.url());
    console.error('Title:', await page.title());

    console.error(
      'Accessible buttons:',
      await page.getByRole('button').allTextContents()
    );

    console.error(
      'Actual HTML buttons:',
      await page.locator('button').count()
    );

    console.error(
      'Elements with button role:',
      await page.locator('[role="button"]').count()
    );

    console.error(
      'Body text:',
      await page.locator('body').innerText()
    );

    await page.screenshot({
      path: `playwright-screenshots/button-failure-move-${moveNum}.png`,
      fullPage: true
    });

    throw error;
  }


  const hintButtonLocator = await page.getByRole('button', {name: 'hint',});

  try {
    await expect(hintButtonLocator).toBeVisible({ timeout: 10_000 });
  } catch (error) {
    console.error('Hint button missing');
    console.error('URL:', page.url());
    console.error('Button count:', await page.getByRole('button').count());
    console.error(
      'Button texts:',
      await page.getByRole('button').allTextContents()
    );
    console.error(
      'Page title:',
      await page.title()
    );

    await page.screenshot({
      path: 'playwright-screenshots/hint-button-missing.png',
      fullPage: true,
    });

    throw error;
  }
  
  await expect(hintButtonLocator).toBeEnabled();

  await hintButtonLocator.click();

  const buttonsInfoWithHints = await getButtonsInfo(page, expectedNumButtons);
  for (const [i, before] of Object.entries(initialButtonsInfo)) {

    const after = buttonsInfoWithHints[i];
    
    if (!sameState(before, after) && !before.label.includes('hint')) {
      changedButtonsInfo.push(before);
    }
  }

  console.log(`Move number: ${moveNum}, hint: ${changedButtonsInfo.map((state) => state.label)}`);

  await expect(changedButtonsInfo.length).toBe(3);
  
  // Hide hints manually (for now)
  await hintButtonLocator.click();

  // Select move.  Click all buttons highlighted by the hint (whose readState was changed)
  for (const buttonInfo of changedButtonsInfo) {
    await buttonInfo.locator.click();
  }
  // Submit move (after following the hint)
  
  const submitMoveButtonLocator = await page.getByRole('button', {name: '=',});
  await submitMoveButtonLocator.click();

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

  const img = dialogue.getByRole('img').nth(1);
  // also picks up svg img in button (.nth(0))
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute('src', "/fireworks-city.jpg");

  const banner = dialogue.getByRole('banner');
  await expect(banner).toBeVisible();

  const xButton = banner.getByRole('button');
  await expect(xButton).toBeVisible();
  await expect(xButton).toBeEnabled();
  await xButton.click();

  // await page.waitForTimeout(2000);

    // Wait for the win-screen dialog to disappear.
  await expect(dialogue).toBeHidden();

  // Wait for the modal overlay to be removed.
  await expect(
    page.locator('.mantine-Modal-overlay')
  ).toBeHidden();

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
  const N=45;
  for (let gameNumber = 1; gameNumber <= N; gameNumber++) {
    
    const badges = await page.locator('.mantine-Badge-root');
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
