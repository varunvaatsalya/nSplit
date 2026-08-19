import { Stack } from "expo-router";

import { useColors } from "@/hooks/use-colors";

export default function GroupSectionLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="new"
        // options={{
        //   presentation: "modal",
        //   headerShown: true,
        //   title: "Add Group",
        // }}
      />
      <Stack.Screen name="[id]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
