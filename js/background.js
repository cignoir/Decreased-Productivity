// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph

//'use strict'; - enable after testing
var version = chrome.runtime.getManifest().version;
var cloakedTabs = []; // Persisted via persistTabLists/loadTabLists
var uncloakedTabs = []; // Persisted via persistTabLists/loadTabLists
// var contextLoaded = false; // Removed, rely on onInstalled logic and menu item IDs
var dpicon, dptitle; // Loaded async by setDPIcon
var blackList, whiteList; // Loaded async by initLists

// ----- Supporting Functions

async function enabled(tab, dpcloakindex) { // Made async
    const settings = await chrome.storage.local.get(["enable", "global", "newPages"]);
	var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url)); // domainCheck uses global lists, not storage directly
	var dpcloakindex = dpcloakindex || cloakedTabs.indexOf(tab.windowId+"|"+tab.id); // cloakedTabs is global
	if ((settings.enable == "true" || dpdomaincheck == '1') && dpdomaincheck != '0' && (settings.global == "true" || (settings.global == "false" && (dpcloakindex != -1 || settings.newPages == "Cloak" || dpdomaincheck == '1')))) return 'true';
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
async function domainHandler(domain,action) {
    // Initialize local storage - This should ideally be handled by setDefaultOptions ensuring they exist.
    // For safety, we can still check and default to empty arrays if not found, though it's less likely now.
    let { whiteList: storedWhiteList, blackList: storedBlackList } = await chrome.storage.local.get(['whiteList', 'blackList']);

    var tempWhitelist = [];
    try {
        tempWhitelist = JSON.parse(storedWhiteList || '[]');
    } catch (e) { console.error("Error parsing whitelist in domainHandler", e); }

    var tempBlacklist = [];
    try {
        tempBlacklist = JSON.parse(storedBlackList || '[]');
    } catch (e) { console.error("Error parsing blacklist in domainHandler", e); }

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
	
    await chrome.storage.local.set({
        'blackList': JSON.stringify(tempBlacklist),
        'whiteList': JSON.stringify(tempWhitelist)
    });

	blackList = tempBlacklist.sort(); // Update global in-memory copy
	whiteList = tempWhitelist.sort(); // Update global in-memory copy
	return false; // Original function returned false, keeping for compatibility if anything relies on it.
}
// ----- Options
async function optionExists(opt) {
    const result = await chrome.storage.local.get(opt);
	return (typeof result[opt] != "undefined");
}
async function defaultOptionValue(opt, val) {
    if (!(await optionExists(opt))) await chrome.storage.local.set({ [opt]: val });
}
async function setDefaultOptions() {
	await defaultOptionValue("version", version); // version is global, from manifest
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

	// fix hotkey shortcut if in old format (if using + as separator instead of space)
    let hotkeySettings = await chrome.storage.local.get("hotkey");
    let currentHotkey = hotkeySettings.hotkey;
	if (currentHotkey && currentHotkey.indexOf('+') != -1) {
		await chrome.storage.local.set({ "hotkey": currentHotkey.replace(/\+$/, "APLUSA").replace(/\+/g, " ").replace(/APLUSA/, "+") });
	}

	// delete old option if exists
	if (await optionExists("globalEnable"))
		await chrome.storage.local.remove("globalEnable");
	// delete old option if exists
	if (await optionExists("style"))
		await chrome.storage.local.remove("style");

	// set SFW Level to SFW (for new change in v0.46.3)
    let sfwModeSettings = await chrome.storage.local.get("sfwmode");
	if (sfwModeSettings.sfwmode == "true")
		await chrome.storage.local.set({ "sfwmode": "SFW" });

	if (!(await optionExists("blackList"))) await chrome.storage.local.set({'blackList': JSON.stringify([])});
	if (!(await optionExists("whiteList"))) await chrome.storage.local.set({'whiteList': JSON.stringify([])});
}
// Context Menu
// Wrapped in chrome.runtime.onInstalled
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install" || details.reason === "update") {
        // Ensure defaults are set before creating context menus that might rely on storage
        await setDefaultOptions(); 

        // Standard context menus
        // Note: onclick handlers are removed and logic moved to chrome.contextMenus.onClicked
        chrome.contextMenus.create({
            "id": "whitelistDomain", 
            "title": chrome.i18n.getMessage("whitelistdomain"), 
            "contexts": ['action','page']
        });
        chrome.contextMenus.create({
            "id": "blacklistDomain", 
            "title": chrome.i18n.getMessage("blacklistdomain"), 
            "contexts": ['action','page']
        });
        chrome.contextMenus.create({
            "id": "removeDomainFromList", // Updated ID
            "title": chrome.i18n.getMessage("removelist"), 
            "contexts": ['action','page']
        });
        
        // Conditional context menu from original dpContext logic
        const { showContext } = await chrome.storage.local.get("showContext");
        if (showContext == 'true') { 
            chrome.contextMenus.create({
                "id": "openLinkCloaked", // Updated ID
                "title": chrome.i18n.getMessage("opensafely"), 
                "contexts": ['link', 'image']
                // onclick handler removed
            }); 
        }
        // Note on dynamic menu updates: If showContext can change, a chrome.storage.onChanged listener 
        // would be needed to add/remove the "openLinkCloaked" menu item dynamically.
        // For now, it's set on install/update.
    }
    // On update, existing menus with the same ID are updated automatically.
    // If IDs were to change or menus deprecated, explicit removal would be needed.
});

