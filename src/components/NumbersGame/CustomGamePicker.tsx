import {useImmer} from 'use-immer';
import {Button, Box, Group, Stack, SimpleGrid, TagsInput, Text} from '@mantine/core';

import {nanoid} from 'nanoid';

import { NumberInputWithDigitsKeys } from './NumberInputwithDigitsKeys';

import { SEEDS, ALL_SEEDS, MAX_SEEDS, GOAL_MIN, GOAL_MAX } from '../../gameCode/Core';
import { GameID, CustomGameID } from '../../gameCode/Classes'
import { makeCaches } from '../../gameCode/Tnetennums/Cachebuilder';
import { easiestSolution } from '../../gameCode/Tnetennums/Solver';
import { SolutionForm} from '../../gameCode/Tnetennums/Core';

const countXinArr = function<T>(X: T, Arr: T[]): number {
    return Arr.filter((y) => y === X).length;          
}


const allOfThisSeedUsed = function(seedIndex: number, seedIndices: number[]): boolean {
  const maxNumSeedsAllowed = countXinArr(SEEDS[seedIndex], ALL_SEEDS);
  return countXinArr(seedIndex, seedIndices) >= maxNumSeedsAllowed;
}

const tooManyOfThisSeedUsed = function(seedIndex: number, seedIndices: number[]): boolean {
    const maxNumSeedsAllowed = countXinArr(SEEDS[seedIndex], ALL_SEEDS);
    return countXinArr(seedIndex, seedIndices) > maxNumSeedsAllowed;
}


function stringifyForm(form: SolutionForm): string {
    return JSON.stringify(form).replace('[','(').replace(']',')');
}


interface CustomGamePickerProps {
    setCurrentGameID: (gameID: GameID) => void;

}


export function CustomGamePicker(props: CustomGamePickerProps) {


    const [newCustomGameID, setNewCustomGameIDWithImmer] = useImmer<CustomGameID>(new CustomGameID());

    const makeSeedButtonClickHandler = function(seedIndex: number): ()=>void {
        const seedButtonClickHandler = function(): void {
            setNewCustomGameIDWithImmer((draft: CustomGameID) => {
                if (!allOfThisSeedUsed(seedIndex, draft.seedIndices) && draft.seedIndices.length < MAX_SEEDS) {
                    draft.seedIndices.push(seedIndex);
                } else if (draft.seedIndices.includes(seedIndex)) {
                    // Delete seedIndex from draft.seedIndices
                    draft.seedIndices.splice(draft.seedIndices.lastIndexOf(seedIndex), 1)
                }
            });
        }
        return seedButtonClickHandler;
    }
    // const BUTTON_ORDER_SEEDS = [...SEEDS.slice(0,5),
    //                             ...SEEDS.slice(10,12),
    //                             ...SEEDS.slice(5,10),
    //                             ...SEEDS.slice(12,14),
    //                            ]

    if (newCustomGameID.seeds().length === 0) {
      makeCaches(
            newCustomGameID.seeds(),
            [newCustomGameID.goal],
            )
    }
            
    const seedButtons = SEEDS.map((seed, seedIndex) => {
        const clickHandler = makeSeedButtonClickHandler(seedIndex);
        const colour = newCustomGameID.seedIndices.includes(seedIndex) ? "pink" : "blue";
        return <Button 
                variant="filled" 
                size="compact-sm" 
                radius="xl"
                onClick={clickHandler}                           
                color={colour} 
                key = {nanoid()}
                >
                {seed}
                </Button>
    });
return         <Box>
                  <Group justify="start" >
                    <Text>Choose starting numbers and goal. </Text>
                  </Group>
                  <Group 
                    justify="space-between" 
                    gap="xs" 
                  >
                    <Stack
                      h={200}
                      w="68%"
                      maw={340}
                      align="stretch"
                      justify="flex-start"
                      gap="md"
                    >
                      <TagsInput 
                        label="Starting numbers."
                        placeholder="Enter numbers."
                        value={newCustomGameID.seedIndices.map((i) => SEEDS[i].toString())}
                        onChange={(value) => setNewCustomGameIDWithImmer(
                                    draft => {
                                        const newSeedIndices = value.map((str) => SEEDS.indexOf(parseInt(str)));
                                        if (newSeedIndices.every((index) => !tooManyOfThisSeedUsed(index, newSeedIndices))){
                                            draft.seedIndices = newSeedIndices;
                                        }
                                    }
                                 )}
                        maxTags={MAX_SEEDS}
                        mah={200}
                      />
                      <SimpleGrid cols={5}>
                        {seedButtons}
                      </SimpleGrid>
                    </Stack>
                    <Stack
                      h={200}
                      align="flex-end"
                      justify="flex-start"
                      gap="md"
                    >
                      <NumberInputWithDigitsKeys 
                        value = {newCustomGameID.goal}
                        onSet={(value) => setNewCustomGameIDWithImmer(
                                  draft => {draft.goal = value}
                              )}
                        min={GOAL_MIN}
                        max={GOAL_MAX}
                      >
                      </NumberInputWithDigitsKeys>
                      <Group justify="end" mt="xs">
                        <Button 
                          onClick={() => {
                            if (newCustomGameID.seedIndices.length === 0) {
                              return;
                            }
                            const solution = easiestSolution(
                                                    newCustomGameID.seeds(),
                                                    newCustomGameID.goal,
                                                    );
                            if (solution !== null) {
                              setNewCustomGameIDWithImmer(
                                  draft => {
                                    draft.form = stringifyForm(solution.form);
                                    draft.grade = solution.grade
                                  }
                              )
                            }
                            props.setCurrentGameID(newCustomGameID);
                            // Immer producers can also create new states 
                            // if drafts are unmodified.
                            // https://immerjs.github.io/immer/return
                            setNewCustomGameIDWithImmer((draft) => new CustomGameID());
                          }}
                        >
                        New custom game
                        </Button>
                      </Group>
                    </Stack>
                  </Group>
                  
                </Box>


}