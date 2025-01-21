import { useState } from 'react';
import { Button, Group, Slider, Text } from '@mantine/core';

import classes from './RandomGameOfGivenGradePicker.module.css';


interface gradeSliderProps {
  initialValue: number;
  onChangeEnd: (val: number) => void;
  onClick: () => void;
  max: number;
  min: number
  highestKnownGrade: number;
}

export function RandomGameOfGivenGradePicker(props: gradeSliderProps) {
  const [grade, setGrade] = useState(props.initialValue);
  const label= grade < 100 ? `Grade: ${grade}` : `Beast mode!  Grade: ${grade}`
  const highestKnownGrade = props.highestKnownGrade;
  const max = Math.min(props.max, highestKnownGrade);
  const maxWidth = 590;
  const min = props.min;
  const activeSliderWidth = Math.ceil(maxWidth * (max-min)/(highestKnownGrade-min));
  const inactiveSliderWidth = maxWidth - activeSliderWidth;
  const inactiveSliderMarks = inactiveSliderWidth >= 14 ?
      [{ value: highestKnownGrade, label: `${highestKnownGrade}` }] :
      [];
  
  return (
    <>
      <Group justify="start">
        <Text>Choose difficulty (higher levels available at higher scores). </Text>
      </Group>
      <Group maw={maxWidth} justify="space-between" grow gap={0}>
      <Slider
        color="violet"
        label={label}
        thumbSize={14}
        value={grade}
        min={min}
        max={max}
        marks={[
          { value: 1, label: '1' },
          //   // { value: 20, label: '20%' },
          //   // { value: 50, label: '50%' },
          //   // { value: 80, label: '80%' },
          { value: max, label: `${max}` },
        ]}
        // mt = {15}
        maw={activeSliderWidth}
        onChange={setGrade}
        onChangeEnd={props.onChangeEnd}
        classNames={classes}
      />
      {max < highestKnownGrade && <Slider
        label={label}
        min={max}
        max={highestKnownGrade}
        marks={inactiveSliderMarks}
        // mt = {15}
        maw={inactiveSliderWidth}
        disabled={true}
        classNames={classes}
        style={{opacity: 0.6}}
      />}
      </Group>
      <Group justify="end" mt="xl">
        <Button onClick={props.onClick}>New random game</Button>
      </Group>
    </>
  );
}
