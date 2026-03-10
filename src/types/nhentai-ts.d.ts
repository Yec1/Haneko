declare module "@yeci226/nhentai-ts" {
	export interface NHentaiOptions {
		site?: string;
		user_agent?: string;
		cookie_value?: string;
		[key: string]: unknown;
	}

	export interface NHentaiBook {
		id?: number | string;
		[key: string]: any;
	}

	export interface NHentaiExploreResult {
		data: NHentaiBook[];
		[key: string]: any;
	}

	export class NHentai {
		constructor(options?: NHentaiOptions);
		getRandom(): Promise<NHentaiBook>;
		getDoujin(id: number | string): Promise<NHentaiBook>;
		explore(page?: number): Promise<NHentaiExploreResult>;
		[key: string]: any;
	}
}
