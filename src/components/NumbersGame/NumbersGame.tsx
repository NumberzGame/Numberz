


import { useLocalStorage } from '@mantine/hooks';

import { Button, Group, TextInput } from '@mantine/core';
import SYMBOLS from '../../data/symbols.json';

const overrideSymbolText = function(s: string): string {
  if (s === '//') {
    return '÷'
  }
  return s
}


export function NumbersGame() {

    // https://mantine.dev/hooks/use-local-storage/
    const [playHistory, setplayHistory] = useLocalStorage({ key: 'play-history', defaultValue: '' });

    // Schema index: 2B u15 (1 UTF-16 BMP single code units) 
    // currentGameState currentGame
    // time_stamp_first_played_mins Date.now() / 1000 / 60 min (u25 8 years from 3rd Dec 2024)
    //
    // game
    // game grade u13 (min u8 1,..,223) under current Heuristic (additional difficulty)
    // game goal u15 (min u10 100,...,999)
    // game form u10 {min u4 2, 3, 4, (2, 2), 5, (3, 2), (1, (2, 2)), 6, (4, 2), (3, 3), 
    // (2, (2, 2)), (1, (3, 2)), (1, (1, (2, 2)) },
    // game index u25, (min u20 max is grade 18 with 781176 (20 bits) non de-duped solutions
    // (index all inc forms, and figure out using JSON dict of frequencies?)
    // time_stamp_first_played_mins Date.now() / 1000 / 60
    //
    // move
    // operand one u5 (min u3 Indices: 0, 1, 2, 3, 4, 5)
    // operand two u5 (min u3)
    // op u5 (min u2, +, -, //, =)
    //
    // min: (24B, 5MB limit => 10 per day for 57 years)
    //
    //      key u35 6B (3 UTF-16 BMP single code units)   
    //                 (does storage space for keys matter if they're hashed?....
    //                  A: It does - localstorge is implemented using levelDB 
    //                     in Chrome, and sqllite in Firefox.  Both are more than 
    //                     simple hash tables.
    //                 )      
    // 
    //      grade, 1,...,228 u8
    //      goal, 100, ..., 999 u10 
    //      index, (0 to 70_000) u17 
    //      
    //      val:
    //      game u125 18B (9 UTF-16 BMP single code units)    
    //      Schema index: 2B u15 (1 ) 
    //      timestamp: u45 
    //      solved, u1
    //      seeds*6, u24 (14 seeds in normal game, 10 small (twice) 4 large)
    //        seed u4
    //      current state of this game
    //      moves*5 u40
    //        move u8
    //          Operand u3 (indices 0, 1, ..., 6)
    //          Op u2 (+, -, *, //)
    // small: (60B, 5MB limit => 10 per day for 22 years)
    //
    //      key:
    //       u60 8B (4 UTF-16 BMP single code units) 
    // 
    //      grade, 1,...,228 u15
    //      goal, 100, ..., 999 u15 
    //      index, (0 to 70_000) u30 
    //      
    //      val:
    //      game u... 52B (26 UTF-16 BMP single code units) 
    //
    //      Schema index: 2B u15 (1) 
    //      timestamp: u45       (3)
    //      solved, u15           (1)
    //      seeds*6, u85 (6) (14 seeds in normal game, 10 small (twice) 4 large)
    //        seed u4
    //      current state of this game
    //      moves*5 u225   (15)
    //        move u9
    //          Operand u3 (indices 0, 1, ..., 6)
    //          Op u2 (+, -, *, //)
    //
    // or:  game 136B (68 UTF-16 BMP single code units)   
    //      (5MB limit => 30_000, 1 a day for 100 years)
    // 
    //      timestamp: u45 6B (3 UTF-16 BMP single code units)
    //      grade, 1,...,228 2B (1)
    //      goal, 100, ..., 999 2B (1)
    //      index, (0 to 70_000) 4B (2)
    //      solved, 2B (1)
    //      seeds*20, 40B (20)
    //        seed 2B (1)
    //      state
    //
    //      moves*20 80B (40)
    //        move 4B (2)
    //          Operand 4 bits min
    //          Op 2 bits min
    // 


    const [currentGameState, setCurrentGameState] = useLocalStorage({ key: 'current-game-state', defaultValue: '' });

    const SymbolsButtons = SYMBOLS.OPS.map((s: string) => (<Button >{overrideSymbolText(s)}</Button>));

    
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
        {SymbolsButtons}
      </Group>
    </>
}