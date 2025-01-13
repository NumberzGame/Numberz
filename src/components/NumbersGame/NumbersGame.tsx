import { ReactNode, useState } from 'react';
import { nanoid } from 'nanoid';
// import { useLocalStorage } from '@mantine/hooks';
// import { useFetch } from '@mantine/hooks';
import { useImmer } from 'use-immer';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Center,
  Group,
  HoverCard,
  Image,
  Slider,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import {
  CustomGameID,
  Game,
  GameID,
  GameState,
  GradedGameID,
  HINT_UNDO,
  Move,
} from '../../gameCode/Classes';
import { MAX_MOVES, MAX_OPERANDS, OP_SYMBOLS } from '../../gameCode/Core';
import {
  destringifyCodeUnits,
  destringifyGame,
  destringifyGameID,
  stringifyGame,
  stringifyGameID,
} from '../../gameCode/Schema';

const overrideSymbolText = function (s: string): string {
  if (s === '//') {
    return '÷';
  }
  return s;
};

const GOAL_GRADIENT = { from: 'lime', to: 'yellow', deg: 90 };

interface HintButtonProps {
  hintsShown: boolean;
  handler: () => void;
}

export function HintButton(props: HintButtonProps) {
  if (props.hintsShown) {
    return (
      <Button variant="gradient" gradient={GOAL_GRADIENT} onClick={props.handler} key={nanoid()}>
        Hide hint
      </Button>
    );
  } 
    return <Button onClick={props.handler}>Show hint</Button>;
  
}

export interface NumbersGameProps {
  game: Game;
  onWin: () => void;
  store: (game: Game) => void;
  onQuit: () => void;
}

export function NumbersGame(props: NumbersGameProps) {
  const [game, setGameUsingImmerProducer] = useImmer(props.game);
  const [hintsShown, setHintsShown] = useState(false);

  const store = props.store;

  const setGameUsingImmerProducerAndStore = function (producer: (draft: Game) => void) {
    const produceAndStore = function (draft: Game) {
      producer(draft);
      store(draft);
    };
    setGameUsingImmerProducer(produceAndStore);
  };

  const makeOpButtonClickHandler = function (opSymbol: string): () => void {
    const opButtonClickHandler = function () {
      setGameUsingImmerProducerAndStore((draft: Game) => {
        const opIndex = OP_SYMBOLS.indexOf(opSymbol);

        const move = draft.lastMove();
        move.opIndex = opIndex === move.opIndex ? null : opIndex;
      });
    };
    return opButtonClickHandler;
  };

  const currentOperands = game.currentOperandsDisplayOrder();
  const hint = hintsShown ? game.getHints() : null;

  const SymbolsButtons = OP_SYMBOLS.map((s: string) => {
    const displayText = overrideSymbolText(s);

    let colour = 'blue';

    if (game.lastMove().opIndex !== null && s === OP_SYMBOLS[game.lastMove().opIndex!]) {
      colour = 'pink';
    } else if (hint && hint !== HINT_UNDO && hint.opSymbol() === s) {
      return (
        <Button
          variant="gradient"
          gradient={GOAL_GRADIENT}
          onClick={makeOpButtonClickHandler(s)}
          key={nanoid()}
        >
          <b>{displayText}</b>
        </Button>
      );
    }
    return (
      <Button onClick={makeOpButtonClickHandler(s)} key={nanoid()} color={colour}>
        <b>{displayText}</b>
      </Button>
    );
  });

  const makeOperandButtonClickHandler = function (val: number, operandIndex: number): () => void {
    const operandButtonClickHandler = function () {
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
          operandIndices[len - 1] = operandIndex;
        } else {
          throw new Error(
            `Move has too many operand indices: ${operandIndices}. ` +
              `Cannot have more than MAX_OPERANDS: ${MAX_OPERANDS}. ` +
              `Move: ${draft.lastMove}`
          );
        }
      });
    };
    return operandButtonClickHandler;
  };

  const OperandsButtons = currentOperands.map((val: number, index: number) => {
    const clickHandler = makeOperandButtonClickHandler(val, index);

    let colour = 'blue';

    if (game.lastMoveOperandIndices().includes(index)) {
      colour = 'pink';
    } else if (hint && hint !== HINT_UNDO && hint.operandIndices.includes(index)) {
      return (
        <Button variant="gradient" gradient={GOAL_GRADIENT} onClick={clickHandler} key={nanoid()}>
          {val}
        </Button>
      );
    }

    return (
      <Button onClick={clickHandler} key={nanoid()} color={colour}>
        {val}
      </Button>
    );
  });

  const submitButtonHandler = function () {
    // Don't submit invalid moves
    const lastMove = game.state.moves.at(-1)!;
    const result = lastMove.result(game.currentOperandsDisplayOrder());
    if (result === null) {
      return;
    }

    if (game.solved(true)) {
      props.onWin();
      // Leave stored game in localstorage alone
      // Player can resume and press submit to see
      // the win screen as many times as they like.
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
  };
  const undoButtonHandler = function () {
    setGameUsingImmerProducerAndStore((draft: Game) => {
      const moves = draft.state.moves;
      const i = moves.findLastIndex((move) => move.submitted);
      if (i >= 0) {
        // By default a new Move() is unsubmitted.
        moves.splice(i, 1);
      }
    });
  };

  const undoButton =
    hint === HINT_UNDO ? (
      <Button onClick={undoButtonHandler} variant="gradient" gradient={GOAL_GRADIENT}>
        <b>←</b>
      </Button>
    ) : (
      <Button onClick={undoButtonHandler}>
        <b>←</b>
      </Button>
    );

  const hintButtonHandler = function () {
    // Alternatively, Mantine provides useDisclosure just to handle
    // toggling booleans https://mantine.dev/hooks/use-disclosure/
    setHintsShown(!hintsShown);
  };

  return (
    <>
      <Stack h={500} justify="space-between">
        <Stack justify="flex-start" align="center">
          <Group justify="space-between" mt="md" w={400}>
            <Group>
              <Text> Grade: </Text>
              <Badge variant="filled" color="pink" size="lg">
                {game.id.grade ?? 'Impossible!'}
              </Badge>
            </Group>
            <Group>
              <Text> Make: </Text>
              <Badge variant="gradient" gradient={GOAL_GRADIENT} size="xl">
                {game.id.goal}
              </Badge>
            </Group>
          </Group>

          <Group justify="center" mt="md">
            {OperandsButtons}
          </Group>
          <Group justify="center" mt="md">
            {SymbolsButtons}
          </Group>
          <Group justify="center" mt="md">
            <Button onClick={submitButtonHandler}>
              <b>=</b>
            </Button>
            {undoButton}
          </Group>
        </Stack>
        <Stack justify="flex-end">
          <Group justify="center" mt="md">
            <HintButton handler={hintButtonHandler} hintsShown={hintsShown} />
            <Button onClick={props.onQuit}>⮾</Button>
          </Group>
        </Stack>
      </Stack>
    </>
  );
}
