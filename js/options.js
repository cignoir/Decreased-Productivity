// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph
var version = (function () {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', chrome.extension.getURL('manifest.json'), false);
	xhr.send(null);
	return JSON.parse(xhr.responseText).version;
}());
// var bkg = chrome.extension.getBackgroundPage(); // Removed for MV3
var error = false;
// var oldglobalstate = false; // Will be fetched from storage
var settingnames = []; // Used for export/import, will need to adapt

async function loadStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
            resolve(result);
        });
    });
}

async function saveStorage(items) {
    return new Promise((resolve) => {
        chrome.storage.local.set(items, () => {
            resolve();
        });
    });
}

document.addEventListener('DOMContentLoaded', async function () { // Made async
	$("#tabs").tabs();
	$("#o1").slider({min: 0, max: 1, step: 0.05, slide: function(event, ui) { $("#opacity1").val(ui.value); opacitytest(); }, stop: async function(event, ui) { // made async
		if (ui.value == 0) $("#collapseimageblock").show();
		else $("#collapseimageblock").hide();
		await saveOptions();
	}});
	$("#o2").slider({min: 0, max: 1, step: 0.05, slide: function(event, ui) { $("#opacity2").val(ui.value); opacitytest(); }, stop: async function(event, ui) { await saveOptions(); }}); // made async
	await loadOptions(); // Made async
	// colorPickLoad might need to be called after values are loaded if it depends on them.
	// Assuming colorPickLoad itself doesn't depend on initial storage values directly for setup.
	colorPickLoad("s_bg");
	colorPickLoad("s_text");
	colorPickLoad("s_link");
	colorPickLoad("s_table");
	$(".i18_save, .i18_savecolours").click(async function() { await saveOptions(); }); // made async
	$(".i18_revertcolours").click(revertColours); // revertColours will need async storage access
	$(".i18_addwhitelist").click(async function() { await addList(0); }); // made async
	$(".i18_addblacklist").click(async function() { await addList(1); }); // made async
	$(".i18_dpoptions").click(function() { location.href='options.html'; });
	$(".i18_clear").click(async function() { // made async
		if ($(this).parent().find('strong').hasClass('i18_whitelist')) {
			await listclear(0);
		} else {
			await listclear(1);
		}
	});
	$("#enable, #enableToggle, #enableStickiness, #disableFavicons, #hidePageTitles, #showUnderline, #collapseimage, #removeBold, #showContext, #showIcon, #showUpdateNotifications").click(async function() { await saveOptions(); }); // made async
	$("#iconTitle, #customcss").blur(async function() { await saveOptions(); }); // made async
	$("#s_bg, #s_text, #s_link, #s_table").keyup(updateDemo); // updateDemo reads from form, not storage directly
	$("#global").click(async function() { // made async
		await saveOptions();
	});
	$("#opacity1").blur(async function() { // made async
		await intValidate(this, 0.05); // intValidate calls saveOptions
		if (this.value == 0) $("#collapseimageblock").show();
		else $("#collapseimageblock").hide();
		opacitytest();
	});
	$("#opacity2").blur(async function() { // made async
		await intValidate(this, 0.5); // intValidate calls saveOptions
		opacitytest();
	});
	$("#maxwidth, #maxheight").blur(async function() { // made async
		await intValidate(this); // intValidate calls saveOptions
	});
	$("#pageTitleText").blur(pageTitleValidation); // pageTitleValidation calls saveOptions
	$("#font").change(async function() { // made async
		//if ($(this).val() == '-Unchanged-') $("#fontsize").parent().parent().hide();
		//else $("#fontsize").parent().parent().show();
		updateDemo(); // reads from form
		// await saveOptions(); // Implicitly saved by other handlers or main save button
	});
	// Hotkey
	var listener;
	var listener2;
	var keysettings = {
		is_solitary    : true,
		is_unordered    : true,
		is_exclusive    : true,
		prevent_repeat  : true, 
		is_sequence  : false,
		is_counting  : false
	};
	listener = new window.keypress.Listener($("#hotkey"), keysettings);
	listener.register_many(combos);
	listener2 = new window.keypress.Listener($("#paranoidhotkey"), keysettings);
	listener2.register_many(combos);
	$("#hotkeyrecord").click(function() {
		$("#hotkeyrecord").val(chrome.i18n.getMessage("hotkey_set"));
		$("#hotkey").removeAttr('disabled').select().focus();
	});
	$("#paranoidhotkeyrecord").click(function() {
		$("#paranoidhotkeyrecord").val(chrome.i18n.getMessage("hotkey_set"));
		$("#paranoidhotkey").removeAttr('disabled').select().focus();
	});
	//
	$("#iconType").change(function() {
		$("#sampleicon").attr('src', '../img/addressicon/'+$(this).val()+'.png');
	});
	$("#fontsize").change(fontsizeValidation);
	$("#newPages, #sfwmode, #font, #iconType").change(saveOptions);
	$("#s_preset").change(function() {
		stylePreset($(this).val());
	});
	$("#settingsall").click(settingsall);
	$("#importsettings").click(settingsImport);
	$("#savetxt").click(downloadtxt);
	$(".i18_close").click(closeOptions);
});
function keyhandle(keypressed) {
	keypressed = keypressed.toUpperCase();
	if ($("#hotkey").attr('disabled')) {
		if (keypressed != $("#hotkey").val()) {
			$("#paranoidhotkey").val(keypressed).attr('disabled', 'true');
			$("#paranoidhotkeyrecord").val(chrome.i18n.getMessage("hotkey_record"));
			saveOptions();
		}
	} else {
		if (keypressed != $("#paranoidhotkey").val()) {
			$("#hotkey").val(keypressed).attr('disabled', 'true');
			$("#hotkeyrecord").val(chrome.i18n.getMessage("hotkey_record"));
			await saveOptions();
		}
	}
}
async function loadCheckbox(id, settings) {
    const value = settings[id];
	document.getElementById(id).checked = typeof value == "undefined" ? false : value == "true" || value === true;
}

