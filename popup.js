let cacheCookies = document.getElementById("cacheCookies");

window.addEventListener("load", () => {
	cacheCookies.addEventListener("click", async () => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			const tab = tabs[0];
			console.log("emitting event @:", tab.id);

			chrome.runtime.sendMessage({
				title: "INJECT",
				data: { tab },
			});
		});
	});
});
