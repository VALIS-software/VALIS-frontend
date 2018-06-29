/*tslint:disable:no-implicit-dependencies*/

import * as path from "path";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import { HotModuleReplacementPlugin, DefinePlugin } from "webpack";
import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
const WebpackGoogleCloudStoragePlugin = require("webpack-google-cloud-storage-plugin");
const ZipPlugin = require("zip-webpack-plugin");

const defaultEnv = {
  dev: false,
  production: false,
  API_URL: "",
  deploy: false
};

export default (env = defaultEnv) => ({
  mode: (env.production || env.deploy) ? "production" : "development",
  entry: [
    ...(env.dev
      ? [
        "webpack-dev-server/client?http://localhost:8080",
        "webpack/hot/only-dev-server"
      ]
      : []),
    path.join(__dirname, "src/index.tsx")
  ],
  output: {
    path: path.join(__dirname, "dist"),
    filename: "static/bundle.js",
    publicPath: "/"
  },
  plugins: [
    ...(env.dev
      ? [new HotModuleReplacementPlugin()]
      : [
        new MiniCssExtractPlugin({
          filename: "static/[name].css"
        })
      ]),
    new HtmlWebpackPlugin({
      // Here we do a little hack, to allow webpack-dev-server to find the index.html, but also use URL like static/bundle.js in the packed version in /dist
      // The packed version want to use URL static/bundle.js because we need to seperate the requrest between / and /static to use Nginx
      // On the server, Nginx will direct
      filename: "index.html",
      template: path.join(__dirname, "src/index.html")
    }),
    new DefinePlugin({
      "process.env": {
        dev: env.dev,
        API_URL: JSON.stringify(env.API_URL)
      }
    }),
    ...(env.deploy
      ? [
        new ZipPlugin({
          // path: path.join(__dirname, 'dist'),
          filename: "dist.zip"
        }),
        new WebpackGoogleCloudStoragePlugin({
          directory: "./dist",
          include: ["dist.zip"],
          exclude: [],
          storageOptions: {
            projectId: "valis-194104",
            keyFilename: path.join(
              process.env.HOME,
              "gcloud-service-key.json"
            ) // This shouldn't be included in the repository!
          },
          uploadOptions: {
            bucketName: "valis-front-dev",
            gzip: false
          }
        })
      ]
      : [])
  ],
  module: {
    rules: [
      {
        test: /\.(jpe?g|gif|png|svg|woff|ttf|wav|mp3|frag|vert)$/,
        loader: "file-loader",
        query: {
          limit: 10000,
          name: "static/[hash].[ext]"
        }
      },
      {
        // https://github.com/webpack/webpack/issues/6586
        type: "javascript/auto",
        test: /\.(json)/,
        exclude: [/(node_modules)/, /src\/fonts\/.*.json/],
        use: [
          {
            loader: "file-loader",
            options: { name: "static/[name].[ext]" }
          }
        ]
      },
      {
        test: /\.(j|t)sx?$/,
        loader: "ts-loader",
        include: path.resolve(__dirname, "src"),
        exclude: [path.resolve(__dirname, "node_modules")],
      },
      {
        test: /\.(j|t)sx?$/,
        exclude: /node_modules|lib/,
        enforce: "pre",
        use: [
          {
            loader: "tslint-loader"
          }
        ]
      },
      {
        test: /\.(css|scss|sass)$/,
        use: [
          env.dev ? "style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader"
        ]
      }
    ]
  },
  devServer: {
    hot: env.dev,
    port: 8080,
    publicPath: "/",
    contentBase: path.resolve(__dirname, "src")
  },
  devtool: env.dev ? "cheap-module-eval-source-map" : "cheap-module-source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json", ".jsx"]
  },
  node: {
    console: true,
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
});
