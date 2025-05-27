// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph

'use strict';

// Global variables
var version = "0.46.56.12";
var cloakedTabs = [];
var uncloakedTabs = [];
var contextLoaded = false;
var dpicon, dptitle;
var blackList, whiteList;
var storageCache = {};

// Storage helper functions for Manifest V3
async function getStorageValue(key, defaultValue = null) {
	if (storageCache[key] !== undefined) {
		return storageCache[key];
	}
	const result = await chrome.storage.local.get([key]);
	const value = result[key] !== undefined ? result[key] : defaultValue;
	storageCache[key] = value;
	return value;
}

async function setStorageValue(key, value) {
	storageCache[key] = value;
	await chrome.storage.local.set({ [key]: value });
}

function optionExists(key) {
	return storageCache[key] !== undefined;
}

// ----- Supporting Functions

function enabled(tab, dpcloakindex) {
	var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url));
	var dpcloakindex = dpcloakindex || cloakedTabs.indexOf(tab.windowId+"|"+tab.id);
	if ((storageCache["enable"] == "true" || dpdomaincheck == '1') && dpdomaincheck != '0' && (storageCache["global"] == "true" || (storageCache["global"] == "false" && (dpcloakindex != -1 || storageCache["newPages"] == "Cloak" || dpdomaincheck == '1')))) return 'true';
	return 'false';
}

function domainCheck(domain) {
	if (!domain) return '-1';
	if (in_array(domain, whiteList) == '1') return '0';
	if (in_array(domain, blackList) == '1') return '1';
	return '-1';
}

function in_array(needle, haystack) {
	if (!haystack || !needle) return false;
	if (binarySearch(haystack, needle) != -1) return '1';
	if (needle.indexOf('www.') == 0) {
		if (binarySearch(haystack, needle.substring(4)) != -1) return '1';
	}
	for (var i in haystack) {
		if (haystack[i].indexOf("*") == -1 && haystack[i].indexOf("?") == -1) continue;
		if (new RegExp('^(?:www\\.|^)(?:'+haystack[i].replace(/\./g, '\\.').replace(/^\[/, '\\[').replace(/\]$/, '\\]').replace(/\?/g, '.').replace(/\*/g, '[^.]+')+')').test(needle)) return '1';
	}
	return false;
}

