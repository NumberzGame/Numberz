
import { useRef } from 'react';

import {Text, Stack, Slider } from '@mantine/core';

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

import { MakeSubByteEncoderAndDecoder,
  getBitWidthsEncodingsAndDecodings, intDecoder
 } from 'sub_byte';

import { ALL_SEEDS, SEEDS, OP_SYMBOLS } from './Core';
import { evalSolution, solutionExpr} from './solutionEvaluator';
// import * as NUM_SOLS_OF_ALL_GRADES from '../../../public/grades_goals_solutions_forms/num_sols_of_each_grade.json' with { type: "json" };
// import * as NUM_SOLS_OF_EACH_GRADE_AND_FORM from '../../../public/grades_goals_solutions_forms/num_of_sols_of_each_grade_and_form.json' with { type: "json" };

const INITIAL_GRADE = 17;


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
const [seedsBitWidths, seedsEncodings, seedsDecodings] = getBitWidthsEncodingsAndDecodings(seedsValueSets)
const [opsBitWidths, opsEncodings, opsDecodings] = getBitWidthsEncodingsAndDecodings(opsValueSets)

export function GameBoSelector() {
  const gradeObj = useRef(INITIAL_GRADE);

  const goal = 224; //
  const form = '(((2_2)_1)_1)'; //
  const { isPending, error, data, isFetching } = useQuery({
    queryKey: ['repoData'],
    queryFn: async () => {
      const grade = 22; //gradeObj.current;
      // const goal = 224; //
      // const form = '(((2_2)_1)_1)'; //
      const response = await fetch(
        `./grades_goals_solutions_forms/${grade}/${goal}/solutions_${goal}_${form}_grade_${grade}.dat`,
      )
      return await response.bytes()
    },
  });
  

  const gradeSliderHandler = function(val: number) {
    gradeObj.current = val;
  }

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

    if (evalSolution(form, seeds, opSymbols) !== goal) {
        throw new Error(`Invalid solution. Form: ${form}, seeds: ${seeds}, ops: ${opSymbols}`);
    }

    sols.push(<Text>{solutionExpr(form, seeds, opSymbols)}</Text>)
  }

  // const texts = [];
  // for (const x of dataNums) {
  //   texts.push(<Text>{x}</Text>)
  // }
  // const dataTexts = dataNums.map((x) => <Text>{x}</Text>);

  // const forms: string[] = Array.from(Object.keys(data));
  // const freqs: number[] = Array.from(Object.values(data));
  // const FormTexts = Object.entries(data).map(([k, v]: [string, any]) => (<Text>{k} : {v.toString()}</Text>));

      // <div>
      //   <h1>{data.full_name}</h1>
      //   <p>{data.description}</p>
      //   <strong>👀 {data.subscribers_count}</strong>{' '}
      //   <strong>✨ {data.stargazers_count}</strong>{' '}
      //   <strong>🍴 {data.forks_count}</strong>
      //   <div>{isFetching ? 'Updating...' : ''}</div>
      // </div>
  
  return ( <>    <Stack>
        {/* {FormTexts} */}
        {/* {texts} */}
        {sols}
      </Stack>
      <Slider
        color="blue"
        marks={[
          { value: 20, label: '20%' },
          { value: 50, label: '50%' },
          { value: 80, label: '80%' },
        ]}
      />
      </>
  )
}
