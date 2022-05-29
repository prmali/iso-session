let updating = true;

const condition = {
	domainType: "firstParty",
	//initiatorDomains: ["notion.so"],
};

const setup = (tab, cookies) => {
	// store cookies in session storage
	updateSessionStorage(tab.id, "IsoSessionCookies", stringifyObj(cookies));

	// update session storage cookies on cookie update
	syncCookiesTo(tab.id, tab.url, "IsoSessionCookies");

	// clear cookies
	clearTabCookies(tab.url, cookies);

	// attach cookies and headers to outgoing requests of same domain
	modifyRequestHeaders(tab.id, "IsoSessionCookies", "IsoSessionHeaders");

	/* chrome.runtime.sendMessage(
		{
			title: "GET_COOKIES",
			data: { tab },
		},
		(cookies) => {
			console.log("cookies:", cookies);
		}
	); */

	/* chrome.cookies.getAll(
		{
			url: tab.url,
		},
		(cookies) => { */
	/* const newCookies = cookies.map((cookie) => {
					cookie.name = `${tab.id}-${cookie.name}`;
					return cookie;
				}); */
	// store cookies in session storage
	/* updateSessionStorage(
				tab.id,
				"IsoSessionCookies",
				stringifyObj(cookies)
			);

			// update session storage cookies on cookie update
			syncCookiesTo(tab.id, tab.url, "IsoSessionCookies");

			// clear cookies
			clearTabCookies(cookies, tab.url);

			// attach cookies and headers to outgoing requests of same domain
			modifyRequestHeaders(
				tab.id,
				"IsoSessionCookies",
				"IsoSessionHeaders"
			);
		}
	); */
};

const updateSessionStorage = (tabId, key, value) => {
	if (!value || value?.length === 0) {
		return;
	}

	console.log("updating session storage");
	sessionStorage.setItem(`${tabId}-${key}`, value);
	console.log(`${tabId}-${key}:`, value);

	if (key === "IsoSessionCookies") {
		chrome.runtime.sendMessage({
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
		});
		/* chrome.declarativeNetRequest.updateSessionRules(
			{
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
			async (result) => {
				console.log("set cookie:", value);
				console.log("modified cookies", result);
			}
		); */
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

		chrome.runtime.sendMessage({
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
		});

		/* chrome.declarativeNetRequest.updateSessionRules(
			{
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
			async (result) => {
				console.log("modified non-standard headers", result);
			}
		); */
	}
};

const syncCookiesTo = (tabId, url, sessionStorageCookiesKey) => {
	chrome.cookies.onChanged.addListener(({ cookie, removed }) => {
		if (removed) {
			return;
		}

		if (cookie.url === url && updating === false) {
			updating = true;

			let cookies = sessionStorage.getItem(
				`${tabId}-${sessionStorageKey}`
			);

			if (!cookies) {
				return;
			}

			console.log("syncing cookies");
			let [_, preppedCookies] = reverseString(cookies);

			updateSessionStorage(
				tabId,
				sessionStorageCookiesKey,
				stringifyObj(preppedCookies)
			);

			updating = false;

			/* chrome.storage.session.get(
				`${tabId}-${sessionStorageKey}`,
				({ [`${tabId}-${sessionStorageKey}`]: cookies }) => {
					if (!cookies) {
						return;
					}

					console.log("syncing cookies");
					let [_, preppedCookies] = reverseString(cookies);

					updateSessionStorage(
						tabId,
						sessionStorageCookiesKey,
						stringifyObj(preppedCookies)
					);

					updating = false;
				}
			); */
		}
	});
};

const clearTabCookies = (url, cookies) => {
	// emit event
	cookies.map((cookie) => {
		chrome.cookies.remove({
			name: cookie.name,
			url,
		});
	});
	console.log("cleared cookies");
};