async function loadElement(id, settings, defaultValue = '') {
    const value = settings[id];
	$("#"+id).val(typeof value == "undefined" ? defaultValue : value);
}

async function saveCheckbox(id, itemsToSave) {
	itemsToSave[id] = document.getElementById(id).checked;
}

async function saveElement(id, itemsToSave) {
	itemsToSave[id] = $("#"+id).val();
}
function closeOptions() {
	window.open('', '_self', '');window.close();
}
function settingsall() {
	selectAll('settingsexport');
}
function selectAll(id) {
	$("#"+id).select();
}
function i18load() {
	$("#title").html("Decreased Productivity v"+version);
	$(".i18_default").html(chrome.i18n.getMessage("default"));
	$(".i18_enable").html(chrome.i18n.getMessage("enable"));
	$(".i18_enabled").html(chrome.i18n.getMessage("enabled"));
	$(".i18_disabled").html(chrome.i18n.getMessage("disabled"));
	$(".i18_globalmode").html(chrome.i18n.getMessage("globalmode"));
	$(".i18_globalmode2").html(chrome.i18n.getMessage("globalmode2"));
	$(".i18_globalmode3").html(chrome.i18n.getMessage("globalmode3"));
	$(".i18_cloak").html(chrome.i18n.getMessage("cloak"));
	$(".i18_uncloak").html(chrome.i18n.getMessage("uncloak"));
	$(".i18_level").html(chrome.i18n.getMessage("level"));
	$(".i18_paranoid").html(chrome.i18n.getMessage("paranoid"));
	$(".i18_sfw0").html(chrome.i18n.getMessage("sfw0"));
	$(".i18_sfw1").html(chrome.i18n.getMessage("sfw1"));
	$(".i18_sfw2").html(chrome.i18n.getMessage("sfw2"));
	$(".i18_nsfw").html(chrome.i18n.getMessage("nsfw"));
	$(".i18_toggle").html(chrome.i18n.getMessage("toggle"));
	$(".i18_toggle2").html(chrome.i18n.getMessage("toggle2"));
	$(".i18_toggle_hotkey").html(chrome.i18n.getMessage("hotkey"));
	$(".i18_toggle_paranoidhotkey").html(chrome.i18n.getMessage("paranoidhotkey"));
	$(".i18_hotkey_record").val(chrome.i18n.getMessage("hotkey_record"));
	$(".i18_opacity").html(chrome.i18n.getMessage("opacity"));
	$(".i18_collapseimage").html(chrome.i18n.getMessage("collapseimage"));
	$(".i18_opacity2").html(chrome.i18n.getMessage("opacity2"));
	$(".i18_unhovered").html(chrome.i18n.getMessage("unhovered"));
	$(".i18_hovered").html(chrome.i18n.getMessage("hovered"));
	$(".i18_stickiness").html(chrome.i18n.getMessage("stickiness"));
	$(".i18_stickiness2").html(chrome.i18n.getMessage("stickiness2"));
	$(".i18_favicons").html(chrome.i18n.getMessage("favicons"));
	$(".i18_hidetitles").html(chrome.i18n.getMessage("hidetitles"));
	$(".i18_showimages").html(chrome.i18n.getMessage("showimages"));
	$(".i18_showimages2").html(chrome.i18n.getMessage("showimages2"));
	$(".i18_showunderline").html(chrome.i18n.getMessage("showunderline"));
	$(".i18_removebold").html(chrome.i18n.getMessage("removebold"));
	$(".i18_showcontext").html(chrome.i18n.getMessage("showcontext"));
	$(".i18_showcontext2").html(chrome.i18n.getMessage("showcontext2"));
	$(".i18_showicon").html(chrome.i18n.getMessage("showicon"));
	$(".i18_showicon2").html(chrome.i18n.getMessage("showicon2"));
	$(".i18_showicon_type").html(chrome.i18n.getMessage("showicon_type"));
	$(".i18_showicon_type2").html(chrome.i18n.getMessage("showicon_type2"));
	$(".i18_showicon_title").html(chrome.i18n.getMessage("showicon_title"));
	$(".i18_showupdate").html(chrome.i18n.getMessage("showupdate"));
	$(".i18_showupdate2").html(chrome.i18n.getMessage("showupdate2"));
	$(".i18_font").html(chrome.i18n.getMessage("font"));
	$(".i18_customfont").html(chrome.i18n.getMessage("customfont"));
	$(".i18_fontsize").html(chrome.i18n.getMessage("fontsize"));
	$(".i18_color").html(chrome.i18n.getMessage("color"));
	$(".i18_colorpresets").html(chrome.i18n.getMessage("colorpresets"));
	$(".i18_colorpresetselect").html('-- '+chrome.i18n.getMessage("colorpresetselect")+' --');
	$(".i18_colorbackground").html(chrome.i18n.getMessage("colorbackground"));
	$(".i18_colortext").html(chrome.i18n.getMessage("colortext"));
	$(".i18_colorlink").html(chrome.i18n.getMessage("colorlink"));
	$(".i18_colortable").html(chrome.i18n.getMessage("colortable"));
	$(".i18_c1").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c2").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("gray"));
	$(".i18_c3").html(chrome.i18n.getMessage("gray")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c4").html(chrome.i18n.getMessage("lightred")+' - '+chrome.i18n.getMessage("paleblue"));
	$(".i18_c5").html(chrome.i18n.getMessage("darkbrown")+' - '+chrome.i18n.getMessage("offwhite"));
	$(".i18_c6").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c7").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("green"));
	$(".i18_c8").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("red"));
	$(".i18_c9").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("pink"));
	$(".i18_c10").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("green"));
	$(".i18_demo").html(chrome.i18n.getMessage("demo"));
	$(".i18_test1").html(chrome.i18n.getMessage("test1"));
	$(".i18_test2").html(chrome.i18n.getMessage("test2"));
	$(".i18_savecolours").val(chrome.i18n.getMessage("savecolours"));
	$(".i18_revertcolours").val(chrome.i18n.getMessage("revertcolours"));
	$(".i18_domain").html(chrome.i18n.getMessage("domain"));
	$(".i18_addwhitelist").val("+ "+chrome.i18n.getMessage("whitelist"));
	$(".i18_addblacklist").val("+ "+chrome.i18n.getMessage("blacklist"));
	$(".i18_whitelist").html(chrome.i18n.getMessage("whitelist"));
	$(".i18_blacklist").html(chrome.i18n.getMessage("blacklist"));
	$(".i18_clear").html(chrome.i18n.getMessage("clear"));
	$(".i18_save").val(chrome.i18n.getMessage("save"));
	$(".i18_close").val(chrome.i18n.getMessage("close"));
	$(".i18_people").html(chrome.i18n.getMessage("people"));
	$(".i18_translators").html(chrome.i18n.getMessage("translators"));
	$(".i18_help").html(chrome.i18n.getMessage("help"));
	$(".i18_support").html(chrome.i18n.getMessage("support"));
	$("#customcssdesc").html(chrome.i18n.getMessage("customcss"));
	$(".i18_supportimg").attr({alt: chrome.i18n.getMessage("support"), title:  chrome.i18n.getMessage("support")});
}
function loadOptions() {
	document.title = chrome.i18n.getMessage("dpoptions");
	i18load();
    // Define all keys to fetch for options
    const optionKeys = [
        "global", "enable", "enableToggle", "hotkey", "paranoidhotkey", "newPages", "sfwmode",
        "opacity1", "opacity2", "collapseimage", "showIcon", "iconType", "iconTitle",
        "disableFavicons", "hidePageTitles", "pageTitleText", "maxwidth", "maxheight",
        "enableStickiness", "showContext", "showUnderline", "removeBold", "showUpdateNotifications",
        "font", "customfont", "fontsize", "s_text", "s_bg", "s_table", "s_link", "customcss",
        "whiteList", "blackList" // For listUpdate and updateExport
    ];
    const settings = await loadStorage(optionKeys);
    const oldglobalstate = settings.global; // Store for later comparison

	await loadCheckbox("enable", settings);
	await loadCheckbox("global", settings);
	await loadCheckbox("enableToggle", settings);
	await loadElement("hotkey", settings, 'CTRL F12');
	await loadElement("paranoidhotkey", settings, 'ALT P');
	if ($("#hotkey").val()) $("#hotkey").val($("#hotkey").val().toUpperCase());
	if ($("#paranoidhotkey").val()) $("#paranoidhotkey").val($("#paranoidhotkey").val().toUpperCase());
	await loadElement("newPages", settings, 'Uncloak');
	await loadElement("sfwmode", settings, 'SFW');
	await loadElement("opacity1", settings, '0.05');
	await loadElement("opacity2", settings, '0.5');
	await loadCheckbox("collapseimage", settings);
	await loadCheckbox("showIcon", settings);
	await loadElement("iconType", settings, 'coffee');
	await loadElement("iconTitle", settings, 'Decreased Productivity');
	await loadCheckbox("disableFavicons", settings);
	await loadCheckbox("hidePageTitles", settings);
	await loadElement("pageTitleText", settings, 'Google Chrome');
	await loadElement("maxwidth", settings, '0');
	await loadElement("maxheight", settings, '0');
	await loadCheckbox("enableStickiness", settings);
	await loadCheckbox("showContext", settings);
	await loadCheckbox("showUnderline", settings);
	await loadCheckbox("removeBold", settings);
	await loadCheckbox("showUpdateNotifications", settings);
	await loadElement("font", settings, 'Arial');
	await loadElement("customfont", settings, '');
	await loadElement("fontsize", settings, '12');
	await loadElement("s_text", settings, '000000');
	await loadElement("s_bg", settings, 'FFFFFF');
	await loadElement("s_table", settings, 'cccccc');
	await loadElement("s_link", settings, '000099');
	
    // UI conditional visibility logic based on loaded settings
	if ($('#global').is(':checked')) $("#newPagesRow").css('display', 'none'); else $("#newPagesRow").show();
	if ($('#showIcon').is(':checked')) $(".discreeticonrow").show(); else $(".discreeticonrow").hide();
	if ($('#enableToggle').is(':checked')) $("#hotkeyrow, #paranoidhotkeyrow").show(); else $("#hotkeyrow, #paranoidhotkeyrow").hide();
	$("#sampleicon").attr('src', '../img/addressicon/'+$('#iconType').val()+'.png');
	if (!$('#hidePageTitles').is(':checked')) $("#pageTitle").css('display', 'none'); else $("#pageTitle").show();
	if ($('#opacity1').val() == 0) $("#collapseimageblock").css('display', 'block'); else $("#collapseimageblock").hide();
	if (['SFW', 'SFW1', 'SFW2'].includes($('#sfwmode').val())) $("#opacityrow").show(); else $("#opacityrow").hide();
	if ($('#font').val() == '-Custom-') {
		if ($("#customfont").val()) $("#customfontrow").show();
		else { // Fallback if custom font is selected but empty
			$('#font').val('Arial'); 
			$("#customfontrow").hide();
		}
	} else $("#customfontrow").hide();
	await loadElement("customcss", settings, '');
	
    await listUpdate(settings.whiteList, settings.blackList); // Pass lists to avoid re-reading
	opacitytest(); // Reads from form, should be fine
	updateDemo(); // Reads from form, should be fine
    await updateExport(); // updateExport will need to be async and use settings
}
function isValidColor(hex) { 
	var strPattern = /^[0-9a-fA-F]{3,6}$/i; // Made case-insensitive for hex
	return strPattern.test(hex); 
}

