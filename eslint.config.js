// Regras de camada (docs/ARCHITECTURE.md §2): as dependências só descem.
//   apps/desktop (telas) -> app-core -> domain / engine / contracts
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

const proibir = (...grupos) => ({
  'no-restricted-imports': ['error', { patterns: grupos.map(([group, message]) => ({ group, message })) }],
});

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'target/**',
      'apps/desktop/public/nucleos/**',
      'third_party/cores/**', // núcleos compilados (fora do git)
      'apps/desktop/src/styles/antigo/**',
      // cópias sem mudança do app antigo (conferidas por teste): o estilo do código é o de lá
      'packages/engine/src/visual/kofvisual.js',
      'packages/engine/src/molduras/kofmolduras.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-empty': ['error', { allowEmptyCatch: false }] },
  },
  {
    files: ['apps/desktop/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
  },
  {
    files: ['packages/domain/**'],
    rules: proibir(
      [['@kof/*'], 'domain é puro: não importa outro pacote do KOFstation'],
      [['react', 'react-dom', 'zustand'], 'domain não conhece interface'],
    ),
  },
  {
    files: ['packages/engine/**'],
    rules: proibir(
      [['@kof/app-core', '@kof/desktop'], 'engine não depende dos casos de uso nem das telas'],
      [['react', 'react-dom', 'zustand'], 'engine não usa React (o laço de 60 fps fica fora do render)'],
    ),
  },
  {
    files: ['packages/contracts/**'],
    rules: proibir([['@kof/*', 'react', 'react-dom', 'zustand'], 'contracts só tem tipos do backend']),
  },
  {
    files: ['packages/app-core/**'],
    rules: proibir([['react', 'react-dom', 'zustand', '@kof/desktop'], 'app-core não toca na interface']),
  },
  {
    files: ['apps/desktop/src/screens/**', 'apps/desktop/src/components/**'],
    rules: proibir(
      [['@kof/engine', '@kof/engine/*'], 'telas não falam com a engine: use um caso de uso (@kof/app-core)'],
      [['**/platform', '**/platform/*'], 'telas não falam com o backend: use um caso de uso (@kof/app-core)'],
    ),
  },
);
