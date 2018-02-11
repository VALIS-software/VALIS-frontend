import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import {HotModuleReplacementPlugin} from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import {DefinePlugin} from 'webpack';
import WebpackGoogleCloudStoragePlugin from 'webpack-google-cloud-storage-plugin';
var ZipPlugin = require('zip-webpack-plugin');

const defaultEnv = {
    dev: false,
    production: false,
    API_URL: null,
};

export default (env = defaultEnv) => ({
  entry: [
    ...env.dev ? [
      'react-hot-loader/patch',
      'webpack-dev-server/client?http://localhost:8080',
    ] : [],
    path.join(__dirname, 'src/index.jsx'),
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  plugins: [
    ...env.dev ? [
      new HotModuleReplacementPlugin(),
    ] : [
      new ExtractTextPlugin('[name].css'),
    ],
    new HtmlWebpackPlugin({
        filename: 'index.html',
        template: path.join(__dirname, 'src/index.html'),
    }),
    new DefinePlugin({
      'process.env': {
        'dev': env.dev,
        'API_URL': JSON.stringify(env.API_URL),
      },
    }),
    ...env.dev ? [] : [
      new ZipPlugin({
        filename: 'dist.zip',
      }),
      new WebpackGoogleCloudStoragePlugin({
        directory: './dist',
        include: ['dist.zip'],
        exclude: [],
        storageOptions: {
          projectId: 'valis-194104',
          keyFilename: path.join(process.env.HOME, 'gcloud-service-key.json'), // This shouldn't be included in the repository!
        },
        uploadOptions: {
          bucketName: 'valis-front-dev',
          gzip: false,
        },
      }),
    ],
  ],
  module: {
    rules: [
      { 
        test: /\.(jpe?g|gif|png|svg|woff|ttf|wav|mp3|frag|vert)$/, 
        use: [ { loader: "file-loader" } ]
      },
      {
        test: /.jsx?$/,
        exclude: /node_modules|lib/,
        enforce: 'pre',
        use: [
          {
            loader: 'eslint-loader',
          }
        ]
      },
      {
        test: /.jsx?$/,
        exclude: /node_modules/,
        include: path.join(__dirname, 'src'),
        use: [
          {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: [
                ['es2015', { modules: false }],
                'react',
              ],
              plugins: ['react-hot-loader/babel']
            }
          }
        ]
      },
      {
        test: /\.(css|scss|sass)$/,
        loader: env.dev ? 'style-loader!css-loader!sass-loader' : ExtractTextPlugin.extract({
          fallbackLoader: 'style-loader',
          loader: 'css-loader!sass-loader'
        })
      },
    ]
  },
  devServer: {
    hot: env.dev
  },
  devtool: env.dev ? 'cheap-module-eval-source-map' : 'cheap-module-source-map',
});
