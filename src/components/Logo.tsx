import * as React from "react";

import { StyleSheet, Text, View } from "react-native";

interface Props {
  color?: string;
  size?: number;
}

function Logo({ color = "#6C63FF", size = 22 }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.text, { color, fontSize: size }]}>stash</Text>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: "#A78BFA",
            borderRadius: size * 0.11,
            height: size * 0.22,
            width: size * 0.22,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    marginBottom: 2,
    marginLeft: 1,
  },
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  text: {
    fontFamily: "Inter_900Black",
    letterSpacing: -0.5,
  },
});

export default Logo;
