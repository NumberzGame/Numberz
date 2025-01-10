import { useState } from 'react';
import { Box, Button, FileInput, Group, Select, Text } from '@mantine/core';
import { CustomGameID, Game, GameID, GameState, GradedGameID, Move } from '../../gameCode/Classes';

const formatterOptions: Intl.DateTimeFormatOptions = {
  timeStyle: 'medium',
  dateStyle: 'medium',
};
const formatter = new Intl.DateTimeFormat(navigator.language, formatterOptions);
const prettifyGame = function (game: Game): string {
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
  getStoredGames: () => IterableIterator<Game>;
  storeGame: (game: Game) => void;
  setCurrentGameID: (gameID: GameID) => void;
}

export function HistoricalGamePicker(props: historicalGamePickerProps) {
  const historicalGames = Object.fromEntries(
    Array.from(props.getStoredGames()).map((game) => [prettifyGame(game), game])
  );
  // console.log(`Goal: ${newCustomGameID.goal}, ${newCustomGameID.seedIndices.map(i => SEEDS[i])}`);
  const [historicalGameStr, setHistoricalGameStr] = useState<string | null>(
    Object.keys(historicalGames).at(-1) ?? null
  );

  return (
    <Box>
      <Group justify="start">
        <Text>Choose previously played game. </Text>
      </Group>
      <Select
        label="Game history."
        placeholder="Select game"
        data={Object.keys(historicalGames).sort(
          (a, b) => historicalGames[b].timestamp_ms - historicalGames[a].timestamp_ms
        )}
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
              Object.values(historicalGames).sort((a, b) => b.timestamp_ms - a.timestamp_ms),
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
          label="Upload game history"
          placeholder="(Warning: overwrites existing saved games with same ID)"
          onChange={async (fileBlob) => {
            if (fileBlob === null) {
              return;
            }
            const jsonString = await fileBlob.text();
            const uploadedGameData = JSON.parse(jsonString);
            for (const gameData of uploadedGameData) {
              const moves: Move[] = [];
              const stateObj = gameData?.['state'] ?? {};
              for (const moveObj of stateObj?.['moves'] ?? []) {
                const move = new Move(
                  moveObj?.['opIndex'] ?? null,
                  moveObj?.['submitted'] ?? false,
                  moveObj?.['operandIndices'] ?? []
                );
                moves.push(move);
              }
              const state = new GameState(stateObj['solved'], moves);
              let id: GameID;
              const idData = gameData['id'];
              const goal = idData['goal'];
              if ('seedIndices' in idData) {
                id = new CustomGameID(goal, idData['seedIndices']);
              } else if ('grade' in idData && 'form' in idData && 'index' in idData) {
                id = new GradedGameID(
                  idData['grade'],
                  idData['goal'],
                  idData['form'],
                  idData['index']
                );
              } else {
                throw new Error(`Could not form GameID from: ${idData}`);
              }
              const game = new Game(
                id,
                gameData['timestamp_ms'],
                gameData['seedIndices'],
                gameData['opIndices'],
                state,
                gameData['redHerrings'],
                gameData['seedsDisplayOrder']
              );
              props.storeGame(game);
            }
          }}
        />
      </Group>

      <Group justify="end" mt="sm">
        <Button
          onClick={() => {
            if (historicalGameStr !== null && historicalGameStr in historicalGames) {
              props.setCurrentGameID(historicalGames[historicalGameStr].id);
            }
          }}
        >
          Resume game
        </Button>
      </Group>
    </Box>
  );
}
