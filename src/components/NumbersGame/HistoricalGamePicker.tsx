import { useState } from 'react';
import { Box, Button, FileInput, Group, Select, Text } from '@mantine/core';
import { CustomGameID, Game, GameID, GameState, GradedGameID, Move } from '../../gameCode/Classes';

const formatterOptions: Intl.DateTimeFormatOptions = {
  timeStyle: 'medium',
  dateStyle: 'medium',
};
const formatter = new Intl.DateTimeFormat(navigator.language, formatterOptions);


export const niceGameSummaryStr = function (game: Game): string {
  const id: GradedGameID | CustomGameID = game.id;
  const description = id instanceof GradedGameID ? `Grade: ${id.grade}` : 'Custom';
  return (
    `${formatter.format(new Date(game.timestamp_ms))}. ${description}. ` +
    `Numbers: ${game
      .seedsAndDecoys()
      .map((x) => x.toString())
      .join(', ')}.  ` +
    `Goal: ${game.id.goal}. `
  );
};

interface historicalGamePickerProps {
  storeGame: (game: Game) => void;
  setCurrentGameID: (gameID: GameID) => void;
  historicalGames: Record<string, Game>;
}

export function HistoricalGamePicker(props: historicalGamePickerProps) {

  const mostRecentHistoricalGameSummaryStr = function() {
      return Object.keys(props.historicalGames).at(-1) ?? null
  }
  const [historicalGameStr, setHistoricalGameStr] = useState<string | null>(
    mostRecentHistoricalGameSummaryStr
  );

  return (
    <Box>
      <Group justify="start">
        <Text>Choose previously played game. </Text>
      </Group>
      <Select
        label="Game history."
        placeholder="Select game"
        data={Object.keys(props.historicalGames)}
        value={historicalGameStr}
        onChange={setHistoricalGameStr}
        withScrollArea={false}
        styles={{ dropdown: { maxHeight: 200, overflowY: 'auto' } }}
        mt="xs"
      />
      <Group justify="space-between">
        <Button
          mt="md"
          component="a"
          href={`data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(
              Object.values(props.historicalGames),
              null,
              4
            )
          )}`}
          download="numberz_game_history.json"
        >
          Download game history.
        </Button>
        <FileInput
          aria-label="Upload game history"
          accept="text/json"
          label="Load game history (into the browser's local storage)"
          placeholder="(Warning: overwrites existing saved games with same ID)"
          onChange={async (fileBlob) => {
            if (fileBlob === null) {
              return;
            }
            const jsonString = await fileBlob.text();
            const uploadedGameData = JSON.parse(jsonString);
            let gameSummaryStr: string | null = null;
            for (const gameData of uploadedGameData) {
              const moves: Move[] = [];
              const stateObj = gameData?.state ?? {};
              for (const moveObj of stateObj?.moves ?? []) {
                const move = new Move(
                  moveObj?.opIndex ?? null,
                  moveObj?.operandIndices ?? [],
                  moveObj?.submitted ?? false,
                );
                moves.push(move);
              }
              const hints: Move[] = [];
              for (const hintObj of stateObj?.moves ?? []) {
                const hint = new Move(
                  hintObj?.opIndex ?? null,
                  hintObj?.operandIndices ?? [],
                  hintObj?.submitted ?? false,
                );
                hints.push(hint);
              }
              const state = new GameState(stateObj.solved, moves, hints);
              let id: GameID;
              const idData = gameData.id;
              const goal = idData.goal;
              if ('seedIndices' in idData) {
                id = new CustomGameID(goal, idData.seedIndices);
              } else if ('grade' in idData && 'form' in idData && 'index' in idData) {
                id = new GradedGameID(idData.grade, idData.goal, idData.form, idData.index);
              } else {
                throw new Error(`Could not form GameID from: ${idData}`);
              }
              const game = new Game(
                id,
                gameData.timestamp_ms,
                gameData.seedIndices,
                gameData.opIndices,
                state,
                gameData.redHerrings,
                gameData.seedsDisplayOrder
              );
              props.storeGame(game);
              gameSummaryStr ??= niceGameSummaryStr(game);
            }
            if (gameSummaryStr !== null) {
                setHistoricalGameStr(gameSummaryStr);
            }
          }}
        />
      </Group>

      <Group justify="end" mt="sm">
        <Button
          onClick={() => {
            if (historicalGameStr !== null && historicalGameStr in props.historicalGames) {
              props.setCurrentGameID(props.historicalGames[historicalGameStr].id);
            }
          }}
        >
          Resume game
        </Button>
      </Group>
    </Box>
  );
}
