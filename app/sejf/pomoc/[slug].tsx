import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { ARTICLES } from '@/content/pomoc';
import { C, H2, P, VaultScreen } from '@/ui/kit';

export default function HelpArticle() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) return <VaultScreen title="Pomoc"><P>Nie znaleziono.</P></VaultScreen>;

  return (
    <VaultScreen title="Pomoc">
      <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 12 }}>{article.title}</Text>
      {article.body.map((p, i) =>
        p.startsWith('• ') ? (
          <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 4 }}>
            <Text style={{ color: C.primary, marginRight: 8 }}>•</Text>
            <P style={{ flex: 1 }}>{p.slice(2)}</P>
          </View>
        ) : (
          <P key={i} style={{ marginBottom: 10 }}>
            {p}
          </P>
        ),
      )}
      <H2>Podstawa</H2>
      {article.sources.map((s) => (
        <P key={s} muted>
          {s}
        </P>
      ))}
      <P muted style={{ marginTop: 10 }}>
        Stan prawny sprawdzony 1 października 2026 r. To nie jest porada prawna.
      </P>
    </VaultScreen>
  );
}
