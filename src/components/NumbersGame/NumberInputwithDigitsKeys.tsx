import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Button, NumberInput, Popover, SimpleGrid } from '@mantine/core';
import { useDisclosure, useFocusWithin, useClickOutside } from '@mantine/hooks';
import { useHotkeys } from '@mantine/hooks';


export class ButtonData {
    value: number;
    glyph: string;
    constructor(value: number, glyph?: string, radix?: number) {
        this.value = value;
        this.glyph = glyph ?? value.toString(radix ?? 10);
    }
}


interface NumberInputWithDigitsKeysProps {
  initialValue: number;
  buttonData: ButtonData[];
  onSet: (value: number) => void;
  min: number;
  max: number;
  radix?: number;
  numCols?: number;
}

export function NumberInputWithDigitsKeys(props: NumberInputWithDigitsKeysProps) {
  
  const [opened, { open, close }] = useDisclosure(false);
  const clickOutsideRef = useClickOutside(close);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ref, focused } = useFocusWithin({ onFocus: open });
  const [value, setValueThisState] = useState<string | number>(props.initialValue);

  const radix = props.radix ?? 10;
  const numCols = props.numCols ?? 3;

  useHotkeys([
    ["Enter", close],
  ]);

  const setValue = function (value: string | number): void {
    setValueThisState(value);
    if (typeof value === 'number') {
      props.onSet(value);
    }
  };

  const makeDigitButtonClickHandler = function (i: number) {
    const digitButtonClickHandler = function (): void {
      if (typeof value === 'string') {
        setValue(`${value}${i}`);
      } else if (typeof value === 'number') {
        setValue(radix * value + i);
      } else {
        throw new Error(
          `Value: ${value} must be a number or a string. Got type: ${typeof value}`
        );
      }
    };
    return digitButtonClickHandler;
  };

  const deleteButtonClickHandler = function (): void {
    if (typeof value === 'string') {
      setValue(value.slice(0, -1));
    } else if (typeof value === 'number') {
      setValue(Math.floor(value / radix));
    } else {
      throw new Error(
        `Value: ${value} must be a number or a string. Got type: ${typeof value}`
      );
    }
  };

  const buttons = props.buttonData.map((data) => (
      <Button variant="transparent" key={nanoid()} onClick={makeDigitButtonClickHandler(data.value)}>
        {data.glyph}
      </Button>
    ));
  buttons.push(
    <Button variant="transparent" onClick={deleteButtonClickHandler} key={nanoid()}>
      ←
    </Button>
  );
  buttons.push(
    <Button variant="transparent" onClick={close} aria-label="Close Popover" key={nanoid()}>
      X
    </Button>
  );
  return (
    <Popover 
     opened={opened}
     >
      <Popover.Target
      >
        <NumberInput
          label="Goal: "
          value={value}
          onChange={setValue}
          min={props.min}
          max={props.max}
          maw={300}
          ref={ref}
          onKeyDown={(event) => { event.key === 'Enter' && close() }} 
        />
      </Popover.Target>
      <Popover.Dropdown
       ref={clickOutsideRef}>
        <SimpleGrid cols={numCols}>{buttons}</SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}
