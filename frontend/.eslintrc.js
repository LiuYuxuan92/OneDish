module.exports = {
  root: true,
  extends: '@react-native',
  env: {
    jest: true,
  },
  ignorePatterns: ['node_modules/', 'dist/', 'android/', 'ios/'],
  rules: {
    'prettier/prettier': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-dupe-keys': 'off',
  },
};
