var updating = true;

const COOKIES_SESSION_KEY = "IsoSessionCookies";
const HEADERS_SESSION_KEY = "IsoSessionHeaders";
const LOCAL_STORAGE_SESSSION_KEY = "IsoSessionLocal";

const condition = {
	domainType: "firstParty",
	//initiatorDomains: ["notion.so"],
};

const getLocalStorage = () => {
	let storage = [];

	for (const name in localStorage) {
		let value = localStorage.getItem(name);

		storage.push({
			name,
			value,
		});
	}

	return storage;
};

const setup = (tab, cookies) => {
	updateSessionStorage(
		tab.id,
		COOKIES_SESSION_KEY,
		stringifyCookies(cookies)
	);

	updateSessionStorage(
		tab.id,
		LOCAL_STORAGE_SESSSION_KEY,
		stringifyObj(getLocalStorage())
	);
};

const updateSessionStorage = (tabId, key, value) => {
	if (!value || value?.length === 0) {
		return;
	}

	console.log("updating session storage");
	sessionStorage.setItem(`${tabId}-${key}`, value);
	console.log(`${tabId}-${key}:`, value);

	if (key === COOKIES_SESSION_KEY) {
		/* chrome.runtime.sendMessage({
			title: "UPDATE_SESSION",
			data: {
				removeRuleIds: [1],
				addRules: [
					{
						id: 1,
						priority: 1,
						action: {
							type: "modifyHeaders",
							requestHeaders: [
								{
									header: "Cookie",
									operation: "set",
									value,
								},
							],
						},
						condition,
					},
				],
			},
		}); */
	} else if (key === "IsoSessionHeaders") {
		let requestHeaders = [];

		let [_, isoHeaders] = reverseString(value);

		for (let isoHeader of isoHeaders) {
			requestHeaders.push({
				header: isoHeader.name,
				operation: "set",
				value: isoHeader.value,
			});
		}

		/* chrome.runtime.sendMessage({
			title: "UPDATE_SESSION",
			data: {
				removeRuleIds: [2],
				addRules: [
					{
						id: 2,
						priority: 1,
						action: {
							type: "modifyHeaders",
							requestHeaders,
						},
						condition,
					},
				],
			},
		}); */
	}
};

const syncCookiesTo = (tabId, url, key) => {
	chrome.runtime.sendMessage({
		title: "SYNC_COOKIES",
		data: {
			tabId,
			url,
			key,
		},
	});
};

const restoreCookies = (tab, key = COOKIES_SESSION_KEY) => {
	console.log("RESTORING COOKIES");
	let cookies = sessionStorage.getItem(`${tab.id}-${key}`);

	if (!cookies) {
		return;
	}

	let preppedCookies = revertCookieString(cookies);

	chrome.runtime.sendMessage({
		title: "RESTORE_COOKIES",
		data: {
			url: tab.url,
			cookies: preppedCookies,
		},
	});
};

const restoreLocalStorage = (tab, key = LOCAL_STORAGE_SESSSION_KEY) => {
	console.log("RESTORING LOCAL STORAGE");
	let storage = sessionStorage.getItem(`${tab.id}-${key}`);

	if (!storage) {
		return;
	}

	let [_, preppedStorage] = reverseString(storage);

	for (let item of preppedStorage) {
		if (item.value !== "null") {
			localStorage.setItem(item.name, item.value);
		}
	}
};

const sync = (tabId, key, value) => {
	updateSessionStorage(tabId, key, stringifyObj(value));
};

const restore = (tab) => {
	restoreCookies(tab);
	restoreLocalStorage(tab);
};

const stringifyCookies = (cookies) => {
	let s = "";

	if (!cookies) {
		return "";
	}

	for (let cookie of cookies) {
		s += `${JSON.stringify(cookie)}; `;
	}

	s = s.slice(0, s.length - 2);

	return s;
};

const revertCookieString = (s) => {
	let cookies = [];

	s = s.split("; ");

	for (let sc of s) {
		cookies.push(JSON.parse(sc));
	}

	console.log(cookies);
	return cookies;
};

const stringifyObj = (obj) => {
	let s = "";

	if (!obj) {
		return "";
	}

	for (let val of obj) {
		s += `${val.name}=${val.value}; `;
	}

	s = s.slice(0, s.length - 2);

	return s;
};

const reverseString = (s = "") => {
	let obj = {};
	let finObj = [];

	let splitS = s.split("; ");
	for (let split of splitS) {
		let furtherSplit = split.split("=");
		obj[furtherSplit[0]] = furtherSplit[1];
	}

	for (let [name, value] of Object.entries(obj)) {
		finObj.push({
			name,
			value,
		});
	}

	return [obj, finObj];
};

chrome.runtime.onConnect.addListener((port) => {
	port.onMessage.addListener((request) => {
		switch (request.title) {
			case "SETUP":
				// initialize
				const isRegistered = sessionStorage.getItem(
					`Iso${request.data.tab.id}RegistrationState`
				);
				console.log("isRegistered:", isRegistered);

				if (isRegistered === "true") {
					restore(request.data.tab);
				} else {
					sessionStorage.setItem(
						`Iso${request.data.tab.id}RegistrationState`,
						true
					);
					setup(request.data.tab, request.data.cookies);
				}
				break;
			case "SYNC":
				sync(request.data.tabId, request.data.key, request.data.value);
				break;
			case "LOAD_COOKIES":
				// get all cookies
				console.log("LOADING COOKIES");
				sync(
					request.data.tab.id,
					COOKIES_SESSION_KEY,
					request.data.cookies
				);
				break;
			default:
				break;
		}
	});
});

console.log("injected");
