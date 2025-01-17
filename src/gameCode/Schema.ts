import { CustomGameID, Game, GameID, GameState, GradedGameID, Move } from './Classes';
import {
  FORMS,
  MAX_MOVES,
  MAX_OPERANDS,
  MAX_OPS,
  MAX_SEEDS,
  OP_SYMBOLS,
  SEEDS,
  takeNextN,
} from './Core';

const SCHEMA_CODE = 'S';
export const CHUNK_SIZE = 15; // bits

const MAX_U15 = (1 << CHUNK_SIZE) - 1; //32767, 0b111111111111111 === 0x7fff
// highest number of bits that don't
// need any bits that indicate a
// surrogate (0xd800 - 0xdfff).

const NO_SEED = 0xd7ff; // 0xd7ff is the max single code unit BMP code
// point (before surrogate range).
export const NO_OP = 0xd7fe; // These cannot be u15s as 0xd7fd needs 16 bits
const NO_OPERAND = 0xd7fd; // (0xd7fd > 0x7fff == 0b11111111111111)
const NO_MOVE = 0xd7fc;
const GRADED_GAME_ID_PADDING = 0xd7fb;
const NO_FORM = 0xd7fa;
const NO_GRADE = 0xd7f9;

const GRADED_GAME_ID_MIN_SIZE = 8;
const CUSTOM_GAME_ID_MIN_SIZE = 8;
export const MIN_GAME_SIZE = 26;

const fitsIn_u15 = function (x: number): boolean {
  return x >= 0 && x <= MAX_U15;
};

export const checkFitsInChunk = function (x: number) {
  if (!fitsIn_u15(x)) {
    throw new Error(
      `An internal error occurred. Number must be >= 0 and <= ${MAX_U15}.  Got: ${x}`
    );
  }
};

export const chunkify = function (x: number, num_chunks: number): number[] {
  // Split the bits of x into num_chunks * bit strings, each of length CHUNK_SIZE
  // JS converts numbers to signed 32 bit integers,
  // and has >> as well as >>>.  This function
  // supports larger unsigned integers using bit strings.
  const chunks = [];
  const targetLengthBits = num_chunks * CHUNK_SIZE;
  const minNumBits = x.toString(2).length;

  if (minNumBits > targetLengthBits) {
    throw new Error(
      `Number: ${x} is too large ` +
        `to fit into ${num_chunks} x ${CHUNK_SIZE}-bit chunks.  ` +
        `${Math.ceil(minNumBits / CHUNK_SIZE)} chunks are needed. `
    );
  }

  const bits = x.toString(2).padStart(targetLengthBits, '0');

  for (let i = 0; i < targetLengthBits; i += CHUNK_SIZE) {
    const chunk = parseInt(bits.slice(i, i + CHUNK_SIZE), 2);
    checkFitsInChunk(chunk);
    chunks.push(chunk);
  }
  return chunks;
};

export const deChunkify = function (chunks: number[]): number {
  const num_chunks = chunks.length;
  return chunks.map((x, i) => x * 2 ** (CHUNK_SIZE * (num_chunks - 1 - i))).reduce((a, c) => a + c);
};

export const stringifyCodeUnits = function (codeUnits: Iterable<number>): string {
  let retval = '';
  for (const codeUnit of codeUnits) {
    // Don't mistakenly yield surrogate-pairs. Use UTF-16 code-unit charCodes.
    retval = retval.concat(String.fromCharCode(codeUnit));
  }
  return retval;
};

export const destringifyCodeUnits = function* (s: string): IterableIterator<number> {
  for (let i = 0; i < s.length; i++) {
    // Don't mistakenly yield code-points, use UTF-16 code-unit charCodes.
    // if a surrogate ends up in there,
    // Other error checking code should find it.
    yield s.charCodeAt(i);
  }
};

const makeTakeNextNDestringified = function (
  s: string
): [() => number, (N: number) => IterableIterator<number>] {
  const codeUnitsIterator = destringifyCodeUnits(s);
  const takeNextNDestringified = function* (N: number): IterableIterator<number> {
    const errorMessage =
      `codeUnitsIterator exhausted. ` +
      `s=${s} too short for required number of calls/iterations. ` +
      `latest N=${N}`;
    yield* takeNextN(N, codeUnitsIterator, errorMessage);
  };
  const next = () => takeNextNDestringified(1).next().value;
  return [next, takeNextNDestringified];
};