function binarySearch(list, item) {
    var min = 0;
    var max = list.length - 1;
    var guess;
	var bitwise = (max <= 2147483647) ? true : false;
	if (bitwise) {
		while (min <= max) {
			guess = (min + max) >> 1;
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	} else {
		while (min <= max) {
			guess = Math.floor((min + max) / 2);
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	}
    return -1;
}

function extractDomainFromURL(url) {
	if (!url) return "";
	if (url.indexOf("://") != -1) url = url.substr(url.indexOf("://") + 3);
	if (url.indexOf("/") != -1) url = url.substr(0, url.indexOf("/"));
	if (url.indexOf("@") != -1) url = url.substr(url.indexOf("@") + 1);
	if (url.match(/^(?:\[[A-Fa-f0-9:.]+\])(:[0-9]+)?$/g)) {
		if (url.indexOf("]:") != -1) return url.substr(0, url.indexOf("]:")+1);
		return url;
	}
	if (url.indexOf(":") > 0) url = url.substr(0, url.indexOf(":"));
	return url;
}

async function domainHandler(domain, action) {
	// Initialize storage
	let whiteListData = await getStorageValue('whiteList', '[]');
	let blackListData = await getStorageValue('blackList', '[]');
	
	var tempWhitelist = JSON.parse(whiteListData);
	var tempBlacklist = JSON.parse(blackListData);
	
	// Remove domain from whitelist and blacklist
	var pos = tempWhitelist.indexOf(domain);
	if (pos>-1) tempWhitelist.splice(pos,1);
	pos = tempBlacklist.indexOf(domain);
	if (pos>-1) tempBlacklist.splice(pos,1);
	
	switch(action) {
		case 0:	// Whitelist
			tempWhitelist.push(domain);
			break;
		case 1:	// Blacklist
			tempBlacklist.push(domain);
			break;
		case 2:	// Remove
			break;
	}
	
	await setStorageValue('blackList', JSON.stringify(tempBlacklist));
	await setStorageValue('whiteList', JSON.stringify(tempWhitelist));
	blackList = tempBlacklist.sort();
	whiteList = tempWhitelist.sort();
	return false;
}

// ----- Options
async function defaultOptionValue(opt, val) {
	if (!optionExists(opt)) await setStorageValue(opt, val);
}

async function setDefaultOptions() {
	await defaultOptionValue("version", version);
	await defaultOptionValue("enable", "true");
	await defaultOptionValue("enableToggle", "true");
	await defaultOptionValue("hotkey", "CTRL F12");
	await defaultOptionValue("paranoidhotkey", "ALT P");
	await defaultOptionValue("global", "false");
	await defaultOptionValue("newPages", "Uncloak");
	await defaultOptionValue("sfwmode", "SFW");
	await defaultOptionValue("savedsfwmode", "");
	await defaultOptionValue("opacity1", "0.05");
	await defaultOptionValue("opacity2", "0.5");
	await defaultOptionValue("collapseimage", "false");
	await defaultOptionValue("showIcon", "true");
	await defaultOptionValue("iconType", "coffee");
	await defaultOptionValue("iconTitle", "Decreased Productivity");
	await defaultOptionValue("disableFavicons", "false");
	await defaultOptionValue("hidePageTitles", "false");
	await defaultOptionValue("pageTitleText", "Google Chrome");
	await defaultOptionValue("enableStickiness", "false");
	await defaultOptionValue("maxwidth", "0");
	await defaultOptionValue("maxheight", "0");
	await defaultOptionValue("showContext", "true");
	await defaultOptionValue("showUnderline", "true");
	await defaultOptionValue("removeBold", "false");
	await defaultOptionValue("showUpdateNotifications", "true");
	await defaultOptionValue("font", "Arial");
	await defaultOptionValue("customfont", "");
	await defaultOptionValue("fontsize", "12");
	await defaultOptionValue("s_bg", "FFFFFF");
	await defaultOptionValue("s_link", "000099");
	await defaultOptionValue("s_table", "cccccc");
	await defaultOptionValue("s_text", "000000");
	await defaultOptionValue("customcss", "");
	await defaultOptionValue("blackList", "[]");
	await defaultOptionValue("whiteList", "[]");
	
	// fix hotkey shortcut if in old format
	let hotkey = await getStorageValue("hotkey", "CTRL F12");
	if (hotkey.indexOf('+') != -1) {
		hotkey = hotkey.replace(/\+$/, "APLUSA").replace(/\+/g, " ").replace(/APLUSA/, "+");
		await setStorageValue("hotkey", hotkey);
	}
	
	// set SFW Level to SFW (for new change in v0.46.3)
	let sfwmode = await getStorageValue("sfwmode", "SFW");
	if (sfwmode == "true") {
		await setStorageValue("sfwmode", "SFW");
	}
}

// Called by clicking on the context menu item
async function newCloak(info, tab) {
	await setStorageValue("enable", "true");
	if (info.mediaType) {
		chrome.tabs.create({'url': info.srcUrl}, function(tab){ 
			cloakedTabs.push(tab.windowId+"|"+tab.id);
			recursiveCloak('true', storageCache["global"], tab.id); 
		});
	} else {
		chrome.tabs.create({'url': info.linkUrl}, function(tab){ 
			cloakedTabs.push(tab.windowId+"|"+tab.id);
			recursiveCloak('true', storageCache["global"], tab.id); 
		});
	}
}

// Add context menu item that shows only if you right-click on links/images.
async function dpContext() {
	if (await getStorageValue("showContext") == 'true' && !contextLoaded) {
		chrome.contextMenus.create({
			"id": "opensafely",
			"title": chrome.i18n.getMessage("opensafely"), 
			"contexts": ['link', 'image']
		});
		contextLoaded = true;
	}
}

// ----- Main Functions
function checkChrome(url) {
	if (url.substring(0, 6) == 'chrome') return true;
	return false;
}

async function hotkeyChange() {
	chrome.windows.getAll({"populate":true}, function(windows) {
		windows.map(function(window) {
			window.tabs.map(function(tab) {
				if (!checkChrome(tab.url)) {
					chrome.scripting.executeScript({
						target: { tabId: tab.id, allFrames: true },
						func: function(enableToggle, hotkey, paranoidhotkey) {
							if (typeof hotkeySet === 'function') {
								hotkeySet(enableToggle, hotkey, paranoidhotkey);
							}
						},
						args: [storageCache["enableToggle"], storageCache["hotkey"], storageCache["paranoidhotkey"]]
					});
				}
			});
		});
	});
}

async function optionsSaveTrigger(prevglob, newglob) {
	var enable = await getStorageValue("enable");
	var global = newglob;
	if (prevglob == 'true' && newglob == 'false') {
		global = 'true';
		enable = 'false';
	}
	if (global == 'false') {
		for (var i=cloakedTabs.length-1; i>=0; --i) {
			magician(enable, parseInt(cloakedTabs[i].split("|")[1]));
		}
		if (enable == 'false') cloakedTabs = [];
	} else recursiveCloak(enable, global);
}

function recursiveCloak(enable, global, tabId) {
	if (global == 'true') {
		chrome.windows.getAll({"populate":true}, function(windows) {
			windows.map(function(window) {
				window.tabs.map(function(tab) {
					if (!checkChrome(tab.url)) {
						var enabletemp = enable;
						var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url));
						// Ensure whitelisted or blacklisted tabs stay as they are
						if (enabletemp == 'true' && dpdomaincheck == '0') enabletemp = 'false';
						else if (enabletemp == 'false' && dpdomaincheck == '1') enabletemp = 'true';
						magician(enabletemp, tab.id);
						var dpTabId = tab.windowId+"|"+tab.id;
						var dpcloakindex = cloakedTabs.indexOf(dpTabId);
						var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
						if (enabletemp == 'false') {
							if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
							if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
						} else {
							if (dpcloakindex == -1) cloakedTabs.push(dpTabId);
							if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
						}
					}
				});
			});
		});
	} else {
		if (tabId) magician(enable, tabId);
	}
}

