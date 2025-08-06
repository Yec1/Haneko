interface LanguageStrings {
	check: string;
	none: string;
	unknown: string;
	artists: string;
	original: string;
	groups: string;
	characters: string;
	tags: string;
	languages: string;
	openMenu: string;
	removeMenu: string;
	cmdMenu: string;
	tagMenu: string;
	notNsfw: string;
	Searching: string;
	NofoundBook: string;
	NofoundRes: string;
	book_stop: string;
	shelfpage: string;
	watchlaterOff: string;
	watchlaterOn: string;
	favoriteOff: string;
	favoriteOn: string;
	favorite: string;
	watchlater: string;
	list_empty: string;
	list_title: string;
	list_removeOtherFailed: string;
	list_removeSuccess: string;
	nsfw_noper: string;
	nsfw_unlock: string;
	nsfw_lock: string;
	team_addself: string;
	team_addfail: string;
	team_addsus: string;
	team_addesc: string;
	team_addesc2: string;
	team_removefail: string;
	team_removeself: string;
	team_removedesc: string;
	team_removesus: string;
	team_removedesc2: string;
	team_list: string;
	book_onlyself: string;
	book_close: string;
	downloadZip: string;
	downloadPdf: string;
	downloding: string;
	downloaded: string;
	downloded: string;
	DownloadInQueue: string;
	downloadRetry: string;
	downloadFailed: string;
	fileTooLarge: string;
	pleaseWait: string;
	MissingPermission: string;
	save_success: string;
	remove_success: string;
}

const langs: LanguageStrings = {
	check: "選擇",
	none: "`無`",
	unknown: "未知",
	artists: "作者",
	original: "原創",
	groups: "分類",
	characters: "角色",
	tags: "標籤",
	languages: "語言",
	openMenu: "快速觀看選單",
	removeMenu: "移除選項",
	cmdMenu: "可執行選項",
	tagMenu: "其他資訊",
	notNsfw: "請在 NSFW 頻道使用這個指令",
	Searching: "搜尋中...",
	NofoundBook: "搜尋不到此本",
	NofoundRes: "沒有搜尋結果 請試試篩選！",
	book_stop: "關閉此書",
	shelfpage: "<index>/<length> 本 - <current>/<total> 頁",
	watchlaterOff: "添加至稍後觀看",
	watchlaterOn: "已添加至稍後觀看",
	favoriteOff: "添加至收藏",
	favoriteOn: "已添加至收藏",
	favorite: "收藏",
	watchlater: "稍後觀看",

	list_empty: "清單是空的！",
	list_title: "<name> 的<category>清單",
	list_removeOtherFailed:
		"無法移除其他人清單中的書本！請嘗試移除自己的書本！",
	list_removeSuccess: "您已成功移除<category>中的 <book>！",

	nsfw_noper: "你需要 `編輯頻道` 權限才能使用這個指令",
	nsfw_unlock: "🔓 現在不需要在 NSFW 頻道就可以看本了",
	nsfw_lock: "🔒 現在需要在 NSFW 頻道才可以看本",

	team_addself: "請不要添加自己！",
	team_addfail: "添加失敗！",
	team_addsus: "添加成功！",
	team_addesc: "<z> 已經在你的團隊中！",
	team_addesc2: "已添加 <z> 至你的團隊，現在他可以操控你的本子",
	team_removefail: "刪除失敗！",
	team_removeself: "你無法刪除自己！",
	team_removedesc: "<z> 不在你的團隊中！",
	team_removesus: "刪除成功！",
	team_removedesc2: "已從你的團隊中刪除 <z>，現在他無法操控你的本子",
	team_list: "<z> 的團隊成員",

	book_onlyself: "你只能操作自己的本！",
	book_close: "此書已由 <z> 關閉",
	downloadZip: "下載為壓縮檔",
	downloadPdf: "下載為 PDF",
	downloding: "正在下載資源，請稍等...",
	downloaded: "下載完成！花費了 <time> 秒",
	downloded: "下載完成！花費了 <time> 秒",
	DownloadInQueue: "您的下載正在排隊中，目前排隊位置：<position>",
	downloadRetry: "⚠️ 下載失敗，正在重試 (<retry>/<max>)...",
	downloadFailed:
		"❌ 下載失敗，已重試 <max> 次。可能原因：\n• 網絡連接問題\n• 服務器暫時不可用\n• 文件不存在或已被刪除\n\n請稍後重試。",
	fileTooLarge:
		"❌ 文件太大 (<size>MB)，超過 Discord 25MB 限制。請嘗試其他下載方式。",
	pleaseWait: "請稍等...",
	MissingPermission: "請幫我添加以下權限後，再次使用指令！",
	save_success: "已將 <book> 添加至 <option>",
	remove_success: "已將 <book> 從 <option> 中移除"
};

export default langs;
