import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn, C, IconBtn, P, VaultScreen } from '@/ui/kit';
import { themed } from '@/ui/theme';
import { ingestFile, useDraft } from '@/vault/evidence';
import { markActivity, quickExit, withExternalActivity } from '@/vault/quickExit';

/** In-app camera: photos go straight into the encrypted vault, never to the gallery. */
export default function CameraScreen() {
  const { quick } = useLocalSearchParams<{ quick?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) {
    return (
      <VaultScreen title="Zdjęcie">
        <P>Zdjęcia z tego aparatu trafiają tylko do Teczki, nie do galerii.</P>
        <Btn label="Zezwól na aparat" onPress={() => void withExternalActivity(requestPermission)} />
      </VaultScreen>
    );
  }

  // Opened from the main screen: continue to the form with the photos attached.
  const done = () => (quick && count > 0 ? router.replace('/sejf/nowy') : router.back());

  const shoot = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    markActivity();
    try {
      // No shutter sound: nobody nearby should hear that a photo was taken.
      const photo = await camera.current.takePictureAsync({ quality: 0.85, exif: true, shutterSound: false });
      const a = await ingestFile(photo.uri, {
        kind: 'photo',
        name: `zdjecie-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
        mime: 'image/jpeg',
        source: 'camera',
      });
      useDraft.getState().add(a);
      setCount((c) => c + 1);
    } catch (e) {
      Alert.alert('Nie udało się zrobić zdjęcia', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={st.screen}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} />
      <SafeAreaView style={st.top} edges={['top']}>
        <Pressable onPress={done} style={st.pill} accessibilityRole="button" accessibilityLabel="Gotowe">
          <Ionicons name="chevron-back" size={22} color={C.text} />
          {count ? <Text style={st.pillText}>{count}</Text> : null}
        </Pressable>
        <IconBtn icon="close" label="Szybkie wyjście" onPress={quickExit} color={C.accent} bg={C.accentSoft} />
      </SafeAreaView>
      <SafeAreaView style={st.bottom} edges={['bottom']}>
        <IconBtn
          icon="camera-reverse-outline"
          label="Przełącz aparat"
          size={50}
          color="#fff"
          bg="rgba(0,0,0,0.35)"
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        />
        <Pressable onPress={shoot} style={[st.shutter, busy && { opacity: 0.5 }]} accessibilityLabel="Zrób zdjęcie" />
        <View style={st.small} />
      </SafeAreaView>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 22, height: 44, paddingHorizontal: 12 },
  pillText: { fontWeight: '700', color: C.text, fontSize: 16, marginLeft: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 24 },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', borderWidth: 5, borderColor: 'rgba(255,255,255,0.5)' },
  small: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
}));
