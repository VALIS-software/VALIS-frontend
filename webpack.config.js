const path = require('path');
const DefinePlugin = require("webpack").DefinePlugin;

const outputDirectory = `${__dirname}/dist`;


module.exports = (env) => {
	env = env || {};
	
	const config = {
		context: path.resolve(__dirname, "src"),
		entry: "./index.tsx",

		mode: (env.production || env.deploy) ? "production" : "development",

		output: {
			filename: "bundle.js",
			path: outputDirectory
		},

		// Enable sourcemaps for debugging webpack's output.
		devtool: "source-map",

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

				// All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
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
			new DefinePlugin({ "process.env": JSON.stringify(env) })
		],

		// When importing a module whose path matches one of the following, just
		// assume a corresponding global variable exists and use that instead.
		// This is important because it allows us to avoid bundling all of our
		// dependencies, which allows browsers to cache those libraries between builds.
		externals: {
			"react": "React",
			"react-dom": "ReactDOM"
		},
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
				directory: outputDirectory,
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
