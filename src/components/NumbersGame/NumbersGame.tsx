
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
    game: Game;
    onWin: () => void;
    store: (game: Game) => void;
    onQuit: () => void
}


export function NumbersGame(props: NumbersGameProps) {

    const [game, setGameUsingImmerProducer] = useImmer(props.game);
    const [hintsShown, setHintsShown] = useState(false);

    const store = props.store;

    const setGameUsingImmerProducerAndStore = function(
        producer: (draft: Game) => void,
      ) {

        const produceAndStore = function(draft: Game) {
            producer(draft);
            store(draft);
        }
        setGameUsingImmerProducer(produceAndStore);
    }

    if (game.solved()) {
        props.onWin()
    }




    const makeOpButtonClickHandler = function(opSymbol: string): () => void {
      const opButtonClickHandler = function() {
        setGameUsingImmerProducerAndStore((draft: Game) => {
            const opIndex = OP_SYMBOLS.indexOf(opSymbol);
            
            const move = draft.lastMove();
            move.opIndex = opIndex === move.opIndex ? null : opIndex;
        });
      }
      return opButtonClickHandler;

    }

    const currentOperands = game.currentOperandsDisplayOrder();
    const hint = hintsShown ? game.getHints() : null;

    const SymbolsButtons = OP_SYMBOLS.map((s: string) => {

      const displayText = overrideSymbolText(s);

      let colour = "blue";

      if (game.lastMove().opIndex !== null && s === OP_SYMBOLS[game.lastMove().opIndex!]) {
        colour = "pink"
      } else if (hint && hint !== HINT_UNDO && hint.opSymbol() === s) {
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
        color={colour}
      >
        <b>{displayText}</b>
      </Button>
    });

    const makeOperandButtonClickHandler = function(val: number, operandIndex: number): () => void {
      const operandButtonClickHandler = function() {
        setGameUsingImmerProducerAndStore((draft: Game) => {
            // const move = draft.state.moves.at(-1)!;
            // const operandIndices = move.operandIndices;
            const operandIndices = draft.lastMoveOperandIndices();
            
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
                             +`Move: ${draft.lastMove}`
              );
            }
        });
      }
      return operandButtonClickHandler;
    }

    const OperandsButtons = currentOperands.map((val: number, index: number) => {

      const clickHandler = makeOperandButtonClickHandler(val, index)

      let colour = "blue";

      if (game.lastMoveOperandIndices().includes(index)) {
        colour = "pink";
      } else if (hint && hint !== HINT_UNDO && hint.operandIndices.includes(index)) {
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
        color={colour}
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