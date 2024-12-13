import { useImmer } from "use-immer";
// import { useState } from 'react';
// import { useLocalStorage } from '@mantine/hooks';
// import { useFetch } from '@mantine/hooks';

import { Button, Group, Image, TextInput } from '@mantine/core';

import { MAX_OPERANDS, OP_SYMBOLS, MAX_MOVES } from './Core';
import { Game, GameID, GameState, Move } from './Classes';
import { destringifyGameID, stringifyGameID, destringifyGame, stringifyGame, MIN_GAME_ID_SIZE } from './Schema';

const overrideSymbolText = function(s: string): string {
  if (s === '//') {
    return '÷'
  }
  return s
}

const STARTING_DIFFICULTY = 25;



function storageAvailable(type: "localStorage" | "sessionStorage" = "localStorage"): boolean {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#testing_for_availability
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return Boolean(
      e instanceof DOMException &&
      e.name === "QuotaExceededError" &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    );
  }
}

let storeGameInLocalStorage: (game: Game) => void;

if (storageAvailable()) {

    storeGameInLocalStorage = function(game: Game) {
        const key = stringifyGameID(game.id);
        const val = stringifyGame(game);
        localStorage.setItem(key, val);
    }
} else {
    storeGameInLocalStorage = (game: Game) => {};
}


export function OpButton(props: {onClick: () => void}) {
    // All Op Buttons act like radio buttons, but none can be pressed too.
    // onClick => Toggle button clicked on
    // If not clicked on the currently activated one => turn activated one off.
    // Adds Op clicked on to game.state.Moves[-1]
    return <></>
}
export function OperandButton(props: {onClick: () => void}) {
    return <></>
}

interface NumbersGameProps{
    gameID: GameID
    // onWin: () => void
    // onQuit: () => void
}
// Add Game Manager

export function NumbersGame(props: NumbersGameProps) {

    // https://mantine.dev/hooks/use-local-storage/
    const gameID = props.gameID;

    const gameFactory = function(): Game{

      const state = new GameState();
      const datetime_ms = Date.now();
      const game =  new Game(gameID, datetime_ms, [9, 11, 1, 12, 0, 0], [3, 2, 1, 3, 2], state);
      return game;
    }
    const [game, setGameUsingImmerProducer] = useImmer(gameFactory);

    if (game.solved()) {
       return <Image radius = "sm" src="https://cdn.stocksnap.io/img-thumbs/960w/fireworks-background_CPLJUAMC1T.jpg" />
    }

    // const doMove = function() {
    //     const move = new Move(0,false, [0,1]);
    //     setGameUsingImmerProducer((draft: Game) => {
    //         draft.state.moves.push(move);
    //         storeGameInLocalStorage(draft);
    //     });
    // };

    // const [current, setAndStoreCurrent] = useLocalStorage({ key: key, defaultValue: stringifyGame(game) });
    // const [pastGameIDs, setPastGameIDs] = useLocalStorage({ key: 'pastGameIDs', defaultValue: '' });
    // const [currentDifficulty,
    //        setCurrentDifficulty] = useLocalStorage({ key: 'currentDifficulty',
    //                                                  defaultValue: STARTING_DIFFICULTY.toString(),
    //                                                });



    const makeOpButtonClickHandler = function(opSymbol: string): () => void {
      const opButtonClickHandler = function() {
        setGameUsingImmerProducer((draft: Game) => {
            const opIndex = OP_SYMBOLS.indexOf(opSymbol);
            const move = draft.state.moves[-1];
            move.opIndex = opIndex === move.opIndex ? null : opIndex;
            storeGameInLocalStorage(draft);
        });
      }
      return opButtonClickHandler;

    }

    const SymbolsButtons = OP_SYMBOLS.map((s: string) => (
      <Button onClick={makeOpButtonClickHandler(s)}>
        {overrideSymbolText(s)}
      </Button>
      )
    );

    const makeOperandButtonClickHandler = function(val: number, operandIndex: number): () => void {
      const operandButtonClickHandler = function() {
        setGameUsingImmerProducer((draft: Game) => {
            const move = draft.state.moves[-1];
            const operandIndices = move.operandIndices;
            if (operandIndices.includes(operandIndex)) {
              // Unselect already selected operand
              const indexOfOperandIndex = operandIndices.indexOf(operandIndex); 
              operandIndices.splice(indexOfOperandIndex, 1);
            } else if (operandIndices.length < MAX_OPERANDS) {
              // Select new operand.
              operandIndices.push(operandIndex);
            } else if (operandIndices.length === MAX_OPERANDS) {
              // Replace last selected operand
              operandIndices[-1] = operandIndex;
            } else {
              throw new Error(`Move has too many operand indices: ${operandIndices}. `
                             +`Cannot have more than MAX_OPERANDS: ${MAX_OPERANDS}. `
                             +`Move: ${move}`
              );
            }
            storeGameInLocalStorage(draft);
        });
      }
      return operandButtonClickHandler;
    }

    const OperandsButtons = game.currentOperands().map((val: number, index: number) => (
      <Button onClick={makeOperandButtonClickHandler(val, index)}>
        {val}
      </Button>
      )
    );
    
    const submitButtonHandler = function() {
      setGameUsingImmerProducer((draft: Game) => {
          const moves = draft.state.moves;
          const lastMove = moves[-1];
          lastMove.submitted = true;
          if (moves.length < MAX_MOVES) {
            moves.push(new Move());
          }
          storeGameInLocalStorage(draft);
      });
    }


    return <>
      {/* <Text ta="center" size="lg" maw={580} mx="auto" mt="xl">
        Play the game below!!!
      </Text> */}
      {/* Text Goal */}
      <TextInput
        // label="Input label"
        ta="center" size="lg" maw={235} mx="auto" mt="md"
        // description="Input description"
        // placeholder="Input placeholder"
      />
      <Group justify="center" mt="md">
        {OperandsButtons}
      </Group>
      <Group justify="center" mt="md">
        {SymbolsButtons}
      </Group>
      <Group justify="center" mt="md">
        <Button onClick={submitButtonHandler}>=</Button>
      </Group>
    </>
}