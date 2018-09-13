const path = require('path');
const webpack = require("webpack");

const outputDirectory = `${__dirname}/dist`;

module.exports = (env) => {
	env = env || {};

	let releaseMode = !!(env.production || env.deploy);

	const config = {
		context: path.resolve(__dirname, "src"),
		entry: "./index.tsx",

		mode: releaseMode ? "production" : "development",

		output: {
			filename: "static/bundle.js",
			path: outputDirectory
		},

		// Enable sourcemaps for debugging webpack's output.
		devtool: releaseMode ? false : "source-map",

		resolve: {
			// Add '.ts' and '.tsx' as resolvable extensions.
			modules: ['../node_modules', '../lib'],
			extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
		},

		module: {
			rules: [
				// Enable importing scss files (and translate to CSS)
				{
					test: /\.(scss|css)$/,
					use: [{
						loader: "style-loader" // creates style nodes from JS strings
					}, {
						loader: "css-loader" // translates CSS into CommonJS
					}, {
						loader: "sass-loader" // compiles Sass to CSS
					}]
				},

				// This enables us to copy index.html into dist/
				{
					test: /\.html/,
					type: 'javascript/auto',
					use: [{
						loader: 'file-loader',
						options: { name: '[name].[ext]' },
					}],
				},

				// Copy assets into dist/static/
				{
					test: /\.json|\.png|\.bin/,
					type: 'javascript/auto',
					use: [{
						loader: 'file-loader',
						options: { name: 'static/[path][name].[ext]' },
					}],
				},

				// All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
				{
					test: /\.(ts|tsx|js|jsx)$/,
					loader: "ts-loader",
					exclude: [path.resolve(__dirname, "node_modules")],
				},

				// All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
				{ enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
			]
		},

		plugins: [
			// pass --env to javascript build via process.env
			new webpack.DefinePlugin({ "process.env": JSON.stringify(env) }),
		]
	}

	// if in deploy mode, add deployment plugins
	if (env.deploy) {
		console.log(`Deployment Mode`);

		const WebpackGoogleCloudStoragePlugin = require("webpack-google-cloud-storage-plugin");
		const ZipPlugin = require("zip-webpack-plugin");

		config.plugins = config.plugins.concat([

			// Zip up ./dist/
			// (source path defaults to webpack output path)
			new ZipPlugin({ path: outputDirectory, filename: "dist.zip" }),

			new WebpackGoogleCloudStoragePlugin({
				directory: "dist",
				include: ["dist.zip"],
				exclude: [],
				storageOptions: {
					projectId: "valis-194104",
					keyFilename: path.join(
						process.env.HOME,
						"gcloud-service-key.json" // This shouldn't be included in the repository!
					)
				},
				uploadOptions: {
					bucketName: "valis-front-dev",
					gzip: false
				}
			})

		]);
	}

	return config;
};