async function saveOptions() {
	updateDemo(); // Reads from form
    let itemsToSave = {};
    let currentError = false; // local error flag for this save operation

	if (!$('#enable').is(':checked') && !$('#global').is(':checked')) {
		$('#enable').prop('checked', true); // Ensure enable is checked if global is not
	}

    // Update UI visibility based on current form values before saving
	if ($('#global').is(':checked')) $("#newPagesRow").css('display', 'none'); else $("#newPagesRow").show();
	if ($('#enableToggle').is(':checked')) $("#hotkeyrow, #paranoidhotkeyrow").show(); else $("#hotkeyrow, #paranoidhotkeyrow").hide();
	if ($('#hidePageTitles').is(':checked')) $("#pageTitle").show(); else $("#pageTitle").hide();
	if (['SFW', 'SFW1', 'SFW2'].includes($('#sfwmode').val())) $("#opacityrow").fadeIn("fast"); else $("#opacityrow").hide();
	if ($('#font').val() == '-Custom-') $("#customfontrow").show(); else $("#customfontrow").hide();
	
    // Ensure hotkeys have values
	if (!$("#hotkey").val()) $("#hotkey").val('CTRL F12');
	if (!$("#paranoidhotkey").val()) $("#paranoidhotkey").val('ALT P');

    // Collect all values to save
	await saveCheckbox("enable", itemsToSave);
	await saveCheckbox("global", itemsToSave);
	await saveCheckbox("enableToggle", itemsToSave);
	await saveElement("hotkey", itemsToSave);
	await saveElement("paranoidhotkey", itemsToSave);
	await saveElement("opacity1", itemsToSave);
	await saveElement("opacity2", itemsToSave);
	await saveCheckbox("collapseimage", itemsToSave);
	await saveElement("newPages", itemsToSave);
	await saveElement("sfwmode", itemsToSave);
	await saveCheckbox("showIcon", itemsToSave);
	await saveElement("iconType", itemsToSave);
	await saveElement("iconTitle", itemsToSave);
	await saveCheckbox("disableFavicons", itemsToSave);
	await saveCheckbox("hidePageTitles", itemsToSave);
	await saveElement("pageTitleText", itemsToSave);
	await saveElement("maxwidth", itemsToSave);
	await saveElement("maxheight", itemsToSave);
	await saveCheckbox("enableStickiness", itemsToSave);
	await saveCheckbox("showContext", itemsToSave);
	await saveCheckbox("showUnderline", itemsToSave);
	await saveCheckbox("removeBold", itemsToSave);
	await saveCheckbox("showUpdateNotifications", itemsToSave);
	await saveElement("font", itemsToSave);
	await saveElement("customfont", itemsToSave);
	await saveElement("fontsize", itemsToSave);

	if (isValidColor($('#s_text').val()) && isValidColor($('#s_bg').val()) && isValidColor($('#s_table').val()) && isValidColor($('#s_link').val())) {
		await saveElement("s_text", itemsToSave);
		await saveElement("s_bg", itemsToSave);
		await saveElement("s_table", itemsToSave);
		await saveElement("s_link", itemsToSave);
	} else {
		currentError = true; // Use local error flag
	}
	$("#customcss").val($("#customcss").val().replace(/\s*<([^>]+)>\s*/ig, "")); // Sanitize
	await saveElement("customcss", itemsToSave);

    // Fetch old global state for optionsSaveTrigger
    const { global: oldGlobalStateValue } = await loadStorage("global");

    // Save all collected items
    await saveStorage(itemsToSave);
    await updateExport(); // Update the export text area

	// Notify background script of changes
    // These messages will need to be handled in background.js
    if (itemsToSave.showIcon !== undefined || itemsToSave.iconType !== undefined || itemsToSave.iconTitle !== undefined) {
        chrome.runtime.sendMessage({ action: "setDPIcon" });
    }
    if (itemsToSave.hotkey !== undefined || itemsToSave.paranoidhotkey !== undefined || itemsToSave.enableToggle !== undefined) {
        chrome.runtime.sendMessage({ action: "hotkeyChange" });
    }
    // Generic trigger for other options, passing old and new global state
    chrome.runtime.sendMessage({ action: "optionsSaveTrigger", oldGlobalValue: oldGlobalStateValue, newGlobalValue: itemsToSave.global });


	if (!currentError) notification(chrome.i18n.getMessage("saved"));
	else notification(chrome.i18n.getMessage("invalidcolour"));
}