// Centralized context menu click handler
chrome.contextMenus.onClicked.addListener(async function(info, tab) {
    if (!tab || !tab.url) { // Basic guard for tab and tab.url
        console.warn("Context menu clicked without a valid tab object or URL.", info, tab);
        // For 'openLinkCloaked', tab might be undefined if clicked from a different extension context,
        // but info.linkUrl or info.srcUrl should be present.
        if (info.menuItemId !== "openLinkCloaked") {
            return;
        }
    }

    // Ensure URL check for domain-specific actions
    if (info.menuItemId !== "openLinkCloaked" && tab.url.substring(0, 4) != 'http') {
        return;
    }

    switch (info.menuItemId) {
        case "whitelistDomain":
            await domainHandler(extractDomainFromURL(tab.url), 0);
            const { enable: enableWhitelist } = await chrome.storage.local.get("enable");
            if (enableWhitelist == "true") await magician('false', tab.id); 
            break;
        case "blacklistDomain":
            await domainHandler(extractDomainFromURL(tab.url), 1);
            const { enable: enableBlacklist } = await chrome.storage.local.get("enable");
            if (enableBlacklist == "true") await magician('true', tab.id);
            break;
        case "removeDomainFromList":
            await domainHandler(extractDomainFromURL(tab.url), 2); 
            const settings = await chrome.storage.local.get(["enable", "newPages", "global"]);
            if (settings.enable == "true")  {
                var flag = 'false';
                if (settings.newPages == 'Cloak' || settings.global == 'true') flag = 'true';
                await magician(flag, tab.id); 
            }
            break;
        case "openLinkCloaked":
            // The newCloak function needs `info` (for link/src URL) and potentially `tab` (for context, though less critical for just opening a new tab)
            // `tab` here is the tab where the context menu was clicked, not the new tab being opened.
            await newCloak(info, tab); // Pass original info and tab
            break;
    }
});