const seedsFromDestringified = function* (
  destringified: Iterable<number>
): IterableIterator<number> {
  for (const seedIndex of destringified) {
    if (seedIndex === NO_SEED) {
      continue;
    } else if (seedIndex >= 0 && seedIndex < SEEDS.length) {
      yield seedIndex;
    } else {
      throw new Error(
        `Unrecognised seed index: ${seedIndex}. ` +
          `Must be between 0 and ${SEEDS.length - 1}, ` +
          `or ===NO_SEED code ${NO_SEED}`
      );
    }
  }
};

const destringifyGradedGameID = function (key: string): GradedGameID {
  if (key.length < GRADED_GAME_ID_MIN_SIZE) {
    throw new Error(
      `Need ${GRADED_GAME_ID_MIN_SIZE} code-units to stringify a GradedGameID. ` +
        `Got: ${key.length}, key=${key}`
    );
  }

  const [next, takeNextN] = makeTakeNextNDestringified(key);

  const type_code = GradedGameID.GAME_ID_TYPE_CODE; // "G"
  if (next() !== type_code.charCodeAt(0)) {
    throw new Error(`Incorrect GameID-type-flag.  Must be ${type_code}.  Got: ${key[0]}`);
  }

  const grade = next();
  const goal = next();
  const form_index = next();
  const form = FORMS[form_index];
  // const index_top_15_bits = key.charCodeAt(3);
  // const index_bottom_15_bits = key.charCodeAt(4)
  // Less than 32-bits total so this works using JS native operators
  const index = deChunkify([next(), next()]);

  // Make sure two badding code-units present
  for (const codeUnit of takeNextN(2)) {
    if (codeUnit !== GRADED_GAME_ID_PADDING) {
      throw new Error(
        `Invalid padding code-unit.  Expected:  ${takeNextN(MAX_SEEDS)}.  Got ${codeUnit}`
      );
    }
  }

  return new GradedGameID(grade, goal, form, index);
};

const destringifyCustomGameID = function (key: string): CustomGameID {
  // ["C".charCodeAt(0), gameID.goal, ...gameID.seedIndices]

  if (key.length < CUSTOM_GAME_ID_MIN_SIZE) {
    throw new Error(
      `Need ${CUSTOM_GAME_ID_MIN_SIZE} code-units to stringify a CustomGameID. ` +
        `Got: ${key.length}, key=${key}`
    );
  }

  const [next, takeNextN] = makeTakeNextNDestringified(key);

  const type_code = CustomGameID.GAME_ID_TYPE_CODE; // "C"
  if (next() !== type_code.charCodeAt(0)) {
    throw new Error(`Incorrect GameID-type-flag.  Must be ${type_code}.  Got: ${key[0]}`);
  }

  const goal = next();

  const seedIndices = Array.from(seedsFromDestringified(takeNextN(MAX_SEEDS)));

  let grade: number | null = next();
  grade = grade === NO_GRADE ? null : grade;
  const formIndex = next();
  const form = formIndex === NO_FORM ? null : FORMS[formIndex];

  return new CustomGameID(goal, seedIndices, grade, form);
};

export const getStringifiedGameIDClass = function (
  stringified: string
): typeof GradedGameID | typeof CustomGameID {
  const gameIDTypeCode = stringified[0]
  switch (gameIDTypeCode) {
    case GradedGameID.GAME_ID_TYPE_CODE:
      return GradedGameID;
    case CustomGameID.GAME_ID_TYPE_CODE:
      return CustomGameID;
    default:
      throw new Error(`GameID type code: ${gameIDTypeCode} not supported.  `
                     +`Must be  in [${GradedGameID.GAME_ID_TYPE_CODE},${CustomGameID.GAME_ID_TYPE_CODE}].  `
                     +`Stringified: ${stringified}`
      );
  }
};

export const destringifyGameID = function (stringified: string): GameID {
  switch (getStringifiedGameIDClass(stringified)) {
    case GradedGameID:
      return destringifyGradedGameID(stringified);
    case CustomGameID:
      return destringifyCustomGameID(stringified);
  }
  throw new Error(` getStringifiedGameIDClass("${stringified}") should've errored. `);
};

