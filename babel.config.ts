interface BabelConfig {
	presets: Array<[string, { targets: { node: string } }]>;
	plugins: string[];
}

const config: BabelConfig = {
	presets: [["@babel/preset-env", { targets: { node: "current" } }]],
	plugins: [
		"@babel/plugin-proposal-async-do-expressions",
		"@babel/plugin-proposal-decorators"
	]
};

export default config;