function magician(enable, tabId) {
	if (enable == 'true') {
		if (storageCache["disableFavicons"] == 'true' && storageCache["hidePageTitles"] == 'true') {
			chrome.scripting.executeScript({
				target: { tabId: tabId, allFrames: true },
				func: function(pageTitleText) {
					if (typeof init === 'function') init();
					if (typeof faviconblank === 'function') faviconblank();
					if (typeof replaceTitle === 'function') replaceTitle(pageTitleText);
					if (typeof titleBind === 'function') titleBind(pageTitleText);
				},
				args: [storageCache["pageTitleText"]]
			});
		} else if (storageCache["disableFavicons"] == 'true' && storageCache["hidePageTitles"] != 'true') {
			chrome.scripting.executeScript({
				target: { tabId: tabId, allFrames: true },
				func: function() {
					if (typeof init === 'function') init();
					if (typeof faviconblank === 'function') faviconblank();
					if (typeof titleRestore === 'function') titleRestore();
				}
			});
		} else if (storageCache["disableFavicons"] != 'true' && storageCache["hidePageTitles"] == 'true') {
			chrome.scripting.executeScript({
				target: { tabId: tabId, allFrames: true },
				func: function(pageTitleText) {
					if (typeof init === 'function') init();
					if (typeof faviconrestore === 'function') faviconrestore();
					if (typeof replaceTitle === 'function') replaceTitle(pageTitleText);
					if (typeof titleBind === 'function') titleBind(pageTitleText);
				},
				args: [storageCache["pageTitleText"]]
			});
		} else if (storageCache["disableFavicons"] != 'true' && storageCache["hidePageTitles"] != 'true') {
			chrome.scripting.executeScript({
				target: { tabId: tabId, allFrames: true },
				func: function() {
					if (typeof init === 'function') init();
					if (typeof faviconrestore === 'function') faviconrestore();
					if (typeof titleRestore === 'function') titleRestore();
				}
			});
		}
	} else {
		chrome.scripting.executeScript({
			target: { tabId: tabId, allFrames: true },
			func: function() {
				if (typeof removeCss === 'function') removeCss();
			}
		});
	}
	
	if (storageCache["showIcon"] == 'true') {
		if (enable == 'true') {
			chrome.action.setIcon({
				path: chrome.runtime.getURL("img/addressicon/"+dpicon+".png"), 
				tabId: tabId
			});
		} else {
			chrome.action.setIcon({
				path: chrome.runtime.getURL("img/addressicon/"+dpicon+"-disabled.png"), 
				tabId: tabId
			});
		}
		chrome.action.setTitle({title: dptitle, tabId: tabId});
	}
}

