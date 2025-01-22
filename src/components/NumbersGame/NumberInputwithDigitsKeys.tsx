import { ReactElement, useState } from 'react';
import { nanoid } from 'nanoid';
import { Button, NumberInput, Popover, SimpleGrid } from '@mantine/core';
import { useClickOutside, useDisclosure, useFocusWithin, useHotkeys } from '@mantine/hooks';

export type Value = number | string;

export interface NumberInputPopOverButtonsProps {
  value: Value;
  setValue: (value: Value) => void;
  close: () => void;
  radix?: number;
}

function defaultNumberInputPopOverButtons(props: NumberInputPopOverButtonsProps) {
  const value = props.value;
  const setValue = props.setValue;
  const close = props.close;
  const radix = props.radix ?? 10;

  const makeDigitButtonClickHandler = function (i: number) {
    const digitButtonClickHandler = function (): void {
      if (typeof value === 'string') {
        setValue(`${value}${i}`);
      } else if (typeof value === 'number') {
        setValue(radix * value + i);
      } else {
        throw new Error(`Value: ${value} must be a number or a string. Got type: ${typeof value}`);
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
      throw new Error(`Value: ${value} must be a number or a string. Got type: ${typeof value}`);
    }
  };

  const buttons = new Array(10).fill(undefined).map((_x, i) => (
    <Button variant="transparent" key={nanoid()} onClick={makeDigitButtonClickHandler(i)}>
      {i}
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

  return buttons;
}

interface NumberInputWithDigitsKeysProps {
  initialValue: Value;
  onSet: (value: number) => void;
  min: number;
  max: number;
  renderButtons?: () => ReactElement<NumberInputPopOverButtonsProps>;
  numCols?: number;
}

export function NumberInputWithDigitsKeys(props: NumberInputWithDigitsKeysProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const clickOutsideRef = useClickOutside(close);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ref, focused } = useFocusWithin({ onFocus: open });
  const [value, setValueThisState] = useState<Value>(props.initialValue);

  const numCols = props.numCols ?? 3;

  useHotkeys([['Enter', close]]);

  const setValue = function (value: Value): void {
    setValueThisState(value);
    if (typeof value === 'number') {
      props.onSet(value);
    }
  };

  const buttonsFactory = props.renderButtons ?? defaultNumberInputPopOverButtons;

  const buttons = buttonsFactory({ value, setValue, close });

  return (
    <Popover opened={opened}>
      <Popover.Target>
        <NumberInput
          label="Goal: "
          value={value}
          onChange={setValue}
          min={props.min}
          max={props.max}
          maw={300}
          ref={ref}
          onKeyDown={(event) => {
            event.key === 'Enter' && close();
          }}
          wrapperProps={{inputmode:"none"}}
        />
      </Popover.Target>
      <Popover.Dropdown ref={clickOutsideRef}>
        <SimpleGrid cols={numCols}>{buttons}</SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}
