import { router } from 'expo-router';

import { ARTICLES } from '@/content/pomoc';
import { CaptureButtons } from '@/ui/CaptureButtons';
import { List, Row, VaultScreen } from '@/ui/kit';

export default function Help() {
  return (
    <VaultScreen title="Pomoc" back={false} tabbed overlay={<CaptureButtons />}>
      <List>
        {ARTICLES.map((a, i) => (
          <Row
            key={a.slug}
            title={a.title}
            onPress={() => router.push({ pathname: '/sejf/pomoc/[slug]', params: { slug: a.slug } })}
            last={i === ARTICLES.length - 1}
          />
        ))}
      </List>
    </VaultScreen>
  );
}
