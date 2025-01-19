import { useState } from 'react';
import { Button, Group, Slider, Text } from '@mantine/core';

interface gradeSliderProps {
  initialValue: number;
  onChangeEnd: (val: number) => void;
  onClick: () => void;
  max: number;
}

export function RandomGameOfGivenGradePicker(props: gradeSliderProps) {
  const [grade, setGrade] = useState(props.initialValue);
  return (
    <>
      <Group justify="start">
        <Text>Choose difficulty. </Text>
      </Group>
      <Slider
        label={grade <= 100 ? `${grade}` : `Beast mode!  Grade: ${grade}`}
        value={grade}
        min={1}
        max={props.max}
        marks={[
          { value: 1, label: '1' },
          //   // { value: 20, label: '20%' },
          //   // { value: 50, label: '50%' },
          //   // { value: 80, label: '80%' },
          { value: 246, label: '246' },
        ]}
        // mt = {15}
        maw={590}
        onChange={setGrade}
        onChangeEnd={props.onChangeEnd}
      />
      <Group justify="end" mt="xl">
        <Button onClick={props.onClick}>New random game</Button>
      </Group>
    </>
  );
}