async function opacitytest() { // Made async as it calls saveOptions indirectly via slider stop
	$("#o1").slider("option", "value", $("#opacity1").val());
	$("#o2").slider("option", "value", $("#opacity2").val());
	$(".sampleimage").css({"opacity": $("#opacity1").val()});
	$(".sampleimage").hover(
		function () {
			$(this).css("opacity", $("#opacity2").val());
		}, 
		function () {
			$(this).css("opacity", $("#opacity1").val());
		}
	);
}	

async function intValidate(elm, val) { // Made async
	if (!is_int(elm.value)) {
		notification(chrome.i18n.getMessage("invalidnumber"));
		elm.value = val; // Set to default if invalid
        // Do not call saveOptions here if just validating, let main save button handle it
        // or if it's a blur event, the blur handler itself calls saveOptions.
	}
	// else await saveOptions(); // Avoid saving on every int validation if not desired.
    // Let blur/change handlers for these fields call saveOptions.
}

function is_int(value){ 
	if(value != '' && !isNaN(value) && Number.isInteger(parseFloat(value))) return true; // Check if actually integer
	else return false;
}	

async function pageTitleValidation() { // Made async
	if ($.trim($("#pageTitleText").val()) == '') $("#pageTitleText").val('Google Chrome');
	// else await saveOptions(); // Avoid saving on every validation. Let blur handler call save.
}