export function stringifyGameID(gameID: GradedGameID): string;
export function stringifyGameID(gameID: CustomGameID): string;
export function stringifyGameID(gameID: GradedGameID | CustomGameID): string;
export function stringifyGameID(gameID: GradedGameID | CustomGameID): string {
  let keyData: number[];
  let formIndex: number;

  if (gameID.typeCode === GradedGameID.GAME_ID_TYPE_CODE) {
    const gradedGameID = gameID as GradedGameID;
    checkFitsInChunk(gradedGameID.grade!);
    checkFitsInChunk(gradedGameID.goal);

    formIndex = FORMS.indexOf(gradedGameID.form!);
    checkFitsInChunk(formIndex);

    keyData = [
      GradedGameID.GAME_ID_TYPE_CODE.charCodeAt(0),
      gradedGameID.grade,
      gradedGameID.goal,
      formIndex,
      ...chunkify(gradedGameID.index, 2),
      GRADED_GAME_ID_PADDING,
      GRADED_GAME_ID_PADDING,
    ];
    //index_top_15_bits, index_bottom_15_bits];
  } else if (gameID.typeCode === CustomGameID.GAME_ID_TYPE_CODE) {
    const customGameID = gameID as CustomGameID;

    checkFitsInChunk(customGameID.goal);
    customGameID.seedIndices.forEach(checkFitsInChunk);

    const checkedPaddedSeedIndices = checkItemsFitAndPadIterable(
      customGameID.seedIndices,
      MAX_SEEDS,
      NO_SEED
    );

    formIndex = customGameID.form === null ? NO_FORM : FORMS.indexOf(customGameID.form);

    keyData = [
      CustomGameID.GAME_ID_TYPE_CODE.charCodeAt(0),
      customGameID.goal,
      ...checkedPaddedSeedIndices,
      customGameID.grade ?? NO_GRADE,
      formIndex,
    ];
  } else {
    throw new Error(`Unsupported gameID type: ${gameID}`);
  }

  return stringifyCodeUnits(keyData);
}

export const destringifyGame = function (s: string, id: GameID): Game {
  if (s[0] !== SCHEMA_CODE) {
    throw new Error(`Incorrect Schema code.  Must be: ${SCHEMA_CODE}.  Got: ${s[0]}`);
  }

  if (s.length < MIN_GAME_SIZE) {
    throw new Error(`Need ${MIN_GAME_SIZE} code-units to encode a Game.  Got: ${s.length}, s=${s}`);
  }

  const [next, takeNextN] = makeTakeNextNDestringified(s);

  // Skip schema code (e.g. "S")
  next();

  const timeStamp = deChunkify([next(), next(), next()]);

  const solved_num = next();

  if (![0, 1].includes(solved_num)) {
    throw new Error(`Incorrect solved_num value.  Must be 0 or 1.  Got: ${solved_num}`);
  }

  const solved = solved_num === 1;

  const seedIndices = Array.from(seedsFromDestringified(takeNextN(MAX_SEEDS)));

  const opIndices = [];

  for (const opIndex of takeNextN(MAX_OPS)) {
    if (opIndex === NO_OP) {
      continue;
    } else if (opIndex >= 0 && opIndex <= SEEDS.length) {
      opIndices.push(opIndex);
    } else {
      throw new Error(
        `Unrecognised seed index: ${opIndex}. ` +
          `Must be between 0 and ${SEEDS.length - 1}, ` +
          `or ===NO_SEED code ${NO_SEED}`
      );
    }
  }

  const moves = [];

  for (const opIndex of takeNextN(MAX_MOVES)) {
    const submitted = next() === 1;
    const operandIndices = [];
    for (const operandIndex of takeNextN(MAX_OPERANDS)) {
      if (operandIndex === NO_OPERAND) {
        continue;
      } else if (operandIndex >= 0 && operandIndex < MAX_SEEDS) {
        operandIndices.push(operandIndex);
      } else {
        throw new Error(
          `Unrecognised operand index: ${operandIndex}. ` +
            `Must be between 0 and ${MAX_SEEDS - 1} inc, ` +
            `or ===NO_OPERAND code ${NO_OPERAND}`
        );
      }
    }
    let move;
    if (opIndex === NO_MOVE) {
      continue;
    } else if (opIndex === NO_OP) {
      move = new Move(null, submitted, operandIndices);
    } else if (opIndex >= 0 && opIndex < OP_SYMBOLS.length) {
      move = new Move(opIndex, submitted, operandIndices);
    } else {
      throw new Error(
        `Unrecognised op index: ${opIndex}. ` +
          `Must be between 0 and ${OP_SYMBOLS.length - 1} inc, ` +
          `or ===NO_OP code ${NO_OP}`
      );
    }
    moves.push(move);
  }

  const redHerrings = [];
  for (const seedIndex of takeNextN(MAX_SEEDS)) {
    if (seedIndex === NO_SEED) {
      continue;
    } else if (seedIndex >= 0 && seedIndex < SEEDS.length) {
      redHerrings.push(seedIndex);
    } else {
      throw new Error(
        `Unsupported seed index: ${seedIndex}. ` +
          `Must be between 0 and ${SEEDS.length - 1}, ` +
          `or ===NO_SEED code ${NO_SEED}`
      );
    }
  }

  const seedsDisplayOrder = [];
  for (const indexOfIndex of takeNextN(MAX_SEEDS)) {
    if (indexOfIndex === NO_SEED) {
      continue;
    } else if (indexOfIndex >= 0 && indexOfIndex < MAX_SEEDS) {
      seedsDisplayOrder.push(indexOfIndex);
    } else {
      throw new Error(
        `Unsupported index: ${indexOfIndex}. ` +
          `Must be between 0 and ${MAX_SEEDS - 1}, ` +
          `or ===NO_SEED code ${NO_SEED}`
      );
    }
  }

  const state = new GameState(solved, moves);
  const game = new Game(
    id,
    timeStamp,
    seedIndices,
    opIndices,
    state,
    redHerrings,
    seedsDisplayOrder
  );

  return game;
};