// Called by newCloak, which is now triggered from chrome.contextMenus.onClicked
async function newCloak(info, tab) { // `tab` is the originating tab, `info` contains linkUrl/srcUrl
	// Enable cloaking (in case its been disabled) and open the link in a new tab
	await chrome.storage.local.set({"enable": "true"});
    const settings = await chrome.storage.local.get("global"); // For recursiveCloak
    
    const createTabCallback = async (newTab) => {
        if (newTab && newTab.id) {
            cloakedTabs.push(newTab.windowId+"|"+newTab.id); 
            await persistTabLists(); // Persist change to cloakedTabs
            // recursiveCloak is async, ensure its execution is handled.
            // Since this callback itself is async, await can be used.
            await recursiveCloak('true', settings.global, newTab.id); 
        } else {
            console.error("newCloak: Failed to create tab or tab has no ID.");
        }
    };

	if (info.mediaType) {
        chrome.tabs.create({'url': info.srcUrl}, createTabCallback);
    } else {
	    chrome.tabs.create({'url': info.linkUrl}, createTabCallback);
    }
}
// dpContext related logic is now fully within onInstalled.
// ----- Main Functions
function checkChrome(url) {
	if (url.substring(0, 6) == 'chrome') return true;
	return false;
}
async function hotkeyChange() { // Made async due to storage access
    const settings = await chrome.storage.local.get(["enableToggle", "hotkey", "paranoidhotkey"]);
	chrome.windows.getAll({"populate":true}, function(windows) {
		windows.map(function(window) {
			window.tabs.map(function(tab) {
				if (!checkChrome(tab.url) && tab.id) {
                    try {
                        chrome.scripting.executeScript({
                            target: {tabId: tab.id, allFrames: true},
                            func: (enableToggle, hotkey, paranoidhotkey) => {
                                // This assumes hotkeySet is globally available in the content script context
                                if (typeof hotkeySet === "function") {
                                    hotkeySet(enableToggle, hotkey, paranoidhotkey);
                                } else {
                                    console.warn("hotkeySet function not found in content script for tab:", tab.id);
                                }
                            },
                            args: [settings.enableToggle, settings.hotkey, settings.paranoidhotkey]
                        }).catch(err => console.error("HotkeyChange: Error executing script in tab:", tab.id, err.message));
                    } catch (e) {
                        console.error("HotkeyChange: Generic error for tab:", tab.id, e.message);
                    }
                }
			});
		});
	});
}
async function optionsSaveTrigger(prevglob, newglob) { // Made async
    const { enable: currentEnableFromStorage } = await chrome.storage.local.get("enable");
	var enable = currentEnableFromStorage;
	var global = newglob;
	if (prevglob == 'true' && newglob == 'false') {
		global = 'true';
		enable = 'false'; // This 'enable' is a local var, not changing storage here directly
	}
	if (global == 'false') {
		for (var i=cloakedTabs.length-1; i>=0; --i) { // cloakedTabs is global
			await magician(enable, parseInt(cloakedTabs[i].split("|")[1])); // magician is async
		}
		if (enable == 'false') {
            cloakedTabs = []; // Persist this change
            await persistTabLists();
        }
	} else await recursiveCloak(enable, global); // recursiveCloak is async
}
async function recursiveCloak(enable, global, tabId) { // Made async
    const localEnable = enable; // Use a local copy of enable to avoid closure issues in async loops
	if (global == 'true') {
		chrome.windows.getAll({"populate":true}, function(windows) { // Callback here cannot be async without Promise.all
			windows.forEach(function(window) { // Changed map to forEach as we are not returning a new array
				window.tabs.forEach(async function(tab) { // Made inner callback async
					if (!checkChrome(tab.url) && tab.id) {
						var enabletemp = localEnable;
						var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url)); // Uses global lists
						// Ensure whitelisted or blacklisted tabs stay as they are
						if (enabletemp == 'true' && dpdomaincheck == '0') enabletemp = 'false';
						else if (enabletemp == 'false' && dpdomaincheck == '1') enabletemp = 'true';
						
                        await magician(enabletemp, tab.id); // magician is async
						
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
                        await persistTabLists(); // Persist changes to tab lists
					}
				});
			});
		});
	} else {
		if (tabId) await magician(localEnable, tabId); // magician is async
	}
}
async function magician(enable, tabId) { // Made async
    if (!tabId) {
        console.warn("magician called with null tabId");
        return;
    }
	if (enable == 'true') {
        const { disableFavicons, hidePageTitles, pageTitleText } = await chrome.storage.local.get(["disableFavicons", "hidePageTitles", "pageTitleText"]);
        let scriptFunc;
        let scriptArgs = [];

        if (disableFavicons == 'true' && hidePageTitles == 'true') {
            scriptFunc = (text) => { if(typeof init === 'function') {init(); faviconblank(); replaceTitle(text); titleBind(text);} else console.warn('Magician: functions not found'); };
            scriptArgs = [pageTitleText];
        } else if (disableFavicons == 'true' && hidePageTitles != 'true') {
            scriptFunc = () => { if(typeof init === 'function') {init(); faviconblank(); titleRestore();} else console.warn('Magician: functions not found'); };
        } else if (disableFavicons != 'true' && hidePageTitles == 'true') {
            scriptFunc = (text) => { if(typeof init === 'function') {init(); faviconrestore(); replaceTitle(text); titleBind(text);} else console.warn('Magician: functions not found'); };
            scriptArgs = [pageTitleText];
        } else if (disableFavicons != 'true' && hidePageTitles != 'true') {
            scriptFunc = () => { if(typeof init === 'function') {init(); faviconrestore(); titleRestore();} else console.warn('Magician: functions not found'); };
        }

        if (scriptFunc) {
            try {
                await chrome.scripting.executeScript({
                    target: {tabId: tabId, allFrames: true},
                    func: scriptFunc,
                    args: scriptArgs
                }).catch(err => console.error("Magician (enable true): Error executing script in tab:", tabId, err.message, "Args:", scriptArgs));
            } catch (e) {
                 console.error("Magician (enable true): Generic error for tab:", tabId, e.message);
            }
        }
	} else { // enable == 'false'
        try {
            await chrome.scripting.executeScript({
                target: {tabId: tabId, allFrames: true},
                func: () => { if(typeof removeCss === 'function') removeCss(); else console.warn('Magician: removeCss not found'); }
            }).catch(err => console.error("Magician (enable false): Error executing script in tab:", tabId, err.message));
        } catch (e) {
            console.error("Magician (enable false): Generic error for tab:", tabId, e.message);
        }
    }
    const settings = await chrome.storage.local.get("showIcon");
    console.log("[magician] dpicon value:", dpicon, "dptitle value:", dptitle, "tabId:", tabId, "enable:", enable);

	if (settings.showIcon == 'true') {
        if (typeof dpicon !== 'string' || !dpicon) {
            console.warn("[magician] dpicon is not valid (undefined or empty). Skipping setIcon. Value:", dpicon);
            // Optionally set a default fallback icon if dpicon is not ready
            // chrome.action.setIcon({path: "img/icon16.png", tabId: tabId}); 
        } else {
            let iconPath = "img/addressicon/"+dpicon+(enable == 'true' ? ".png" : "-disabled.png");
            console.log("[magician] Attempting to set icon path:", iconPath);
            try {
                chrome.action.setIcon({path: iconPath, tabId: tabId});
            } catch (e) {
                console.error("[magician] Error in setIcon:", e, "Path:", iconPath, "Tab ID:", tabId);
            }
        }
        // Set title regardless of icon success, if dptitle is valid
        if (typeof dptitle === 'string') {
            chrome.action.setTitle({title: dptitle, tabId: tabId});
        } else {
            console.warn("[magician] dptitle is not valid. Skipping setTitle. Value:", dptitle);
        }
        if (tabId) chrome.action.enable(tabId);
	} else {
        if (tabId) {
            chrome.action.disable(tabId);
        }
    }
}
async function dpHandle(tab) { // Made async
	if (checkChrome(tab.url)) return;
    let settings = await chrome.storage.local.get(["global", "enable"]); // Get settings first

	if (settings.global == "true" && domainCheck(extractDomainFromURL(tab.url)) != 1) { // domainCheck uses global lists
		if (settings.enable == "true") {
			await recursiveCloak('false', 'true'); // recursiveCloak is async
			await chrome.storage.local.set({enable: "false"});
		} else {
			await recursiveCloak('true', 'true'); // recursiveCloak is async
			await chrome.storage.local.set({enable: "true"});
		}
	} else {
		var dpTabId = tab.windowId+"|"+tab.id;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId); // cloakedTabs is global
		var dpuncloakindex = uncloakedTabs.indexOf(dpTabId); // uncloakedTabs is global
		await chrome.storage.local.set({enable: "true"}); // Set enable to true for non-global toggles

		if (dpcloakindex != -1) {
			await magician('false', tab.id); // magician is async
			if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
			cloakedTabs.splice(dpcloakindex, 1);
		} else {
			await magician('true', tab.id); // magician is async
			cloakedTabs.push(dpTabId);
			if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
		}
        await persistTabLists(); // Persist changes to tab lists
	}
}
async function setDPIcon() { // Made async
	// dpicon, dptitle will be loaded from storage
    const settings = await chrome.storage.local.get(["iconType", "iconTitle", "showIcon"]);
    dpicon = settings.iconType;
    dptitle = settings.iconTitle;

	chrome.windows.getAll({"populate":true}, function(windows) {
		windows.map(function(window) {
			window.tabs.map(function(tab) {
                if (!tab.id) return; // Defensive check
				if (cloakedTabs.indexOf(tab.windowId+"|"+tab.id) != -1) chrome.action.setIcon({path: "img/addressicon/"+dpicon+".png", tabId: tab.id});
				else chrome.action.setIcon({path: "img/addressicon/"+dpicon+"-disabled.png", tabId: tab.id});
				chrome.action.setTitle({title: dptitle, tabId: tab.id});
				if (settings.showIcon == 'true') {
                    if (typeof dpicon === 'string' && dpicon) { // Guard for dpicon
                        if (cloakedTabs.indexOf(tab.windowId+"|"+tab.id) != -1) chrome.action.setIcon({path: "img/addressicon/"+dpicon+".png", tabId: tab.id});
                        else chrome.action.setIcon({path: "img/addressicon/"+dpicon+"-disabled.png", tabId: tab.id});
                    } else {
                        console.warn("[setDPIcon loop] dpicon not valid, skipping setIcon. Value:", dpicon);
                    }
                    if (typeof dptitle === 'string') { // Guard for dptitle
                        chrome.action.setTitle({title: dptitle, tabId: tab.id});
                    }
                    chrome.action.enable(tab.id);
                } else {
                    chrome.action.disable(tab.id);
                }
			});
		});
	});
}
async function initLists() {
    const result = await chrome.storage.local.get(['blackList', 'whiteList']);
    // setDefaultOptions should ensure these are initialized as stringified empty arrays if not present
    try {
        blackList = JSON.parse(result.blackList || '[]').sort();
        whiteList = JSON.parse(result.whiteList || '[]').sort();
    } catch (e) {
        console.error("Error parsing blacklist/whitelist from storage:", e);
        blackList = [];
        whiteList = [];
    }
}
// ----- Request library to support content script communication
chrome.tabs.onUpdated.addListener(async function(tabid, changeinfo, tab) { // Made async
	if (changeinfo.status == "loading") {
        if (!tabid) { console.warn("onUpdated: null tabid"); return; }
		var dpTabId = tab.windowId+"|"+tabid;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId); 
		var current_enable_status = await enabled(tab, dpcloakindex); 
        const { showIcon: currentShowIcon } = await chrome.storage.local.get("showIcon"); 

		if (currentShowIcon == "true") {
            if (typeof dpicon === 'string' && dpicon) { // Guard for dpicon
                if (current_enable_status == "true") chrome.action.setIcon({path: "img/addressicon/"+dpicon+".png", tabId: tabid});
                else chrome.action.setIcon({path: "img/addressicon/"+dpicon+"-disabled.png", tabId: tabid});
            } else {
                 console.warn("[onUpdated] dpicon not valid, skipping setIcon. Value:", dpicon);
            }
            if (typeof dptitle === 'string') { // Guard for dptitle
                chrome.action.setTitle({title: dptitle, tabId: tabid});
            }
            try { chrome.action.enable(tabid); } catch(e) { console.warn("Failed to enable action for tab", tabid, e.message); }
		} else {
            try { 
                chrome.action.disable(tabid);
            } catch(e) { console.warn("Failed to disable action for tab", tabid, e.message); }
        }
		if (checkChrome(tab.url)) return;
		var dpuncloakindex = uncloakedTabs.indexOf(dpTabId); 
        const storeSettings = await chrome.storage.local.get(["global", "enable", "enableStickiness"]);

		if (current_enable_status == "true") {
			await magician('true', tabid); // magician itself handles dpicon checks now
			if (storeSettings.global == "false" && storeSettings.enable == "false") await chrome.storage.local.set({enable: "true"});
			if (dpcloakindex == -1) cloakedTabs.push(dpTabId);
			if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
            await persistTabLists();
		} else {
			if (storeSettings.enableStickiness == "true") {
				if (tab.openerTabId) {
                    const domainCheckResult = domainCheck(extractDomainFromURL(tab.url)); // Uses global lists
					if (cloakedTabs.indexOf(tab.windowId+"|"+tab.openerTabId) != -1 && dpuncloakindex == -1) {
						if (domainCheckResult != '0') {
							await magician('true', tabid);
							cloakedTabs.push(dpTabId);
                            await persistTabLists();
							return;
						}
					}
					if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
					if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
                    await persistTabLists();
				} else {
                    // chrome.tabs.query needs to be handled carefully with async/await
                    // It's better to wrap it in a new Promise if we need to await its result directly here.
                    // Or, ensure the logic depending on it is within its callback.
                    // For now, assuming the original logic flow is acceptable if query callback is async.
					chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) { 
                        if (!tabs || tabs.length === 0 || !tabs[0].id) { console.warn("onUpdated: query returned no active tab or tab with no id."); return; }
                        const activeTab = tabs[0];
                        const domainCheckResult = domainCheck(extractDomainFromURL(tab.url)); // Uses global lists
						if (activeTab.windowId == tab.windowId && cloakedTabs.indexOf(activeTab.windowId+"|"+activeTab.id) != -1 && dpuncloakindex == -1) {
							if (domainCheckResult != '0') {
								await magician('true', tabid);
								cloakedTabs.push(dpTabId);
                                await persistTabLists();
								return;
							}
						}
						if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
						if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
                        await persistTabLists();
					});
				}
			}
		}
	}
});	
chrome.tabs.onRemoved.addListener(async function(tabid, windowInfo) { // Made async
	var dpTabId = windowInfo.windowId+"|"+tabid;
	var dpcloakindex = cloakedTabs.indexOf(dpTabId);
	var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
	if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
	if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
    await persistTabLists(); // Persist changes
});