async function fontsizeValidation() { // Made async
	if (!is_int($.trim($("#fontsize").val()))) $("#fontsize").val('12');
	updateDemo(); // Reads from form
    // await saveOptions(); // Avoid saving on every validation. Let change handler call save.
}

function notification(msg) {
	$('#message').html(msg).stop(true, true).fadeIn("slow").delay(2000).fadeOut("slow"); // Added stop(true,true) for better animation queue handling
}
function truncText(str) {
	if (str.length > 16) return str.substr(0, 16)+'...';
	return str;
}
function updateDemo() { // This function reads directly from form elements, doesn't need to be async itself
	if ($('#disableFavicons').is(':checked')) $("#demo_favicon").attr('style','visibility: hidden');
	else $("#demo_favicon").removeAttr('style');
	if ($('#hidePageTitles').is(':checked')) $("#demo_title").text(truncText($("#pageTitleText").val()));	
	else $("#demo_title").text(chrome.i18n.getMessage("demo")+' Page');
	$("#demo_content").css('backgroundColor', $("#s_bg").val());
	$("#t_link").css('color', $("#s_link").val());
	$("#test table").css('border', "1px solid #" + $("#s_table").val());
	$("#t_table, #demo_content h1").css('color', $("#s_text").val());
	if ($("#font").val() == '-Custom-' && $("#customfont").val()) {
		$("#t_table, #demo_content h1").css({'font-family': $("#customfont").val(), 'font-size': $("#fontsize").val()});
	} else if ($("#font").val() != '-Unchanged-' && $("#font").val() != '-Custom-') {
		$("#t_table, #demo_content h1").css({'font-family': $("#font").val(), 'font-size': $("#fontsize").val()});
	} else {	
		$("#t_table, #demo_content h1").css({'font-family': 'Arial, sans-serif', 'font-size': '12px'});
	}
	if ($('#hidePageTitles').is(':checked')) $("#t_link").css('textDecoration', 'underline');
	if ($('#removeBold').is(':checked')) $("#demo_content h1").css('font-weight', 'normal');
	else  $("#demo_content h1").css('font-weight', 'bold');
	if ($('#showUnderline').is(':checked')) $("#t_link").css('textDecoration', 'underline');
	else $("#t_link").css('textDecoration', 'none');
	if ($("#sfwmode").val() == 'Paranoid') $(".sampleimage").attr('style','visibility: hidden');
	else if ($("#sfwmode").val() == 'NSFW') $(".sampleimage").attr('style','visibility: visible; opacity: 1 !important;').unbind();
	else opacitytest();
}

