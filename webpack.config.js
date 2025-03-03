const path = require('path');

module.exports = {
  entry: './src/index.js', // Your main entry point
  output: {
    path: path.resolve(__dirname, 'dist'), // Output directory
    filename: 'bundle.js', // Output bundle file name
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // For JavaScript and JSX files
        exclude: /node_modules\/(?!(@react-spring|@nivo)\/).*/, // Exclude all node_modules except @react-spring and @nivo
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'], // Babel presets
          },
        },
      },
      {
        test: /\.css$/, // For CSS files
        use: ['style-loader', 'css-loader'], // Loaders for CSS
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/, // For images
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'], // File extensions to resolve
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'), // Serve files from the 'dist' directory
    port: 3000, // Port to run the development server
    hot: true, // Enable hot module replacement
  },
  mode: 'development', // Set mode to development
};