var requestDispatchTable = {
	"get-enabled": async function(request, sender, sendResponse) { // Made async
        if (!sender.tab || !sender.tab.id) { // Guard against missing tab or tab.id
             sendResponse({error: "Missing tab information"}); return true;
        }
		var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var currentEnable = await enabled(sender.tab, dpcloakindex); 
		if (currentEnable == 'true' && dpcloakindex == -1) {
            cloakedTabs.push(dpTabId); 
            await persistTabLists();
        }
        const settings = await chrome.storage.local.get(["s_bg", "disableFavicons", "hidePageTitles", "pageTitleText", "enableToggle", "hotkey", "paranoidhotkey"]);
		sendResponse({enable: currentEnable, background: settings.s_bg, favicon: settings.disableFavicons, hidePageTitles: settings.hidePageTitles, pageTitleText: settings.pageTitleText, enableToggle: settings.enableToggle, hotkey: settings.hotkey, paranoidhotkey: settings.paranoidhotkey});
        return true; 
	},
	"toggle": async function(request, sender, sendResponse) { // Made async
        if (!sender.tab || !sender.tab.id) { sendResponse({error: "Missing tab info"}); return true;}
        let settings = await chrome.storage.local.get(["savedsfwmode", "sfwmode", "global"]);
		if (settings.savedsfwmode != "") {
			await chrome.storage.local.set({sfwmode: settings.savedsfwmode, savedsfwmode: ""});
			if (settings.global == "true") await recursiveCloak('true', 'true'); 
			else {
				await magician('true', sender.tab.id); 
				var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
				var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
				if (cloakedTabs.indexOf(dpTabId) == -1) cloakedTabs.push(dpTabId);
                await persistTabLists(); 
			}
			await chrome.storage.local.set({enable: "true"});
		} else {
			await dpHandle(sender.tab); 
		}
        sendResponse({}); 
        return true; 
	},
	"toggleparanoid": async function(request, sender, sendResponse) { // Made async
        if (!sender.tab || !sender.tab.id) { sendResponse({error: "Missing tab info"}); return true;}
        let settings = await chrome.storage.local.get(["savedsfwmode", "sfwmode", "global"]);
		if (settings.savedsfwmode == "") {
			await chrome.storage.local.set({savedsfwmode: settings.sfwmode, sfwmode: "Paranoid"});
			if (settings.global == "true") await recursiveCloak('true', 'true'); 
			else {
				await magician('true', sender.tab.id); 
				var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
				var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
				if (cloakedTabs.indexOf(dpTabId) == -1) cloakedTabs.push(dpTabId);
                await persistTabLists(); 
			}
			await chrome.storage.local.set({enable: "true"});
		} else {
			await chrome.storage.local.set({sfwmode: settings.savedsfwmode, savedsfwmode: ""});
			await dpHandle(sender.tab); 
		}
        sendResponse({}); 
        return true; 
	},
	"get-settings": async function(request, sender, sendResponse) { // Made async
        if (!sender.tab) { sendResponse({error: "Missing tab info"}); return true;}
		var currentEnable, fontface;
        const settings = await chrome.storage.local.get([
            "font", "customfont", "global", "sfwmode", "fontsize", "showUnderline",
            "s_bg", "s_text", "s_table", "s_link", "removeBold", "opacity1",
            "opacity2", "collapseimage", "maxheight", "maxwidth", "customcss"
        ]);

		if (settings.font == '-Custom-') {
			if (settings.customfont) fontface = settings.customfont;
			else fontface = 'Arial';
		} else fontface = settings.font;

		if (settings.global == "false") currentEnable = 'true';
		else currentEnable = await enabled(sender.tab); 

		sendResponse({
            enable: currentEnable, sfwmode: settings.sfwmode, font: fontface, fontsize: settings.fontsize,
            underline: settings.showUnderline, background: settings.s_bg, text: settings.s_text,
            table: settings.s_table, link: settings.s_link, bold: settings.removeBold,
            opacity1: settings.opacity1, opacity2: settings.opacity2, collapseimage: settings.collapseimage,
            maxheight: settings.maxheight, maxwidth: settings.maxwidth, customcss: settings.customcss
        });
        return true; 
	},
    // Handlers for messages from options.js
    "setDPIcon": async function(request, sender, sendResponse) {
        await setDPIcon();
        sendResponse({status: "DPIcon updated"});
        return true;
    },
    "hotkeyChange": async function(request, sender, sendResponse) {
        await hotkeyChange();
        sendResponse({status: "Hotkey settings applied"});
        return true;
    },
    "optionsSaveTrigger": async function(request, sender, sendResponse) {
        if (request.oldGlobalValue !== undefined && request.newGlobalValue !== undefined) {
            await optionsSaveTrigger(request.oldGlobalValue, request.newGlobalValue);
            sendResponse({status: "Options trigger processed"});
        } else {
            sendResponse({error: "Missing global values for optionsSaveTrigger"});
        }
        return true;
    },
    "domainHandler": async function(request, sender, sendResponse) {
        if (request.domain !== undefined && request.listType !== undefined) {
            await domainHandler(request.domain, request.listType);
            sendResponse({status: "Domain handler processed"});
        } else {
            sendResponse({error: "Missing domain or listType for domainHandler"});
        }
        return true;
    },
    "initLists": async function(request, sender, sendResponse) {
        await initLists();
        sendResponse({status: "Lists re-initialized"});
        return true;
    }
}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Check if the message is from our options page or content script (for reqtype)
    // or if it's a new action-based message from options.js
	if (request.reqtype && request.reqtype in requestDispatchTable) {
        requestDispatchTable[request.reqtype](request, sender, sendResponse);
        return true; 
    } else if (request.action && request.action in requestDispatchTable) {
        requestDispatchTable[request.action](request, sender, sendResponse);
        return true;
    }
    // Optional: send a response for unhandled messages or let them time out.
    // console.warn("Unhandled message:", request);
    // sendResponse({error: "Unknown request type or action"}); 
    // Returning false or undefined means the channel is closed synchronously.
});
// ----- If action icon is clicked, either enable or disable the cloak
chrome.action.onClicked.addListener(async function(tab) { // dpHandle is async
	await dpHandle(tab);
});