async function dpHandle(tab) {
	if (checkChrome(tab.url)) return;
	if (await getStorageValue("global") == "true" && domainCheck(extractDomainFromURL(tab.url)) != 1) {
		if (await getStorageValue("enable") == "true") {
			recursiveCloak('false', 'true');
			await setStorageValue("enable", "false");
		} else {
			recursiveCloak('true', 'true');
			await setStorageValue("enable", "true");
		}
	} else {
		var dpTabId = tab.windowId+"|"+tab.id;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
		await setStorageValue("enable", "true");
		if (dpcloakindex != -1) {
			magician('false', tab.id);
			if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
			cloakedTabs.splice(dpcloakindex, 1);
		} else {
			magician('true', tab.id);
			cloakedTabs.push(dpTabId);
			if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
		}
	}
}

function setDPIcon() {
	dpicon = storageCache["iconType"];
	dptitle = storageCache["iconTitle"];
	chrome.windows.getAll({"populate":true}, function(windows) {
		windows.map(function(window) {
			window.tabs.map(function(tab) {
				if (cloakedTabs.indexOf(tab.windowId+"|"+tab.id) != -1) {
					chrome.action.setIcon({
						path: chrome.runtime.getURL("img/addressicon/"+dpicon+".png"), 
						tabId: tab.id
					});
				} else {
					chrome.action.setIcon({
						path: chrome.runtime.getURL("img/addressicon/"+dpicon+"-disabled.png"), 
						tabId: tab.id
					});
				}
				chrome.action.setTitle({title: dptitle, tabId: tab.id});
			});
		});
	});
}

async function initLists() {
	blackList = JSON.parse(await getStorageValue('blackList', '[]')).sort();
	whiteList = JSON.parse(await getStorageValue('whiteList', '[]')).sort();	
}

// ----- Request library to support content script communication
chrome.tabs.onUpdated.addListener(async function(tabid, changeinfo, tab) {
	if (changeinfo.status == "loading") {
		var dpTabId = tab.windowId+"|"+tabid;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var enable = enabled(tab, dpcloakindex);
		if (await getStorageValue("showIcon") == "true") {
			if (enable == "true") {
				chrome.action.setIcon({
					path: chrome.runtime.getURL("img/addressicon/"+dpicon+".png"), 
					tabId: tabid
				});
			} else {
				chrome.action.setIcon({
					path: chrome.runtime.getURL("img/addressicon/"+dpicon+"-disabled.png"), 
					tabId: tabid
				});
			}
			chrome.action.setTitle({title: dptitle, tabId: tabid});
		}
		if (checkChrome(tab.url)) return;
		var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
		if (enable == "true") {
			magician('true', tabid);
			if (await getStorageValue("global") == "false" && await getStorageValue("enable") == "false") await setStorageValue("enable", "true");
			if (dpcloakindex == -1) cloakedTabs.push(dpTabId);
			if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
		} else {
			if (await getStorageValue("enableStickiness") == "true") {
				if (tab.openerTabId) {
					if (cloakedTabs.indexOf(tab.windowId+"|"+tab.openerTabId) != -1 && dpuncloakindex == -1) {
						if (domainCheck(extractDomainFromURL(tab.url)) != '0') {
							magician('true', tabid);
							cloakedTabs.push(dpTabId);
							return;
						}
					}
					if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
					if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
				} else {
					chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
						if (tabs[0].windowId == tab.windowId && cloakedTabs.indexOf(tabs[0].windowId+"|"+tabs[0].id) != -1 && dpuncloakindex == -1) {
							if (domainCheck(extractDomainFromURL(tab.url)) != '0') {
								magician('true', tabid);
								cloakedTabs.push(dpTabId);
								return;
							}
						}
						if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
						if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
					});
				}
			}
		}
	}
});	

