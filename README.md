> __CAUTION__: This is an experiment and needs to be refined! DO NOT USE this extension in production environments as it might cause data loss. You have been WARNED!

## XPort Extension for VSCode

"Cross" Port extension for VSCode.

This is an extension that runs along with a Port enabled namespace. Allowing the editor to communicate with a REST back-end API.

Please note that this is not a [LSP](https://langserver.org/) enabled extension. So will find nothing like intellisense for now. :(

Requirements

* [__Visual Studio Code__](https://code.visualstudio.com/) obviously.

* [__Port__](https://github.com/rfns/port) for path to item conversion, project conflicts listing. (Seriously, that's all, I'm even thinking about splitting Port utilities to a different repo...).

* [__Frontier__](https://github.com/rfns/frontier) for authentication, routing HTTP requests, payload parsing, error handling and serialization.

* [__XPort__](https://github.com/rfns/xport) for providing routes that interact with Caché source code.

* __UTF-8__ enabled VSCode, no questions asked.

## How it works / Getting started

Everytime you save a document inside a XPort-aware workspace, the extension will attempt to keep the file in sync with their server version, this is applied for every extension that Port supports. To put it simply:

* Workspace folders are Caché projects and XPort will make sure to enforce this golden rule.

* Supports mac, inc, dfi, cls, int, mvb, mvi, bas, csp and another infinity of static files that are classfied as web.

* It follows the Port pattern:

```
myworkspace/
  cls/
    My/
      Class.cls
  inc/
    myinclude.inc
  web/
    mycachepage.csp
    myrules.csr
    myassets/
      mylib.js
      mytheme.css
```

* If you a __save__ a file, then it will be overwritten on the server and occasionally compiled if detected to be a valid routine and retrived back from the server to make sure the content is equal.

* If you __delete__ a file, then this file will also be removed _and_ deleted from the server. But you can recover the file as long as you don't bypass your trash bin or the file is versioned.

* If you __synchronize__ a file, you will fetch this file from the server overwritting your changes. This should not prove to be a problem as long as you use VSCode for editing your sources.

* You can also delete or synchronize a batch of files.

Configuring the workspace with a few required options will lead to this extension activating automatically. These options are:

```
{
  "xport.remote.server": "http://localhost:57772",
  "xport.remote.namespace": "SAMPLE",
  "xport.remote.auth.username": "_system",
  "xport.remote.auth.password": "SYS"
}
```

The values you are seeing there are the default ones. So if you are using this extension for a local Caché instance you will only need to change `namespace`. Unless you're using SAMPLES or is paranoid enough to create a different user for increased security for your own local database.

## FAQ

### FAQ: Any plans for publishing this extension in the Marketplace?

Yes, but not for now because this extension is not considered stable enough and there is not enough interest. You will know when this extension is stable as it reaches the milestone 1.0.0.

### FAQ: Can I get involved?

Surely you do! Not only by coding but ideas are also welcome. Of course more hands at the work makes the releases faster to come, but ideas can bring more concern related to this project.