const modifyRequestHeaders = (
	tabId,
	sessionStorageCookiesKey,
	sessionStorageHeadersKey
) => {
	chrome.webRequest.onBeforeSendHeaders.addListener(
		(details) => {
			origin = "";
			for (let headers of details.requestHeaders) {
				if (headers.name === "Origin") {
					origin = headers.value;
				}
			}

			if (
				origin.length > 0 &&
				new URL(details.url).hostname === new URL(origin).hostname
			) {
				let headers = sessionStorage.getItem(
					`${tabId}-${sessionStorageHeadersKey}`
				);
				/* chrome.storage.session.get(
					`${tabId}-${sessionStorageHeadersKey}`,
					({ [`${tabId}-${sessionStorageHeadersKey}`]: headers }) => { */
				let [isoHeaders, _] = reverseString(headers);
				let newHeaders = {};
				let preppedIsoHeaders = [];

				for (var i = 0; i < details.requestHeaders.length; ++i) {
					let { name, value } = details.requestHeaders[i];

					if (name === "Cookie") {
						console.log("modifying request cookies");
						cookies = sessionStorage.getItem(
							`${tabId}-${sessionStorageCookiesKey}`
						);

						if (cookies !== value) {
							sessionStorage.setItem(
								`${tabId}-${sessionStorageCookiesKey}`,
								value
							);
						}

						/* chrome.storage.session.get(
									`${tabId}-${sessionStorageCookiesKey}`,
									({
										[`${tabId}-${sessionStorageCookiesKey}`]: cookies,
									}) => {
										if (cookies !== value) {
											chrome.storage.session.set({
												[`${tabId}-${sessionStorageCookiesKey}`]: value,
											});
										}
									}
								); */
					} else {
						if (
							name === "Authorization" ||
							name.slice(0, 2).toLowerCase() === "x-"
						) {
							const headerObj = {
								name,
								value: isoHeaders[name] || value,
							};

							//details.requestHeaders[i] = headerObj;

							newHeaders[name] = headerObj.value;
						}
					}
				}

				for (let [name, value] of Object.entries(newHeaders)) {
					preppedIsoHeaders.push({
						name,
						value,
					});
				}

				if (preppedIsoHeaders.length > 0) {
					updateSessionStorage(
						tabId,
						sessionStorageHeadersKey,
						stringifyObj(preppedIsoHeaders)
					);
				}
			}
			/*);
			} */

			return { requestHeaders: details.requestHeaders };
		},
		{ urls: ["<all_urls>"], tabId },
		["requestHeaders", "extraHeaders"]
	);
};

const restoreCookies = (tabId) => {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		let tab = tabs[0];
		let cookies = sessionStorage.getItem(
			`${tabId}-${sessionStorageCookiesKey}`
		);

		if (!cookies) {
			return;
		}

		let [_, preppedCookies] = reverseString(cookies);

		for (let { name, value } of preppedCookies) {
			console.log("restoring:", name, value);
			chrome.cookies.set({ url: tab.url, name, value });
		}

		/* chrome.storage.session.get(
			`${tabId}-${sessionStorageCookiesKey}`,
			({ [`${tabId}-${sessionStorageCookiesKey}`]: cookies }) => {
				if (!cookies) {
					return;
				}

				let [_, preppedCookies] = reverseString(cookies);

				for (let { name, value } of preppedCookies) {
					console.log("restoring:", name, value);
					chrome.cookies.set({ url: tab.url, name, value });
				}
			}
		); */
	});
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
				setup(request.data.tab, request.data.cookies);
				break;
			/* case "CLEANUP_COOKIES":
				cleanupCookies(request.data.tab, request.data.cookies);
				break; */
			case "RESET":
				break;
			case "LOAD":
				console.log("LOADING");
				break;
			default:
				break;
		}
	});
});

/* chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log(request, sender);
	switch (request.title) {
		case "CACHE":
			console.log("CAAACHE");
			setup(request.data.tab.id);
			break;
		case "RESET":
			break;
		case "LOAD":
			console.log("LOADING");
			break;
		default:
			break;
	}
}); */

alert("injected");
