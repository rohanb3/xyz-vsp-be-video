module.exports = {
  parserOptions: {
    parser: 'babel-eslint',
  },
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
  ],
  plugins: [
    'import',
  ],
  env: {
    node: true,
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
      alias: [
        ['@', './src'],
      ],
    },
  },
}
