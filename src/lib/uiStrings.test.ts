import { expect, test } from 'vitest';
import { getUiStrings } from './uiStrings';
import { DEFAULT_TRANSLIT_CONFIG as cfg } from './translit/defaults';
import { uzbekTranslations } from './i18n';

test('ui strings per alphabet', () => {
  expect(getUiStrings('latn', cfg)).toBe(uzbekTranslations);
  expect(getUiStrings('cyrl', cfg).nav.home).toBe('Бош саҳифа');
  expect(getUiStrings('yangi', cfg).article.share).toBe('Ulaşiş');
  expect(getUiStrings('cyrl', cfg)).toBe(getUiStrings('cyrl', cfg));
});
