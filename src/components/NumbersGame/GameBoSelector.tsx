

import {Text, Stack } from '@mantine/core';

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

import { MakeSubByteEncoderAndDecoder,
  getBitWidthsEncodingsAndDecodings, intDecoder
 } from 'sub_byte';

import { ALL_SEEDS, SEEDS, OP_SYMBOLS } from './Core';


export function JSONSelector() {
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: ['repoData'],
    queryFn: async () => {
      const response = await fetch(
        './grades_goals_solutions_forms/22/distribution.json',
      )
      return await response.json()
    },
  })

  if (isPending) {
    return 'Loading game...';
  }

  if (error) {
    return 'An error has occurred: ' + error.message;
  }
  
  if (isFetching) {
    return 'Fetching game... ';
  }

  const forms: string[] = Array.from(Object.keys(data));
  const freqs: number[] = Array.from(Object.values(data));
  const FormTexts = Object.entries(data).map(([k, v]: [string, any]) => (<Text>{k} : {v.toString()}</Text>));

  return (
      // <div>
      //   <h1>{data.full_name}</h1>
      //   <p>{data.description}</p>
      //   <strong>👀 {data.subscribers_count}</strong>{' '}
      //   <strong>✨ {data.stargazers_count}</strong>{' '}
      //   <strong>🍴 {data.forks_count}</strong>
      //   <div>{isFetching ? 'Updating...' : ''}</div>
      // </div>
      <Stack>
        {FormTexts}
      </Stack>
  )
}

// const [encodeOps,
//        decodeOps,
//        opsBitWidths,
//        opsEncodings,
//        opsDecodings,
// ] = MakeSubByteEncoderAndDecoder([OP_SYMBOLS]);

// const [encodeSeeds,
//        decodeSeeds,
//        seedsBitWidths,
//        seedsEncodings,
//        seedsDecodings,
// ] = MakeSubByteEncoderAndDecoder([ALL_SEEDS]);

const seedsValueSets = [ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS, ALL_SEEDS];
const opsValueSets= [OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, OP_SYMBOLS, ];
// const valueSets = [,...seedsValueSets,...opsValueSets];

// const [encoder,
//        decoder,
//        bitWidths,
//        encodings,
//        decodings,
// ] = MakeSubByteEncoderAndDecoder<(string | number)>(valueSets);

// const [bitWidths, encodings, decodings] = getBitWidthsEncodingsAndDecodings<(string | number)>(valueSets)
const [seedsBitWidths, seedsEncodings, seedsDecodings] = getBitWidthsEncodingsAndDecodings<(string | number)>(seedsValueSets)
const [opsBitWidths, opsEncodings, opsDecodings] = getBitWidthsEncodingsAndDecodings<(string | number)>(opsValueSets)

export function GameBoSelector() {
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: ['repoData'],
    queryFn: async () => {
      const response = await fetch(
        './grades_goals_solutions_forms/22/224/solutions_224_(((2_2)_1)_1)_grade_22.dat',
      )
      return await response.bytes()
    },
  })

  if (isPending) {
    return 'Loading game...';
  }

  if (error) {
    return 'An error has occurred: ' + error.message;
  }
  
  if (isFetching) {
    return 'Fetching game... ';
  }

  const dataNums = Uint8Array.from(data);

  const dataIterator = dataNums[Symbol.iterator]() as IterableIterator<number>;

  const sols = [];
  while (true) {
    // num seeds (6) and num ops (5) are 
    // determined by the form above (((2_2)_1)_1)
    // const seeds = Array.from(decoder(dataIterator, 6));
    // const opSymbols = Array.from(decoder(dataIterator, 5));
    const seeds = Array.from(intDecoder(dataIterator, 6, seedsBitWidths)).map(x => SEEDS[x]);
    const opSymbols = Array.from(intDecoder(dataIterator, 5, opsBitWidths)).map(x => OP_SYMBOLS[x]);
    // const opSymbols = Array.from(decoder(dataIterator, 5));
    if (seeds.length < 6 ) { //|| opSymbols.length < 5) {
      break;
    }
    sols.push(<Text>Seeds: {seeds.join(', ')}.  Ops: {opSymbols.join(', ')}</Text>)
  }

  // const texts = [];
  // for (const x of dataNums) {
  //   texts.push(<Text>{x}</Text>)
  // }
  // const dataTexts = dataNums.map((x) => <Text>{x}</Text>);

  // const forms: string[] = Array.from(Object.keys(data));
  // const freqs: number[] = Array.from(Object.values(data));
  // const FormTexts = Object.entries(data).map(([k, v]: [string, any]) => (<Text>{k} : {v.toString()}</Text>));

  return (
      // <div>
      //   <h1>{data.full_name}</h1>
      //   <p>{data.description}</p>
      //   <strong>👀 {data.subscribers_count}</strong>{' '}
      //   <strong>✨ {data.stargazers_count}</strong>{' '}
      //   <strong>🍴 {data.forks_count}</strong>
      //   <div>{isFetching ? 'Updating...' : ''}</div>
      // </div>
      <Stack>
        {/* {FormTexts} */}
        {/* {texts} */}
        {sols}
      </Stack>
  )
}
