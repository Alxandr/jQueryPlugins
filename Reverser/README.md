Reverser is a project created in C# that adds reversed ajax (comet) capabilities
to IIS. It's meant to be simple to implement on web-pages and simple to create
new Reverser-modules. In the newest version of Reverser, websocket-support has
been added, such that if not disabled on the server-side, browsers that support
websockets will use websockets instead of long polling ajax-requests.