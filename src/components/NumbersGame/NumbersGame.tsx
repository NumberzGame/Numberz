import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useImmer } from 'use-immer';

import { useMediaQuery } from '@mantine/hooks';
import { Badge, Button, Group, Stack, Text, Space } from '@mantine/core';

import {ScoreAndGradeBadge} from './ScoreAndGradeBadge';
import { Layout } from './Layout';

import { Game, HINT_UNDO, } from '../../gameCode/Classes';
import { MAX_OPERANDS, OP_SYMBOLS } from '../../gameCode/Core';

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


export class GameCallbacks{

  readonly onWin: () => void;
  readonly store: (game: Game) => void;
  readonly onQuit: () => void;

  constructor(
    onWin: () => void,
    store: (game: Game) => void,
    onQuit: () => void,
  ) {
      this.onWin = onWin;
      this.store = store;
      this.onQuit = onQuit;
  }
}


export interface NumbersGameProps {
  score: number;
  game: Game;
  callBacks: GameCallbacks;
}

export function NumbersGame(props: NumbersGameProps) {
  const isTooSmall = useMediaQuery(`(max-width: 440px)`);
  const [game, setGameUsingImmerProducer] = useImmer<Game>(props.game);
  const [hintsShown, setHintsShown] = useState(false);

  const store = props.callBacks.store;

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

        const move = draft.state.currentMove;
        move.opIndex = opIndex === move.opIndex ? null : opIndex;
      });
    };
    return opButtonClickHandler;
  };

  const currentOperands = game.currentOperandsDisplayOrder();
  const hint = hintsShown ? game.state.getHint() : null;

  const SymbolsButtons = OP_SYMBOLS.map((s: string) => {
    const displayText = overrideSymbolText(s);

    let colour = 'blue';

    if (game.state.currentMove.opIndex !== null && s === OP_SYMBOLS[game.state.currentMove.opIndex!]) {
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

  const makeOperandButtonClickHandler = function (_val: number, operandIndex: number): () => void {
    const operandButtonClickHandler = function () {
      setGameUsingImmerProducerAndStore((draft: Game) => {
        // const move = draft.state.submittedMoves.at(-1)!;
        // const operandIndices = move.operandIndices;
        const operandIndices = draft.state.currentMove.operandIndices;

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
              `Move: ${draft.state.currentMove}`
          );
        }
      });
    };
    return operandButtonClickHandler;
  };

  const OperandsButtons = currentOperands.map((val: number, index: number) => {
    const clickHandler = makeOperandButtonClickHandler(val, index);

    let colour = 'blue';

    if (game.state.currentMove.operandIndices.includes(index)) {
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
    const currentMove = game.state.currentMove;
    const result = currentMove.result(game.currentOperandsDisplayOrder());
    if (result === null) {
      return;
    }

    if (game.solved(true)) {
      props.callBacks.onWin();
      // Leave stored game in localstorage alone
      // Player can resume and press submit to see
      // the win screen as many times as they like.
      return;
    }

    setGameUsingImmerProducerAndStore((draft: Game) => {
        draft.state.submitLatestMove();
    });
  };
  const undoButtonHandler = function () {
    setGameUsingImmerProducerAndStore((draft: Game) => {
        draft.state.undoLastSubmittedMove();
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
    if (!hintsShown) {
      setGameUsingImmerProducerAndStore((draft) => draft.addHint());
    }
    setHintsShown(!hintsShown);
  };

  return (
    <Layout score = {props.score} pointsAvailable = {game.getPoints()}>
      <Stack align="center">
        <Stack justify="flex-start" align="center">
          <Group justify="space-between" mt="md" w="100%">
            <Group>
              <Text> Grade: </Text>
              <ScoreAndGradeBadge contents={game.id.grade ?? 'Impossible!'}/>
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
              =
            </Button>
            {undoButton}
          </Group>
        </Stack>      
        {!isTooSmall && <Space h="md" />}
        <Group justify="center" mt="md">
          <HintButton handler={hintButtonHandler} hintsShown={hintsShown} />
          <Button onClick={props.callBacks.onQuit}>⮾</Button>
        </Group>
      </Stack>
    </Layout>
  );
}
