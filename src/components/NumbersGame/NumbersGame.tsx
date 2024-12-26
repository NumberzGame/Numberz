
import { useState, ReactNode } from 'react';
// import { useLocalStorage } from '@mantine/hooks';
// import { useFetch } from '@mantine/hooks';
import { useImmer } from "use-immer";

import { Anchor, Badge, Button, Group, Text, TextInput, Image, 
         Slider, Box, HoverCard, Center } from '@mantine/core';
import { nanoid } from "nanoid";

import { MAX_OPERANDS, OP_SYMBOLS, MAX_MOVES } from '../../gameCode/Core';
import { Game, GameID, GameState, Move, HINT_UNDO, CustomGameID, GradedGameID} from '../../gameCode/Classes';
import { destringifyGameID, stringifyGameID, destringifyGame, stringifyGame, 
         destringifyCodeUnits } from '../../gameCode/Schema';

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



let storeGameInLocalStorage: (game: Game) => void;
export let loadGameFromLocalStorage: (id: GameID) => Game | null;

if (storageAvailable()) {

  storeGameInLocalStorage = function(game: Game) {
      const key = stringifyGameID(game.id);
      const val = stringifyGame(game);
      localStorage.setItem(key, val);
  }

  loadGameFromLocalStorage = function(id: GameID) {
      const key = stringifyGameID(id);

      const val = localStorage.getItem(key);

      if (val === null) {
          return null;
      }

      return destringifyGame(val, id);

  }

} else {
    storeGameInLocalStorage = (game: Game) => {};
    loadGameFromLocalStorage = (id: GameID) => null;
}


const gameFactory = function(id: GameID): Game {
  
  const state = new GameState();
  const datetime_ms = Date.now();
  let seedIndices, opIndices;
  if (id instanceof CustomGameID) {
      seedIndices = id.seedIndices;
      opIndices = null;
  } else if (id instanceof GradedGameID){
    seedIndices = [9, 11, 1, 12, 0, 0];
    opIndices = [3, 2, 1, 3, 2];
  } else {
    throw new Error(`Unsupported GameID class: ${id}`);
  }

  const game = new Game(id, datetime_ms, seedIndices, opIndices, state);
  
  // stored as a side effect.
  storeGameInLocalStorage(game);
  
  return game;
  
}

const loadGameFromLocalStorageOrCreateNew = function(id:  GameID): Game{
  return loadGameFromLocalStorage(id) ?? gameFactory(id);
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

export interface NumbersGameProps{
    game: Game
    onWin: () => ReactNode
    // onQuit: () => void
}
// Add Game Manager






export function NumbersGame(props: NumbersGameProps) {

    const [game, setGameUsingImmerProducer] = useImmer(props.game);
    const [hintsShown, setHintsShown] = useState(false);


    const setGameUsingImmerProducerAndStore = function(
        producer: (draft: Game) => void,
      ) {

        const produceAndStore = function(draft: Game) {
            producer(draft);
            storeGameInLocalStorage(draft);
        }
        setGameUsingImmerProducer(produceAndStore);
    }

    if (game.solved()) {
        return <props.onWin></props.onWin>
    }




    const makeOpButtonClickHandler = function(opSymbol: string): () => void {
      const opButtonClickHandler = function() {
        setGameUsingImmerProducerAndStore((draft: Game) => {
            const opIndex = OP_SYMBOLS.indexOf(opSymbol);
            
            const move = draft.state.moves.at(-1)!;
            move.opIndex = opIndex === move.opIndex ? null : opIndex;
        });
      }
      return opButtonClickHandler;

    }

    const currentOperands = game.currentOperandsDisplayOrder();
    const hint = hintsShown ? game.getHints() : null;

    const SymbolsButtons = OP_SYMBOLS.map((s: string) => {

      const displayText = overrideSymbolText(s);

      if (hint && hint !== HINT_UNDO && hint.opSymbol() === s) {
        return <Button 
          variant="gradient"
          gradient={GOAL_GRADIENT}
          onClick={makeOpButtonClickHandler(s)}
          key={nanoid()}
        >
          <b>{displayText}</b>
        </Button> 
      } 
      return <Button 
        onClick={makeOpButtonClickHandler(s)}
        key={nanoid()}
      >
        <b>{displayText}</b>
      </Button>
    });

    const makeOperandButtonClickHandler = function(val: number, operandIndex: number): () => void {
      const operandButtonClickHandler = function() {
        setGameUsingImmerProducerAndStore((draft: Game) => {
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
        });
      }
      return operandButtonClickHandler;
    }

    const OperandsButtons = currentOperands.map((val: number, index: number) => {

      const clickHandler = makeOperandButtonClickHandler(val, index)

      if (hint && hint !== HINT_UNDO && hint.operandIndices.includes(index)) {
        return <Button 
          variant="gradient"
          gradient={GOAL_GRADIENT}
          onClick={clickHandler}
          key={nanoid()}
        >
          {val}
        </Button> 
      } 

      return <Button 
        onClick={clickHandler}
        key={nanoid()}
      >
        {val}
      </Button>
      }
    );
    
    const submitButtonHandler = function() {
      const lastMove = game.state.moves.at(-1)!;
      
      const result = lastMove.result(game.currentOperandsDisplayOrder());

      if (result === null) {
        return;
      }

      setGameUsingImmerProducerAndStore((draft: Game) => {
          const moves = draft.state.moves;
          const lastMove = moves.at(-1)!;
          
          lastMove.submitted = true;
          if (moves.length < MAX_MOVES) {
            moves.push(new Move());
          }
      });
    }
    const undoButtonHandler = function() {
      setGameUsingImmerProducerAndStore((draft: Game) => {
          const moves = draft.state.moves;
          const i=moves.findLastIndex((move) => move.submitted);
          if (i >= 0) {
            // By default a new Move() is unsubmitted.
            moves.splice(i, 1);
          }
      });
    }

    const undoButton = (hint === HINT_UNDO ?
      <Button onClick={undoButtonHandler}
              variant="gradient"
              gradient={GOAL_GRADIENT}
      >
      <b>←</b>
      </Button> : 
      <Button onClick={undoButtonHandler}><b>←</b></Button>
    );

    const hintButtonHandler = function() {
        // Alternatively, Mantine provides useDisclosure just to handle
        // toggling booleans https://mantine.dev/hooks/use-disclosure/ 
        setHintsShown(!hintsShown);
    }


    return <>
      <Group justify="center" mt="md">
      <Text> Make: </Text>
      <Badge variant="gradient" gradient={GOAL_GRADIENT} size="xl">
        {game.id.goal}
      </Badge>

      </Group>

      <Group justify="center" mt="md">
        {OperandsButtons}
      </Group>
      <Group justify="center" mt="md">
        {SymbolsButtons}
      </Group>
      <Group justify="center" mt="md">
        <Button onClick={submitButtonHandler}>=</Button>
        {undoButton}
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