// ----- Helper functions for tab list persistence
async function persistTabLists() {
    try {
        await chrome.storage.local.set({ 
            cloakedTabs: JSON.stringify(cloakedTabs), 
            uncloakedTabs: JSON.stringify(uncloakedTabs) 
        });
    } catch (e) {
        console.error("Error persisting tab lists:", e);
    }
}

async function loadTabLists() {
    try {
        const result = await chrome.storage.local.get(['cloakedTabs', 'uncloakedTabs']);
        cloakedTabs = result.cloakedTabs ? JSON.parse(result.cloakedTabs) : [];
        uncloakedTabs = result.uncloakedTabs ? JSON.parse(result.uncloakedTabs) : [];
    } catch (e) {
        console.error("Error loading tab lists:", e);
        cloakedTabs = [];
        uncloakedTabs = [];
    }
}

// ----- Initialization function
async function initializeExtension() {
    await loadTabLists();      // Load persisted tab states first
    await setDefaultOptions(); 
    await initLists();         
    await setDPIcon();         
    // dpContext() is now primarily handled in chrome.runtime.onInstalled.
    const storeSettings = await chrome.storage.local.get(["version", "showUpdateNotifications"]); // Renamed to storeSettings
    const manifestVersion = chrome.runtime.getManifest().version;
    if ((!storeSettings.version || storeSettings.version != manifestVersion) && storeSettings.showUpdateNotifications == 'true') {
        chrome.tabs.create({ url: chrome.runtime.getURL('updated.html'), active: false });
        await chrome.storage.local.set({ version: manifestVersion });
    }
}

// Call initialization
initializeExtension();

// Listener for updates, no changes needed here other than it's good practice.
chrome.runtime.onUpdateAvailable.addListener(function (details) {
	// an update is available, but wait until user restarts their browser as to not disrupt their current session and cloaked tabs.
});