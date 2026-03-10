declare module "@yeci226/nhentai-ts" {
	export interface NHentaiOptions {
		site?: string;
		user_agent?: string;
		cookie_value?: string;
		[key: string]: unknown;
	}

	export class NHentai {
		constructor(options?: NHentaiOptions);
		[key: string]: unknown;
	}
}
