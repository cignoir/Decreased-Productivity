// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph

var version = "0.46.56.12";
var error = false;
var oldglobalstate = false;
var settingnames = [];
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

// Send message to background script
async function sendMessageToBackground(message) {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response) => {
			resolve(response);
		});
	});
}

document.addEventListener('DOMContentLoaded', async function () {
	await initializeStorage();
	loadOptions();
	
	// Event listeners
	$(".i18_save, .i18_savecolours").click(saveOptions);
	$("#enable, #enableToggle, #enableStickiness, #disableFavicons, #hidePageTitles, #showUnderline, #collapseimage, #removeBold, #showContext, #showIcon, #showUpdateNotifications").click(saveOptions);
	$("#iconTitle, #customcss").blur(saveOptions);
	$("#global").click(saveOptions);
	$("#newPages, #sfwmode, #font, #iconType").change(saveOptions);
	$(".i18_close").click(closeOptions);
});

function loadCheckbox(id) {
	document.getElementById(id).checked = typeof storageCache[id] == "undefined" ? false : storageCache[id] == "true";
}

function loadElement(id) {
	$("#"+id).val(storageCache[id]);
}

async function saveCheckbox(id) {
	await setStorageValue(id, document.getElementById(id).checked);
}

async function saveElement(id) {
	await setStorageValue(id, $("#"+id).val());
}

function closeOptions() {
	window.open('', '_self', '');window.close();
}

function loadOptions() {
	document.title = chrome.i18n.getMessage("dpoptions");
	oldglobalstate = storageCache["global"];
	loadCheckbox("enable");
	loadCheckbox("global");
	loadCheckbox("enableToggle");
	loadElement("hotkey");
	loadElement("paranoidhotkey");
	loadElement("newPages");
	loadElement("sfwmode");
	loadElement("opacity1");
	loadElement("opacity2");
	loadCheckbox("collapseimage");
	loadCheckbox("showIcon");
	loadElement("iconType");
	loadElement("iconTitle");
	loadCheckbox("disableFavicons");
	loadCheckbox("hidePageTitles");
	loadElement("pageTitleText");
	loadElement("maxwidth");
	loadElement("maxheight");
	loadCheckbox("enableStickiness");
	loadCheckbox("showContext");
	loadCheckbox("showUnderline");
	loadCheckbox("removeBold");
	loadCheckbox("showUpdateNotifications");
	loadElement("font");
	loadElement("customfont");
	loadElement("fontsize");
	loadElement("s_text");
	loadElement("s_bg");
	loadElement("s_table");
	loadElement("s_link");
	loadElement("customcss");
	listUpdate();
}

function isValidColor(hex) { 
	var strPattern = /^[0-9a-f]{3,6}$/i; 
	return strPattern.test(hex); 
}

async function saveOptions() {
	if (!$('#enable').is(':checked') && !$('#global').is(':checked')) {
		$('#enable').prop('checked', true);
	}
	if (!$("#hotkey").val()) $("#hotkey").val('CTRL F12');
	if (!$("#paranoidhotkey").val()) $("#paranoidhotkey").val('ALT P');
	
	await saveCheckbox("enable");
	await saveCheckbox("global");
	await saveCheckbox("enableToggle");
	await saveElement("hotkey");
	await saveElement("paranoidhotkey");
	await saveElement("opacity1");
	await saveElement("opacity2");
	await saveCheckbox("collapseimage");
	await saveElement("newPages");
	await saveElement("sfwmode");
	await saveCheckbox("showIcon");
	await saveElement("iconType");
	await saveElement("iconTitle");
	await saveCheckbox("disableFavicons");
	await saveCheckbox("hidePageTitles");
	await saveElement("pageTitleText");
	await saveElement("maxwidth");
	await saveElement("maxheight");
	await saveCheckbox("enableStickiness");
	await saveCheckbox("showContext");
	await saveCheckbox("showUnderline");
	await saveCheckbox("removeBold");
	await saveCheckbox("showUpdateNotifications");
	await saveElement("font");
	await saveElement("customfont");
	await saveElement("fontsize");
	
	if (isValidColor($('#s_text').val()) && isValidColor($('#s_bg').val()) && isValidColor($('#s_table').val()) && isValidColor($('#s_link').val())) {
		await saveElement("s_text");
		await saveElement("s_bg");
		await saveElement("s_table");
		await saveElement("s_link");
	} else {
		error = true;
	}
	$("#customcss").val($("#customcss").val().replace(/\s*<([^>]+)>\s*/ig, ""));
	await saveElement("customcss");
	
	// Apply new settings
	await sendMessageToBackground({reqtype: "optionsSaveTrigger", prevglob: oldglobalstate, newglob: storageCache["global"]});
	await sendMessageToBackground({reqtype: "hotkeyChange"});
	oldglobalstate = storageCache["global"];
	
	if (!error) notification(chrome.i18n.getMessage("saved"));
	else notification(chrome.i18n.getMessage("invalidcolour"));
}