chrome.tabs.onRemoved.addListener(function(tabid, windowInfo) {
	var dpTabId = windowInfo.windowId+"|"+tabid;
	var dpcloakindex = cloakedTabs.indexOf(dpTabId);
	var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
	if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
	if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
});

var requestDispatchTable = {
	"get-enabled": function(request, sender, sendResponse) {
		var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var enable = enabled(sender.tab, dpcloakindex);
		if (enable == 'true' && dpcloakindex == -1) cloakedTabs.push(dpTabId);
		sendResponse({
			enable: enable, 
			background: storageCache["s_bg"], 
			favicon: storageCache["disableFavicons"], 
			hidePageTitles: storageCache["hidePageTitles"], 
			pageTitleText: storageCache["pageTitleText"], 
			enableToggle: storageCache["enableToggle"], 
			hotkey: storageCache["hotkey"], 
			paranoidhotkey: storageCache["paranoidhotkey"]
		});
	},
	"toggle": async function(request, sender, sendResponse) {
		if (await getStorageValue("savedsfwmode") != "") {
			await setStorageValue("sfwmode", await getStorageValue("savedsfwmode"));
			await setStorageValue("savedsfwmode", "");
			if (await getStorageValue("global") == "true") recursiveCloak('true', 'true');
			else {
				magician('true', sender.tab.id);
				var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
				var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
				if (cloakedTabs.indexOf(dpTabId) == -1) cloakedTabs.push(dpTabId);
			}
			await setStorageValue("enable", "true");
		} else {
			dpHandle(sender.tab);
		}
	},
	"toggleparanoid": async function(request, sender, sendResponse) {
		if (await getStorageValue("savedsfwmode") == "") {
			await setStorageValue("savedsfwmode", await getStorageValue("sfwmode"));
			await setStorageValue("sfwmode", "Paranoid");
			if (await getStorageValue("global") == "true") recursiveCloak('true', 'true');
			else {
				magician('true', sender.tab.id);
				var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
				var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
				if (cloakedTabs.indexOf(dpTabId) == -1) cloakedTabs.push(dpTabId);
			}
			await setStorageValue("enable", "true");
		} else {
			await setStorageValue("sfwmode", await getStorageValue("savedsfwmode"));
			await setStorageValue("savedsfwmode", "");
			dpHandle(sender.tab);
		}
	},
	"get-settings": function(request, sender, sendResponse) {
		var enable, fontface;
		if (storageCache["font"] == '-Custom-') {
			if (storageCache["customfont"]) fontface = storageCache["customfont"];
			else fontface = 'Arial';
		} else fontface = storageCache["font"];
		if (storageCache["global"] == "false") enable = 'true';
		else enable = enabled(sender.tab);
		sendResponse({
			enable: enable, 
			sfwmode: storageCache["sfwmode"], 
			font: fontface, 
			fontsize: storageCache["fontsize"], 
			underline: storageCache["showUnderline"], 
			background: storageCache["s_bg"], 
			text: storageCache["s_text"], 
			table: storageCache["s_table"], 
			link: storageCache["s_link"], 
			bold: storageCache["removeBold"], 
			opacity1: storageCache["opacity1"], 
			opacity2: storageCache["opacity2"], 
			collapseimage: storageCache["collapseimage"], 
			maxheight: storageCache["maxheight"], 
			maxwidth: storageCache["maxwidth"], 
			customcss: storageCache["customcss"]
		});
	}
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.reqtype in requestDispatchTable) {
		const handler = requestDispatchTable[request.reqtype];
		if (handler.constructor.name === 'AsyncFunction') {
			handler(request, sender, sendResponse);
			return true; // Keep message channel open for async response
		} else {
			handler(request, sender, sendResponse);
		}
	} else {
		sendResponse({});
	}
});

