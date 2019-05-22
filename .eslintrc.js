module.exports = {
  parser: 'babel-eslint',
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['import', 'prettier'],
  env: {
    node: true,
    es6: true,
  },
  rules: {
    'no-underscore-dangle': 'off',
    'no-param-reassign': 'off',
  },
  globals: {
    window: true,
    document: true,
    io: true,
    $: true,
  },
  settings: {
    'import/resolver': {
      alias: [['@', './src']],
    },
  },
};