function stylePreset(s) {
	if (s) {
		var bg='FFFFFF';
		var text='000000';
		var link='000099';
		var table='cccccc';
		// Specific style colours
		switch (s)
		{
			case 'White - Gray':
				text='AAAAAA';
				link='AAAAAA';
				table='AAAAAA';
				break;
			case 'White - Green':
				link='008000';
				break;
			case 'Gray - Blue':
				bg='EEEEEE';
				break;
			case 'Light Red - Pale Blue':
				bg='FFEEE3';
				text='555';
				link='7F75AA';
				break;
			case 'Black - Blue':
				bg='000000';
				text='FFFFFF';
				link='36F';
				table='333333';
				break;
			case 'Dark Brown - Off-White':
				bg='2c2c2c';
				text='e5e9a8';
				link='5cb0cc';
				table='7f7f7f';
				break;
			case 'Black - Green':
				bg='000000';
				text='FFFFFF';
				link='00FF00';
				table='333333';
				break;
			case 'Black - Red':
				bg='000000';
				text='FFFFFF';
				link='FF0000';
				table='333333';
				break;
			case 'Black - Pink':
				bg='000000';
				text='FFFFFF';
				link='FF1CAE';
				table='333333';
				break;
		}
		$('#s_bg').val(bg);
		$('#s_text').val(text);
		$('#s_link').val(link);
		$('#s_table').val(table);
		updateDemo();
	}
}

