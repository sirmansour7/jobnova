import nextVitals from 'eslint-config-next/core-web-vitals';
export default [
  ...(Array.isArray(nextVitals) ? nextVitals : [nextVitals]),
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'node_modules/**'],
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
