import { useState } from 'react';
import { Button, Group, Slider, Text } from '@mantine/core';

import classes from './RandomGameOfGivenGradePicker.module.css';

const ACTIVE_SLIDER_GRADIENT = { from: 'violet', to: 'red', deg: 90 };

interface gradeSliderProps {
  initialValue: number;
  onChangeEnd: (val: number) => void;
  onClick: () => void;
  max: number;
}

export function RandomGameOfGivenGradePicker(props: gradeSliderProps) {
  const [grade, setGrade] = useState(props.initialValue);
  const label= grade < 100 ? `Grade: ${grade}` : `Beast mode!  Grade: ${grade}`
  const maxWidth = 590;
  const MIN = 1;
  const activeSliderWidth = Math.ceil(maxWidth * (props.max-MIN)/(246-MIN));
  const inactiveSliderWidth = maxWidth - activeSliderWidth;
  return (
    <>
      <Group justify="start">
        <Text>Choose difficulty (higher difficulties available with higher scores). </Text>
      </Group>
      <Group maw={maxWidth} justify="space-between" grow gap={0}>
      <Slider
        color="violet"
        label={label}
        thumbSize={14}
        value={grade}
        min={MIN}
        max={props.max}
        marks={[
          { value: 1, label: '1' },
          //   // { value: 20, label: '20%' },
          //   // { value: 50, label: '50%' },
          //   // { value: 80, label: '80%' },
          { value: props.max, label: `${props.max}` },
        ]}
        // mt = {15}
        maw={activeSliderWidth}
        onChange={setGrade}
        onChangeEnd={props.onChangeEnd}
        classNames={classes}
      />
      <Slider
        label={label}
        min={props.max}
        max={246}
        marks={[
          //   // { value: 20, label: '20%' },
          //   // { value: 50, label: '50%' },
          //   // { value: 80, label: '80%' },
          { value: 246, label: '246' },
        ]}
        // mt = {15}
        maw={inactiveSliderWidth}
        disabled={true}
        classNames={classes}
        style={{opacity: 0.6}}
      />
      </Group>
      <Group justify="end" mt="xl">
        <Button onClick={props.onClick}>New random game</Button>
      </Group>
    </>
  );
}
