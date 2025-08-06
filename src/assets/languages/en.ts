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
	check: "Select",
	none: "`None`",
	unknown: "Unknown",
	artists: "Artists",
	original: "Original",
	groups: "Groups",
	characters: "Characters",
	tags: "Tags",
	languages: "Languages",
	openMenu: "Quick View Menu",
	removeMenu: "Remove Options",
	cmdMenu: "Executable Options",
	tagMenu: "Other Information",
	notNsfw: "Please use this command in an NSFW channel",
	Searching: "Searching...",
	NofoundBook: "Cannot find this book",
	NofoundRes: "No search results, please try filtering!",
	book_stop: "Close this book",
	shelfpage: "<index>/<length> Books - <current>/<total> Pages",
	watchlaterOff: "Add to Watch Later",
	watchlaterOn: "Added to Watch Later",
	favoriteOff: "Add to Favorites",
	favoriteOn: "Added to Favorites",
	favorite: "Favorites",
	watchlater: "Watch Later",

	list_empty: "The list is empty!",
	list_title: "<name>'s <category> List",
	list_removeOtherFailed:
		"Cannot remove books from other's list! Please try removing from your own list!",
	list_removeSuccess: "You have successfully removed <book> from <category>!",

	nsfw_noper: "You need `Manage Channels` permission to use this command",
	nsfw_unlock: "🔓 Now you can view books without being in an NSFW channel",
	nsfw_lock: "🔒 Now you need to be in an NSFW channel to view books",

	team_addself: "Please do not add yourself!",
	team_addfail: "Failed to add!",
	team_addsus: "Successfully added!",
	team_addesc: "<z> is already in your team!",
	team_addesc2: "Added <z> to your team; now they can control your books",
	team_removefail: "Failed to remove!",
	team_removeself: "You cannot remove yourself!",
	team_removedesc: "<z> is not in your team!",
	team_removesus: "Successfully removed!",
	team_removedesc2:
		"Removed <z> from your team; now they cannot control your books",
	team_list: "Team members of <z>",

	book_onlyself: "You can only operate your own books!",
	book_close: "This book has been closed by <z>",
	downloadZip: "Download as zip",
	downloadPdf: "Download as pdf",
	downloding: "Downloading resources, please wait...",
	downloaded: "Download complete! Took <time> seconds",
	downloded: "Download complete! Took <time> seconds",
	DownloadInQueue:
		"Your download is in the queue, currently in position: <position>",
	downloadRetry: "⚠️ Download failed, retrying (<retry>/<max>)...",
	downloadFailed:
		"❌ Download failed after <max> retries. Possible reasons:\n• Network connection issues\n• Server temporarily unavailable\n• File doesn't exist or has been deleted\n\nPlease try again later.",
	fileTooLarge:
		"❌ File too large (<size>MB), exceeds Discord's 25MB limit. Please try other download methods.",
	pleaseWait: "Please wait...",
	MissingPermission:
		"Please add the following permissions before using the command again!",
	save_success: "Added <book> to <option>",
	remove_success: "Removed <book> from <option>"
};

export default langs;