// ----- If action icon is clicked, either enable or disable the cloak
chrome.action.onClicked.addListener(function(tab) {
	dpHandle(tab);
});

// Initialize storage cache
async function initializeStorage() {
	const keys = [
		"version", "enable", "enableToggle", "hotkey", "paranoidhotkey", "global", 
		"newPages", "sfwmode", "savedsfwmode", "opacity1", "opacity2", "collapseimage", 
		"showIcon", "iconType", "iconTitle", "disableFavicons", "hidePageTitles", 
		"pageTitleText", "enableStickiness", "maxwidth", "maxheight", "showContext", 
		"showUnderline", "removeBold", "showUpdateNotifications", "font", "customfont", 
		"fontsize", "s_bg", "s_link", "s_table", "s_text", "customcss", "blackList", "whiteList"
	];
	
	const result = await chrome.storage.local.get(keys);
	for (const key of keys) {
		if (result[key] !== undefined) {
			storageCache[key] = result[key];
		}
	}
}

// Execute
chrome.runtime.onStartup.addListener(async () => {
	await initializeStorage();
	await setDefaultOptions();
	await initLists();
	setDPIcon();
	await dpContext();
});

chrome.runtime.onInstalled.addListener(async () => {
	await initializeStorage();
	await setDefaultOptions();
	await initLists();
	setDPIcon();
	await dpContext();
	
	// Context Menu - Updated for Manifest V3
	chrome.contextMenus.create({
		"id": "whitelistdomain",
		"title": chrome.i18n.getMessage("whitelistdomain"), 
		"contexts": ['action']
	});

	chrome.contextMenus.create({
		"id": "blacklistdomain",
		"title": chrome.i18n.getMessage("blacklistdomain"), 
		"contexts": ['action']
	});

	chrome.contextMenus.create({
		"id": "removelist",
		"title": chrome.i18n.getMessage("removelist"), 
		"contexts": ['action']
	});

	chrome.contextMenus.onClicked.addListener(async (info, tab) => {
		if (tab.url.substring(0, 4) != 'http') return;
		
		switch(info.menuItemId) {
			case "whitelistdomain":
				await domainHandler(extractDomainFromURL(tab.url), 0);
				if (await getStorageValue("enable") == "true") magician('false', tab.id);
				break;
			case "blacklistdomain":
				await domainHandler(extractDomainFromURL(tab.url), 1);
				if (await getStorageValue("enable") == "true") magician('true', tab.id);
				break;
			case "removelist":
				await domainHandler(extractDomainFromURL(tab.url), 2);
				if (await getStorageValue("enable") == "true") {
					var flag = 'false';
					if (await getStorageValue('newPages') == 'Cloak' || await getStorageValue('global') == 'true') flag = 'true';
					magician(flag, tab.id);
				}
				break;
		}
	});
	
	if ((!optionExists("version") || await getStorageValue("version") != version) && await getStorageValue("showUpdateNotifications") == 'true') {
		await setStorageValue("version", version);
	}
});

chrome.runtime.onUpdateAvailable.addListener(function (details) {
	// an update is available, but wait until user restarts their browser as to not disrupt their current session and cloaked tabs.
});
