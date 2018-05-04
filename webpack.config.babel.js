const path = require('path');
import HtmlWebpackPlugin from 'html-webpack-plugin';
import {HotModuleReplacementPlugin} from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import {DefinePlugin} from 'webpack';
import WebpackGoogleCloudStoragePlugin from 'webpack-google-cloud-storage-plugin';
var ZipPlugin = require('zip-webpack-plugin');

const defaultEnv = {
    dev: false,
    production: false,
    API_URL: null,
    deploy: false,
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
    filename: ('static/bundle.js'),
  },
  plugins: [
    ...env.dev ? [
      new HotModuleReplacementPlugin(),
    ] : [
      new MiniCssExtractPlugin({
        filename: 'static/[name].css'
      })
    ],
    new HtmlWebpackPlugin({
      // Here we do a little hack, to allow webpack-dev-server to find the index.html, but also use URL like static/bundle.js in the packed version in /dist
      // The packed version want to use URL static/bundle.js because we need to seperate the requrest between / and /static to use Nginx
      // On the server, Nginx will direct
      filename: 'index.html',
      template: path.join(__dirname, 'src/index.html'),
    }),
    new DefinePlugin({
      'process.env': {
        'dev': env.dev,
        'API_URL': JSON.stringify(env.API_URL),
      },
    }),
    ...env.deploy ? [
      new ZipPlugin({
        // path: path.join(__dirname, 'dist'),
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
    ] : [],
  ],
  module: {
    rules: [
      {
        test: /\.(jpe?g|gif|png|svg|woff|ttf|wav|mp3|frag|vert)$/,
        loader: "file-loader",
        query: {
          limit: 10000,
          name: 'static/[hash].[ext]',
        }
      },
      {
        // https://github.com/webpack/webpack/issues/6586
        type: 'javascript/auto',
        test: /\.(json)/,
        exclude: /(node_modules)/,
        use: [{
          loader: 'file-loader',
          options: { name: 'static/[name].[ext]' },
        }],
      },
      {
        // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
        test: /\.tsx?$/, loader: "awesome-typescript-loader"
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
              plugins: ['react-hot-loader/babel', 'transform-class-properties']
            }
          }
        ]
      },
      {
        test: /\.(css|scss|sass)$/,
        use: [
          env.dev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
        ],
      },
    ]
  },
  devServer: {
    hot: env.dev
  },
  devtool: env.dev ? 'cheap-module-eval-source-map' : 'cheap-module-source-map',
});
