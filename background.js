const setup = (tab) => {
	const port = chrome.tabs.connect(tab.id);

	chrome.cookies.getAll({ url: tab.url }, (cookies) => {
		port.postMessage(
			{
				title: "SETUP",
				data: {
					tab,
					cookies,
				},
			},
			() => {
				chrome.storage.session.set(
					`Iso${tab.id}RegistrationState`,
					true
				);
				console.log("REGISTERED:", tab.id);
				port.disconnect();
			}
		);
	});
};

const getCookies = (tab) => {
	chrome.cookies.getAll({ url: tab.url }, (cookies) => {
		console.log("GETTING COOKIES");
		console.log(cookies);
		port.postMessage(
			{
				title: "LOAD_COOKIES",
				data: {
					tab,
					cookies,
				},
			},
			() => {
				port.disconnect();
			}
		);
	});
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
		if (tab) {
			const port = chrome.tabs.connect(tab.id);

			switch (request.title) {
				case "SETUP":
					setup(tab);
					break;
				case "GET_COOKIES":
					getCookies(tab);
					break;
				case "SYNC_COOKIES":
					chrome.cookies.onChanged.addListener(
						({ cookie, removed }) => {
							if (removed) {
								return;
							}

							if (cookie.url === request.data.url) {
								chrome.cookies.getAll(
									{ url: request.data.url },
									(cookies) => {
										console.log("SYNCING COOKIES");
										console.log(cookies);
										port.postMessage(
											{
												title: "SYNC",
												data: {
													tabId: request.data.tabId,
													key: request.data.key,
													value: cookies,
												},
											},
											() => {
												port.disconnect();
											}
										);
									}
								);
							}
						}
					);
					break;
				case "RESTORE_COOKIES":
					console.log(request.data.cookies);
					let url = new URL(tab.url);

					for (let cookie of request.data.cookies) {
						let hostOnly = cookie.hostOnly;
						delete cookie.hostOnly;
						delete cookie.session;
						chrome.cookies.set({
							...cookie,
							url: url.origin,
							domain: hostOnly ? undefined : cookie.domain,
						});
					}

					console.log("RESTORED COOKIES");
					break;
				case "UPDATE_SESSION":
					console.log("updating session");
					/* chrome.declarativeNetRequest.updateSessionRules(
						request.data,
						async (result) => {
							console.log("modified headers", result);
						}
					); */
					break;
				case "INJECT":
					console.log("Injecting @:", request.data.tab.id);

					chrome.scripting.executeScript(
						{
							target: { tabId: request.data.tab.id },
							files: ["./content-script.js"],
						},
						() => {
							setup(tab);
						}
					);
					break;
				default:
					break;
			}
		}
	});
});

chrome.runtime.onInstalled.addListener(() => {
	console.log("Extension status: LIVE");
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
	const port = chrome.tabs.connect(tabId);

	chrome.tabs.get(tabId, (tab) => {
		if (
			tab.url &&
			["www.notion.so"].indexOf(new URL(tab.url).hostname) >= 0
		) {
			console.log("Restoration in progress @:", tabId);
			port.postMessage(
				{
					title: "SETUP",
					data: {
						tab,
					},
				},
				() => {
					port.disconnect();
				}
			);
		}
	});
});