// <!-- modified from KB SSL Enforcer: https://code.google.com/p/kbsslenforcer/
async function addList(type) { // Made async
	var domain = $('#url').val();
	domain = domain.toLowerCase();
	
	if (!domain.match(/^(?:[\-\w\*\?]+(\.[\-\w\*\?]+)*|((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})|\[[A-Fa-f0-9:.]+\])?$/g)) {
		$('#listMsg').html(chrome.i18n.getMessage("invaliddomain")).stop(true,true).fadeIn("slow").delay(2000).fadeOut("slow");
	} else {
        // bkg.domainHandler(domain, type); // Replaced with message
        await chrome.runtime.sendMessage({ action: "domainHandler", domain: domain, listType: type });
		$('#url').val('');
		$('#listMsg').html([chrome.i18n.getMessage("whitelisted"),chrome.i18n.getMessage("blacklisted")][type]+' '+domain+'.').stop(true,true).fadeIn("slow").delay(2000).fadeOut("slow");
		await listUpdate(); // listUpdate will fetch lists from storage
		$('#url').focus();
	}
	return false;
}
async function domainRemover(domain) { // Made async
    // bkg.domainHandler(domain,2); // Replaced with message
    await chrome.runtime.sendMessage({ action: "domainHandler", domain: domain, listType: 2 });
	await listUpdate(); // listUpdate will fetch lists from storage
	return false;
}
async function listUpdate(storedWhiteList, storedBlackList) { // Made async, optionally accepts lists
    let whiteListArray, blackListArray;

    if (storedWhiteList && storedBlackList) {
        try { whiteListArray = JSON.parse(storedWhiteList || '[]'); } catch (e) { whiteListArray = []; console.error("Error parsing whitelist for listUpdate", e); }
        try { blackListArray = JSON.parse(storedBlackList || '[]'); } catch (e) { blackListArray = []; console.error("Error parsing blacklist for listUpdate", e); }
    } else {
        const { whiteList, blackList } = await loadStorage(['whiteList', 'blackList']);
        try { whiteListArray = JSON.parse(whiteList || '[]'); } catch (e) { whiteListArray = []; console.error("Error parsing whitelist for listUpdate", e); }
        try { blackListArray = JSON.parse(blackList || '[]'); } catch (e) { blackListArray = []; console.error("Error parsing blacklist for listUpdate", e); }
    }
	
	var whitelistCompiled = '';
	if(whiteListArray.length==0) whitelistCompiled = '['+chrome.i18n.getMessage("empty")+']';
	else {
		whiteListArray.sort();
		for(var i in whiteListArray) whitelistCompiled += '<div class="listentry">'+whiteListArray[i]+' <a href="javascript:;" style="color:#f00;float:right;" rel="'+whiteListArray[i]+'" class="domainRemover">X</a></div>';
	}
	var blacklistCompiled = '';
	if (blackListArray.length==0) blacklistCompiled = '['+chrome.i18n.getMessage("empty")+']';
	else {
		blackListArray.sort();
		for(var i in blackListArray) blacklistCompiled += '<div class="listentry">'+blackListArray[i]+' <a href="javascript:;" style="color:#f00;float:right;" rel="'+blackListArray[i]+'" class="domainRemover">X</a></div>';
	}
	$('#whitelist').html(whitelistCompiled);
	$('#blacklist').html(blacklistCompiled);
	$(".domainRemover").unbind('click');
	$(".domainRemover").click(async function() { await domainRemover($(this).attr('rel'));}); // Made async
    // bkg.initLists(); // Replaced with message if background needs to re-init its global lists
    chrome.runtime.sendMessage({ action: "initLists" }); // Tell background to refresh its internal lists
	await updateExport(); // updateExport will need to be async
}
async function listclear(type) { // Made async
	if (confirm([chrome.i18n.getMessage("removefromwhitelist"),chrome.i18n.getMessage("removefromblacklist")][type]+'?')) {
        const key = (type === 0) ? 'whiteList' : 'blackList';
		await saveStorage({ [key]: JSON.stringify([]) });
		await listUpdate();
	}
	return false;
}
// from KB SSL Enforcer: https://code.google.com/p/kbsslenforcer/ -->

