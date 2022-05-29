# iso-session

Localize your browsing sessions to specific tabs. Log in to the same website under multiple accounts without having to shift to Incognito.

### Usage

1. Login to application on a tab
2. Click "Cache Cookies" in extension
3. Navigate to new tab
4. Log out of account
5. Repeat process

### Iterations

Testing limited to Notion

1. Cache cookies to session storage, clear cookies, and insert in outgoing request headers

    - Issues:
        - webRequests blocking wasn't compatible with Manifest v3
        - Was logged out once page refreshed
        - Unaware of proper extension file structure. Session storage was reflecting in tab
    - Takeaways:
        - On right path with storing cookies and utilizing session storage

2. Record headers into session storage and replace outgoing headers with stored headers

    - Issues:
        - Unable to update state in time to change headers on first request after cookie clear
        - webRequests have failed me
    - Takeaways:
        - Replacing headers seems to be unecessary

3. declarativeNetRequest

    - Issues:
        - Unfamiliarity with rules to properly utilize.
        - Invalid login when auth w/ Google
    - Takeaways:
        - Don't mess with outgoing requests and headers.

4. Don't clear cookies on cache. Retrieve and load cookies from cache when tab is activated

    - Issues:
        - Not able to access active tab from popup or store global states. Required further restructuring and research into messaging
    - Takeaways:
        - Content scripts are useful. They inject directly into the page. Messaging is also a neat way to communicate between scripts.
        - This approach seems more logical. Clearing and manually modifying headers is an unecessary step. Can just overwrite cookies directly.

5. Content scripts and messaging

    - Issues:
        - Wasn't able to fully understand how to use messaging. Errors when emitting and recieving messages in same script (seems pointless in hindsight)
        - Messy message handling. Example messaging process is as follows: popup -> background -> content-script -> background -> content-script -> background.
    - Takeaways:
        - Content scripts are really useful

6. localStorage caching (CURRENT)
    - Issues:
        - Server side? Upon logging out, the stored cookies and auth tokens get invalidated meaning cached cookies are useless.
        - Was previously caching cookies wrong. Issue resolved and cached cookies match set cookies
        - localStorage doesn't seem to matter. Clearing localStorage doesn't log users out on refresh whereas cookies do.
    - Takeaways:
        - Some additional steps can be taken
    - Future:
        - Manual tests with postman or reqbin. Logout and mock a valid request
        - Build quick web server to test on.