// export const destringifyGame = function(stringified: string, id: GameID): Game {
//     const GameIDClass = getStringifiedGameIDClass(stringified);

// }

function* checkAndPadIterable<T>(
  it: Iterable<T>,
  paddedLen: number,
  fillValue: T,
  checker: ((item: T) => void) | null = null
): IterableIterator<T> {
  let i = 0;

  for (const item of it) {
    if (checker) {
      checker(item);
    }
    yield item;
    i++;
  }

  for (; i < paddedLen; i++) {
    yield fillValue;
  }
}

export const checkItemsFitAndPadIterable = function* (
  it: Iterable<number>,
  paddedLen: number,
  fillValue: number
): IterableIterator<number> {
  const items = checkAndPadIterable(it, paddedLen, fillValue, checkFitsInChunk);
  for (const item of items) {
    yield item;
  }
};


function* moveDataCodeUnits(moves: Move[]): IterableIterator<number> {
    const movesPadValue = new Move(NO_MOVE, false, Array(MAX_OPERANDS).fill(NO_OPERAND));
    
    for (const move of checkAndPadIterable(moves, MAX_MOVES, movesPadValue)) {
      yield move.opIndex ?? NO_OP;
      yield move.submitted ? 1 : 0;
      const operandIndices = checkAndPadIterable(move.operandIndices, MAX_OPERANDS, NO_OPERAND);
      for (const operandIndex of operandIndices) {
        if (operandIndex !== NO_OPERAND) {
          checkFitsInChunk(operandIndex);
        }
        yield operandIndex;
      }
    }
}


export const gameDataCodeUnits = function* (game: Game): IterableIterator<number> {
  for (const chunk of chunkify(game.timestamp_ms, 3)) {
    yield chunk;
  }

  const solved_num = game.state.solved === true ? 1 : 0;
  yield solved_num;

  for (const seedIndex of checkItemsFitAndPadIterable(game.seedIndices, MAX_SEEDS, NO_SEED)) {
    yield seedIndex;
  }

  for (const opIndex of checkItemsFitAndPadIterable(game.opIndices ?? [], MAX_OPS, NO_OP)) {
    yield opIndex;
  }


  yield* moveDataCodeUnits(game.state.moves);

  for (const seedIndex of checkItemsFitAndPadIterable(game.redHerrings, MAX_SEEDS, NO_SEED)) {
    yield seedIndex;
  }

  for (const seedIndex of checkItemsFitAndPadIterable(game.seedsDisplayOrder, MAX_SEEDS, NO_SEED)) {
    yield seedIndex;
  }
};

export const stringifyGame = function (game: Game): string {
  const val = SCHEMA_CODE;

  return val.concat(stringifyCodeUnits(Array.from(gameDataCodeUnits(game))));
};
