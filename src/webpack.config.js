const path = require('path');

module.exports = {
  entry: ['./main.js'],
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'mundos.io.bundle.js',
  },
  mode: "production",
  node: false,

  module: {
    rules: [
    { test: /\.css$/, use: 'css-loader' }, {test: /\.glsl$/, use: 'webpack-glsl-loader'},

    {
      test: /\.m?(js|jsx)$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-react"], // ensure compatibility with older browsers
            plugins: ["@babel/plugin-transform-object-assign"], // ensure compatibility with IE 11
          },
        },
      },
      {
        test: /\.js$/,
        loader: "webpack-remove-debug", // remove "debug" package
      }
    ],
  },

  experiments: { 
    topLevelAwait: true
  }
  
};