function notification(msg) {
	$('#message').html(msg).stop().fadeIn("slow").delay(2000).fadeOut("slow");
}

// Domain list functions
async function addList(type) {
	var domain = $('#url').val();
	domain = domain.toLowerCase();
	
	if (!domain.match(/^(?:[\-\w\*\?]+(\.[\-\w\*\?]+)*|((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})|\[[A-Fa-f0-9:.]+\])?$/g)) {
		$('#listMsg').html(chrome.i18n.getMessage("invaliddomain")).stop().fadeIn("slow").delay(2000).fadeOut("slow");
	} else {
		await sendMessageToBackground({reqtype: "domainHandler", domain: domain, action: type});
		$('#url').val('');
		$('#listMsg').html([chrome.i18n.getMessage("whitelisted"),chrome.i18n.getMessage("blacklisted")][type]+' '+domain+'.').stop().fadeIn("slow").delay(2000).fadeOut("slow");
		await listUpdate();
		$('#url').focus();
	}
	return false;
}

async function domainRemover(domain) {
	await sendMessageToBackground({reqtype: "domainHandler", domain: domain, action: 2});
	await listUpdate();
	return false;
}

async function listUpdate() {
	var whiteList = JSON.parse(await getStorageValue('whiteList', '[]'));
	var blackList = JSON.parse(await getStorageValue('blackList', '[]'));
	
	var whitelistCompiled = '';
	if(whiteList.length==0) whitelistCompiled = '['+chrome.i18n.getMessage("empty")+']';
	else {
		whiteList.sort();
		for(var i in whiteList) whitelistCompiled += '<div class="listentry">'+whiteList[i]+' <a href="javascript:;" style="color:#f00;float:right;" rel="'+whiteList[i]+'" class="domainRemover">X</a></div>';
	}
	var blacklistCompiled = '';
	if (blackList.length==0) blacklistCompiled = '['+chrome.i18n.getMessage("empty")+']';
	else {
		blackList.sort();
		for(var i in blackList) blacklistCompiled += '<div class="listentry">'+blackList[i]+' <a href="javascript:;" style="color:#f00;float:right;" rel="'+blackList[i]+'" class="domainRemover">X</a></div>';
	}
	$('#whitelist').html(whitelistCompiled);
	$('#blacklist').html(blacklistCompiled);
	$(".domainRemover").unbind('click');
	$(".domainRemover").click(function() { domainRemover($(this).attr('rel'));});
	await sendMessageToBackground({reqtype: "initLists"});
}

async function listclear(type) {
	if (confirm([chrome.i18n.getMessage("removefromwhitelist"),chrome.i18n.getMessage("removefromblacklist")][type]+'?')) {
		await setStorageValue(['whiteList','blackList'][type], JSON.stringify([]));
		await listUpdate();
	}
	return false;
}

// Placeholder functions for compatibility
function opacitytest() {}
function intValidate(elm, val) {}
function is_int(value) { return true; }
function pageTitleValidation() {}
function fontsizeValidation() {}
function truncText(str) { return str; }
function updateDemo() {}
function stylePreset(s) {}
function revertColours() {}
function colorPickLoad(id) {}
function settingsall() {}
function selectAll(id) {}
function downloadtxt() {}
function settingsImport() {}
function updateExport() {}
function keyhandle(keypressed) {}
