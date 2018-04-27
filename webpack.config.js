const path = require('path');

module.exports = {
	context: path.resolve(__dirname, "src"),
	entry: "./index.tsx",
	output: {
		filename: "bundle.js",
		path: __dirname + "/dist"
	},

	// Enable sourcemaps for debugging webpack's output.
	devtool: "source-map",

	resolve: {
		// Add '.ts' and '.tsx' as resolvable extensions.
		modules: ['../node_modules', '../lib'],
		extensions: [".ts", ".tsx", ".js", "jsx", ".json"]
	},

	module: {
		rules: [
			{
				test: /\.scss$/,
				use: [{
					loader: "style-loader" // creates style nodes from JS strings
				}, {
					loader: "css-loader" // translates CSS into CommonJS
				}, {
					loader: "sass-loader" // compiles Sass to CSS
				}]
			},

			// this enables us to copy index.html into dist/
			{
				test: /\.html/,
				type: 'javascript/auto',
				use: [{
					loader: 'file-loader',
					options: { name: '[name].[ext]' },
				}],
			},

			// copy assets into dist/static/
			{
				test: /\.json|\.png|\.bin/,
				type: 'javascript/auto',
				use: [{
					loader: 'file-loader',
					options: { name: 'static/[path][name].[ext]' },
				}],
			},

			// All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
			{ test: /\.tsx?$/, loader: "ts-loader" },

			// All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
			{ enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
		]
	},

	// When importing a module whose path matches one of the following, just
	// assume a corresponding global variable exists and use that instead.
	// This is important because it allows us to avoid bundling all of our
	// dependencies, which allows browsers to cache those libraries between builds.
	externals: {
		"react": "React",
		"react-dom": "ReactDOM"
	},
};