async function revertColours() { // Made async
    const settings = await loadStorage(['s_bg', 's_text', 's_link', 's_table']);
	$('#s_bg').val(settings.s_bg || 'FFFFFF');
	$('#s_text').val(settings.s_text || '000000');
	$('#s_link').val(settings.s_link || '000099');
	$('#s_table').val(settings.s_table || 'cccccc');
	updateDemo();
}

function colorPickLoad(id) { // This function itself doesn't need to be async if it only sets up the picker.
                            // However, its callbacks might need to be async if they save options.
	$('#'+id).ColorPicker({
		onBeforeShow: function () {
			$(this).ColorPickerSetColor(this.value);
		},
		onChange: function (hsb, hex, rgb) {
			$('#'+id).val(hex);
			updateDemo();
		}
	});
}

function downloadtxt() {
	var textToWrite = $("#settingsexport").val();
	var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var fileNameToSaveAs = "dp-settings-"+new Date().toJSON()+".txt";
	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	downloadLink.click();
	downloadLink.remove();
}
async function updateExport() { // Made async
    const allSettings = await loadStorage(null); // Get all settings
	$("#settingsexport").val("");
	settingnames = []; // Reset global settingnames
	for (var key in allSettings) {
		if (allSettings.hasOwnProperty(key)) {
			if (key != "version") { // Assuming "version" is a special key not to be exported/imported by users this way
				settingnames.push(key); // Populate settingnames for import validation
                let value = allSettings[key];
                if (typeof value === 'object') value = JSON.stringify(value); // Stringify objects/arrays like blackList/whiteList
				$("#settingsexport").val($("#settingsexport").val()+key+"|"+String(value).replace(/(?:\r\n|\r|\n)/g, ' ')+"\n");
			}
		}
	}
    let currentExportVal = $("#settingsexport").val();
    if (currentExportVal.endsWith("\n")) {
	    $("#settingsexport").val(currentExportVal.slice(0,-1));
    }
}
async function settingsImport() { // Made async
	var importError = ""; // Renamed to avoid conflict with global error
	var settingsToImport = $("#settingsimport").val().split("\n");
	if ($.trim($("#settingsimport").val()) == "") {
		notification(chrome.i18n.getMessage("pastesettings"));
		return false;
	}

    // Populate settingnames if it's empty (e.g. if updateExport hasn't run or page just loaded)
    if (settingnames.length === 0) {
        const allStorage = await loadStorage(null);
        for (const key in allStorage) {
            if (allStorage.hasOwnProperty(key) && key !== "version") {
                settingnames.push(key);
            }
        }
    }
    
    let itemsToSave = {};

	if (settingsToImport.length > 0) {
		$.each(settingsToImport, function(i, v) {
			if ($.trim(v) != "") {
				var settingentry = $.trim(v).split("|");
                var entryKey = $.trim(settingentry[0]);
                var entryValue = $.trim(settingentry[1]);

				if (settingnames.indexOf(entryKey) != -1) {
                    // For boolean-like strings, convert them to actual booleans
                    if (entryValue === "true") itemsToSave[entryKey] = true;
                    else if (entryValue === "false") itemsToSave[entryKey] = false;
                    // For lists, they should already be stringified JSON in the export, so keep as string for storage
                    else if (entryKey === 'whiteList' || entryKey === 'blackList') {
                        // Basic validation for JSON array format
                        if (entryValue.startsWith('[') && entryValue.endsWith(']')) {
                            itemsToSave[entryKey] = entryValue;
                        } else {
                            // Attempt to create a JSON array from comma-separated if not already an array string
                            try {
                                 const listarray = entryValue.replace(/(\[|\]|")/g,"").split(",");
                                 if (listarray.toString() !== '') itemsToSave[entryKey] = JSON.stringify(listarray);
                                 else itemsToSave[entryKey] = JSON.stringify([]);
                            } catch (e) {
                                console.warn(`Could not parse list for ${entryKey}, skipping: ${entryValue}`);
                                importError += entryKey + "(invalid list format), ";
                            }
                        }
                    } else {
					    itemsToSave[entryKey] = entryValue;
                    }
				} else {
					importError += entryKey + "(unknown key), ";
				}
			}
		});
	}

    if (Object.keys(itemsToSave).length > 0) {
	    await saveStorage(itemsToSave);
    }

	await loadOptions(); // Reload options from storage to reflect changes
	// listUpdate is called by loadOptions implicitly if it loads whiteList/blackList
	
	if (!importError) {
		notification(chrome.i18n.getMessage("importsuccessoptions"));
		$("#settingsimport").val("");
	} else {
		notification(chrome.i18n.getMessage("importsuccesscond")+importError.slice(0, -2));
	}
}