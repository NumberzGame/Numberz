

import {Text, Stack } from '@mantine/core';


import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

// const queryClient = new QueryClient()



export function GameBoSelector() {
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
