# uberflip-upload-form
Creating a single interface for Uberflip users to upload their content to their Hub, with options like tags, streams, and all other requirements.

## Authentication
You will need to to create a keys.js file in app's root folder to include your credentials for both Uberflip's APIs. The file should contain the following:

```javascript
//Place your API credentials for the current and legacy Uberflip APIs

var keys = {
    CLIENT_ID: "XXXXXXXXX",
    CLIENT_SECRET: "XXXXXXXXX",
    LEGACY_KEY: "XXXXXXXXX",
    LEGACY_SIG: "XXXXXXXXX"
}

module.exports = keys;
```

This module is already required in the index.js file.