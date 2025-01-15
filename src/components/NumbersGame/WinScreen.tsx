import { Anchor, Center, Group, HoverCard, Image, Modal } from '@mantine/core';

interface winScreenProps {
  opened: boolean;
  close: () => void;
}

export function WinScreen(props: winScreenProps) {
  // CC0 https://stocksnap.io/photo/fireworks-background-CPLJUAMC1T
  // Photographer credit: https://stocksnap.io/author/travelphotographer
  return (
    <Modal opened={props.opened} onClose={props.close} title="You are the winner!!" size="auto">
      <Center mt="md">
        {/* <Text size="lg">
            </Text> */}
        {/* <Group gap="xs" maw = "400" justify="right" mt="sm" mr="sm" >
                  <Button size="md" onClick={}><b>X</b></Button>
                </Group> */}
      </Center>
      <Group justify="center" mt="md">
        <HoverCard shadow="md" openDelay={2000}>
          <HoverCard.Target>
            <Image h={500} w="auto" src="/fireworks_CPLJUAMC1T.jpg" radius="lg" />
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Anchor href="https://stocksnap.io/author/travelphotographer" size="sm" c="violet">
              Photo credit: "TravelPhotographer"
            </Anchor>
          </HoverCard.Dropdown>
        </HoverCard>
      </Group>
    </Modal>
  );
}
