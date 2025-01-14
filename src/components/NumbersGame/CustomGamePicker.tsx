import { nanoid } from 'nanoid';
import { useImmer } from 'use-immer';
import { Box, Button, Group, SimpleGrid, Stack, TagsInput, Text } from '@mantine/core';
import { CustomGameID, GameID } from '../../gameCode/Classes';
import { ALL_SEEDS, GOAL_MAX, GOAL_MIN, MAX_SEEDS, SEEDS } from '../../gameCode/Core';
import { makeCaches } from '../../gameCode/Tnetennums/Cachebuilder';
import { NumberInputWithDigitsKeys, ButtonData } from './NumberInputwithDigitsKeys';

const countXinArr = function <T>(X: T, Arr: T[]): number {
  return Arr.filter((y) => y === X).length;
};

const allOfThisSeedUsed = function (seedIndex: number, seedIndices: number[]): boolean {
  const maxNumSeedsAllowed = countXinArr(SEEDS[seedIndex], ALL_SEEDS);
  return countXinArr(seedIndex, seedIndices) >= maxNumSeedsAllowed;
};

const tooManyOfThisSeedUsed = function (seedIndex: number, seedIndices: number[]): boolean {
  const maxNumSeedsAllowed = countXinArr(SEEDS[seedIndex], ALL_SEEDS);
  return countXinArr(seedIndex, seedIndices) > maxNumSeedsAllowed;
};

interface CustomGamePickerProps {
  setCurrentGameID: (gameID: GameID) => void;
}


const goalInputPopOverDigitButtons = new Array(10).fill(undefined).map((i) => new ButtonData(i));


export function CustomGamePicker(props: CustomGamePickerProps) {
  const [newCustomGameID, setNewCustomGameIDWithImmer] = useImmer<CustomGameID>(new CustomGameID());

  const makeSeedButtonClickHandler = function (seedIndex: number): () => void {
    const seedButtonClickHandler = function (): void {
      setNewCustomGameIDWithImmer((draft: CustomGameID) => {
        if (
          !allOfThisSeedUsed(seedIndex, draft.seedIndices) &&
          draft.seedIndices.length < MAX_SEEDS
        ) {
          draft.seedIndices.push(seedIndex);
        } else if (draft.seedIndices.includes(seedIndex)) {
          // Delete seedIndex from draft.seedIndices
          draft.seedIndices.splice(draft.seedIndices.lastIndexOf(seedIndex), 1);
        }
      });
    };
    return seedButtonClickHandler;
  };
  // const BUTTON_ORDER_SEEDS = [...SEEDS.slice(0,5),
  //                             ...SEEDS.slice(10,12),
  //                             ...SEEDS.slice(5,10),
  //                             ...SEEDS.slice(12,14),
  //                            ]

  if (newCustomGameID.seeds().length >= 2) {
    makeCaches(newCustomGameID.seeds(), [newCustomGameID.goal]);
  }

  const seedButtons = SEEDS.map((seed, seedIndex) => {
    const clickHandler = makeSeedButtonClickHandler(seedIndex);
    const colour = newCustomGameID.seedIndices.includes(seedIndex) ? 'pink' : 'blue';
    return (
      <Button
        variant="filled"
        size="compact-sm"
        radius="xl"
        onClick={clickHandler}
        color={colour}
        key={nanoid()}
      >
        {seed}
      </Button>
    );
  });

  function seedTagsInputOnChange(value: string[]): void {
    return setNewCustomGameIDWithImmer((draft) => {
      const newSeedIndices = value.map((str) => SEEDS.indexOf(parseInt(str, 10)));
      if (newSeedIndices.every((index) => !tooManyOfThisSeedUsed(index, newSeedIndices))) {
        draft.seedIndices = newSeedIndices;
      }
    });
  }

  function newGameClickHandler(): void {
    if (newCustomGameID.seedIndices.length === 0) {
      return;
    }
    // const solution = easiestSolution(
    //                         newCustomGameID.seeds(),
    //                         newCustomGameID.goal,
    //                         );

    // const form  = solution === null ? null : stringifyForm(solution.form);
    // const grade = solution === null ? null : solution.grade;
    // setNewCustomGameIDWithImmer(
    //     draft => {
    //       draft.form = form;
    //       draft.grade = grade;
    //     }
    // )
    props.setCurrentGameID(newCustomGameID);
    // Immer producers can also create new states
    // if drafts are unmodified.
    // https://immerjs.github.io/immer/return

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setNewCustomGameIDWithImmer((draft) => new CustomGameID());
  }

  return (
    <Box>
      <Group justify="start">
        <Text>Choose starting numbers and goal. </Text>
      </Group>
      <Group justify="space-between" gap="xs">
        <Stack h={200} w="68%" maw={340} align="stretch" justify="flex-start" gap="md">
          <TagsInput
            label="Starting numbers."
            placeholder="Enter numbers."
            value={newCustomGameID.seedIndices.map((i) => SEEDS[i].toString())}
            onChange={seedTagsInputOnChange}
            maxTags={MAX_SEEDS}
            mah={200}
          />
          <SimpleGrid cols={5}>{seedButtons}</SimpleGrid>
        </Stack>
        <Stack h={200} align="flex-end" justify="flex-start" gap="md">
          <NumberInputWithDigitsKeys
            initialValue={newCustomGameID.goal}
            onSet={(value) =>
              setNewCustomGameIDWithImmer((draft) => {
                draft.goal = value;
              })
            }
            min={GOAL_MIN}
            max={GOAL_MAX}
            buttonData={goalInputPopOverDigitButtons}
          />
          <Group justify="end" mt="xs">
            <Button onClick={newGameClickHandler}>New custom game</Button>
          </Group>
        </Stack>
      </Group>
    </Box>
  );
}
