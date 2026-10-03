import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { C, IconBtn } from './kit';

/** Straight to the recorder or camera; the form opens afterwards with the file attached. */
export function CaptureButtons() {
  return (
    <View style={st.fabs}>
      <IconBtn
        icon="mic-outline"
        label="Nagranie"
        size={60}
        color={C.primary}
        bg={C.surface}
        raised
        onPress={() => router.push({ pathname: '/sejf/nagranie', params: { quick: '1' } })}
      />
      <IconBtn
        icon="camera-outline"
        label="Zdjęcie"
        size={60}
        color={C.primary}
        bg={C.surface}
        raised
        onPress={() => router.push({ pathname: '/sejf/aparat', params: { quick: '1' } })}
      />
    </View>
  );
}

const st = StyleSheet.create({
  fabs: { position: 'absolute', right: 16, bottom: 18, gap: 12 },
});
