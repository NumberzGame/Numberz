
import { useState } from 'react';
// import { useLocalStorage } from '@mantine/hooks';
// import { useFetch } from '@mantine/hooks';
import { useImmer } from "use-immer";

import { Anchor, Badge, Button, Group, Text, TextInput, Image, 
         Slider, Box, HoverCard, Center } from '@mantine/core';
import { nanoid } from "nanoid";

import { MAX_OPERANDS, OP_SYMBOLS, MAX_MOVES } from './Core';
import { Game, GameID, GameState, Move } from './Classes';
import { destringifyGameID, stringifyGameID, destringifyGame, stringifyGame, 
         MIN_GAME_ID_SIZE, destringifyCodeUnits } from './Schema';

const overrideSymbolText = function(s: string): string {
  if (s === '//') {
    return '÷';
  }
  return s;
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


const gameFactory = function(id: GameID): Game{

  const state = new GameState();
  const datetime_ms = Date.now();
  const game = new Game(id, datetime_ms, [9, 11, 1, 12, 0, 0], [3, 2, 1, 3, 2], state);
  storeGameInLocalStorage(game);
  return game;
}


let storeGameInLocalStorage: (game: Game) => void;
let loadGameFromLocalStorageOrCreateNew: (id: GameID) => Game;

if (storageAvailable()) {

  storeGameInLocalStorage = function(game: Game) {
      const key = stringifyGameID(game.id);
      const val = stringifyGame(game);
      localStorage.setItem(key, val);
  }

  loadGameFromLocalStorageOrCreateNew = function(id: GameID) {
      const key = stringifyGameID(id);

      const val = localStorage.getItem(key);

      if (!val) {
          const game = gameFactory(id);
          storeGameInLocalStorage(game);
          return game;
      }

      return destringifyGame(val, id);

  }

} else {
    storeGameInLocalStorage = (game: Game) => {};
    loadGameFromLocalStorageOrCreateNew = gameFactory;
}

const GOAL_GRADIENT = { from: 'lime', to: 'yellow', deg: 90 };

interface HintButtonProps{
  hintsShown: boolean
  handler: () => void
}

export function HintButton(props: HintButtonProps) {
  if (props.hintsShown) {
    return <Button 
    variant="gradient"
    gradient={GOAL_GRADIENT}
    onClick={props.handler}
    key={nanoid()}
  >
    Hide hint
  </Button> 
  } else {
    return <Button onClick={props.handler}>Show hint</Button>
  }

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

    // A trivial closure.  useImmer will only
    // call callback-factory functions with no args. 
    const loadOrCreateNewGame = function() {
        return loadGameFromLocalStorageOrCreateNew(gameID);
    }

    const [game, setGameUsingImmerProducer] = useImmer(loadOrCreateNewGame);
    const [hintsShown, setHintsShown] = useState(false);

    if (false && game.solved()) {
        // CC0 https://stocksnap.io/photo/fireworks-background-CPLJUAMC1T
        // Photographer credit: https://stocksnap.io/author/travelphotographer
        return <>
                <Center mt="md">
                <Text size="lg">
                  You are the winner!!
                </Text>
                </Center>
                <Group justify="center" mt="md">
                  <HoverCard shadow="md" openDelay={4000}>
                    <HoverCard.Target>
                      <Image
                      h={500}
                      w="auto"
                      src="./fireworks-background_CPLJUAMC1T.jpg"
                      radius="lg"
                    ></Image>
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <Anchor href="https://stocksnap.io/author/travelphotographer"
                              size="sm"
                              c="violet">Photo credit: "TravelPhotographer"</Anchor>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </Group>
        </>
    }




    const makeOpButtonClickHandler = function(opSymbol: string): () => void {
      const opButtonClickHandler = function() {
        setGameUsingImmerProducer((draft: Game) => {
            const opIndex = OP_SYMBOLS.indexOf(opSymbol);
            
            const move = draft.state.moves.at(-1)!;
            move.opIndex = opIndex === move.opIndex ? null : opIndex;
            storeGameInLocalStorage(draft);
        });
      }
      return opButtonClickHandler;

    }

    const SymbolsButtons = OP_SYMBOLS.map((s: string) => {
      if (hintsShown && true) {
      return <Button 
        variant="gradient"
        gradient={GOAL_GRADIENT}
        onClick={makeOpButtonClickHandler(s)}
        key={nanoid()}
      >
        {overrideSymbolText(s)}
      </Button> 
      } 
      return <Button 
        onClick={makeOpButtonClickHandler(s)}
        key={nanoid()}
      >
        {overrideSymbolText(s)}
      </Button>
    });

    const makeOperandButtonClickHandler = function(val: number, operandIndex: number): () => void {
      const operandButtonClickHandler = function() {
        setGameUsingImmerProducer((draft: Game) => {
            const move = draft.state.moves.at(-1)!;
            const operandIndices = move.operandIndices;
            const len = operandIndices.length;
            if (operandIndices.includes(operandIndex)) {
              // Unselect already selected operand
              const indexOfOperandIndex = operandIndices.indexOf(operandIndex); 
              operandIndices.splice(indexOfOperandIndex, 1);
            } else if (len < MAX_OPERANDS) {
              // Select new operand.
              operandIndices.push(operandIndex);
            } else if (len === MAX_OPERANDS) {
              // Replace last selected operand
              operandIndices[len-1] = operandIndex;
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

    const OperandsButtons = game.currentOperandsDisplayOrder().map((val: number, index: number) => (
      <Button 
        onClick={makeOperandButtonClickHandler(val, index)}
        key={nanoid()}
      >
        {val}
      </Button>
      )
    );
    
    const submitButtonHandler = function() {
      const lastMove = game.state.moves.at(-1)!;
      
      const result = lastMove.result(game.currentOperandsDisplayOrder());

      if (result === null) {
        return;
      }

      setGameUsingImmerProducer((draft: Game) => {
          const moves = draft.state.moves;
          const lastMove = moves.at(-1)!;
          
          lastMove.submitted = true;
          if (moves.length < MAX_MOVES) {
            moves.push(new Move());
          }
          storeGameInLocalStorage(draft);
      });
    }
    const undoButtonHandler = function() {
      setGameUsingImmerProducer((draft: Game) => {
          const moves = draft.state.moves;
          const i=moves.findLastIndex((move) => move.submitted);
          if (i >= 0) {
            // By default a new Move() is unsubmitted.
            moves.splice(i, 1);
          }
          storeGameInLocalStorage(draft);
      });
    }

    const hintButtonHandler = function() {
        setHintsShown(!hintsShown);
    }


    return <>
      {/* <Text ta="center" size="lg" maw={580} mx="auto" mt="xl">
        Play the game below!!!
      </Text> */}
      {/* Text Goal */}
      <Group justify="center" mt="md">
      <Text> Make: </Text>
      <Badge variant="gradient" gradient={GOAL_GRADIENT} size="xl">
        {gameID.goal}
      </Badge>

      </Group>
      {/* <Group justify="center" mt="md">
      <TextInput
        // label="Input label"
        ta="center" size="lg" maw={235} mx="auto" mt="md"
        // description="Input description"
        // placeholder="Input placeholder"
      />
      </Group> */}
      <Group justify="center" mt="md">
        {OperandsButtons}
      </Group>
      <Group justify="center" mt="md">
        {SymbolsButtons}
      </Group>
      <Group justify="center" mt="md">
        <Button onClick={submitButtonHandler}>=</Button>
        <Button onClick={undoButtonHandler}>←</Button>
        <HintButton handler={hintButtonHandler} hintsShown={hintsShown}></HintButton>
      </Group>
      {/* <Group justify="center" mt="md">
        <Button onClick={}>Custom Game</Button>
        <Button onClick={}>Solve Game</Button>
        <Button onClick={}>Load Game</Button>
        <Button onClick={}>New Game</Button> *
        <Slider>Difficulty</Slider>
      </Group> */}
      {/* <Group justify="center" mt="md">
        <Button onClick={}>Download Game History Game</Button>
        <Button onClick={}>Load Game History Game</Button>
      </Group> */}
    </>
}